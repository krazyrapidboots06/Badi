const CONSTANTS = require('../../config/constants');

class CacheManager {
    constructor(maxSize = CONSTANTS.MAX_CACHE_SIZE, maxAge = CONSTANTS.SIX_HOURS) {
        this.maxSize = maxSize;
        this.maxAge = maxAge;
        this.cache = new Map();
        
        setInterval(() => this.cleanup(), CONSTANTS.CLEANUP_INTERVAL);
    }

    cleanup() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.maxAge) {
                this.cache.delete(key);
            }
        }
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, { 
            value, 
            timestamp: Date.now() 
        });
    }

    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.value;
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    size() {
        return this.cache.size;
    }
}

module.exports = CacheManager;
