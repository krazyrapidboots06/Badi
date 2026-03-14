module.exports.config = {
    name: "uid",
    author: "sethdico",
    category: "Utility",
    description: "see your user profile card",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5
};

module.exports.run = async function ({ event, api, reply }) {
    const id = event.sender.id;
    const pic = `https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=${global.PAGE_ACCESS_TOKEN}`;
    
    try {
        const info = await api.getUserInfo(id);
        const msg = `👤 **user profile**\n\nname: ${info.name}\nid: ${id}\n\nstatus: active`;

        await api.sendAttachment("image", pic, id);
        
        const buttons = [{ type: "postback", title: "copy id", payload: "copy_id" }];
        await api.sendButton(msg.toLowerCase(), buttons, id);
        
    } catch (e) {
        reply(`id: ${id}`);
    }
};
