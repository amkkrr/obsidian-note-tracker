import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteViewTrackerPlugin from './main';

// Enhanced settings interface
export interface EnhancedNoteViewTrackerSettings {
    // Display settings
    showInStatusBar: boolean;
    counterFieldName: string;
    
    // Path filtering
    includedPaths: string[];
    excludedPaths: string[];
    enablePathFiltering: boolean;
    
    // Cache settings
    cacheMaxSize: number;
    cacheCleanupInterval: number; // in minutes
    enableCache: boolean;
    
    // Batch processing
    maxBatchSize: number;
    autoFlushInterval: number; // in milliseconds
    enableBatchProcessing: boolean;
    
    // Performance settings
    minTimeBetweenUpdates: number; // in milliseconds
    enableDeduplication: boolean;
    
    // Advanced settings
    debugMode: boolean;
    enableLogging: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    
    // Data management
    enableDataExport: boolean;
    autoBackup: boolean;
    backupInterval: number; // in hours
}

export const ENHANCED_DEFAULT_SETTINGS: EnhancedNoteViewTrackerSettings = {
    // Display settings
    showInStatusBar: true,
    counterFieldName: 'view_count',
    
    // Path filtering
    includedPaths: [],
    excludedPaths: ['templates/', '.trash/', 'archive/'],
    enablePathFiltering: false,
    
    // Cache settings
    cacheMaxSize: 1000,
    cacheCleanupInterval: 10, // 10 minutes
    enableCache: true,
    
    // Batch processing
    maxBatchSize: 10,
    autoFlushInterval: 5000, // 5 seconds
    enableBatchProcessing: true,
    
    // Performance settings
    minTimeBetweenUpdates: 1000, // 1 second
    enableDeduplication: true,
    
    // Advanced settings
    debugMode: false,
    enableLogging: true,
    logLevel: 'info',
    
    // Data management
    enableDataExport: true,
    autoBackup: false,
    backupInterval: 24 // 24 hours
};

export class EnhancedNoteViewTrackerSettingTab extends PluginSettingTab {
    plugin: NoteViewTrackerPlugin;

    constructor(app: App, plugin: NoteViewTrackerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        // Header
        containerEl.createEl('h1', { text: 'Note View Tracker Settings' });
        containerEl.createEl('p', { 
            text: 'Configure how the plugin tracks and displays note access counts.',
            cls: 'setting-item-description'
        });

        // Display Settings Section
        this.addDisplaySettings(containerEl);
        
        // Path Filtering Section
        this.addPathFilteringSettings(containerEl);
        
        // Performance Settings Section
        this.addPerformanceSettings(containerEl);
        
        // Cache Settings Section
        this.addCacheSettings(containerEl);
        
        // Batch Processing Section
        this.addBatchProcessingSettings(containerEl);
        
        // Advanced Settings Section
        this.addAdvancedSettings(containerEl);
        
        // Data Management Section
        this.addDataManagementSettings(containerEl);
        
        // Actions Section
        this.addActionButtons(containerEl);
    }

    private addDisplaySettings(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Display Settings' });

        new Setting(containerEl)
            .setName('Show in status bar')
            .setDesc('Display the view count in the status bar')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showInStatusBar || true)
                .onChange(async (value) => {
                    this.plugin.settings.showInStatusBar = value;
                    await this.plugin.savePluginData();
                    this.plugin.updateStatusBar(this.app.workspace.getActiveFile());
                }));

        new Setting(containerEl)
            .setName('Counter field name')
            .setDesc('The name of the frontmatter field used to store view counts')
            .addText(text => text
                .setPlaceholder('view_count')
                .setValue(this.plugin.settings.counterFieldName || 'view_count')
                .onChange(async (value) => {
                    this.plugin.settings.counterFieldName = value || 'view_count';
                    await this.plugin.savePluginData();
                }));
    }

    private addPathFilteringSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Path Filtering' });

        new Setting(containerEl)
            .setName('Enable path filtering')
            .setDesc('Only track notes in specified paths')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enablePathFiltering || false)
                .onChange(async (value) => {
                    this.plugin.settings.enablePathFiltering = value;
                    await this.plugin.savePluginData();
                    this.display(); // Refresh to show/hide path settings
                }));

        if (this.plugin.settings.enablePathFiltering) {
            new Setting(containerEl)
                .setName('Included paths')
                .setDesc('Paths to include in tracking (one per line, supports wildcards like notes/*)')
                .addTextArea(text => text
                    .setPlaceholder('notes/\npersonal/\nwork/*')
                    .setValue((this.plugin.settings.includedPaths || []).join('\n'))
                    .onChange(async (value) => {
                        this.plugin.settings.includedPaths = value.split('\n').filter(p => p.trim());
                        await this.plugin.savePluginData();
                        if (this.plugin.pathFilter) {
                            this.plugin.pathFilter.updateFromConfig({
                                includedPaths: this.plugin.settings.includedPaths,
                                excludedPaths: this.plugin.settings.excludedPaths
                            } as any);
                        }
                    }));

            new Setting(containerEl)
                .setName('Excluded paths')
                .setDesc('Paths to exclude from tracking (one per line, supports wildcards)')
                .addTextArea(text => text
                    .setPlaceholder('templates/\n.trash/\narchive/*')
                    .setValue((this.plugin.settings.excludedPaths || ['templates/', '.trash/', 'archive/']).join('\n'))
                    .onChange(async (value) => {
                        this.plugin.settings.excludedPaths = value.split('\n').filter(p => p.trim());
                        await this.plugin.savePluginData();
                        if (this.plugin.pathFilter) {
                            this.plugin.pathFilter.updateFromConfig({
                                includedPaths: this.plugin.settings.includedPaths,
                                excludedPaths: this.plugin.settings.excludedPaths
                            } as any);
                        }
                    }));
        }
    }

    private addPerformanceSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Performance Settings' });

        new Setting(containerEl)
            .setName('Enable deduplication')
            .setDesc('Prevent multiple counts for rapid successive access to the same file')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDeduplication ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.enableDeduplication = value;
                    await this.plugin.savePluginData();
                }));

        new Setting(containerEl)
            .setName('Minimum time between updates')
            .setDesc('Minimum milliseconds between counting the same file again')
            .addSlider(slider => slider
                .setLimits(100, 10000, 100)
                .setValue(this.plugin.settings.minTimeBetweenUpdates || 1000)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.minTimeBetweenUpdates = value;
                    await this.plugin.savePluginData();
                }));
    }

    private addCacheSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Cache Settings' });

        new Setting(containerEl)
            .setName('Enable caching')
            .setDesc('Use in-memory cache to improve performance')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableCache ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.enableCache = value;
                    await this.plugin.savePluginData();
                    this.display(); // Refresh to show/hide cache settings
                }));

        if (this.plugin.settings.enableCache !== false) {
            new Setting(containerEl)
                .setName('Cache max size')
                .setDesc('Maximum number of files to keep in cache')
                .addSlider(slider => slider
                    .setLimits(100, 5000, 100)
                    .setValue(this.plugin.settings.cacheMaxSize || 1000)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.cacheMaxSize = value;
                        await this.plugin.savePluginData();
                        if (this.plugin.cacheManager) {
                            this.plugin.cacheManager.setMaxSize(value);
                        }
                    }));

            new Setting(containerEl)
                .setName('Cache cleanup interval')
                .setDesc('How often to clean up old cache entries (minutes)')
                .addSlider(slider => slider
                    .setLimits(1, 60, 1)
                    .setValue(this.plugin.settings.cacheCleanupInterval || 10)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.cacheCleanupInterval = value;
                        await this.plugin.savePluginData();
                        if (this.plugin.cacheManager) {
                            this.plugin.cacheManager.stopCleanup();
                            this.plugin.cacheManager.startCleanup(value * 60 * 1000);
                        }
                    }));
        }
    }

    private addBatchProcessingSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Batch Processing' });

        new Setting(containerEl)
            .setName('Enable batch processing')
            .setDesc('Group multiple updates together for better performance')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableBatchProcessing ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.enableBatchProcessing = value;
                    await this.plugin.savePluginData();
                    this.display(); // Refresh to show/hide batch settings
                }));

        if (this.plugin.settings.enableBatchProcessing !== false) {
            new Setting(containerEl)
                .setName('Max batch size')
                .setDesc('Maximum number of updates to process at once')
                .addSlider(slider => slider
                    .setLimits(1, 50, 1)
                    .setValue(this.plugin.settings.maxBatchSize || 10)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.maxBatchSize = value;
                        await this.plugin.savePluginData();
                        if (this.plugin.batchProcessor) {
                            this.plugin.batchProcessor.setMaxBatchSize(value);
                        }
                    }));

            new Setting(containerEl)
                .setName('Auto flush interval')
                .setDesc('How often to automatically process batched updates (milliseconds)')
                .addSlider(slider => slider
                    .setLimits(1000, 30000, 1000)
                    .setValue(this.plugin.settings.autoFlushInterval || 5000)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.autoFlushInterval = value;
                        await this.plugin.savePluginData();
                        if (this.plugin.batchProcessor) {
                            this.plugin.batchProcessor.setFlushInterval(value);
                        }
                    }));
        }
    }

    private addAdvancedSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Advanced Settings' });

        new Setting(containerEl)
            .setName('Debug mode')
            .setDesc('Enable detailed console logging for troubleshooting')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.debugMode || false)
                .onChange(async (value) => {
                    this.plugin.settings.debugMode = value;
                    await this.plugin.savePluginData();
                }));

        new Setting(containerEl)
            .setName('Enable logging')
            .setDesc('Log plugin activity for debugging')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableLogging ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.enableLogging = value;
                    await this.plugin.savePluginData();
                    this.display(); // Refresh to show/hide log level
                }));

        if (this.plugin.settings.enableLogging !== false) {
            new Setting(containerEl)
                .setName('Log level')
                .setDesc('Minimum level of messages to log')
                .addDropdown(dropdown => dropdown
                    .addOption('error', 'Error')
                    .addOption('warn', 'Warning')
                    .addOption('info', 'Info')
                    .addOption('debug', 'Debug')
                    .setValue(this.plugin.settings.logLevel || 'info')
                    .onChange(async (value: 'error' | 'warn' | 'info' | 'debug') => {
                        this.plugin.settings.logLevel = value;
                        await this.plugin.savePluginData();
                    }));
        }
    }

    private addDataManagementSettings(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Data Management' });

        new Setting(containerEl)
            .setName('Enable data export')
            .setDesc('Allow exporting view count data to various formats')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableDataExport ?? true)
                .onChange(async (value) => {
                    this.plugin.settings.enableDataExport = value;
                    await this.plugin.savePluginData();
                }));

        new Setting(containerEl)
            .setName('Auto backup')
            .setDesc('Automatically backup view count data')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoBackup || false)
                .onChange(async (value) => {
                    this.plugin.settings.autoBackup = value;
                    await this.plugin.savePluginData();
                    this.display(); // Refresh to show/hide backup interval
                }));

        if (this.plugin.settings.autoBackup) {
            new Setting(containerEl)
                .setName('Backup interval')
                .setDesc('How often to create automatic backups (hours)')
                .addSlider(slider => slider
                    .setLimits(1, 168, 1) // 1 hour to 1 week
                    .setValue(this.plugin.settings.backupInterval || 24)
                    .setDynamicTooltip()
                    .onChange(async (value) => {
                        this.plugin.settings.backupInterval = value;
                        await this.plugin.savePluginData();
                    }));
        }
    }

    private addActionButtons(containerEl: HTMLElement): void {
        containerEl.createEl('h2', { text: 'Actions' });

        // Statistics button
        new Setting(containerEl)
            .setName('View statistics')
            .setDesc('Show detailed statistics about tracked notes')
            .addButton(button => button
                .setButtonText('Show Stats')
                .onClick(async () => {
                    await this.showStatistics();
                }));

        // Export data button
        if (this.plugin.settings.enableDataExport !== false) {
            new Setting(containerEl)
                .setName('Export data')
                .setDesc('Export view count data to JSON format')
                .addButton(button => button
                    .setButtonText('Export JSON')
                    .onClick(async () => {
                        await this.exportData('json');
                    }))
                .addButton(button => button
                    .setButtonText('Export CSV')
                    .onClick(async () => {
                        await this.exportData('csv');
                    }));
        }

        // Reset data button
        new Setting(containerEl)
            .setName('Reset all data')
            .setDesc('⚠️ This will permanently delete all view count data')
            .addButton(button => button
                .setButtonText('Reset Data')
                .setWarning()
                .onClick(async () => {
                    await this.resetAllData();
                }));

        // Cache management buttons
        if (this.plugin.settings.enableCache !== false) {
            new Setting(containerEl)
                .setName('Cache management')
                .setDesc('Clear cache or view cache statistics')
                .addButton(button => button
                    .setButtonText('Clear Cache')
                    .onClick(async () => {
                        if (this.plugin.cacheManager) {
                            this.plugin.cacheManager.clear();
                            this.showNotice('Cache cleared successfully');
                        }
                    }))
                .addButton(button => button
                    .setButtonText('Cache Stats')
                    .onClick(async () => {
                        await this.showCacheStats();
                    }));
        }
    }

    private async showStatistics(): Promise<void> {
        if (!this.plugin.dataProvider) {
            this.showNotice('Data provider not available');
            return;
        }

        try {
            const stats = await this.plugin.dataProvider.getAggregatedStats();
            const modal = this.createStatsModal(stats);
            modal.open();
        } catch (error) {
            this.showNotice('Error loading statistics: ' + error.message);
        }
    }

    private async exportData(format: 'json' | 'csv'): Promise<void> {
        if (!this.plugin.dataProvider) {
            this.showNotice('Data provider not available');
            return;
        }

        try {
            const data = await this.plugin.dataProvider.exportData(format);
            const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `note-view-tracker-data.${format}`;
            a.click();
            URL.revokeObjectURL(url);
            this.showNotice(`Data exported as ${format.toUpperCase()}`);
        } catch (error) {
            this.showNotice('Error exporting data: ' + error.message);
        }
    }

    private async resetAllData(): Promise<void> {
        const confirmed = confirm('Are you sure you want to reset all view count data? This action cannot be undone.');
        if (!confirmed) return;

        try {
            // Clear cache
            if (this.plugin.cacheManager) {
                this.plugin.cacheManager.clear();
            }
            
            // Clear data provider
            if (this.plugin.dataProvider) {
                await this.plugin.dataProvider.reset();
            }
            
            // Clear plugin data
            this.plugin.pluginData.viewCounts = {};
            await this.plugin.savePluginData();
            
            this.showNotice('All data has been reset');
        } catch (error) {
            this.showNotice('Error resetting data: ' + error.message);
        }
    }

    private async showCacheStats(): Promise<void> {
        if (!this.plugin.cacheManager) {
            this.showNotice('Cache manager not available');
            return;
        }

        const stats = this.plugin.cacheManager.getStats();
        const hitRate = this.plugin.cacheManager.getHitRate();
        
        const modal = this.createCacheStatsModal(stats, hitRate);
        modal.open();
    }

    private createStatsModal(stats: any): any {
        // Implementation would create a modal with statistics
        // This is a placeholder - would need actual Obsidian Modal implementation
        return {
            open: () => {
                alert(`Total Files: ${stats.totalFiles}\nTotal Accesses: ${stats.totalAccesses}\nAverage per File: ${stats.averageAccessesPerFile.toFixed(2)}`);
            }
        };
    }

    private createCacheStatsModal(stats: any, hitRate: number): any {
        return {
            open: () => {
                alert(`Cache Size: ${stats.size}/${stats.maxSize}\nHits: ${stats.hits}\nMisses: ${stats.misses}\nHit Rate: ${(hitRate * 100).toFixed(2)}%`);
            }
        };
    }

    private showNotice(message: string): void {
        // In a real implementation, this would use Obsidian's Notice class
        console.log('Notice:', message);
    }
}