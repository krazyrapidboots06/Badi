const logger = require('./structuredLogger');

class CommandValidator {
    constructor() {
        this.requiredFields = ['name', 'author', 'category', 'description'];
        this.optionalFields = ['version', 'adminOnly', 'usePrefix', 'cooldown', 'aliases', 'usage'];
        this.validCategories = [
            'Utility', 'Admin', 'Media', 'AI', 'Entertainment', 'Tools', 
            'Games', 'Education', 'Social', 'Development', 'System'
        ];
        
        this.validationErrors = [];
        this.warnings = [];
    }

    validateCommand(command, filePath) {
        this.validationErrors = [];
        this.warnings = [];
        
        const config = command.config;
        const run = command.run;
        
        this.validateConfig(config, filePath);
        this.validateRunFunction(run, filePath);
        this.validateConsistency(config, filePath);
        
        const isValid = this.validationErrors.length === 0;
        
        if (!isValid) {
            logger.error('Command validation failed', {
                command: config?.name || 'unknown',
                file: filePath,
                errors: this.validationErrors
            });
        }
        
        if (this.warnings.length > 0) {
            logger.warn('Command validation warnings', {
                command: config?.name || 'unknown',
                file: filePath,
                warnings: this.warnings
            });
        }
        
        return {
            isValid,
            errors: this.validationErrors,
            warnings: this.warnings
        };
    }

    validateConfig(config, filePath) {
        if (!config) {
            this.validationErrors.push('Missing config object');
            return;
        }

        this.requiredFields.forEach(field => {
            if (!config[field]) {
                this.validationErrors.push(`Missing required field: ${field}`);
            }
        });

        if (config.name && typeof config.name !== 'string') {
            this.validationErrors.push('Name must be a string');
        }

        if (config.name && !/^[a-z0-9_-]+$/i.test(config.name)) {
            this.validationErrors.push('Name contains invalid characters (only letters, numbers, underscore, hyphen allowed)');
        }

        if (config.category && !this.validCategories.includes(config.category)) {
            this.warnings.push(`Unknown category: ${config.category}. Valid categories: ${this.validCategories.join(', ')}`);
        }

        if (config.cooldown !== undefined && (typeof config.cooldown !== 'number' || config.cooldown < 0)) {
            this.validationErrors.push('Cooldown must be a non-negative number');
        }

        if (config.adminOnly !== undefined && typeof config.adminOnly !== 'boolean') {
            this.validationErrors.push('adminOnly must be a boolean');
        }

        if (config.usePrefix !== undefined && typeof config.usePrefix !== 'boolean') {
            this.validationErrors.push('usePrefix must be a boolean');
        }

        if (config.aliases && !Array.isArray(config.aliases)) {
            this.validationErrors.push('aliases must be an array');
        }

        if (config.aliases && Array.isArray(config.aliases)) {
            config.aliases.forEach((alias, index) => {
                if (typeof alias !== 'string') {
                    this.validationErrors.push(`Alias at index ${index} must be a string`);
                }
            });
        }

        if (config.version && !/^\d+\.\d+(\.\d+)?$/.test(config.version)) {
            this.warnings.push('Version should follow semantic versioning (x.y.z)');
        }
    }

    validateRunFunction(run, filePath) {
        if (typeof run !== 'function') {
            this.validationErrors.push('run must be a function');
            return;
        }

        const funcStr = run.toString();
        
        if (!funcStr.includes('async')) {
            this.warnings.push('run function should be async');
        }

        if (!funcStr.includes('try') && !funcStr.includes('catch')) {
            this.warnings.push('run function should have error handling (try/catch)');
        }

        if (funcStr.includes('console.log') || funcStr.includes('console.error')) {
            this.warnings.push('Use logger instead of console.log/console.error');
        }

        if (funcStr.includes('//')) {
            this.warnings.push('Remove inline comments from run function');
        }

        if (funcStr.includes('/*') || funcStr.includes('*/')) {
            this.warnings.push('Remove block comments from run function');
        }
    }

    validateConsistency(config, filePath) {
        if (config.cooldown === 0 && !config.adminOnly) {
            this.warnings.push('Zero cooldown for non-admin command may cause spam');
        }

        if (config.adminOnly && config.cooldown > 10) {
            this.warnings.push('High cooldown for admin-only command may be unnecessary');
        }

        if (config.name && config.name !== config.name.toLowerCase()) {
            this.validationErrors.push('Command name should be lowercase');
        }

        if (config.aliases && config.aliases.includes(config.name)) {
            this.validationErrors.push('Aliases should not include the command name itself');
        }

        if (config.description && config.description.length > 100) {
            this.warnings.push('Description should be concise (under 100 characters)');
        }

        if (config.description && config.description.includes('.')) {
            this.warnings.push('Description should not end with a period');
        }
    }

    validateAllCommands(commands) {
        const results = {
            valid: [],
            invalid: [],
            warnings: [],
            summary: {
                total: commands.length,
                valid: 0,
                invalid: 0,
                withWarnings: 0
            }
        };

        commands.forEach(command => {
            const validation = this.validateCommand(command, command.filePath);
            
            if (validation.isValid) {
                results.valid.push(command);
                results.summary.valid++;
            } else {
                results.invalid.push({
                    command,
                    errors: validation.errors
                });
                results.summary.invalid++;
            }

            if (validation.warnings.length > 0) {
                results.warnings.push({
                    command,
                    warnings: validation.warnings
                });
                results.summary.withWarnings++;
            }
        });

        return results;
    }

    generateReport(results) {
        let report = `📊 **command validation report**\n━━━━━━━━━━━━━━━━\n\n`;
        
        report += `📈 **summary**\n`;
        report += `  total commands: ${results.summary.total}\n`;
        report += `  ✅ valid: ${results.summary.valid}\n`;
        report += `  ❌ invalid: ${results.summary.invalid}\n`;
        report += `  ⚠️ with warnings: ${results.summary.withWarnings}\n\n`;

        if (results.invalid.length > 0) {
            report += `❌ **invalid commands**\n`;
            results.invalid.forEach(({ command, errors }) => {
                report += `\n🔹 **${command.config?.name || 'unknown'}**\n`;
                errors.forEach(error => {
                    report += `  ❌ ${error}\n`;
                });
            });
            report += '\n';
        }

        if (results.warnings.length > 0) {
            report += `⚠️ **commands with warnings**\n`;
            results.warnings.forEach(({ command, warnings }) => {
                report += `\n🔹 **${command.config?.name || 'unknown'}**\n`;
                warnings.forEach(warning => {
                    report += `  ⚠️ ${warning}\n`;
                });
            });
        }

        return report.toLowerCase();
    }

    fixCommonIssues(command) {
        const config = command.config;
        const fixes = [];

        if (config.name && config.name !== config.name.toLowerCase()) {
            config.name = config.name.toLowerCase();
            fixes.push('Converted name to lowercase');
        }

        if (config.description && config.description.endsWith('.')) {
            config.description = config.description.slice(0, -1);
            fixes.push('Removed trailing period from description');
        }

        if (config.cooldown === undefined) {
            config.cooldown = 2;
            fixes.push('Added default cooldown (2s)');
        }

        if (config.adminOnly === undefined) {
            config.adminOnly = false;
            fixes.push('Added default adminOnly (false)');
        }

        if (config.usePrefix === undefined) {
            config.usePrefix = false;
            fixes.push('Added default usePrefix (false)');
        }

        if (config.version === undefined) {
            config.version = '1.0';
            fixes.push('Added default version (1.0)');
        }

        if (config.aliases && config.aliases.includes(config.name)) {
            config.aliases = config.aliases.filter(alias => alias !== config.name);
            fixes.push('Removed command name from aliases');
        }

        return fixes;
    }
}

module.exports = CommandValidator;
