const RedisManager = require('./redisManager');
const logger = require('../utils/structuredLogger');

class EnhancedLoadBalancer {
    constructor(options = {}) {
        this.maxConcurrency = options.maxConcurrency || 500;
        this.redis = new RedisManager();
        this.queueName = options.queueName || 'message_queue';
        this.priorityQueueName = options.priorityQueueName || 'priority_queue';
        this.maxQueueSize = options.maxQueueSize || 50000;
        this.distributionStrategy = options.distributionStrategy || 'round-robin';
        
        this.currentWorkers = new Set();
        this.processingCount = 0;
        this.workerIndex = 0;
        
        this.metrics = {
            totalProcessed: 0,
            queueSize: 0,
            priorityQueueSize: 0,
            processingTime: [],
            errors: 0,
            redisHits: 0,
            redisMisses: 0
        };
        
        this.maxProcessingTimeHistory = 100;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            const connected = await this.redis.connect();
            if (connected) {
                this.isInitialized = true;
                logger.info('Enhanced load balancer initialized with Redis');
                return true;
            }
        } catch (error) {
            logger.error('Failed to initialize enhanced load balancer', { error: error.message });
        }
        
        this.isInitialized = false;
        return false;
    }

    async process(userId, task, priority = 'normal') {
        if (!this.isInitialized) {
            return this.fallbackProcess(userId, task);
        }

        const startTime = Date.now();
        
        try {
            if (priority === 'admin' && global.ADMINS.has(userId)) {
                await this.addToPriorityQueue(userId, task, priority);
            } else {
                await this.addToQueue(userId, task, priority);
            }
            
            this.metrics.totalProcessed++;
            this.recordProcessingTime(Date.now() - startTime);
            
            return true;
        } catch (error) {
            this.metrics.errors++;
            logger.error('Failed to queue task', { error: error.message, userId });
            return false;
        }
    }

    async addToQueue(userId, task, priority) {
        const queueData = {
            userId,
            task,
            priority,
            timestamp: Date.now(),
            workerId: this.getNextWorkerId()
        };

        const queueSize = await this.redis.getQueueLength(this.queueName);
        
        if (queueSize >= this.maxQueueSize) {
            logger.warn('Queue overflow detected', { queueSize, maxSize: this.maxQueueSize });
            await this.redis.clearQueue(this.queueName);
            this.metrics.errors++;
        }

        return await this.redis.addToQueue(this.queueName, queueData, this.maxQueueSize);
    }

    async addToPriorityQueue(userId, task, priority) {
        const queueData = {
            userId,
            task,
            priority,
            timestamp: Date.now(),
            workerId: this.getNextWorkerId()
        };

        return await this.redis.addToQueue(this.priorityQueueName, queueData, 1000);
    }

    getNextWorkerId() {
        if (this.distributionStrategy === 'round-robin') {
            this.workerIndex = (this.workerIndex + 1) % this.maxConcurrency;
            return this.workerIndex;
        } else if (this.distributionStrategy === 'random') {
            return Math.floor(Math.random() * this.maxConcurrency) + 1;
        } else if (this.distributionStrategy === 'least-busy') {
            return this.getLeastBusyWorker();
        }
        
        return 1;
    }

    getLeastBusyWorker() {
        return 1;
    }

    async processFromQueues() {
        if (!this.isInitialized) return;

        try {
            await this.processPriorityQueue();
            await this.processRegularQueue();
        } catch (error) {
            logger.error('Error processing queues', { error: error.message });
        }
    }

    async processPriorityQueue() {
        const item = await this.redis.getFromQueue(this.priorityQueueName, 1);
        
        if (item) {
            await this.executeTask(item);
        }
    }

    async processRegularQueue() {
        if (this.processingCount >= this.maxConcurrency) {
            return;
        }

        const batchSize = Math.min(10, this.maxConcurrency - this.processingCount);
        const items = [];
        
        for (let i = 0; i < batchSize; i++) {
            const item = await this.redis.getFromQueue(this.queueName);
            if (!item) break;
            items.push(item);
        }

        await Promise.all(items.map(item => this.executeTask(item)));
    }

    async executeTask(queueData) {
        const { userId, task, workerId } = queueData;
        const startTime = Date.now();
        
        this.processingCount++;
        this.currentWorkers.add(userId);

        try {
            if (typeof task === 'function') {
                await task();
            } else if (task.handler && typeof task.handler === 'function') {
                await task.handler();
            }
            
            this.recordProcessingTime(Date.now() - startTime);
        } catch (error) {
            this.metrics.errors++;
            logger.error('Task execution failed', { 
                userId, 
                error: error.message,
                workerId 
            });
        } finally {
            this.processingCount--;
            this.currentWorkers.delete(userId);
        }
    }

    fallbackProcess(userId, task) {
        if (this.processingCount < this.maxConcurrency) {
            this.processingCount++;
            this.currentWorkers.add(userId);
            
            const startTime = Date.now();
            
            task().finally(() => {
                this.processingCount--;
                this.currentWorkers.delete(userId);
                this.recordProcessingTime(Date.now() - startTime);
                this.metrics.totalProcessed++;
            });
            
            return true;
        }
        
        return false;
    }

    recordProcessingTime(duration) {
        this.metrics.processingTime.push(duration);
        if (this.metrics.processingTime.length > this.maxProcessingTimeHistory) {
            this.metrics.processingTime.shift();
        }
    }

    async getMetrics() {
        if (!this.isInitialized) {
            return {
                type: 'fallback',
                processingCount: this.processingCount,
                currentWorkers: this.currentWorkers.size,
                metrics: this.metrics
            };
        }

        const queueSize = await this.redis.getQueueLength(this.queueName);
        const priorityQueueSize = await this.redis.getQueueLength(this.priorityQueueName);
        const redisMetrics = this.redis.getMetrics();

        return {
            type: 'enhanced',
            processingCount: this.processingCount,
            currentWorkers: this.currentWorkers.size,
            queueSize,
            priorityQueueSize,
            maxConcurrency: this.maxConcurrency,
            metrics: {
                ...this.metrics,
                averageProcessingTime: this.metrics.processingTime.length > 0 ? 
                    (this.metrics.processingTime.reduce((a, b) => a + b, 0) / this.metrics.processingTime.length).toFixed(2) + 'ms' : '0ms',
                redis: redisMetrics
            },
            health: await this.getHealthStatus()
        };
    }

    async getHealthStatus() {
        if (!this.isInitialized) {
            return { status: 'fallback', message: 'Redis not available' };
        }

        const redisHealth = await this.redis.healthCheck();
        const queueSize = await this.redis.getQueueLength(this.queueName);
        const priorityQueueSize = await this.redis.getQueueLength(this.priorityQueueName);
        
        const totalQueueSize = queueSize + priorityQueueSize;
        const queueUtilization = (totalQueueSize / this.maxQueueSize) * 100;
        
        let status = 'healthy';
        const issues = [];

        if (redisHealth.status !== 'healthy') {
            status = 'degraded';
            issues.push('Redis connection issues');
        }

        if (queueUtilization > 80) {
            status = 'degraded';
            issues.push('High queue utilization');
        }

        if (queueUtilization > 95) {
            status = 'critical';
            issues.push('Queue near capacity');
        }

        if (this.processingCount >= this.maxConcurrency * 0.9) {
            status = 'degraded';
            issues.push('High processing load');
        }

        return {
            status,
            issues,
            queueUtilization: queueUtilization.toFixed(2) + '%',
            processingUtilization: ((this.processingCount / this.maxConcurrency) * 100).toFixed(2) + '%'
        };
    }

    async clearQueues() {
        if (!this.isInitialized) return false;
        
        try {
            await this.redis.clearQueue(this.queueName);
            await this.redis.clearQueue(this.priorityQueueName);
            logger.info('Queues cleared successfully');
            return true;
        } catch (error) {
            logger.error('Failed to clear queues', { error: error.message });
            return false;
        }
    }

    async shutdown() {
        if (this.isInitialized) {
            await this.redis.disconnect();
            this.isInitialized = false;
            logger.info('Enhanced load balancer shut down');
        }
    }
}

module.exports = EnhancedLoadBalancer;
