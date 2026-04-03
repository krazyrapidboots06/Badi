const { http } = require("../utils");

module.exports.config = {
    name: "dalle",
    author: "sethdico",
    category: "Media",
    description: "generate images from text.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 10,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const prompt = args.join(" ");
    const uid = event.sender.id;

    if (!prompt) {
        return reply("🎨 **dalle generator**\n━━━━━━━━━━━━━━━━\nhow to use:\n  dalle <prompt>\n\nexample:\n  dalle cyberpunk cat");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        reply("generating... this might take a sec.");

        const res = await http.get("https://api-library-kohi.onrender.com/api/opendalle", {
            params: { prompt: prompt }
        });

        const image = res.data.data || res.data.url || res.data;

        if (image) {
            await api.sendAttachment("image", image, uid);
        } else {
            reply("failed to generate. try a different prompt.");
        }

    } catch (e) {
        reply("api is sleeping or having issues.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
