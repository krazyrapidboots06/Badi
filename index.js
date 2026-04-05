require('dotenv').config();
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
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
const { validateStartup } = require('./modules/utils/envValidator');
const { getOverallHealth } = require('./modules/utils/healthCheck');
const logger = require('./modules/utils/structuredLogger');

const startupValidation = validateStartup();
if (!startupValidation.readyToStart) {
    console.error('❌ Startup validation failed:');
    startupValidation.environment.errors.forEach(error => console.error(`  ${error}`));
    startupValidation.config.missingFiles.forEach(file => console.error(`  Missing file: ${file}`));
    process.exit(1);
}

if (startupValidation.environment.warnings.length > 0) {
    console.warn('⚠️ Startup warnings:');
    startupValidation.environment.warnings.forEach(warning => console.warn(`  ${warning}`));
}

logger.info('AmdusBot starting up', { 
    nodeVersion: process.version, 
    environment: process.env.NODE_ENV || 'development' 
});

const moduleInstallAttempts = new Set();

function autoInstall(moduleName) {
    try {
        execSync(`npm install ${moduleName}`, { stdio: 'inherit' });
        logger.info(`Auto-installed dependency: ${moduleName}`);
        return true;
    } catch (e) {
        logger.error(`Auto-install failed for ${moduleName}`, { error: e.message });
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
            if (!pkg.startsWith('.') && !pkg.startsWith('/') && !pkg.includes(':')) {
                logger.warn(`Missing dependency: ${pkg}. Attempting install...`);
                if (moduleInstallAttempts.has(pkg)) {
                    throw new Error(`Failed to require ${filePath}. previous auto-install attempt for ${pkg} already failed.`);
                }
                moduleInstallAttempts.add(pkg);
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
                logger.debug(`Loaded command: ${name}`);
            }
        } catch (e) {
            logger.error(`Failed to load command ${file}`, { error: e.message, file: filePath });
        }
    }
}

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(cors());

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

function healthCheck() {
    return getOverallHealth();
}

global.healthCheck = healthCheck;

(async () => {
    await new Promise(resolve => db.loadBansIntoMemory(banSet => { 
        global.BANNED_USERS = banSet; 
        logger.info(`Loaded ${banSet.size} banned users`);
        resolve(); 
    }));
    
    const savedDisabled = await db.getSetting("disabled_cmds");
    global.disabledCommands = new Set(savedDisabled || []);

    loadCommands(path.join(__dirname, 'modules/commands'));
    logger.info(`Loaded ${global.client.commands.size} commands`);
    
    app.use(parser.json({ 
        limit: '50mb',
        verify: (req, res, buf) => { req.rawBody = buf; }
    }));
    
    app.use(validateInput);
    app.use(rateLimiter);
    
    app.get('/', (req, res) => {
        res.json({ 
            status: 'online', 
            uptime: process.uptime(),
            commands: global.client.commands.size,
            health: healthCheck()
        });
    });

    app.get('/health', (req, res) => {
        const health = healthCheck();
        const statusCode = health.status === 'critical' ? 503 : 200;
        res.status(statusCode).json(health);
    });
    
    app.get('/webhook', (req, res) => {
        const vToken = process.env.VERIFY_TOKEN;
        if (!vToken) {
            logger.error('VERIFY_TOKEN not set in environment');
            return res.sendStatus(500);
        }
        if (req.query['hub.verify_token'] === vToken) {
            logger.info('Webhook verification successful');
            res.status(200).send(req.query['hub.challenge']);
        } else {
            logger.warn('Webhook verification failed', { 
                provided: req.query['hub.verify_token'], 
                expected: vToken 
            });
            res.sendStatus(403);
        }
    });
    
    app.post('/webhook', verifyWebhookSignature, (req, res) => {
        res.sendStatus(200);
        webhook.listen(req.body);
    });
    
    const PORT = process.env.PORT || 8080;
    app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`Bot name: ${global.BOT_NAME}`);
        logger.info(`Admins: ${global.ADMINS.size} configured`);
    });
})();

const shutdown = async () => {
    logger.warn('Server shutting down...');
    try {
        if (db.flushBuffer) await db.flushBuffer();
        logger.info('Database saved successfully');
        process.exit(0);
    } catch (e) {
        logger.error('Failed to save data during shutdown', { error: e.message });
        process.exit(1);
    }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection', { error: err.message, stack: err.stack });
});
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
});
