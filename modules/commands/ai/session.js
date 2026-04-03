module.exports = {
    getSession: (userId) => {
        return global.sessions.get(userId) || { chatSessionId: null };
    },
    saveSession: (userId, sessionId) => {
        global.sessions.set(userId, { chatSessionId: sessionId });
    }
};
