module.exports.config = {
    name: "call",
    author: "sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0
};

module.exports.run = async function ({ args, api, reply }) {
    const id = args[0];
    const msg = args.slice(1).join(" ");
    
    if (!id || !msg) return reply("usage: call <id> <message>");
    
    try {
        await api.sendMessage(`message from dev:\n\n${msg}`, id);
        reply(`sent to ${id}`);
    } catch (e) { 
        reply("couldn't send it. check the id"); 
    }
};
