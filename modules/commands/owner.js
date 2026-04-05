module.exports.config = {
    name: "owner",
    author: "sethdico",
    version: "3.0",
    category: "Utility",
    description: "about the developer",
    adminOnly: false,
    usePrefix: false,
    cooldown: 5,
    aliases: ["creator", "dev", "seth"],
    usage: "owner"
};

module.exports.run = async function ({ event, api, reply }) {
    const id = event.sender.id;
    const gif = "https://media1.tenor.com/m/Mq6ZeawKT1MAAAAd/nazo-no-kanojo-x-nazo-no-kanojo.gif";
    
    const buttons = [
        { type: "web_url", url: "https://www.facebook.com/s8tsh.3r/", title: "facebook" },
        { type: "web_url", url: "https://github.com/sethdico", title: "github" }
    ];

    try {
        if (api.sendTypingIndicator) {
            api.sendTypingIndicator(true, id);
        }
        
        await api.sendAttachment("image", gif, id);
        
        setTimeout(async () => {
            try {
                await api.sendButton("i'm seth asher and i made this bot\n\nadd me if you need anything", buttons, id);
            } catch (buttonError) {
                reply("i'm seth asher and i made this bot\n\nfacebook: s8tsh.3r\ngithub: sethdico");
            }
        }, 1000);
        
    } catch (error) {
        reply("i'm seth asher and i made this bot\n\nfacebook: s8tsh.3r\ngithub: sethdico");
    }
};
