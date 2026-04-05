const { getEventType } = require('./modules/utils/helpers');
const handler = require('./page/handler');
const fs = require('fs');
const path = require('path');
const LoadBalancer = require('./modules/core/loadBalancer');
const MessageThrottler = require('./modules/core/messageThrottler');
const CircuitBreaker = require('./modules/core/circuitBreaker');
const logger = require('./modules/utils/structuredLogger');

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

const loadBalancer = new LoadBalancer({
    maxConcurrency: 200,
    queueSize: 2000
});

const messageThrottler = new MessageThrottler({
    maxMessagesPerUser: 5,
    maxMessagesGlobal: 500,
    windowSize: 60000,
    maxQueueSize: 10000
});

const handlerCircuitBreaker = new CircuitBreaker({
    failureThreshold: 10,
    resetTimeout: 30000,
    monitoringPeriod: 10000
});

loadBalancer.on('queueOverflow', (userId) => {
    logger.warn('Load balancer queue overflow', { userId });
});

loadBalancer.on('taskTimeout', (userId, waitTime) => {
    logger.warn('Task timed out in queue', { userId, waitTime });
});

messageThrottler.on('messageDropped', ({ userId, reason }) => {
    logger.warn('Message dropped', { userId, reason });
});

handlerCircuitBreaker.on('error', (error) => {
    logger.error('Handler circuit breaker error', { error: error.message });
});

module.exports.listen = (event) => {
    if (!event || event.object !== 'page' || !event.entry) return;

    event.entry.forEach(entry => {
        if (!Array.isArray(entry.messaging)) return;

        entry.messaging.forEach(async (ev) => {
            if (!ev.sender?.id) return;

            const userId = ev.sender.id;
            const isAdmin = global.ADMINS.has(userId);
            
            if (!isAdmin && global.BANNED_USERS.has(userId)) return;

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
                await messageThrottler.processMessage(userId, ev, async (message) => {
                    return loadBalancer.process(userId, async () => {
                        return handlerCircuitBreaker.execute(async () => {
                            const startTime = Date.now();
                            const result = await handler(message, api);
                            const processingTime = Date.now() - startTime;
                            
                            logger.command('message_processed', userId, {
                                messageType: message.type,
                                processingTime,
                                hasText: !!message.message?.text,
                                hasAttachments: !!(message.message?.attachments?.length > 0)
                            });
                            
                            return result;
                        });
                    });
                });
            } catch (error) {
                logger.error('Message processing failed', {
                    error: error.message,
                    userId,
                    messageType: ev.type,
                    stack: error.stack
                });
            }
        });
    });
};

module.exports.getMetrics = () => ({
    loadBalancer: loadBalancer.getMetrics(),
    messageThrottler: messageThrottler.getStatus(),
    circuitBreaker: handlerCircuitBreaker.getStatus()
});
