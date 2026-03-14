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

module.exports.run = async function ({ args, api, reply }) {
    const query = args.join(" ");
    if (!query) return reply("google what?");

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, event.sender.id);

    try {
        const url = `https://www.googleapis.com/customsearch/v1?key=${process.env.GOOGLE_API_KEY}&cx=${process.env.GOOGLE_CX}&q=${encodeURIComponent(query)}`;
        const res = await http.get(url);
        const items = res.data.items;

        if (!items) return reply(`couldn't find anything for "${query}".`);

        const elements = items.slice(0, 5).map(item => ({
            title: item.title.substring(0, 80),
            subtitle: (item.snippet || "no description").substring(0, 80),
            image_url: `https://image.thum.io/get/width/500/crop/400/noanimate/${item.link}`,
            buttons: [{ type: "web_url", url: item.link, title: "visit" }]
        }));

        await api.sendCarousel(elements, event.sender.id);
    } catch (e) {
        reply("google is acting up.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, event.sender.id);
    }
};
