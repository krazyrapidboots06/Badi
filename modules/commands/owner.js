module.exports.config = {
  name: "owner",
  author: "sethdico",
  version: "2.2",
  category: "Utility",
  description: "the dev",
  adminOnly: false,
  usePrefix: false,
  cooldown: 5,
};

module.exports.run = async function ({ event, api }) {
  const id = event.sender.id;
  const gif = "https://media1.tenor.com/m/Mq6ZeawKT1MAAAAd/nazo-no-kanojo-x-nazo-no-kanojo.gif";
  const msg = "i'm seth asher and i made this bot. check my links if u want to talk.";

  const buttons = [
    { type: "web_url", url: "https://www.facebook.com/s8tsh.3r", title: "facebook" },
    { type: "web_url", url: "https://github.com/sethdico", title: "github" }
  ];

  try {
    await api.sendAttachment("image", gif, id);
    await api.sendButton(msg, buttons, id);
  } catch (e) {
    api.sendMessage("seth asher salinguhay\nfb: seth09asher\ngithub: sethdico", id);
  }
};
