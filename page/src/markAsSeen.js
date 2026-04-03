const axios = require("axios");
module.exports = function (event) {
  return function markAsSeen(seen, senderID) {
    return axios.post(`https://graph.facebook.com/v21.0/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`, {
      recipient: { id: senderID || event.sender.id },
      sender_action: seen ? "mark_seen" : "mark_unread"
    }).catch(() => {});
  };
};
