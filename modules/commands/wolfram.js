const { http } = require("../utils");

module.exports.config = {
    name: "wolfram",
    author: "sethdico",
    category: "Utility",
    description: "computational knowledge search",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const id = event.sender.id;
    const input = args.join(" ");
    
    if (!input) {
        return reply("🧮 **wolfram alpha guide**\n━━━━━━━━━━━━━━━━\nhow to use:\n  wolfram <query>\n\nexample:\n  wolfram derivative of x^2\n  wolfram distance to moon");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);

    try {
        const res = await http.get(`https://api.wolframalpha.com/v2/query`, {
            params: { 
                appid: process.env.WOLFRAM_APP_ID, 
                input: input, 
                output: "json", 
                format: "plaintext,image" 
            },
            timeout: 60000
        });

        const data = res.data.queryresult;
        
        if (!data.success || data.error) return reply("wolfram couldn't calculate that");

        const output = data.pods.map(pod => {
            const text = pod.subpods.map(s => s.plaintext).filter(Boolean).join("\n");
            return text ? `📌 **${pod.title}**\n${text}` : "";
        }).filter(Boolean).join("\n\n");

        if (!output) return reply("no clear results found");

        await api.sendMessage(output.toLowerCase(), id);

        const images = data.pods.flatMap(p => p.subpods).map(s => s.img?.src).filter(Boolean);
        
        images.slice(0, 3).forEach((img, index) => {
            setTimeout(() => {
                api.sendAttachment("image", img, id);
            }, (index + 1) * 1500);
        });

    } catch (e) {
        reply("wolfram service is offline");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
