const { http, parseAI } = require("../utils");
const API_URLS = require("../../config/apis");

module.exports.config = { 
    name: "webpilot", 
    author: "sethdico", 
    category: "AI", 
    description: "web search assistant", 
    adminOnly: false, 
    usePrefix: false, 
    cooldown: 5 
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const input = args.join(" ").trim();
    
    if (!input) {
        return reply("🌐 **webpilot**\n━━━━━━━━━━━━━━━━\nhow to use:\n  webpilot <query>\n\nexample:\n  webpilot latest tech news today");
    }
    
    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get(API_URLS.webpilot, { 
            params: { question: input },
            timeout: 60000
        });
        
        const result = parseAI(res);
        if (!result) return reply("couldn't get a response.");
        
        await api.sendMessage(`🌐 **webpilot**\n\n${result}`.toLowerCase(), senderID);
    } catch (e) {
        reply("webpilot is down right now.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
