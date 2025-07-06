/**
 * 异步事件处理器实现
 * 
 * 提供了基于优先级队列的异步事件处理，支持并发控制、
 * 批处理、重试机制和背压控制
 */

import { 
  IAsyncProcessor, 
  IAsyncProcessorConfig, 
  IQueueStatus, 
  IProcessorStats, 
  IBaseEvent, 
  EventPriority, 
  EventStatus 
} from './interfaces';

/** 队列项 */
interface QueueItem {
  /** 事件对象 */
  event: IBaseEvent;
  /** 处理器函数 */
  processor: (event: IBaseEvent) => Promise<any>;
  /** 添加到队列的时间 */
  queueTime: number;
  /** 重试次数 */
  retryCount: number;
  /** 优先级 */
  priority: EventPriority;
  /** 处理承诺 */
  promise: {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
  };
}

/** 批处理项 */
interface BatchItem {
  /** 事件列表 */
  events: IBaseEvent[];
  /** 批处理器函数 */
  processor: (events: IBaseEvent[]) => Promise<any>;
  /** 创建时间 */
  createTime: number;
  /** 优先级 */
  priority: EventPriority;
}

/** 优先级队列实现 */
class PriorityQueue<T extends { priority: EventPriority }> {
  private items: T[] = [];

  /** 入队 */
  enqueue(item: T): void {
    // 按优先级插入
    let inserted = false;
    for (let i = 0; i < this.items.length; i++) {
      if (item.priority > this.items[i].priority) {
        this.items.splice(i, 0, item);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.items.push(item);
    }
  }

  /** 出队 */
  dequeue(): T | undefined {
    return this.items.shift();
  }

  /** 获取队列长度 */
  get length(): number {
    return this.items.length;
  }

  /** 检查队列是否为空 */
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  /** 清空队列 */
  clear(): void {
    this.items = [];
  }

  /** 获取队列中的所有项 */
  getItems(): T[] {
    return [...this.items];
  }

  /** 根据条件移除项 */
  removeIf(predicate: (item: T) => boolean): T[] {
    const removed: T[] = [];
    this.items = this.items.filter(item => {
      if (predicate(item)) {
        removed.push(item);
        return false;
      }
      return true;
    });
    return removed;
  }
}

/** 异步事件处理器 */
export class AsyncEventProcessor implements IAsyncProcessor {
  private queue = new PriorityQueue<QueueItem>();
  private batchQueue = new PriorityQueue<BatchItem>();
  private isRunning = false;
  private currentProcessing = 0;
  private stats: IProcessorStats = {
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    avgProcessingTime: 0,
    maxProcessingTime: 0,
    currentQueueSize: 0,
    errorRate: 0,
  };

  private processingTimes: number[] = [];
  private batchProcessor?: (events: IBaseEvent[]) => Promise<any>;
  private batchTimeout?: NodeJS.Timeout;
  private currentBatch: IBaseEvent[] = [];

  constructor(public config: IAsyncProcessorConfig) {
    this.validateConfig();
  }

  /** 验证配置 */
  private validateConfig(): void {
    if (this.config.maxConcurrency <= 0) {
      throw new Error('maxConcurrency must be greater than 0');
    }
    
    if (this.config.maxQueueSize <= 0) {
      throw new Error('maxQueueSize must be greater than 0');
    }
    
    if (this.config.timeoutMs <= 0) {
      throw new Error('timeoutMs must be greater than 0');
    }
  }

  /** 开始处理 */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    // 启动处理循环
    for (let i = 0; i < this.config.maxConcurrency; i++) {
      this.processLoop();
    }

    // 如果启用批处理，启动批处理循环
    if (this.config.batchProcessing) {
      this.startBatchProcessing();
    }
  }

  /** 停止处理 */
  async stop(): Promise<void> {
    this.isRunning = false;
    
    // 等待当前处理完成
    while (this.currentProcessing > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 清理批处理定时器
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }

    // 处理剩余的批处理项
    if (this.currentBatch.length > 0) {
      await this.processBatch();
    }
  }

  /** 添加事件到队列 */
  async enqueue(event: IBaseEvent): Promise<void> {
    return new Promise((resolve, reject) => {
      // 检查队列是否已满
      if (this.queue.length >= this.config.maxQueueSize) {
        reject(new Error('Queue is full'));
        return;
      }

      // 创建队列项
      const queueItem: QueueItem = {
        event,
        processor: this.createEventProcessor(),
        queueTime: Date.now(),
        retryCount: 0,
        priority: event.priority,
        promise: { resolve, reject },
      };

      // 添加到队列
      this.queue.enqueue(queueItem);
      this.updateQueueStats();
    });
  }

  /** 创建事件处理器 */
  private createEventProcessor(): (event: IBaseEvent) => Promise<any> {
    return async (event: IBaseEvent) => {
      // 默认处理逻辑（可以被覆盖）
      event.status = EventStatus.COMPLETED;
      return { processed: true, timestamp: Date.now() };
    };
  }

  /** 设置事件处理器 */
  setEventProcessor(processor: (event: IBaseEvent) => Promise<any>): void {
    this.createEventProcessor = () => processor;
  }

  /** 设置批处理器 */
  setBatchProcessor(processor: (events: IBaseEvent[]) => Promise<any>): void {
    this.batchProcessor = processor;
  }

  /** 处理循环 */
  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const item = this.queue.dequeue();
        if (!item) {
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }

        this.currentProcessing++;
        this.stats.currentQueueSize = this.queue.length;

        try {
          await this.processItem(item);
        } catch (error) {
          await this.handleProcessingError(item, error as Error);
        } finally {
          this.currentProcessing--;
        }
      } catch (error) {
        console.error('Error in processing loop:', error);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /** 处理单个项 */
  private async processItem(item: QueueItem): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 设置处理超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Processing timeout'));
        }, this.config.timeoutMs);
      });

      // 更新事件状态
      item.event.status = EventStatus.PROCESSING;

      // 处理事件
      const result = await Promise.race([
        item.processor(item.event),
        timeoutPromise,
      ]);

      // 处理成功
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime, true);
      
      item.event.status = EventStatus.COMPLETED;
      item.promise.resolve(result);

    } catch (error) {
      // 处理失败
      const processingTime = Date.now() - startTime;
      this.updateProcessingStats(processingTime, false);
      
      item.event.status = EventStatus.FAILED;
      
      // 检查是否需要重试
      if (item.retryCount < this.config.retryCount) {
        await this.retryItem(item);
      } else {
        item.promise.reject(error as Error);
      }
    }
  }

  /** 重试项 */
  private async retryItem(item: QueueItem): Promise<void> {
    item.retryCount++;
    
    // 等待重试延迟
    await new Promise(resolve => setTimeout(resolve, this.config.retryDelayMs));
    
    // 重新入队
    this.queue.enqueue(item);
  }

  /** 处理错误 */
  private async handleProcessingError(item: QueueItem, error: Error): Promise<void> {
    console.error(`Error processing event ${item.event.id}:`, error);
    
    // 记录错误统计
    this.stats.failureCount++;
    
    // 可以在这里添加错误处理逻辑，如发送到死信队列
  }

  /** 更新处理统计 */
  private updateProcessingStats(processingTime: number, success: boolean): void {
    this.stats.totalProcessed++;
    
    if (success) {
      this.stats.successCount++;
    } else {
      this.stats.failureCount++;
    }

    // 更新处理时间统计
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > 1000) {
      this.processingTimes.shift();
    }

    this.stats.avgProcessingTime = this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
    this.stats.maxProcessingTime = Math.max(this.stats.maxProcessingTime, processingTime);
    this.stats.errorRate = this.stats.totalProcessed > 0 ? this.stats.failureCount / this.stats.totalProcessed : 0;
  }

  /** 更新队列统计 */
  private updateQueueStats(): void {
    this.stats.currentQueueSize = this.queue.length;
  }

  /** 启动批处理 */
  private startBatchProcessing(): void {
    if (!this.config.batchProcessing) {
      return;
    }

    const batchSize = this.config.batchSize || 10;
    const batchWaitMs = this.config.batchWaitMs || 1000;

    const processBatchIfNeeded = () => {
      if (this.currentBatch.length >= batchSize) {
        this.processBatch();
      } else if (this.currentBatch.length > 0) {
        // 设置批处理超时
        if (this.batchTimeout) {
          clearTimeout(this.batchTimeout);
        }
        this.batchTimeout = setTimeout(() => {
          this.processBatch();
        }, batchWaitMs);
      }
    };

    // 重写enqueue方法以支持批处理
    const originalEnqueue = this.enqueue.bind(this);
    this.enqueue = async (event: IBaseEvent): Promise<void> => {
      if (this.config.batchProcessing && this.batchProcessor) {
        return new Promise((resolve, reject) => {
          this.currentBatch.push(event);
          processBatchIfNeeded();
          // 批处理的Promise处理需要特殊处理
          resolve();
        });
      }
      
      return originalEnqueue(event);
    };
  }

  /** 处理批处理 */
  private async processBatch(): Promise<void> {
    if (this.currentBatch.length === 0 || !this.batchProcessor) {
      return;
    }

    const batch = [...this.currentBatch];
    this.currentBatch = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = undefined;
    }

    try {
      await this.batchProcessor(batch);
      
      // 更新批处理统计
      batch.forEach(event => {
        event.status = EventStatus.COMPLETED;
      });
      
      this.stats.successCount += batch.length;
      this.stats.totalProcessed += batch.length;
      
    } catch (error) {
      console.error('Batch processing error:', error);
      
      // 批处理失败，将事件重新加入单个处理队列
      for (const event of batch) {
        event.status = EventStatus.FAILED;
        try {
          await this.enqueue(event);
        } catch (enqueueError) {
          console.error('Failed to re-enqueue event after batch failure:', enqueueError);
        }
      }
    }
  }

  /** 获取队列状态 */
  getQueueStatus(): IQueueStatus {
    return {
      queueSize: this.queue.length,
      processingCount: this.currentProcessing,
      isRunning: this.isRunning,
      isFull: this.queue.length >= this.config.maxQueueSize,
    };
  }

  /** 获取处理统计信息 */
  getStats(): IProcessorStats {
    return { ...this.stats };
  }

  /** 获取详细统计信息 */
  getDetailedStats(): IProcessorStats & {
    queueStats: {
      totalItems: number;
      priorityDistribution: Record<EventPriority, number>;
      avgQueueTime: number;
      maxQueueTime: number;
    };
    batchStats?: {
      totalBatches: number;
      avgBatchSize: number;
      maxBatchSize: number;
    };
  } {
    const queueItems = this.queue.getItems();
    const now = Date.now();
    
    // 计算队列统计
    const priorityDistribution: Record<EventPriority, number> = {
      [EventPriority.LOW]: 0,
      [EventPriority.NORMAL]: 0,
      [EventPriority.HIGH]: 0,
      [EventPriority.URGENT]: 0,
    };

    let totalQueueTime = 0;
    let maxQueueTime = 0;

    for (const item of queueItems) {
      priorityDistribution[item.priority]++;
      const queueTime = now - item.queueTime;
      totalQueueTime += queueTime;
      maxQueueTime = Math.max(maxQueueTime, queueTime);
    }

    return {
      ...this.stats,
      queueStats: {
        totalItems: queueItems.length,
        priorityDistribution,
        avgQueueTime: queueItems.length > 0 ? totalQueueTime / queueItems.length : 0,
        maxQueueTime,
      },
    };
  }

  /** 清空队列 */
  clearQueue(): void {
    // 拒绝所有待处理的项
    const items = this.queue.getItems();
    for (const item of items) {
      item.promise.reject(new Error('Queue cleared'));
    }
    
    this.queue.clear();
    this.currentBatch = [];
    this.updateQueueStats();
  }

  /** 暂停处理 */
  pause(): void {
    this.isRunning = false;
  }

  /** 恢复处理 */
  resume(): void {
    if (!this.isRunning) {
      this.start();
    }
  }

  /** 设置配置 */
  setConfig(config: Partial<IAsyncProcessorConfig>): void {
    this.config = { ...this.config, ...config };
    this.validateConfig();
  }

  /** 获取配置 */
  getConfig(): IAsyncProcessorConfig {
    return { ...this.config };
  }

  /** 健康检查 */
  healthCheck(): {
    status: 'healthy' | 'warning' | 'error';
    issues: string[];
    metrics: {
      queueUtilization: number;
      processingUtilization: number;
      errorRate: number;
      avgProcessingTime: number;
    };
  } {
    const status = this.getQueueStatus();
    const stats = this.getStats();
    const issues: string[] = [];
    
    const queueUtilization = status.queueSize / this.config.maxQueueSize;
    const processingUtilization = status.processingCount / this.config.maxConcurrency;

    // 检查队列使用率
    if (queueUtilization > 0.8) {
      issues.push(`Queue utilization high: ${(queueUtilization * 100).toFixed(1)}%`);
    }

    // 检查处理器使用率
    if (processingUtilization > 0.9) {
      issues.push(`Processing utilization high: ${(processingUtilization * 100).toFixed(1)}%`);
    }

    // 检查错误率
    if (stats.errorRate > 0.1) {
      issues.push(`Error rate high: ${(stats.errorRate * 100).toFixed(1)}%`);
    }

    // 检查处理时间
    if (stats.avgProcessingTime > this.config.timeoutMs * 0.8) {
      issues.push(`Average processing time approaching timeout: ${stats.avgProcessingTime}ms`);
    }

    // 检查是否运行
    if (!this.isRunning) {
      issues.push('Processor is not running');
    }

    const overallStatus = issues.length === 0 ? 'healthy' : 
                         issues.length <= 2 ? 'warning' : 'error';

    return {
      status: overallStatus,
      issues,
      metrics: {
        queueUtilization,
        processingUtilization,
        errorRate: stats.errorRate,
        avgProcessingTime: stats.avgProcessingTime,
      },
    };
  }
}

/** 异步处理器工厂 */
export class AsyncProcessorFactory {
  /** 创建默认处理器 */
  static createDefault(config?: Partial<IAsyncProcessorConfig>): AsyncEventProcessor {
    const defaultConfig: IAsyncProcessorConfig = {
      maxConcurrency: 4,
      maxQueueSize: 1000,
      timeoutMs: 30000,
      retryCount: 3,
      retryDelayMs: 1000,
      batchProcessing: false,
    };

    return new AsyncEventProcessor({ ...defaultConfig, ...config });
  }

  /** 创建高吞吐量处理器 */
  static createHighThroughput(config?: Partial<IAsyncProcessorConfig>): AsyncEventProcessor {
    const highThroughputConfig: IAsyncProcessorConfig = {
      maxConcurrency: 16,
      maxQueueSize: 10000,
      timeoutMs: 10000,
      retryCount: 1,
      retryDelayMs: 500,
      batchProcessing: true,
      batchSize: 50,
      batchWaitMs: 100,
    };

    return new AsyncEventProcessor({ ...highThroughputConfig, ...config });
  }

  /** 创建低延迟处理器 */
  static createLowLatency(config?: Partial<IAsyncProcessorConfig>): AsyncEventProcessor {
    const lowLatencyConfig: IAsyncProcessorConfig = {
      maxConcurrency: 8,
      maxQueueSize: 100,
      timeoutMs: 1000,
      retryCount: 0,
      retryDelayMs: 0,
      batchProcessing: false,
    };

    return new AsyncEventProcessor({ ...lowLatencyConfig, ...config });
  }

  /** 创建可靠处理器 */
  static createReliable(config?: Partial<IAsyncProcessorConfig>): AsyncEventProcessor {
    const reliableConfig: IAsyncProcessorConfig = {
      maxConcurrency: 2,
      maxQueueSize: 5000,
      timeoutMs: 60000,
      retryCount: 5,
      retryDelayMs: 2000,
      batchProcessing: false,
    };

    return new AsyncEventProcessor({ ...reliableConfig, ...config });
  }
}