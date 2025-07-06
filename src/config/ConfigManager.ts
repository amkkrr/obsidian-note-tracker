/**
 * Configuration manager implementation
 * Provides comprehensive configuration management with validation, migration, and persistence
 */

import { IConfigManager } from '../interfaces/core';
import {
    PluginConfig,
    ValidationResult,
    ConfigError,
    ConfigErrorCode,
    ConfigBackup,
    DEFAULT_CONFIG
} from '../interfaces/data-types';

import { ConfigValidator } from './ConfigValidator';
import { ConfigEventEmitter } from './EventEmitter';
import { ConfigMigrator } from './ConfigMigrator';
import { IEnhancedStorage } from './Storage';

/**
 * Configuration manager options
 */
export interface ConfigManagerOptions {
    /** Storage backend to use */
    storage: IEnhancedStorage;
    /** Storage key for configuration */
    storageKey?: string;
    /** Current application version */
    version?: string;
    /** Logger instance */
    logger?: Console;
    /** Whether to automatically migrate configurations */
    autoMigrate?: boolean;
    /** Whether to create backups before updates */
    createBackups?: boolean;
    /** Number of backups to retain */
    maxBackups?: number;
    /** Whether to validate configurations on load */
    validateOnLoad?: boolean;
}

/**
 * Comprehensive configuration manager implementation
 * Handles all aspects of configuration management including validation, migration, and persistence
 */
export class ConfigManager implements IConfigManager {
    private currentConfig: PluginConfig;
    private validator: ConfigValidator;
    private eventEmitter: ConfigEventEmitter;
    private migrator: ConfigMigrator;
    private storage: IEnhancedStorage;
    private logger?: Console;
    
    private readonly storageKey: string;
    private readonly version: string;
    private readonly autoMigrate: boolean;
    private readonly createBackups: boolean;
    private readonly maxBackups: number;
    private readonly validateOnLoad: boolean;
    
    private isLoaded = false;
    private isLoading = false;

    constructor(options: ConfigManagerOptions) {
        this.storage = options.storage;
        this.storageKey = options.storageKey || 'plugin-config';
        this.version = options.version || '1.0.0';
        this.logger = options.logger;
        this.autoMigrate = options.autoMigrate !== false;
        this.createBackups = options.createBackups !== false;
        this.maxBackups = options.maxBackups || 5;
        this.validateOnLoad = options.validateOnLoad !== false;

        // Initialize components
        this.validator = new ConfigValidator(this.logger);
        this.eventEmitter = new ConfigEventEmitter();
        this.migrator = new ConfigMigrator(this.logger);
        
        // Initialize with default configuration
        this.currentConfig = { ...DEFAULT_CONFIG, version: this.version };

        if (this.logger) {
            this.logger.info('ConfigManager initialized', {
                storageKey: this.storageKey,
                version: this.version,
                autoMigrate: this.autoMigrate
            });
        }
    }

    /**
     * Initialize the configuration manager
     * Loads configuration from storage and applies migrations if needed
     */
    public async initialize(): Promise<void> {
        if (this.isLoading) {
            throw new ConfigError(
                'Configuration is already being loaded',
                ConfigErrorCode.STORAGE_ERROR
            );
        }

        if (this.isLoaded) {
            return;
        }

        this.isLoading = true;

        try {
            await this.loadConfiguration();
            this.isLoaded = true;
            
            if (this.logger) {
                this.logger.info('ConfigManager initialized successfully');
            }
        } catch (error) {
            this.isLoading = false;
            throw error;
        }

        this.isLoading = false;
    }

    /**
     * Get the current plugin configuration
     * @returns Current configuration object
     */
    public getConfig(): PluginConfig {
        this.ensureLoaded();
        return { ...this.currentConfig };
    }

    /**
     * Update plugin configuration with partial changes
     * @param config - Partial configuration object
     * @returns Promise that resolves when configuration is updated
     */
    public async updateConfig(config: Partial<PluginConfig>): Promise<void> {
        this.ensureLoaded();

        // Create updated configuration
        const newConfig: PluginConfig = {
            ...this.currentConfig,
            ...config,
            version: this.version // Ensure version is always current
        };

        // Validate the new configuration
        const validation = this.validator.validateConfig(newConfig);
        this.eventEmitter.emitConfigValidated(newConfig, validation.isValid, validation.errors, validation.warnings);

        if (!validation.isValid) {
            throw new ConfigError(
                `Configuration validation failed: ${validation.errors.join(', ')}`,
                ConfigErrorCode.INVALID_TYPE,
                { errors: validation.errors, warnings: validation.warnings }
            );
        }

        // Create backup if enabled
        if (this.createBackups) {
            try {
                await this.createBackup('Before update');
            } catch (error) {
                if (this.logger) {
                    this.logger.warn('Failed to create backup before config update:', error);
                }
            }
        }

        // Determine changed fields
        const changedFields = this.getChangedFields(this.currentConfig, newConfig);

        // Update current configuration
        const previousConfig = this.currentConfig;
        this.currentConfig = newConfig;

        try {
            // Save to storage
            await this.storage.saveWithMetadata(this.storageKey, this.currentConfig, {
                updatedAt: Date.now(),
                updatedFields: changedFields,
                previousVersion: previousConfig.version
            });

            // Emit change event
            this.eventEmitter.emitConfigChanged(previousConfig, this.currentConfig, changedFields);

            // Cleanup old backups
            if (this.createBackups) {
                try {
                    await this.storage.cleanupBackups(this.storageKey, this.maxBackups);
                } catch (error) {
                    if (this.logger) {
                        this.logger.warn('Failed to cleanup old backups:', error);
                    }
                }
            }

            if (this.logger) {
                this.logger.info('Configuration updated successfully', {
                    changedFields,
                    version: this.currentConfig.version
                });
            }
        } catch (error) {
            // Revert configuration on save failure
            this.currentConfig = previousConfig;
            throw new ConfigError(
                `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`,
                ConfigErrorCode.STORAGE_ERROR,
                { originalError: error }
            );
        }
    }

    /**
     * Validate configuration object
     * @param config - Configuration to validate
     * @returns Validation result with errors and warnings
     */
    public validateConfig(config: PluginConfig): ValidationResult {
        return this.validator.validateConfig(config);
    }

    /**
     * Register a callback for configuration changes
     * @param callback - Function to call when configuration changes
     * @returns Function to unregister the callback
     */
    public onConfigChange(callback: (config: PluginConfig) => void): () => void {
        return this.eventEmitter.on('config-changed', (event) => {
            callback(event.newConfig);
        });
    }

    /**
     * Reset configuration to default values
     * @returns Promise that resolves when reset is complete
     */
    public async resetToDefaults(): Promise<void> {
        this.ensureLoaded();

        // Create backup if enabled
        if (this.createBackups) {
            try {
                await this.createBackup('Before reset to defaults');
            } catch (error) {
                if (this.logger) {
                    this.logger.warn('Failed to create backup before reset:', error);
                }
            }
        }

        const previousConfig = this.currentConfig;
        const defaultConfig: PluginConfig = {
            ...DEFAULT_CONFIG,
            version: this.version
        };

        this.currentConfig = defaultConfig;

        try {
            // Save to storage
            await this.storage.saveWithMetadata(this.storageKey, this.currentConfig, {
                resetAt: Date.now(),
                resetFrom: previousConfig.version
            });

            // Emit reset event
            this.eventEmitter.emitConfigReset(previousConfig, this.currentConfig);

            if (this.logger) {
                this.logger.info('Configuration reset to defaults');
            }
        } catch (error) {
            // Revert configuration on save failure
            this.currentConfig = previousConfig;
            throw new ConfigError(
                `Failed to save reset configuration: ${error instanceof Error ? error.message : String(error)}`,
                ConfigErrorCode.STORAGE_ERROR,
                { originalError: error }
            );
        }
    }

    /**
     * Export current configuration as JSON string
     * @returns JSON string representation of configuration
     */
    public exportConfig(): string {
        this.ensureLoaded();
        
        try {
            const exportData = {
                config: this.currentConfig,
                exportedAt: new Date().toISOString(),
                exportedBy: 'ConfigManager',
                version: this.version
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            
            this.eventEmitter.emitConfigExported(this.currentConfig, 'manual-export');
            
            if (this.logger) {
                this.logger.info('Configuration exported successfully');
            }

            return jsonString;
        } catch (error) {
            throw new ConfigError(
                `Failed to export configuration: ${error instanceof Error ? error.message : String(error)}`,
                ConfigErrorCode.PARSE_ERROR,
                { originalError: error }
            );
        }
    }

    /**
     * Import configuration from JSON string
     * @param json - JSON string containing configuration
     * @returns Promise that resolves when import is complete
     */
    public async importConfig(json: string): Promise<void> {
        this.ensureLoaded();

        let importedData: any;
        
        try {
            importedData = JSON.parse(json);
        } catch (error) {
            throw new ConfigError(
                'Invalid JSON format in configuration import',
                ConfigErrorCode.PARSE_ERROR,
                { originalError: error }
            );
        }

        // Extract configuration from import data
        let importedConfig: any;
        if (importedData.config) {
            // New format with metadata
            importedConfig = importedData.config;
        } else {
            // Direct configuration format
            importedConfig = importedData;
        }

        // Apply migration if needed
        if (this.autoMigrate && this.migrator.needsMigration(importedConfig, this.version)) {
            try {
                importedConfig = await this.migrator.migrateConfig(importedConfig, this.version);
                if (this.logger) {
                    this.logger.info('Imported configuration migrated successfully');
                }
            } catch (error) {
                throw new ConfigError(
                    `Failed to migrate imported configuration: ${error instanceof Error ? error.message : String(error)}`,
                    ConfigErrorCode.MIGRATION_ERROR,
                    { originalError: error }
                );
            }
        }

        // Validate imported configuration
        const validation = this.validator.validateConfig(importedConfig);
        if (!validation.isValid) {
            throw new ConfigError(
                `Imported configuration is invalid: ${validation.errors.join(', ')}`,
                ConfigErrorCode.INVALID_TYPE,
                { errors: validation.errors, warnings: validation.warnings }
            );
        }

        // Create backup before import
        if (this.createBackups) {
            try {
                await this.createBackup('Before import');
            } catch (error) {
                if (this.logger) {
                    this.logger.warn('Failed to create backup before import:', error);
                }
            }
        }

        // Update configuration
        await this.updateConfig(importedConfig);

        this.eventEmitter.emitConfigImported(importedConfig, 'manual-import');

        if (this.logger) {
            this.logger.info('Configuration imported successfully');
        }
    }

    /**
     * Get the default configuration
     * @returns Default configuration object
     */
    public getDefaultConfig(): PluginConfig {
        return {
            ...DEFAULT_CONFIG,
            version: this.version
        };
    }

    /**
     * Check if configuration has been modified from defaults
     * @returns True if configuration is modified, false otherwise
     */
    public isModified(): boolean {
        this.ensureLoaded();
        
        const defaultConfig = this.getDefaultConfig();
        const currentConfig = this.currentConfig;

        // Compare all fields except version and timestamps
        const fieldsToCompare = Object.keys(defaultConfig).filter(key => 
            key !== 'version'
        ) as Array<keyof PluginConfig>;

        return fieldsToCompare.some(key => {
            const defaultValue = defaultConfig[key];
            const currentValue = currentConfig[key];
            
            if (typeof defaultValue === 'object' && typeof currentValue === 'object') {
                return JSON.stringify(defaultValue) !== JSON.stringify(currentValue);
            }
            
            return defaultValue !== currentValue;
        });
    }

    /**
     * Create a backup of current configuration
     * @param reason - Reason for creating backup
     * @returns Promise resolving to backup information
     */
    public async createBackup(reason: string): Promise<ConfigBackup> {
        this.ensureLoaded();
        return this.storage.createBackup(this.storageKey, reason);
    }

    /**
     * Get all configuration backups
     * @returns Promise resolving to array of backups
     */
    public async getBackups(): Promise<ConfigBackup[]> {
        return this.storage.getBackups(this.storageKey);
    }

    /**
     * Restore configuration from a backup
     * @param backup - Backup to restore
     * @returns Promise that resolves when restore is complete
     */
    public async restoreBackup(backup: ConfigBackup): Promise<void> {
        this.ensureLoaded();

        // Validate backup configuration
        const validation = this.validator.validateConfig(backup.config);
        if (!validation.isValid) {
            throw new ConfigError(
                `Backup configuration is invalid: ${validation.errors.join(', ')}`,
                ConfigErrorCode.INVALID_TYPE,
                { errors: validation.errors, warnings: validation.warnings }
            );
        }

        // Create backup of current config before restore
        await this.createBackup('Before restore');

        // Restore configuration
        await this.updateConfig(backup.config);

        if (this.logger) {
            this.logger.info('Configuration restored from backup', {
                backupTimestamp: backup.timestamp,
                backupVersion: backup.version,
                backupReason: backup.reason
            });
        }
    }

    /**
     * Load configuration from storage
     */
    private async loadConfiguration(): Promise<void> {
        try {
            const result = await this.storage.loadWithMetadata<PluginConfig>(this.storageKey);
            
            if (result === null) {
                // No configuration found, use defaults
                this.currentConfig = this.getDefaultConfig();
                await this.storage.saveWithMetadata(this.storageKey, this.currentConfig, {
                    createdAt: Date.now(),
                    source: 'default'
                });
                
                if (this.logger) {
                    this.logger.info('No configuration found, created default configuration');
                }
                return;
            }

            let loadedConfig = result.data;

            // Apply migration if needed
            if (this.autoMigrate && this.migrator.needsMigration(loadedConfig, this.version)) {
                if (this.createBackups) {
                    await this.createBackup('Before migration');
                }

                try {
                    loadedConfig = await this.migrator.migrateConfig(loadedConfig, this.version);
                    
                    // Save migrated configuration
                    await this.storage.saveWithMetadata(this.storageKey, loadedConfig, {
                        migratedAt: Date.now(),
                        migratedFrom: result.data.version,
                        migratedTo: this.version
                    });

                    this.eventEmitter.emitConfigMigrated(
                        result.data.version || 'unknown',
                        this.version,
                        result.data,
                        loadedConfig
                    );

                    if (this.logger) {
                        this.logger.info('Configuration migrated successfully', {
                            from: result.data.version,
                            to: this.version
                        });
                    }
                } catch (error) {
                    if (this.logger) {
                        this.logger.error('Configuration migration failed:', error);
                    }
                    throw error;
                }
            }

            // Validate loaded configuration if enabled
            if (this.validateOnLoad) {
                const validation = this.validator.validateConfig(loadedConfig);
                this.eventEmitter.emitConfigValidated(loadedConfig, validation.isValid, validation.errors, validation.warnings);

                if (!validation.isValid) {
                    if (this.logger) {
                        this.logger.warn('Loaded configuration is invalid, using defaults', {
                            errors: validation.errors
                        });
                    }
                    loadedConfig = this.getDefaultConfig();
                }
            }

            this.currentConfig = loadedConfig;

            if (this.logger) {
                this.logger.info('Configuration loaded successfully', {
                    version: this.currentConfig.version,
                    modified: this.isModified()
                });
            }
        } catch (error) {
            if (this.logger) {
                this.logger.error('Failed to load configuration:', error);
            }
            
            // Fall back to default configuration
            this.currentConfig = this.getDefaultConfig();
            
            throw new ConfigError(
                `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
                ConfigErrorCode.STORAGE_ERROR,
                { originalError: error }
            );
        }
    }

    /**
     * Ensure configuration is loaded
     */
    private ensureLoaded(): void {
        if (!this.isLoaded) {
            throw new ConfigError(
                'Configuration not loaded. Call initialize() first.',
                ConfigErrorCode.STORAGE_ERROR
            );
        }
    }

    /**
     * Get fields that changed between two configurations
     * @param oldConfig - Previous configuration
     * @param newConfig - New configuration
     * @returns Array of changed field names
     */
    private getChangedFields(oldConfig: PluginConfig, newConfig: PluginConfig): string[] {
        const changedFields: string[] = [];
        
        for (const key in newConfig) {
            if (key in oldConfig) {
                const oldValue = (oldConfig as any)[key];
                const newValue = (newConfig as any)[key];
                
                if (typeof oldValue === 'object' && typeof newValue === 'object') {
                    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
                        changedFields.push(key);
                    }
                } else if (oldValue !== newValue) {
                    changedFields.push(key);
                }
            } else {
                changedFields.push(key);
            }
        }
        
        return changedFields;
    }

    /**
     * Get the event emitter for external listeners
     * @returns Event emitter instance
     */
    public getEventEmitter(): ConfigEventEmitter {
        return this.eventEmitter;
    }

    /**
     * Cleanup resources and remove event listeners
     */
    public dispose(): void {
        this.eventEmitter.removeAllListeners();
        
        if (this.logger) {
            this.logger.info('ConfigManager disposed');
        }
    }
}

/**
 * Create a new ConfigManager instance
 * @param options - Configuration manager options
 * @returns New ConfigManager instance
 */
export function createConfigManager(options: ConfigManagerOptions): ConfigManager {
    return new ConfigManager(options);
}