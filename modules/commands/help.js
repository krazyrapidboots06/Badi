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
        
        const cooldown = cmd.config.cooldown ? `cooldown: ${cmd.config.cooldown}s` : '';
        const author = cmd.config.author ? `author: ${cmd.config.author}` : '';
        const version = cmd.config.version ? `version: ${cmd.config.version}` : '';
        
        return reply(`${cmd.config.name.toUpperCase()}\n\n${cmd.config.description || 'no description provided'}\n\n${author}\n${version}\n${cooldown}`.toLowerCase());
    }
    return reply(`command "${input}" not found`);
  }

  const commands = Array.from(global.client.commands.values());
  const categories =[...new Set(commands.map(c => c.config.category || "Uncategorized"))];

  let msg = `command list\n\ntotal: ${commands.length} commands\naccess: ${isAdmin ? 'admin' : 'user'}\n\n`;
  
  categories.forEach(cat => {
      const cmds = commands.filter(c => (c.config.category || "Uncategorized") === cat);
      
      if (cat.toLowerCase() === "admin" && !isAdmin) return;

      const names = cmds
          .filter(c => !c.config.adminOnly || isAdmin)
          .filter(c => !global.disabledCommands?.has(c.config.name))
          .map(c => `• ${c.config.name}`)
          .sort()
          .join('\n');

      if (names) {
          const count = cmds.filter(c => !c.config.adminOnly || isAdmin).length;
          msg += `${cat.toUpperCase()} (${count})\n${names}\n\n`;
      }
  });
  
  msg += `tips\n\n• help <command> for info\n• <command> for tutorial\n• no prefix needed`;
  
  return reply(msg.toLowerCase());
};
