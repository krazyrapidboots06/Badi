const { http } = require("../utils");

module.exports.config = {
    name: "alldl",
    author: "sethdico",
    version: "1.4",
    category: "Media",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    let raw = event.message?.reply_to?.text || args.join("");
    
    if (!raw) {
        return reply("📥 **all in one downloader**\ngrabs vids from tiktok, fb, ig, youtube, x, etc.\n\nusage:\n- alldl <link>\n- or just reply to a link with 'alldl'");
    }

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const match = raw.match(urlRegex);
    let url = match ? match[0] : raw.replace(/\s+/g, "");
    url = url.replace(/\[dot\]|\(dot\)/gi, ".");

    if (!url.includes("http")) {
        return reply("that doesn't look like a valid link.");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    try {
        const res = await http.get("https://api-library-kohi.onrender.com/api/alldl", {
            params: { url: url }
        });

        const vid = res.data.data?.videoUrl;

        if (vid) {
            await api.sendAttachment("video", vid, event.sender.id);
        } else {
            reply("couldn't grab the video.");
        }
    } catch (e) {
        reply("failed. link is either private or broken.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
