const { http } = require("../utils");

module.exports.config = {
    name: "lyricsv2",
    author: "sethdico",
    category: "Media",
    description: "search song lyrics via lrclib",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const songQuery = args.join(" ");

    if (!songQuery) {
        return reply("🎵 **lyrics search**\n━━━━━━━━━━━━━━━━\nhow to use:\n  lyricsv2 <song title>\n\nexample:\n  lyricsv2 16 mirrors");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get("https://shin-apis.onrender.com/search/lyricsv2", {
            params: { title: songQuery }
        });

        const list = res.data.data;
        if (!list || !list.length) return reply("couldn't find those lyrics");

        const song = list[0];
        if (!song.plainLyrics) return reply("lyrics are unavailable for this one");

        const result = `🎵 ${song.trackName}\n🎤 ${song.artistName}\n\n${song.plainLyrics}`;
        await api.sendMessage(result.toLowerCase(), senderID);

    } catch (e) {
        reply("api is acting up.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
