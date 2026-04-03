const http = require('./http');
const helpers = require('./helpers');
const logger = require('./logger');

module.exports = {
    ...http,
    ...helpers,
    log: (event) => {
        if (!event.sender) return;
        const type = global.ADMINS?.has(event.sender.id) ? "admin" : "user";
        const text = event.message?.text || "media";
        logger.info(`[${type}] ${event.sender.id}: ${text}`);
    },
    fetchWithRetry: helpers.retry 
};
