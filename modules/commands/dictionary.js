const { http } = require("../utils");

module.exports.config = {
    name: "dict", 
    aliases: ["dictionary", "define"],
    author: "sethdico", 
    category: "Utility", 
    description: "search for word definitions and slang.", 
    adminOnly: false, 
    usePrefix: false, 
    cooldown: 3,
};

module.exports.run = async function ({ event, args, api, reply }) {
    const senderID = event.sender.id;
    const isSlang = args[0]?.toLowerCase() === "slang";
    const query = isSlang ? args.slice(1).join(" ") : args.join(" ");

    if (!query) {
        return reply("📖 **dictionary**\n━━━━━━━━━━━━━━━━\nhow to use:\n  dict <word>\n  dict slang <word>\n\nexamples:\n  dict serendipity\n  dict slang rizz");
    }

    if (api.sendTypingIndicator) api.sendTypingIndicator(true, senderID);

    if (isSlang) {
        try {
            const res = await http.get(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(query)}`);
            const list = res.data.list;
            if (!list || !list.length) return reply(`no slang found for "${query}".`);

            const entry = list[0];
            const def = entry.definition.replace(/[\[\]]/g, "");
            const ex = entry.example.replace(/[\[\]]/g, "");

            const msg = `🏙️ **${query}**\n\n${def}\n\nexample: ${ex}`;
            const btns =[{ type: "postback", title: "formal def", payload: `dict ${query}` }];
            return api.sendButton(msg.toLowerCase(), btns, senderID);
        } catch (e) {
            return reply("urban dictionary is down rn.");
        } finally {
            if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
        }
    }

    const apiKey = process.env.DICT_API_KEY;
    
    if (apiKey) {
        try {
            const res = await http.get(`https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(query)}?key=${apiKey}`);
            const data = res.data;

            if (!data || !data.length) throw new Error("empty");
            if (typeof data[0] === 'string') throw new Error("suggestions");

            const entry = data[0];
            const def = entry.shortdef ? entry.shortdef.join("\n• ") : "no definition";
            const type = entry.fl || ""; 
            const pronunciation = entry.hwi?.prs?.[0]?.mw || ""; 

            let msg = `📖 **${entry.hwi?.hw?.replace(/\*/g, "") || query}** ${type ? `(${type})` : ''}\n`;
            if (pronunciation) msg += `/${pronunciation}/\n`;
            msg += `\n• ${def}`;

            const btns =[{ type: "postback", title: "slang def", payload: `dict slang ${query}` }];
            await api.sendButton(msg.toLowerCase(), btns, senderID);

            if (entry.hwi?.prs?.[0]?.sound?.audio) {
                const audioName = entry.hwi.prs[0].sound.audio;
                let subdir = audioName[0];
                if (!isNaN(subdir) || !/^[a-zA-Z]/.test(subdir)) subdir = "number";
                else if (audioName.startsWith("bix")) subdir = "bix";
                else if (audioName.startsWith("gg")) subdir = "gg";

                const audioUrl = `https://media.merriam-webster.com/audio/prons/en/us/mp3/${subdir}/${audioName}.mp3`;
                await api.sendAttachment("audio", audioUrl, senderID).catch(()=>{});
            }
            return;
        } catch (e) {
            // fallback through free dict
        }
    }

    try {
        const res = await http.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
        const data = res.data[0];

        const def = data.meanings[0].definitions[0].definition;
        const phonetics = data.phonetics.find(p => p.text)?.text || "";
        const audioUrl = data.phonetics.find(p => p.audio)?.audio || "";

        let msg = `📖 **${data.word}**`;
        if (phonetics) msg += ` /${phonetics}/`;
        msg += `\n\n${def}`;

        const btns =[{ type: "postback", title: "slang def", payload: `dict slang ${query}` }];
        await api.sendButton(msg.toLowerCase(), btns, senderID);

        if (audioUrl) await api.sendAttachment("audio", audioUrl, senderID).catch(()=>{});

    } catch (e) {
        reply(`couldn't find a definition for "${query}".`);
    } finally {
        if (api.sendTypingIndicator) api.sendTypingIndicator(false, senderID);
    }
};
