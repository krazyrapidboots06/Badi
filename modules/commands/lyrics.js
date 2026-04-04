const { http } = require("../utils");

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
        return reply("lyrics search\n\nusage:\nlyrics <song title>\n\nexample:\nlyrics 16 mirrors");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);

    try {
        const res = await axios.get("https://api-library-kohi.onrender.com/api/lyrics", {
            params: { query: query }
        });

        const { title, artist, lyrics } = res.data.data;
        if (!lyrics) return reply("couldn't find those lyrics.");

        const msg = `title: ${title}\nartist: ${artist}\n\n${lyrics}`;
        await api.sendMessage(msg.toLowerCase(), id);

    } catch (e) {
        try {
            reply("main lyrics api down, trying backup...");
            
            const res = await http.get("https://shin-apis.onrender.com/search/lyricsv2", {
                params: { title: query }
            });

            const list = res.data.data;
            if (!list || !list.length) return reply("couldn't find those lyrics in backup either.");

            const song = list[0];
            if (!song.plainLyrics) return reply("lyrics are unavailable for this one");

            const result = `title: ${song.trackName}\nartist: ${song.artistName}\n\n${song.plainLyrics}`;
            await api.sendMessage(result.toLowerCase(), id);

        } catch (backupError) {
            reply("both lyrics APIs are down.");
        }
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
