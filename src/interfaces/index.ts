/**
 * Obsidian Note Tracker Plugin - TypeScript Interface Definitions
 * 
 * This file provides a unified export point for all interface definitions
 * used throughout the plugin. The interfaces are organized into logical
 * groups for better maintainability and type safety.
 * 
 * @version 1.0.0
 * @author Obsidian Note Tracker Team
 */

// Core interfaces - Main plugin functionality
export {
    IAccessTracker,
    IFrontmatterManager,
    IConfigManager,
    IPathFilter,
    IBatchProcessor,
    IPlugin
} from './core';

// Data types - Core data structures and configurations
export {
    // Main types
    PluginConfig,
    UpdateOperation,
    CounterUpdate,
    AccessRecord,
    
    // Result types
    ValidationResult,
    ValidationError,
    ValidationWarning,
    BatchUpdateResult,
    FailedOperation,
    ProcessResult,
    ProcessingStats,
    
    // Status and statistics
    TrackingStats,
    QueueStatus,
    FilterRules,
    CacheEntry,
    CacheStats,
    FileMetadata,
    PluginState,
    
    // Enums and unions
    Priority,
    AccessType
} from './data-types';

// Event system - Event definitions and handling
export {
    // Event types and enums
    PluginEventType,
    EventData,
    
    // Specific event data interfaces
    FileAccessedEventData,
    CounterUpdatedEventData,
    ConfigChangedEventData,
    BatchProcessedEventData,
    ErrorOccurredEventData,
    TrackingStartedEventData,
    TrackingStoppedEventData,
    PluginInitializedEventData,
    PluginShutdownEventData,
    CacheClearedEventData,
    QueueFlushedEventData,
    FrontmatterCreatedEventData,
    ValidationFailedEventData,
    PerformanceWarningEventData,
    MemoryWarningEventData,
    RetryAttemptedEventData,
    OperationTimeoutEventData,
    
    // Supporting interfaces
    AccessPattern,
    
    // Event emitter
    IEventEmitter,
    EventListener,
    SafeEventListener,
    EventEmitterOptions
} from './events';

// Error handling - Comprehensive error management
export {
    // Error enums
    ErrorCode,
    ErrorSeverity,
    ErrorCategory,
    
    // Error classes
    PluginError,
    ConfigError,
    FrontmatterError,
    FileAccessError,
    BatchProcessingError,
    ValidationError,
    CacheError,
    SystemError,
    PluginLifecycleError,
    TimeoutError,
    NetworkError,
    SecurityError,
    
    // Error utilities
    ErrorFactory,
    ErrorCollection,
    IErrorHandler
} from './errors';

// Utility interfaces - Supporting functionality
export {
    // Logging
    LogLevel,
    LogEntry,
    ILogger,
    
    // Validation
    IValidator,
    
    // Caching
    ICacheManager,
    
    // Performance monitoring
    IPerformanceMonitor,
    PerformanceMetric,
    PerformanceSummary,
    MemoryUsage,
    CpuUsage,
    
    // General utilities
    IUtils
} from './utils';

// Type guards for runtime type checking
export namespace TypeGuards {
    /**
     * Check if an object is a valid PluginConfig
     */
    export function isPluginConfig(obj: any): obj is PluginConfig {
        return obj &&
            typeof obj.counterKey === 'string' &&
            Array.isArray(obj.includedPaths) &&
            Array.isArray(obj.excludedPaths) &&
            typeof obj.recursive === 'boolean' &&
            typeof obj.minInterval === 'number' &&
            typeof obj.batchSize === 'number' &&
            typeof obj.maxCacheSize === 'number' &&
            typeof obj.enabled === 'boolean' &&
            typeof obj.debugMode === 'boolean' &&
            typeof obj.autoFlushInterval === 'number';
    }

    /**
     * Check if an object is a valid UpdateOperation
     */
    export function isUpdateOperation(obj: any): obj is UpdateOperation {
        return obj &&
            obj.file &&
            typeof obj.key === 'string' &&
            typeof obj.value === 'number' &&
            typeof obj.timestamp === 'number' &&
            typeof obj.retryCount === 'number' &&
            ['low', 'normal', 'high'].includes(obj.priority) &&
            typeof obj.id === 'string';
    }

    /**
     * Check if an object is a valid ValidationResult
     */
    export function isValidationResult(obj: any): obj is ValidationResult {
        return obj &&
            typeof obj.isValid === 'boolean' &&
            Array.isArray(obj.errors) &&
            Array.isArray(obj.warnings) &&
            typeof obj.timestamp === 'number' &&
            typeof obj.context === 'string';
    }

    /**
     * Check if an object is a PluginError
     */
    export function isPluginError(obj: any): obj is PluginError {
        return obj instanceof Error &&
            'code' in obj &&
            'severity' in obj &&
            'category' in obj &&
            'timestamp' in obj;
    }

    /**
     * Check if a value is a valid Priority
     */
    export function isPriority(value: any): value is Priority {
        return ['low', 'normal', 'high'].includes(value);
    }

    /**
     * Check if a value is a valid AccessType
     */
    export function isAccessType(value: any): value is AccessType {
        return ['open', 'modify', 'close', 'create', 'delete', 'rename'].includes(value);
    }

    /**
     * Check if a value is a valid LogLevel
     */
    export function isLogLevel(value: any): value is LogLevel {
        return Object.values(LogLevel).includes(value);
    }

    /**
     * Check if a value is a valid ErrorCode
     */
    export function isErrorCode(value: any): value is ErrorCode {
        return Object.values(ErrorCode).includes(value);
    }

    /**
     * Check if a value is a valid PluginEventType
     */
    export function isPluginEventType(value: any): value is PluginEventType {
        return Object.values(PluginEventType).includes(value);
    }
}

// Utility types for enhanced type safety
export namespace UtilityTypes {
    /**
     * Make all properties of T optional recursively
     */
    export type DeepPartial<T> = {
        [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
    };

    /**
     * Make all properties of T required recursively
     */
    export type DeepRequired<T> = {
        [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
    };

    /**
     * Make specific keys K of T optional
     */
    export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

    /**
     * Make specific keys K of T required
     */
    export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

    /**
     * Extract keys of T that are of type U
     */
    export type KeysOfType<T, U> = {
        [K in keyof T]: T[K] extends U ? K : never;
    }[keyof T];

    /**
     * Extract properties of T that are of type U
     */
    export type PropertiesOfType<T, U> = Pick<T, KeysOfType<T, U>>;

    /**
     * Create a type that excludes null and undefined
     */
    export type NonNullable<T> = T extends null | undefined ? never : T;

    /**
     * Create a union type from object values
     */
    export type ValueOf<T> = T[keyof T];

    /**
     * Create a type for function arguments
     */
    export type Args<T> = T extends (...args: infer A) => any ? A : never;

    /**
     * Create a type for function return value
     */
    export type Return<T> = T extends (...args: any[]) => infer R ? R : never;

    /**
     * Create a promise type from T
     */
    export type Promisify<T> = T extends PromiseLike<infer U> ? T : Promise<T>;

    /**
     * Extract non-promise type from T
     */
    export type Unpromisify<T> = T extends PromiseLike<infer U> ? U : T;

    /**
     * Create a readonly deep type
     */
    export type DeepReadonly<T> = {
        readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
    };

    /**
     * Create a mutable version of a readonly type
     */
    export type Mutable<T> = {
        -readonly [P in keyof T]: T[P];
    };

    /**
     * Create a type with string keys only
     */
    export type StringKeys<T> = Extract<keyof T, string>;

    /**
     * Create a type with number keys only
     */
    export type NumberKeys<T> = Extract<keyof T, number>;

    /**
     * Create a type with symbol keys only
     */
    export type SymbolKeys<T> = Extract<keyof T, symbol>;

    /**
     * Create a conditional type based on extends relationship
     */
    export type If<C extends boolean, T, F> = C extends true ? T : F;

    /**
     * Create a type that represents a constructor
     */
    export type Constructor<T = {}> = new (...args: any[]) => T;

    /**
     * Create a type that represents an abstract constructor
     */
    export type AbstractConstructor<T = {}> = abstract new (...args: any[]) => T;

    /**
     * Create a branded type for better type safety
     */
    export type Brand<T, B> = T & { __brand: B };

    /**
     * Create a nominal type for unique identification
     */
    export type Nominal<T, N extends string> = T & { __nominal: N };
}

// Re-export commonly used Obsidian types for convenience
export type { TFile, TFolder, Vault, Plugin, PluginSettingTab } from 'obsidian';

// Version information
export const VERSION = '1.0.0';
export const API_VERSION = '1.0.0';

/**
 * Default configuration values
 */
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
    maxRetries: 3,
    retryDelay: 1000,
    createFrontmatter: true,
    backupFiles: false,
    allowedExtensions: [],
    minFileSize: 0,
    maxFileSize: Number.MAX_SAFE_INTEGER,
    trackHiddenFiles: false,
    dateFormat: 'YYYY-MM-DD HH:mm:ss',
    addTimestamps: false,
    firstAccessKey: 'first_access',
    lastAccessKey: 'last_access'
};

/**
 * Constants for the plugin
 */
export const CONSTANTS = {
    PLUGIN_ID: 'obsidian-note-tracker',
    PLUGIN_NAME: 'Obsidian Note Tracker',
    MIN_OBSIDIAN_VERSION: '1.0.0',
    MAX_BATCH_SIZE: 100,
    MAX_CACHE_SIZE: 10000,
    MAX_RETRY_ATTEMPTS: 10,
    MIN_INTERVAL: 100,
    MAX_INTERVAL: 3600000, // 1 hour
    DEFAULT_TIMEOUT: 30000, // 30 seconds
    CORRELATION_ID_LENGTH: 16,
    SESSION_ID_LENGTH: 32
} as const;

// Type-only imports for documentation
import type { PluginConfig } from './data-types';