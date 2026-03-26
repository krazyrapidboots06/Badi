require('dotenv').config();
const webhook = require('./webhook');
const parser = require('body-parser');
const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./modules/core/database');
const rateLimiter = require('./modules/middleware/rateLimit');
const { validateInput, verifyWebhookSignature } = require('./modules/middleware/validation');
const CacheManager = require('./modules/core/cache');
const config = require('./config/config.json');
const CONSTANTS = require('./config/constants');
const { loadCommands } = require('./modules/core/loader');
const Queue = require('./modules/core/queue');

const app = express();
app.set('trust proxy', 1);

global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS ? process.env.ADMINS.split(',').filter(Boolean) : (config.ADMINS ||[]));
global.PREFIX = "";
global.BOT_NAME = process.env.BOT_NAME || config.BOT_NAME || 'Amdusbot';
global.CACHE_PATH = path.join(__dirname, 'cache');
global.client = { commands: new Map(), aliases: new Map() };
global.BANNED_USERS = new Set();
global.MAINTENANCE_MODE = false;
global.MONITOR_MODE = false;

global.sessions = new CacheManager(CONSTANTS.MAX_SESSIONS, CONSTANTS.ONE_HOUR);
global.userCache = new CacheManager(CONSTANTS.MAX_CACHE_SIZE, CONSTANTS.ONE_DAY);
global.messageCache = new CacheManager(CONSTANTS.MAX_CACHE_SIZE, CONSTANTS.SIX_HOURS);

global.apiQueue = new Queue(2, 300);

if (!fs.existsSync(global.CACHE_PATH)) {
    fs.mkdirSync(global.CACHE_PATH, { recursive: true });
}

(async () => {
    await new Promise(resolve => db.loadBansIntoMemory(banSet => { global.BANNED_USERS = banSet; resolve(); }));
    
    const savedDisabled = await db.getSetting("disabled_cmds");
    global.disabledCommands = new Set(savedDisabled ||[]);

    loadCommands(path.join(__dirname, 'modules/commands'));
    
    app.use(parser.json({ limit: '50mb' }));
    app.use(validateInput);
    app.use(rateLimiter);
    
    app.get('/', (req, res) => res.json({ status: 'online', uptime: process.uptime() }));
    app.get('/webhook', (req, res) => {
        const vToken = process.env.VERIFY_TOKEN || config.VERIFY_TOKEN;
        if (req.query['hub.verify_token'] === vToken) res.status(200).send(req.query['hub.challenge']);
        else res.sendStatus(403);
    });
    app.post('/webhook', verifyWebhookSignature, (req, res) => {
        res.sendStatus(200);
        webhook.listen(req.body);
    });
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT);
})();
