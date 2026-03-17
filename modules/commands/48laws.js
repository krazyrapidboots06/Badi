const LAWS =[
    "never outshine the master", "never put too much trust in friends", "conceal your intentions", 
    "always say less than necessary", "so much depends on reputation", "court attention at all cost", 
    "get others to do the work", "make other people come to you", "win through your actions", 
    "avoid the unhappy and unlucky", "learn to keep people dependent on you", "use selective honesty",
    "appeal to self-interest", "pose as a friend, work as a spy", "crush your enemy totally", 
    "use absence to increase respect", "keep others in suspended terror", "do not build fortresses",
    "know who you’re dealing with", "do not commit to anyone", "play a sucker to catch a sucker",
    "use the surrender tactic", "concentrate your forces", "play the perfect courtier", "re-create yourself",
    "keep your hands clean", "play on people’s need to believe", "enter action with boldness",
    "plan all the way to the end", "make accomplishments seem effortless", "control the options",
    "play to people’s fantasies", "discover each man’s thumbscrew", "be royal in your own fashion",
    "master the art of timing", "disdain things you cannot have", "create compelling spectacles",
    "think as you like but behave like others", "stir up waters to catch fish", "despise the free lunch",
    "avoid stepping into a great man’s shoes", "strike the shepherd", "work on the hearts and minds",
    "disarm with the mirror effect", "preach change but never reform too much", "never appear too perfect",
    "do not go past the mark", "assume formlessness"
];

module.exports.config = {
    name: "48laws",
    author: "sethdico",
    category: "Fun",
    description: "get a random rule from robert greene's book 'the 48 laws of power'.",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, args, api, reply }) {
    let num = parseInt(args[0]);

    if (!num || num < 1 || num > 48) {
        num = Math.floor(Math.random() * 48) + 1;
    }

    const msg = `📖 **law #${num}**\n━━━━━━━━━━━━━━━━\n${LAWS[num - 1]}`;
    const btns =[{ type: "postback", title: "another law", payload: "48laws" }];
    
    try {
        await api.sendButton(msg, btns, event.sender.id);
    } catch (e) {
        reply(msg);
    }
};
