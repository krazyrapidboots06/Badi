const { http } = require("../utils");

module.exports.config = {
    name: "gpt4o",
    author: "sethdico",
    category: "AI",
    description: "gpt-4o with vision and memory.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const query = args.join(" ");

    const attachments = [
        ...(event.message?.attachments || []),
        ...(event.message?.reply_to?.attachments || [])
    ].filter(a => a.type === "image");

    const imageUrl = attachments.length > 0 ? attachments[0].payload.url : "";

    if (!query && !imageUrl) {
        return reply("🌌 **gpt-4o**\n━━━━━━━━━━━━━━━━\nask me anything or send an image for me to analyze.");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const response = await http.get("https://haji-mix-api.gleeze.com/api/gpt4o", {
            params: {
                ask: query || "describe this image",
                uid: senderID,
                roleplay: "helpful and accurate assistant.",
                img_url: imageUrl
            }
        });

        const answer = response.data.answer;

        if (!answer) {
            return reply("couldn't get a response. try again?");
        }

        const formatted = answer
            .replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, (match, text, url) => `${text}: ${url}`)
            .trim();

        await api.sendMessage(`🌌 **gpt-4o**\n\n${formatted}`.toLowerCase(), senderID);

    } catch (error) {
        reply("i'm having trouble connecting to my brain right now.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
