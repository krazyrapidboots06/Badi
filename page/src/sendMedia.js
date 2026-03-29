const axios = require("axios");
const API_VERSION = process.env.API_VERSION || "v21.0";

module.exports = function (event) {
  return async function sendMedia(url, mediaType, buttons =[], senderID) {
    const recipientID = senderID || event.sender.id;

    const formattedButtons = buttons.slice(0, 3).map(btn => {
      if (btn.type === "web_url") return { type: "web_url", url: btn.url, title: btn.title };
      return { type: "postback", title: btn.title, payload: btn.payload || btn.title.toUpperCase() };
    });

    global.apiQueue.add(() =>
      axios.post(`https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, {
        recipient: { id: recipientID },
        message: {
          attachment: {
            type: "template",
            payload: {
              template_type: "media",
              elements:[
                {
                  media_type: mediaType,
                  url: url,
                  buttons: formattedButtons.length > 0 ? formattedButtons : undefined
                }
              ]
            }
          }
        }
      })
    ).catch(e => console.error("sendMedia fail:", e.response?.data || e.message));
  };
};
