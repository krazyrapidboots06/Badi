const { http } = require("../utils");

module.exports.config = {
    name: "pokemon",
    author: "sethdico",
    category: "Fun",
    description: "pokedex info.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 3,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const query = args[0]?.toLowerCase();
    
    if (!query) {
        return reply("⚡ **pokedex**\n━━━━━━━━━━━━━━━━\nhow to use:\n  pokemon <name/id/random>\n\nexample:\n  pokemon pikachu\n  pokemon random");
    }

    const id = query === "random" ? Math.floor(Math.random() * 1025) + 1 : query;

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    try {
        const res = await http.get(`https://pokeapi.co/api/v2/pokemon/${id}`);
        const data = res.data;
        
        const name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
        const types = data.types.map(t => t.type.name).join(", ");
        const abilities = data.abilities.map(a => a.ability.name).slice(0, 2).join(", ");
        const stats = data.stats.map(s => `${s.stat.name.slice(0, 3)}: ${s.base_stat}`).join(" | ");
        const img = data.sprites.other["official-artwork"].front_default;

        const msg = `⚡ **${name}** (#${data.id})\n` +
                    `🧬 type: ${types}\n` +
                    `📏 height: ${data.height / 10}m | ⚖️ weight: ${data.weight / 10}kg\n` +
                    `✨ abilities: ${abilities}\n\n` +
                    `📊 **stats**\n${stats}`.toLowerCase();

        if (img) await api.sendAttachment("image", img, senderID);
        await api.sendMessage(msg, senderID);

    } catch (e) {
        reply("couldn't find that pokemon.");
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
