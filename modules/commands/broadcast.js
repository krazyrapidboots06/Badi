const db = require("../core/database");

module.exports.config = {
    name: "broadcast",
    author: "sethdico",
    category: "Admin",
    description: "send an announcement to everyone.",
    adminOnly: true,
    usePrefix: false,
    cooldown: 15
};

module.exports.run = async function ({ event, args, api, reply }) {
    const msg = args.join(" ");

    if (!msg) {
        return reply("📢 **broadcast guide**\n━━━━━━━━━━━━━━━━\nhow to use:\n  broadcast <message>\n\nexample:\n  broadcast we have updated the ai memory system!");
    }

    try {
        const users = await db.getAllUsers();
        const recipients = users.filter(u => u.userId !== event.sender.id);

        if (!recipients.length) return reply("no users found to reach.");

        reply(`📢 starting broadcast to ${recipients.length} users. processing in background...`);

        (async () => {
            let sent = 0;
            let failed = 0;
            for (let i = 0; i < recipients.length; i++) {
                try {
                    await api.sendMessage(`📢 announcement\n\n${msg}`, recipients[i].userId);
                    sent++;
                } catch (e) {
                    failed++;
                    console.error(`Broadcast failed for user ${recipients[i].userId}:`, e.message);
                }
                if (i < recipients.length - 1) {
                    await new Promise(r => setTimeout(r, 100));
                }
            }
            console.log(`Broadcast complete: ${sent} sent, ${failed} failed`);
        })();

    } catch (e) {
        console.error('Broadcast error:', e.message);
        reply("broadcast failed to start."); 
    }
};
