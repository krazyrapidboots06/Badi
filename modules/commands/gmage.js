const { http } = require("../utils");

module.exports.config = {
    name: "gmage",
    author: "sethdico",
    category: "Media",
    description: "google image search",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    const id = event.sender.id;

    if (!query) {
        return reply("🖼️ **google images**\n━━━━━━━━━━━━━━━━\nhow to use:\n  gmage <search term>\n\nexample:\n  gmage sunset beach");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);

    try {
        const res = await http.get("https://api-library-kohi.onrender.com/api/gmage", {
            params: { q: query }
        });

        const images = res.data.data;
        if (!images || !images.length) return reply("couldn't find any images.");

        const cards = images.slice(0, 10).map(url => ({
            title: query.substring(0, 80),
            image_url: url,
            buttons: [{ type: "web_url", url: url, title: "view image" }]
        }));

        await api.sendCarousel(cards, id);
    } catch (e) {
        reply("google is acting up.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
