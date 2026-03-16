const db = require("../modules/core/database");
const cooldowns = new Map();
const activeRequests = new Set();
const userLock = new Set();

module.exports = async function (event, api) {
    if (!event.sender?.id || event.message?.is_echo) return;
    
    const id = event.sender.id;
    const reply = (msg) => api.sendMessage(msg, id);

    if (event.postback?.payload) {
        const payload = event.postback.payload;
        if (payload.startsWith("ban ") || payload.startsWith("unban ")) {
            const [action, target] = payload.split(" ");
            const fakeEvent = { sender: { id: id } };
            return require("../modules/commands/ban").run({ event: fakeEvent, args: [action, target], reply });
        }
        if (payload.startsWith("copy_")) {
            return reply(`id: ${payload.split("_")[1]}`);
        }
    }

    const mid = event.message?.mid;
    if (mid) {
        if (activeRequests.has(mid)) return;
        activeRequests.add(mid);
        setTimeout(() => activeRequests.delete(mid), 60000);
    }

    let role = global.userCache.get(`role_${id}`);
    if (!role) {
        role = await db.getRole(id);
        global.userCache.set(`role_${id}`, role); 
    }
    
    const isAdmin = role === "admin";
    const userInfo = await api.getUserInfo(id);
    db.syncUser(id, userInfo);

    if (userInfo.name !== "messenger user") {
        await db.UserStat.updateOne({ userId: id }, { name: userInfo.name }, { upsert: true });
    }

    if (global.MAINTENANCE_MODE && !isAdmin) return;

    const body = (event.message?.text || event.postback?.payload || "").trim();
    if (!body && !event.message?.attachments) return;

    const args = body.split(/\s+/);
    const cmdName = args.shift()?.toLowerCase();
    const command = global.client.commands.get(cmdName) || global.client.commands.get(global.client.aliases.get(cmdName));

    if (command) {
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
            return reply("error executing command."); 
        }
    } 

    const ai = global.client.commands.get("amdus");
    if (ai && !userLock.has(id) && !global.disabledCommands?.has("amdus")) {
        userLock.add(id);
        const safety = setTimeout(() => userLock.delete(id), 45000);
        try {
            if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);
            await ai.run({ event, args: body.split(/\s+/), api, reply });
        } finally { 
            clearTimeout(safety);
            userLock.delete(id);
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, id); 
        }
    }
};
