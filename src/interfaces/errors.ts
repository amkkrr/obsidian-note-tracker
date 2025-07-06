/**
 * Error codes for different types of plugin errors
 */
export enum ErrorCode {
    // Configuration errors
    INVALID_CONFIG = 'INVALID_CONFIG',
    CONFIG_VALIDATION_FAILED = 'CONFIG_VALIDATION_FAILED',
    CONFIG_IMPORT_FAILED = 'CONFIG_IMPORT_FAILED',
    CONFIG_EXPORT_FAILED = 'CONFIG_EXPORT_FAILED',
    CONFIG_MIGRATION_FAILED = 'CONFIG_MIGRATION_FAILED',
    
    // Frontmatter errors
    FRONTMATTER_PARSE_ERROR = 'FRONTMATTER_PARSE_ERROR',
    FRONTMATTER_UPDATE_FAILED = 'FRONTMATTER_UPDATE_FAILED',
    FRONTMATTER_CREATE_FAILED = 'FRONTMATTER_CREATE_FAILED',
    FRONTMATTER_INVALID_FORMAT = 'FRONTMATTER_INVALID_FORMAT',
    FRONTMATTER_BACKUP_FAILED = 'FRONTMATTER_BACKUP_FAILED',
    
    // File access errors
    FILE_NOT_FOUND = 'FILE_NOT_FOUND',
    FILE_ACCESS_DENIED = 'FILE_ACCESS_DENIED',
    FILE_READ_ERROR = 'FILE_READ_ERROR',
    FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
    FILE_LOCK_ERROR = 'FILE_LOCK_ERROR',
    FILE_CORRUPTION = 'FILE_CORRUPTION',
    
    // Batch processing errors
    BATCH_OPERATION_FAILED = 'BATCH_OPERATION_FAILED',
    BATCH_TIMEOUT = 'BATCH_TIMEOUT',
    BATCH_INTERRUPTED = 'BATCH_INTERRUPTED',
    BATCH_QUEUE_FULL = 'BATCH_QUEUE_FULL',
    BATCH_INVALID_OPERATION = 'BATCH_INVALID_OPERATION',
    
    // Validation errors
    VALIDATION_FAILED = 'VALIDATION_FAILED',
    INVALID_PATH = 'INVALID_PATH',
    INVALID_KEY = 'INVALID_KEY',
    INVALID_VALUE = 'INVALID_VALUE',
    INVALID_OPERATION = 'INVALID_OPERATION',
    
    // Cache errors
    CACHE_WRITE_ERROR = 'CACHE_WRITE_ERROR',
    CACHE_READ_ERROR = 'CACHE_READ_ERROR',
    CACHE_CORRUPTION = 'CACHE_CORRUPTION',
    CACHE_MEMORY_EXHAUSTED = 'CACHE_MEMORY_EXHAUSTED',
    
    // System errors
    INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
    SHUTDOWN_FAILED = 'SHUTDOWN_FAILED',
    RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
    MEMORY_LIMIT_EXCEEDED = 'MEMORY_LIMIT_EXCEEDED',
    OPERATION_TIMEOUT = 'OPERATION_TIMEOUT',
    
    // Plugin errors
    PLUGIN_NOT_INITIALIZED = 'PLUGIN_NOT_INITIALIZED',
    PLUGIN_ALREADY_INITIALIZED = 'PLUGIN_ALREADY_INITIALIZED',
    PLUGIN_DISABLED = 'PLUGIN_DISABLED',
    PLUGIN_INCOMPATIBLE = 'PLUGIN_INCOMPATIBLE',
    
    // Generic errors
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    EXTERNAL_ERROR = 'EXTERNAL_ERROR'
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
    /** Low severity - informational only */
    LOW = 'low',
    
    /** Medium severity - warning */
    MEDIUM = 'medium',
    
    /** High severity - error */
    HIGH = 'high',
    
    /** Critical severity - fatal error */
    CRITICAL = 'critical'
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
    /** Configuration related errors */
    CONFIGURATION = 'configuration',
    
    /** File system operations */
    FILE_SYSTEM = 'file_system',
    
    /** Data processing */
    DATA_PROCESSING = 'data_processing',
    
    /** User interface */
    USER_INTERFACE = 'user_interface',
    
    /** Performance issues */
    PERFORMANCE = 'performance',
    
    /** Security issues */
    SECURITY = 'security',
    
    /** Network operations */
    NETWORK = 'network',
    
    /** System resources */
    SYSTEM = 'system',
    
    /** Third party integrations */
    THIRD_PARTY = 'third_party',
    
    /** Unknown category */
    UNKNOWN = 'unknown'
}

/**
 * Base plugin error class with enhanced error information
 */
export abstract class PluginError extends Error {
    /** Error code for programmatic handling */
    public readonly code: ErrorCode;
    
    /** Error severity level */
    public readonly severity: ErrorSeverity;
    
    /** Error category */
    public readonly category: ErrorCategory;
    
    /** Additional error details */
    public readonly details: Record<string, any>;
    
    /** Timestamp when error occurred */
    public readonly timestamp: number;
    
    /** Error context information */
    public readonly context: string;
    
    /** Whether this error is recoverable */
    public readonly isRecoverable: boolean;
    
    /** Suggested recovery actions */
    public readonly recoveryActions: string[];
    
    /** Error correlation ID for tracking related errors */
    public readonly correlationId: string;
    
    /** Stack trace from the original error */
    public readonly originalStack?: string;
    
    /** Retry count for this error */
    public retryCount: number = 0;
    
    /** Maximum retry attempts */
    public readonly maxRetries: number;

    constructor(
        message: string,
        code: ErrorCode,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        category: ErrorCategory = ErrorCategory.UNKNOWN,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = false,
        recoveryActions: string[] = [],
        maxRetries: number = 3
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.severity = severity;
        this.category = category;
        this.details = { ...details };
        this.timestamp = Date.now();
        this.context = context;
        this.isRecoverable = isRecoverable;
        this.recoveryActions = [...recoveryActions];
        this.correlationId = this.generateCorrelationId();
        this.maxRetries = maxRetries;
        
        // Capture stack trace
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Generate a unique correlation ID for error tracking
     */
    private generateCorrelationId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get a formatted error message with context
     */
    public getFormattedMessage(): string {
        const contextPart = this.context ? ` [${this.context}]` : '';
        const detailsPart = Object.keys(this.details).length > 0 
            ? ` Details: ${JSON.stringify(this.details)}` 
            : '';
        return `${this.message}${contextPart}${detailsPart}`;
    }

    /**
     * Get error information as a plain object
     */
    public toObject(): Record<string, any> {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            severity: this.severity,
            category: this.category,
            details: this.details,
            timestamp: this.timestamp,
            context: this.context,
            isRecoverable: this.isRecoverable,
            recoveryActions: this.recoveryActions,
            correlationId: this.correlationId,
            retryCount: this.retryCount,
            maxRetries: this.maxRetries,
            stack: this.stack
        };
    }

    /**
     * Create a clone of this error with updated retry count
     */
    public withRetry(): this {
        const cloned = Object.create(Object.getPrototypeOf(this));
        Object.assign(cloned, this);
        cloned.retryCount = this.retryCount + 1;
        return cloned;
    }

    /**
     * Check if this error can be retried
     */
    public canRetry(): boolean {
        return this.isRecoverable && this.retryCount < this.maxRetries;
    }
}

/**
 * Configuration related errors
 */
export class ConfigError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.INVALID_CONFIG,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = true
    ) {
        super(
            message,
            code,
            ErrorSeverity.MEDIUM,
            ErrorCategory.CONFIGURATION,
            details,
            context,
            isRecoverable,
            ['Check configuration values', 'Reset to defaults', 'Validate configuration schema']
        );
    }
}

/**
 * Frontmatter operation errors
 */
export class FrontmatterError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.FRONTMATTER_UPDATE_FAILED,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = true
    ) {
        super(
            message,
            code,
            ErrorSeverity.MEDIUM,
            ErrorCategory.DATA_PROCESSING,
            details,
            context,
            isRecoverable,
            ['Retry operation', 'Check file permissions', 'Verify file format', 'Create backup']
        );
    }
}

/**
 * File access errors
 */
export class FileAccessError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.FILE_ACCESS_DENIED,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = true
    ) {
        super(
            message,
            code,
            ErrorSeverity.HIGH,
            ErrorCategory.FILE_SYSTEM,
            details,
            context,
            isRecoverable,
            ['Check file permissions', 'Verify file exists', 'Free up disk space', 'Close file in other applications']
        );
    }
}

/**
 * Batch processing errors
 */
export class BatchProcessingError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.BATCH_OPERATION_FAILED,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = true
    ) {
        super(
            message,
            code,
            ErrorSeverity.MEDIUM,
            ErrorCategory.DATA_PROCESSING,
            details,
            context,
            isRecoverable,
            ['Retry batch operation', 'Reduce batch size', 'Check system resources', 'Clear processing queue']
        );
    }
}

/**
 * Validation errors
 */
export class ValidationError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.VALIDATION_FAILED,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = true
    ) {
        super(
            message,
            code,
            ErrorSeverity.MEDIUM,
            ErrorCategory.DATA_PROCESSING,
            details,
            context,
            isRecoverable,
            ['Correct invalid values', 'Check data format', 'Validate against schema', 'Use default values']
        );
    }
}

/**
 * Cache operation errors
 */
export class CacheError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.CACHE_WRITE_ERROR,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = true
    ) {
        super(
            message,
            code,
            ErrorSeverity.LOW,
            ErrorCategory.PERFORMANCE,
            details,
            context,
            isRecoverable,
            ['Clear cache', 'Reduce cache size', 'Check memory usage', 'Restart caching system']
        );
    }
}

/**
 * System resource errors
 */
export class SystemError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.RESOURCE_EXHAUSTED,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = false
    ) {
        super(
            message,
            code,
            ErrorSeverity.HIGH,
            ErrorCategory.SYSTEM,
            details,
            context,
            isRecoverable,
            ['Free up system resources', 'Restart application', 'Check system health', 'Contact support']
        );
    }
}

/**
 * Plugin lifecycle errors
 */
export class PluginLifecycleError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.INITIALIZATION_FAILED,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = false
    ) {
        super(
            message,
            code,
            ErrorSeverity.CRITICAL,
            ErrorCategory.SYSTEM,
            details,
            context,
            isRecoverable,
            ['Restart plugin', 'Check plugin compatibility', 'Reset plugin data', 'Reinstall plugin']
        );
    }
}

/**
 * Timeout errors
 */
export class TimeoutError extends PluginError {
    constructor(
        message: string,
        timeout: number,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = true
    ) {
        super(
            message,
            ErrorCode.OPERATION_TIMEOUT,
            ErrorSeverity.MEDIUM,
            ErrorCategory.PERFORMANCE,
            { ...details, timeout },
            context,
            isRecoverable,
            ['Increase timeout', 'Retry operation', 'Check system performance', 'Reduce operation complexity']
        );
    }
}

/**
 * Network operation errors
 */
export class NetworkError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.EXTERNAL_ERROR,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = true
    ) {
        super(
            message,
            code,
            ErrorSeverity.MEDIUM,
            ErrorCategory.NETWORK,
            details,
            context,
            isRecoverable,
            ['Check network connection', 'Retry request', 'Check service availability', 'Use offline mode']
        );
    }
}

/**
 * Security related errors
 */
export class SecurityError extends PluginError {
    constructor(
        message: string,
        code: ErrorCode = ErrorCode.FILE_ACCESS_DENIED,
        details: Record<string, any> = {},
        context: string = '',
        isRecoverable: boolean = false
    ) {
        super(
            message,
            code,
            ErrorSeverity.HIGH,
            ErrorCategory.SECURITY,
            details,
            context,
            isRecoverable,
            ['Check permissions', 'Verify user credentials', 'Review security settings', 'Contact administrator']
        );
    }
}

/**
 * Error factory for creating specific error types
 */
export class ErrorFactory {
    /**
     * Create a configuration error
     */
    static createConfigError(
        message: string,
        field?: string,
        value?: any,
        expected?: string
    ): ConfigError {
        return new ConfigError(
            message,
            ErrorCode.INVALID_CONFIG,
            { field, value, expected }
        );
    }

    /**
     * Create a frontmatter error
     */
    static createFrontmatterError(
        message: string,
        filePath?: string,
        operation?: string
    ): FrontmatterError {
        return new FrontmatterError(
            message,
            ErrorCode.FRONTMATTER_UPDATE_FAILED,
            { filePath, operation }
        );
    }

    /**
     * Create a file access error
     */
    static createFileAccessError(
        message: string,
        filePath?: string,
        operation?: string
    ): FileAccessError {
        return new FileAccessError(
            message,
            ErrorCode.FILE_ACCESS_DENIED,
            { filePath, operation }
        );
    }

    /**
     * Create a validation error
     */
    static createValidationError(
        message: string,
        field?: string,
        value?: any,
        rule?: string
    ): ValidationError {
        return new ValidationError(
            message,
            ErrorCode.VALIDATION_FAILED,
            { field, value, rule }
        );
    }

    /**
     * Create a timeout error
     */
    static createTimeoutError(
        operation: string,
        timeout: number
    ): TimeoutError {
        return new TimeoutError(
            `Operation '${operation}' timed out after ${timeout}ms`,
            timeout,
            { operation }
        );
    }

    /**
     * Create a system error
     */
    static createSystemError(
        message: string,
        resource?: string,
        usage?: number,
        limit?: number
    ): SystemError {
        return new SystemError(
            message,
            ErrorCode.RESOURCE_EXHAUSTED,
            { resource, usage, limit }
        );
    }

    /**
     * Wrap an unknown error into a PluginError
     */
    static wrapUnknownError(
        error: unknown,
        context: string = '',
        isRecoverable: boolean = false
    ): PluginError {
        if (error instanceof PluginError) {
            return error;
        }

        let message = 'An unknown error occurred';
        let details: Record<string, any> = {};

        if (error instanceof Error) {
            message = error.message;
            details = {
                name: error.name,
                stack: error.stack,
                originalError: error
            };
        } else if (typeof error === 'string') {
            message = error;
        } else if (error && typeof error === 'object') {
            details = { originalError: error };
        }

        return new (class extends PluginError {})( // Anonymous class to avoid polluting the error hierarchy
            message,
            ErrorCode.UNKNOWN_ERROR,
            ErrorSeverity.MEDIUM,
            ErrorCategory.UNKNOWN,
            details,
            context,
            isRecoverable,
            ['Check error details', 'Retry operation', 'Report to developers']
        );
    }
}

/**
 * Error handler interface
 */
export interface IErrorHandler {
    /**
     * Handle an error
     * @param error - The error to handle
     * @param context - Additional context
     */
    handleError(error: PluginError, context?: string): void;

    /**
     * Handle multiple errors
     * @param errors - Array of errors to handle
     * @param context - Additional context
     */
    handleErrors(errors: PluginError[], context?: string): void;

    /**
     * Check if an error should be retried
     * @param error - The error to check
     * @returns True if error should be retried
     */
    shouldRetry(error: PluginError): boolean;

    /**
     * Get retry delay for an error
     * @param error - The error to get delay for
     * @returns Retry delay in milliseconds
     */
    getRetryDelay(error: PluginError): number;

    /**
     * Log an error
     * @param error - The error to log
     * @param context - Additional context
     */
    logError(error: PluginError, context?: string): void;

    /**
     * Notify user of an error
     * @param error - The error to notify about
     * @param showToUser - Whether to show to user
     */
    notifyError(error: PluginError, showToUser?: boolean): void;
}

/**
 * Error collection for batch error handling
 */
export class ErrorCollection {
    private errors: PluginError[] = [];

    /**
     * Add an error to the collection
     */
    add(error: PluginError): void {
        this.errors.push(error);
    }

    /**
     * Get all errors
     */
    getAll(): PluginError[] {
        return [...this.errors];
    }

    /**
     * Get errors by severity
     */
    getBySeverity(severity: ErrorSeverity): PluginError[] {
        return this.errors.filter(error => error.severity === severity);
    }

    /**
     * Get errors by category
     */
    getByCategory(category: ErrorCategory): PluginError[] {
        return this.errors.filter(error => error.category === category);
    }

    /**
     * Get recoverable errors
     */
    getRecoverable(): PluginError[] {
        return this.errors.filter(error => error.isRecoverable);
    }

    /**
     * Get count of errors
     */
    count(): number {
        return this.errors.length;
    }

    /**
     * Check if collection has errors
     */
    hasErrors(): boolean {
        return this.errors.length > 0;
    }

    /**
     * Clear all errors
     */
    clear(): void {
        this.errors = [];
    }

    /**
     * Get most severe error
     */
    getMostSevere(): PluginError | null {
        if (this.errors.length === 0) return null;
        
        const severityOrder = [ErrorSeverity.CRITICAL, ErrorSeverity.HIGH, ErrorSeverity.MEDIUM, ErrorSeverity.LOW];
        for (const severity of severityOrder) {
            const error = this.errors.find(e => e.severity === severity);
            if (error) return error;
        }
        
        return this.errors[0];
    }
}