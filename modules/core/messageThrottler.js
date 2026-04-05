const EventEmitter = require('events');

class MessageThrottler extends EventEmitter {
    constructor(options = {}) {
        super();
        this.maxMessagesPerUser = options.maxMessagesPerUser || 10;
        this.maxMessagesGlobal = options.maxMessagesGlobal || 1000;
        this.windowSize = options.windowSize || 60000;
        this.maxQueueSize = options.maxQueueSize || 5000;
        
        this.userWindows = new Map();
        this.globalWindow = [];
        this.messageQueue = [];
        this.processing = new Set();
        
        this.metrics = {
            totalMessages: 0,
            throttledMessages: 0,
            queuedMessages: 0,
            processedMessages: 0,
            averageWaitTime: 0
        };
        
        this.waitTimes = [];
        this.maxWaitTimeHistory = 100;
        
        setInterval(() => this.cleanup(), this.windowSize / 10);
    }

    async processMessage(userId, message, handler) {
        const timestamp = Date.now();
        this.metrics.totalMessages++;
        
        if (!this.canProcessMessage(userId, timestamp)) {
            return this.queueMessage(userId, message, handler, timestamp);
        }

        return this.executeMessage(userId, message, handler, timestamp);
    }

    canProcessMessage(userId, timestamp) {
        if (this.processing.has(userId)) {
            return false;
        }

        const userWindow = this.getUserWindow(userId);
        if (userWindow.length >= this.maxMessagesPerUser) {
            return false;
        }

        if (this.globalWindow.length >= this.maxMessagesGlobal) {
            return false;
        }

        return true;
    }

    async executeMessage(userId, message, handler, timestamp) {
        this.addToWindows(userId, timestamp);
        this.processing.add(userId);

        try {
            const result = await handler(message);
            this.recordSuccess(timestamp);
            return result;
        } catch (error) {
            this.recordError(error, timestamp);
            throw error;
        } finally {
            this.processing.delete(userId);
            this.processQueue();
        }
    }

    queueMessage(userId, message, handler, timestamp) {
        if (this.messageQueue.length >= this.maxQueueSize) {
            this.metrics.throttledMessages++;
            this.emit('messageDropped', { userId, reason: 'queue_full' });
            return null;
        }

        const queuedMessage = {
            userId,
            message,
            handler,
            timestamp,
            queuedAt: Date.now()
        };

        this.messageQueue.push(queuedMessage);
        this.metrics.queuedMessages++;
        
        return new Promise((resolve, reject) => {
            queuedMessage.resolve = resolve;
            queuedMessage.reject = reject;
        });
    }

    processQueue() {
        while (this.messageQueue.length > 0) {
            const queued = this.messageQueue[0];
            
            if (!this.canProcessMessage(queued.userId, Date.now())) {
                break;
            }

            this.messageQueue.shift();
            const waitTime = Date.now() - queued.queuedAt;
            this.waitTimes.push(waitTime);
            
            if (this.waitTimes.length > this.maxWaitTimeHistory) {
                this.waitTimes.shift();
            }

            this.executeMessage(queued.userId, queued.message, queued.handler, queued.timestamp)
                .then(queued.resolve)
                .catch(queued.reject);
        }
    }

    getUserWindow(userId) {
        if (!this.userWindows.has(userId)) {
            this.userWindows.set(userId, []);
        }
        return this.userWindows.get(userId);
    }

    addToWindows(userId, timestamp) {
        const userWindow = this.getUserWindow(userId);
        userWindow.push(timestamp);
        this.globalWindow.push(timestamp);
    }

    cleanup() {
        const cutoff = Date.now() - this.windowSize;
        
        for (const [userId, window] of this.userWindows.entries()) {
            const filtered = window.filter(timestamp => timestamp > cutoff);
            if (filtered.length === 0) {
                this.userWindows.delete(userId);
            } else {
                this.userWindows.set(userId, filtered);
            }
        }

        this.globalWindow = this.globalWindow.filter(timestamp => timestamp > cutoff);
        
        this.processQueue();
    }

    recordSuccess(timestamp) {
        this.metrics.processedMessages++;
        this.updateMetrics();
    }

    recordError(error, timestamp) {
        this.emit('messageError', { error, timestamp });
    }

    updateMetrics() {
        if (this.waitTimes.length > 0) {
            const sum = this.waitTimes.reduce((a, b) => a + b, 0);
            this.metrics.averageWaitTime = sum / this.waitTimes.length;
        }
    }

    getStatus() {
        return {
            metrics: this.metrics,
            queueLength: this.messageQueue.length,
            processingUsers: Array.from(this.processing),
            userWindowSizes: Array.from(this.userWindows.entries()).map(([userId, window]) => ({
                userId,
                messageCount: window.length
            })),
            globalWindowUsage: this.globalWindow.length,
            isHealthy: this.globalWindow.length < this.maxMessagesGlobal * 0.8
        };
    }

    getUserStatus(userId) {
        const userWindow = this.getUserWindow(userId);
        return {
            userId,
            messageCount: userWindow.length,
            isProcessing: this.processing.has(userId),
            canSend: userWindow.length < this.maxMessagesPerUser && !this.processing.has(userId)
        };
    }
}

module.exports = MessageThrottler;
