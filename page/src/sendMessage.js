const axios = require("axios");
const { API_VERSION } = require("../../config/config.json");

module.exports = function (event) {
  return async function sendMessage(text, senderID) {
    const recipientID = senderID || event.sender.id;
    if (!text) return;

    const content = String(text);

    const splitMessage = (text, maxLength = 1900) => {
      const chunks =
