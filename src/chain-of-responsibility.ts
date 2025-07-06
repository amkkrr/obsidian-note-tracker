/**
 * 事件处理责任链模式实现
 * 
 * 提供了可配置的事件处理器链，支持优先级、中断机制、
 * 异常处理和详细的处理统计信息
 */

import { 
  IEventHandler, 
  IProcessingChain, 
  IProcessingContext, 
  IProcessingResult, 
  IBaseEvent, 
  EventPriority 
} from './interfaces';

/** 抽象事件处理器基类 */
export abstract class BaseEventHandler<T extends IBaseEvent = IBaseEvent> implements IEventHandler<T> {
  public readonly id: string;
  public readonly priority: EventPriority;
  
  protected executionCount = 0;
  protected totalExecutionTime = 0;
  protected successCount = 0;
  protected errorCount = 0;
  protected lastExecutionTime = 0;

  constructor(
    id: string,
    priority: EventPriority = EventPriority.NORMAL
  ) {
    this.id = id;
    this.priority = priority;
  }

  /** 检查是否可以处理该事件 */
  abstract canHandle(event: T): boolean;

  /** 处理事件的具体实现 */
  protected abstract doHandle(event: T, context: IProcessingContext): Promise<any>;

  /** 处理事件 */
  async handle(event: T, context: IProcessingContext = this.createDefaultContext()): Promise<IProcessingResult> {
    const startTime = Date.now();
    this.executionCount++;
    this.lastExecutionTime = startTime;

    try {
      // 检查是否应该停止处理
      if (context.shouldStop) {
        return {
          handlerId: this.id,
          success: false,
          duration: 0,
          error: new Error('Processing stopped by previous handler'),
          stopPropagation: true,
        };
      }

      // 执行具体的处理逻辑
      const result = await this.doHandle(event, context);
      
      const duration = Date.now() - startTime;
      this.totalExecutionTime += duration;
      this.successCount++;

      return {
        handlerId: this.id,
        success: true,
        duration,
        data: result,
        stopPropagation: false,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.totalExecutionTime += duration;
      this.errorCount++;

      return {
        handlerId: this.id,
        success: false,
        duration,
        error: error as Error,
        stopPropagation: false,
      };
    }
  }

  /** 获取处理器描述 */
  getDescription(): string {
    return `${this.constructor.name}(${this.id})`;
  }

  /** 获取处理器统计信息 */
  getStats() {
    return {
      id: this.id,
      priority: this.priority,
      executionCount: this.executionCount,
      successCount: this.successCount,
      errorCount: this.errorCount,
      totalExecutionTime: this.totalExecutionTime,
      avgExecutionTime: this.executionCount > 0 ? this.totalExecutionTime / this.executionCount : 0,
      successRate: this.executionCount > 0 ? this.successCount / this.executionCount : 0,
      lastExecutionTime: this.lastExecutionTime,
    };
  }

  /** 创建默认处理上下文 */
  private createDefaultContext(): IProcessingContext {
    return {
      startTime: Date.now(),
      processedHandlers: 0,
      totalHandlers: 1,
      shouldStop: false,
      results: [],
      data: {},
    };
  }
}

/** 同步事件处理器 */
export class SyncEventHandler extends BaseEventHandler {
  private syncHandler: (event: IBaseEvent, context: IProcessingContext) => any;

  constructor(
    id: string,
    handler: (event: IBaseEvent, context: IProcessingContext) => any,
    priority: EventPriority = EventPriority.NORMAL,
    private filter?: (event: IBaseEvent) => boolean
  ) {
    super(id, priority);
    this.syncHandler = handler;
  }

  canHandle(event: IBaseEvent): boolean {
    return this.filter ? this.filter(event) : true;
  }

  protected async doHandle(event: IBaseEvent, context: IProcessingContext): Promise<any> {
    return this.syncHandler(event, context);
  }
}

/** 异步事件处理器 */
export class AsyncEventHandler extends BaseEventHandler {
  private asyncHandler: (event: IBaseEvent, context: IProcessingContext) => Promise<any>;

  constructor(
    id: string,
    handler: (event: IBaseEvent, context: IProcessingContext) => Promise<any>,
    priority: EventPriority = EventPriority.NORMAL,
    private filter?: (event: IBaseEvent) => boolean
  ) {
    super(id, priority);
    this.asyncHandler = handler;
  }

  canHandle(event: IBaseEvent): boolean {
    return this.filter ? this.filter(event) : true;
  }

  protected async doHandle(event: IBaseEvent, context: IProcessingContext): Promise<any> {
    return await this.asyncHandler(event, context);
  }
}

/** 条件事件处理器 */
export class ConditionalEventHandler extends BaseEventHandler {
  constructor(
    id: string,
    private condition: (event: IBaseEvent) => boolean,
    private handler: (event: IBaseEvent, context: IProcessingContext) => Promise<any>,
    priority: EventPriority = EventPriority.NORMAL
  ) {
    super(id, priority);
  }

  canHandle(event: IBaseEvent): boolean {
    return this.condition(event);
  }

  protected async doHandle(event: IBaseEvent, context: IProcessingContext): Promise<any> {
    return await this.handler(event, context);
  }
}

/** 事件处理责任链实现 */
export class ProcessingChain implements IProcessingChain {
  private handlers: IEventHandler[] = [];
  private executionStats = {
    totalProcessed: 0,
    successfulProcessing: 0,
    failedProcessing: 0,
    totalExecutionTime: 0,
    lastProcessingTime: 0,
  };

  constructor(private options: {
    stopOnError?: boolean;
    maxExecutionTime?: number;
    enableParallelProcessing?: boolean;
  } = {}) {}

  /** 添加处理器 */
  addHandler(handler: IEventHandler): this {
    // 检查处理器是否已存在
    if (this.handlers.some(h => h.id === handler.id)) {
      throw new Error(`Handler with id '${handler.id}' already exists`);
    }

    // 按优先级插入处理器
    this.insertByPriority(handler);
    return this;
  }

  /** 按优先级插入处理器 */
  private insertByPriority(handler: IEventHandler): void {
    let insertIndex = this.handlers.length;

    // 找到合适的插入位置（优先级高的在前面）
    for (let i = 0; i < this.handlers.length; i++) {
      if (handler.priority > this.handlers[i].priority) {
        insertIndex = i;
        break;
      }
    }

    this.handlers.splice(insertIndex, 0, handler);
  }

  /** 移除处理器 */
  removeHandler(handlerId: string): this {
    const index = this.handlers.findIndex(h => h.id === handlerId);
    if (index !== -1) {
      this.handlers.splice(index, 1);
    }
    return this;
  }

  /** 处理事件 */
  async process<T extends IBaseEvent>(event: T): Promise<IProcessingResult> {
    const startTime = Date.now();
    this.executionStats.totalProcessed++;
    this.executionStats.lastProcessingTime = startTime;

    // 创建处理上下文
    const context: IProcessingContext = {
      startTime,
      processedHandlers: 0,
      totalHandlers: this.handlers.length,
      shouldStop: false,
      results: [],
      data: {},
    };

    try {
      // 检查超时设置
      const maxExecutionTime = this.options.maxExecutionTime || 30000; // 30秒默认超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Processing timeout after ${maxExecutionTime}ms`));
        }, maxExecutionTime);
      });

      // 执行处理逻辑
      const processingPromise = this.options.enableParallelProcessing 
        ? this.processParallel(event, context)
        : this.processSequential(event, context);

      await Promise.race([processingPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      this.executionStats.totalExecutionTime += duration;
      this.executionStats.successfulProcessing++;

      return {
        handlerId: 'chain',
        success: true,
        duration,
        data: {
          processedHandlers: context.processedHandlers,
          totalHandlers: context.totalHandlers,
          results: context.results,
          contextData: context.data,
        },
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.executionStats.totalExecutionTime += duration;
      this.executionStats.failedProcessing++;

      return {
        handlerId: 'chain',
        success: false,
        duration,
        error: error as Error,
        data: {
          processedHandlers: context.processedHandlers,
          totalHandlers: context.totalHandlers,
          results: context.results,
          contextData: context.data,
        },
      };
    }
  }

  /** 顺序处理事件 */
  private async processSequential<T extends IBaseEvent>(
    event: T, 
    context: IProcessingContext
  ): Promise<void> {
    for (const handler of this.handlers) {
      if (context.shouldStop) {
        break;
      }

      // 检查处理器是否可以处理该事件
      if (!handler.canHandle(event)) {
        continue;
      }

      try {
        const result = await handler.handle(event, context);
        context.results.push(result);
        context.processedHandlers++;

        // 检查是否需要停止传播
        if (result.stopPropagation) {
          context.shouldStop = true;
        }

        // 如果配置了遇到错误就停止，且处理失败
        if (this.options.stopOnError && !result.success) {
          context.shouldStop = true;
        }

      } catch (error) {
        const errorResult: IProcessingResult = {
          handlerId: handler.id,
          success: false,
          duration: 0,
          error: error as Error,
        };
        context.results.push(errorResult);

        if (this.options.stopOnError) {
          context.shouldStop = true;
        }
      }
    }
  }

  /** 并行处理事件 */
  private async processParallel<T extends IBaseEvent>(
    event: T, 
    context: IProcessingContext
  ): Promise<void> {
    // 筛选可以处理该事件的处理器
    const eligibleHandlers = this.handlers.filter(h => h.canHandle(event));

    // 并行执行所有处理器
    const promises = eligibleHandlers.map(async (handler) => {
      try {
        return await handler.handle(event, context);
      } catch (error) {
        return {
          handlerId: handler.id,
          success: false,
          duration: 0,
          error: error as Error,
        } as IProcessingResult;
      }
    });

    // 等待所有处理器完成
    const results = await Promise.all(promises);
    context.results.push(...results);
    context.processedHandlers = results.length;

    // 检查是否有处理器要求停止传播
    if (results.some(r => r.stopPropagation)) {
      context.shouldStop = true;
    }
  }

  /** 获取处理器数量 */
  getHandlerCount(): number {
    return this.handlers.length;
  }

  /** 获取处理器列表 */
  getHandlers(): IEventHandler[] {
    return [...this.handlers];
  }

  /** 获取处理链统计信息 */
  getStats() {
    return {
      ...this.executionStats,
      handlerCount: this.handlers.length,
      avgExecutionTime: this.executionStats.totalProcessed > 0 
        ? this.executionStats.totalExecutionTime / this.executionStats.totalProcessed 
        : 0,
      successRate: this.executionStats.totalProcessed > 0 
        ? this.executionStats.successfulProcessing / this.executionStats.totalProcessed 
        : 0,
    };
  }

  /** 获取处理器统计信息 */
  getHandlerStats() {
    return this.handlers.map(handler => {
      if ('getStats' in handler) {
        return (handler as any).getStats();
      }
      return {
        id: handler.id,
        priority: handler.priority,
        description: handler.getDescription(),
      };
    });
  }

  /** 清除所有处理器 */
  clear(): this {
    this.handlers = [];
    return this;
  }

  /** 检查是否包含指定处理器 */
  hasHandler(handlerId: string): boolean {
    return this.handlers.some(h => h.id === handlerId);
  }

  /** 获取指定处理器 */
  getHandler(handlerId: string): IEventHandler | undefined {
    return this.handlers.find(h => h.id === handlerId);
  }

  /** 重新排序处理器 */
  reorderHandlers(): this {
    this.handlers.sort((a, b) => b.priority - a.priority);
    return this;
  }

  /** 克隆处理链 */
  clone(): ProcessingChain {
    const cloned = new ProcessingChain(this.options);
    cloned.handlers = [...this.handlers];
    return cloned;
  }
}

/** 处理链构建器 */
export class ProcessingChainBuilder {
  private chain: ProcessingChain;

  constructor(options?: {
    stopOnError?: boolean;
    maxExecutionTime?: number;
    enableParallelProcessing?: boolean;
  }) {
    this.chain = new ProcessingChain(options);
  }

  /** 添加同步处理器 */
  addSyncHandler(
    id: string,
    handler: (event: IBaseEvent, context: IProcessingContext) => any,
    priority: EventPriority = EventPriority.NORMAL,
    filter?: (event: IBaseEvent) => boolean
  ): this {
    this.chain.addHandler(new SyncEventHandler(id, handler, priority, filter));
    return this;
  }

  /** 添加异步处理器 */
  addAsyncHandler(
    id: string,
    handler: (event: IBaseEvent, context: IProcessingContext) => Promise<any>,
    priority: EventPriority = EventPriority.NORMAL,
    filter?: (event: IBaseEvent) => boolean
  ): this {
    this.chain.addHandler(new AsyncEventHandler(id, handler, priority, filter));
    return this;
  }

  /** 添加条件处理器 */
  addConditionalHandler(
    id: string,
    condition: (event: IBaseEvent) => boolean,
    handler: (event: IBaseEvent, context: IProcessingContext) => Promise<any>,
    priority: EventPriority = EventPriority.NORMAL
  ): this {
    this.chain.addHandler(new ConditionalEventHandler(id, condition, handler, priority));
    return this;
  }

  /** 添加自定义处理器 */
  addHandler(handler: IEventHandler): this {
    this.chain.addHandler(handler);
    return this;
  }

  /** 构建处理链 */
  build(): ProcessingChain {
    return this.chain;
  }
}

/** 常用处理器工厂 */
export class HandlerFactory {
  /** 创建日志处理器 */
  static createLogger(id: string, logger: (event: IBaseEvent) => void): IEventHandler {
    return new SyncEventHandler(id, (event) => {
      logger(event);
      return { logged: true };
    }, EventPriority.LOW);
  }

  /** 创建验证处理器 */
  static createValidator(
    id: string,
    validator: (event: IBaseEvent) => boolean,
    errorMessage: string = 'Validation failed'
  ): IEventHandler {
    return new SyncEventHandler(id, (event) => {
      if (!validator(event)) {
        throw new Error(errorMessage);
      }
      return { validated: true };
    }, EventPriority.HIGH);
  }

  /** 创建转换处理器 */
  static createTransformer(
    id: string,
    transformer: (event: IBaseEvent) => IBaseEvent
  ): IEventHandler {
    return new SyncEventHandler(id, (event) => {
      return transformer(event);
    }, EventPriority.NORMAL);
  }

  /** 创建过滤器处理器 */
  static createFilter(
    id: string,
    filter: (event: IBaseEvent) => boolean
  ): IEventHandler {
    return new SyncEventHandler(id, (event, context) => {
      if (!filter(event)) {
        context.shouldStop = true;
        return { filtered: true, stopPropagation: true };
      }
      return { passed: true };
    }, EventPriority.HIGH);
  }

  /** 创建限流处理器 */
  static createRateLimit(
    id: string,
    maxEventsPerSecond: number
  ): IEventHandler {
    const eventTimes: number[] = [];
    
    return new SyncEventHandler(id, (event) => {
      const now = Date.now();
      const oneSecondAgo = now - 1000;
      
      // 清理过期的时间戳
      while (eventTimes.length > 0 && eventTimes[0] < oneSecondAgo) {
        eventTimes.shift();
      }
      
      // 检查是否超过限制
      if (eventTimes.length >= maxEventsPerSecond) {
        throw new Error(`Rate limit exceeded: ${maxEventsPerSecond} events per second`);
      }
      
      eventTimes.push(now);
      return { rateLimited: false };
    }, EventPriority.HIGH);
  }
}