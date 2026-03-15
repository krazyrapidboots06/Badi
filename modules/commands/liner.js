const { http } = require("../utils");

module.exports.config = {
    name: "liner",
    author: "sethdico",
    category: "AI",
    description: "deep research assistant",
    adminOnly: false,
    usePrefix: false,
    cooldown: 10,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const query = args.join(" ");

    if (!query) {
        return reply("🧪 **liner research**\n━━━━━━━━━━━━━━━━\nhow to use:\n  liner <topic>\n\nexample:\n  liner black hole theory");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const response = await http.get("https://haji-mix-api.gleeze.com/api/liner", {
            params: {
                ask: query,
                mode: "general",
                deepsearch: "true",
                stream: "false"
            },
            timeout: 90000 
        });

        const data = response.data.answer;
        if (!data || !data.llm_response) return reply("couldn't generate a report for that.");

        const cleanResponse = data.llm_response.replace(/\(\(\d+\)\)/g, "").trim();

        await api.sendMessage(`🧪 **liner research**\n\n${cleanResponse}`.toLowerCase(), senderID);

        if (data.references?.length > 0) {
            const sources = data.references.slice(0, 6).map(ref => ({
                title: ref.title.substring(0, 80),
                subtitle: (ref.description || ref.hostname).substring(0, 80),
                image_url: ref.imageUrl || "https://files.catbox.moe/p9p4a3.png",
                buttons: [{ type: "web_url", url: ref.url, title: "view source" }]
            }));

            await api.sendCarousel(sources, senderID);
        }

    } catch (e) {
        reply("research is taking too long or service is down.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
