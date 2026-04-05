const os = require('os');
const db = require("../core/database");

module.exports.config = {
    name: "stats",
    author: "sethdico",
    category: "Admin",
    description: "view system statistics",
    adminOnly: true,
    usePrefix: false,
    cooldown: 5,
    aliases: ["system", "performance", "info"]
};

module.exports.run = async function ({ reply }) {
    try {
        const mem = process.memoryUsage();
        const uptime = process.uptime();
        
        const topCmds = await db.getStats();
        const totalUsers = await db.UserStat.countDocuments();
        const activeToday = await db.UserStat.countDocuments({ 
            lastActive: { $gte: new Date(Date.now() - 86400000) } 
        });
        
        const activeThisHour = await db.UserStat.countDocuments({ 
            lastActive: { $gte: new Date(Date.now() - 3600000) } 
        });
        
        const uptimeStr = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`;
        const memoryMB = (mem.heapUsed / 1024 / 1024).toFixed(2);
        
        let message = `system statistics\n\n`;
        message += `uptime: ${uptimeStr}\n`;
        message += `memory: ${memoryMB}MB\n`;
        message += `total users: ${totalUsers}\n`;
        message += `active today: ${activeToday}\n`;
        message += `active this hour: ${activeThisHour}\n\n`;
        
        if (topCmds && topCmds.length > 0) {
            message += `top commands:\n`;
            topCmds.slice(0, 5).forEach((cmd, i) => {
                message += `${i + 1}. ${cmd._id}: ${cmd.count}\n`;
            });
        }
        
        reply(message);
    } catch (e) {
        reply("failed to get stats");
    }
};
