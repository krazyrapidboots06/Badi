const { sanitize } = require('../utils/helpers');
const crypto = require('crypto');

function validateInput(req, res, next) {
    if (req.body) {
        const clean = (obj) => {
            if (typeof obj === 'string') return sanitize(obj);
            if (Array.isArray(obj)) return obj.map(clean);
            if (typeof obj === 'object' && obj !== null) {
                const cleaned = {};
                for (const [key, value] of Object.entries(obj)) {
                    cleaned[key] = clean(value);
                }
                return cleaned;
            }
            return obj;
        };
        req.body = clean(req.body);
    }
    next();
}

function verifyWebhookSignature(req, res, next) {
    const signature = req.headers['x-hub-signature-256'];
    const appSecret = process.env.APP_SECRET;

    if (!signature || !appSecret) {
        return next();
    }

    if (!req.rawBody) {
        return res.sendStatus(400);
    }

    const signatureHash = signature.split('=')[1];
    const expectedHash = crypto
        .createHmac('sha256', appSecret)
        .update(req.rawBody)
        .digest('hex');

    if (signatureHash !== expectedHash) {
        return res.sendStatus(403);
    }

    next();
}

module.exports = {
    validateInput,
    verifyWebhookSignature
};
