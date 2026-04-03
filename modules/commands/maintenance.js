const db = require("../core/database");

module.exports.config = {
    name: "maintenance",
    author: "sethdico",
    category: "Admin",
    description: "toggle bot mode.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0
};

module.exports.run = async function ({ args, reply }) {
    const action = args[0]?.toLowerCase();
    const reason = args.slice(1).join(" ") || "working on some stuff, be back soon";

    if (action === "on") {
        global.MAINTENANCE_MODE = true;
        global.MAINTENANCE_REASON = reason;
        await db.setSetting("maintenance", "true");
        await db.setSetting("maintenance_reason", reason);
        return reply(`⚠️ bot is in maintenance.\nreason: ${reason}`);
    } 
    
    if (action === "off") {
        global.MAINTENANCE_MODE = false;
        await db.setSetting("maintenance", "false");
        return reply("✅ bot is back online");
    }

    reply(`status: ${global.MAINTENANCE_MODE ? "ON" : "OFF"}\nreason: ${global.MAINTENANCE_REASON}`);
};
