const { http } = require("../utils");

module.exports.config = {
    name: "felo",
    author: "sethdico",
    version: "1.0",
    category: "AI",
    description: "Deep search and research using Felo AI",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const query = args.join(" ");
    const senderID = event.sender.id;

    if (!query) {
        return reply("What would you like me to research for you?");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const response = await http.get("https://haji-mix-api.gleeze.com/api/felo", {
            params: { ask: query, stream: false }
        });

        const data = response.data.answer;

        if (!data || !data.llm_response) {
            return reply("I couldn't find a clear answer for that. Try asking something else?");
        }

        const cleanResponse = data.llm_response
            .replace(/\[\d+\]/g, "")
            .replace(/【\d+】/g, "")
            .trim();

        await api.sendMessage(`📚 **Felo Research**\n\n${cleanResponse}`, senderID);

        if (data.sources && data.sources.length > 0) {
            const cards = data.sources.slice(0, 6).map(source => ({
                title: source.title.length > 80 ? source.title.substring(0, 77) + "..." : source.title,
                subtitle: source.snippet.length > 80 ? source.snippet.substring(0, 77) + "..." : source.snippet,
                image_url: "https://files.catbox.moe/p9p4a3.png",
                buttons: [{ 
                    type: "web_url", 
                    url: source.url || "https://felo.ai", 
                    title: "View Article" 
                }]
            }));
            
            await api.sendCarousel(cards, senderID);
        }

    } catch (error) {
        reply("I ran into an issue while searching. Could you try again in a moment?");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
