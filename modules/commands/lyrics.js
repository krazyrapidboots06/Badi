const axios = require("axios");

module.exports.config = {
    name: "lyrics",
    author: "sethdico",
    category: "Media",
    description: "search song lyrics",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    const id = event.sender.id;

    if (!query) {
        return reply("🎵 **lyrics search**\n━━━━━━━━━━━━━━━━\nhow to use:\n  lyrics <song title>\n\nexample:\n  lyrics 16 mirrors");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);

    try {
        const res = await axios.get("https://api-library-kohi.onrender.com/api/lyrics", {
            params: { query: query }
        });

        const { title, artist, lyrics } = res.data.data;
        if (!lyrics) return reply("couldn't find those lyrics.");

        const msg = `🎵 ${title}\n🎤 ${artist}\n\n${lyrics}`;
        await api.sendMessage(msg.toLowerCase(), id);

    } catch (e) {
        reply("lyrics api is down.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
