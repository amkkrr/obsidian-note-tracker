import { TFile } from 'obsidian';
import {
    PluginConfig,
    UpdateOperation,
    TrackingStats,
    CounterUpdate,
    BatchUpdateResult,
    ValidationResult,
    ProcessResult,
    QueueStatus,
    FilterRules
} from './data-types';

/**
 * Core interface for tracking file access events and managing counting logic
 */
export interface IAccessTracker {
    /**
     * Start tracking file access events
     * @throws {Error} If tracking is already active
     */
    startTracking(): void;

    /**
     * Stop tracking file access events
     */
    stopTracking(): void;

    /**
     * Handle file access event and trigger counting logic
     * @param file - The accessed file object
     * @returns Promise that resolves when access is processed
     */
    onFileAccess(file: TFile): Promise<void>;

    /**
     * Check if tracking is currently active
     * @returns True if tracking is active, false otherwise
     */
    isTracking(): boolean;

    /**
     * Get current tracking statistics
     * @returns Current tracking statistics object
     */
    getStats(): TrackingStats;

    /**
     * Reset tracking statistics
     */
    resetStats(): void;
}

/**
 * Interface for managing frontmatter operations on files
 */
export interface IFrontmatterManager {
    /**
     * Read the counter value for a specific key from a file's frontmatter
     * @param file - Target file
     * @param key - Counter key name
     * @returns Promise resolving to current counter value (0 if not found)
     * @throws {FrontmatterError} When parsing fails
     */
    readCounter(file: TFile, key: string): Promise<number>;

    /**
     * Update the counter value for a specific key in a file's frontmatter
     * @param file - Target file
     * @param key - Counter key name
     * @param value - New counter value
     * @returns Promise that resolves when update is complete
     * @throws {FrontmatterError} When update fails
     */
    updateCounter(file: TFile, key: string, value: number): Promise<void>;

    /**
     * Check if a file has valid frontmatter
     * @param file - Target file
     * @returns True if file has valid frontmatter, false otherwise
     */
    hasValidFrontmatter(file: TFile): boolean;

    /**
     * Create frontmatter for a file with initial data
     * @param file - Target file
     * @param data - Initial frontmatter data
     * @returns Promise that resolves when frontmatter is created
     * @throws {FrontmatterError} When creation fails
     */
    createFrontmatter(file: TFile, data: Record<string, any>): Promise<void>;

    /**
     * Batch update counters for multiple files
     * @param updates - Array of counter update operations
     * @returns Promise resolving to batch update result
     */
    batchUpdateCounters(updates: CounterUpdate[]): Promise<BatchUpdateResult>;

    /**
     * Get all frontmatter data from a file
     * @param file - Target file
     * @returns Promise resolving to frontmatter data or null if not found
     */
    getFrontmatter(file: TFile): Promise<Record<string, any> | null>;

    /**
     * Update multiple frontmatter fields at once
     * @param file - Target file
     * @param data - Fields to update
     * @returns Promise that resolves when update is complete
     */
    updateFrontmatter(file: TFile, data: Record<string, any>): Promise<void>;
}

/**
 * Interface for managing plugin configuration
 */
export interface IConfigManager {
    /**
     * Get the current plugin configuration
     * @returns Current configuration object
     */
    getConfig(): PluginConfig;

    /**
     * Update plugin configuration with partial changes
     * @param config - Partial configuration object
     * @returns Promise that resolves when configuration is updated
     * @throws {ConfigError} When validation fails
     */
    updateConfig(config: Partial<PluginConfig>): Promise<void>;

    /**
     * Validate configuration object
     * @param config - Configuration to validate
     * @returns Validation result with errors and warnings
     */
    validateConfig(config: PluginConfig): ValidationResult;

    /**
     * Register a callback for configuration changes
     * @param callback - Function to call when configuration changes
     * @returns Function to unregister the callback
     */
    onConfigChange(callback: (config: PluginConfig) => void): () => void;

    /**
     * Reset configuration to default values
     * @returns Promise that resolves when reset is complete
     */
    resetToDefaults(): Promise<void>;

    /**
     * Export current configuration as JSON string
     * @returns JSON string representation of configuration
     */
    exportConfig(): string;

    /**
     * Import configuration from JSON string
     * @param json - JSON string containing configuration
     * @returns Promise that resolves when import is complete
     * @throws {ConfigError} When import fails
     */
    importConfig(json: string): Promise<void>;

    /**
     * Get the default configuration
     * @returns Default configuration object
     */
    getDefaultConfig(): PluginConfig;

    /**
     * Check if configuration has been modified from defaults
     * @returns True if configuration is modified, false otherwise
     */
    isModified(): boolean;
}

/**
 * Interface for handling file path filtering logic
 */
export interface IPathFilter {
    /**
     * Check if a file should be tracked based on current filter rules
     * @param file - Target file
     * @returns True if file should be tracked, false otherwise
     */
    shouldTrackFile(file: TFile): boolean;

    /**
     * Check if a file path is within the tracking scope
     * @param filePath - File path to check
     * @returns True if path is within scope, false otherwise
     */
    isWithinScope(filePath: string): boolean;

    /**
     * Add a path to the include list
     * @param path - Path to include
     */
    addIncludePath(path: string): void;

    /**
     * Remove a path from the include list
     * @param path - Path to remove
     * @returns True if path was removed, false if not found
     */
    removeIncludePath(path: string): boolean;

    /**
     * Add a path to the exclude list
     * @param path - Path to exclude
     */
    addExcludePath(path: string): void;

    /**
     * Remove a path from the exclude list
     * @param path - Path to remove
     * @returns True if path was removed, false if not found
     */
    removeExcludePath(path: string): boolean;

    /**
     * Get current filter rules
     * @returns Current filter rules object
     */
    getFilterRules(): FilterRules;

    /**
     * Reset all filter rules to defaults
     */
    resetFilters(): void;

    /**
     * Update filter rules from configuration
     * @param config - Configuration containing filter rules
     */
    updateFromConfig(config: PluginConfig): void;

    /**
     * Test if a path matches any of the include patterns
     * @param path - Path to test
     * @returns True if path matches include patterns
     */
    matchesIncludePattern(path: string): boolean;

    /**
     * Test if a path matches any of the exclude patterns
     * @param path - Path to test
     * @returns True if path matches exclude patterns
     */
    matchesExcludePattern(path: string): boolean;
}

/**
 * Interface for handling batch processing of update operations
 */
export interface IBatchProcessor {
    /**
     * Add an update operation to the processing queue
     * @param operation - Update operation to enqueue
     */
    enqueueUpdate(operation: UpdateOperation): void;

    /**
     * Immediately process all pending updates
     * @returns Promise resolving to processing result
     */
    flush(): Promise<ProcessResult>;

    /**
     * Set the maximum batch size for processing
     * @param size - Maximum batch size
     */
    setMaxBatchSize(size: number): void;

    /**
     * Set the automatic flush interval
     * @param interval - Flush interval in milliseconds
     */
    setFlushInterval(interval: number): void;

    /**
     * Get current queue status information
     * @returns Current queue status
     */
    getQueueStatus(): QueueStatus;

    /**
     * Pause batch processing
     */
    pause(): void;

    /**
     * Resume batch processing
     */
    resume(): void;

    /**
     * Clear all pending operations from the queue
     */
    clear(): void;

    /**
     * Get the number of pending operations
     * @returns Number of pending operations
     */
    getPendingCount(): number;

    /**
     * Check if the processor is currently processing
     * @returns True if processing, false otherwise
     */
    isProcessing(): boolean;

    /**
     * Register a callback for when processing completes
     * @param callback - Function to call when processing completes
     * @returns Function to unregister the callback
     */
    onProcessingComplete(callback: (result: ProcessResult) => void): () => void;
}

/**
 * Interface for the main plugin class
 */
export interface IPlugin {
    /**
     * Initialize the plugin and all its components
     * @returns Promise that resolves when initialization is complete
     */
    initialize(): Promise<void>;

    /**
     * Shutdown the plugin and clean up resources
     * @returns Promise that resolves when shutdown is complete
     */
    shutdown(): Promise<void>;

    /**
     * Enable the plugin functionality
     */
    enable(): void;

    /**
     * Disable the plugin functionality
     */
    disable(): void;

    /**
     * Check if the plugin is currently enabled
     * @returns True if enabled, false otherwise
     */
    isEnabled(): boolean;

    /**
     * Get the plugin version
     * @returns Plugin version string
     */
    getVersion(): string;

    /**
     * Get the plugin status information
     * @returns Plugin status object
     */
    getStatus(): {
        enabled: boolean;
        tracking: boolean;
        queueSize: number;
        stats: TrackingStats;
    };
}