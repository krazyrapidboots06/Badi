const cluster = require('cluster');
const os = require('os');
const logger = require('../utils/structuredLogger');

class ClusterManager {
    constructor(options = {}) {
        this.workers = options.workers || Math.min(os.cpus().length, 4);
        this.maxRestarts = options.maxRestarts || 3;
        this.restartDelay = options.restartDelay || 5000;
        this.healthCheckInterval = options.healthCheckInterval || 30000;
        
        this.workerStats = new Map();
        this.totalRequests = 0;
        this.activeConnections = 0;
        this.isShuttingDown = false;
        
        this.metrics = {
            workers: this.workers,
            totalRestarts: 0,
            uptime: Date.now(),
            memoryUsage: {
                total: 0,
                average: 0,
                max: 0
            },
            requests: {
                total: 0,
                perSecond: 0,
                errors: 0
            }
        };
        
        this.requestTimestamps = [];
        this.maxRequestHistory = 60;
    }

    start() {
        if (cluster.isMaster) {
            this.startMaster();
        } else {
            this.startWorker();
        }
    }

    startMaster() {
        logger.info(`Starting cluster with ${this.workers} workers`);
        
        for (let i = 0; i < this.workers; i++) {
            this.forkWorker(i);
        }

        cluster.on('fork', (worker) => {
            logger.info(`Worker ${worker.id} forked`);
            this.workerStats.set(worker.id, {
                pid: worker.process.pid,
                startTime: Date.now(),
                restarts: 0,
                memory: { heapUsed: 0 },
                requests: 0,
                errors: 0
            });
        });

        cluster.on('online', (worker) => {
            logger.info(`Worker ${worker.id} is online`);
        });

        cluster.on('exit', (worker, code, signal) => {
            this.handleWorkerExit(worker, code, signal);
        });

        cluster.on('disconnect', (worker) => {
            logger.warn(`Worker ${worker.id} disconnected`);
        });

        this.startHealthMonitoring();
        this.setupGracefulShutdown();
    }

    startWorker() {
        logger.info(`Worker ${process.pid} started`);
        
        process.on('message', (message) => {
            this.handleWorkerMessage(message);
        });

        process.on('uncaughtException', (error) => {
            logger.error('Worker uncaught exception', { error: error.message });
            try {
                process.send({ type: 'error', error: error.message });
            } catch (e) {
                logger.error('Failed to send error to master', { error: e.message });
            }
            process.exit(1);
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Worker unhandled rejection', { reason });
            try {
                process.send({ type: 'error', error: reason.toString() });
            } catch (e) {
                logger.error('Failed to send rejection to master', { error: e.message });
            }
        });

        setInterval(() => {
            try {
                const memUsage = process.memoryUsage();
                process.send({
                    type: 'stats',
                    memory: memUsage,
                    uptime: process.uptime()
                });
            } catch (e) {
                logger.error('Failed to send stats to master', { error: e.message });
            }
        }, 10000);
    }

    forkWorker(workerIndex) {
        const worker = cluster.fork();
        
        worker.on('message', (message) => {
            this.handleWorkerMessage(message);
        });
        
        return worker;
    }

    handleWorkerMessage(message) {
        if (message.type === 'request') {
            this.totalRequests++;
            this.metrics.requests.total++;
            this.recordRequestTimestamp();
            
            const stats = this.workerStats.get(message.workerId);
            if (stats) {
                stats.requests++;
            }
        } else if (message.type === 'error') {
            this.metrics.requests.errors++;
            const stats = this.workerStats.get(message.workerId);
            if (stats) {
                stats.errors++;
            }
        } else if (message.type === 'stats') {
            const stats = this.workerStats.get(message.workerId);
            if (stats) {
                stats.memory = message.memory;
                stats.uptime = message.uptime;
            }
            this.updateMemoryMetrics();
        }
    }

    handleWorkerExit(worker, code, signal) {
        const stats = this.workerStats.get(worker.id);
        const restartCount = stats ? stats.restarts + 1 : 1;
        
        logger.warn(`Worker ${worker.id} died (code: ${code}, signal: ${signal})`);
        
        this.workerStats.delete(worker.id);
        this.metrics.totalRestarts++;
        
        if (restartCount <= this.maxRestarts && !this.isShuttingDown) {
            logger.info(`Restarting worker ${worker.id} (attempt ${restartCount}/${this.maxRestarts})`);
            
            setTimeout(() => {
                const newWorker = this.forkWorker(worker.id);
                this.workerStats.set(newWorker.id, {
                    pid: newWorker.process.pid,
                    startTime: Date.now(),
                    restarts: restartCount,
                    memory: { heapUsed: 0 },
                    requests: 0,
                    errors: 0
                });
            }, this.restartDelay);
        } else {
            logger.error(`Worker ${worker.id} exceeded max restarts`);
        }
    }

    startHealthMonitoring() {
        setInterval(() => {
            this.updateMetrics();
            this.checkWorkerHealth();
        }, this.healthCheckInterval);
    }

    checkWorkerHealth() {
        for (const [workerId, stats] of this.workerStats.entries()) {
            const worker = cluster.workers[workerId];
            
            if (!worker || !worker.isConnected()) {
                logger.warn(`Worker ${workerId} appears to be disconnected`);
                continue;
            }

            const memoryMB = stats.memory.heapUsed / 1024 / 1024;
            if (memoryMB > 300) {
                logger.warn(`Worker ${workerId} high memory usage: ${memoryMB.toFixed(2)}MB`);
            }

            const errorRate = stats.requests > 0 ? (stats.errors / stats.requests) * 100 : 0;
            if (errorRate > 10) {
                logger.warn(`Worker ${workerId} high error rate: ${errorRate.toFixed(2)}%`);
            }
        }
    }

    updateMetrics() {
        this.updateMemoryMetrics();
        this.updateRequestMetrics();
    }

    updateMemoryMetrics() {
        let totalMemory = 0;
        let maxMemory = 0;
        let workerCount = 0;

        for (const stats of this.workerStats.values()) {
            if (stats.memory && stats.memory.heapUsed) {
                const memoryMB = stats.memory.heapUsed / 1024 / 1024;
                totalMemory += memoryMB;
                maxMemory = Math.max(maxMemory, memoryMB);
                workerCount++;
            }
        }

        this.metrics.memoryUsage = {
            total: totalMemory,
            average: workerCount > 0 ? totalMemory / workerCount : 0,
            max: maxMemory
        };
    }

    updateRequestMetrics() {
        const now = Date.now();
        this.requestTimestamps = this.requestTimestamps.filter(timestamp => 
            now - timestamp < 60000
        );
        
        this.metrics.requests.perSecond = this.requestTimestamps.length / 60;
    }

    recordRequestTimestamp() {
        const now = Date.now();
        this.requestTimestamps.push(now);
        
        if (this.requestTimestamps.length > this.maxRequestHistory) {
            this.requestTimestamps.shift();
        }
    }

    setupGracefulShutdown() {
        const shutdown = () => {
            this.isShuttingDown = true;
            logger.info('Shutting down cluster gracefully...');
            
            for (const worker of Object.values(cluster.workers)) {
                try {
                    worker.send({ type: 'shutdown' });
                } catch (e) {
                    logger.error('Failed to send shutdown to worker', { error: e.message });
                }
            }
            
            setTimeout(() => {
                for (const worker of Object.values(cluster.workers)) {
                    try {
                        worker.kill('SIGTERM');
                    } catch (e) {
                        logger.error('Failed to kill worker', { error: e.message });
                    }
                }
                
                setTimeout(() => {
                    logger.info('Cluster shutdown complete');
                    process.exit(0);
                }, 5000);
            }, 2000);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }

    getMetrics() {
        return {
            ...this.metrics,
            uptime: Date.now() - this.metrics.uptime,
            workers: {
                total: this.workers,
                active: Object.keys(cluster.workers).length,
                stats: Array.from(this.workerStats.entries()).map(([id, stats]) => ({
                    id,
                    pid: stats.pid,
                    memory: (stats.memory.heapUsed / 1024 / 1024).toFixed(2) + 'MB',
                    requests: stats.requests,
                    errors: stats.errors,
                    restarts: stats.restarts,
                    uptime: stats.uptime
                }))
            },
            system: {
                platform: os.platform(),
                arch: os.arch(),
                totalMemory: (os.totalmem() / 1024 / 1024).toFixed(2) + 'MB',
                freeMemory: (os.freemem() / 1024 / 1024).toFixed(2) + 'MB',
                cpuCount: os.cpus().length
            }
        };
    }

    distributeLoad(data) {
        if (cluster.isMaster) {
            const workers = Object.values(cluster.workers);
            const activeWorkers = workers.filter(w => w.isConnected());
            
            if (activeWorkers.length === 0) {
                logger.warn('No active workers available');
                return false;
            }
            
            const worker = activeWorkers[Math.floor(Math.random() * activeWorkers.length)];
            
            try {
                worker.send(data);
                return true;
            } catch (error) {
                logger.error('Failed to send data to worker', { error: error.message });
                return false;
            }
        }
        return false;
    }

    broadcastToWorkers(data) {
        if (cluster.isMaster) {
            let sentCount = 0;
            for (const worker of Object.values(cluster.workers)) {
                if (worker.isConnected()) {
                    try {
                        worker.send(data);
                        sentCount++;
                    } catch (error) {
                        logger.error('Failed to broadcast to worker', { error: error.message });
                    }
                }
            }
            return sentCount;
        }
        return 0;
    }
}

module.exports = ClusterManager;
