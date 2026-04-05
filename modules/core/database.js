const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;
const logger = require('../utils/structuredLogger');

async function connect() {
    if (!uri) return;
    try {
        await mongoose.connect(uri, { 
            maxPoolSize: 20,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferMaxEntries: 0,
            bufferCommands: false
        });
        logger.info('Database connected successfully');
    } catch (e) {
        logger.error('Database connection failed', { error: e.message });
        setTimeout(connect, 5000);
    }
}

connect();

mongoose.connection.on('disconnected', () => {
    logger.warn('Database disconnected, attempting reconnect...');
    setTimeout(connect, 5000);
});

mongoose.connection.on('error', (error) => {
    logger.error('Database connection error', { error: error.message });
});

const UserStatsSchema = new mongoose.Schema({
    userId: { type: String, unique: true, index: true },
    name: { type: String, default: "messenger user" },
    role: { type: String, default: "user" },
    count: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    lastSessionId: { type: String, default: null }
});

UserStatsSchema.index({ lastActive: 1 });
UserStatsSchema.index({ count: 1 });

const BanSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    reason: String,
    level: { type: Number, default: 1 },
    expiresAt: { type: Date, default: null }
});

BanSchema.index({ expiresAt: 1 });

const ReminderSchema = new mongoose.Schema({
    id: String,
    userId: String,
    message: String,
    fireAt: { type: Date, expires: 0 }
});

ReminderSchema.index({ fireAt: 1 });
ReminderSchema.index({ userId: 1 });

const Setting = mongoose.model('Setting', new mongoose.Schema({ key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed }));
const Ban = mongoose.model('Ban', BanSchema);
const Reminder = mongoose.model('Reminder', ReminderSchema);
const Stat = mongoose.model('Stat', new mongoose.Schema({ command: String, count: { type: Number, default: 0 } }));
const UserStat = mongoose.model('UserStat', UserStatsSchema);

const buffer = new Map();
const maxBuffer = 10000;

const flushBuffer = async () => {
    if (buffer.size === 0) return;
    
    const startTime = Date.now();
    const ops = Array.from(buffer).map(([userId, data]) => ({
        updateOne: {
            filter: { userId },
            update: { $inc: { count: data.count }, $set: { lastActive: new Date(), name: data.name } },
            upsert: true
        }
    }));
    buffer.clear();
    
    try {
        const result = await UserStat.bulkWrite(ops);
        const duration = Date.now() - startTime;
        logger.info('Database buffer flushed', { 
            operations: ops.length, 
            duration: `${duration}ms`,
            modified: result.modifiedCount
        });
    } catch (e) {
        logger.error('Database flush error', { error: e.message, operations: ops.length });
    }
};

setInterval(flushBuffer, 30000);

setInterval(async () => {
    const oneMonthAgo = new Date(Date.now() - 30 * 86400000);
    try {
        const result = await UserStat.deleteMany({ 
            lastActive: { $lt: oneMonthAgo },
            count: { $lt: 5 }
        });
        if (result.deletedCount > 0) {
            logger.info('Cleaned inactive user stats', { deleted: result.deletedCount });
        }
    } catch (error) {
        logger.error('User stats cleanup failed', { error: error.message });
    }
}, 86400000);

module.exports = {
    Ban,
    UserStat,
    Reminder,
    Stat,
    buffer,
    maxBuffer,
    flushBuffer,
    addBan: async (id, reason, level, durationMs) => {
        if (global.ADMINS.has(String(id))) return;
        const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
        try {
            await Ban.findOneAndUpdate({ userId: id }, { reason, level, expiresAt }, { upsert: true });
            logger.info('Ban added', { userId: id, reason, level });
        } catch (error) {
            logger.error('Failed to add ban', { userId: id, error: error.message });
        }
    },
    removeBan: async (id) => {
        try {
            await Ban.deleteOne({ userId: id });
            logger.info('Ban removed', { userId: id });
        } catch (error) {
            logger.error('Failed to remove ban', { userId: id, error: error.message });
        }
    },
    loadBansIntoMemory: async (cb) => {
        try {
            const now = new Date();
            const allBans = await Ban.find({});
            const activeBans = new Set();
            let expiredCount = 0;
            
            for (const b of allBans) {
                if (b.expiresAt && b.expiresAt < now) {
                    await Ban.deleteOne({ userId: b.userId });
                    expiredCount++;
                } else {
                    activeBans.add(b.userId);
                }
            }
            
            if (expiredCount > 0) {
                logger.info('Cleaned expired bans', { count: expiredCount });
            }
            
            cb(activeBans);
        } catch (e) {
            logger.error('Failed to load bans', { error: e.message });
            cb(new Set());
        }
    },
    addReminder: async (r) => {
        try {
            await Reminder.create(r);
            logger.debug('Reminder added', { id: r.id, userId: r.userId });
        } catch (error) {
            logger.error('Failed to add reminder', { error: error.message });
        }
    },
    deleteReminder: async (id) => {
        try {
            await Reminder.deleteOne({ id });
            logger.debug('Reminder deleted', { id });
        } catch (error) {
            logger.error('Failed to delete reminder', { id, error: error.message });
        }
    },
    getActiveReminders: async (cb) => {
        try {
            const reminders = await Reminder.find({ fireAt: { $gt: new Date() } });
            cb(reminders);
        } catch (e) {
            logger.error('Failed to load active reminders', { error: e.message });
            cb([]);
        }
    },
    syncUser: (userId, fb = null) => {
        if (buffer.size >= maxBuffer) {
            logger.warn('Database buffer overflow', { size: buffer.size, max: maxBuffer });
            flushBuffer();
        }
        
        const current = buffer.get(userId) || { count: 0, name: 'messenger user' };
        current.count++;
        if (fb?.name) current.name = fb.name;
        buffer.set(userId, current);
    },
    getRole: async (userId) => {
        if (global.ADMINS.has(String(userId))) return "admin";
        try {
            const user = await UserStat.findOne({ userId });
            return user?.role || "user";
        } catch (error) {
            logger.error('Failed to get user role', { userId, error: error.message });
            return "user";
        }
    },
    setRole: async (userId, role) => {
        try {
            await UserStat.updateOne({ userId }, { role }, { upsert: true });
            logger.info('User role updated', { userId, role });
        } catch (error) {
            logger.error('Failed to set user role', { userId, role, error: error.message });
        }
    },
    saveSetting: async (key, value) => {
        try {
            await Setting.findOneAndUpdate({ key }, { value }, { upsert: true });
            logger.debug('Setting saved', { key });
        } catch (error) {
            logger.error('Failed to save setting', { key, error: error.message });
        }
    },
    getSetting: async (key) => {
        try {
            const setting = await Setting.findOne({ key });
            return setting?.value;
        } catch (error) {
            logger.error('Failed to get setting', { key, error: error.message });
            return null;
        }
    },
    getAllUsers: async () => {
        try {
            return await UserStat.find({}).lean();
        } catch (error) {
            logger.error('Failed to get all users', { error: error.message });
            return [];
        }
    },
    trackCommandUsage: async (name) => {
        try {
            await Stat.updateOne({ command: name }, { $inc: { count: 1 } }, { upsert: true });
        } catch (error) {
            logger.error('Failed to track command usage', { command: name, error: error.message });
        }
    },
    getStats: async () => {
        try {
            return await Stat.find({}).sort({ count: -1 }).limit(10);
        } catch (error) {
            logger.error('Failed to get command stats', { error: error.message });
            return [];
        }
    },
    getDatabaseStats: async () => {
        try {
            const stats = await mongoose.connection.db.stats();
            return {
                collections: stats.collections,
                dataSize: stats.dataSize / 1024 / 1024,
                storageSize: stats.storageSize / 1024 / 1024,
                indexSize: stats.indexSize / 1024 / 1024,
                objects: stats.objects
            };
        } catch (error) {
            logger.error('Failed to get database stats', { error: error.message });
            return null;
        }
    }
};
