const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const API_VERSION = process.env.API_VERSION || "v21.0";

module.exports = function (event) {
  return async function sendAttachment(type, source, senderID) {
    const recipientID = senderID || event.sender.id;
    const accessToken = global.PAGE_ACCESS_TOKEN;
    
    if (typeof source === "string" && type === "file") {
        if (source.match(/\.(jpg|jpeg|png|gif|webp)$/i)) type = "image";
    }

    try {
      if (typeof source === 'string' && source.startsWith('http')) {
        await axios.post(`https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${accessToken}`, {
          recipient: { id: recipientID },
          message: { 
              attachment: { 
                  type: type, 
                  payload: { url: source, is_reusable: true } 
              } 
          }
        });
      } 
      else {
        const form = new FormData();
        form.append("recipient", JSON.stringify({ id: recipientID }));
        form.append("message", JSON.stringify({ 
            attachment: { 
                type: type, 
                payload: { is_reusable: true } 
            } 
        }));
        
        if (typeof source === "string" && fs.existsSync(source)) {
            form.append("filedata", fs.createReadStream(source));
        } else {
            console.error("sendAttachment: Invalid file source");
            return;
        }

        await axios.post(
            `https://graph.facebook.com/${API_VERSION}/me/messages?access_token=${accessToken}`, 
            form, 
            { 
                headers: form.getHeaders(),
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );
      }
    } catch (err) { 
        console.error("Attachment Failed:", err.response?.data?.error?.message || err.message); 
    }
  };
};
