const Redis = require('ioredis');
const logger = require('../utils/structuredLogger');

class RedisManager {
    constructor(options = {}) {
        this.host = options.host || process.env.REDIS_HOST || 'localhost';
        this.port = options.port || process.env.REDIS_PORT || 6379;
        this.password = options.password || process.env.REDIS_PASSWORD;
        this.db = options.db || 0;
        
        this.client = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        this.metrics = {
            commands: 0,
            errors: 0,
            reconnects: 0,
            avgResponseTime: 0
        };
        
        this.responseTimes = [];
        this.maxResponseTimeHistory = 100;
    }

    async connect() {
        try {
            const redisOptions = {
                host: this.host,
                port: this.port,
                db: this.db,
                retryDelayOnFailover: 100,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                connectTimeout: 10000,
                commandTimeout: 5000,
                enableReadyCheck: true,
                maxRetriesPerRequest: 3
            };

            if (this.password) {
                redisOptions.password = this.password;
            }

            this.client = new Redis(redisOptions);

            this.client.on('connect', () => {
                this.isConnected = true;
                this.reconnectAttempts = 0;
                logger.info('Redis connected successfully');
            });

            this.client.on('error', (error) => {
                this.isConnected = false;
                this.metrics.errors++;
                logger.error('Redis connection error', { error: error.message });
            });

            this.client.on('close', () => {
                this.isConnected = false;
                logger.warn('Redis connection closed');
                this.handleReconnect();
            });

            await this.client.connect();
            return true;
        } catch (error) {
            logger.error('Failed to connect to Redis', { error: error.message });
            return false;
        }
    }

    async handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            logger.error('Max Redis reconnect attempts reached');
            return;
        }

        this.reconnectAttempts++;
        this.metrics.reconnects++;
        
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        logger.info(`Attempting Redis reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(async () => {
            try {
                await this.connect();
            } catch (error) {
                logger.error('Redis reconnect failed', { error: error.message });
            }
        }, delay);
    }

    async set(key, value, ttl = 3600) {
        if (!this.isConnected || !this.client) return false;
        
        const startTime = Date.now();
        this.metrics.commands++;
        
        try {
            const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
            await this.client.setex(key, ttl, serializedValue);
            
            this.recordResponseTime(Date.now() - startTime);
            return true;
        } catch (error) {
            this.metrics.errors++;
            logger.error('Redis SET error', { key, error: error.message });
            return false;
        }
    }

    async get(key) {
        if (!this.isConnected || !this.client) return null;
        
        const startTime = Date.now();
        this.metrics.commands++;
        
        try {
            const value = await this.client.get(key);
            
            this.recordResponseTime(Date.now() - startTime);
            
            if (!value) return null;
            
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        } catch (error) {
            this.metrics.errors++;
            logger.error('Redis GET error', { key, error: error.message });
            return null;
        }
    }

    async del(key) {
        if (!this.isConnected || !this.client) return false;
        
        const startTime = Date.now();
        this.metrics.commands++;
        
        try {
            await this.client.del(key);
            this.recordResponseTime(Date.now() - startTime);
            return true;
        } catch (error) {
            this.metrics.errors++;
            logger.error('Redis DEL error', { key, error: error.message });
            return false;
        }
    }

    async exists(key) {
        if (!this.isConnected || !this.client) return false;
        
        try {
            return await this.client.exists(key) === 1;
        } catch (error) {
            this.metrics.errors++;
            logger.error('Redis EXISTS error', { key, error: error.message });
            return false;
        }
    }

    async increment(key, amount = 1) {
        if (!this.isConnected || !this.client) return null;
        
        const startTime = Date.now();
        this.metrics.commands++;
        
        try {
            const result = await this.client.incrby(key, amount);
            this.recordResponseTime(Date.now() - startTime);
            return result;
        } catch (error) {
            this.metrics.errors++;
            logger.error('Redis INCR error', { key, error: error.message });
            return null;
        }
    }

    async addToQueue(queueName, data, maxLength = 10000) {
        if (!this.isConnected || !this.client) return false;
        
        try {
            const serializedData = JSON.stringify(data);
            await this.client.lpush(queueName, serializedData);
            await this.client.ltrim(queueName, 0, maxLength - 1);
            return true;
        } catch (error) {
            this.metrics.errors++;
            logger.error('Redis queue error', { queue: queueName, error: error.message });
            return false;
        }
    }

    async getFromQueue(queueName, timeout = 0) {
        if (!this.isConnected || !this.client) return null;
        
        try {
            const result = timeout > 0 
                ? await this.client.brpop(queueName, timeout)
                : await this.client.rpop(queueName);
            
            if (result && result[1]) {
                return JSON.parse(result[1]);
            }
            return null;
        } catch (error) {
            this.metrics.errors++;
            logger.error('Redis queue get error', { queue: queueName, error: error.message });
            return null;
        }
    }

    async getQueueLength(queueName) {
        if (!this.isConnected || !this.client) return 0;
        
        try {
            return await this.client.llen(queueName);
        } catch (error) {
            this.metrics.errors++;
            logger.error('Redis queue length error', { queue: queueName, error: error.message });
            return 0;
        }
    }

    async clearQueue(queueName) {
        if (!this.isConnected || !this.client) return false;
        
        try {
            await this.client.del(queueName);
            return true;
        } catch (error) {
            this.metrics.errors++;
            logger.error('Redis queue clear error', { queue: queueName, error: error.message });
            return false;
        }
    }

    recordResponseTime(duration) {
        this.responseTimes.push(duration);
        if (this.responseTimes.length > this.maxResponseTimeHistory) {
            this.responseTimes.shift();
        }

        const sum = this.responseTimes.reduce((a, b) => a + b, 0);
        this.metrics.avgResponseTime = sum / this.responseTimes.length;
    }

    getMetrics() {
        return {
            ...this.metrics,
            isConnected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            successRate: this.metrics.commands > 0 ? 
                ((this.metrics.commands - this.metrics.errors) / this.metrics.commands * 100).toFixed(2) + '%' : '100%'
        };
    }

    async healthCheck() {
        if (!this.isConnected || !this.client) {
            return { status: 'unhealthy', message: 'Redis not connected' };
        }

        try {
            const startTime = Date.now();
            await this.client.ping();
            const responseTime = Date.now() - startTime;

            if (responseTime > 1000) {
                return { status: 'degraded', responseTime, message: 'High response time' };
            }

            return { status: 'healthy', responseTime };
        } catch (error) {
            return { status: 'unhealthy', error: error.message };
        }
    }

    async disconnect() {
        if (this.client) {
            await this.client.disconnect();
            this.isConnected = false;
            logger.info('Redis disconnected');
        }
    }
}

module.exports = RedisManager;
