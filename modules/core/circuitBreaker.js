const EventEmitter = require('events');

class CircuitBreaker extends EventEmitter {
    constructor(options = {}) {
        super();
        this.failureThreshold = options.failureThreshold || 5;
        this.resetTimeout = options.resetTimeout || 60000;
        this.monitoringPeriod = options.monitoringPeriod || 10000;
        
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.lastFailureTime = null;
        this.successCount = 0;
        this.requestCount = 0;
        
        this.metrics = {
            totalRequests: 0,
            totalFailures: 0,
            totalSuccesses: 0,
            avgResponseTime: 0,
            stateChanges: []
        };
        
        this.responseTimes = [];
        this.maxResponseTimeHistory = 100;
    }

    async execute(operation, context = {}) {
        this.metrics.totalRequests++;
        this.requestCount++;
        
        const startTime = Date.now();
        
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.resetTimeout) {
                this.setState('HALF_OPEN');
            } else {
                throw new Error('Circuit breaker is OPEN');
            }
        }

        try {
            const result = await operation();
            this.recordSuccess(startTime);
            return result;
        } catch (error) {
            this.recordFailure(error, startTime);
            throw error;
        }
    }

    recordSuccess(startTime) {
        const responseTime = Date.now() - startTime;
        this.responseTimes.push(responseTime);
        
        if (this.responseTimes.length > this.maxResponseTimeHistory) {
            this.responseTimes.shift();
        }

        this.successCount++;
        this.metrics.totalSuccesses++;
        this.failureCount = 0;

        if (this.state === 'HALF_OPEN') {
            this.setState('CLOSED');
        }

        this.updateMetrics();
    }

    recordFailure(error, startTime) {
        this.failureCount++;
        this.metrics.totalFailures++;
        this.lastFailureTime = Date.now();

        this.emit('error', error);

        if (this.failureCount >= this.failureThreshold) {
            this.setState('OPEN');
        }

        this.updateMetrics();
    }

    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        
        this.metrics.stateChanges.push({
            from: oldState,
            to: newState,
            timestamp: Date.now()
        });

        if (newState === 'CLOSED') {
            this.failureCount = 0;
            this.successCount = 0;
        }
    }

    updateMetrics() {
        if (this.responseTimes.length > 0) {
            const sum = this.responseTimes.reduce((a, b) => a + b, 0);
            this.metrics.avgResponseTime = sum / this.responseTimes.length;
        }
    }

    getStatus() {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            metrics: this.metrics,
            isHealthy: this.state === 'CLOSED'
        };
    }

    forceOpen() {
        this.setState('OPEN');
    }

    forceClose() {
        this.setState('CLOSED');
    }

    reset() {
        this.setState('CLOSED');
        this.metrics = {
            totalRequests: 0,
            totalFailures: 0,
            totalSuccesses: 0,
            avgResponseTime: 0,
            stateChanges: []
        };
        this.responseTimes = [];
    }
}

module.exports = CircuitBreaker;
