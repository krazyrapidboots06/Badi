const { http } = require("../utils");

module.exports.config = {
    name: "nasa",
    author: "sethdico",
    version: "2.1",
    category: "Fun",
    description: "space photo of the day",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const apiKey = process.env.NASA_API_KEY;

    if (!apiKey) return reply("nasa api key is missing.");

    if (args[0] === "help") {
        return reply("🚀 **nasa apod**\n━━━━━━━━━━━━━━━━\nhow to use:\n  nasa - today's photo\n  nasa random - random space photo");
    }

    let url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;
    if (args[0] === "random") url += "&count=1";

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get(url);
        const data = Array.isArray(res.data) ? res.data[0] : res.data;

        const description = data.explanation.length > 300 
            ? data.explanation.substring(0, 297) + "..." 
            : data.explanation;

        const msg = `🌌 **${data.title}**\n📅 ${data.date}\n\n${description}`;

        if (data.media_type === "image") {
            await api.sendAttachment("image", data.hdurl || data.url, senderID);
        }
        
        const btns = [{ type: "postback", title: "another one", payload: "nasa random" }];
        await api.sendButton(msg, btns, senderID);

    } catch (e) {
        reply("nasa api is sleeping.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
