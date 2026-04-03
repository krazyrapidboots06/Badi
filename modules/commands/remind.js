const db = require("../core/database");
const crypto = require("crypto");

const loadReminders = () => {
    db.getActiveReminders((list) => {
        list.forEach(r => {
            const delay = new Date(r.fireAt).getTime() - Date.now();
            if (delay > 0 && delay < 2147483647) {
                setTimeout(async () => {
                    if (!global.api) return;
                    try {
                        await global.api.sendMessage(`⏰ **reminder**\n\n"${r.message}"`, r.userId);
                        await db.deleteReminder(r.id);
                    } catch (e) {
                        console.error(`Failed to send reminder to ${r.userId}:`, e.message);
                    }
                }, delay);
            }
        });
    });
};

module.exports.config = {
    name: "remind",
    author: "sethdico",
    version: "2.9",
    category: "Utility",
    description: "set reminders for yourself",
    adminOnly: false,
    usePrefix: false,
    cooldown: 3
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const input = args.join(" ");

    if (!input) {
        return reply("⏰ **reminders**\n━━━━━━━━━━━━━━━━\nhow to use:\n  remind <time> <msg>\n  remind list\n  remind cancel <number>\n\nexamples:\n  remind 10m check oven\n  remind 2h sleep\n  remind 1d touch grass");
    }

    if (args[0] === "list") {
        const list = await new Promise(resolve => db.getActiveReminders(resolve));
        const userList = list.filter(r => r.userId === senderID);
        if (!userList.length) return reply("you have no active reminders");
        
        let msg = "📅 **your reminders**\n\n";
        userList.forEach((r, i) => { msg += `${i + 1}. ${r.message}\n`; });
        return reply(msg.toLowerCase());
    }

    if (args[0] === "cancel") {
        const num = parseInt(args[1]);
        if (!num) return reply("type the number. ex: remind cancel 1");
        
        const list = await new Promise(resolve => db.getActiveReminders(resolve));
        const toCancel = list.filter(r => r.userId === senderID)[num - 1];
        
        if (toCancel) {
            await db.deleteReminder(toCancel.id);
            return reply("reminder cancelled");
        }
        return reply("couldn't find that reminder");
    }

    const match = input.match(/^(\d+)([smhd])\s+(.+)$/);
    if (!match) return reply("invalid format. type just 'remind' to see the guide");
    
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const delay = parseInt(match[1]) * units[match[2]];

    if (delay > 2147483647) return reply("too far ahead. max is 24 days");

    const reminder = {
        id: crypto.randomBytes(8).toString('hex'),
        userId: senderID,
        message: match[3],
        fireAt: Date.now() + delay
    };

    await db.addReminder(reminder);
    
    setTimeout(async () => {
        if (api) {
            api.sendMessage(`⏰ **reminder**\n\n"${reminder.message}"`, senderID);
            await db.deleteReminder(reminder.id);
        }
    }, delay);

    reply(`got it. i'll remind you in ${match[1]}${match[2]}.`);
};

loadReminders();
