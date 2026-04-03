const axios = require("axios");

const API_VERSION = process.env.API_VERSION || "v21.0";

module.exports = function (event) {
  return async function sendQuickReply(text, options, senderID) {
    const recipientID = senderID || event.sender.id;

    const quickReplies = options.map((opt) => {
      if (typeof opt === "string") {
        return { content_type: "text", title: opt, payload: opt.toUpperCase() };
      }
      return { 
          content_type: opt.type || "text", 
          title: opt.title, 
          payload: opt.payload || opt.title.toUpperCase(),
          image_url: opt.image_url 
      };
    });

    try {
      await axios.post(
        `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
        {
          recipient: { id: recipientID },
          messaging_type: "RESPONSE",
          message: {
            text: text,
            quick_replies: quickReplies
          }
        }
      );
    } catch (e) {
      console.error("QuickReply Error:", e.response?.data || e.message);
    }
  };
};
