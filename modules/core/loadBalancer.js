const EventEmitter = require('events');

class LoadBalancer extends EventEmitter {
    constructor(options = {}) {
        super();
        this.maxConcurrency = options.maxConcurrency || 100;
        this.queueSize = options.queueSize || 1000;
        this.processing = new Map();
        this.queue = [];
        this.metrics = {
            totalProcessed: 0,
            totalErrors: 0,
            avgProcessingTime: 0,
            currentLoad: 0
        };
        this.processingTimes = [];
        this.maxProcessingTimeHistory = 100;
    }

    async process(userId, task) {
        const startTime = Date.now();
        
        if (this.processing.has(userId)) {
            this.queue.push({ userId, task, timestamp: startTime });
            if (this.queue.length > this.queueSize) {
                this.queue.shift();
                this.emit('queueOverflow', userId);
            }
            return;
        }

        if (this.processing.size >= this.maxConcurrency) {
            this.queue.push({ userId, task, timestamp: startTime });
            return;
        }

        return this.executeTask(userId, task, startTime);
    }

    async executeTask(userId, task, startTime) {
        this.processing.set(userId, startTime);
        this.updateMetrics();

        try {
            const result = await task();
            this.recordSuccess(startTime);
            return result;
        } catch (error) {
            this.recordError(error, startTime);
            throw error;
        } finally {
            this.processing.delete(userId);
            this.processQueue();
        }
    }

    processQueue() {
        if (this.queue.length === 0 || this.processing.size >= this.maxConcurrency) {
            return;
        }

        const { userId, task, timestamp } = this.queue.shift();
        const waitTime = Date.now() - timestamp;
        
        if (waitTime > 30000) {
            this.emit('taskTimeout', userId, waitTime);
            this.processQueue();
            return;
        }

        this.executeTask(userId, task, timestamp);
    }

    recordSuccess(startTime) {
        const processingTime = Date.now() - startTime;
        this.processingTimes.push(processingTime);
        
        if (this.processingTimes.length > this.maxProcessingTimeHistory) {
            this.processingTimes.shift();
        }

        this.metrics.totalProcessed++;
        this.updateMetrics();
    }

    recordError(error, startTime) {
        this.metrics.totalErrors++;
        this.emit('error', error);
    }

    updateMetrics() {
        this.metrics.currentLoad = this.processing.size;
        
        if (this.processingTimes.length > 0) {
            const sum = this.processingTimes.reduce((a, b) => a + b, 0);
            this.metrics.avgProcessingTime = sum / this.processingTimes.length;
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            queueLength: this.queue.length,
            processingUsers: Array.from(this.processing.keys()),
            isOverloaded: this.processing.size >= this.maxConcurrency * 0.8
        };
    }

    getQueueStatus() {
        return {
            queueLength: this.queue.length,
            maxSize: this.queueSize,
            utilization: (this.queue.length / this.queueSize * 100).toFixed(2) + '%',
            oldestTask: this.queue.length > 0 ? Date.now() - this.queue[0].timestamp : 0
        };
    }
}

module.exports = LoadBalancer;
