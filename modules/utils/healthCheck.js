const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

function checkFileSystem() {
    const requiredDirs = ['cache', 'logs', 'config', 'modules'];
    const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));
    
    return {
        status: missingDirs.length === 0 ? 'healthy' : 'warning',
        details: {
            missingDirectories: missingDirs,
            existingDirectories: requiredDirs.filter(dir => fs.existsSync(dir))
        }
    };
}

function checkDependencies() {
    const packagePath = path.join(process.cwd(), 'package.json');
    const nodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    return {
        status: fs.existsSync(nodeModulesPath) ? 'healthy' : 'critical',
        details: {
            packageJsonExists: fs.existsSync(packagePath),
            nodeModulesExists: fs.existsSync(nodeModulesPath)
        }
    };
}

function checkMemoryUsage() {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal / 1024 / 1024;
    const usedMemory = usage.heapUsed / 1024 / 1024;
    
    return {
        status: usedMemory > 500 ? 'warning' : 'healthy',
        details: {
            heapTotal: `${totalMemory.toFixed(2)} MB`,
            heapUsed: `${usedMemory.toFixed(2)} MB`,
            external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
            rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`
        }
    };
}

function checkUptime() {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return {
        status: 'healthy',
        details: {
            uptime: `${hours}h ${minutes}m ${seconds}s`,
            uptimeSeconds: uptime
        }
    };
}

function checkResponseTime() {
    const start = performance.now();
    const end = performance.now();
    const responseTime = end - start;
    
    return {
        status: responseTime < 100 ? 'healthy' : 'warning',
        details: {
            responseTime: `${responseTime.toFixed(2)} ms`
        }
    };
}

function getOverallHealth() {
    const checks = {
        fileSystem: checkFileSystem(),
        dependencies: checkDependencies(),
        memory: checkMemoryUsage(),
        uptime: checkUptime(),
        performance: checkResponseTime()
    };
    
    const statuses = Object.values(checks).map(check => check.status);
    const hasCritical = statuses.includes('critical');
    const hasWarning = statuses.includes('warning');
    
    return {
        status: hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy',
        timestamp: new Date().toISOString(),
        checks
    };
}

module.exports = {
    getOverallHealth,
    checkFileSystem,
    checkDependencies,
    checkMemoryUsage,
    checkUptime,
    checkResponseTime
};
