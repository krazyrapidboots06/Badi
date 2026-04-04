const { http } = require("../utils");
const API_URLS = require("../../config/apis");

module.exports.config = {
    name: "you",
    author: "sethdico",
    category: "AI",
    description: "you.com search",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const input = args.join(" ").trim();
    
    if (!input) {
        return reply("you.com ai\n\nusage:\nyou <question>\n\nexample:\nyou who won the last world cup");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get(API_URLS.you, { 
            params: { chat: input },
            timeout: 60000
        });
        
        const answer = res.data.message || res.data.response;
        if (!answer) return reply("no response");
        
        await api.sendMessage(`${answer}`, senderID);
    } catch (e) { 
        reply("you.com is acting up"); 
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
