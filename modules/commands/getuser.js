const db = require("../core/database");

module.exports.config = {
    name: "getuser",
    author: "sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false,
    cooldown: 0
};

module.exports.run = async function ({ args, event, api, reply }) {
    const id = event.sender.id;
    const sub = args[0]?.toLowerCase();
    const adminIds = Array.from(global.ADMINS);

    if (sub === "search") {
        const query = args.slice(1).join(" ");
        if (!query) return reply("usage: getuser search <name>\n\nexample:\n  getuser search seth");
        
        const list = await db.UserStat.find({ 
            name: new RegExp(query, 'i'),
            userId: { $nin: adminIds } 
        }).limit(10).lean();
        
        if (!list.length) return reply("nobody found.");
        
        global.sessions.set(`list_${id}`, { users: list });
        
        let msg = `🔍 results for "${query}"\n\n`;
        list.forEach((u, i) => {
            const icon = global.BANNED_USERS.has(u.userId) ? "🚫" : "👤";
            msg += `${i + 1}. ${icon} ${u.name}\n`;
        });
        msg += "\ntype 'getuser <number>' to see info.";
        return reply(msg.toLowerCase());
    }

    if (sub && !isNaN(sub) && args.length === 1) {
        const num = parseInt(sub);
        const session = global.sessions.get(`list_${id}`);
        
        if (!session || !session.users[num - 1]) {
            return reply("invalid number. type 'getuser' to see the list first.");
        }
        
        const target = session.users[num - 1];
        const isBanned = global.BANNED_USERS.has(target.userId);
        
        const msg = `👤 user profile\n\nname: ${target.name}\nid: ${target.userId}\nactive: ${new Date(target.lastActive).toLocaleDateString()}\ncmds: ${target.count}`;
        
        const btns =[
            { type: "postback", title: isBanned ? "unban" : "ban", payload: `${isBanned ? "unban" : "ban"} ${target.userId}` },
            { type: "postback", title: "copy id", payload: target.userId },
            { type: "postback", title: "view chat", payload: `chat_${target.lastSessionId}` }
        ];
        
        return api.sendButton(msg.toLowerCase(), btns, id);
    }

    try {
        const page = sub === "page" ? (parseInt(args[1]) || 1) : 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        
        const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
        const list = await db.UserStat.find({ 
            lastActive: { $gte: threeDaysAgo },
            userId: { $nin: adminIds } 
        })
            .sort({ lastActive: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        if (!list.length) return reply(page === 1 ? "no active users in the last 3 days." : "page is empty.");

        global.sessions.set(`list_${id}`, { users: list });

        let msg = `📅 active users (3d) - pg ${page}\n\n`;
        list.forEach((u, i) => {
            const icon = global.BANNED_USERS.has(u.userId) ? "🚫" : "👤";
            msg += `${i + 1}. ${icon} ${u.name}\n`;
        });
        
        msg += "\n• getuser <number> for info\n• getuser page <number>\n• getuser search <name>";
        reply(msg.toLowerCase());
    } catch (e) {
        reply("failed to load list.");
    }
};
