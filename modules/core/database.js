const mongoose = require('mongoose');
const uri = process.env.MONGODB_URI;

async function connect() {
    if (!uri) return;
    try {
        await mongoose.connect(uri, { maxPoolSize: 10 });
        console.log('Database connected');
    } catch (e) {
        console.error('Database connection failed:', e.message);
        setTimeout(connect, 5000);
    }
}

connect();

mongoose.connection.on('disconnected', () => {
    console.log('Database disconnected, attempting reconnect...');
    setTimeout(connect, 5000);
});

const UserStatsSchema = new mongoose.Schema({
    userId: { type: String, unique: true, index: true },
    name: { type: String, default: "messenger user" },
    role: { type: String, default: "user" },
    count: { type: Number, default: 0 },
    lastActive: { type: Date, default: Date.now },
    lastSessionId: { type: String, default: null }
});

const BanSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    reason: String,
    level: { type: Number, default: 1 },
    expiresAt: { type: Date, default: null }
});

const ReminderSchema = new mongoose.Schema({
    id: String,
    userId: String,
    message: String,
    fireAt: { type: Date, expires: 0 }
});

const Setting = mongoose.model('Setting', new mongoose.Schema({ key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed }));
const Ban = mongoose.model('Ban', BanSchema);
const Reminder = mongoose.model('Reminder', ReminderSchema);
const Stat = mongoose.model('Stat', new mongoose.Schema({ command: String, count: { type: Number, default: 0 } }));
const UserStat = mongoose.model('UserStat', UserStatsSchema);

setInterval(async () => {
    const oneMonthAgo = new Date(Date.now() - 30 * 86400000);
    await UserStat.deleteMany({ 
        lastActive: { $lt: oneMonthAgo }
    });
}, 86400000);

const buffer = new Map();

const flushBuffer = async () => {
    if (buffer.size === 0) return;
    const ops = Array.from(buffer).map(([userId, data]) => ({
        updateOne: {
            filter: { userId },
            update: { $inc: { count: data.count }, $set: { lastActive: new Date(), name: data.name } },
            upsert: true
        }
    }));
    buffer.clear();
    try { await UserStat.bulkWrite(ops); } catch (e) { console.error("DB Flush Error:", e.message); }
};

setInterval(flushBuffer, 30000);

module.exports = {
    Ban,
    UserStat,
    Reminder,
    flushBuffer,
    addBan: async (id, reason, level, durationMs) => {
        if (global.ADMINS.has(String(id))) return;
        const expiresAt = durationMs ? new Date(Date.now() + durationMs) : null;
        await Ban.findOneAndUpdate({ userId: id }, { reason, level, expiresAt }, { upsert: true });
    },
    removeBan: (id) => Ban.deleteOne({ userId: id }),
    loadBansIntoMemory: async (cb) => {
        try {
            const now = new Date();
            const allBans = await Ban.find({});
            const activeBans = new Set();
            for (const b of allBans) {
                if (b.expiresAt && b.expiresAt < now) {
                    await Ban.deleteOne({ userId: b.userId });
                } else {
                    activeBans.add(b.userId);
                }
            }
            cb(activeBans);
        } catch (e) { cb(new Set()); }
    },
    addReminder: (r) => Reminder.create(r),
    deleteReminder: (id) => Reminder.deleteOne({ id }),
    getActiveReminders: async (cb) => {
        try { cb(await Reminder.find({ fireAt: { $gt: new Date() } })); } 
        catch (e) { 
            console.error('Failed to load active reminders:', e.message);
            cb([]);
        }
    },
    syncUser: (userId, fb = null) => {
        const current = buffer.get(userId) || { count: 0, name: 'messenger user' };
        current.count++;
        if (fb?.name) current.name = fb.name;
        buffer.set(userId, current);
    },
    getRole: async (userId) => {
        if (global.ADMINS.has(String(userId))) return "admin";
        const user = await UserStat.findOne({ userId });
        return user?.role || "user";
    },
    setRole: (userId, role) => UserStat.updateOne({ userId }, { role }, { upsert: true }),
    saveSetting: (key, value) => Setting.findOneAndUpdate({ key }, { value }, { upsert: true }),
    getSetting: async (key) => (await Setting.findOne({ key }))?.value,
    getAllUsers: () => UserStat.find({}).lean(),
    trackCommandUsage: (name) => Stat.updateOne({ command: name }, { $inc: { count: 1 } }, { upsert: true }).exec(),
    getStats: () => Stat.find({}).sort({ count: -1 }).limit(10)
};
