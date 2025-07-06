/**
 * 事件防抖装饰器实现
 * 
 * 提供了多种防抖策略：标准防抖、节流、时间窗口防抖等
 * 支持自适应防抖和性能优化
 */

import { IBaseEvent, IEventEmitter, IDebounceConfig } from '../interfaces';

/** 防抖状态 */
enum DebounceState {
  IDLE = 'idle',
  WAITING = 'waiting',
  EXECUTING = 'executing',
}

/** 防抖项 */
interface DebounceItem {
  /** 事件类型 */
  eventType: string;
  /** 最新事件 */
  latestEvent: IBaseEvent;
  /** 防抖状态 */
  state: DebounceState;
  /** 定时器ID */
  timerId?: NodeJS.Timeout;
  /** 首次事件时间 */
  firstEventTime: number;
  /** 最后事件时间 */
  lastEventTime: number;
  /** 事件计数 */
  eventCount: number;
  /** 累积的事件列表（用于批处理） */
  events: IBaseEvent[];
}

/** 防抖统计信息 */
interface DebounceStats {
  /** 总接收事件数 */
  totalEvents: number;
  /** 实际发射事件数 */
  emittedEvents: number;
  /** 防抖事件数 */
  debouncedEvents: number;
  /** 防抖率 */
  debounceRate: number;
  /** 平均等待时间 */
  avgWaitTime: number;
  /** 活跃防抖项数量 */
  activeDebounceItems: number;
  /** 批处理统计 */
  batchStats: {
    totalBatches: number;
    avgBatchSize: number;
    maxBatchSize: number;
  };
}

/** 防抖策略接口 */
interface IDebounceStrategy {
  /** 获取防抖键 */
  getDebounceKey(event: IBaseEvent): string;
  /** 处理事件 */
  handleEvent(event: IBaseEvent, item: DebounceItem, config: IDebounceConfig): boolean;
  /** 获取策略名称 */
  getName(): string;
}

/** 标准防抖策略 */
class StandardDebounceStrategy implements IDebounceStrategy {
  getDebounceKey(event: IBaseEvent): string {
    return event.type;
  }

  handleEvent(event: IBaseEvent, item: DebounceItem, config: IDebounceConfig): boolean {
    // 重置定时器
    if (item.timerId) {
      clearTimeout(item.timerId);
    }

    // 更新事件信息
    item.latestEvent = event;
    item.lastEventTime = Date.now();
    item.eventCount++;
    item.events.push(event);

    // 设置新的定时器
    item.timerId = setTimeout(() => {
      this.executeDebounced(item, config);
    }, config.delayMs);

    return false; // 不立即执行
  }

  private executeDebounced(item: DebounceItem, config: IDebounceConfig): void {
    item.state = DebounceState.EXECUTING;
    // 在外部处理器中处理执行逻辑
  }

  getName(): string {
    return 'standard';
  }
}

/** 节流策略 */
class ThrottleStrategy implements IDebounceStrategy {
  private lastExecutionTimes = new Map<string, number>();

  getDebounceKey(event: IBaseEvent): string {
    return event.type;
  }

  handleEvent(event: IBaseEvent, item: DebounceItem, config: IDebounceConfig): boolean {
    const key = this.getDebounceKey(event);
    const now = Date.now();
    const lastExecution = this.lastExecutionTimes.get(key) || 0;

    // 如果在节流时间内，延迟执行
    if (now - lastExecution < config.delayMs) {
      item.latestEvent = event;
      item.lastEventTime = now;
      item.eventCount++;
      item.events.push(event);

      if (!item.timerId) {
        const remainingTime = config.delayMs - (now - lastExecution);
        item.timerId = setTimeout(() => {
          this.executeThrottled(item, config, key);
        }, remainingTime);
      }

      return false;
    }

    // 可以立即执行
    this.lastExecutionTimes.set(key, now);
    return true;
  }

  private executeThrottled(item: DebounceItem, config: IDebounceConfig, key: string): void {
    this.lastExecutionTimes.set(key, Date.now());
    item.state = DebounceState.EXECUTING;
  }

  getName(): string {
    return 'throttle';
  }
}

/** 时间窗口防抖策略 */
class TimeWindowStrategy implements IDebounceStrategy {
  getDebounceKey(event: IBaseEvent): string {
    // 基于事件类型和时间窗口生成键
    const windowSize = 1000; // 1秒窗口
    const windowId = Math.floor(event.timestamp / windowSize);
    return `${event.type}_${windowId}`;
  }

  handleEvent(event: IBaseEvent, item: DebounceItem, config: IDebounceConfig): boolean {
    item.latestEvent = event;
    item.lastEventTime = Date.now();
    item.eventCount++;
    item.events.push(event);

    // 在时间窗口结束时执行
    if (!item.timerId) {
      const windowSize = 1000;
      const windowId = Math.floor(event.timestamp / windowSize);
      const windowEnd = (windowId + 1) * windowSize;
      const delay = windowEnd - Date.now();

      item.timerId = setTimeout(() => {
        item.state = DebounceState.EXECUTING;
      }, Math.max(delay, 0));
    }

    return false;
  }

  getName(): string {
    return 'time-window';
  }
}

/** 事件防抖装饰器 */
export class EventDebouncingDecorator implements IEventEmitter {
  private debounceItems = new Map<string, DebounceItem>();
  private strategy: IDebounceStrategy;
  private cleanupInterval?: NodeJS.Timeout;

  // 统计信息
  private stats = {
    totalEvents: 0,
    emittedEvents: 0,
    debouncedEvents: 0,
    totalWaitTime: 0,
    batchStats: {
      totalBatches: 0,
      totalBatchSize: 0,
      maxBatchSize: 0,
    },
  };

  constructor(
    private eventEmitter: IEventEmitter,
    private config: IDebounceConfig,
    strategyType: 'standard' | 'throttle' | 'time-window' = 'standard'
  ) {
    this.initializeStrategy(strategyType);
    this.startCleanup();
  }

  /** 初始化防抖策略 */
  private initializeStrategy(strategyType: string): void {
    switch (strategyType) {
      case 'throttle':
        this.strategy = new ThrottleStrategy();
        break;
      case 'time-window':
        this.strategy = new TimeWindowStrategy();
        break;
      default:
        this.strategy = new StandardDebounceStrategy();
    }
  }

  /** 启动清理任务 */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredItems();
    }, 60000); // 每分钟清理一次
  }

  /** 清理过期的防抖项 */
  private cleanupExpiredItems(): void {
    const now = Date.now();
    const maxAge = 300000; // 5分钟

    for (const [key, item] of this.debounceItems) {
      if (now - item.lastEventTime > maxAge && item.state === DebounceState.IDLE) {
        if (item.timerId) {
          clearTimeout(item.timerId);
        }
        this.debounceItems.delete(key);
      }
    }
  }

  /** 注册事件监听器 */
  on<T extends IBaseEvent>(
    eventType: string,
    listener: import('../interfaces').IEventListener<T> | ((event: T) => Promise<void> | void)
  ): this {
    this.eventEmitter.on(eventType, listener);
    return this;
  }

  /** 注册一次性事件监听器 */
  once<T extends IBaseEvent>(
    eventType: string,
    listener: import('../interfaces').IEventListener<T> | ((event: T) => Promise<void> | void)
  ): this {
    this.eventEmitter.once(eventType, listener);
    return this;
  }

  /** 移除事件监听器 */
  off(eventType: string, listenerId?: string): this {
    this.eventEmitter.off(eventType, listenerId);
    return this;
  }

  /** 发射事件（带防抖） */
  async emit<T extends IBaseEvent>(event: T): Promise<void> {
    this.stats.totalEvents++;
    const debounceKey = this.strategy.getDebounceKey(event);

    // 获取或创建防抖项
    let item = this.debounceItems.get(debounceKey);
    if (!item) {
      item = {
        eventType: event.type,
        latestEvent: event,
        state: DebounceState.IDLE,
        firstEventTime: Date.now(),
        lastEventTime: Date.now(),
        eventCount: 0,
        events: [],
      };
      this.debounceItems.set(debounceKey, item);
    }

    // 检查是否在前沿触发
    if (this.config.leading && item.state === DebounceState.IDLE) {
      item.state = DebounceState.WAITING;
      await this.executeEvent(event);
      this.stats.emittedEvents++;
    }

    // 应用防抖策略
    const shouldExecuteImmediately = this.strategy.handleEvent(event, item, this.config);

    if (shouldExecuteImmediately) {
      await this.executeEvent(event);
      this.stats.emittedEvents++;
    } else {
      this.stats.debouncedEvents++;
      item.state = DebounceState.WAITING;

      // 设置执行回调
      if (item.timerId) {
        clearTimeout(item.timerId);
      }

      item.timerId = setTimeout(async () => {
        await this.executeDebounced(item);
      }, this.config.delayMs);
    }

    // 检查最大等待时间
    if (this.config.maxWaitMs) {
      const waitTime = Date.now() - item.firstEventTime;
      if (waitTime >= this.config.maxWaitMs) {
        if (item.timerId) {
          clearTimeout(item.timerId);
        }
        await this.executeDebounced(item);
      }
    }
  }

  /** 执行防抖后的事件 */
  private async executeDebounced(item: DebounceItem): Promise<void> {
    if (item.state === DebounceState.EXECUTING) {
      return;
    }

    item.state = DebounceState.EXECUTING;
    
    try {
      // 检查是否在后沿触发
      if (this.config.trailing !== false) {
        if (item.events.length > 1) {
          // 批处理模式
          await this.executeBatch(item);
        } else {
          // 单事件模式
          await this.executeEvent(item.latestEvent);
        }
        this.stats.emittedEvents++;
      }

      // 更新统计信息
      const waitTime = Date.now() - item.firstEventTime;
      this.stats.totalWaitTime += waitTime;

      // 重置状态
      item.state = DebounceState.IDLE;
      item.firstEventTime = Date.now();
      item.eventCount = 0;
      item.events = [];

    } catch (error) {
      console.error('Error executing debounced event:', error);
      item.state = DebounceState.IDLE;
    }
  }

  /** 执行单个事件 */
  private async executeEvent(event: IBaseEvent): Promise<void> {
    await this.eventEmitter.emit(event);
  }

  /** 执行批处理事件 */
  private async executeBatch(item: DebounceItem): Promise<void> {
    this.stats.batchStats.totalBatches++;
    this.stats.batchStats.totalBatchSize += item.events.length;
    this.stats.batchStats.maxBatchSize = Math.max(
      this.stats.batchStats.maxBatchSize,
      item.events.length
    );

    // 创建批处理事件
    const batchEvent = {
      ...item.latestEvent,
      id: `batch_${item.latestEvent.id}`,
      type: `${item.latestEvent.type}.batch`,
      payload: {
        events: item.events,
        count: item.events.length,
        originalPayload: item.latestEvent.payload,
      },
    };

    await this.eventEmitter.emit(batchEvent);
  }

  /** 获取事件监听器数量 */
  listenerCount(eventType: string): number {
    return this.eventEmitter.listenerCount(eventType);
  }

  /** 获取所有事件类型 */
  eventNames(): string[] {
    return this.eventEmitter.eventNames();
  }

  /** 清理所有监听器 */
  removeAllListeners(eventType?: string): this {
    this.eventEmitter.removeAllListeners(eventType);
    return this;
  }

  /** 获取防抖统计信息 */
  getDebounceStats(): DebounceStats {
    return {
      totalEvents: this.stats.totalEvents,
      emittedEvents: this.stats.emittedEvents,
      debouncedEvents: this.stats.debouncedEvents,
      debounceRate: this.stats.totalEvents > 0 
        ? this.stats.debouncedEvents / this.stats.totalEvents 
        : 0,
      avgWaitTime: this.stats.emittedEvents > 0 
        ? this.stats.totalWaitTime / this.stats.emittedEvents 
        : 0,
      activeDebounceItems: this.debounceItems.size,
      batchStats: {
        totalBatches: this.stats.batchStats.totalBatches,
        avgBatchSize: this.stats.batchStats.totalBatches > 0 
          ? this.stats.batchStats.totalBatchSize / this.stats.batchStats.totalBatches 
          : 0,
        maxBatchSize: this.stats.batchStats.maxBatchSize,
      },
    };
  }

  /** 获取防抖项状态 */
  getDebounceItemsStatus(): Array<{
    key: string;
    eventType: string;
    state: DebounceState;
    eventCount: number;
    waitTime: number;
    hasTimer: boolean;
  }> {
    const now = Date.now();
    return Array.from(this.debounceItems.entries()).map(([key, item]) => ({
      key,
      eventType: item.eventType,
      state: item.state,
      eventCount: item.eventCount,
      waitTime: now - item.firstEventTime,
      hasTimer: !!item.timerId,
    }));
  }

  /** 刷新所有待处理的防抖事件 */
  async flush(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [key, item] of this.debounceItems) {
      if (item.state === DebounceState.WAITING && item.timerId) {
        clearTimeout(item.timerId);
        promises.push(this.executeDebounced(item));
      }
    }

    await Promise.all(promises);
  }

  /** 取消所有待处理的防抖事件 */
  cancel(): void {
    for (const [key, item] of this.debounceItems) {
      if (item.timerId) {
        clearTimeout(item.timerId);
      }
    }
    this.debounceItems.clear();
  }

  /** 更新防抖配置 */
  updateConfig(config: Partial<IDebounceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** 获取当前配置 */
  getConfig(): IDebounceConfig {
    return { ...this.config };
  }

  /** 重置统计信息 */
  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      emittedEvents: 0,
      debouncedEvents: 0,
      totalWaitTime: 0,
      batchStats: {
        totalBatches: 0,
        totalBatchSize: 0,
        maxBatchSize: 0,
      },
    };
  }

  /** 销毁装饰器 */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.cancel();
  }
}

/** 防抖装饰器工厂函数 */
export function withDebouncing(
  eventEmitter: IEventEmitter,
  config: IDebounceConfig,
  strategy: 'standard' | 'throttle' | 'time-window' = 'standard'
): EventDebouncingDecorator {
  return new EventDebouncingDecorator(eventEmitter, config, strategy);
}

/** 自适应防抖装饰器 */
export class AdaptiveDebouncingDecorator extends EventDebouncingDecorator {
  private adaptiveConfig: {
    minDelayMs: number;
    maxDelayMs: number;
    adaptationFactor: number;
    targetDebounceRate: number;
  };

  constructor(
    eventEmitter: IEventEmitter,
    config: IDebounceConfig,
    adaptiveConfig: {
      minDelayMs?: number;
      maxDelayMs?: number;
      adaptationFactor?: number;
      targetDebounceRate?: number;
    } = {}
  ) {
    super(eventEmitter, config);
    
    this.adaptiveConfig = {
      minDelayMs: adaptiveConfig.minDelayMs || 100,
      maxDelayMs: adaptiveConfig.maxDelayMs || 5000,
      adaptationFactor: adaptiveConfig.adaptationFactor || 0.1,
      targetDebounceRate: adaptiveConfig.targetDebounceRate || 0.5,
    };

    this.startAdaptiveOptimization();
  }

  /** 启动自适应优化 */
  private startAdaptiveOptimization(): void {
    setInterval(() => {
      this.optimizeDelayTime();
    }, 10000); // 每10秒优化一次
  }

  /** 优化延迟时间 */
  private optimizeDelayTime(): void {
    const stats = this.getDebounceStats();
    
    if (stats.totalEvents < 10) {
      return; // 样本太少，不进行优化
    }

    const currentRate = stats.debounceRate;
    const targetRate = this.adaptiveConfig.targetDebounceRate;
    const currentDelay = this.getConfig().delayMs;

    let newDelay = currentDelay;

    if (currentRate < targetRate) {
      // 防抖率太低，增加延迟
      newDelay = Math.min(
        currentDelay * (1 + this.adaptiveConfig.adaptationFactor),
        this.adaptiveConfig.maxDelayMs
      );
    } else if (currentRate > targetRate) {
      // 防抖率太高，减少延迟
      newDelay = Math.max(
        currentDelay * (1 - this.adaptiveConfig.adaptationFactor),
        this.adaptiveConfig.minDelayMs
      );
    }

    if (newDelay !== currentDelay) {
      this.updateConfig({ delayMs: newDelay });
    }
  }

  /** 获取自适应指标 */
  getAdaptiveMetrics(): {
    currentDelay: number;
    targetDebounceRate: number;
    actualDebounceRate: number;
    adaptationHistory: Array<{
      timestamp: number;
      delay: number;
      debounceRate: number;
    }>;
  } {
    const config = this.getConfig();
    const stats = this.getDebounceStats();

    return {
      currentDelay: config.delayMs,
      targetDebounceRate: this.adaptiveConfig.targetDebounceRate,
      actualDebounceRate: stats.debounceRate,
      adaptationHistory: [], // 可以添加历史记录功能
    };
  }
}

/** 智能防抖装饰器 */
export class SmartDebouncingDecorator extends EventDebouncingDecorator {
  private eventPatterns = new Map<string, {
    avgInterval: number;
    burstThreshold: number;
    adaptiveDelay: number;
    lastEventTime: number;
  }>();

  constructor(
    eventEmitter: IEventEmitter,
    config: IDebounceConfig
  ) {
    super(eventEmitter, config);
  }

  /** 发射事件（带智能防抖） */
  async emit<T extends IBaseEvent>(event: T): Promise<void> {
    const pattern = this.analyzeEventPattern(event);
    
    // 根据事件模式调整防抖配置
    const adaptiveConfig = this.calculateAdaptiveConfig(event, pattern);
    const originalConfig = this.getConfig();
    
    // 临时更新配置
    this.updateConfig(adaptiveConfig);
    
    try {
      await super.emit(event);
    } finally {
      // 恢复原始配置
      this.updateConfig(originalConfig);
    }
  }

  /** 分析事件模式 */
  private analyzeEventPattern(event: IBaseEvent): {
    avgInterval: number;
    burstThreshold: number;
    adaptiveDelay: number;
    lastEventTime: number;
  } {
    const now = Date.now();
    let pattern = this.eventPatterns.get(event.type);

    if (!pattern) {
      pattern = {
        avgInterval: 1000,
        burstThreshold: 3,
        adaptiveDelay: this.getConfig().delayMs,
        lastEventTime: now,
      };
      this.eventPatterns.set(event.type, pattern);
    } else {
      // 更新平均间隔
      const interval = now - pattern.lastEventTime;
      pattern.avgInterval = (pattern.avgInterval * 0.9) + (interval * 0.1);
      pattern.lastEventTime = now;
    }

    return pattern;
  }

  /** 计算自适应配置 */
  private calculateAdaptiveConfig(event: IBaseEvent, pattern: any): Partial<IDebounceConfig> {
    const baseConfig = this.getConfig();
    
    // 根据事件频率调整延迟
    if (pattern.avgInterval < 100) {
      // 高频事件，增加防抖延迟
      return {
        delayMs: Math.min(baseConfig.delayMs * 2, 2000),
        maxWaitMs: baseConfig.maxWaitMs ? baseConfig.maxWaitMs * 1.5 : 3000,
      };
    } else if (pattern.avgInterval > 5000) {
      // 低频事件，减少防抖延迟
      return {
        delayMs: Math.max(baseConfig.delayMs * 0.5, 50),
        maxWaitMs: baseConfig.maxWaitMs ? baseConfig.maxWaitMs * 0.8 : undefined,
      };
    }

    return baseConfig;
  }

  /** 获取事件模式分析 */
  getEventPatterns(): Record<string, {
    avgInterval: number;
    burstThreshold: number;
    adaptiveDelay: number;
    lastEventTime: number;
  }> {
    const result: Record<string, any> = {};
    
    for (const [eventType, pattern] of this.eventPatterns) {
      result[eventType] = { ...pattern };
    }

    return result;
  }
}