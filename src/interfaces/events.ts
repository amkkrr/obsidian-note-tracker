import { TFile } from 'obsidian';
import { AccessType, ProcessResult, PluginConfig, ValidationResult, BatchUpdateResult } from './data-types';

/**
 * Plugin event types enumeration
 */
export enum PluginEventType {
    /** File accessed event */
    FILE_ACCESSED = 'file-accessed',
    
    /** Counter updated event */
    COUNTER_UPDATED = 'counter-updated',
    
    /** Configuration changed event */
    CONFIG_CHANGED = 'config-changed',
    
    /** Batch processing completed event */
    BATCH_PROCESSED = 'batch-processed',
    
    /** Error occurred event */
    ERROR_OCCURRED = 'error-occurred',
    
    /** Tracking started event */
    TRACKING_STARTED = 'tracking-started',
    
    /** Tracking stopped event */
    TRACKING_STOPPED = 'tracking-stopped',
    
    /** Plugin initialized event */
    PLUGIN_INITIALIZED = 'plugin-initialized',
    
    /** Plugin shutdown event */
    PLUGIN_SHUTDOWN = 'plugin-shutdown',
    
    /** Cache cleared event */
    CACHE_CLEARED = 'cache-cleared',
    
    /** Queue flushed event */
    QUEUE_FLUSHED = 'queue-flushed',
    
    /** File filtered event */
    FILE_FILTERED = 'file-filtered',
    
    /** Frontmatter created event */
    FRONTMATTER_CREATED = 'frontmatter-created',
    
    /** Validation failed event */
    VALIDATION_FAILED = 'validation-failed',
    
    /** Performance warning event */
    PERFORMANCE_WARNING = 'performance-warning',
    
    /** Memory warning event */
    MEMORY_WARNING = 'memory-warning',
    
    /** Retry attempted event */
    RETRY_ATTEMPTED = 'retry-attempted',
    
    /** Operation timeout event */
    OPERATION_TIMEOUT = 'operation-timeout'
}

/**
 * Base interface for all event data
 */
export interface EventData {
    /** Event timestamp */
    timestamp: number;
    
    /** Event source identifier */
    source: string;
    
    /** Event correlation ID for tracking related events */
    correlationId?: string;
    
    /** Session ID */
    sessionId?: string;
    
    /** Additional event metadata */
    metadata?: Record<string, any>;
    
    /** Event severity level */
    severity: 'info' | 'warning' | 'error' | 'debug';
    
    /** Event version for schema evolution */
    version: string;
}

/**
 * File accessed event data
 */
export interface FileAccessedEventData extends EventData {
    /** The file that was accessed */
    file: TFile;
    
    /** Type of access (open, modify, close, etc.) */
    accessType: AccessType;
    
    /** Whether the access was counted */
    wasCounted: boolean;
    
    /** Reason why access was not counted (if applicable) */
    skipReason?: string;
    
    /** Previous access count */
    previousCount?: number;
    
    /** New access count */
    newCount?: number;
    
    /** Access duration in milliseconds */
    duration?: number;
    
    /** File size at time of access */
    fileSize: number;
    
    /** Whether file was modified during access */
    wasModified: boolean;
    
    /** Access pattern information */
    accessPattern?: AccessPattern;
}

/**
 * Access pattern information
 */
export interface AccessPattern {
    /** Recent access frequency */
    frequency: number;
    
    /** Access trend (increasing, decreasing, stable) */
    trend: 'increasing' | 'decreasing' | 'stable';
    
    /** Time since last access */
    timeSinceLastAccess: number;
    
    /** Whether this is a repeated access */
    isRepeated: boolean;
    
    /** Access sequence number */
    sequenceNumber: number;
}

/**
 * Counter updated event data
 */
export interface CounterUpdatedEventData extends EventData {
    /** The file that was updated */
    file: TFile;
    
    /** Counter key name */
    key: string;
    
    /** Previous counter value */
    oldValue: number;
    
    /** New counter value */
    newValue: number;
    
    /** Update method used */
    updateMethod: 'increment' | 'set' | 'batch';
    
    /** Whether frontmatter was created */
    frontmatterCreated: boolean;
    
    /** Update duration in milliseconds */
    updateDuration: number;
    
    /** Number of retry attempts */
    retryAttempts: number;
    
    /** Additional frontmatter fields updated */
    additionalFields?: Record<string, any>;
}

/**
 * Configuration changed event data
 */
export interface ConfigChangedEventData extends EventData {
    /** Previous configuration */
    oldConfig: PluginConfig;
    
    /** New configuration */
    newConfig: PluginConfig;
    
    /** List of changed configuration keys */
    changedKeys: string[];
    
    /** Whether configuration was imported */
    wasImported: boolean;
    
    /** Whether configuration was reset to defaults */
    wasReset: boolean;
    
    /** Configuration validation result */
    validationResult: ValidationResult;
    
    /** Configuration change source */
    changeSource: 'user' | 'import' | 'reset' | 'migration';
}

/**
 * Batch processed event data
 */
export interface BatchProcessedEventData extends EventData {
    /** Batch processing result */
    result: ProcessResult;
    
    /** Batch size */
    batchSize: number;
    
    /** Number of operations in batch */
    operationCount: number;
    
    /** Batch processing trigger */
    trigger: 'manual' | 'timer' | 'size' | 'priority';
    
    /** Whether processing was interrupted */
    wasInterrupted: boolean;
    
    /** Memory usage during processing */
    memoryUsage: number;
    
    /** CPU usage during processing */
    cpuUsage?: number;
}

/**
 * Error occurred event data
 */
export interface ErrorOccurredEventData extends EventData {
    /** Error message */
    message: string;
    
    /** Error code */
    code: string;
    
    /** Error type */
    type: 'FrontmatterError' | 'ConfigError' | 'FileAccessError' | 'BatchProcessingError' | 'ValidationError' | 'UnknownError';
    
    /** Stack trace */
    stackTrace?: string;
    
    /** Context where error occurred */
    context: string;
    
    /** Associated file (if applicable) */
    file?: TFile;
    
    /** Error details */
    details?: Record<string, any>;
    
    /** Whether error is recoverable */
    isRecoverable: boolean;
    
    /** Suggested recovery action */
    recoveryAction?: string;
    
    /** Number of times this error has occurred */
    occurrenceCount: number;
}

/**
 * Tracking started event data
 */
export interface TrackingStartedEventData extends EventData {
    /** Configuration at time of start */
    config: PluginConfig;
    
    /** Number of files in scope */
    filesInScope: number;
    
    /** Estimated memory usage */
    estimatedMemoryUsage: number;
    
    /** Tracking session ID */
    trackingSessionId: string;
    
    /** Previous tracking session end time */
    previousSessionEndTime?: number;
    
    /** Tracking mode */
    mode: 'full' | 'selective' | 'test';
}

/**
 * Tracking stopped event data
 */
export interface TrackingStoppedEventData extends EventData {
    /** Reason for stopping */
    reason: 'user' | 'error' | 'shutdown' | 'config_change';
    
    /** Tracking duration in milliseconds */
    duration: number;
    
    /** Final tracking statistics */
    finalStats: TrackingStats;
    
    /** Number of pending operations */
    pendingOperations: number;
    
    /** Whether pending operations were flushed */
    pendingFlushed: boolean;
    
    /** Tracking session ID */
    trackingSessionId: string;
}

/**
 * Plugin initialized event data
 */
export interface PluginInitializedEventData extends EventData {
    /** Plugin version */
    version: string;
    
    /** Initialization duration in milliseconds */
    initializationDuration: number;
    
    /** Configuration loaded */
    config: PluginConfig;
    
    /** Whether configuration was migrated */
    configMigrated: boolean;
    
    /** Number of files detected in scope */
    filesDetected: number;
    
    /** Initialization mode */
    mode: 'normal' | 'safe' | 'debug';
    
    /** Platform information */
    platform: {
        os: string;
        arch: string;
        obsidianVersion: string;
        nodeVersion?: string;
    };
}

/**
 * Plugin shutdown event data
 */
export interface PluginShutdownEventData extends EventData {
    /** Shutdown reason */
    reason: 'user' | 'error' | 'update' | 'obsidian_quit';
    
    /** Shutdown duration in milliseconds */
    shutdownDuration: number;
    
    /** Plugin uptime in milliseconds */
    uptime: number;
    
    /** Final tracking statistics */
    finalStats: TrackingStats;
    
    /** Number of operations processed during session */
    totalOperations: number;
    
    /** Whether shutdown was clean */
    wasClean: boolean;
    
    /** Resources cleaned up */
    resourcesCleaned: string[];
}

/**
 * Cache cleared event data
 */
export interface CacheClearedEventData extends EventData {
    /** Cache type that was cleared */
    cacheType: 'access' | 'frontmatter' | 'config' | 'validation' | 'all';
    
    /** Number of entries cleared */
    entriesCleared: number;
    
    /** Memory freed in bytes */
    memoryFreed: number;
    
    /** Clear reason */
    reason: 'manual' | 'memory_pressure' | 'config_change' | 'timeout' | 'error';
    
    /** Cache age in milliseconds */
    cacheAge: number;
    
    /** Whether clear was forced */
    wasForced: boolean;
}

/**
 * Queue flushed event data
 */
export interface QueueFlushedEventData extends EventData {
    /** Flush result */
    result: ProcessResult;
    
    /** Flush trigger */
    trigger: 'manual' | 'timer' | 'size' | 'shutdown' | 'memory_pressure';
    
    /** Queue size before flush */
    queueSizeBefore: number;
    
    /** Queue size after flush */
    queueSizeAfter: number;
    
    /** Flush duration in milliseconds */
    flushDuration: number;
    
    /** Whether flush was complete */
    wasComplete: boolean;
}

/**
 * Tracking statistics interface
 */
export interface TrackingStats {
    /** Total accesses processed */
    totalAccesses: number;
    
    /** Unique files processed */
    processedFiles: number;
    
    /** Accesses skipped */
    skippedAccesses: number;
    
    /** Errors encountered */
    errorCount: number;
    
    /** Tracking start time */
    startTime: number;
    
    /** Last activity time */
    lastActivityTime: number;
    
    /** Cache hits */
    cacheHits: number;
    
    /** Cache misses */
    cacheMisses: number;
    
    /** Batch operations */
    batchOperations: number;
    
    /** Total processing time */
    totalProcessingTime: number;
    
    /** Average processing time */
    averageProcessingTime: number;
    
    /** Peak memory usage */
    peakMemoryUsage: number;
    
    /** Frontmatter created */
    frontmatterCreated: number;
    
    /** Frontmatter updated */
    frontmatterUpdated: number;
}

/**
 * Frontmatter created event data
 */
export interface FrontmatterCreatedEventData extends EventData {
    /** File where frontmatter was created */
    file: TFile;
    
    /** Initial frontmatter data */
    initialData: Record<string, any>;
    
    /** Whether creation was automatic */
    wasAutomatic: boolean;
    
    /** Creation method */
    method: 'counter_update' | 'manual' | 'import' | 'migration';
    
    /** File size before creation */
    fileSizeBefore: number;
    
    /** File size after creation */
    fileSizeAfter: number;
    
    /** Creation duration in milliseconds */
    creationDuration: number;
}

/**
 * Validation failed event data
 */
export interface ValidationFailedEventData extends EventData {
    /** Validation result */
    validationResult: ValidationResult;
    
    /** Data that failed validation */
    data: any;
    
    /** Validation type */
    type: 'config' | 'file' | 'operation' | 'path' | 'value';
    
    /** Whether validation failure was critical */
    isCritical: boolean;
    
    /** Fallback action taken */
    fallbackAction?: string;
    
    /** Recovery suggestions */
    recoverySuggestions: string[];
}

/**
 * Performance warning event data
 */
export interface PerformanceWarningEventData extends EventData {
    /** Performance metric that triggered warning */
    metric: 'processing_time' | 'memory_usage' | 'queue_size' | 'cache_miss_rate' | 'io_operations';
    
    /** Current value */
    currentValue: number;
    
    /** Warning threshold */
    threshold: number;
    
    /** Recommended action */
    recommendedAction: string;
    
    /** Performance trend */
    trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
    
    /** Time since last warning */
    timeSinceLastWarning: number;
    
    /** Warning frequency */
    warningFrequency: number;
}

/**
 * Memory warning event data
 */
export interface MemoryWarningEventData extends EventData {
    /** Current memory usage in bytes */
    currentUsage: number;
    
    /** Memory limit in bytes */
    memoryLimit: number;
    
    /** Memory usage percentage */
    usagePercentage: number;
    
    /** Memory breakdown by component */
    memoryBreakdown: Record<string, number>;
    
    /** Recommended cleanup actions */
    cleanupActions: string[];
    
    /** Whether cleanup was performed automatically */
    autoCleanupPerformed: boolean;
}

/**
 * Retry attempted event data
 */
export interface RetryAttemptedEventData extends EventData {
    /** Operation that was retried */
    operation: string;
    
    /** Retry attempt number */
    attemptNumber: number;
    
    /** Maximum retry attempts */
    maxAttempts: number;
    
    /** Delay before retry in milliseconds */
    retryDelay: number;
    
    /** Original error that caused retry */
    originalError: string;
    
    /** Whether retry was successful */
    wasSuccessful: boolean;
    
    /** Time since first attempt */
    timeSinceFirstAttempt: number;
}

/**
 * Operation timeout event data
 */
export interface OperationTimeoutEventData extends EventData {
    /** Operation that timed out */
    operation: string;
    
    /** Timeout duration in milliseconds */
    timeout: number;
    
    /** Time elapsed before timeout */
    timeElapsed: number;
    
    /** Whether operation was cancelled */
    wasCancelled: boolean;
    
    /** Timeout reason */
    reason: 'user_configured' | 'system_limit' | 'resource_exhaustion' | 'deadlock_prevention';
    
    /** Recovery action taken */
    recoveryAction?: string;
}

/**
 * Generic event listener function type
 */
export type EventListener<T extends EventData = EventData> = (data: T) => void;

/**
 * Event listener with error handling
 */
export type SafeEventListener<T extends EventData = EventData> = (data: T) => void | Promise<void>;

/**
 * Event emitter interface
 */
export interface IEventEmitter {
    /**
     * Register an event listener
     * @param event - Event type to listen for
     * @param listener - Function to call when event occurs
     * @returns Function to unregister the listener
     */
    on<T extends EventData>(
        event: PluginEventType,
        listener: EventListener<T>
    ): () => void;

    /**
     * Register a one-time event listener
     * @param event - Event type to listen for
     * @param listener - Function to call when event occurs
     * @returns Function to unregister the listener
     */
    once<T extends EventData>(
        event: PluginEventType,
        listener: EventListener<T>
    ): () => void;

    /**
     * Emit an event to all registered listeners
     * @param event - Event type to emit
     * @param data - Event data
     */
    emit<T extends EventData>(event: PluginEventType, data: T): void;

    /**
     * Remove a specific event listener
     * @param event - Event type
     * @param listener - Listener function to remove
     * @returns True if listener was removed, false if not found
     */
    off<T extends EventData>(
        event: PluginEventType,
        listener: EventListener<T>
    ): boolean;

    /**
     * Remove all listeners for an event type, or all listeners if no event specified
     * @param event - Optional event type to remove listeners for
     */
    removeAllListeners(event?: PluginEventType): void;

    /**
     * Get the number of listeners for an event type
     * @param event - Event type
     * @returns Number of listeners
     */
    listenerCount(event: PluginEventType): number;

    /**
     * Get all event types that have listeners
     * @returns Array of event types
     */
    eventNames(): PluginEventType[];

    /**
     * Get all listeners for an event type
     * @param event - Event type
     * @returns Array of listener functions
     */
    listeners<T extends EventData>(event: PluginEventType): EventListener<T>[];

    /**
     * Set the maximum number of listeners for an event type
     * @param event - Event type
     * @param max - Maximum number of listeners
     */
    setMaxListeners(event: PluginEventType, max: number): void;

    /**
     * Get the maximum number of listeners for an event type
     * @param event - Event type
     * @returns Maximum number of listeners
     */
    getMaxListeners(event: PluginEventType): number;
}

/**
 * Event emitter options
 */
export interface EventEmitterOptions {
    /** Maximum number of listeners per event type */
    maxListeners?: number;
    
    /** Whether to emit warnings for memory leaks */
    warningOnMemoryLeak?: boolean;
    
    /** Whether to capture stack traces for listeners */
    captureStackTrace?: boolean;
    
    /** Whether to emit events asynchronously */
    asyncEmission?: boolean;
    
    /** Error handling strategy */
    errorHandling?: 'throw' | 'log' | 'ignore';
}