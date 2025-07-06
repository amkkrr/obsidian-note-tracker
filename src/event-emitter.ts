/**
 * 通用事件发射器实现
 * 
 * 高性能的事件发射器，支持命名空间、优先级、一次性监听器
 * 以及完善的内存管理和错误处理机制
 */

import { 
  IEventEmitter, 
  IEventListener, 
  IBaseEvent, 
  EventPriority,
  EventStatus
} from './interfaces';

/** 监听器包装类 */
class ListenerWrapper<T extends IBaseEvent = IBaseEvent> implements IEventListener<T> {
  public readonly id: string;
  public readonly priority: EventPriority;
  public readonly once: boolean;
  public readonly handler: (event: T) => Promise<void> | void;
  public readonly errorHandler?: (error: Error, event: T) => void;
  public readonly filter?: (event: T) => boolean;
  public readonly namespace?: string;

  private callCount = 0;
  private lastCallTime = 0;
  private totalExecutionTime = 0;
  private errorCount = 0;

  constructor(
    id: string,
    handler: (event: T) => Promise<void> | void,
    options: {
      priority?: EventPriority;
      once?: boolean;
      errorHandler?: (error: Error, event: T) => void;
      filter?: (event: T) => boolean;
      namespace?: string;
    } = {}
  ) {
    this.id = id;
    this.handler = handler;
    this.priority = options.priority || EventPriority.NORMAL;
    this.once = options.once || false;
    this.errorHandler = options.errorHandler;
    this.filter = options.filter;
    this.namespace = options.namespace;
  }

  /** 执行监听器 */
  async execute(event: T): Promise<void> {
    // 应用过滤器
    if (this.filter && !this.filter(event)) {
      return;
    }

    const startTime = Date.now();
    this.callCount++;
    this.lastCallTime = startTime;

    try {
      const result = this.handler(event);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      this.errorCount++;
      if (this.errorHandler) {
        try {
          this.errorHandler(error as Error, event);
        } catch (handlerError) {
          console.error('Error in error handler:', handlerError);
        }
      } else {
        console.error(`Error in event listener ${this.id}:`, error);
      }
      throw error;
    } finally {
      this.totalExecutionTime += Date.now() - startTime;
    }
  }

  /** 获取统计信息 */
  getStats() {
    return {
      id: this.id,
      callCount: this.callCount,
      errorCount: this.errorCount,
      avgExecutionTime: this.callCount > 0 ? this.totalExecutionTime / this.callCount : 0,
      lastCallTime: this.lastCallTime,
      totalExecutionTime: this.totalExecutionTime,
    };
  }
}

/** 事件发射器实现 */
export class EventEmitter implements IEventEmitter {
  private listeners = new Map<string, ListenerWrapper[]>();
  private maxListeners = 10;
  private listenerIdCounter = 0;

  // 性能监控
  private emitCount = 0;
  private errorCount = 0;
  private totalEmitTime = 0;

  // 内存管理
  private memoryCheckInterval?: NodeJS.Timeout;
  private readonly memoryCheckIntervalMs = 60000; // 1分钟

  constructor(options: {
    maxListeners?: number;
    enableMemoryManagement?: boolean;
  } = {}) {
    this.maxListeners = options.maxListeners || 10;
    
    if (options.enableMemoryManagement !== false) {
      this.startMemoryManagement();
    }
  }

  /** 注册事件监听器 */
  on<T extends IBaseEvent>(
    eventType: string,
    listener: IEventListener<T> | ((event: T) => Promise<void> | void)
  ): this {
    return this.addListener(eventType, listener, { once: false });
  }

  /** 注册一次性事件监听器 */
  once<T extends IBaseEvent>(
    eventType: string,
    listener: IEventListener<T> | ((event: T) => Promise<void> | void)
  ): this {
    return this.addListener(eventType, listener, { once: true });
  }

  /** 添加监听器的内部方法 */
  private addListener<T extends IBaseEvent>(
    eventType: string,
    listener: IEventListener<T> | ((event: T) => Promise<void> | void),
    options: { once: boolean }
  ): this {
    if (!this.isValidEventType(eventType)) {
      throw new Error(`Invalid event type: ${eventType}`);
    }

    // 创建监听器包装器
    let wrapper: ListenerWrapper<T>;
    
    if (typeof listener === 'function') {
      wrapper = new ListenerWrapper<T>(
        this.generateListenerId(),
        listener,
        { once: options.once }
      );
    } else {
      wrapper = new ListenerWrapper<T>(
        listener.id || this.generateListenerId(),
        listener.handler,
        {
          priority: listener.priority,
          once: options.once || listener.once,
          errorHandler: listener.errorHandler,
          filter: listener.filter,
        }
      );
    }

    // 检查监听器数量限制
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }

    const eventListeners = this.listeners.get(eventType)!;
    if (eventListeners.length >= this.maxListeners) {
      console.warn(`MaxListenersExceededWarning: Event type "${eventType}" has ${eventListeners.length} listeners. Consider increasing maxListeners or checking for memory leaks.`);
    }

    // 按优先级插入监听器
    this.insertByPriority(eventListeners, wrapper);

    return this;
  }

  /** 按优先级插入监听器 */
  private insertByPriority(listeners: ListenerWrapper[], wrapper: ListenerWrapper): void {
    let insertIndex = listeners.length;
    
    // 找到合适的插入位置（优先级高的在前面）
    for (let i = 0; i < listeners.length; i++) {
      if (wrapper.priority > listeners[i].priority) {
        insertIndex = i;
        break;
      }
    }

    listeners.splice(insertIndex, 0, wrapper);
  }

  /** 移除事件监听器 */
  off(eventType: string, listenerId?: string): this {
    if (!this.listeners.has(eventType)) {
      return this;
    }

    const eventListeners = this.listeners.get(eventType)!;

    if (listenerId) {
      // 移除指定的监听器
      const index = eventListeners.findIndex(l => l.id === listenerId);
      if (index !== -1) {
        eventListeners.splice(index, 1);
      }
    } else {
      // 移除所有监听器
      eventListeners.length = 0;
    }

    // 清理空的事件类型
    if (eventListeners.length === 0) {
      this.listeners.delete(eventType);
    }

    return this;
  }

  /** 发射事件 */
  async emit<T extends IBaseEvent>(event: T): Promise<void> {
    const startTime = Date.now();
    this.emitCount++;

    try {
      // 更新事件状态
      if (event.status === EventStatus.PENDING) {
        event.status = EventStatus.PROCESSING;
      }

      const listeners = this.listeners.get(event.type);
      if (!listeners || listeners.length === 0) {
        return;
      }

      // 收集需要执行的监听器
      const listenersToExecute = [...listeners];
      const onceListeners: string[] = [];

      // 并发执行监听器
      const promises = listenersToExecute.map(async (listener) => {
        try {
          await listener.execute(event);
          
          // 记录一次性监听器
          if (listener.once) {
            onceListeners.push(listener.id);
          }
        } catch (error) {
          this.errorCount++;
          // 继续执行其他监听器，不中断整个流程
          console.error(`Error in listener ${listener.id} for event ${event.type}:`, error);
        }
      });

      // 等待所有监听器执行完成
      await Promise.all(promises);

      // 清理一次性监听器
      if (onceListeners.length > 0) {
        onceListeners.forEach(id => this.off(event.type, id));
      }

      // 更新事件状态为完成
      event.status = EventStatus.COMPLETED;

    } catch (error) {
      event.status = EventStatus.FAILED;
      throw error;
    } finally {
      this.totalEmitTime += Date.now() - startTime;
    }
  }

  /** 获取事件监听器数量 */
  listenerCount(eventType: string): number {
    const listeners = this.listeners.get(eventType);
    return listeners ? listeners.length : 0;
  }

  /** 获取所有事件类型 */
  eventNames(): string[] {
    return Array.from(this.listeners.keys());
  }

  /** 清理所有监听器 */
  removeAllListeners(eventType?: string): this {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  /** 设置最大监听器数量 */
  setMaxListeners(max: number): this {
    if (max < 0) {
      throw new Error('Max listeners must be non-negative');
    }
    this.maxListeners = max;
    return this;
  }

  /** 获取最大监听器数量 */
  getMaxListeners(): number {
    return this.maxListeners;
  }

  /** 获取性能统计信息 */
  getStats() {
    return {
      emitCount: this.emitCount,
      errorCount: this.errorCount,
      avgEmitTime: this.emitCount > 0 ? this.totalEmitTime / this.emitCount : 0,
      totalEmitTime: this.totalEmitTime,
      eventTypes: this.listeners.size,
      totalListeners: Array.from(this.listeners.values()).reduce((sum, listeners) => sum + listeners.length, 0),
      errorRate: this.emitCount > 0 ? this.errorCount / this.emitCount : 0,
    };
  }

  /** 获取监听器统计信息 */
  getListenerStats(eventType?: string): any {
    const stats: any = {};

    if (eventType) {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        stats[eventType] = listeners.map(l => l.getStats());
      }
    } else {
      for (const [type, listeners] of this.listeners) {
        stats[type] = listeners.map(l => l.getStats());
      }
    }

    return stats;
  }

  /** 生成监听器ID */
  private generateListenerId(): string {
    return `listener_${++this.listenerIdCounter}`;
  }

  /** 验证事件类型格式 */
  private isValidEventType(eventType: string): boolean {
    return typeof eventType === 'string' && eventType.length > 0;
  }

  /** 启动内存管理 */
  private startMemoryManagement(): void {
    this.memoryCheckInterval = setInterval(() => {
      this.performMemoryCheck();
    }, this.memoryCheckIntervalMs);
  }

  /** 执行内存检查 */
  private performMemoryCheck(): void {
    const stats = this.getStats();
    
    // 检查是否有过多的监听器
    if (stats.totalListeners > 1000) {
      console.warn(`EventEmitter has ${stats.totalListeners} listeners. Consider checking for memory leaks.`);
    }

    // 检查错误率
    if (stats.errorRate > 0.1) {
      console.warn(`EventEmitter error rate is ${(stats.errorRate * 100).toFixed(2)}%. Consider reviewing error handling.`);
    }

    // 清理可能的内存泄漏
    this.cleanupStaleListeners();
  }

  /** 清理过期的监听器 */
  private cleanupStaleListeners(): void {
    const now = Date.now();
    const staleThreshold = 3600000; // 1小时

    for (const [eventType, listeners] of this.listeners) {
      const activeListeners = listeners.filter(listener => {
        const stats = listener.getStats();
        return now - stats.lastCallTime < staleThreshold || stats.callCount === 0;
      });

      if (activeListeners.length !== listeners.length) {
        this.listeners.set(eventType, activeListeners);
        console.info(`Cleaned up ${listeners.length - activeListeners.length} stale listeners for event type: ${eventType}`);
      }
    }
  }

  /** 销毁事件发射器 */
  destroy(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = undefined;
    }
    
    this.removeAllListeners();
  }

  /** 创建命名空间事件发射器 */
  namespace(name: string): NamespacedEventEmitter {
    return new NamespacedEventEmitter(this, name);
  }
}

/** 命名空间事件发射器 */
export class NamespacedEventEmitter implements IEventEmitter {
  constructor(
    private parent: EventEmitter,
    private namespace: string
  ) {}

  private getNamespacedType(eventType: string): string {
    return `${this.namespace}:${eventType}`;
  }

  on<T extends IBaseEvent>(
    eventType: string,
    listener: IEventListener<T> | ((event: T) => Promise<void> | void)
  ): this {
    this.parent.on(this.getNamespacedType(eventType), listener);
    return this;
  }

  once<T extends IBaseEvent>(
    eventType: string,
    listener: IEventListener<T> | ((event: T) => Promise<void> | void)
  ): this {
    this.parent.once(this.getNamespacedType(eventType), listener);
    return this;
  }

  off(eventType: string, listenerId?: string): this {
    this.parent.off(this.getNamespacedType(eventType), listenerId);
    return this;
  }

  async emit<T extends IBaseEvent>(event: T): Promise<void> {
    // 为事件添加命名空间
    const namespacedEvent = { ...event, type: this.getNamespacedType(event.type) };
    await this.parent.emit(namespacedEvent);
  }

  listenerCount(eventType: string): number {
    return this.parent.listenerCount(this.getNamespacedType(eventType));
  }

  eventNames(): string[] {
    return this.parent.eventNames()
      .filter(name => name.startsWith(`${this.namespace}:`))
      .map(name => name.substring(this.namespace.length + 1));
  }

  removeAllListeners(eventType?: string): this {
    if (eventType) {
      this.parent.removeAllListeners(this.getNamespacedType(eventType));
    } else {
      // 移除所有属于该命名空间的监听器
      const allEventNames = this.parent.eventNames();
      allEventNames.forEach(name => {
        if (name.startsWith(`${this.namespace}:`)) {
          this.parent.removeAllListeners(name);
        }
      });
    }
    return this;
  }
}