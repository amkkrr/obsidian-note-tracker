/**
 * Configuration validation utility
 * Provides comprehensive validation for plugin configuration objects
 */

import {
    PluginConfig,
    ValidationResult,
    ConfigError,
    ConfigErrorCode,
    CONFIG_VALIDATION_RULES
} from '../interfaces/data-types';

/**
 * Validates plugin configuration objects against predefined rules
 * Provides detailed error messages and warnings for configuration issues
 */
export class ConfigValidator {
    private logger?: Console;

    constructor(logger?: Console) {
        this.logger = logger;
    }

    /**
     * Validates a complete configuration object
     * @param config - Configuration object to validate
     * @returns Validation result with detailed error and warning information
     */
    public validateConfig(config: PluginConfig): ValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Validate required fields
            this.validateRequiredFields(config, errors);

            // Validate individual fields
            this.validateCounterKey(config.counterKey, errors, warnings);
            this.validatePaths(config.includedPaths, 'includedPaths', errors, warnings);
            this.validatePaths(config.excludedPaths, 'excludedPaths', errors, warnings);
            this.validateBoolean(config.recursive, 'recursive', errors);
            this.validateNumericRange(config.minInterval, 'minInterval', errors, warnings);
            this.validateNumericRange(config.batchSize, 'batchSize', errors, warnings);
            this.validateNumericRange(config.maxCacheSize, 'maxCacheSize', errors, warnings);
            this.validateBoolean(config.enabled, 'enabled', errors);
            this.validateBoolean(config.debugMode, 'debugMode', errors);
            this.validateNumericRange(config.autoFlushInterval, 'autoFlushInterval', errors, warnings);
            this.validateVersion(config.version, errors);
            this.validateTheme(config.theme, errors);
            this.validateLanguage(config.language, errors);

            // Validate performance settings
            if (config.performance) {
                this.validatePerformanceSettings(config.performance, errors, warnings);
            }

            // Cross-field validation
            this.validateCrossFieldConstraints(config, errors, warnings);

            const result: ValidationResult = {
                isValid: errors.length === 0,
                errors,
                warnings
            };

            if (this.logger && !result.isValid) {
                this.logger.warn('Configuration validation failed:', { errors, warnings });
            }

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                isValid: false,
                errors: [`Validation error: ${errorMessage}`],
                warnings: []
            };
        }
    }

    /**
     * Validates that all required fields are present
     * @param config - Configuration object to validate
     * @param errors - Array to collect validation errors
     */
    private validateRequiredFields(config: any, errors: string[]): void {
        const requiredFields = Object.keys(CONFIG_VALIDATION_RULES);
        
        for (const field of requiredFields) {
            if (!(field in config)) {
                errors.push(`Missing required field: ${field}`);
            }
        }
    }

    /**
     * Validates the counter key field
     * @param counterKey - Counter key to validate
     * @param errors - Array to collect validation errors
     * @param warnings - Array to collect validation warnings
     */
    private validateCounterKey(counterKey: any, errors: string[], warnings: string[]): void {
        const rule = CONFIG_VALIDATION_RULES.counterKey;

        if (typeof counterKey !== 'string') {
            errors.push('counterKey must be a string');
            return;
        }

        if (counterKey.length < rule.minLength) {
            errors.push(`counterKey must be at least ${rule.minLength} characters long`);
        }

        if (counterKey.length > rule.maxLength) {
            errors.push(`counterKey must be no more than ${rule.maxLength} characters long`);
        }

        if (!rule.pattern.test(counterKey)) {
            errors.push('counterKey must start with a letter or underscore and contain only letters, numbers, and underscores');
        }

        // Additional warnings for best practices
        if (counterKey.includes('__')) {
            warnings.push('counterKey contains double underscores which might cause issues');
        }

        if (counterKey.toLowerCase() !== counterKey && counterKey.toUpperCase() !== counterKey) {
            warnings.push('counterKey uses mixed case which might cause confusion');
        }
    }

    /**
     * Validates path arrays
     * @param paths - Array of paths to validate
     * @param fieldName - Name of the field being validated
     * @param errors - Array to collect validation errors
     * @param warnings - Array to collect validation warnings
     */
    private validatePaths(paths: any, fieldName: string, errors: string[], warnings: string[]): void {
        if (!Array.isArray(paths)) {
            errors.push(`${fieldName} must be an array`);
            return;
        }

        const rule = CONFIG_VALIDATION_RULES[fieldName as keyof typeof CONFIG_VALIDATION_RULES];
        if (paths.length > rule.maxItems) {
            errors.push(`${fieldName} can contain at most ${rule.maxItems} items`);
        }

        for (let i = 0; i < paths.length; i++) {
            const path = paths[i];
            if (typeof path !== 'string') {
                errors.push(`${fieldName}[${i}] must be a string`);
                continue;
            }

            if (path.trim() === '') {
                errors.push(`${fieldName}[${i}] cannot be empty`);
                continue;
            }

            // Check for invalid characters
            if (/[<>:"|?*]/.test(path)) {
                errors.push(`${fieldName}[${i}] contains invalid characters`);
            }

            // Check for duplicate paths
            const duplicateIndex = paths.indexOf(path, i + 1);
            if (duplicateIndex !== -1) {
                warnings.push(`${fieldName} contains duplicate path: ${path}`);
            }

            // Check for path format
            if (path.startsWith('/') || path.startsWith('\\')) {
                warnings.push(`${fieldName}[${i}] starts with separator which might cause issues`);
            }
        }
    }

    /**
     * Validates boolean fields
     * @param value - Value to validate
     * @param fieldName - Name of the field being validated
     * @param errors - Array to collect validation errors
     */
    private validateBoolean(value: any, fieldName: string, errors: string[]): void {
        if (typeof value !== 'boolean') {
            errors.push(`${fieldName} must be a boolean`);
        }
    }

    /**
     * Validates numeric fields with range constraints
     * @param value - Value to validate
     * @param fieldName - Name of the field being validated
     * @param errors - Array to collect validation errors
     * @param warnings - Array to collect validation warnings
     */
    private validateNumericRange(value: any, fieldName: string, errors: string[], warnings: string[]): void {
        const rule = CONFIG_VALIDATION_RULES[fieldName as keyof typeof CONFIG_VALIDATION_RULES];

        if (typeof value !== 'number') {
            errors.push(`${fieldName} must be a number`);
            return;
        }

        if (isNaN(value) || !isFinite(value)) {
            errors.push(`${fieldName} must be a valid number`);
            return;
        }

        if (value < rule.minimum) {
            errors.push(`${fieldName} must be at least ${rule.minimum}`);
        }

        if (value > rule.maximum) {
            errors.push(`${fieldName} must be no more than ${rule.maximum}`);
        }

        // Performance warnings
        if (fieldName === 'minInterval' && value < 100) {
            warnings.push('minInterval below 100ms may cause performance issues');
        }

        if (fieldName === 'batchSize' && value > 100) {
            warnings.push('batchSize above 100 may cause memory issues');
        }

        if (fieldName === 'maxCacheSize' && value > 5000) {
            warnings.push('maxCacheSize above 5000 may cause memory issues');
        }
    }

    /**
     * Validates version string format
     * @param version - Version string to validate
     * @param errors - Array to collect validation errors
     */
    private validateVersion(version: any, errors: string[]): void {
        const rule = CONFIG_VALIDATION_RULES.version;

        if (typeof version !== 'string') {
            errors.push('version must be a string');
            return;
        }

        if (!rule.pattern.test(version)) {
            errors.push('version must follow semantic versioning format (e.g., 1.0.0)');
        }
    }

    /**
     * Validates theme setting
     * @param theme - Theme value to validate
     * @param errors - Array to collect validation errors
     */
    private validateTheme(theme: any, errors: string[]): void {
        const rule = CONFIG_VALIDATION_RULES.theme;

        if (typeof theme !== 'string') {
            errors.push('theme must be a string');
            return;
        }

        if (!rule.enum.includes(theme)) {
            errors.push(`theme must be one of: ${rule.enum.join(', ')}`);
        }
    }

    /**
     * Validates language setting
     * @param language - Language value to validate
     * @param errors - Array to collect validation errors
     */
    private validateLanguage(language: any, errors: string[]): void {
        const rule = CONFIG_VALIDATION_RULES.language;

        if (typeof language !== 'string') {
            errors.push('language must be a string');
            return;
        }

        if (!rule.enum.includes(language)) {
            errors.push(`language must be one of: ${rule.enum.join(', ')}`);
        }
    }

    /**
     * Validates performance settings
     * @param performance - Performance settings object
     * @param errors - Array to collect validation errors
     * @param warnings - Array to collect validation warnings
     */
    private validatePerformanceSettings(performance: any, errors: string[], warnings: string[]): void {
        if (typeof performance !== 'object' || performance === null) {
            errors.push('performance must be an object');
            return;
        }

        // Validate maxConcurrentOps
        if (typeof performance.maxConcurrentOps !== 'number') {
            errors.push('performance.maxConcurrentOps must be a number');
        } else if (performance.maxConcurrentOps < 1) {
            errors.push('performance.maxConcurrentOps must be at least 1');
        } else if (performance.maxConcurrentOps > 20) {
            errors.push('performance.maxConcurrentOps must be no more than 20');
        } else if (performance.maxConcurrentOps > 10) {
            warnings.push('performance.maxConcurrentOps above 10 may cause performance issues');
        }

        // Validate cacheCleanupInterval
        if (typeof performance.cacheCleanupInterval !== 'number') {
            errors.push('performance.cacheCleanupInterval must be a number');
        } else if (performance.cacheCleanupInterval < 1000) {
            errors.push('performance.cacheCleanupInterval must be at least 1000ms');
        } else if (performance.cacheCleanupInterval > 3600000) {
            errors.push('performance.cacheCleanupInterval must be no more than 3600000ms (1 hour)');
        } else if (performance.cacheCleanupInterval < 10000) {
            warnings.push('performance.cacheCleanupInterval below 10 seconds may cause performance issues');
        }

        // Validate enableBackgroundProcessing
        if (typeof performance.enableBackgroundProcessing !== 'boolean') {
            errors.push('performance.enableBackgroundProcessing must be a boolean');
        }
    }

    /**
     * Validates cross-field constraints and logical consistency
     * @param config - Configuration object to validate
     * @param errors - Array to collect validation errors
     * @param warnings - Array to collect validation warnings
     */
    private validateCrossFieldConstraints(config: PluginConfig, errors: string[], warnings: string[]): void {
        // Check if minInterval is reasonable compared to autoFlushInterval
        if (config.minInterval > config.autoFlushInterval) {
            warnings.push('minInterval is greater than autoFlushInterval which may cause unexpected behavior');
        }

        // Check if batchSize is reasonable compared to maxCacheSize
        if (config.batchSize > config.maxCacheSize) {
            warnings.push('batchSize is greater than maxCacheSize which may cause inefficient processing');
        }

        // Check for conflicting path settings
        const conflictingPaths = config.includedPaths.filter(includePath =>
            config.excludedPaths.some(excludePath => 
                includePath.startsWith(excludePath) || excludePath.startsWith(includePath)
            )
        );

        if (conflictingPaths.length > 0) {
            warnings.push(`Conflicting include/exclude paths detected: ${conflictingPaths.join(', ')}`);
        }

        // Check performance configuration consistency
        if (config.performance) {
            if (config.performance.maxConcurrentOps > config.batchSize) {
                warnings.push('performance.maxConcurrentOps is greater than batchSize which may be inefficient');
            }
        }
    }

    /**
     * Validates a partial configuration object (for updates)
     * @param partialConfig - Partial configuration object to validate
     * @param currentConfig - Current configuration for context
     * @returns Validation result
     */
    public validatePartialConfig(partialConfig: Partial<PluginConfig>, currentConfig: PluginConfig): ValidationResult {
        // Create a merged configuration for validation
        const mergedConfig = { ...currentConfig, ...partialConfig };
        
        // Validate the merged configuration
        const result = this.validateConfig(mergedConfig);
        
        // Filter errors to only include those related to the partial config
        const relevantErrors = result.errors.filter(error => {
            const fieldName = error.split(' ')[0];
            return fieldName in partialConfig;
        });

        return {
            isValid: relevantErrors.length === 0,
            errors: relevantErrors,
            warnings: result.warnings
        };
    }

    /**
     * Validates configuration against a specific schema version
     * @param config - Configuration to validate
     * @param schemaVersion - Schema version to validate against
     * @returns Validation result
     */
    public validateAgainstSchema(config: PluginConfig, schemaVersion: string): ValidationResult {
        const result = this.validateConfig(config);
        
        // Add schema-specific validation
        if (schemaVersion !== config.version) {
            result.warnings.push(`Configuration version ${config.version} does not match schema version ${schemaVersion}`);
        }

        return result;
    }
}

/**
 * Utility function to create a new ConfigValidator instance
 * @param logger - Optional logger instance
 * @returns New ConfigValidator instance
 */
export function createConfigValidator(logger?: Console): ConfigValidator {
    return new ConfigValidator(logger);
}

/**
 * Utility function to quickly validate a configuration
 * @param config - Configuration to validate
 * @returns Validation result
 */
export function validateConfig(config: PluginConfig): ValidationResult {
    const validator = new ConfigValidator();
    return validator.validateConfig(config);
}

/**
 * Utility function to check if a configuration is valid
 * @param config - Configuration to check
 * @returns True if valid, false otherwise
 */
export function isValidConfig(config: PluginConfig): boolean {
    const result = validateConfig(config);
    return result.isValid;
}