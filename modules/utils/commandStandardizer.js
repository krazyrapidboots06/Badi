const fs = require('fs');
const path = require('path');
const CommandValidator = require('./commandValidator');
const logger = require('./structuredLogger');

class CommandStandardizer {
    constructor() {
        this.validator = new CommandValidator();
        this.standardizedCount = 0;
        this.errorCount = 0;
        this.warnings = [];
    }

    async standardizeAllCommands(commandsDir) {
        logger.info('Starting command standardization');
        
        const commands = this.loadAllCommands(commandsDir);
        const results = {
            standardized: [],
            errors: [],
            warnings: [],
            summary: {
                total: commands.length,
                standardized: 0,
                errors: 0,
                warnings: 0
            }
        };

        for (const command of commands) {
            try {
                const result = await this.standardizeCommand(command);
                
                if (result.success) {
                    results.standardized.push(result);
                    results.summary.standardized++;
                } else {
                    results.errors.push(result);
                    results.summary.errors++;
                }
                
                if (result.warnings && result.warnings.length > 0) {
                    results.warnings.push(...result.warnings);
                    results.summary.warnings += result.warnings.length;
                }
                
            } catch (error) {
                results.errors.push({
                    command: command.config?.name || 'unknown',
                    error: error.message
                });
                results.summary.errors++;
            }
        }

        logger.info('Command standardization completed', results.summary);
        return results;
    }

    loadAllCommands(commandsDir) {
        const commands = [];
        
        function scanDirectory(dir) {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    scanDirectory(fullPath);
                } else if (item.endsWith('.js')) {
                    try {
                        const command = require(fullPath);
                        command.filePath = fullPath;
                        commands.push(command);
                    } catch (error) {
                        logger.warn('Failed to load command file', { file: fullPath, error: error.message });
                    }
                }
            }
        }
        
        scanDirectory(commandsDir);
        return commands;
    }

    async standardizeCommand(command) {
        const result = {
            command: command.config?.name || 'unknown',
            success: false,
            changes: [],
            warnings: [],
            filePath: command.filePath
        };

        try {
            if (!command.config) {
                result.error = 'Missing config object';
                return result;
            }

            const originalConfig = JSON.parse(JSON.stringify(command.config));
            
            this.standardizeConfig(command.config, result);
            this.standardizeRunFunction(command, result);
            this.addMissingFields(command.config, result);
            
            if (command.run) {
                this.standardizeRunCode(command.run, result);
            }

            const validation = this.validator.validateCommand(command, command.filePath);
            
            if (!validation.isValid) {
                result.error = 'Validation failed';
                result.errors = validation.errors;
                return result;
            }

            if (validation.warnings.length > 0) {
                result.warnings.push(...validation.warnings);
            }

            if (result.changes.length > 0) {
                await this.saveStandardizedCommand(command, result);
            }

            result.success = true;
            this.standardizedCount++;
            
        } catch (error) {
            result.error = error.message;
            this.errorCount++;
        }

        return result;
    }

    standardizeConfig(config, result) {
        if (config.name && config.name !== config.name.toLowerCase()) {
            const oldName = config.name;
            config.name = config.name.toLowerCase();
            result.changes.push(`Converted name from "${oldName}" to "${config.name}"`);
        }

        if (config.description && config.description.endsWith('.')) {
            config.description = config.description.slice(0, -1);
            result.changes.push('Removed trailing period from description');
        }

        if (config.description && config.description.length > 100) {
            const original = config.description;
            config.description = config.description.substring(0, 97) + '...';
            result.changes.push('Shortened description to under 100 characters');
        }

        if (config.aliases && Array.isArray(config.aliases)) {
            const originalAliases = [...config.aliases];
            config.aliases = config.aliases
                .filter(alias => alias !== config.name)
                .map(alias => alias.toLowerCase());
            
            if (originalAliases.length !== config.aliases.length) {
                result.changes.push('Standardized aliases (removed duplicates, converted to lowercase)');
            }
        }

        if (config.cooldown === undefined) {
            config.cooldown = 2;
            result.changes.push('Added default cooldown (2s)');
        } else if (typeof config.cooldown !== 'number' || config.cooldown < 0) {
            config.cooldown = Math.max(0, parseInt(config.cooldown) || 2);
            result.changes.push('Fixed invalid cooldown value');
        }

        if (config.adminOnly === undefined) {
            config.adminOnly = false;
            result.changes.push('Added default adminOnly (false)');
        } else if (typeof config.adminOnly !== 'boolean') {
            config.adminOnly = config.adminOnly === true || config.adminOnly === 'true';
            result.changes.push('Fixed adminOnly type to boolean');
        }

        if (config.usePrefix === undefined) {
            config.usePrefix = false;
            result.changes.push('Added default usePrefix (false)');
        } else if (typeof config.usePrefix !== 'boolean') {
            config.usePrefix = config.usePrefix === true || config.usePrefix === 'true';
            result.changes.push('Fixed usePrefix type to boolean');
        }

        if (config.version === undefined) {
            config.version = '1.0';
            result.changes.push('Added default version (1.0)');
        } else if (!/^\d+\.\d+(\.\d+)?$/.test(config.version)) {
            config.version = '1.0';
            result.changes.push('Fixed invalid version format');
        }

        if (!config.usage) {
            config.usage = config.name;
            result.changes.push('Added default usage');
        }
    }

    standardizeRunFunction(command, result) {
        if (!command.run) {
            result.error = 'Missing run function';
            return;
        }

        if (typeof command.run !== 'function') {
            result.error = 'run is not a function';
            return;
        }
    }

    addMissingFields(config, result) {
        const requiredFields = ['name', 'author', 'category', 'description'];
        
        requiredFields.forEach(field => {
            if (!config[field]) {
                switch (field) {
                    case 'author':
                        config.author = 'sethdico';
                        result.changes.push('Added missing author field');
                        break;
                    case 'category':
                        config.category = 'Utility';
                        result.changes.push('Added missing category field');
                        break;
                    case 'description':
                        config.description = `no description provided for ${config.name} command`;
                        result.changes.push('Added missing description field');
                        break;
                }
            }
        });
    }

    standardizeRunCode(runFunction, result) {
        const funcStr = runFunction.toString();
        let modified = false;
        let newFuncStr = funcStr;

        if (!newFuncStr.includes('async')) {
            newFuncStr = newFuncStr.replace('function', 'async function');
            modified = true;
            result.changes.push('Made run function async');
        }

        if (!newFuncStr.includes('try') && !newFuncStr.includes('catch')) {
            const bodyStart = newFuncStr.indexOf('{') + 1;
            const bodyEnd = newFuncStr.lastIndexOf('}');
            const body = newFuncStr.substring(bodyStart, bodyEnd);
            
            const wrappedBody = `try {${body}} catch (error) {\n    logger.error('Command error', { command: '${result.command}', error: error.message });\n    reply('an error occurred while processing this command');\n}`;
            
            newFuncStr = newFuncStr.substring(0, bodyStart) + wrappedBody + newFuncStr.substring(bodyEnd);
            modified = true;
            result.changes.push('Added error handling to run function');
        }

        if (newFuncStr.includes('console.log') || newFuncStr.includes('console.error')) {
            newFuncStr = newFuncStr.replace(/console\.log/g, 'logger.info');
            newFuncStr = newFuncStr.replace(/console\.error/g, 'logger.error');
            modified = true;
            result.changes.push('Replaced console.log with logger');
        }

        if (newFuncStr.includes('//')) {
            newFuncStr = newFuncStr.replace(/\/\/.*$/gm, '');
            modified = true;
            result.changes.push('Removed inline comments');
        }

        if (modified) {
            try {
                const newFunction = eval(`(${newFuncStr})`);
                runFunction.toString = () => newFuncStr;
                Object.defineProperty(runFunction, 'toString', { value: () => newFuncStr });
            } catch (error) {
                result.warnings.push('Failed to apply code standardization: ' + error.message);
            }
        }
    }

    async saveStandardizedCommand(command, result) {
        try {
            const fileContent = this.generateCommandFile(command);
            fs.writeFileSync(command.filePath, fileContent, 'utf8');
            result.changes.push('Saved standardized command to file');
        } catch (error) {
            result.warnings.push('Failed to save standardized command: ' + error.message);
        }
    }

    generateCommandFile(command) {
        let content = '';
        
        if (command.run.toString().includes('require(')) {
            const requires = this.extractRequires(command.run.toString());
            content += requires.join('\n') + '\n\n';
        }

        content += 'module.exports.config = ' + JSON.stringify(command.config, null, 4) + ';\n\n';
        content += 'module.exports.run = ' + command.run.toString() + ';\n';
        
        return content;
    }

    extractRequires(funcStr) {
        const requires = [];
        const requireRegex = /const\s+(\w+)\s*=\s*require\(['"`]([^'"`]+)['"`]\)/g;
        let match;
        
        while ((match = requireRegex.exec(funcStr)) !== null) {
            requires.push(match[0]);
        }
        
        return requires;
    }

    generateReport(results) {
        let report = `📋 **command standardization report**\n━━━━━━━━━━━━━━━━\n\n`;
        
        report += `📊 **summary**\n`;
        report += `  total commands: ${results.summary.total}\n`;
        report += `  ✅ standardized: ${results.summary.standardized}\n`;
        report += `  ❌ errors: ${results.summary.errors}\n`;
        report += `  ⚠️ warnings: ${results.summary.warnings}\n\n`;

        if (results.standardized.length > 0) {
            report += `✅ **standardized commands**\n`;
            results.standardized.forEach(({ command, changes }) => {
                report += `\n🔹 **${command}** (${changes.length} changes)\n`;
                changes.slice(0, 3).forEach(change => {
                    report += `  ✅ ${change}\n`;
                });
                if (changes.length > 3) {
                    report += `  ... and ${changes.length - 3} more\n`;
                }
            });
            report += '\n';
        }

        if (results.errors.length > 0) {
            report += `❌ **errors**\n`;
            results.errors.forEach(({ command, error }) => {
                report += `\n🔹 **${command}**\n  ❌ ${error}\n`;
            });
            report += '\n';
        }

        if (results.warnings.length > 0) {
            report += `⚠️ **warnings**\n`;
            results.warnings.slice(0, 10).forEach(warning => {
                report += `  ⚠️ ${warning}\n`;
            });
            if (results.warnings.length > 10) {
                report += `  ... and ${results.warnings.length - 10} more\n`;
            }
        }

        return report.toLowerCase();
    }
}

module.exports = CommandStandardizer;
