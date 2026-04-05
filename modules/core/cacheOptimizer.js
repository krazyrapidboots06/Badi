const logger = require('../utils/structuredLogger');
const zlib = require('zlib');

class CacheOptimizer {
    constructor(options = {}) {
        this.maxMemoryUsage = options.maxMemoryUsage || 100;
        this.compressionThreshold = options.compressionThreshold || 1024;
        this.cleanupInterval = options.cleanupInterval || 300000;
        this.maxCacheSize = options.maxCacheSize || 5000;
        
        this.metrics = {
            totalOperations: 0,
            compressions: 0,
            decompressions: 0,
            evictions: 0,
            memorySaved: 0
        };
        
        this.memoryUsage = 0;
        this.compressionEnabled = true;
        
        this.startOptimization();
    }

    startOptimization() {
        setInterval(() => this.performCleanup(), this.cleanupInterval);
        setInterval(() => this.checkMemoryUsage(), this.cleanupInterval / 2);
    }

    compressData(data) {
        if (!this.compressionEnabled || typeof data !== 'string' || data.length < this.compressionThreshold) {
            return data;
        }

        try {
            const compressed = zlib.gzipSync(data);
            this.metrics.compressions++;
            this.metrics.memorySaved += data.length - compressed.length;
            
            return {
                __compressed: true,
                data: compressed
            };
        } catch (error) {
            logger.warn('Compression failed', { error: error.message });
            return data;
        }
    }

    decompressData(data) {
        if (data && typeof data === 'object' && data.__compressed) {
            try {
                const decompressed = zlib.gunzipSync(data.data);
                this.metrics.decompressions++;
                return decompressed.toString();
            } catch (error) {
                logger.warn('Decompression failed', { error: error.message });
                return null;
            }
        }
        return data;
    }

    estimateMemoryUsage(data) {
        if (data && typeof data === 'object' && data.__compressed) {
            return data.data.length;
        }
        
        if (typeof data === 'string') {
            return data.length * 2;
        }
        
        if (typeof data === 'object') {
            return JSON.stringify(data).length * 2;
        }
        
        return 100;
    }

    performCleanup() {
        const caches = [
            global.sessions,
            global.userCache,
            global.messageCache
        ];

        let totalCleaned = 0;
        
        caches.forEach(cache => {
            if (cache && cache.cache) {
                const cleaned = this.cleanupCache(cache);
                totalCleaned += cleaned;
            }
        });

        if (totalCleaned > 0) {
            logger.info('Cache cleanup completed', { itemsCleaned: totalCleaned });
        }
    }

    cleanupCache(cacheManager) {
        if (!cacheManager.cache) return 0;
        
        const now = Date.now();
        const maxAge = cacheManager.maxAge;
        let cleaned = 0;
        
        for (const [key, entry] of cacheManager.cache.entries()) {
            if (now - entry.timestamp > maxAge) {
                this.memoryUsage -= this.estimateMemoryUsage(entry.value);
                cacheManager.cache.delete(key);
                cleaned++;
                this.metrics.evictions++;
            }
        }
        
        if (cacheManager.cache.size > cacheManager.maxSize) {
            const entries = Array.from(cacheManager.cache.entries());
            const toRemove = entries.slice(0, cacheManager.cache.size - cacheManager.maxSize);
            
            toRemove.forEach(([key, entry]) => {
                this.memoryUsage -= this.estimateMemoryUsage(entry.value);
                cacheManager.cache.delete(key);
                cleaned++;
                this.metrics.evictions++;
            });
        }
        
        return cleaned;
    }

    checkMemoryUsage() {
        const caches = [
            global.sessions,
            global.userCache,
            global.messageCache
        ];

        let totalSize = 0;
        
        caches.forEach(cache => {
            if (cache && cache.cache) {
                for (const [key, entry] of cache.cache.entries()) {
                    totalSize += this.estimateMemoryUsage(entry.value);
                }
            }
        });

        this.memoryUsage = totalSize;
        const memoryUsageMB = totalSize / 1024 / 1024;

        if (memoryUsageMB > this.maxMemoryUsage) {
            logger.warn('High cache memory usage', { 
                usage: `${memoryUsageMB.toFixed(2)}MB`,
                limit: `${this.maxMemoryUsage}MB`
            });
            
            this.emergencyCleanup();
        }
    }

    emergencyCleanup() {
        const caches = [
            global.sessions,
            global.userCache,
            global.messageCache
        ];

        caches.forEach(cache => {
            if (cache && cache.cache) {
                const entries = Array.from(cache.cache.entries());
                const toRemove = Math.floor(entries.length * 0.3);
                
                for (let i = 0; i < toRemove; i++) {
                    const [key, entry] = entries[i];
                    this.memoryUsage -= this.estimateMemoryUsage(entry.value);
                    cache.cache.delete(key);
                    this.metrics.evictions++;
                }
            }
        });

        logger.warn('Emergency cache cleanup performed');
    }

    optimizeCacheSize(cacheManager) {
        if (!cacheManager || !cacheManager.cache) return;
        
        const currentSize = cacheManager.cache.size;
        const targetSize = Math.floor(this.maxCacheSize * 0.8);
        
        if (currentSize > targetSize) {
            const entries = Array.from(cacheManager.cache.entries());
            entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const toRemove = entries.slice(0, currentSize - targetSize);
            
            toRemove.forEach(([key, entry]) => {
                this.memoryUsage -= this.estimateMemoryUsage(entry.value);
                cacheManager.cache.delete(key);
                this.metrics.evictions++;
            });
        }
    }

    getMetrics() {
        return {
            ...this.metrics,
            memoryUsage: `${(this.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
            compressionRatio: this.metrics.compressions > 0 ? 
                `${(this.metrics.memorySaved / (this.metrics.memorySaved + this.memoryUsage) * 100).toFixed(2)}%` : '0%',
            cacheSizes: {
                sessions: global.sessions ? global.sessions.size() : 0,
                userCache: global.userCache ? global.userCache.size() : 0,
                messageCache: global.messageCache ? global.messageCache.size() : 0
            }
        };
    }

    healthCheck() {
        const memoryUsageMB = this.memoryUsage / 1024 / 1024;
        
        return {
            healthy: memoryUsageMB < this.maxMemoryUsage * 0.8,
            memoryUsage: `${memoryUsageMB.toFixed(2)}MB`,
            limit: `${this.maxMemoryUsage}MB`,
            compressionEnabled: this.compressionEnabled,
            metrics: this.getMetrics()
        };
    }

    enableCompression() {
        this.compressionEnabled = true;
        logger.info('Cache compression enabled');
    }

    disableCompression() {
        this.compressionEnabled = false;
        logger.info('Cache compression disabled');
    }

    clearAllCaches() {
        const caches = [global.sessions, global.userCache, global.messageCache];
        let totalCleared = 0;
        
        caches.forEach(cache => {
            if (cache && cache.clear) {
                const size = cache.size();
                cache.clear();
                totalCleared += size;
            }
        });
        
        this.memoryUsage = 0;
        logger.info('All caches cleared', { itemsCleared: totalCleared });
        
        return totalCleared;
    }
}

module.exports = CacheOptimizer;
