const axios = require("axios");

module.exports.config = {
    name: "alldl",
    author: "sethdico",
    version: "1.3",
    category: "Media",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    let raw = event.message?.reply_to?.text || args.join("");
    
    if (!raw) {
        return reply("📥 **all in one downloader**\ngrabs vids from tiktok, fb, ig, youtube, x, etc.\n\nusage:\n- alldl <link>\n- or just reply to a link with 'alldl'\n\nfb lite blocking ur link? just add spaces or use [dot] like this:\nalldl https://www . tiktok [dot] com / video");
    }

    let url = raw.replace(/\s+/g, "").replace(/\[dot\]|\(dot\)/gi, ".");

    if (!url.includes("http")) {
        return reply("that doesn't look like a valid link.");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    try {
        const res = await axios.get("https://api-library-kohi.onrender.com/api/alldl", {
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
