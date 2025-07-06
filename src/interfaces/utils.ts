import { PluginConfig, ValidationResult, CacheEntry, CacheStats } from './data-types';

/**
 * Log levels for the logger
 */
export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4
}

/**
 * Log entry interface
 */
export interface LogEntry {
    /** Log level */
    level: LogLevel;
    
    /** Log message */
    message: string;
    
    /** Timestamp */
    timestamp: number;
    
    /** Additional data */
    data?: any;
    
    /** Context/source */
    context?: string;
    
    /** Correlation ID */
    correlationId?: string;
    
    /** Session ID */
    sessionId?: string;
    
    /** User ID */
    userId?: string;
    
    /** Stack trace (for errors) */
    stackTrace?: string;
}

/**
 * Logger interface for structured logging
 */
export interface ILogger {
    /**
     * Log a debug message
     * @param message - Log message
     * @param data - Additional data
     * @param context - Context information
     */
    debug(message: string, data?: any, context?: string): void;

    /**
     * Log an informational message
     * @param message - Log message
     * @param data - Additional data
     * @param context - Context information
     */
    info(message: string, data?: any, context?: string): void;

    /**
     * Log a warning message
     * @param message - Log message
     * @param data - Additional data
     * @param context - Context information
     */
    warn(message: string, data?: any, context?: string): void;

    /**
     * Log an error message
     * @param message - Log message
     * @param error - Error object or additional data
     * @param context - Context information
     */
    error(message: string, error?: any, context?: string): void;

    /**
     * Log a fatal error message
     * @param message - Log message
     * @param error - Error object or additional data
     * @param context - Context information
     */
    fatal(message: string, error?: any, context?: string): void;

    /**
     * Set the minimum log level
     * @param level - Minimum log level
     */
    setLevel(level: LogLevel): void;

    /**
     * Get the current log level
     */
    getLevel(): LogLevel;

    /**
     * Check if a log level is enabled
     * @param level - Log level to check
     */
    isLevelEnabled(level: LogLevel): boolean;

    /**
     * Set the log context
     * @param context - Context string
     */
    setContext(context: string): void;

    /**
     * Get the current context
     */
    getContext(): string;

    /**
     * Create a child logger with additional context
     * @param context - Additional context
     */
    child(context: string): ILogger;

    /**
     * Flush any pending log entries
     */
    flush(): Promise<void>;

    /**
     * Get log history
     * @param limit - Maximum number of entries to return
     */
    getHistory(limit?: number): LogEntry[];

    /**
     * Clear log history
     */
    clearHistory(): void;

    /**
     * Set correlation ID for request tracking
     * @param correlationId - Correlation ID
     */
    setCorrelationId(correlationId: string): void;

    /**
     * Set session ID for session tracking
     * @param sessionId - Session ID
     */
    setSessionId(sessionId: string): void;
}

/**
 * Validator interface for data validation
 */
export interface IValidator {
    /**
     * Validate a file path
     * @param path - File path to validate
     * @returns True if valid, false otherwise
     */
    isValidPath(path: string): boolean;

    /**
     * Validate a counter key name
     * @param key - Key name to validate
     * @returns True if valid, false otherwise
     */
    isValidCounterKey(key: string): boolean;

    /**
     * Validate plugin configuration
     * @param config - Configuration to validate
     * @returns Validation result
     */
    validateConfig(config: PluginConfig): ValidationResult;

    /**
     * Normalize and clean a file path
     * @param path - Path to normalize
     * @returns Normalized path
     */
    normalizePath(path: string): string;

    /**
     * Validate a time interval
     * @param interval - Interval in milliseconds
     * @returns True if valid, false otherwise
     */
    isValidInterval(interval: number): boolean;

    /**
     * Validate a file extension
     * @param extension - File extension to validate
     * @returns True if valid, false otherwise
     */
    isValidExtension(extension: string): boolean;

    /**
     * Validate a frontmatter key
     * @param key - Key to validate
     * @returns True if valid, false otherwise
     */
    isValidFrontmatterKey(key: string): boolean;

    /**
     * Validate a frontmatter value
     * @param value - Value to validate
     * @returns True if valid, false otherwise
     */
    isValidFrontmatterValue(value: any): boolean;

    /**
     * Validate a regex pattern
     * @param pattern - Pattern to validate
     * @returns True if valid, false otherwise
     */
    isValidRegex(pattern: string): boolean;

    /**
     * Validate a date format string
     * @param format - Date format to validate
     * @returns True if valid, false otherwise
     */
    isValidDateFormat(format: string): boolean;

    /**
     * Validate a numeric range
     * @param value - Value to validate
     * @param min - Minimum value
     * @param max - Maximum value
     * @returns True if valid, false otherwise
     */
    isInRange(value: number, min: number, max: number): boolean;

    /**
     * Validate an array of values
     * @param values - Array to validate
     * @param validator - Validation function for each value
     * @returns True if all values are valid, false otherwise
     */
    validateArray<T>(values: T[], validator: (value: T) => boolean): boolean;

    /**
     * Sanitize a string value
     * @param value - String to sanitize
     * @returns Sanitized string
     */
    sanitizeString(value: string): string;

    /**
     * Validate and sanitize HTML content
     * @param html - HTML content to validate
     * @returns Sanitized HTML or null if invalid
     */
    sanitizeHtml(html: string): string | null;

    /**
     * Validate a JSON string
     * @param json - JSON string to validate
     * @returns True if valid JSON, false otherwise
     */
    isValidJson(json: string): boolean;

    /**
     * Validate a URL
     * @param url - URL to validate
     * @returns True if valid URL, false otherwise
     */
    isValidUrl(url: string): boolean;

    /**
     * Validate an email address
     * @param email - Email to validate
     * @returns True if valid email, false otherwise
     */
    isValidEmail(email: string): boolean;
}

/**
 * Generic cache manager interface
 */
export interface ICacheManager<K, V> {
    /**
     * Get a value from the cache
     * @param key - Cache key
     * @returns Cached value or undefined if not found
     */
    get(key: K): V | undefined;

    /**
     * Set a value in the cache
     * @param key - Cache key
     * @param value - Value to cache
     * @param ttl - Time-to-live in milliseconds (optional)
     */
    set(key: K, value: V, ttl?: number): void;

    /**
     * Check if a key exists in the cache
     * @param key - Cache key
     * @returns True if key exists, false otherwise
     */
    has(key: K): boolean;

    /**
     * Delete a value from the cache
     * @param key - Cache key
     * @returns True if deleted, false if not found
     */
    delete(key: K): boolean;

    /**
     * Clear all cache entries
     */
    clear(): void;

    /**
     * Get the number of cache entries
     * @returns Number of cache entries
     */
    size(): number;

    /**
     * Get all cache keys
     * @returns Array of cache keys
     */
    keys(): K[];

    /**
     * Get all cache values
     * @returns Array of cache values
     */
    values(): V[];

    /**
     * Get all cache entries
     * @returns Array of key-value pairs
     */
    entries(): Array<[K, V]>;

    /**
     * Clean up expired entries
     * @returns Number of entries cleaned up
     */
    cleanup(): number;

    /**
     * Get cache statistics
     * @returns Cache statistics
     */
    getStats(): CacheStats;

    /**
     * Set the maximum cache size
     * @param size - Maximum number of entries
     */
    setMaxSize(size: number): void;

    /**
     * Get the maximum cache size
     * @returns Maximum number of entries
     */
    getMaxSize(): number;

    /**
     * Set the default TTL for cache entries
     * @param ttl - Default TTL in milliseconds
     */
    setDefaultTtl(ttl: number): void;

    /**
     * Get the default TTL
     * @returns Default TTL in milliseconds
     */
    getDefaultTtl(): number;

    /**
     * Pin an entry to prevent eviction
     * @param key - Cache key
     * @returns True if pinned, false if not found
     */
    pin(key: K): boolean;

    /**
     * Unpin an entry
     * @param key - Cache key
     * @returns True if unpinned, false if not found
     */
    unpin(key: K): boolean;

    /**
     * Check if an entry is pinned
     * @param key - Cache key
     * @returns True if pinned, false otherwise
     */
    isPinned(key: K): boolean;

    /**
     * Get a cache entry with metadata
     * @param key - Cache key
     * @returns Cache entry or undefined if not found
     */
    getEntry(key: K): CacheEntry<V> | undefined;

    /**
     * Batch set multiple entries
     * @param entries - Array of key-value pairs
     */
    setMultiple(entries: Array<[K, V]>): void;

    /**
     * Batch get multiple entries
     * @param keys - Array of cache keys
     * @returns Map of found entries
     */
    getMultiple(keys: K[]): Map<K, V>;

    /**
     * Batch delete multiple entries
     * @param keys - Array of cache keys
     * @returns Number of entries deleted
     */
    deleteMultiple(keys: K[]): number;

    /**
     * Register a callback for cache events
     * @param event - Event type
     * @param callback - Callback function
     * @returns Function to unregister the callback
     */
    on(event: 'set' | 'get' | 'delete' | 'clear' | 'expire', callback: (key: K, value?: V) => void): () => void;

    /**
     * Emit a cache event
     * @param event - Event type
     * @param key - Cache key
     * @param value - Cache value (optional)
     */
    emit(event: 'set' | 'get' | 'delete' | 'clear' | 'expire', key: K, value?: V): void;
}

/**
 * Performance monitor interface
 */
export interface IPerformanceMonitor {
    /**
     * Start a performance measurement
     * @param name - Measurement name
     * @returns Performance mark ID
     */
    start(name: string): string;

    /**
     * End a performance measurement
     * @param markId - Performance mark ID
     * @returns Duration in milliseconds
     */
    end(markId: string): number;

    /**
     * Record a performance metric
     * @param name - Metric name
     * @param value - Metric value
     * @param unit - Metric unit
     */
    record(name: string, value: number, unit?: string): void;

    /**
     * Get performance metrics
     * @param name - Metric name (optional)
     * @returns Performance metrics
     */
    getMetrics(name?: string): PerformanceMetric[];

    /**
     * Clear performance metrics
     * @param name - Metric name (optional, clears all if not provided)
     */
    clearMetrics(name?: string): void;

    /**
     * Get performance summary
     * @returns Performance summary
     */
    getSummary(): PerformanceSummary;

    /**
     * Enable or disable performance monitoring
     * @param enabled - Whether to enable monitoring
     */
    setEnabled(enabled: boolean): void;

    /**
     * Check if performance monitoring is enabled
     * @returns True if enabled, false otherwise
     */
    isEnabled(): boolean;

    /**
     * Set the maximum number of metrics to keep
     * @param max - Maximum number of metrics
     */
    setMaxMetrics(max: number): void;

    /**
     * Get memory usage information
     * @returns Memory usage information
     */
    getMemoryUsage(): MemoryUsage;

    /**
     * Start monitoring memory usage
     */
    startMemoryMonitoring(): void;

    /**
     * Stop monitoring memory usage
     */
    stopMemoryMonitoring(): void;

    /**
     * Get CPU usage information
     * @returns CPU usage information
     */
    getCpuUsage(): CpuUsage;

    /**
     * Register a performance threshold
     * @param name - Metric name
     * @param threshold - Threshold value
     * @param callback - Callback when threshold is exceeded
     */
    registerThreshold(name: string, threshold: number, callback: (value: number) => void): void;

    /**
     * Unregister a performance threshold
     * @param name - Metric name
     */
    unregisterThreshold(name: string): void;
}

/**
 * Performance metric interface
 */
export interface PerformanceMetric {
    /** Metric name */
    name: string;
    
    /** Metric value */
    value: number;
    
    /** Metric unit */
    unit: string;
    
    /** Timestamp */
    timestamp: number;
    
    /** Additional metadata */
    metadata?: Record<string, any>;
}

/**
 * Performance summary interface
 */
export interface PerformanceSummary {
    /** Total number of metrics */
    totalMetrics: number;
    
    /** Average values by metric name */
    averages: Record<string, number>;
    
    /** Minimum values by metric name */
    minimums: Record<string, number>;
    
    /** Maximum values by metric name */
    maximums: Record<string, number>;
    
    /** Standard deviations by metric name */
    standardDeviations: Record<string, number>;
    
    /** Percentiles by metric name */
    percentiles: Record<string, { p50: number; p95: number; p99: number }>;
    
    /** Summary timestamp */
    timestamp: number;
}

/**
 * Memory usage interface
 */
export interface MemoryUsage {
    /** Used memory in bytes */
    used: number;
    
    /** Total memory in bytes */
    total: number;
    
    /** Usage percentage */
    percentage: number;
    
    /** Heap used in bytes */
    heapUsed: number;
    
    /** Heap total in bytes */
    heapTotal: number;
    
    /** External memory in bytes */
    external: number;
    
    /** Resident set size in bytes */
    rss: number;
    
    /** Array buffers in bytes */
    arrayBuffers: number;
}

/**
 * CPU usage interface
 */
export interface CpuUsage {
    /** CPU usage percentage */
    percentage: number;
    
    /** User CPU time in microseconds */
    user: number;
    
    /** System CPU time in microseconds */
    system: number;
    
    /** Load average */
    loadAverage: number[];
    
    /** Number of CPU cores */
    cores: number;
}

/**
 * Utility functions interface
 */
export interface IUtils {
    /**
     * Generate a unique ID
     * @param prefix - Optional prefix
     * @returns Unique ID string
     */
    generateId(prefix?: string): string;

    /**
     * Generate a UUID
     * @returns UUID string
     */
    generateUuid(): string;

    /**
     * Generate a hash from a string
     * @param input - Input string
     * @param algorithm - Hash algorithm (default: SHA-256)
     * @returns Hash string
     */
    generateHash(input: string, algorithm?: string): string;

    /**
     * Debounce a function
     * @param func - Function to debounce
     * @param delay - Delay in milliseconds
     * @returns Debounced function
     */
    debounce<T extends (...args: any[]) => any>(func: T, delay: number): T;

    /**
     * Throttle a function
     * @param func - Function to throttle
     * @param limit - Time limit in milliseconds
     * @returns Throttled function
     */
    throttle<T extends (...args: any[]) => any>(func: T, limit: number): T;

    /**
     * Deep clone an object
     * @param obj - Object to clone
     * @returns Cloned object
     */
    deepClone<T>(obj: T): T;

    /**
     * Deep merge objects
     * @param target - Target object
     * @param sources - Source objects
     * @returns Merged object
     */
    deepMerge<T>(target: T, ...sources: Partial<T>[]): T;

    /**
     * Check if two objects are deeply equal
     * @param obj1 - First object
     * @param obj2 - Second object
     * @returns True if equal, false otherwise
     */
    deepEqual(obj1: any, obj2: any): boolean;

    /**
     * Convert bytes to human readable format
     * @param bytes - Number of bytes
     * @returns Human readable string
     */
    formatBytes(bytes: number): string;

    /**
     * Convert milliseconds to human readable format
     * @param ms - Number of milliseconds
     * @returns Human readable string
     */
    formatDuration(ms: number): string;

    /**
     * Convert timestamp to human readable format
     * @param timestamp - Timestamp
     * @param format - Date format
     * @returns Formatted date string
     */
    formatDate(timestamp: number, format?: string): string;

    /**
     * Retry a function with exponential backoff
     * @param func - Function to retry
     * @param maxRetries - Maximum number of retries
     * @param initialDelay - Initial delay in milliseconds
     * @returns Promise that resolves with function result
     */
    retry<T>(func: () => Promise<T>, maxRetries: number, initialDelay: number): Promise<T>;

    /**
     * Sleep for a specified duration
     * @param ms - Duration in milliseconds
     * @returns Promise that resolves after the duration
     */
    sleep(ms: number): Promise<void>;

    /**
     * Create a timeout promise
     * @param promise - Promise to timeout
     * @param timeout - Timeout in milliseconds
     * @returns Promise that resolves or rejects with timeout
     */
    withTimeout<T>(promise: Promise<T>, timeout: number): Promise<T>;

    /**
     * Batch process an array of items
     * @param items - Items to process
     * @param batchSize - Batch size
     * @param processor - Processing function
     * @returns Promise that resolves when all items are processed
     */
    batchProcess<T, R>(items: T[], batchSize: number, processor: (batch: T[]) => Promise<R[]>): Promise<R[]>;

    /**
     * Escape HTML characters
     * @param html - HTML string
     * @returns Escaped HTML string
     */
    escapeHtml(html: string): string;

    /**
     * Unescape HTML characters
     * @param html - Escaped HTML string
     * @returns Unescaped HTML string
     */
    unescapeHtml(html: string): string;

    /**
     * Escape regex characters
     * @param regex - Regex string
     * @returns Escaped regex string
     */
    escapeRegex(regex: string): string;

    /**
     * Convert string to kebab-case
     * @param str - Input string
     * @returns Kebab-case string
     */
    toKebabCase(str: string): string;

    /**
     * Convert string to camelCase
     * @param str - Input string
     * @returns CamelCase string
     */
    toCamelCase(str: string): string;

    /**
     * Convert string to PascalCase
     * @param str - Input string
     * @returns PascalCase string
     */
    toPascalCase(str: string): string;

    /**
     * Convert string to snake_case
     * @param str - Input string
     * @returns Snake_case string
     */
    toSnakeCase(str: string): string;

    /**
     * Truncate a string
     * @param str - Input string
     * @param length - Maximum length
     * @param ellipsis - Ellipsis string
     * @returns Truncated string
     */
    truncate(str: string, length: number, ellipsis?: string): string;

    /**
     * Check if a value is empty
     * @param value - Value to check
     * @returns True if empty, false otherwise
     */
    isEmpty(value: any): boolean;

    /**
     * Check if a value is a plain object
     * @param value - Value to check
     * @returns True if plain object, false otherwise
     */
    isPlainObject(value: any): boolean;

    /**
     * Check if a value is a function
     * @param value - Value to check
     * @returns True if function, false otherwise
     */
    isFunction(value: any): boolean;

    /**
     * Check if a value is a string
     * @param value - Value to check
     * @returns True if string, false otherwise
     */
    isString(value: any): boolean;

    /**
     * Check if a value is a number
     * @param value - Value to check
     * @returns True if number, false otherwise
     */
    isNumber(value: any): boolean;

    /**
     * Check if a value is a boolean
     * @param value - Value to check
     * @returns True if boolean, false otherwise
     */
    isBoolean(value: any): boolean;

    /**
     * Check if a value is an array
     * @param value - Value to check
     * @returns True if array, false otherwise
     */
    isArray(value: any): boolean;

    /**
     * Check if a value is null or undefined
     * @param value - Value to check
     * @returns True if null or undefined, false otherwise
     */
    isNullOrUndefined(value: any): boolean;
}