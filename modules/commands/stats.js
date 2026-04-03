const os = require('os');
const db = require("../core/database");

module.exports.config = {
    name: "stats",
    author: "sethdico",
    version: "3.1",
    category: "Admin",
    adminOnly: true,
    usePrefix: false,
    cooldown: 5
};

module.exports.run = async function ({ reply }) {
    try {
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        
        const d = Math.floor(uptime / 86400);
        const h = Math.floor((uptime % 86400) / 3600);
        const m = Math.floor((uptime % 3600) / 60);
        const s = Math.floor(uptime % 60);
        const upStr = d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`;

        const topCmds = await db.getStats();
        const totalUsers = await db.UserStat.countDocuments();
        const activeToday = await db.UserStat.countDocuments({ 
            lastActive: { $gte: new Date(Date.now() - 86400000) } 
        });

        const topList = topCmds.length 
            ? topCmds.slice(0, 5).map((c, i) => `  ${i + 1}. ${c.command} (${c.count})`).join('\n') 
            : "  none yet";

        const msg = `📊 system stats\n` +
                    `━━━━━━━━━━━━━━━━\n` +
                    `🤖 bot\n` +
                    `  cmds: ${global.client.commands.size}\n` +
                    `  sessions: ${global.sessions.size()}\n` +
                    `  banned: ${global.BANNED_USERS.size}\n\n` +
                    `👥 users\n` +
                    `  total: ${totalUsers}\n` +
                    `  active (24h): ${activeToday}\n\n` +
                    `🔥 top commands\n${topList}\n\n` +
                    `💻 system\n` +
                    `  ram: ${(mem.rss / 1024 / 1024).toFixed(1)}mb\n` +
                    `  uptime: ${upStr}\n` +
                    `  os: ${os.platform()} ${os.arch()}`;

        reply(msg.toLowerCase());
    } catch (e) {
        reply("failed to load stats. something broke.");
    }
};
