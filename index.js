require('dotenv').config();
const webhook = require('./webhook');
const parser = require('body-parser');
const express = require('express');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const db = require('./modules/core/database');
const rateLimiter = require('./modules/middleware/rateLimit');
const { validateInput, verifyWebhookSignature } = require('./modules/middleware/validation');
const CacheManager = require('./modules/core/cache');
const config = require('./config/config.json');
const CONSTANTS = require('./config/constants');
const Queue = require('./modules/core/queue');

function autoInstall(moduleName) {
    try {
        execSync(`npm install ${moduleName}`, { stdio: 'inherit' });
        return true;
    } catch (e) {
        return false;
    }
}

function safeRequire(filePath) {
    try {
        return require(filePath);
    } catch (err) {
        const match = err.message.match(/Cannot find module '(.+?)'/);
        if (match) {
            const pkg = match[1];
            if (!pkg.startsWith('.') && !pkg.startsWith('/')) {
                if (autoInstall(pkg)) return require(filePath);
            }
        }
        throw err;
    }
}

function loadCommands(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            loadCommands(filePath);
            continue;
        }
        if (!file.endsWith('.js')) continue;
        try {
            delete require.cache[require.resolve(filePath)];
            const cmd = safeRequire(filePath);
            if (cmd.config?.name) {
                const name = cmd.config.name.toLowerCase();
                global.client.commands.set(name, cmd);
                if (cmd.config.aliases) {
                    cmd.config.aliases.forEach(a => global.client.aliases.set(a.toLowerCase(), name));
                }
            }
        } catch (e) {
            console.error(e.message);
        }
    }
}

const app = express();
app.set('trust proxy', 1);

global.PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || config.PAGE_ACCESS_TOKEN;
global.ADMINS = new Set(process.env.ADMINS ? process.env.ADMINS.split(',').filter(Boolean) : (config.ADMINS || []));
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
    global.disabledCommands = new Set(savedDisabled || []);

    loadCommands(path.join(__dirname, 'modules/commands'));
    
    app.use(parser.json({ 
        limit: '50mb',
        verify: (req, res, buf) => { req.rawBody = buf; }
    }));
    
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
