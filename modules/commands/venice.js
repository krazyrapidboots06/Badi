const { http } = require("../utils");

module.exports.config = {
    name: "venice",
    author: "sethdico",
    category: "AI",
    description: "precise ai model.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const query = args.join(" ");

    if (!query) {
        return reply("🎭 **venice ai**\n━━━━━━━━━━━━━━━━\nhow to use:\n  venice <question>\n\nexample:\n  venice explain string theory");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get("https://shin-apis.onrender.com/ai/venice", {
            params: { 
                question: query,
                systemPrompt: "a helpful precise ai" 
            },
            timeout: 60000
        });

        const answer = res.data.answer;

        if (answer) {
            await api.sendMessage(`🎭 **venice ai**\n\n${answer}`.toLowerCase(), senderID);
        } else {
            reply("couldn't get a response from venice");
        }

    } catch (e) {
        reply("venice is currently unavailable");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
