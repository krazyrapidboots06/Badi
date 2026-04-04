const { http } = require("../utils");

module.exports.config = {
    name: "bible",
    author: "sethdico",
    category: "Fun",
    description: "bible verses",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, api, reply }) {
    const senderID = event.sender.id;
    
    try {
        const res = await http.get("https://urangkapolka.vercel.app/api/bible");
        const { verse, reference, text } = res.data;
        
        const msg = `${reference || "bible"}\n\n${verse || text}`;
        api.sendMessage(msg.toLowerCase(), senderID);
    } catch (e) {
        reply("bible api is down");
    }
};
