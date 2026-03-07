const { http } = require("../utils");

module.exports.config = {
    name: "liner",
    author: "sethdico",
    version: "1.0",
    category: "AI",
    description: "Advanced deep search and research using Liner AI",
    adminOnly: false,
    usePrefix: false,
    cooldown: 10,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    const senderID = event.sender.id;

    if (!query) {
        return reply("What would you like me to research deeply?");
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

        if (!data || !data.llm_response) {
            return reply("I couldn't generate a deep research report for that query. Try rephrasing your question?");
        }

        const cleanResponse = data.llm_response
            .replace(/\(\(\d+\)\)/g, "")
            .trim();

        await api.sendMessage(`🧪 **Liner Deep Research**\n\n${cleanResponse}`, senderID);

        if (response.data.references && response.data.references.length > 0) {
            const sources = response.data.references.slice(0, 6).map(ref => ({
                title: ref.title.length > 80 ? ref.title.substring(0, 77) + "..." : ref.title,
                subtitle: ref.description ? (ref.description.length > 80 ? ref.description.substring(0, 77) + "..." : ref.description) : ref.hostname,
                image_url: ref.imageUrl || "https://files.catbox.moe/p9p4a3.png",
                buttons: [{ type: "web_url", url: ref.url, title: "View Source" }]
            }));

            await api.sendCarousel(sources, senderID);
        }

    } catch (error) {
        reply("Deep research is taking a bit longer than expected or the service is temporarily busy. Could you try again in a moment?");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
