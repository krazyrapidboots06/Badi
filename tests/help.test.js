const { validateStartup } = require('../modules/utils/envValidator');
const { getOverallHealth } = require('../modules/utils/healthCheck');

describe('Environment Validation', () => {
    test('should validate required environment variables', () => {
        const result = validateStartup();
        expect(result).toHaveProperty('environment');
        expect(result).toHaveProperty('config');
        expect(result).toHaveProperty('readyToStart');
    });
});

describe('Health Check', () => {
    test('should return health status', () => {
        const health = getOverallHealth();
        expect(health).toHaveProperty('status');
        expect(health).toHaveProperty('timestamp');
        expect(health).toHaveProperty('checks');
        expect(health.checks).toHaveProperty('fileSystem');
        expect(health.checks).toHaveProperty('dependencies');
        expect(health.checks).toHaveProperty('memory');
        expect(health.checks).toHaveProperty('uptime');
        expect(health.checks).toHaveProperty('performance');
    });
});

describe('Help Command', () => {
    test('should load help command successfully', () => {
        const helpCommand = require('../modules/commands/help');
        expect(helpCommand).toHaveProperty('config');
        expect(helpCommand).toHaveProperty('run');
        expect(helpCommand.config.name).toBe('help');
    });
});
