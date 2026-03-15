const { http } = require("../utils");

module.exports.config = {
    name: "wiki",
    author: "sethdico",
    category: "Utility",
    description: "wikipedia search",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const id = event.sender.id;
    const query = args.join(" ").trim();

    if (!query) {
        const btns = [
            { type: "postback", title: "history", payload: "wiki today" },
            { type: "postback", title: "random", payload: "wiki random" }
        ];
        return api.sendButton("📖 **wikipedia**\n━━━━━━━━━━━━━━━━\nsearch wiki or pick a mode.", btns, id);
    }

    if (query.toLowerCase() === "today") {
        const now = new Date();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        try {
            const res = await http.get(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`);
            const e = res.data.selected[Math.floor(Math.random() * res.data.selected.length)];
            const msg = `🗓️ **today in history**\n\n${e.year}: ${e.text}`;
            return api.sendButton(msg.toLowerCase(), [{ type: "postback", title: "another", payload: "wiki today" }], id);
        } catch (e) { return reply("history not available."); }
    }

    if (query.toLowerCase() === "random") {
        try {
            const res = await http.get(`https://en.wikipedia.org/api/rest_v1/page/random/summary`);
            const data = res.data;
            if (data.originalimage?.source) await api.sendAttachment("image", data.originalimage.source, id);
            return api.sendButton(`${data.title}\n\n${data.extract.substring(0, 300)}...`.toLowerCase(), 
                [{ type: "web_url", url: data.content_urls.desktop.page, title: "read more" }], id);
        } catch (e) { return reply("random failed."); }
    }

    try {
        const res = await http.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        const data = res.data;

        if (data.type === "disambiguation") return reply("that's too broad. be specific.");
        if (data.originalimage?.source) await api.sendAttachment("image", data.originalimage.source, id);

        const msg = `🔍 **${data.title}**\n\n${data.extract.substring(0, 400)}...`;
        const btns = [{ type: "web_url", url: data.content_urls.desktop.page, title: "full article" }];

        await api.sendButton(msg.toLowerCase(), btns, id);
    } catch (e) {
        reply(`couldn't find "${query}".`);
    }
};
