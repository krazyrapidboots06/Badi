const { http } = require("../utils");

module.exports.config = {
    name: "transcript",
    author: "sethdico",
    category: "Admin",
    adminOnly: true,
    usePrefix: false,
    cooldown: 5
};

module.exports.run = async function ({ args, api, reply, event }) {
    const sid = args[0];
    if (!sid || sid === "null" || sid === "undefined") return reply("transcript <session_id>");

    try {
        const res = await http.get(`https://app.chipp.ai/api/v1/chat/transcript/${sid}`, {
            headers: { "Authorization": `Bearer ${process.env.CHIPP_API_KEY}` }
        });

        if (!res.data.messages?.length) return reply("empty transcript");

        let report = `chat log\n\n`;
        res.data.messages.slice(-20).forEach(m => {
            const content = m.content?.substring(0, 500) || "(no content)";
            report += `${m.role === "user" ? "user" : "bot"}: ${content}\n\n`;
        });

        await api.sendMessage(report, event.sender.id);
    } catch (e) {
        console.error("Transcript error:", e.message, e.response?.data);
        reply(`transcript failed: ${e.response?.status === 404 ? "session not found" : e.response?.status === 401 ? "invalid api key" : "api error"}`);
    }
};
