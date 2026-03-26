const axios = require('axios');
const https = require('https');
const CONSTANTS = require('../../config/constants');
const CacheManager = require('../core/cache');

const requestCache = new CacheManager(500, CONSTANTS.ONE_HOUR);

const http = axios.create({
    timeout: 30000,
    httpsAgent: new https.Agent({ 
        keepAlive: true, 
        rejectUnauthorized: true 
    }),
    headers: { 'User-Agent': 'Amduspage/Bot' },
    maxRedirects: 3,
    maxContentLength: 25 * 1024 * 1024,
    validateStatus: status => status < 500
});

http.interceptors.response.use(
    response => response,
    async error => {
        const config = error.config;
        if (!config || !config.retry) config.retry = 0;
        
        if (config.retry < (CONSTANTS.MAX_RETRIES || 3) && (error.code === 'ECONNABORTED' || error.response?.status >= 500)) {
            config.retry++;
            const delay = (CONSTANTS.RETRY_DELAY || 1500) * config.retry;
            await new Promise(r => setTimeout(r, delay));
            return http(config);
        }
        return Promise.reject(error);
    }
);

async function cachedRequest(url, options = {}, cacheTime = 60000) {
    const key = `${url}:${JSON.stringify(options)}`;
    const cached = requestCache.get(key);
    if (cached) return cached;
    
    const response = await http(url, options);
    requestCache.set(key, response);
    
    return response;
}

module.exports = {
    http,
    cachedRequest
};
