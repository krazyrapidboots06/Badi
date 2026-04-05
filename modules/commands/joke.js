const { http } = require("../utils");

module.exports.config = {
    name: "joke",
    author: "sethdico",
    category: "Fun",
    description: "random jokes",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2
};

module.exports.run = async function ({ event, api }) {
    try {
        const res = await http.get("https://official-joke-api.appspot.com/random_joke");
        const msg = `${res.data.setup}\n\n${res.data.punchline}`;
        const buttons = [{ type: "postback", title: "another joke", payload: "joke" }];

        api.sendButton(msg, buttons, event.sender.id);
    } catch (e) {
        api.sendMessage("joke server is down", event.sender.id);
    }
};
