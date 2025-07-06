/**
 * Data types and interfaces for the configuration management system
 */

/** Plugin configuration interface */
export interface PluginConfig {
    /** Counter key name in frontmatter */
    counterKey: string;
    /** List of paths to include in tracking */
    includedPaths: string[];
    /** List of paths to exclude from tracking */
    excludedPaths: string[];
    /** Whether to include subdirectories recursively */
    recursive: boolean;
    /** Minimum interval between counting (ms) to prevent duplicates */
    minInterval: number;
    /** Maximum batch size for processing */
    batchSize: number;
    /** Maximum cache size for tracking records */
    maxCacheSize: number;
    /** Whether the plugin is enabled */
    enabled: boolean;
    /** Whether debug mode is enabled */
    debugMode: boolean;
    /** Automatic flush interval (ms) */
    autoFlushInterval: number;
    /** Configuration version for migration */
    version: string;
    /** Theme preference */
    theme: 'light' | 'dark' | 'auto';
    /** Language preference */
    language: string;
    /** Performance settings */
    performance: {
        /** Maximum concurrent operations */
        maxConcurrentOps: number;
        /** Cache cleanup interval (ms) */
        cacheCleanupInterval: number;
        /** Enable background processing */
        enableBackgroundProcessing: boolean;
    };
}

/** Update operation interface */
export interface UpdateOperation {
    /** Target file */
    file: any; // TFile from Obsidian
    /** Counter key name */
    key: string;
    /** New counter value */
    value: number;
    /** Operation timestamp */
    timestamp: number;
    /** Retry count */
    retryCount: number;
    /** Operation priority */
    priority?: 'low' | 'normal' | 'high';
}

/** Counter update interface */
export interface CounterUpdate {
    /** Target file */
    file: any; // TFile from Obsidian
    /** Counter key name */
    key: string;
    /** New counter value */
    value: number;
}

/** Access record interface */
export interface AccessRecord {
    /** File path */
    filePath: string;
    /** Last access timestamp */
    lastAccess: number;
    /** Total access count */
    accessCount: number;
    /** First access timestamp */
    firstAccess: number;
}

/** Validation result interface */
export interface ValidationResult {
    /** Whether validation passed */
    isValid: boolean;
    /** List of validation errors */
    errors: string[];
    /** List of validation warnings */
    warnings: string[];
}

/** Batch update result interface */
export interface BatchUpdateResult {
    /** Number of successful updates */
    successCount: number;
    /** Number of failed updates */
    failureCount: number;
    /** List of failed operations */
    failures: FailedOperation[];
    /** Processing time in milliseconds */
    processingTime: number;
}

/** Failed operation interface */
export interface FailedOperation {
    /** Original operation */
    operation: UpdateOperation;
    /** Error message */
    error: string;
    /** Failure timestamp */
    failureTime: number;
}

/** Processing result interface */
export interface ProcessResult {
    /** Number of processed operations */
    processedCount: number;
    /** Number of successful operations */
    successCount: number;
    /** Number of failed operations */
    failureCount: number;
    /** Processing time in milliseconds */
    processingTime: number;
    /** List of failed operations */
    failures: FailedOperation[];
}

/** Tracking statistics interface */
export interface TrackingStats {
    /** Total access count */
    totalAccesses: number;
    /** Number of processed files */
    processedFiles: number;
    /** Number of skipped accesses */
    skippedAccesses: number;
    /** Number of errors */
    errorCount: number;
    /** Tracking start time */
    startTime: number;
    /** Last activity time */
    lastActivityTime: number;
}

/** Queue status interface */
export interface QueueStatus {
    /** Current queue size */
    queueSize: number;
    /** Whether processing is active */
    isProcessing: boolean;
    /** Whether processing is paused */
    isPaused: boolean;
    /** Next flush time */
    nextFlushTime: number;
    /** High priority operation count */
    highPriorityCount: number;
}

/** Filter rules interface */
export interface FilterRules {
    /** List of include paths */
    includePaths: string[];
    /** List of exclude paths */
    excludePaths: string[];
    /** Whether to include subdirectories recursively */
    recursive: boolean;
    /** Allowed file extensions */
    allowedExtensions: string[];
    /** Minimum file size in bytes */
    minFileSize: number;
    /** Maximum file size in bytes */
    maxFileSize: number;
}

/** Configuration error class */
export class ConfigError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: any
    ) {
        super(message);
        this.name = 'ConfigError';
    }
}

/** Configuration validation error codes */
export enum ConfigErrorCode {
    INVALID_COUNTER_KEY = 'INVALID_COUNTER_KEY',
    INVALID_PATH = 'INVALID_PATH',
    INVALID_INTERVAL = 'INVALID_INTERVAL',
    INVALID_BATCH_SIZE = 'INVALID_BATCH_SIZE',
    INVALID_CACHE_SIZE = 'INVALID_CACHE_SIZE',
    INVALID_VERSION = 'INVALID_VERSION',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
    INVALID_TYPE = 'INVALID_TYPE',
    INVALID_RANGE = 'INVALID_RANGE',
    PARSE_ERROR = 'PARSE_ERROR',
    STORAGE_ERROR = 'STORAGE_ERROR',
    MIGRATION_ERROR = 'MIGRATION_ERROR'
}

/** Configuration migration context */
export interface MigrationContext {
    /** Source version */
    fromVersion: string;
    /** Target version */
    toVersion: string;
    /** Migration timestamp */
    timestamp: number;
    /** Original configuration */
    originalConfig: any;
    /** Migrated configuration */
    migratedConfig?: PluginConfig;
    /** Migration errors */
    errors: string[];
    /** Migration warnings */
    warnings: string[];
}

/** Configuration change event */
export interface ConfigChangeEvent {
    /** Event type */
    type: 'config-changed';
    /** Previous configuration */
    previousConfig: PluginConfig;
    /** New configuration */
    newConfig: PluginConfig;
    /** Changed fields */
    changedFields: string[];
    /** Event timestamp */
    timestamp: number;
}

/** Configuration backup information */
export interface ConfigBackup {
    /** Backup timestamp */
    timestamp: number;
    /** Configuration version */
    version: string;
    /** Backup configuration */
    config: PluginConfig;
    /** Backup reason */
    reason: string;
}

/** Storage options interface */
export interface StorageOptions {
    /** Storage key */
    key: string;
    /** Whether to encrypt data */
    encrypted: boolean;
    /** Compression enabled */
    compressed: boolean;
    /** Backup retention count */
    backupRetention: number;
}

/** Configuration theme */
export type ConfigTheme = 'light' | 'dark' | 'auto';

/** Configuration language */
export type ConfigLanguage = 'en' | 'zh' | 'es' | 'fr' | 'de' | 'ja' | 'ko';

/** Default configuration values */
export const DEFAULT_CONFIG: PluginConfig = {
    counterKey: 'access_count',
    includedPaths: [],
    excludedPaths: [],
    recursive: true,
    minInterval: 1000,
    batchSize: 10,
    maxCacheSize: 1000,
    enabled: true,
    debugMode: false,
    autoFlushInterval: 5000,
    version: '1.0.0',
    theme: 'auto',
    language: 'en',
    performance: {
        maxConcurrentOps: 5,
        cacheCleanupInterval: 60000,
        enableBackgroundProcessing: true
    }
};

/** Configuration validation rules */
export const CONFIG_VALIDATION_RULES = {
    counterKey: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/
    },
    includedPaths: {
        required: true,
        type: 'array',
        maxItems: 100
    },
    excludedPaths: {
        required: true,
        type: 'array',
        maxItems: 100
    },
    recursive: {
        required: true,
        type: 'boolean'
    },
    minInterval: {
        required: true,
        type: 'number',
        minimum: 0,
        maximum: 3600000
    },
    batchSize: {
        required: true,
        type: 'number',
        minimum: 1,
        maximum: 1000
    },
    maxCacheSize: {
        required: true,
        type: 'number',
        minimum: 10,
        maximum: 10000
    },
    enabled: {
        required: true,
        type: 'boolean'
    },
    debugMode: {
        required: true,
        type: 'boolean'
    },
    autoFlushInterval: {
        required: true,
        type: 'number',
        minimum: 1000,
        maximum: 3600000
    },
    version: {
        required: true,
        type: 'string',
        pattern: /^\d+\.\d+\.\d+$/
    },
    theme: {
        required: true,
        type: 'string',
        enum: ['light', 'dark', 'auto']
    },
    language: {
        required: true,
        type: 'string',
        enum: ['en', 'zh', 'es', 'fr', 'de', 'ja', 'ko']
    }
} as const;