const { http } = require("../utils");

module.exports.config = {
    name: "wiki",
    author: "sethdico",
    category: "Utility",
    description: "wikipedia search and feeds",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const id = event.sender.id;
    const query = args.join(" ").trim().toLowerCase();

    if (!query) {
        const msg = "📖 **wikipedia**\n━━━━━━━━━━━━━━━━\nhow to use:\n  wiki <search>\n  wiki today\n  wiki random\n  wiki featured\n  wiki news";
        const btns =[
            { type: "postback", title: "random", payload: "wiki random" },
            { type: "postback", title: "featured", payload: "wiki featured" },
            { type: "postback", title: "news", payload: "wiki news" }
        ];
        return api.sendButton(msg.toLowerCase(), btns, id);
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, id);

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    try {
        if (query === "today") {
            const res = await http.get(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${mm}/${dd}`);
            const events = res.data.selected;
            const e = events[Math.floor(Math.random() * events.length)];
            const msg = `🗓️ **today in history**\n\n${e.year}: ${e.text}`;
            
            await api.sendButton(msg.toLowerCase(), [{ type: "postback", title: "another", payload: "wiki today" }], id);
            return;
        }

        if (query === "featured") {
            const res = await http.get(`https://en.wikipedia.org/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`);
            const tfa = res.data.tfa;
            if (!tfa) return reply("no featured article today.");
            
            if (tfa.thumbnail?.source) await api.sendAttachment("image", tfa.thumbnail.source, id).catch(()=>{});
            
            const msg = `🌟 **featured article**\n\n${tfa.title}\n\n${tfa.extract.substring(0, 300)}...`;
            await api.sendButton(msg.toLowerCase(),[{ type: "web_url", url: tfa.content_urls.desktop.page, title: "read more" }], id);
            return;
        }

        if (query === "news") {
            const res = await http.get(`https://en.wikipedia.org/api/rest_v1/feed/featured/${yyyy}/${mm}/${dd}`);
            const news = res.data.news;
            if (!news || !news.length) return reply("no news right now.");
            
            const story = news[0];
            const msg = `📰 **in the news**\n\n${story.story}`;
            const link = story.links?.[0]?.content_urls?.desktop?.page;
            
            if (link) {
                await api.sendButton(msg.toLowerCase(),[{ type: "web_url", url: link, title: "read more" }], id);
            } else {
                reply(msg.toLowerCase());
            }
            return;
        }

        if (query === "random") {
            const res = await http.get(`https://en.wikipedia.org/api/rest_v1/page/random/summary`);
            const data = res.data;
            if (data.originalimage?.source) await api.sendAttachment("image", data.originalimage.source, id).catch(()=>{});
            
            await api.sendButton(`🎲 **${data.title}**\n\n${data.extract.substring(0, 300)}...`.toLowerCase(),[{ type: "web_url", url: data.content_urls.desktop.page, title: "read more" }], id);
            return;
        }

        const res = await http.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
        const data = res.data;

        if (data.type === "disambiguation") return reply("that's too broad. try being more specific.");
        if (data.originalimage?.source) await api.sendAttachment("image", data.originalimage.source, id).catch(()=>{});

        const msg = `🔍 **${data.title}**\n\n${data.extract.substring(0, 400)}...`;
        const btns =[{ type: "web_url", url: data.content_urls.desktop.page, title: "full article" }];

        await api.sendButton(msg.toLowerCase(), btns, id);

    } catch (e) {
        reply(`couldn't find anything for "${query}".`);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, id);
    }
};
