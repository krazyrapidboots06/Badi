const axios = require("axios");

module.exports = function (event) {
  return async function getUserInfo(id) {
    const psid = id || event.sender.id;
    const token = global.PAGE_ACCESS_TOKEN;

    try {
      const response = await axios.get(
        `https://graph.facebook.com/v21.0/me/conversations`, {
          params: {
            user_id: psid,
            fields: 'participants',
            access_token: token
          }
        }
      );

      const thread = response.data?.data?.[0];
      const participants = thread?.participants?.data;

      if (participants) {
        const user = participants.find(p => p.id === psid);
        if (user && user.name) {
          const nameParts = user.name.split(' ');
          return {
            name: user.name.toLowerCase(),
            first_name: nameParts[0] || "user",
            last_name: nameParts.slice(1).join(' ') || "",
            id: psid
          };
        }
      }

      const direct = await axios.get(`https://graph.facebook.com/v21.0/${psid}?fields=name&access_token=${token}`);
      if (direct.data && direct.data.name) {
        return {
          name: direct.data.name.toLowerCase(),
          first_name: direct.data.name.split(' ')[0],
          id: psid
        };
      }

      return { name: "messenger user", id: psid };
    } catch (e) {
      return { name: "messenger user", id: psid };
    }
  };
};
