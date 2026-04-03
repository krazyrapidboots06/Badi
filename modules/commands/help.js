module.exports.config = {
    name: "help",
    author: "sethdico",
    version: "22.1",
    category: "Utility",
    description: "shows all available commands",
    adminOnly: false,
    usePrefix: false,
    cooldown: 2,
};

module.exports.run = async function ({ event, args, reply }) {
  const input = args[0]?.toLowerCase();
  const isAdmin = global.ADMINS.has(event.sender.id);

  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) {
        if (cmd.config.adminOnly && !isAdmin) return; 
        return reply(`📌 **${cmd.config.name}**\n${cmd.config.description || 'no description provided.'}`.toLowerCase());
    }
    return reply(`never heard of the command "${input}".`);
  }

  const commands = Array.from(global.client.commands.values());
  const categories =[...new Set(commands.map(c => c.config.category || "Uncategorized"))];

  let msg = "📚 **command directory**\n━━━━━━━━━━━━━━━━\n\n";
  
  categories.forEach(cat => {
      const cmds = commands.filter(c => (c.config.category || "Uncategorized") === cat);
      
      if (cat.toLowerCase() === "admin" && !isAdmin) return;

      const names = cmds
          .filter(c => !c.config.adminOnly || isAdmin)
          .filter(c => !global.disabledCommands?.has(c.config.name))
          .map(c => c.config.name)
          .sort()
          .join(", ");

      if (names) {
          msg += `📂 **${cat.toLowerCase()}**\n${names}\n\n`;
      }
  });
  
  msg += `type 'help <command>' for info or type '<command>' for tutorial guide on usage.`;
  return reply(msg.toLowerCase());
};
