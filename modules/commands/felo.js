const { http } = require("../utils");

module.exports.config = {
    name: "felo",
    author: "sethdico",
    category: "AI",
    description: "deep research assistant",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const query = args.join(" ");

    if (!query) {
        return reply("📚 **felo research**\n━━━━━━━━━━━━━━━━\nhow to use:\n  felo <topic>\n\nexample:\n  felo history of the internet");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get("https://haji-mix-api.gleeze.com/api/felo", {
            params: { ask: query, stream: false }
        });

        const data = res.data.answer;
        if (!data || !data.llm_response) return reply("i couldn't find a clear answer for that.");

        const clean = data.llm_response
            .replace(/\[\d+\]/g, "")
            .replace(/【\d+】/g, "")
            .trim();

        await api.sendMessage(`📚 **felo research**\n\n${clean}`.toLowerCase(), senderID);

        if (data.sources?.length > 0) {
            const cards = data.sources.slice(0, 6).map(s => ({
                title: s.title.substring(0, 80),
                subtitle: s.snippet.substring(0, 80),
                image_url: "https://files.catbox.moe/p9p4a3.png",
                buttons: [{ type: "web_url", url: s.url || "https://felo.ai", title: "view article" }]
            }));
            
            await api.sendCarousel(cards, senderID);
        }

    } catch (e) {
        reply("i ran into an issue while searching.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
