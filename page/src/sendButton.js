const axios = require("axios");

module.exports = function (event) {
  return function sendButton(text, buttons, senderID) {
    const id = senderID || event.sender.id;
    const msg = text.length > 640 ? text.substring(0, 637) + "..." : text;

    const btns = buttons.slice(0, 3).map(btn => {
      if (btn.type === "web_url") {
        return { 
          type: "web_url", 
          url: btn.url, 
          title: btn.title 
        };
      }
      return { 
        type: "postback", 
        title: btn.title, 
        payload: btn.payload || btn.title.toLowerCase() 
      };
    });

    global.apiQueue.add(() => 
      axios.post(
        `https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, 
        {
          recipient: { id: id },
          message: {
            attachment: {
              type: "template",
              payload: { 
                template_type: "button", 
                text: msg, 
                buttons: btns 
              }
            }
          }
        }
      )
    ).catch(e => console.error("button send failed:", e.message));
  };
};
