const { http } = require("../utils");

module.exports.config = {
    name: "copilot",
    author: "sethdico",
    category: "AI",
    description: "microsoft copilot with search & sources.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const uid = event.sender.id;
    let model = "default";
    let prompt = args.join(" ").trim();

    if (args[0]?.startsWith("-")) {
        const flag = args[0].toLowerCase();
        if (flag === "-think") model = "think-deeper";
        else if (flag === "-gpt5") model = "gpt-5";
        
        prompt = args.slice(1).join(" ").trim();
    }

    if (!prompt) {
        return reply("🚀 **copilot**\n━━━━━━━━━━━━━━━━\nhow to use:\n  copilot <prompt>\n  copilot -think <prompt>\n  copilot -gpt5 <prompt>\n\nexamples:\n  copilot what is a quantum computer\n  copilot -think solve this riddle");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, uid);

    try {
        const res = await http.get("https://api-library-kohi.onrender.com/api/copilot", {
            params: { prompt, model, user: uid }
        });

        const result = res.data?.data;
        if (!result || !result.text) return reply("i couldn't get an answer from copilot.");

        await api.sendMessage(`🚀 **copilot**\n\n${result.text}`, uid);

        if (result.citations && result.citations.length > 0) {
            const cards = result.citations.slice(0, 10).map(source => {
                let domain = "view source";
                try { if (source.url) domain = new URL(source.url).hostname.replace("www.", ""); } catch (e) {}
                
                return {
                    title: (source.title || "reference").substring(0, 80),
                    subtitle: domain.substring(0, 80),
                    image_url: source.icon || "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Microsoft_365_Copilot_Icon.svg/1024px-Microsoft_365_Copilot_Icon.svg.png",
                    buttons:[{ type: "web_url", url: source.url, title: "read more" }]
                };
            });
            await api.sendCarousel(cards, uid);
        }
    } catch (e) {
        reply("copilot is having some issues right now.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, uid);
    }
};
