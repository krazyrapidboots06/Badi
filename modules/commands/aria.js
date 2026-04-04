const { http, parseAI } = require("../utils");
const API_URLS = require("../../config/apis");

module.exports.config = {
    name: "aria",
    author: "sethdico",
    category: "AI",
    description: "aria ai with memory.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const input = args.join(" ");
    const senderID = event.sender.id;

    if (!input) {
        return reply("aria ai\n\nusage:\naria <message>\n\nexample:\naria write me a poem about the ocean");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get(API_URLS.aria, {
            params: { ask: input, userid: senderID },
            timeout: 60000
        });
        
        const result = parseAI(res);
        if (!result) return reply("aria didn't say anything.");

        await api.sendMessage(`${result}`.toLowerCase(), senderID);
    } catch (e) {
        reply("aria is currently sleeping.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
