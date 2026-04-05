const logger = require('../utils/structuredLogger');

class DatabaseOptimizer {
    constructor(options = {}) {
        this.maxConnections = options.maxConnections || 20;
        this.connectionTimeout = options.connectionTimeout || 10000;
        this.maxBuffer = options.maxBuffer || 10000;
        this.cleanupInterval = options.cleanupInterval || 3600000;
        this.compressionThreshold = options.compressionThreshold || 1000;
        
        this.metrics = {
            totalOperations: 0,
            failedOperations: 0,
            bufferFlushes: 0,
            cleanupRuns: 0,
            averageResponseTime: 0
        };
        
        this.responseTimes = [];
        this.maxResponseTimeHistory = 100;
        
        this.startOptimization();
    }

    startOptimization() {
        setInterval(() => this.performCleanup(), this.cleanupInterval);
        setInterval(() => this.optimizeIndexes(), this.cleanupInterval * 4);
        setInterval(() => this.compactDatabase(), this.cleanupInterval * 24);
    }

    async performCleanup() {
        const startTime = Date.now();
        this.metrics.cleanupRuns++;
        
        try {
            await this.cleanupExpiredData();
            await this.cleanupOrphanedRecords();
            await this.optimizeBufferSize();
            
            const duration = Date.now() - startTime;
            this.recordResponseTime(duration);
            
            logger.info('Database cleanup completed', { 
                duration, 
                cleanupRun: this.metrics.cleanupRuns 
            });
        } catch (error) {
            logger.error('Database cleanup failed', { error: error.message });
            this.metrics.failedOperations++;
        }
    }

    async cleanupExpiredData() {
        const UserStat = require('./database').UserStat;
        const Reminder = require('./database').Reminder;
        const Ban = require('./database').Ban;
        
        const oneMonthAgo = new Date(Date.now() - 30 * 86400000);
        const oneWeekAgo = new Date(Date.now() - 7 * 86400000);
        
        const operations = [
            UserStat.deleteMany({ 
                lastActive: { $lt: oneMonthAgo },
                count: { $lt: 5 }
            }),
            Reminder.deleteMany({ 
                fireAt: { $lt: oneWeekAgo }
            }),
            Ban.deleteMany({ 
                expiresAt: { $lt: new Date() }
            })
        ];

        const results = await Promise.allSettled(operations);
        const deleted = results.reduce((sum, result) => 
            sum + (result.status === 'fulfilled' ? result.value.deletedCount || 0 : 0), 0
        );

        logger.info('Expired data cleanup', { deletedRecords: deleted });
    }

    async cleanupOrphanedRecords() {
        const UserStat = require('./database').UserStat;
        
        const orphaned = await UserStat.find({
            $or: [
                { userId: { $exists: false } },
                { userId: null },
                { userId: '' }
            ]
        });
        
        if (orphaned.length > 0) {
            await UserStat.deleteMany({ _id: { $in: orphaned.map(u => u._id) } });
            logger.warn('Cleaned orphaned records', { count: orphaned.length });
        }
    }

    async optimizeBufferSize() {
        const buffer = require('./database').buffer;
        
        if (buffer.size > this.maxBuffer) {
            const entries = Array.from(buffer.entries());
            const toFlush = entries.slice(0, this.maxBuffer / 2);
            
            for (const [userId, data] of toFlush) {
                buffer.delete(userId);
                await this.flushUserStats(userId, data);
            }
            
            logger.warn('Buffer overflow detected', { 
                originalSize: entries.length, 
                flushed: toFlush.length 
            });
        }
    }

    async flushUserStats(userId, data) {
        const UserStat = require('./database').UserStat;
        
        try {
            await UserStat.updateOne(
                { userId },
                { 
                    $inc: { count: data.count }, 
                    $set: { lastActive: new Date(), name: data.name } 
                },
                { upsert: true }
            );
        } catch (error) {
            logger.error('Failed to flush user stats', { userId, error: error.message });
        }
    }

    async optimizeIndexes() {
        const UserStat = require('./database').UserStat;
        const Reminder = require('./database').Reminder;
        
        try {
            await UserStat.createIndexes([
                { userId: 1 },
                { lastActive: 1 },
                { count: 1 }
            ]);
            
            await Reminder.createIndexes([
                { userId: 1 },
                { fireAt: 1 },
                { id: 1 }
            ]);
            
            logger.info('Database indexes optimized');
        } catch (error) {
            logger.error('Index optimization failed', { error: error.message });
        }
    }

    async compactDatabase() {
        try {
            logger.info('Starting database compaction');
            const mongoose = require('mongoose');
            
            if (mongoose.connection.readyState === 1) {
                await mongoose.connection.db.admin().command({ compact: 'amdusbot' });
                logger.info('Database compaction completed');
            }
        } catch (error) {
            logger.error('Database compaction failed', { error: error.message });
        }
    }

    recordResponseTime(duration) {
        this.responseTimes.push(duration);
        if (this.responseTimes.length > this.maxResponseTimeHistory) {
            this.responseTimes.shift();
        }

        const sum = this.responseTimes.reduce((a, b) => a + b, 0);
        this.metrics.averageResponseTime = sum / this.responseTimes.length;
    }

    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalOperations > 0 ? 
                ((this.metrics.totalOperations - this.metrics.failedOperations) / this.metrics.totalOperations * 100).toFixed(2) + '%' : '100%',
            averageResponseTime: this.metrics.averageResponseTime.toFixed(2) + 'ms'
        };
    }

    async getDatabaseStats() {
        const mongoose = require('mongoose');
        
        try {
            const stats = await mongoose.connection.db.stats();
            const collections = await mongoose.connection.db.listCollections().toArray();
            
            return {
                dataSize: stats.dataSize / 1024 / 1024,
                storageSize: stats.storageSize / 1024 / 1024,
                indexSize: stats.indexSize / 1024 / 1024,
                collections: collections.length,
                objects: stats.objects,
                avgObjSize: stats.avgObjSize
            };
        } catch (error) {
            logger.error('Failed to get database stats', { error: error.message });
            return null;
        }
    }

    async healthCheck() {
        const mongoose = require('mongoose');
        
        const health = {
            connected: mongoose.connection.readyState === 1,
            responseTime: this.metrics.averageResponseTime,
            operations: this.metrics.totalOperations,
            errors: this.metrics.failedOperations
        };

        if (health.connected && this.metrics.averageResponseTime > 5000) {
            health.warning = 'High response time detected';
        }

        if (this.metrics.failedOperations / this.metrics.totalOperations > 0.1) {
            health.critical = 'High error rate detected';
        }

        return health;
    }
}

module.exports = DatabaseOptimizer;
