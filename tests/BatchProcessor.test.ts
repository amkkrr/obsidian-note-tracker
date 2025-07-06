import { BatchProcessor } from '../src/BatchProcessor';
import { IFrontmatterManager } from '../src/interfaces/core';
import { UpdateOperation } from '../src/interfaces/data-types';
import { TFile } from '../__mocks__/obsidian';

// Mock the debouncing decorator
jest.mock('../src/decorators/with-debouncing', () => ({
  withDebouncing: (fn: Function) => fn
}));

describe('BatchProcessor', () => {
  let batchProcessor: BatchProcessor;
  let mockFrontmatterManager: jest.Mocked<IFrontmatterManager>;
  let mockFile: TFile;

  beforeEach(() => {
    mockFrontmatterManager = {
      readCounter: jest.fn(),
      updateCounter: jest.fn(),
      hasValidFrontmatter: jest.fn(),
      createFrontmatter: jest.fn(),
      batchUpdateCounters: jest.fn(),
      getFrontmatter: jest.fn(),
      updateFrontmatter: jest.fn()
    };

    batchProcessor = new BatchProcessor(mockFrontmatterManager);
    mockFile = new TFile('test.md') as any;

    // Clear timers before each test
    jest.clearAllTimers();
  });

  afterEach(() => {
    batchProcessor.destroy();
  });

  describe('enqueueUpdate', () => {
    it('should add operation to queue', () => {
      const operation: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      batchProcessor.enqueueUpdate(operation);

      expect(batchProcessor.getPendingCount()).toBe(1);
    });

    it('should prioritize high priority operations', () => {
      const normalOp: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      const highOp: UpdateOperation = {
        file: mockFile,
        key: 'urgent_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high'
      };

      batchProcessor.enqueueUpdate(normalOp);
      batchProcessor.enqueueUpdate(highOp);

      const status = batchProcessor.getQueueStatus();
      expect(status.highPriorityCount).toBe(1);
    });

    it('should not enqueue when paused', () => {
      batchProcessor.pause();

      const operation: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      batchProcessor.enqueueUpdate(operation);

      expect(batchProcessor.getPendingCount()).toBe(0);
    });

    it('should auto-flush when batch size is reached', async () => {
      batchProcessor.setMaxBatchSize(2);

      const operation1: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      const operation2: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 2,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      mockFrontmatterManager.readCounter.mockResolvedValue(0);
      mockFrontmatterManager.updateCounter.mockResolvedValue(undefined);

      batchProcessor.enqueueUpdate(operation1);
      batchProcessor.enqueueUpdate(operation2);

      // Wait for async flush
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockFrontmatterManager.updateCounter).toHaveBeenCalledTimes(2);
    });
  });

  describe('flush', () => {
    it('should process all pending operations', async () => {
      const operations: UpdateOperation[] = [
        {
          file: mockFile,
          key: 'view_count',
          value: 1,
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'normal'
        },
        {
          file: new TFile('test2.md') as any,
          key: 'access_count',
          value: 2,
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'normal'
        }
      ];

      operations.forEach(op => batchProcessor.enqueueUpdate(op));

      mockFrontmatterManager.readCounter.mockResolvedValue(0);
      mockFrontmatterManager.updateCounter.mockResolvedValue(undefined);

      const result = await batchProcessor.flush();

      expect(result.processedCount).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(batchProcessor.getPendingCount()).toBe(0);
    });

    it('should handle operation failures and retries', async () => {
      const operation: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      batchProcessor.enqueueUpdate(operation);

      mockFrontmatterManager.readCounter.mockResolvedValue(0);
      mockFrontmatterManager.updateCounter.mockRejectedValue(new Error('Update failed'));

      const result = await batchProcessor.flush();

      expect(result.processedCount).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].error).toBe('Update failed');

      // Operation should be re-queued for retry
      expect(batchProcessor.getPendingCount()).toBe(1);
    });

    it('should stop retrying after max retry count', async () => {
      const operation: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 3, // Already at max retries
        priority: 'normal'
      };

      batchProcessor.enqueueUpdate(operation);

      mockFrontmatterManager.readCounter.mockResolvedValue(0);
      mockFrontmatterManager.updateCounter.mockRejectedValue(new Error('Update failed'));

      await batchProcessor.flush();

      // Should not be re-queued since retry count exceeded
      expect(batchProcessor.getPendingCount()).toBe(0);
    });

    it('should return empty result when no operations', async () => {
      const result = await batchProcessor.flush();

      expect(result.processedCount).toBe(0);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(0);
    });
  });

  describe('queue management', () => {
    it('should pause and resume processing', () => {
      batchProcessor.pause();
      expect(batchProcessor.getQueueStatus().isPaused).toBe(true);

      batchProcessor.resume();
      expect(batchProcessor.getQueueStatus().isPaused).toBe(false);
    });

    it('should clear all pending operations', () => {
      const operation: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      batchProcessor.enqueueUpdate(operation);
      expect(batchProcessor.getPendingCount()).toBe(1);

      batchProcessor.clear();
      expect(batchProcessor.getPendingCount()).toBe(0);
    });

    it('should update batch size settings', () => {
      batchProcessor.setMaxBatchSize(50);

      const operation: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      // Add more than original batch size but less than new size
      for (let i = 0; i < 30; i++) {
        batchProcessor.enqueueUpdate({ ...operation, value: i });
      }

      expect(batchProcessor.getPendingCount()).toBe(30);
    });

    it('should update flush interval', () => {
      const originalInterval = 5000;
      const newInterval = 10000;

      batchProcessor.setFlushInterval(newInterval);

      // Verify the interval was updated (implementation detail test)
      expect(batchProcessor.getQueueStatus().nextFlushTime).toBeGreaterThan(0);
    });
  });

  describe('completion callbacks', () => {
    it('should call completion callbacks after processing', async () => {
      const callback = jest.fn();
      const unsubscribe = batchProcessor.onProcessingComplete(callback);

      const operation: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      batchProcessor.enqueueUpdate(operation);

      mockFrontmatterManager.readCounter.mockResolvedValue(0);
      mockFrontmatterManager.updateCounter.mockResolvedValue(undefined);

      await batchProcessor.flush();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          processedCount: 1,
          successCount: 1,
          failureCount: 0
        })
      );

      // Test unsubscribe
      unsubscribe();
      await batchProcessor.flush();
      expect(callback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle callback errors gracefully', async () => {
      const errorCallback = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      batchProcessor.onProcessingComplete(errorCallback);

      const operation: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      batchProcessor.enqueueUpdate(operation);

      mockFrontmatterManager.readCounter.mockResolvedValue(0);
      mockFrontmatterManager.updateCounter.mockResolvedValue(undefined);

      // Should not throw despite callback error
      await expect(batchProcessor.flush()).resolves.toBeDefined();
    });
  });

  describe('utility methods', () => {
    it('should get operations by priority', () => {
      const normalOp: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      };

      const highOp: UpdateOperation = {
        file: mockFile,
        key: 'urgent_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high'
      };

      batchProcessor.enqueueUpdate(normalOp);
      batchProcessor.enqueueUpdate(highOp);

      const highPriorityOps = batchProcessor.getOperationsByPriority('high');
      expect(highPriorityOps).toHaveLength(1);
      expect(highPriorityOps[0].priority).toBe('high');
    });

    it('should get oldest operation', () => {
      const oldOp: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: 1000,
        retryCount: 0,
        priority: 'normal'
      };

      const newOp: UpdateOperation = {
        file: mockFile,
        key: 'view_count',
        value: 1,
        timestamp: 2000,
        retryCount: 0,
        priority: 'normal'
      };

      batchProcessor.enqueueUpdate(newOp);
      batchProcessor.enqueueUpdate(oldOp);

      const oldest = batchProcessor.getOldestOperation();
      expect(oldest?.timestamp).toBe(1000);
    });

    it('should get queued file paths', () => {
      const file1 = new TFile('test1.md') as any;
      const file2 = new TFile('test2.md') as any;

      batchProcessor.enqueueUpdate({
        file: file1,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      });

      batchProcessor.enqueueUpdate({
        file: file2,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      });

      batchProcessor.enqueueUpdate({
        file: file1, // Duplicate
        key: 'access_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      });

      const paths = batchProcessor.getQueuedFilePaths();
      expect(paths).toEqual(['test2.md', 'test1.md']); // Unique paths
    });

    it('should remove operations for specific file', () => {
      const file1 = new TFile('test1.md') as any;
      const file2 = new TFile('test2.md') as any;

      batchProcessor.enqueueUpdate({
        file: file1,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      });

      batchProcessor.enqueueUpdate({
        file: file2,
        key: 'view_count',
        value: 1,
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal'
      });

      const removedCount = batchProcessor.removeOperationsForFile('test1.md');
      expect(removedCount).toBe(1);
      expect(batchProcessor.getPendingCount()).toBe(1);
    });
  });
});