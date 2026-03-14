const axios = require("axios");

module.exports.config = {
    name: "uid",
    author: "sethdico",
    category: "Utility",
    adminOnly: false,
    usePrefix: false
};

module.exports.run = async function ({ event, args, api, reply }) {
    const targetID = event.message?.reply_to?.sender_id || args[0] || event.sender.id;

    try {
        const info = await api.getUserInfo(targetID);
        const pic = `https://graph.facebook.com/${targetID}/picture?width=512&height=512&access_token=${global.PAGE_ACCESS_TOKEN}`;
        
        const msg = `name: ${info.name}\nid: ${targetID}`;

        await api.sendAttachment("image", pic, event.sender.id);
        reply(msg.toLowerCase());
    } catch (e) {
        reply(`id: ${targetID}`);
    }
};
