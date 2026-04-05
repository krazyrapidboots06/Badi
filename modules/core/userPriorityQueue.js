class UserPriorityQueue {
    constructor(options = {}) {
        this.maxQueuePerUser = options.maxQueuePerUser || 3;
        this.adminPriority = options.adminPriority !== false;
        this.maxQueueSize = options.maxQueueSize || 10000;
        
        this.queues = new Map();
        this.priorityQueues = {
            admin: [],
            premium: [],
            regular: []
        };
        
        this.metrics = {
            totalQueued: 0,
            totalProcessed: 0,
            adminProcessed: 0,
            premiumProcessed: 0,
            regularProcessed: 0,
            averageQueueTime: 0
        };
        
        this.queueTimes = [];
        this.maxQueueTimeHistory = 100;
    }

    enqueue(userId, message, handler, priority = 'regular') {
        const timestamp = Date.now();
        
        if (!this.queues.has(userId)) {
            this.queues.set(userId, []);
        }

        const userQueue = this.queues.get(userId);
        
        if (userQueue.length >= this.maxQueuePerUser) {
            return null;
        }

        const queuedItem = {
            userId,
            message,
            handler,
            priority,
            timestamp,
            queuedAt: Date.now()
        };

        userQueue.push(queuedItem);
        
        const targetQueue = this.getPriorityQueue(userId, priority);
        targetQueue.push(queuedItem);
        
        this.metrics.totalQueued++;
        
        return new Promise((resolve, reject) => {
            queuedItem.resolve = resolve;
            queuedItem.reject = reject;
        });
    }

    getPriorityQueue(userId, priority) {
        if (this.adminPriority && global.ADMINS.has(userId)) {
            return this.priorityQueues.admin;
        }
        
        return this.priorityQueues[priority] || this.priorityQueues.regular;
    }

    dequeue() {
        const priorities = ['admin', 'premium', 'regular'];
        
        for (const priority of priorities) {
            const queue = this.priorityQueues[priority];
            if (queue.length > 0) {
                const item = queue.shift();
                const userQueue = this.queues.get(item.userId);
                
                if (userQueue) {
                    const index = userQueue.indexOf(item);
                    if (index > -1) {
                        userQueue.splice(index, 1);
                    }
                    
                    if (userQueue.length === 0) {
                        this.queues.delete(item.userId);
                    }
                }

                this.updateMetrics(item);
                return item;
            }
        }

        return null;
    }

    updateMetrics(item) {
        const queueTime = Date.now() - item.queuedAt;
        this.queueTimes.push(queueTime);
        
        if (this.queueTimes.length > this.maxQueueTimeHistory) {
            this.queueTimes.shift();
        }

        this.metrics.totalProcessed++;
        
        if (this.adminPriority && global.ADMINS.has(item.userId)) {
            this.metrics.adminProcessed++;
        } else {
            this.metrics[item.priority + 'Processed']++;
        }

        if (this.queueTimes.length > 0) {
            const sum = this.queueTimes.reduce((a, b) => a + b, 0);
            this.metrics.averageQueueTime = sum / this.queueTimes.length;
        }
    }

    getUserQueueLength(userId) {
        const userQueue = this.queues.get(userId);
        return userQueue ? userQueue.length : 0;
    }

    getQueueStatus() {
        return {
            totalQueued: this.metrics.totalQueued,
            totalProcessed: this.metrics.totalProcessed,
            queueSizes: {
                admin: this.priorityQueues.admin.length,
                premium: this.priorityQueues.premium.length,
                regular: this.priorityQueues.regular.length
            },
            userQueues: Array.from(this.queues.entries()).map(([userId, queue]) => ({
                userId,
                length: queue.length,
                isAdmin: global.ADMINS.has(userId)
            })),
            metrics: this.metrics,
            isHealthy: this.getTotalQueueSize() < this.maxQueueSize * 0.8
        };
    }

    getTotalQueueSize() {
        return this.priorityQueues.admin.length + 
               this.priorityQueues.premium.length + 
               this.priorityQueues.regular.length;
    }

    clearUserQueue(userId) {
        const userQueue = this.queues.get(userId);
        if (!userQueue) return 0;

        const clearedCount = userQueue.length;
        
        userQueue.forEach(item => {
            const priorityQueue = this.getPriorityQueue(userId, item.priority);
            const index = priorityQueue.indexOf(item);
            if (index > -1) {
                priorityQueue.splice(index, 1);
            }
            
            if (item.reject) {
                item.reject(new Error('Queue cleared'));
            }
        });

        this.queues.delete(userId);
        return clearedCount;
    }

    clearAllQueues() {
        let totalCleared = 0;
        
        for (const userId of this.queues.keys()) {
            totalCleared += this.clearUserQueue(userId);
        }

        return totalCleared;
    }

    getEstimatedWaitTime(userId, priority = 'regular') {
        const userQueue = this.queues.get(userId);
        if (!userQueue) return 0;

        const positionInUserQueue = userQueue.length;
        const priorityQueue = this.getPriorityQueue(userId, priority);
        const positionInPriorityQueue = priorityQueue.findIndex(item => item.userId === userId);
        
        if (positionInPriorityQueue === -1) return 0;

        const avgProcessingTime = this.metrics.averageQueueTime || 1000;
        return positionInPriorityQueue * avgProcessingTime;
    }
}

module.exports = UserPriorityQueue;
