const { http } = require("../utils");

module.exports.config = {
    name: "perplexity",
    author: "sethdico",
    category: "AI",
    description: "deep reasoning ai.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 8,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const prompt = args.join(" ");

    if (!prompt) {
        return reply("🧠 **perplexity**\n━━━━━━━━━━━━━━━━\nwhat should i think about?\n\nexample:\n  perplexity how does quantum physics work");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get("https://api-library-kohi.onrender.com/api/pollination-ai", {
            params: { prompt, model: "perplexity-reasoning", user: senderID }
        });

        const answer = res.data.data;
        
        if (!answer) return reply("my brain is empty.");

        await api.sendMessage(`🧠 **perplexity reasoning**\n\n${answer}`.toLowerCase(), senderID);

    } catch (e) {
        reply("perplexity is offline or busy.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
