const { getEventType } = require('./modules/utils/helpers');
const handler = require('./page/handler');
const fs = require('fs');
const path = require('path');

const tools = {};
const srcPath = path.join(__dirname, 'page', 'src');

if (fs.existsSync(srcPath)) {
    fs.readdirSync(srcPath).forEach(file => {
        if (file.endsWith('.js')) {
            tools[path.parse(file).name] = require(path.join(srcPath, file));
        }
    });
}

if (!global.api) {
    global.api = {};
    const dummyEvent = { sender: { id: null } };
    for (const key in tools) {
        global.api[key] = tools[key](dummyEvent);
    }
}

module.exports.listen = (event) => {
    if (!event || event.object !== 'page' || !event.entry) return;

    event.entry.forEach(entry => {
        if (!Array.isArray(entry.messaging)) return;

        entry.messaging.forEach(async (ev) => {
            if (!ev.sender?.id) return;

            const isAdmin = global.ADMINS.has(ev.sender.id);
            if (!isAdmin && global.BANNED_USERS.has(ev.sender.id)) return;

            ev.type = getEventType(ev);

            if (ev.message?.mid) {
                global.messageCache.set(ev.message.mid, {
                    text: ev.message.text,
                    attachments: ev.message.attachments?.map(att => ({
                        type: att.type,
                        payload: att.payload
                    })) || null
                });
            }

            if (ev.type === 'message_reply') {
                const cached = global.messageCache.get(ev.message.reply_to?.mid);
                if (cached) {
                    ev.message.reply_to.text = cached.text;
                    ev.message.reply_to.attachments = cached.attachments;
                }
            }

            if (ev.message?.is_echo) return;

            const api = {};
            for (const key in tools) {
                api[key] = tools[key](ev);
            }

            try {
                await handler(ev, api);
            } catch (e) {
                console.error(e.message);
            }
        });
    });
};
