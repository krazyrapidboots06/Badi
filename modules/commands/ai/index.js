const path = require("path");
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const db = require("../../core/database");
const { askChipp } = require("./handlers");
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

async function handleTieredBan(userId, reason, reply) {
    if (global.ADMINS.has(userId)) return reply("safety: admin bypass active.");
    const existing = await db.Ban.findOne({ userId });
    const level = existing ? Math.min(existing.level + 1, 3) : 1;
    const config = BAN_TIERS[level];
    await db.addBan(userId, reason, level, config);
    global.BANNED_USERS.add(userId);
    const durationText = config ? `for ${level === 1 ? "3h" : "3d"}` : "permanently";
    reply(`\u{1F6AB} security: banned ${durationText}.\nreason: ${reason}`);
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
    } catch (e) {
        console.error('Facebook file upload failed:', e);
    }
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
        const url = f.payload?.url;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        const ext = path.extname(url.split('?')[0]).toLowerCase();
        const type = f.type === "image" ? "image" : (f.type === "video" ? "video" : "document");
        if (f.type !== "file" || ['.txt', '.js', '.json', '.md', '.py', '.docx', '.doc', '.pdf', '.pptx', '.ppt'].includes(ext)) {
            ctx.push(`[${type}_url]: ${url}`);
        }
    }

    if (!query && ctx.length === 0) {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
        return reply("🧠 **amdus ai guide**\n━━━━━━━━━━━━━━━━\nhow to use:\n  \u2022 type your message directly\n  \u2022 reply to any image or file with a question\n  \u2022 type 'amdus reset' to start a new session\n\n📸 **vision & files**:\n  \u2022 reply to an image with: 'what is this?'\n  \u2022 or use other models with image vision: 'gemini what is this?' (reply to image)\n\ncapabilities:\n  \u2022 vision: analyze photos and short videos\n  \u2022 files: read/write pdf, docx, and pptx\n  \u2022 search: real-time web access");
    }

    if (ctx.length > 0 && !query) {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
        return reply("📂 **media received**\n━━━━━━━━━━━━━━━━\ni see the file! now, reply to it with your question.\n\nexamples:\n  \u2022 'summarize this document'\n  \u2022 'what is in this photo?'\n  \u2022 'gemini explain this image' (for vision models)");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const userData = await db.UserStat.findOne({ userId: uid });
        const session = { chatSessionId: userData?.lastSessionId || null };

        const res = await askChipp(
            ctx.length ? `${ctx.join("\n")}\n\nuser_query: ${query}` : query,
            null,
            session
        );

        if (!res || res.error) {
            userLock.delete(uid);
            return reply("api is a bit busy. try again in a sec.");
        }

        const newSessionId = res.data?.chatSessionId;
        if (newSessionId && newSessionId !== userData?.lastSessionId) {
            await db.UserStat.updateOne(
                { userId: uid },
                { lastSessionId: newSessionId },
                { upsert: true }
            );
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

                if (act.action === "ban") {
                    if (!act.reason || act.reason.trim().length < 5) {
                        console.warn(`Ban blocked — AI returned missing/vague reason for uid=${uid}.`);
                        userLock.delete(uid);
                        return reply("no response.");
                    }
                    userLock.delete(uid);
                    return await handleTieredBan(uid, act.reason.trim(), reply);
                }

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

        mathBlocks.forEach((m, i) => {
            const raw = m.replace(/\$\$|\\\[|\\\]|\\\(|\\\)/g, "").trim();
            const mathUrl = `https://latex.codecogs.com/png.image?%5Cdpi%7B200%7D%20%5Cbg_white%20${encodeURIComponent(raw)}`;
            setTimeout(() => api.sendAttachment("image", mathUrl, uid), (i + 1) * 1200);
        });

    } catch (err) {
        console.error('Amdus command error:', err.message);
    } finally {
        userLock.delete(uid);
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
