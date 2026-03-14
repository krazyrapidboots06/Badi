const db = require("../core/database");

module.exports.config = {
    name: "getuser",
    author: "sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false
};

module.exports.run = async function ({ api, reply }) {
    try {
        const list = await db.UserStat.find().sort({ lastActive: -1 }).limit(10).lean();

        if (!list.length) return reply("nothing in the database yet.");

        let msg = "recent users list\n\n";

        for (let i = 0; i < list.length; i++) {
            const user = list[i];
            let name = user.name;

            if (name === "messenger user") {
                const info = await api.getUserInfo(user.userId);
                name = info.name;
            }

            const icon = global.BANNED_USERS.has(user.userId) ? "🚫" : "👤";
            msg += `${i + 1}. ${icon} ${name}\nid: ${user.userId}\n\n`;
        }

        reply(msg.toLowerCase());
    } catch (e) {
        reply("failed to fetch the list.");
    }
};
