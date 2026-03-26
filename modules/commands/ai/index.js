const path = require("path");
const axios = require('axios');
const fs = require('fs');
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

setInterval(() => {
    processedMids.clear();
    const now = Date.now();
    for (const [uid, time] of lastRequests.entries()) {
        if (now - time > 120000) lastRequests.delete(uid);
    }
}, 60000);

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
    try { await command.run({ event, args:[action.query], api, reply }); } catch (e) {}
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
    description: "Main amdus ai assistant.",
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

    if (query.toLowerCase() === "reset") {
        await db.UserStat.updateOne({ userId: uid }, { lastSessionId: null });
        userLock.delete(uid);
        return reply("memory cleared. starting a new chat.");
    }

    const atts = [...(event.message?.reply_to?.attachments || []), ...(event.message?.attachments || [])];
    let ctx = [];
    const seen = new Set();
    
    for (const f of atts) {
        const url = f.payload.url;
        if (seen.has(url)) continue;
        seen.add(url);
        const ext = path.extname(url.split('?')[0]).toLowerCase();
        const type = f.type === "image" ? "image" : (f.type === "video" ? "video" : "document");
        if (f.type !== "file" || ['.txt', '.js', '.json', '.md', '.py', '.docx', '.doc', '.pdf', '.pptx', '.ppt'].includes(ext)) {
            ctx.push(`[${type}_url]: ${f.payload.url}`);
        }
    }

    if (!query && ctx.length === 0) {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
        return reply("🧠 **amdus ai guide**\n━━━━━━━━━━━━━━━━\nhow to use:\n  • type your message directly\n  • reply to any image or file with a question\n  • type 'amdus reset' to start a new session\n\n📸 **vision & files**:\n  • reply to an image with: 'what is this?'\n  •  or use other models with image vision: 'gemini what is this?' (reply to image)\n\ncapabilities:\n  • vision: analyze photos and short videos\n  • files: read/write pdf, docx, and pptx\n  • search: real-time web access");
    }

    if (ctx.length > 0 && !query) {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
        return reply("📂 **media received**\n━━━━━━━━━━━━━━━━\ni see the file! now, reply to it with your question.\n\nexamples:\n  • 'summarize this document'\n  • 'what is in this photo?'\n  • 'gemini explain this image' (for vision models)");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const userData = await db.UserStat.findOne({ userId: uid });
        const session = { chatSessionId: userData?.lastSessionId || null };

        const res = await askChipp(ctx.length ? `${ctx.join("\n")}\n\nuser_query: ${query}` : query, null, session);
        
        if (!res || res.error) { 
            userLock.delete(uid); 
            return reply("api is a bit busy. try again in a sec."); 
        }
        
        if (res.data?.chatSessionId) {
            await db.UserStat.updateOne({ userId: uid }, { lastSessionId: res.data.chatSessionId });
        }

        let text = parseAI(res);
        if (!text) { userLock.delete(uid); return reply("no response."); }

        const mdLinkRegex = /\[(.*?)\]\((.*?)\)/gi;
        let fileHandled = false;

        let match;
        while ((match = mdLinkRegex.exec(text)) !== null) {
            let fileUrl = match[2];
            if (fileUrl.startsWith('/')) fileUrl = 'https://app.chipp.ai' + fileUrl;

            const isChipp = fileUrl.includes('chipp-images') || 
                            fileUrl.includes('chipp-application-files') || 
                            fileUrl.includes('app.chipp.ai/api/downloads') ||
                            fileUrl.includes('storage.googleapis.com/chipp-');

            if (isChipp) {
                const isImage = fileUrl.includes('chipp-images') || fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                const type = isImage ? 'image' : 'file';
                const fileName = match[1].replace(/[^\w.-]/g, '_') || "document.txt";
                const filePath = path.join(global.CACHE_PATH, `${Date.now()}_${fileName}`);

                try {
                    const download = await axios.get(fileUrl, {
                        responseType: 'stream',
                        headers: { 'Authorization': `Bearer ${process.env.CHIPP_API_KEY}` }
                    });

                    const writer = fs.createWriteStream(filePath);
                    download.data.pipe(writer);

                    await new Promise((resolve, reject) => {
                        writer.on('finish', resolve);
                        writer.on('error', reject);
                    });

                    await api.sendAttachment(type, filePath, uid);
                    setTimeout(() => { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); }, 30000);
                    
                    text = text.replace(match[0], "");
                    fileHandled = true;
                } catch (e) {
                    text = text.replace(match[0], `${match[1]}: ${fileUrl}`);
                }
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

        const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\$)\$[^\$\n]+(?<!\$)\$)/g;
        const mathBlocks = text.match(mathRegex) || [];

        let finalOutput = text
            .replace(mathRegex, "")
            .replace(/\{[\s\S]*?\}/g, "")
            .replace(/[ ]{2,}/g, " ")
            .trim();

        if (finalOutput) {
            await reply(finalOutput.toLowerCase());
        } else if (!fileHandled && mathBlocks.length === 0 && !text.includes('{')) {
            await reply(text.toLowerCase());
        }

        for (const m of mathBlocks) {
            const raw = m.replace(/\$\$|\\\[|\\\]|\\\(|\\\)/g, "").trim();
            const mathUrl = `https://latex.codecogs.com/png.image?%5Cdpi%7B200%7D%20%5Cbg_white%20${encodeURIComponent(raw)}`;
            await api.sendAttachment("image", mathUrl, uid);
        }

    } catch (err) {
        console.error(err.message);
    } finally {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
