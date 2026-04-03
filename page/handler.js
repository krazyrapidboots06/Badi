const db = require("../modules/core/database");
const cooldowns = new Map();

module.exports = async function (event, api) {
    if (!event.sender?.id || event.message?.is_echo) return;
    
    const id = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, id);

    if (event.postback?.payload) {
        const payload = event.postback.payload;

        if (payload.startsWith("ban ") || payload.startsWith("unban ")) {
            const [action, target] = payload.split(" ");
            return require("../modules/commands/ban").run({ args: [action, target], reply });
        }

        if (payload.startsWith("chat_")) {
            const sid = payload.split("_")[1];
            return require("../modules/commands/transcript").run({ args: [sid], api, reply, event });
        }

        if (!isNaN(payload)) {
            return reply(`📋 user id copied:\n\n${payload}\n\n(ready to paste)`);
        }
    }

    let role = await db.getRole(id);
    
    const isAdmin = role === "admin";
    const userInfo = await api.getUserInfo(id);
    db.syncUser(id, userInfo);

    if (userInfo.name !== "messenger user") {
        await db.UserStat.updateOne({ userId: id }, { name: userInfo.name }, { upsert: true });
    }

    if (global.MAINTENANCE_MODE && !isAdmin) return;

    const body = (event.message?.text || event.postback?.payload || "").trim();
    if (!body && !event.message?.attachments) return;

    const words = body.split(/\s+/);
    let cmdName = null;
    let cmdIndex = -1;
    const firstWord = words[0]?.toLowerCase();
    if (global.client.commands.has(firstWord) || global.client.aliases.has(firstWord)) {
        cmdName = firstWord;
        cmdIndex = 0;
    }
    const args = cmdIndex >= 0 ? words.slice(cmdIndex + 1) : words;
    if (cmdName) cmdName = global.client.aliases.get(cmdName) || cmdName;
    const command = cmdName ? global.client.commands.get(cmdName) : null;

    if (command) {
        if (!command.config) {
            console.error(`Command ${cmdName} has invalid config`);
            return reply("command is misconfigured.");
        }
        if (global.disabledCommands?.has(command.config.name) && !isAdmin) return reply("command disabled.");
        if (command.config.adminOnly && !isAdmin) return;

        if (command.config.cooldown && !isAdmin) {
            const key = `${id}-${command.config.name}`;
            const lastUsed = cooldowns.get(key) || 0;
            const remain = (lastUsed + (command.config.cooldown * 1000)) - Date.now();
            if (remain > 0) return reply(`wait ${Math.ceil(remain / 1000)}s`);
            cooldowns.set(key, Date.now());
        }

        try {
            db.trackCommandUsage(command.config.name);
            await command.run({ event, args, api, reply });
            return;
        } catch (e) { 
            console.error(`Command error (${command.config.name}):`, e.message);
            return reply("something went wrong with that command. try again in a sec."); 
        }
    } 

    const ai = global.client.commands.get("amdus");
    if (ai && !global.disabledCommands?.has("amdus")) {
        try {
            await ai.run({ event, args: body.split(/\s+/), api, reply });
        } catch (e) {}
    }
};
