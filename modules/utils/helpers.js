const CONSTANTS = require('../../config/constants');
const dns = require('dns').promises;
const { URL } = require('url');

function sanitize(input) {
    if (typeof input !== 'string') return '';
    return input.trim().slice(0, CONSTANTS.MAX_MESSAGE_LENGTH * 2);
}

function parseAI(res) {
    if (!res || !res.data) return null;
    const d = res.data;
    
    if (d.choices?.[0]?.message?.content) return sanitize(d.choices[0].message.content);
    if (d.message) return sanitize(d.message);
    if (d.response) return sanitize(d.response);
    if (d.answer) return sanitize(d.answer);
    if (d.result) return sanitize(d.result);
    if (d.content) return sanitize(d.content);
    if (typeof d === 'string') return sanitize(d);
    
    return null;
}

function getEventType(event) {
    if (event.postback) return "postback";
    if (event.message) {
        if (event.message.reply_to) return "message_reply";
        if (event.message.attachments) return "attachment";
        return "text";
    }
    return "unknown";
}

async function retry(fn, retries = CONSTANTS.MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error;
            await new Promise(r => setTimeout(r, CONSTANTS.RETRY_DELAY * Math.pow(2, i)));
        }
    }
}

function chunkText(text, size = CONSTANTS.MAX_MESSAGE_LENGTH) {
    const chunks = [];
    let current = 0;
    
    while (current < text.length) {
        chunks.push(text.slice(current, current + size));
        current += size;
    }
    
    return chunks;
}

function isPrivateIPv4(ip) {
    if (!ip || typeof ip !== 'string') return false;
    if (ip.startsWith('10.')) return true;
    if (ip.startsWith('127.')) return true;
    if (ip.startsWith('169.254.')) return true;
    if (ip.startsWith('192.168.')) return true;
    if (ip.startsWith('172.')) {
        const second = parseInt(ip.split('.')[1], 10);
        if (second >= 16 && second <= 31) return true;
    }
    return false;
}

function isProbablyPrivateIPv6(ip) {
    if (!ip) return false;
    if (ip === '::1') return true;
    if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
    if (ip.startsWith('fe80')) return true;
    return false;
}

async function isPrivateHost(urlString) {
    try {
        const u = new URL(urlString);
        const hostname = u.hostname;
        if (hostname === 'localhost' || hostname === 'ip6-localhost') return true;

        const res = await dns.lookup(hostname, { all: true });
        for (const r of res) {
            const addr = r.address;
            if (r.family === 4 && isPrivateIPv4(addr)) return true;
            if (r.family === 6 && isProbablyPrivateIPv6(addr)) return true;
        }
    } catch (e) {
        return false;
    }
    return false;
}

module.exports = {
    sanitize,
    parseAI,
    getEventType,
    retry,
    chunkText,
    isPrivateHost
};
