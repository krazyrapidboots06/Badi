const { http } = require("../utils");

module.exports.config = {
    name: "joke",
    author: "Sethdico",
    version: "4.0",
    category: "Fun",
    description: "random jokes",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, api }) {
  try {
    const res = await http.get("https://official-joke-api.appspot.com/random_joke");
    const msg = `${res.data.setup}\n\n${res.data.punchline}`;
    api.sendMessage(msg, event.sender.id);
  } catch (e) {
    api.sendMessage("joke api is down", event.sender.id);
  }
};
