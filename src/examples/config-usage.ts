/**
 * Configuration management system usage examples
 * Demonstrates how to use the ConfigManager and related components
 */

import { ConfigManager, createConfigManager } from '../config/ConfigManager';
import { createStorage } from '../config/Storage';
import { PluginConfig, DEFAULT_CONFIG } from '../interfaces/data-types';

/**
 * Example 1: Basic Configuration Manager Usage
 */
async function basicUsageExample(): Promise<void> {
    console.log('=== Basic Configuration Manager Usage ===');

    // Create storage (in-memory for this example)
    const storage = createStorage('memory');

    // Create configuration manager
    const configManager = createConfigManager({
        storage,
        storageKey: 'my-plugin-config',
        version: '1.0.0',
        logger: console,
        autoMigrate: true,
        createBackups: true
    });

    try {
        // Initialize the configuration manager
        await configManager.initialize();

        // Get current configuration
        const currentConfig = configManager.getConfig();
        console.log('Current configuration:', currentConfig);

        // Update configuration
        await configManager.updateConfig({
            counterKey: 'my_counter',
            minInterval: 2000,
            debugMode: true
        });

        console.log('Configuration updated successfully');

        // Check if configuration is modified from defaults
        const isModified = configManager.isModified();
        console.log('Configuration is modified:', isModified);

        // Export configuration
        const exportedConfig = configManager.exportConfig();
        console.log('Exported configuration length:', exportedConfig.length);

    } catch (error) {
        console.error('Error in basic usage example:', error);
    } finally {
        configManager.dispose();
    }
}

/**
 * Example 2: Configuration Validation
 */
async function validationExample(): Promise<void> {
    console.log('\n=== Configuration Validation Example ===');

    const storage = createStorage('memory');
    const configManager = createConfigManager({
        storage,
        storageKey: 'validation-example',
        version: '1.0.0',
        logger: console
    });

    try {
        await configManager.initialize();

        // Test valid configuration
        const validConfig: PluginConfig = {
            ...DEFAULT_CONFIG,
            counterKey: 'valid_counter',
            minInterval: 1500
        };

        const validationResult = configManager.validateConfig(validConfig);
        console.log('Valid config validation:', {
            isValid: validationResult.isValid,
            errors: validationResult.errors,
            warnings: validationResult.warnings
        });

        // Test invalid configuration
        const invalidConfig = {
            ...DEFAULT_CONFIG,
            counterKey: '123invalid', // Invalid: starts with number
            minInterval: -100, // Invalid: negative value
            batchSize: 2000 // Invalid: too large
        } as PluginConfig;

        const invalidValidationResult = configManager.validateConfig(invalidConfig);
        console.log('Invalid config validation:', {
            isValid: invalidValidationResult.isValid,
            errors: invalidValidationResult.errors,
            warnings: invalidValidationResult.warnings
        });

    } catch (error) {
        console.error('Error in validation example:', error);
    } finally {
        configManager.dispose();
    }
}

/**
 * Example 3: Configuration Change Listeners
 */
async function changeListenerExample(): Promise<void> {
    console.log('\n=== Configuration Change Listener Example ===');

    const storage = createStorage('memory');
    const configManager = createConfigManager({
        storage,
        storageKey: 'listener-example',
        version: '1.0.0',
        logger: console
    });

    try {
        await configManager.initialize();

        // Register change listener
        const unsubscribe = configManager.onConfigChange((newConfig) => {
            console.log('Configuration changed!', {
                counterKey: newConfig.counterKey,
                enabled: newConfig.enabled,
                debugMode: newConfig.debugMode
            });
        });

        // Register event listener for detailed events
        const eventEmitter = configManager.getEventEmitter();
        const unsubscribeEvents = eventEmitter.on('config-changed', (event) => {
            console.log('Detailed change event:', {
                changedFields: event.changedFields,
                timestamp: new Date(event.timestamp).toISOString()
            });
        });

        // Make some configuration changes
        await configManager.updateConfig({ counterKey: 'new_counter' });
        await configManager.updateConfig({ enabled: false });
        await configManager.updateConfig({ debugMode: true, minInterval: 3000 });

        // Cleanup listeners
        unsubscribe();
        unsubscribeEvents();

    } catch (error) {
        console.error('Error in change listener example:', error);
    } finally {
        configManager.dispose();
    }
}

/**
 * Example 4: Import/Export Configuration
 */
async function importExportExample(): Promise<void> {
    console.log('\n=== Import/Export Configuration Example ===');

    const storage = createStorage('memory');
    const configManager = createConfigManager({
        storage,
        storageKey: 'import-export-example',
        version: '1.0.0',
        logger: console
    });

    try {
        await configManager.initialize();

        // Update configuration
        await configManager.updateConfig({
            counterKey: 'exported_counter',
            includedPaths: ['Notes/', 'Projects/'],
            excludedPaths: ['Private/'],
            debugMode: true
        });

        // Export configuration
        const exportedJson = configManager.exportConfig();
        console.log('Exported configuration:', JSON.stringify(JSON.parse(exportedJson), null, 2));

        // Reset to defaults
        await configManager.resetToDefaults();
        console.log('Reset to defaults. Current counter key:', configManager.getConfig().counterKey);

        // Import the previously exported configuration
        await configManager.importConfig(exportedJson);
        console.log('Imported configuration. Current counter key:', configManager.getConfig().counterKey);

    } catch (error) {
        console.error('Error in import/export example:', error);
    } finally {
        configManager.dispose();
    }
}

/**
 * Example 5: Configuration Backup and Restore
 */
async function backupRestoreExample(): Promise<void> {
    console.log('\n=== Backup and Restore Example ===');

    const storage = createStorage('memory');
    const configManager = createConfigManager({
        storage,
        storageKey: 'backup-example',
        version: '1.0.0',
        logger: console,
        createBackups: true,
        maxBackups: 3
    });

    try {
        await configManager.initialize();

        // Make several configuration changes (each creates a backup)
        await configManager.updateConfig({ counterKey: 'backup_test_1' });
        await configManager.updateConfig({ counterKey: 'backup_test_2', debugMode: true });
        await configManager.updateConfig({ counterKey: 'backup_test_3', minInterval: 5000 });

        // Create manual backup
        const manualBackup = await configManager.createBackup('Manual backup for testing');
        console.log('Created manual backup:', {
            timestamp: new Date(manualBackup.timestamp).toISOString(),
            version: manualBackup.version,
            reason: manualBackup.reason
        });

        // Get all backups
        const backups = await configManager.getBackups();
        console.log('Available backups:', backups.length);
        backups.forEach((backup, index) => {
            console.log(`  Backup ${index + 1}:`, {
                timestamp: new Date(backup.timestamp).toISOString(),
                counterKey: backup.config.counterKey,
                reason: backup.reason
            });
        });

        // Make one more change
        await configManager.updateConfig({ counterKey: 'final_counter' });
        console.log('Current counter key:', configManager.getConfig().counterKey);

        // Restore from backup
        if (backups.length > 0) {
            const backupToRestore = backups[1]; // Restore second-to-last backup
            await configManager.restoreBackup(backupToRestore);
            console.log('Restored counter key:', configManager.getConfig().counterKey);
        }

    } catch (error) {
        console.error('Error in backup/restore example:', error);
    } finally {
        configManager.dispose();
    }
}

/**
 * Example 6: File Storage Usage (Node.js environments)
 */
async function fileStorageExample(): Promise<void> {
    console.log('\n=== File Storage Example ===');

    try {
        // Note: This example requires Node.js environment
        const storage = createStorage('file', { baseDir: './config-data' });
        const configManager = createConfigManager({
            storage,
            storageKey: 'file-storage-config',
            version: '1.0.0',
            logger: console,
            createBackups: true
        });

        await configManager.initialize();

        // Update configuration
        await configManager.updateConfig({
            counterKey: 'file_stored_counter',
            includedPaths: ['Documents/', 'Projects/'],
            theme: 'dark' as const
        });

        console.log('Configuration saved to file');
        console.log('Current configuration:', configManager.getConfig());

        configManager.dispose();

    } catch (error) {
        console.log('File storage example skipped (requires Node.js):', error.message);
    }
}

/**
 * Example 7: Configuration Migration Simulation
 */
async function migrationExample(): Promise<void> {
    console.log('\n=== Configuration Migration Example ===');

    const storage = createStorage('memory');

    // Simulate old configuration format (v0.1.0)
    const oldConfig = {
        counterKey: 'old_counter',
        includedPaths: ['Notes/'],
        recursive: true,
        minInterval: 1000,
        enabled: true,
        version: '0.1.0'
        // Missing newer fields like performance settings
    };

    // Save old configuration to storage
    await storage.save('migration-example', oldConfig);

    // Create config manager with newer version
    const configManager = createConfigManager({
        storage,
        storageKey: 'migration-example',
        version: '1.0.0',
        logger: console,
        autoMigrate: true,
        createBackups: true
    });

    try {
        // Initialize will trigger migration
        await configManager.initialize();

        const migratedConfig = configManager.getConfig();
        console.log('Migrated configuration:', {
            version: migratedConfig.version,
            counterKey: migratedConfig.counterKey,
            hasPerformanceSettings: !!migratedConfig.performance,
            theme: migratedConfig.theme,
            language: migratedConfig.language
        });

        // Check if backups were created during migration
        const backups = await configManager.getBackups();
        console.log('Migration backups created:', backups.length);

    } catch (error) {
        console.error('Error in migration example:', error);
    } finally {
        configManager.dispose();
    }
}

/**
 * Example 8: Advanced Event Handling
 */
async function advancedEventExample(): Promise<void> {
    console.log('\n=== Advanced Event Handling Example ===');

    const storage = createStorage('memory');
    const configManager = createConfigManager({
        storage,
        storageKey: 'events-example',
        version: '1.0.0',
        logger: console
    });

    try {
        await configManager.initialize();

        const eventEmitter = configManager.getEventEmitter();

        // Listen to all types of configuration events
        const listeners = [
            eventEmitter.on('config-changed', (event) => {
                console.log('CONFIG CHANGED:', {
                    fields: event.changedFields,
                    time: new Date(event.timestamp).toLocaleTimeString()
                });
            }),

            eventEmitter.on('config-validated', (event) => {
                console.log('CONFIG VALIDATED:', {
                    isValid: event.isValid,
                    errorCount: event.errors.length,
                    warningCount: event.warnings.length
                });
            }),

            eventEmitter.on('config-reset', (event) => {
                console.log('CONFIG RESET:', {
                    time: new Date(event.timestamp).toLocaleTimeString()
                });
            }),

            eventEmitter.on('config-imported', (event) => {
                console.log('CONFIG IMPORTED:', {
                    source: event.source,
                    time: new Date(event.timestamp).toLocaleTimeString()
                });
            }),

            eventEmitter.on('config-exported', (event) => {
                console.log('CONFIG EXPORTED:', {
                    destination: event.destination,
                    time: new Date(event.timestamp).toLocaleTimeString()
                });
            })
        ];

        // Trigger various events
        await configManager.updateConfig({ counterKey: 'event_test' });
        await configManager.resetToDefaults();
        
        const exported = configManager.exportConfig();
        await configManager.importConfig(exported);

        // Cleanup listeners
        listeners.forEach(unsubscribe => unsubscribe());

    } catch (error) {
        console.error('Error in advanced event example:', error);
    } finally {
        configManager.dispose();
    }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
    console.log('🚀 Running Configuration Management Examples\n');

    try {
        await basicUsageExample();
        await validationExample();
        await changeListenerExample();
        await importExportExample();
        await backupRestoreExample();
        await fileStorageExample();
        await migrationExample();
        await advancedEventExample();
        
        console.log('\n✅ All examples completed successfully!');
    } catch (error) {
        console.error('\n❌ Example execution failed:', error);
    }
}

/**
 * Simple test runner for individual examples
 */
export const examples = {
    basic: basicUsageExample,
    validation: validationExample,
    listeners: changeListenerExample,
    importExport: importExportExample,
    backup: backupRestoreExample,
    fileStorage: fileStorageExample,
    migration: migrationExample,
    events: advancedEventExample,
    all: runAllExamples
};

// If running directly, execute all examples
if (require.main === module) {
    runAllExamples().catch(console.error);
}