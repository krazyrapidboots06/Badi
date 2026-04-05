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

  if (input === "search" && args[1]) {
    const keyword = args[1].toLowerCase();
    const commands = Array.from(global.client.commands.values());
    
    const results = commands.filter(cmd => {
        if (cmd.config.adminOnly && !isAdmin) return false;
        if (global.disabledCommands?.has(cmd.config.name)) return false;
        
        return cmd.config.name.toLowerCase().includes(keyword) ||
               (cmd.config.description && cmd.config.description.toLowerCase().includes(keyword)) ||
               (cmd.config.category && cmd.config.category.toLowerCase().includes(keyword));
    });

    if (results.length === 0) {
        return reply(`❌ no commands found for "${keyword}"`);
    }

    let msg = `🔍 **search results for "${keyword}"**\n━━━━━━━━━━━━━━━━\n\n`;
    results.forEach(cmd => {
        msg += `📌 ${cmd.config.name}\n`;
        msg += `📝 ${cmd.config.description || 'no description'}\n`;
        msg += `🏷️ ${cmd.config.category || 'uncategorized'}\n\n`;
    });
    
    return reply(msg.toLowerCase());
  }

  if (input) {
    const cmd = global.client.commands.get(input) || global.client.commands.get(global.client.aliases.get(input));
    if (cmd) {
        if (cmd.config.adminOnly && !isAdmin) return reply("❌ admin-only command");
        
        let info = `📌 **${cmd.config.name}**\n`;
        info += `📝 ${cmd.config.description || 'no description provided'}\n`;
        info += `🏷️ category: ${cmd.config.category || 'uncategorized'}\n`;
        info += `⏱️ cooldown: ${cmd.config.cooldown || 0}s\n`;
        info += `👤 admin only: ${cmd.config.adminOnly ? 'yes' : 'no'}\n`;
        
        if (cmd.config.aliases && cmd.config.aliases.length > 0) {
            info += `🔄 aliases: ${cmd.config.aliases.join(', ')}\n`;
        }
        
        info += `\n💡 usage: ${cmd.config.usage || cmd.config.name}`;
        
        return reply(info.toLowerCase());
    }
    return reply(`❌ command "${input}" not found. type 'help' to see all commands`);
  }

  const commands = Array.from(global.client.commands.values());
  const categories = [...new Set(commands.map(c => c.config.category || "Uncategorized"))].sort();

  let msg = "📚 **command directory**\n━━━━━━━━━━━━━━━━\n\n";
  let totalCmds = 0;
  let disabledCmds = 0;
  
  categories.forEach(cat => {
      const cmds = commands.filter(c => (c.config.category || "Uncategorized") === cat);
      
      if (cat.toLowerCase() === "admin" && !isAdmin) return;

      const availableCmds = cmds
          .filter(c => !c.config.adminOnly || isAdmin)
          .filter(c => !global.disabledCommands?.has(c.config.name));
          
      const disabledInCategory = cmds
          .filter(c => !c.config.adminOnly || isAdmin)
          .filter(c => global.disabledCommands?.has(c.config.name));

      const names = availableCmds
          .map(c => c.config.name)
          .sort()
          .join(", ");

      totalCmds += availableCmds.length;
      disabledCmds += disabledInCategory.length;

      if (names) {
          msg += `📂 **${cat.toLowerCase()}** (${availableCmds.length})\n${names}\n`;
          if (disabledInCategory.length > 0) {
              msg += `🔴 ${disabledInCategory.length} disabled\n`;
          }
          msg += `\n`;
      }
  });
  
  msg += `━━━━━━━━━━━━━━━━\n`;
  msg += `📊 total: ${totalCmds} commands`;
  if (disabledCmds > 0) msg += ` | 🔴 ${disabledCmds} disabled`;
  msg += `\n💡 type 'help <command>' for detailed info`;
  msg += `\n🔍 type 'help search <keyword>' to search commands`;
  
  return reply(msg.toLowerCase());
};
