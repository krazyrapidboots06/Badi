const fs = require('fs');
const path = require('path');

const requiredEnvVars = [
    'PAGE_ACCESS_TOKEN',
    'VERIFY_TOKEN',
    'ADMIN_ID'
];

const optionalEnvVars = [
    'MONGODB_URI',
    'OPENAI_API_KEY',
    'NODE_ENV',
    'LOG_LEVEL',
    'PORT'
];

function validateEnvironment() {
    const errors = [];
    const warnings = [];
    
    requiredEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
            errors.push(`Missing required environment variable: ${envVar}`);
        }
    });
    
    optionalEnvVars.forEach(envVar => {
        if (!process.env[envVar]) {
            warnings.push(`Missing optional environment variable: ${envVar}`);
        }
    });
    
    if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
        errors.push('MongoDB URI is required in production environment');
    }
    
    if (process.env.PORT && isNaN(process.env.PORT)) {
        errors.push('PORT must be a valid number');
    }
    
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (process.env.LOG_LEVEL && !validLogLevels.includes(process.env.LOG_LEVEL)) {
        warnings.push(`Invalid LOG_LEVEL: ${process.env.LOG_LEVEL}. Valid options: ${validLogLevels.join(', ')}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

function checkConfigFiles() {
    const requiredFiles = [
        'config/config.json',
        'package.json'
    ];
    
    const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
    
    return {
        allFilesExist: missingFiles.length === 0,
        missingFiles
    };
}

function createDirectories() {
    const directories = [
        'logs',
        'cache',
        'temp'
    ];
    
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

function validateStartup() {
    const envValidation = validateEnvironment();
    const configValidation = checkConfigFiles();
    
    createDirectories();
    
    return {
        environment: envValidation,
        config: configValidation,
        readyToStart: envValidation.isValid && configValidation.allFilesExist
    };
}

module.exports = {
    validateEnvironment,
    checkConfigFiles,
    createDirectories,
    validateStartup
};
