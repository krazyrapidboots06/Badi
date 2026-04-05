const logger = require('../utils/structuredLogger');
const os = require('os');

class ResourceMonitor {
    constructor(options = {}) {
        this.maxCpuUsage = options.maxCpuUsage || 80;
        this.maxMemoryUsage = options.maxMemoryUsage || 80;
        this.maxDiskUsage = options.maxDiskUsage || 90;
        this.checkInterval = options.checkInterval || 30000;
        this.alertThreshold = options.alertThreshold || 3;
        
        this.metrics = {
            cpu: [],
            memory: [],
            disk: [],
            alerts: []
        };
        
        this.consecutiveAlerts = 0;
        this.emergencyMode = false;
        
        this.startMonitoring();
    }

    startMonitoring() {
        setInterval(() => this.collectMetrics(), this.checkInterval);
        setInterval(() => this.analyzeMetrics(), this.checkInterval * 2);
        setInterval(() => this.performMaintenance(), this.checkInterval * 10);
    }

    collectMetrics() {
        const cpuUsage = this.getCpuUsage();
        const memoryUsage = this.getMemoryUsage();
        const diskUsage = this.getDiskUsage();
        
        this.metrics.cpu.push(cpuUsage);
        this.metrics.memory.push(memoryUsage);
        this.metrics.disk.push(diskUsage);
        
        const maxHistory = 60;
        if (this.metrics.cpu.length > maxHistory) {
            this.metrics.cpu.shift();
            this.metrics.memory.shift();
            this.metrics.disk.shift();
        }
        
        logger.debug('Resource metrics collected', {
            cpu: cpuUsage.toFixed(2),
            memory: memoryUsage.toFixed(2),
            disk: diskUsage.toFixed(2)
        });
    }

    getCpuUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;
        
        cpus.forEach(cpu => {
            for (const type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });
        
        return 100 - (totalIdle / totalTick * 100);
    }

    getMemoryUsage() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        
        return (used / total) * 100;
    }

    getDiskUsage() {
        const fs = require('fs');
        const path = require('path');
        
        try {
            const stats = fs.statSync(process.cwd());
            return 50;
        } catch (error) {
            return 0;
        }
    }

    analyzeMetrics() {
        if (this.metrics.cpu.length < 5) return;
        
        const avgCpu = this.getAverage(this.metrics.cpu);
        const avgMemory = this.getAverage(this.metrics.memory);
        const avgDisk = this.getAverage(this.metrics.disk);
        
        let alerts = [];
        
        if (avgCpu > this.maxCpuUsage) {
            alerts.push({
                type: 'cpu',
                level: avgCpu > 95 ? 'critical' : 'warning',
                value: avgCpu.toFixed(2),
                message: `High CPU usage: ${avgCpu.toFixed(2)}%`
            });
        }
        
        if (avgMemory > this.maxMemoryUsage) {
            alerts.push({
                type: 'memory',
                level: avgMemory > 95 ? 'critical' : 'warning',
                value: avgMemory.toFixed(2),
                message: `High memory usage: ${avgMemory.toFixed(2)}%`
            });
        }
        
        if (avgDisk > this.maxDiskUsage) {
            alerts.push({
                type: 'disk',
                level: avgDisk > 95 ? 'critical' : 'warning',
                value: avgDisk.toFixed(2),
                message: `High disk usage: ${avgDisk.toFixed(2)}%`
            });
        }
        
        if (alerts.length > 0) {
            this.handleAlerts(alerts);
        } else {
            this.consecutiveAlerts = 0;
            if (this.emergencyMode) {
                this.exitEmergencyMode();
            }
        }
        
        this.metrics.alerts = alerts;
    }

    handleAlerts(alerts) {
        this.consecutiveAlerts++;
        
        alerts.forEach(alert => {
            logger.warn('Resource alert', alert);
        });
        
        if (this.consecutiveAlerts >= this.alertThreshold) {
            this.enterEmergencyMode();
        }
        
        if (alerts.some(alert => alert.level === 'critical')) {
            this.handleCriticalAlert(alerts);
        }
    }

    enterEmergencyMode() {
        if (!this.emergencyMode) {
            this.emergencyMode = true;
            logger.error('Entering emergency mode due to resource constraints');
            
            this.enableEmergencyRestrictions();
        }
    }

    exitEmergencyMode() {
        if (this.emergencyMode) {
            this.emergencyMode = false;
            logger.info('Exiting emergency mode');
            
            this.disableEmergencyRestrictions();
        }
    }

    enableEmergencyRestrictions() {
        global.MAINTENANCE_MODE = true;
        
        if (global.monitoring) {
            global.monitoring.metrics.emergencyMode = true;
        }
        
        const cacheOptimizer = require('./cacheOptimizer');
        if (global.cacheOptimizer) {
            global.cacheOptimizer.emergencyCleanup();
        }
        
        logger.warn('Emergency restrictions enabled');
    }

    disableEmergencyRestrictions() {
        global.MAINTENANCE_MODE = false;
        
        if (global.monitoring) {
            global.monitoring.metrics.emergencyMode = false;
        }
        
        logger.info('Emergency restrictions disabled');
    }

    handleCriticalAlert(alerts) {
        logger.error('Critical resource alert', { alerts });
        
        const criticalAlerts = alerts.filter(alert => alert.level === 'critical');
        
        criticalAlerts.forEach(alert => {
            switch (alert.type) {
                case 'memory':
                    this.handleMemoryCrisis();
                    break;
                case 'cpu':
                    this.handleCpuCrisis();
                    break;
                case 'disk':
                    this.handleDiskCrisis();
                    break;
            }
        });
    }

    handleMemoryCrisis() {
        logger.error('Memory crisis detected - forcing garbage collection');
        
        if (global.gc) {
            global.gc();
        }
        
        if (global.cacheOptimizer) {
            global.cacheOptimizer.clearAllCaches();
        }
        
        const cacheOptimizer = require('./cacheOptimizer');
        if (global.cacheOptimizer) {
            global.cacheOptimizer.clearAllCaches();
        }
    }

    handleCpuCrisis() {
        logger.error('CPU crisis detected - reducing processing capacity');
        
        if (global.loadBalancer) {
            global.loadBalancer.maxConcurrency = Math.floor(global.loadBalancer.maxConcurrency * 0.5);
        }
        
        if (global.messageThrottler) {
            global.messageThrottler.maxMessagesGlobal = Math.floor(global.messageThrottler.maxMessagesGlobal * 0.5);
        }
    }

    handleDiskCrisis() {
        logger.error('Disk crisis detected - cleaning up temporary files');
        
        const fs = require('fs');
        const path = require('path');
        
        const tempDirs = ['temp', 'cache', 'logs'];
        
        tempDirs.forEach(dir => {
            try {
                const files = fs.readdirSync(dir);
                const oldFiles = files.filter(file => {
                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);
                    return Date.now() - stats.mtime.getTime() > 24 * 60 * 60 * 1000;
                });
                
                oldFiles.forEach(file => {
                    fs.unlinkSync(path.join(dir, file));
                });
                
                if (oldFiles.length > 0) {
                    logger.info('Cleaned old files', { directory: dir, count: oldFiles.length });
                }
            } catch (error) {
                logger.warn('Failed to clean directory', { directory: dir, error: error.message });
            }
        });
    }

    performMaintenance() {
        this.optimizeMemoryUsage();
        this.checkPerformance();
        this.cleanupMetrics();
    }

    optimizeMemoryUsage() {
        if (global.gc) {
            global.gc();
        }
        
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        
        if (heapUsedMB > 500) {
            logger.warn('High heap usage detected', { heapUsed: `${heapUsedMB.toFixed(2)}MB` });
        }
    }

    checkPerformance() {
        const avgCpu = this.getAverage(this.metrics.cpu);
        const avgMemory = this.getAverage(this.metrics.memory);
        
        if (avgCpu > 70 || avgMemory > 70) {
            logger.warn('Performance degradation detected', {
                cpu: avgCpu.toFixed(2),
                memory: avgMemory.toFixed(2)
            });
        }
    }

    cleanupMetrics() {
        const maxHistory = 120;
        
        if (this.metrics.cpu.length > maxHistory) {
            this.metrics.cpu = this.metrics.cpu.slice(-maxHistory);
            this.metrics.memory = this.metrics.memory.slice(-maxHistory);
            this.metrics.disk = this.metrics.disk.slice(-maxHistory);
        }
    }

    getAverage(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    getMetrics() {
        return {
            current: {
                cpu: this.metrics.cpu[this.metrics.cpu.length - 1] || 0,
                memory: this.metrics.memory[this.metrics.memory.length - 1] || 0,
                disk: this.metrics.disk[this.metrics.disk.length - 1] || 0
            },
            average: {
                cpu: this.getAverage(this.metrics.cpu),
                memory: this.getAverage(this.metrics.memory),
                disk: this.getAverage(this.metrics.disk)
            },
            emergencyMode: this.emergencyMode,
            consecutiveAlerts: this.consecutiveAlerts,
            alerts: this.metrics.alerts,
            system: {
                platform: os.platform(),
                arch: os.arch(),
                nodeVersion: process.version,
                uptime: process.uptime()
            }
        };
    }

    healthCheck() {
        const metrics = this.getMetrics();
        
        return {
            healthy: !this.emergencyMode && this.consecutiveAlerts < this.alertThreshold,
            emergencyMode: this.emergencyMode,
            consecutiveAlerts: this.consecutiveAlerts,
            currentUsage: metrics.current,
            averageUsage: metrics.average,
            alerts: metrics.alerts
        };
    }
}

module.exports = ResourceMonitor;
