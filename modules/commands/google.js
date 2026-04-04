const { http } = require("../utils");

module.exports.config = {
    name: "google",
    author: "sethdico",
    category: "Utility",
    description: "google search.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const query = args.join(" ");

    if (!query) {
        return reply(`🔎 GOOGLE SEARCH\n━━━━━━━━━━━━━━━━\nSearch the web instantly\n\nUSAGE:\n• google <search term>\n\nEXAMPLE:\n• google how to bake a cake`);
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}&q=${encodeURIComponent(query)}`;
        const res = await http.get(url);
        const items = res.data.items;

        if (!items) return reply(`couldn't find anything for "${query}"`);

        const elements = items.slice(0, 5).map(item => ({
            title: item.title.substring(0, 80),
            subtitle: (item.snippet || "no description").substring(0, 80),
            image_url: `https://image.thum.io/get/width/500/crop/400/noanimate/${item.link}`,
            buttons: [{ type: "web_url", url: item.link, title: "visit" }]
        }));

        await api.sendCarousel(elements, senderID);
    } catch (e) {
        reply("google is acting up right now");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
