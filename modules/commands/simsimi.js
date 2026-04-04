const { http } = require("../utils");

module.exports.config = {
    name: "sim",
    author: "sethdico",
    category: "Fun",
    description: "chat and teach simsimi",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const id = event.sender.id;
    const apiKey = process.env.SIMSIMI_API_KEY || "3c911401e5f5452fb6585f0ccb97cdb31b30ddec";

    if (!args[0]) {
        return reply("simsimi chat\n\nusage:\nsim <message>\nsim teach <question> | <answer>\n\nexample:\nsim how are you?\nsim teach who is seth? | my developer");
    }

    if (args[0] === "teach") {
        const content = args.slice(1).join(" ");
        if (!content.includes("|")) return reply("wrong format. use: sim teach question | answer");
        
        const [ask, ans] = content.split("|").map(s => s.trim());
        if (!ask || !ans) return reply("provide both a question and an answer");

        try {
            await http.get("https://simsimi.ooguy.com/teach", { params: { ask, ans, apikey: apiKey } });
            return reply(`learned it. if u say "${ask}", i'll say "${ans}"`);
        } catch (e) {
            return reply("couldn't learn that right now");
        }
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);

    try {
        const res = await http.get("https://simsimi.ooguy.com/sim", { 
            params: { query: args.join(" "), apikey: apiKey } 
        });
        
        const response = res.data.respond || "idk what to say to that.";
        reply(response.toLowerCase());
    } catch (e) {
        reply("simsimi is sleeping");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
