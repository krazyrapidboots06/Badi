const path = require("path");
const axios = require('axios');
const FormData = require('form-data');
const db = require("../../core/database");
const { askChipp } = require("./handlers");
const { getSession, saveSession } = require("./session");
const { parseAI } = require("../../utils/helpers");

const MAX_SIZE = 25 * 1024 * 1024;
const COOLDOWN_MS = 4000;
const lastRequests = new Map();
const processedMids = new Set();
const userLock = new Set();
const BAN_TIERS = { 1: 10800000, 2: 259200000, 3: null };

setInterval(() => processedMids.clear(), 60000);

async function executeAction(action, event, api, reply) {
    const cmdName = action.tool?.toLowerCase();
    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));
    if (!command) return;
    if (cmdName === "remind") return await command.run({ event, args: [action.time, action.msg], api, reply });
    if (cmdName === "pinterest") {
        try { await command.run({ event, args:[action.query, (action.count || 5).toString()], api, reply }); } 
        catch (e) { const gmage = global.client.commands.get("gmage"); if (gmage) await gmage.run({ event, args: [action.query], api, reply }); }
        return;
    }
    try { await command.run({ event, args: [action.query], api, reply }); } catch (e) { console.error(e.message); }
}

async function handleTieredBan(userId, reason, reply) {
    if (global.ADMINS.has(userId)) return reply("safety: admin bypass active.");
    const existing = await db.Ban.findOne({ userId });
    const level = existing ? Math.min(existing.level + 1, 3) : 1;
    const config = BAN_TIERS[level];
    await db.addBan(userId, reason, level, config);
    global.BANNED_USERS.add(userId);
    const durationText = config ? `for ${level === 1 ? "3h" : "3d"}` : "permanently";
    reply(`🚫 security: banned ${durationText}.\nreason: ${reason}`);
}

async function upload(senderId, data, token) {
    try {
        const base64Data = data.fileBase64.includes(',') ? data.fileBase64.split(',')[1] : data.fileBase64;
        const buffer = Buffer.from(base64Data.replace(/\s/g, ''), 'base64');
        if (buffer.length > MAX_SIZE) return;
        const mimeMatch = data.fileBase64.match(/^data:(.*?);base64,/);
        const mime = mimeMatch ? mimeMatch[1] : 'text/plain';
        const form = new FormData();
        form.append('recipient', JSON.stringify({ id: senderId }));
        form.append('message', JSON.stringify({ attachment: { type: mime.startsWith('image/') ? 'image' : 'file', payload: { is_reusable: true } } }));
        form.append('filedata', buffer, { filename: data.fileName || 'document.txt', contentType: mime });
        await axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${token}`, form, { headers: form.getHeaders() });
    } catch (e) {}
}

module.exports.config = {
    name: "amdus",
    author: "sethdico",
    category: "AI",
    description: "main amdus ai assistant.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 0,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const uid = String(event.sender.id);
    const mid = event.message?.mid;
    
    if ((mid && processedMids.has(mid)) || userLock.has(uid)) return;
    const last = lastRequests.get(uid) || 0;
    if (Date.now() - last < COOLDOWN_MS && !global.ADMINS.has(uid)) return;
    
    if (mid) processedMids.add(mid);
    lastRequests.set(uid, Date.now());
    userLock.add(uid);
    
    const query = args.join(" ").trim();
    const token = global.PAGE_ACCESS_TOKEN;

    const atts = [...(event.message?.reply_to?.attachments || []), ...(event.message?.attachments || [])];
    let ctx =[];
    const seen = new Set();
    
    for (const f of atts) {
        const url = f.payload.url;
        if (seen.has(url)) continue;
        seen.add(url);
        const ext = path.extname(url.split('?')[0]).toLowerCase();
        const type = f.type === "image" ? "image" : (f.type === "video" ? "video" : "document");
        if (f.type !== "file" ||['.txt', '.js', '.json', '.md', '.py', '.docx', '.doc', '.pdf', '.pptx', '.ppt'].includes(ext)) {
            ctx.push(`[${type}_url]: ${f.payload.url}`);
        }
    }

    if (!query && ctx.length === 0) {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
        return reply("🧠 **amdus ai**\n━━━━━━━━━━━━━━━━\nhow to use:\n  amdus <message>\n  amdus <instruction> (reply to an image/file)\n\nexamples:\n  amdus write a python script\n  amdus summarize this document\n\nnote: i can see images, short videos, and docs. you also don't need to type 'amdus' if you're just chatting directly with me.");
    }

    if (ctx.length > 0 && !query) {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
        return reply("media received. reply to it with what you want me to do (e.g., 'amdus describe this').");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const session = getSession(uid);
        const res = await askChipp(ctx.length ? `${ctx.join("\n")}\n\nuser_query: ${query}` : query, null, session);
        
        if (!res || res.error) { 
            userLock.delete(uid); 
            return reply("api's busy. try again in a sec."); 
        }
        
        if (res.data?.chatSessionId) saveSession(uid, res.data.chatSessionId);

        let text = parseAI(res);
        if (!text) { userLock.delete(uid); return reply("no response."); }

        const mdLinkRegex = /\[(.*?)\]\((https?:\/\/.*?)\)/gi;
        const urlRegex = /https?:\/\/[^\s)]+/gi;
        let fileHandled = false;

        let match;
        const mdLinks =[];
        while ((match = mdLinkRegex.exec(text)) !== null) {
            mdLinks.push({ full: match[0], title: match[1], url: match[2].replace(/[).,]+$/, '') });
        }

        for (const item of mdLinks) {
            const isChipp = item.url.includes('chipp-images') || item.url.includes('chipp-application-files') || item.url.includes('app.chipp.ai/api/downloads');
            if (isChipp) {
                if (item.url.includes('chipp-images')) await api.sendAttachment("image", item.url, uid);
                else await api.sendAttachment("file", item.url, uid);
                text = text.replace(item.full, "");
                fileHandled = true;
            } else {
                text = text.replace(item.full, `${item.title}: ${item.url}`);
            }
        }

        const remainingUrls = text.match(urlRegex) ||[];
        for (const url of remainingUrls) {
            const cleanUrl = url.replace(/[).,]+$/, '');
            const isChipp = cleanUrl.includes('chipp-images') || cleanUrl.includes('chipp-application-files') || cleanUrl.includes('app.chipp.ai/api/downloads');
            if (isChipp) {
                if (cleanUrl.includes('chipp-images')) await api.sendAttachment("image", cleanUrl, uid);
                else await api.sendAttachment("file", cleanUrl, uid);
                text = text.replace(url, "");
                fileHandled = true;
            }
        }

        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            try {
                const act = JSON.parse(jsonMatch[0]);
                if (act.action === "ban") { userLock.delete(uid); return await handleTieredBan(uid, act.reason || "violation", reply); }
                if (act.tool) { userLock.delete(uid); return await executeAction(act, event, api, reply); }
                if (act.fileBase64) { await upload(uid, act, token); fileHandled = true; }
            } catch (e) {}
        }

        const math = text.match(/(\$\$[\s\S]*?\approx\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\$)\$[^\$\n]+(?<!\$)\$)/g);
        if (math) {
            const cleanMathText = text.replace(/(\$\$[\s\S]*?\approx\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\$)\$[^\$\n]+(?<!\$)\$)/g, "").trim();
            if (cleanMathText) await reply(cleanMathText.toLowerCase());
            for (const m of math) {
                const raw = m.replace(/\$\$|\\\[|\\\]|\\\(|\\\)/g, "").trim();
                const mathUrl = `https://latex.codecogs.com/png.image?%5Cdpi%7B200%7D%20%5Cbg_white%20${encodeURIComponent(raw)}`;
                await api.sendAttachment("image", mathUrl, uid);
            }
        } else {
            let finalOutput = text.replace(/\{[\s\S]*?\}/g, "").replace(/[ ]{2,}/g, " ").trim();
            if (finalOutput) await reply(finalOutput.toLowerCase());
            else if (!fileHandled && !text.includes('{')) await reply(text.toLowerCase());
        }
    } catch (err) {
        console.error(err.message);
    } finally {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
