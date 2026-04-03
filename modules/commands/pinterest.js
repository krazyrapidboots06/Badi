const { http } = require("../utils");

module.exports.config = {
    name: "pinterest",
    aliases: ["pin"],
    author: "sethdico",
    version: "1.2",
    category: "Media",
    adminOnly: false,
    usePrefix: false,
    cooldown: 10,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;

    if (!args.length) {
        return reply("📌 **pinterest guide**\n━━━━━━━━━━━━━━━━\nhow to use:\n  pin <search>\n  pin <search> <count>\n\nexamples:\n  pin aesthetic room 5\n  pin anime wallpapers\n\nnote: maximum is 10 images.");
    }

    let count = 5;
    let query = args.join(" ");

    if (!isNaN(args[args.length - 1])) {
        const num = parseInt(args[args.length - 1]);
        if (num > 0) {
            count = Math.min(num, 10);
            query = args.slice(0, -1).join(" ");
        }
    }

    if (!query) return reply("what do you want to search?");

    try {
        const res = await http.get("https://api-library-kohi.onrender.com/api/pinterest", {
            params: { query: query, count: count }
        });

        const images = res.data.data;

        if (!images || !images.length) {
            return reply("couldn't find any images for that search.");
        }

        reply(`📷 found ${Math.min(images.length, count)} images. sending them now...`);

        images.slice(0, count).forEach((img, index) => {
            setTimeout(() => {
                api.sendAttachment("image", img, senderID);
            }, index * 2000); 
        });

    } catch (e) {
        reply("pinterest service is currently unavailable.");
    }
};
