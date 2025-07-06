import { IBatchProcessor } from './interfaces/core';
import { UpdateOperation, ProcessResult, QueueStatus, FailedOperation } from './interfaces/data-types';
import { IFrontmatterManager } from './interfaces/core';
import { withDebouncing } from './decorators/with-debouncing';

export class BatchProcessor implements IBatchProcessor {
    private queue: UpdateOperation[] = [];
    private maxBatchSize: number = 10;
    private flushInterval: number = 5000;
    private isProcessing: boolean = false;
    private isPaused: boolean = false;
    private flushTimer?: NodeJS.Timeout;
    private completionCallbacks: Array<(result: ProcessResult) => void> = [];
    private frontmatterManager: IFrontmatterManager;

    constructor(frontmatterManager: IFrontmatterManager) {
        this.frontmatterManager = frontmatterManager;
        this.startAutoFlush();
    }

    enqueueUpdate(operation: UpdateOperation): void {
        if (this.isPaused) {
            return;
        }

        // Add timestamp and initialize retry count if not present
        const enrichedOperation: UpdateOperation = {
            ...operation,
            timestamp: operation.timestamp || Date.now(),
            retryCount: operation.retryCount || 0,
            priority: operation.priority || 'normal'
        };

        // Insert based on priority
        if (enrichedOperation.priority === 'high') {
            this.queue.unshift(enrichedOperation);
        } else {
            this.queue.push(enrichedOperation);
        }

        // Auto-flush if batch size is reached
        if (this.queue.length >= this.maxBatchSize) {
            this.debouncedFlush();
        }
    }

    async flush(): Promise<ProcessResult> {
        if (this.isProcessing || this.queue.length === 0) {
            return this.createEmptyResult();
        }

        this.isProcessing = true;
        const startTime = Date.now();
        const batch = this.queue.splice(0, this.maxBatchSize);
        
        const result: ProcessResult = {
            processedCount: batch.length,
            successCount: 0,
            failureCount: 0,
            processingTime: 0,
            failures: []
        };

        try {
            // Process batch updates
            for (const operation of batch) {
                try {
                    await this.processOperation(operation);
                    result.successCount++;
                } catch (error) {
                    result.failureCount++;
                    result.failures.push({
                        operation,
                        error: error instanceof Error ? error.message : 'Unknown error',
                        failureTime: Date.now()
                    });

                    // Retry logic for failed operations
                    if (operation.retryCount < 3) {
                        operation.retryCount++;
                        this.queue.push(operation);
                    }
                }
            }

            result.processingTime = Date.now() - startTime;
            
            // Notify completion callbacks
            this.completionCallbacks.forEach(callback => {
                try {
                    callback(result);
                } catch (error) {
                    console.error('Error in completion callback:', error);
                }
            });

            return result;
        } finally {
            this.isProcessing = false;
        }
    }

    setMaxBatchSize(size: number): void {
        this.maxBatchSize = Math.max(1, size);
    }

    setFlushInterval(interval: number): void {
        this.flushInterval = Math.max(1000, interval);
        this.restartAutoFlush();
    }

    getQueueStatus(): QueueStatus {
        const highPriorityCount = this.queue.filter(op => op.priority === 'high').length;
        
        return {
            queueSize: this.queue.length,
            isProcessing: this.isProcessing,
            isPaused: this.isPaused,
            nextFlushTime: this.flushTimer ? Date.now() + this.flushInterval : 0,
            highPriorityCount
        };
    }

    pause(): void {
        this.isPaused = true;
        this.stopAutoFlush();
    }

    resume(): void {
        this.isPaused = false;
        this.startAutoFlush();
    }

    clear(): void {
        this.queue = [];
    }

    getPendingCount(): number {
        return this.queue.length;
    }

    isProcessing(): boolean {
        return this.isProcessing;
    }

    onProcessingComplete(callback: (result: ProcessResult) => void): () => void {
        this.completionCallbacks.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.completionCallbacks.indexOf(callback);
            if (index > -1) {
                this.completionCallbacks.splice(index, 1);
            }
        };
    }

    // Create debounced flush method
    private debouncedFlush = withDebouncing(
        () => this.flush(),
        500 // 500ms debounce delay
    );

    private async processOperation(operation: UpdateOperation): Promise<void> {
        // Get current count and increment by operation value
        const currentCount = await this.frontmatterManager.readCounter(operation.file, operation.key);
        const newCount = currentCount + operation.value;
        
        await this.frontmatterManager.updateCounter(
            operation.file,
            operation.key,
            newCount
        );
    }

    private startAutoFlush(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
        }

        this.flushTimer = setInterval(() => {
            if (!this.isPaused && this.queue.length > 0) {
                this.debouncedFlush();
            }
        }, this.flushInterval);
    }

    private stopAutoFlush(): void {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = undefined;
        }
    }

    private restartAutoFlush(): void {
        this.stopAutoFlush();
        this.startAutoFlush();
    }

    private createEmptyResult(): ProcessResult {
        return {
            processedCount: 0,
            successCount: 0,
            failureCount: 0,
            processingTime: 0,
            failures: []
        };
    }

    // Cleanup method
    destroy(): void {
        this.stopAutoFlush();
        this.clear();
        this.completionCallbacks = [];
    }

    // Additional utility methods
    getOperationsByPriority(priority: 'low' | 'normal' | 'high'): UpdateOperation[] {
        return this.queue.filter(op => op.priority === priority);
    }

    getOldestOperation(): UpdateOperation | undefined {
        return this.queue.reduce((oldest, current) => {
            return !oldest || current.timestamp < oldest.timestamp ? current : oldest;
        }, undefined as UpdateOperation | undefined);
    }

    getQueuedFilePaths(): string[] {
        return [...new Set(this.queue.map(op => op.file.path))];
    }

    removeOperationsForFile(filePath: string): number {
        const initialLength = this.queue.length;
        this.queue = this.queue.filter(op => op.file.path !== filePath);
        return initialLength - this.queue.length;
    }
}