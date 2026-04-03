const axios = require("axios");

module.exports = function (event) {
  return function sendTypingIndicator(isTyping, userId) {
    const action = isTyping ? "typing_on" : "typing_off";
    const recipientID = userId || event.sender.id;

    return axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, {
      recipient: { id: recipientID },
      sender_action: action,
    }).catch(() => {});
  };
};
