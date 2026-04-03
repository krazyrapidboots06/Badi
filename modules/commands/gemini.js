const { http } = require("../utils");

module.exports.config = {
    name: "gemini",
    author: "sethdico",
    category: "AI",
    description: "gemini 3 pro with vision.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const uid = event.sender.id;
    const prompt = args.join(" ").trim();
    const cookie = process.env.GEMINI_COOKIE;

    const attachments = [
        ...(event.message?.attachments || []),
        ...(event.message?.reply_to?.attachments || [])
    ].filter(a => a.type === "image").map(a => a.payload.url);

    if (!prompt && attachments.length === 0) {
        return reply("✨ **gemini 3 pro**\n━━━━━━━━━━━━━━━━\nhow to use:\n  gemini <query>\n  gemini <query> (reply to an image)\n  gemini clear (reset chat)\n\nexample:\n  gemini tell me a story");
    }

    if (!cookie) return reply("gemini cookie is missing.");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    if (prompt.toLowerCase() === "clear" || prompt.toLowerCase() === "reset") {
        try {
            await http.post("https://yaya-q598.onrender.com/gemini", {
                senderid: uid,
                message: "clear",
                cookies: { "__Secure-1PSID": cookie.trim() }
            });
            return reply("memory cleared.");
        } catch (e) {
            return reply("failed to clear history.");
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
        }
    }

    try {
        const res = await http.post("https://yaya-q598.onrender.com/gemini", {
            senderid: uid,
            message: prompt || "describe this image",
            cookies: { "__Secure-1PSID": cookie.trim() },
            urls: attachments
        }, { timeout: 60000 });

        const data = res.data;
        if (data?.response) {
            const modelName = data.fallback ? "gemini flash" : "gemini pro";
            await api.sendMessage(`✨ **${modelName}**\n\n${data.response}`, uid);
        } else {
            reply("no response from gemini.");
        }
    } catch (e) {
        reply("gemini is busy or cookie expired.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
