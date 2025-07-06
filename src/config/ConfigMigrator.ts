/**
 * Configuration migration system for handling version upgrades
 * Provides automatic migration between different configuration schema versions
 */

import {
    PluginConfig,
    MigrationContext,
    ConfigError,
    ConfigErrorCode,
    DEFAULT_CONFIG
} from '../interfaces/data-types';

/**
 * Migration function type
 */
export type MigrationFunction = (
    oldConfig: any,
    context: MigrationContext
) => PluginConfig;

/**
 * Migration definition
 */
export interface Migration {
    /** Target version this migration upgrades to */
    toVersion: string;
    /** Source versions this migration can handle */
    fromVersions: string[];
    /** Description of the migration */
    description: string;
    /** Migration function */
    migrate: MigrationFunction;
    /** Whether this migration is reversible */
    reversible: boolean;
}

/**
 * Version comparison utility
 */
class VersionComparator {
    /**
     * Parse version string into components
     * @param version - Version string (e.g., "1.2.3")
     * @returns Version components
     */
    public static parseVersion(version: string): { major: number; minor: number; patch: number } {
        const parts = version.split('.').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) {
            throw new Error(`Invalid version format: ${version}`);
        }
        return {
            major: parts[0],
            minor: parts[1],
            patch: parts[2]
        };
    }

    /**
     * Compare two version strings
     * @param version1 - First version
     * @param version2 - Second version
     * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
     */
    public static compare(version1: string, version2: string): number {
        const v1 = this.parseVersion(version1);
        const v2 = this.parseVersion(version2);

        if (v1.major !== v2.major) {
            return v1.major - v2.major;
        }
        if (v1.minor !== v2.minor) {
            return v1.minor - v2.minor;
        }
        return v1.patch - v2.patch;
    }

    /**
     * Check if version is greater than another
     * @param version1 - First version
     * @param version2 - Second version
     * @returns True if version1 > version2
     */
    public static isGreater(version1: string, version2: string): boolean {
        return this.compare(version1, version2) > 0;
    }

    /**
     * Check if version is compatible with another
     * @param version - Version to check
     * @param compatibleVersion - Version to check compatibility against
     * @returns True if versions are compatible
     */
    public static isCompatible(version: string, compatibleVersion: string): boolean {
        const v1 = this.parseVersion(version);
        const v2 = this.parseVersion(compatibleVersion);
        
        // Major version must match for compatibility
        return v1.major === v2.major;
    }
}

/**
 * Configuration migration manager
 * Handles automatic migration between configuration schema versions
 */
export class ConfigMigrator {
    private migrations: Migration[] = [];
    private logger?: Console;

    constructor(logger?: Console) {
        this.logger = logger;
        this.registerBuiltInMigrations();
    }

    /**
     * Register a migration
     * @param migration - Migration to register
     */
    public registerMigration(migration: Migration): void {
        // Validate migration
        if (!migration.toVersion || !migration.fromVersions.length) {
            throw new ConfigError(
                'Invalid migration: must have toVersion and fromVersions',
                ConfigErrorCode.INVALID_VERSION
            );
        }

        // Check for duplicate migrations
        const existing = this.migrations.find(m => 
            m.toVersion === migration.toVersion &&
            m.fromVersions.some(v => migration.fromVersions.includes(v))
        );

        if (existing) {
            throw new ConfigError(
                `Migration already exists for ${migration.toVersion}`,
                ConfigErrorCode.MIGRATION_ERROR
            );
        }

        this.migrations.push(migration);
        this.sortMigrations();

        if (this.logger) {
            this.logger.info(`Registered migration to ${migration.toVersion}: ${migration.description}`);
        }
    }

    /**
     * Check if a configuration needs migration
     * @param config - Configuration to check
     * @param targetVersion - Target version to migrate to
     * @returns True if migration is needed
     */
    public needsMigration(config: any, targetVersion: string): boolean {
        const currentVersion = this.getConfigVersion(config);
        
        if (!currentVersion) {
            return true; // No version means old config that needs migration
        }

        return VersionComparator.compare(currentVersion, targetVersion) < 0;
    }

    /**
     * Migrate configuration to target version
     * @param config - Configuration to migrate
     * @param targetVersion - Target version
     * @returns Migrated configuration
     */
    public async migrateConfig(config: any, targetVersion: string): Promise<PluginConfig> {
        const currentVersion = this.getConfigVersion(config);
        
        if (this.logger) {
            this.logger.info(`Migrating configuration from ${currentVersion || 'unknown'} to ${targetVersion}`);
        }

        const context: MigrationContext = {
            fromVersion: currentVersion || '0.0.0',
            toVersion: targetVersion,
            timestamp: Date.now(),
            originalConfig: JSON.parse(JSON.stringify(config)),
            errors: [],
            warnings: []
        };

        try {
            let currentConfig = config;
            let currentVer = currentVersion || '0.0.0';

            // Find migration path
            const migrationPath = this.findMigrationPath(currentVer, targetVersion);
            if (migrationPath.length === 0 && currentVer !== targetVersion) {
                throw new ConfigError(
                    `No migration path found from ${currentVer} to ${targetVersion}`,
                    ConfigErrorCode.MIGRATION_ERROR
                );
            }

            // Apply migrations in sequence
            for (const migration of migrationPath) {
                if (this.logger) {
                    this.logger.info(`Applying migration to ${migration.toVersion}: ${migration.description}`);
                }

                try {
                    currentConfig = migration.migrate(currentConfig, context);
                    currentVer = migration.toVersion;
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    context.errors.push(`Migration to ${migration.toVersion} failed: ${errorMessage}`);
                    throw new ConfigError(
                        `Migration failed: ${errorMessage}`,
                        ConfigErrorCode.MIGRATION_ERROR,
                        { migration: migration.toVersion, originalError: error }
                    );
                }
            }

            // Ensure final configuration has correct version
            currentConfig.version = targetVersion;
            context.migratedConfig = currentConfig;

            if (this.logger) {
                this.logger.info(`Migration completed successfully to version ${targetVersion}`);
                if (context.warnings.length > 0) {
                    this.logger.warn('Migration warnings:', context.warnings);
                }
            }

            return currentConfig;
        } catch (error) {
            if (this.logger) {
                this.logger.error('Migration failed:', error);
            }
            throw error;
        }
    }

    /**
     * Get version from configuration object
     * @param config - Configuration object
     * @returns Version string or null if not found
     */
    private getConfigVersion(config: any): string | null {
        if (!config || typeof config !== 'object') {
            return null;
        }
        return config.version || null;
    }

    /**
     * Find migration path from source to target version
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns Array of migrations to apply
     */
    private findMigrationPath(fromVersion: string, toVersion: string): Migration[] {
        if (fromVersion === toVersion) {
            return [];
        }

        const path: Migration[] = [];
        let currentVersion = fromVersion;

        // Simple linear search for migration path
        while (currentVersion !== toVersion) {
            const nextMigration = this.migrations.find(m =>
                m.fromVersions.includes(currentVersion) &&
                VersionComparator.compare(m.toVersion, currentVersion) > 0 &&
                VersionComparator.compare(m.toVersion, toVersion) <= 0
            );

            if (!nextMigration) {
                // Try to find any migration that can handle the current version
                const anyMigration = this.migrations.find(m =>
                    m.fromVersions.includes(currentVersion)
                );
                
                if (!anyMigration) {
                    break;
                }
                
                path.push(anyMigration);
                currentVersion = anyMigration.toVersion;
            } else {
                path.push(nextMigration);
                currentVersion = nextMigration.toVersion;
            }

            // Prevent infinite loops
            if (path.length > 10) {
                throw new ConfigError(
                    'Migration path too complex',
                    ConfigErrorCode.MIGRATION_ERROR
                );
            }
        }

        return path;
    }

    /**
     * Sort migrations by version order
     */
    private sortMigrations(): void {
        this.migrations.sort((a, b) => VersionComparator.compare(a.toVersion, b.toVersion));
    }

    /**
     * Register built-in migrations
     */
    private registerBuiltInMigrations(): void {
        // Migration from v0.x to v1.0.0
        this.registerMigration({
            toVersion: '1.0.0',
            fromVersions: ['0.1.0', '0.2.0', '0.3.0'],
            description: 'Migrate to v1.0.0 schema with performance settings',
            reversible: false,
            migrate: (oldConfig: any, context: MigrationContext): PluginConfig => {
                const newConfig: PluginConfig = {
                    ...DEFAULT_CONFIG,
                    counterKey: oldConfig.counterKey || DEFAULT_CONFIG.counterKey,
                    includedPaths: oldConfig.includedPaths || DEFAULT_CONFIG.includedPaths,
                    excludedPaths: oldConfig.excludedPaths || DEFAULT_CONFIG.excludedPaths,
                    recursive: oldConfig.recursive !== undefined ? oldConfig.recursive : DEFAULT_CONFIG.recursive,
                    minInterval: oldConfig.minInterval || DEFAULT_CONFIG.minInterval,
                    batchSize: oldConfig.batchSize || DEFAULT_CONFIG.batchSize,
                    maxCacheSize: oldConfig.maxCacheSize || DEFAULT_CONFIG.maxCacheSize,
                    enabled: oldConfig.enabled !== undefined ? oldConfig.enabled : DEFAULT_CONFIG.enabled,
                    debugMode: oldConfig.debugMode !== undefined ? oldConfig.debugMode : DEFAULT_CONFIG.debugMode,
                    autoFlushInterval: oldConfig.autoFlushInterval || DEFAULT_CONFIG.autoFlushInterval,
                    version: '1.0.0',
                    theme: DEFAULT_CONFIG.theme,
                    language: DEFAULT_CONFIG.language,
                    performance: DEFAULT_CONFIG.performance
                };

                context.warnings.push('Added new performance settings with default values');
                context.warnings.push('Added theme and language settings');

                return newConfig;
            }
        });

        // Migration from v1.0.0 to v1.1.0
        this.registerMigration({
            toVersion: '1.1.0',
            fromVersions: ['1.0.0'],
            description: 'Add enhanced performance monitoring',
            reversible: true,
            migrate: (oldConfig: any, context: MigrationContext): PluginConfig => {
                const newConfig: PluginConfig = {
                    ...oldConfig,
                    version: '1.1.0',
                    performance: {
                        ...oldConfig.performance,
                        enableBackgroundProcessing: oldConfig.performance?.enableBackgroundProcessing !== undefined 
                            ? oldConfig.performance.enableBackgroundProcessing 
                            : true
                    }
                };

                if (oldConfig.performance?.enableBackgroundProcessing === undefined) {
                    context.warnings.push('Added enableBackgroundProcessing setting with default value true');
                }

                return newConfig;
            }
        });

        // Migration from v1.1.0 to v1.2.0 (future migration)
        this.registerMigration({
            toVersion: '1.2.0',
            fromVersions: ['1.1.0'],
            description: 'Add advanced filtering options',
            reversible: true,
            migrate: (oldConfig: any, context: MigrationContext): PluginConfig => {
                const newConfig: PluginConfig = {
                    ...oldConfig,
                    version: '1.2.0'
                    // Add new fields here when v1.2.0 is defined
                };

                context.warnings.push('Migration to 1.2.0 - no changes required yet');
                return newConfig;
            }
        });
    }

    /**
     * Get all available migrations
     * @returns Array of registered migrations
     */
    public getAvailableMigrations(): Migration[] {
        return [...this.migrations];
    }

    /**
     * Check if a migration exists for the given version range
     * @param fromVersion - Source version
     * @param toVersion - Target version
     * @returns True if migration path exists
     */
    public canMigrate(fromVersion: string, toVersion: string): boolean {
        try {
            const path = this.findMigrationPath(fromVersion, toVersion);
            return path.length > 0 || fromVersion === toVersion;
        } catch {
            return false;
        }
    }

    /**
     * Validate configuration structure before migration
     * @param config - Configuration to validate
     * @returns True if configuration structure is valid
     */
    public validateConfigStructure(config: any): boolean {
        if (!config || typeof config !== 'object') {
            return false;
        }

        // Basic structure validation
        const requiredFields = ['counterKey'];
        return requiredFields.every(field => field in config);
    }

    /**
     * Create a safe fallback configuration
     * @param version - Target version
     * @returns Safe default configuration
     */
    public createFallbackConfig(version: string): PluginConfig {
        return {
            ...DEFAULT_CONFIG,
            version
        };
    }
}

/**
 * Create a new ConfigMigrator instance with default migrations
 * @param logger - Optional logger instance
 * @returns New ConfigMigrator instance
 */
export function createConfigMigrator(logger?: Console): ConfigMigrator {
    return new ConfigMigrator(logger);
}

/**
 * Utility function to migrate configuration
 * @param config - Configuration to migrate
 * @param targetVersion - Target version
 * @param logger - Optional logger
 * @returns Promise resolving to migrated configuration
 */
export async function migrateConfig(
    config: any,
    targetVersion: string,
    logger?: Console
): Promise<PluginConfig> {
    const migrator = createConfigMigrator(logger);
    return migrator.migrateConfig(config, targetVersion);
}

/**
 * Utility function to check if migration is needed
 * @param config - Configuration to check
 * @param targetVersion - Target version
 * @returns True if migration is needed
 */
export function needsMigration(config: any, targetVersion: string): boolean {
    const migrator = createConfigMigrator();
    return migrator.needsMigration(config, targetVersion);
}