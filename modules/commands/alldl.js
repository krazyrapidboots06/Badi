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
        return reply(`all in one downloader

downloads videos from social media platforms

usage:
• alldl <link>
• reply to link with 'alldl'

note: if links can't be sent, use dots or spaces
examples:
• alldl example[dot]com
• alldl example dot com`);
    }

    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const match = raw.match(urlRegex);
    let url = match ? match[0] : raw.replace(/\s+/g, "");
    url = url.replace(/\[dot\]|\(dot\)/gi, ".");

    if (!url.includes("http")) {
        return reply("invalid link format");
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
            reply("couldn't download video");
        }
    } catch (e) {
        reply("download failed - link may be private or broken");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
