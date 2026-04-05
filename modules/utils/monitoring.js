const logger = require('./structuredLogger');
const { getOverallHealth } = require('./healthCheck');

class MonitoringSystem {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                successful: 0,
                failed: 0,
                averageResponseTime: 0
            },
            users: {
                active: 0,
                total: 0,
                banned: 0
            },
            commands: {
                executed: 0,
                errors: 0,
                averageExecutionTime: 0
            },
            system: {
                uptime: 0,
                memoryUsage: 0,
                cpuUsage: 0
            }
        };
        
        this.responseTimes = [];
        this.maxResponseTimeHistory = 100;
        this.activeUsers = new Set();
        
        this.startMonitoring();
    }

    startMonitoring() {
        setInterval(() => this.updateSystemMetrics(), 30000);
        setInterval(() => this.cleanupMetrics(), 300000);
    }

    recordRequest(success, responseTime) {
        this.metrics.requests.total++;
        if (success) {
            this.metrics.requests.successful++;
        } else {
            this.metrics.requests.failed++;
        }

        this.responseTimes.push(responseTime);
        if (this.responseTimes.length > this.maxResponseTimeHistory) {
            this.responseTimes.shift();
        }

        this.updateAverageResponseTime();
    }

    recordCommand(command, userId, executionTime, success) {
        this.metrics.commands.executed++;
        if (!success) {
            this.metrics.commands.errors++;
        }

        this.activeUsers.add(userId);
        
        logger.command(command, userId, {
            executionTime,
            success
        });
    }

    recordUserActivity(userId) {
        this.activeUsers.add(userId);
        this.metrics.users.active = this.activeUsers.size;
    }

    updateSystemMetrics() {
        const memUsage = process.memoryUsage();
        this.metrics.system.uptime = process.uptime();
        this.metrics.system.memoryUsage = {
            heapUsed: memUsage.heapUsed / 1024 / 1024,
            heapTotal: memUsage.heapTotal / 1024 / 1024,
            external: memUsage.external / 1024 / 1024,
            rss: memUsage.rss / 1024 / 1024
        };

        this.metrics.users.banned = global.BANNED_USERS ? global.BANNED_USERS.size : 0;
        this.metrics.users.total = this.metrics.users.active + this.metrics.users.banned;
    }

    updateAverageResponseTime() {
        if (this.responseTimes.length > 0) {
            const sum = this.responseTimes.reduce((a, b) => a + b, 0);
            this.metrics.requests.averageResponseTime = sum / this.responseTimes.length;
        }
    }

    cleanupMetrics() {
        this.activeUsers.clear();
        this.metrics.users.active = 0;
        
        if (this.responseTimes.length > this.maxResponseTimeHistory) {
            this.responseTimes = this.responseTimes.slice(-this.maxResponseTimeHistory);
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            timestamp: new Date().toISOString(),
            health: getOverallHealth(),
            webhookMetrics: global.webhook ? global.webhook.getMetrics() : null,
            cacheMetrics: {
                sessions: global.sessions ? global.sessions.size() : 0,
                userCache: global.userCache ? global.userCache.size() : 0,
                messageCache: global.messageCache ? global.messageCache.size() : 0
            }
        };
    }

    getAlerts() {
        const alerts = [];
        
        if (this.metrics.requests.failed / this.metrics.requests.total > 0.1) {
            alerts.push({
                level: 'warning',
                message: 'High error rate detected',
                value: `${((this.metrics.requests.failed / this.metrics.requests.total) * 100).toFixed(2)}%`
            });
        }

        if (this.metrics.requests.averageResponseTime > 5000) {
            alerts.push({
                level: 'warning',
                message: 'High response time detected',
                value: `${this.metrics.requests.averageResponseTime.toFixed(2)}ms`
            });
        }

        if (this.metrics.system.memoryUsage.heapUsed > 500) {
            alerts.push({
                level: 'critical',
                message: 'High memory usage detected',
                value: `${this.metrics.system.memoryUsage.heapUsed.toFixed(2)}MB`
            });
        }

        const health = getOverallHealth();
        if (health.status === 'critical') {
            alerts.push({
                level: 'critical',
                message: 'System health critical',
                value: health.status
            });
        }

        return alerts;
    }

    getPerformanceReport() {
        const metrics = this.getMetrics();
        
        return {
            summary: {
                totalRequests: metrics.requests.total,
                successRate: metrics.requests.total > 0 ? 
                    ((metrics.requests.successful / metrics.requests.total) * 100).toFixed(2) + '%' : '0%',
                averageResponseTime: metrics.requests.averageResponseTime.toFixed(2) + 'ms',
                uptime: this.formatUptime(metrics.system.uptime),
                activeUsers: metrics.users.active
            },
            performance: {
                requestsPerSecond: this.calculateRequestsPerSecond(),
                memoryEfficiency: this.calculateMemoryEfficiency(),
                errorRate: this.calculateErrorRate()
            },
            alerts: this.getAlerts(),
            health: metrics.health
        };
    }

    formatUptime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        return `${hours}h ${minutes}m ${secs}s`;
    }

    calculateRequestsPerSecond() {
        return this.metrics.requests.total / this.metrics.system.uptime;
    }

    calculateMemoryEfficiency() {
        return this.metrics.commands.executed > 0 ? 
            this.metrics.system.memoryUsage.heapUsed / this.metrics.commands.executed : 0;
    }

    calculateErrorRate() {
        return this.metrics.requests.total > 0 ? 
            (this.metrics.requests.failed / this.metrics.requests.total) * 100 : 0;
    }
}

module.exports = MonitoringSystem;
