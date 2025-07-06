/**
 * Centralized error handling and logging system
 */

export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    message: string;
    error?: Error;
    context?: Record<string, any>;
}

export class ErrorHandler {
    private logLevel: LogLevel = LogLevel.INFO;
    private enableLogging: boolean = true;
    private logHistory: LogEntry[] = [];
    private maxLogHistorySize: number = 1000;

    constructor(logLevel: LogLevel = LogLevel.INFO, enableLogging: boolean = true) {
        this.logLevel = logLevel;
        this.enableLogging = enableLogging;
    }

    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }

    setLoggingEnabled(enabled: boolean): void {
        this.enableLogging = enabled;
    }

    error(message: string, error?: Error, context?: Record<string, any>): void {
        this.log(LogLevel.ERROR, message, error, context);
        
        // Always show errors to user via console.error
        if (error) {
            console.error(`[Note View Tracker] ${message}:`, error);
        } else {
            console.error(`[Note View Tracker] ${message}`);
        }
    }

    warn(message: string, context?: Record<string, any>): void {
        this.log(LogLevel.WARN, message, undefined, context);
        
        if (this.shouldLog(LogLevel.WARN)) {
            console.warn(`[Note View Tracker] ${message}`, context || '');
        }
    }

    info(message: string, context?: Record<string, any>): void {
        this.log(LogLevel.INFO, message, undefined, context);
        
        if (this.shouldLog(LogLevel.INFO)) {
            console.info(`[Note View Tracker] ${message}`, context || '');
        }
    }

    debug(message: string, context?: Record<string, any>): void {
        this.log(LogLevel.DEBUG, message, undefined, context);
        
        if (this.shouldLog(LogLevel.DEBUG)) {
            console.debug(`[Note View Tracker] ${message}`, context || '');
        }
    }

    private log(level: LogLevel, message: string, error?: Error, context?: Record<string, any>): void {
        if (!this.enableLogging) return;

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            message,
            error,
            context
        };

        this.logHistory.push(entry);

        // Trim log history if it exceeds max size
        if (this.logHistory.length > this.maxLogHistorySize) {
            this.logHistory = this.logHistory.slice(-this.maxLogHistorySize);
        }
    }

    private shouldLog(level: LogLevel): boolean {
        return this.enableLogging && level <= this.logLevel;
    }

    getLogHistory(): LogEntry[] {
        return [...this.logHistory];
    }

    clearLogHistory(): void {
        this.logHistory = [];
    }

    getRecentErrors(minutes: number = 10): LogEntry[] {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.logHistory.filter(entry => 
            entry.level === LogLevel.ERROR && entry.timestamp >= cutoff
        );
    }

    exportLogs(): string {
        return this.logHistory.map(entry => {
            const timestamp = new Date(entry.timestamp).toISOString();
            const levelName = LogLevel[entry.level];
            let line = `[${timestamp}] ${levelName}: ${entry.message}`;
            
            if (entry.error) {
                line += `\n  Error: ${entry.error.message}`;
                if (entry.error.stack) {
                    line += `\n  Stack: ${entry.error.stack}`;
                }
            }
            
            if (entry.context) {
                line += `\n  Context: ${JSON.stringify(entry.context)}`;
            }
            
            return line;
        }).join('\n');
    }

    // Helper methods for common error scenarios
    handleFrontmatterError(filePath: string, operation: string, error: Error): void {
        this.error(`Frontmatter ${operation} failed for file: ${filePath}`, error, {
            filePath,
            operation,
            component: 'FrontmatterManager'
        });
    }

    handleCacheError(operation: string, error: Error, context?: Record<string, any>): void {
        this.error(`Cache ${operation} failed`, error, {
            ...context,
            component: 'CacheManager',
            operation
        });
    }

    handleBatchProcessorError(operation: string, error: Error, context?: Record<string, any>): void {
        this.error(`Batch processor ${operation} failed`, error, {
            ...context,
            component: 'BatchProcessor',
            operation
        });
    }

    handlePathFilterError(filePath: string, error: Error): void {
        this.error(`Path filter error for file: ${filePath}`, error, {
            filePath,
            component: 'PathFilter'
        });
    }

    handleDataProviderError(operation: string, error: Error, context?: Record<string, any>): void {
        this.error(`Data provider ${operation} failed`, error, {
            ...context,
            component: 'DataProvider',
            operation
        });
    }

    // Performance monitoring
    measurePerformance<T>(operation: string, fn: () => T): T {
        const start = performance.now();
        try {
            const result = fn();
            const duration = performance.now() - start;
            
            if (duration > 100) { // Log slow operations
                this.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`, {
                    operation,
                    duration,
                    component: 'PerformanceMonitor'
                });
            } else {
                this.debug(`Operation ${operation} completed in ${duration.toFixed(2)}ms`, {
                    operation,
                    duration
                });
            }
            
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`Operation ${operation} failed after ${duration.toFixed(2)}ms`, error as Error, {
                operation,
                duration,
                component: 'PerformanceMonitor'
            });
            throw error;
        }
    }

    async measureAsyncPerformance<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            
            if (duration > 100) {
                this.warn(`Slow async operation detected: ${operation} took ${duration.toFixed(2)}ms`, {
                    operation,
                    duration,
                    component: 'PerformanceMonitor'
                });
            } else {
                this.debug(`Async operation ${operation} completed in ${duration.toFixed(2)}ms`, {
                    operation,
                    duration
                });
            }
            
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(`Async operation ${operation} failed after ${duration.toFixed(2)}ms`, error as Error, {
                operation,
                duration,
                component: 'PerformanceMonitor'
            });
            throw error;
        }
    }

    // Health check functionality
    getHealthStatus(): {
        status: 'healthy' | 'warning' | 'error';
        recentErrors: number;
        message: string;
    } {
        const recentErrors = this.getRecentErrors(5); // Last 5 minutes
        
        if (recentErrors.length === 0) {
            return {
                status: 'healthy',
                recentErrors: 0,
                message: 'No recent errors detected'
            };
        } else if (recentErrors.length < 3) {
            return {
                status: 'warning',
                recentErrors: recentErrors.length,
                message: `${recentErrors.length} error(s) in the last 5 minutes`
            };
        } else {
            return {
                status: 'error',
                recentErrors: recentErrors.length,
                message: `${recentErrors.length} errors in the last 5 minutes - check logs`
            };
        }
    }
}