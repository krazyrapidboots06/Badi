const db = require("../core/database");

module.exports.config = {
    name: "cmd",
    author: "sethdico",
    category: "Admin",
    description: "manage command status",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ args, reply }) {
    const action = args[0]?.toLowerCase();
    const target = args[1]?.toLowerCase();

    if (!action || !target) {
        return reply("🛠️ **command manager**\n━━━━━━━━━━━━━━━━\nhow to use:\n  cmd off <name>\n  cmd on <name>\n\nexample:\n  cmd off gmage");
    }

    if (!global.client.commands.has(target)) return reply("that command doesn't exist.");

    if (action === "off") {
        global.disabledCommands.add(target);
        await db.saveSetting("disabled_cmds", Array.from(global.disabledCommands));
        return reply(`${target} is now disabled.`);
    }

    if (action === "on") {
        global.disabledCommands.delete(target);
        await db.saveSetting("disabled_cmds", Array.from(global.disabledCommands));
        return reply(`${target} is now enabled.`);
    }
};
