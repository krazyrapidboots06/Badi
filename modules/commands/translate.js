const { http } = require("../utils");

const LANG_MAP = {
    "english": "en", "en": "en",
    "tagalog": "tl", "tl": "tl", "filipino": "tl",
    "japanese": "ja", "ja": "ja",
    "korean": "ko", "ko": "ko",
    "chinese": "zh-CN", "zh": "zh-CN",
    "spanish": "es", "es": "es",
    "french": "fr", "fr": "fr",
    "german": "de", "de": "de",
    "italian": "it", "it": "it",
    "russian": "ru", "ru": "ru",
    "arabic": "ar", "ar": "ar",
    "thai": "th", "th": "th",
    "vietnamese": "vi", "vi": "vi",
    "indonesian": "id", "id": "id",
    "malay": "ms", "ms": "ms",
    "portuguese": "pt", "pt": "pt"
};

module.exports.config = {
    name: "trans",
    author: "sethdico",
    version: "4.1",
    category: "Utility",
    description: "translate text between multiple languages with audio",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, args, api }) {
  const id = event.sender.id;
  
  if (!args.length) {
      return api.sendMessage("translator\n\nusage:\ntrans <text>\ntrans to <lang> <text>\n\nexamples:\ntrans to ja good morning\ntrans to es how are you\n\nnote: defaults to english or tagalog if no language is set", id);
  }

  let targetLang = "en";
  let text = "";

  if (args[0].toLowerCase() === "to" && args[1] && LANG_MAP[args[1].toLowerCase()]) {
      targetLang = LANG_MAP[args[1].toLowerCase()];
      text = args.slice(2).join(" ");
  }
  else if (LANG_MAP[args[0].toLowerCase()]) {
      targetLang = LANG_MAP[args[0].toLowerCase()];
      text = args.slice(1).join(" ");
  }
  else {
      text = args.join(" ");
  }

  if (!text) return api.sendMessage("provide text to translate", id);
  if (api.sendTypingIndicator) api.sendTypingIndicator(true, id).catch(()=>{});

  try {
    let url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    let res = await http.get(url);

    let translated = res.data[0].map(x => x[0]).join("");
    const detected = res.data[2];

    if (detected === "en" && targetLang === "en") {
        targetLang = "tl";
        url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tl&dt=t&q=${encodeURIComponent(text)}`;
        res = await http.get(url);
        translated = res.data[0].map(x => x[0]).join("");
    }

    await api.sendMessage(`${detected} ➔ ${targetLang}\n\n${translated}`.toLowerCase(), id);

    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(translated)}&tl=${targetLang}&client=tw-ob`;
    api.sendAttachment("audio", audioUrl, id).catch(()=>{});

  } catch (e) {
    api.sendMessage("translation failed", id);
  }
};
