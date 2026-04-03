const axios = require("axios");

const API_VERSION = process.env.API_VERSION || "v21.0";

module.exports = function (event) {
  return async function sendCarousel(elements, senderID) {
    const recipientID = senderID || event.sender.id;

    const sanitizedElements = elements.slice(0, 10);

    try {
      await axios.post(
        `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${global.PAGE_ACCESS_TOKEN}`,
        {
          recipient: { id: recipientID },
          message: {
            attachment: {
              type: "template",
              payload: {
                template_type: "generic",
                image_aspect_ratio: "horizontal",
                elements: sanitizedElements
              }
            }
          }
        }
      );
    } catch (e) {
      console.error("Carousel Error:", e.response?.data || e.message);
    }
  };
};
