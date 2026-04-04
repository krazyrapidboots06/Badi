module.exports.config = {
    name: "owner",
    author: "sethdico",
    version: "2.2",
    category: "Utility",
    description: "bot developer info",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
};

module.exports.run = async function ({ event, api, args }) {
  const id = event.sender.id;
  const msg = `seth asher salinguhay

fb: seth09asher
github: sethdico`;

  try {
    await api.sendMessage(msg, id);
  } catch (e) {
    api.sendMessage("seth asher salinguhay", id);
  }
};
