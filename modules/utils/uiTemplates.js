class UITemplates {
    static header(title, emoji = '📋') {
        return `${emoji} **${title}**\n━━━━━━━━━━━━━━━━`;
    }

    static section(title, emoji = '🔹') {
        return `\n${emoji} **${title}**`;
    }

    static separator() {
        return '\n━━━━━━━━━━━━━━━━';
    }

    static footer() {
        return '\n━━━━━━━━━━━━━━━━';
    }

    static listItem(index, text, emoji = '•') {
        return `  ${index}. ${text}`;
    }

    static keyValue(key, value, emoji = '📝') {
        return `  ${emoji} ${key}: ${value}`;
    }

    static error(title, message) {
        return `❌ **${title}**\n━━━━━━━━━━━━━━━━\n${message}`;
    }

    static success(title, message) {
        return `✅ **${title}**\n━━━━━━━━━━━━━━━━\n${message}`;
    }

    static warning(title, message) {
        return `⚠️ **${title}**\n━━━━━━━━━━━━━━━━\n${message}`;
    }

    static info(title, message) {
        return `ℹ️ **${title}**\n━━━━━━━━━━━━━━━━\n${message}`;
    }

    static loading(message) {
        return `⏳ **${message}**\n━━━━━━━━━━━━━━━━\nplease wait...`;
    }

    static tutorial(command, usage, examples) {
        let msg = this.header(`${command} tutorial`, '📚');
        msg += `\n${this.section('how to use', '💡')}\n${usage}`;
        
        if (examples && examples.length > 0) {
            msg += `\n${this.section('examples', '🔥')}`;
            examples.forEach((example, i) => {
                msg += `\n  ${i + 1}. ${example}`;
            });
        }
        
        msg += this.footer();
        return msg.toLowerCase();
    }

    static card(title, content, emoji = '🎯') {
        return `${emoji} **${title}**\n━━━━━━━━━━━━━━━━\n${content}`;
    }

    static list(items, title = 'list', emoji = '📋') {
        let msg = this.header(title, emoji);
        items.forEach((item, i) => {
            msg += `\n${this.listItem(i + 1, item)}`;
        });
        msg += this.footer();
        return msg.toLowerCase();
    }

    static stats(data) {
        let msg = this.header('system statistics', '📊');
        
        Object.entries(data).forEach(([section, items]) => {
            msg += this.section(section, this.getSectionEmoji(section));
            if (typeof items === 'object') {
                Object.entries(items).forEach(([key, value]) => {
                    msg += `\n${this.keyValue(key, value)}`;
                });
            } else {
                msg += `\n  ${items}`;
            }
        });
        
        msg += this.footer();
        return msg.toLowerCase();
    }

    static getSectionEmoji(section) {
        const emojis = {
            bot: '🤖',
            users: '👥',
            system: '💻',
            performance: '⚡',
            commands: '🔥',
            memory: '💾',
            uptime: '⏰'
        };
        return emojis[section] || '📝';
    }

    static progressBar(current, max, width = 20, emoji = '📊') {
        const percentage = Math.min((current / max) * 100, 100);
        const filled = Math.round((width * percentage) / 100);
        const empty = width - filled;
        const bar = '█'.repeat(filled) + '░'.repeat(empty);
        
        return `${emoji} [${bar}] ${percentage.toFixed(1)}%`;
    }

    static table(headers, rows, emoji = '📊') {
        let msg = this.header('data table', emoji);
        
        const columnWidths = headers.map((header, i) => {
            const maxRowWidth = Math.max(...rows.map(row => String(row[i]).length));
            return Math.max(header.length, maxRowWidth);
        });

        const headerRow = headers.map((header, i) => 
            header.padEnd(columnWidths[i])
        ).join(' | ');
        
        msg += `\n${headerRow}`;
        msg += `\n${columnWidths.map(width => '─'.repeat(width)).join('─┼─')}`;
        
        rows.forEach(row => {
            const formattedRow = row.map((cell, i) => 
                String(cell).padEnd(columnWidths[i])
            ).join(' | ');
            msg += `\n${formattedRow}`;
        });
        
        msg += this.footer();
        return msg.toLowerCase();
    }

    static carousel(items, currentIndex = 0, emoji = '🎠') {
        let msg = this.header('carousel', emoji);
        
        const item = items[currentIndex];
        msg += `\n${this.card(item.title, item.content, item.emoji || '📋')}`;
        
        msg += `\n${this.section('navigation', '🧭')}`;
        msg += `\n  ⬅️ previous | ➡️ next (${currentIndex + 1}/${items.length})`;
        
        msg += this.footer();
        return msg.toLowerCase();
    }

    static quickReply(title, options, emoji = '🎯') {
        let msg = this.header(title, emoji);
        
        options.forEach((option, i) => {
            msg += `\n${this.listItem(i + 1, option.text, option.emoji || '🔹')}`;
        });
        
        msg += `\n${this.section('how to respond', '💡')}`;
        msg += `\n  reply with the number or type the command`;
        
        msg += this.footer();
        return msg.toLowerCase();
    }

    static commandHelp(command, config, examples) {
        let msg = this.header(`${command} command`, '📌');
        
        msg += `\n${this.section('description', '📝')}`;
        msg += `\n  ${config.description || 'no description available'}`;
        
        msg += `\n${this.section('details', '🔧')}`;
        msg += `\n${this.keyValue('category', config.category || 'uncategorized', '🏷️')}`;
        msg += `\n${this.keyValue('cooldown', `${config.cooldown || 0}s`, '⏱️')}`;
        msg += `\n${this.keyValue('admin only', config.adminOnly ? 'yes' : 'no', '👤')}`;
        
        if (config.aliases && config.aliases.length > 0) {
            msg += `\n${this.keyValue('aliases', config.aliases.join(', '), '🔄')}`;
        }
        
        if (examples && examples.length > 0) {
            msg += this.section('examples', '🔥');
            examples.forEach((example, i) => {
                msg += `\n  ${i + 1}. ${example}`;
            });
        }
        
        msg += this.footer();
        return msg.toLowerCase();
    }

    static statusBadge(status, text) {
        const badges = {
            online: '🟢',
            offline: '🔴',
            busy: '🟡',
            maintenance: '🟠',
            error: '❌',
            success: '✅',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const emoji = badges[status] || '⚪';
        return `${emoji} ${text}`;
    }

    static formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 bytes';
        
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['bytes', 'kb', 'mb', 'gb', 'tb'];
        
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    static formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        
        return parts.join(' ');
    }
}

module.exports = UITemplates;
