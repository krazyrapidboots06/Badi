const db = require("../core/database");

module.exports.config = {
    name: "ban",
    aliases: ["unban"],
    author: "sethdico",
    category: "Admin",
    description: "ban or unban users",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0
};

module.exports.run = async function ({ args, reply }) {
    const action = args[0]?.toLowerCase();
    const isUnban = action === "unban";
    
    let targetID = isUnban ? args[1] : (action === "ban" ? args[1] : args[0]);
    let reason = args.slice(isUnban ? 2 : (action === "ban" ? 2 : 1)).join(" ") || "no reason.";

    if (!targetID || isNaN(targetID)) {
        return reply("usage:\n  ban <id> <reason>\n  unban <id>");
    }

    if (global.ADMINS.has(targetID)) {
        return reply("can't ban an admin.");
    }

    if (isUnban) {
        await db.removeBan(targetID);
        global.BANNED_USERS.delete(targetID);
        return reply(`unbanned ${targetID}.`);
    }

    try {
        await db.addBan(targetID, reason);
        global.BANNED_USERS.add(targetID);
        reply(`banned ${targetID}.\nreason: ${reason}`.toLowerCase());
    } catch (e) {
        reply("failed to ban.");
    }
};
