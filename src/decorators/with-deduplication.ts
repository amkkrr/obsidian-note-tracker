/**
 * 事件去重装饰器实现
 * 
 * 提供了基于内容的去重、时间窗口去重和自适应去重策略
 * 优化了内存使用和性能表现
 */

import { IBaseEvent, IEventEmitter, IDeduplicationConfig } from '../interfaces';

/** 去重缓存项 */
interface DedupeCacheItem {
  /** 事件哈希 */
  hash: string;
  /** 首次出现时间 */
  firstSeen: number;
  /** 最后出现时间 */
  lastSeen: number;
  /** 出现次数 */
  count: number;
  /** 事件数据（可选，用于深度比较） */
  eventData?: any;
}

/** 去重统计信息 */
interface DeduplicationStats {
  /** 总处理事件数 */
  totalEvents: number;
  /** 去重事件数 */
  duplicateEvents: number;
  /** 通过事件数 */
  passedEvents: number;
  /** 去重率 */
  deduplicationRate: number;
  /** 缓存大小 */
  cacheSize: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 平均响应时间 */
  avgResponseTime: number;
}

/** 去重策略接口 */
interface IDeduplicationStrategy {
  /** 生成去重键 */
  generateKey(event: IBaseEvent): string;
  /** 检查是否为重复事件 */
  isDuplicate(event: IBaseEvent, cacheItem: DedupeCacheItem): boolean;
  /** 获取策略名称 */
  getName(): string;
}

/** 基于哈希的去重策略 */
class HashBasedStrategy implements IDeduplicationStrategy {
  generateKey(event: IBaseEvent): string {
    return this.generateHash(event);
  }

  isDuplicate(event: IBaseEvent, cacheItem: DedupeCacheItem): boolean {
    return this.generateHash(event) === cacheItem.hash;
  }

  getName(): string {
    return 'hash-based';
  }

  private generateHash(event: IBaseEvent): string {
    // 基于事件类型、载荷和上下文生成哈希
    const content = {
      type: event.type,
      payload: event.payload,
      context: event.context,
    };
    
    const str = JSON.stringify(content);
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}

/** 基于内容的去重策略 */
class ContentBasedStrategy implements IDeduplicationStrategy {
  generateKey(event: IBaseEvent): string {
    return `${event.type}_${JSON.stringify(event.payload)}`;
  }

  isDuplicate(event: IBaseEvent, cacheItem: DedupeCacheItem): boolean {
    if (!cacheItem.eventData) {
      return false;
    }
    
    // 深度比较事件数据
    return this.deepEqual(
      { type: event.type, payload: event.payload },
      cacheItem.eventData
    );
  }

  getName(): string {
    return 'content-based';
  }

  private deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) return true;
    
    if (obj1 == null || obj2 == null) return false;
    
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') {
      return obj1 === obj2;
    }
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (!keys2.includes(key)) return false;
      if (!this.deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  }
}

/** 基于类型和时间的去重策略 */
class TypeTimeBasedStrategy implements IDeduplicationStrategy {
  constructor(private timeWindowMs: number = 1000) {}

  generateKey(event: IBaseEvent): string {
    const timeWindow = Math.floor(event.timestamp / this.timeWindowMs);
    return `${event.type}_${timeWindow}`;
  }

  isDuplicate(event: IBaseEvent, cacheItem: DedupeCacheItem): boolean {
    const eventTimeWindow = Math.floor(event.timestamp / this.timeWindowMs);
    const cacheTimeWindow = Math.floor(cacheItem.firstSeen / this.timeWindowMs);
    
    return eventTimeWindow === cacheTimeWindow;
  }

  getName(): string {
    return 'type-time-based';
  }
}

/** 事件去重装饰器 */
export class EventDeduplicationDecorator implements IEventEmitter {
  private cache = new Map<string, DedupeCacheItem>();
  private strategy: IDeduplicationStrategy;
  private cleanupInterval?: NodeJS.Timeout;
  
  // 统计信息
  private stats = {
    totalEvents: 0,
    duplicateEvents: 0,
    passedEvents: 0,
    cacheHits: 0,
    totalResponseTime: 0,
  };

  constructor(
    private eventEmitter: IEventEmitter,
    private config: IDeduplicationConfig
  ) {
    this.initializeStrategy();
    this.startCleanupScheduler();
  }

  /** 初始化去重策略 */
  private initializeStrategy(): void {
    if (this.config.keyGenerator) {
      // 使用自定义键生成器
      this.strategy = {
        generateKey: this.config.keyGenerator,
        isDuplicate: (event, cacheItem) => true, // 简单键匹配
        getName: () => 'custom',
      };
    } else if (this.config.contentBasedDeduplication) {
      this.strategy = new ContentBasedStrategy();
    } else {
      this.strategy = new HashBasedStrategy();
    }
  }

  /** 启动缓存清理调度器 */
  private startCleanupScheduler(): void {
    // 每分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000);
  }

  /** 清理过期缓存 */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, item] of this.cache) {
      if (now - item.lastSeen > this.config.windowMs) {
        expired.push(key);
      }
    }

    // 删除过期项
    expired.forEach(key => this.cache.delete(key));

    // 如果缓存仍然过大，删除最旧的项
    if (this.cache.size > this.config.maxCacheSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].lastSeen - b[1].lastSeen);
      
      const toDelete = entries.slice(0, this.cache.size - this.config.maxCacheSize);
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  /** 检查事件是否重复 */
  private isDuplicateEvent(event: IBaseEvent): boolean {
    const startTime = Date.now();
    this.stats.totalEvents++;

    try {
      const key = this.strategy.generateKey(event);
      const cacheItem = this.cache.get(key);

      if (!cacheItem) {
        // 新事件，添加到缓存
        this.cache.set(key, {
          hash: key,
          firstSeen: event.timestamp,
          lastSeen: event.timestamp,
          count: 1,
          eventData: this.config.contentBasedDeduplication 
            ? { type: event.type, payload: event.payload }
            : undefined,
        });
        
        this.stats.passedEvents++;
        return false;
      }

      // 检查是否在时间窗口内
      const now = Date.now();
      if (now - cacheItem.lastSeen > this.config.windowMs) {
        // 超出时间窗口，重置缓存项
        cacheItem.firstSeen = event.timestamp;
        cacheItem.lastSeen = event.timestamp;
        cacheItem.count = 1;
        
        this.stats.passedEvents++;
        return false;
      }

      // 检查是否为重复事件
      this.stats.cacheHits++;
      
      if (this.strategy.isDuplicate(event, cacheItem)) {
        // 更新缓存项
        cacheItem.lastSeen = event.timestamp;
        cacheItem.count++;
        
        this.stats.duplicateEvents++;
        return true;
      }

      // 不是重复事件，更新缓存
      cacheItem.lastSeen = event.timestamp;
      this.stats.passedEvents++;
      return false;

    } finally {
      this.stats.totalResponseTime += Date.now() - startTime;
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

  /** 发射事件（带去重） */
  async emit<T extends IBaseEvent>(event: T): Promise<void> {
    // 检查是否为重复事件
    if (this.isDuplicateEvent(event)) {
      // 重复事件，不发射
      return;
    }

    // 发射事件
    await this.eventEmitter.emit(event);
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

  /** 获取去重统计信息 */
  getDeduplicationStats(): DeduplicationStats {
    return {
      totalEvents: this.stats.totalEvents,
      duplicateEvents: this.stats.duplicateEvents,
      passedEvents: this.stats.passedEvents,
      deduplicationRate: this.stats.totalEvents > 0 
        ? this.stats.duplicateEvents / this.stats.totalEvents 
        : 0,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.totalEvents > 0 
        ? this.stats.cacheHits / this.stats.totalEvents 
        : 0,
      avgResponseTime: this.stats.totalEvents > 0 
        ? this.stats.totalResponseTime / this.stats.totalEvents 
        : 0,
    };
  }

  /** 获取缓存状态 */
  getCacheStatus(): {
    size: number;
    maxSize: number;
    usage: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    if (this.cache.size === 0) {
      return {
        size: 0,
        maxSize: this.config.maxCacheSize,
        usage: 0,
        oldestEntry: 0,
        newestEntry: 0,
      };
    }

    const entries = Array.from(this.cache.values());
    const timestamps = entries.map(e => e.lastSeen);
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      usage: this.cache.size / this.config.maxCacheSize,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    };
  }

  /** 清理缓存 */
  clearCache(): void {
    this.cache.clear();
  }

  /** 重置统计信息 */
  resetStats(): void {
    this.stats = {
      totalEvents: 0,
      duplicateEvents: 0,
      passedEvents: 0,
      cacheHits: 0,
      totalResponseTime: 0,
    };
  }

  /** 更新去重配置 */
  updateConfig(config: Partial<IDeduplicationConfig>): void {
    this.config = { ...this.config, ...config };
    this.initializeStrategy();
  }

  /** 获取当前策略信息 */
  getStrategyInfo(): {
    name: string;
    config: IDeduplicationConfig;
  } {
    return {
      name: this.strategy.getName(),
      config: this.config,
    };
  }

  /** 导出缓存数据 */
  exportCache(): Array<{
    key: string;
    hash: string;
    firstSeen: number;
    lastSeen: number;
    count: number;
  }> {
    return Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      hash: item.hash,
      firstSeen: item.firstSeen,
      lastSeen: item.lastSeen,
      count: item.count,
    }));
  }

  /** 导入缓存数据 */
  importCache(data: Array<{
    key: string;
    hash: string;
    firstSeen: number;
    lastSeen: number;
    count: number;
  }>): void {
    this.cache.clear();
    
    for (const item of data) {
      this.cache.set(item.key, {
        hash: item.hash,
        firstSeen: item.firstSeen,
        lastSeen: item.lastSeen,
        count: item.count,
      });
    }
  }

  /** 销毁装饰器 */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    
    this.cache.clear();
    this.resetStats();
  }
}

/** 去重装饰器工厂函数 */
export function withDeduplication(
  eventEmitter: IEventEmitter,
  config: IDeduplicationConfig
): EventDeduplicationDecorator {
  return new EventDeduplicationDecorator(eventEmitter, config);
}

/** 自适应去重装饰器 */
export class AdaptiveDeduplicationDecorator extends EventDeduplicationDecorator {
  private performanceMetrics = {
    avgEventRate: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
  };

  constructor(
    eventEmitter: IEventEmitter,
    config: IDeduplicationConfig
  ) {
    super(eventEmitter, config);
    this.startAdaptiveOptimization();
  }

  /** 启动自适应优化 */
  private startAdaptiveOptimization(): void {
    setInterval(() => {
      this.optimizeConfiguration();
    }, 30000); // 每30秒优化一次
  }

  /** 优化配置 */
  private optimizeConfiguration(): void {
    const stats = this.getDeduplicationStats();
    const cacheStatus = this.getCacheStatus();

    // 更新性能指标
    this.performanceMetrics.cacheHitRate = stats.cacheHitRate;
    this.performanceMetrics.memoryUsage = cacheStatus.usage;

    // 根据性能指标调整配置
    if (stats.cacheHitRate < 0.1 && cacheStatus.usage > 0.8) {
      // 缓存命中率低但使用率高，增加缓存大小
      this.updateConfig({
        maxCacheSize: Math.min(this.config.maxCacheSize * 1.2, 10000),
      });
    } else if (stats.cacheHitRate > 0.5 && cacheStatus.usage < 0.3) {
      // 缓存命中率高但使用率低，减少缓存大小
      this.updateConfig({
        maxCacheSize: Math.max(this.config.maxCacheSize * 0.8, 100),
      });
    }

    // 根据事件频率调整时间窗口
    if (stats.deduplicationRate > 0.3) {
      // 去重率高，可能需要更长的时间窗口
      this.updateConfig({
        windowMs: Math.min(this.config.windowMs * 1.1, 300000), // 最多5分钟
      });
    } else if (stats.deduplicationRate < 0.1) {
      // 去重率低，可以缩短时间窗口
      this.updateConfig({
        windowMs: Math.max(this.config.windowMs * 0.9, 1000), // 最少1秒
      });
    }
  }

  /** 获取自适应性能指标 */
  getAdaptiveMetrics(): {
    performanceMetrics: typeof this.performanceMetrics;
    currentConfig: IDeduplicationConfig;
    recommendations: string[];
  } {
    const stats = this.getDeduplicationStats();
    const recommendations: string[] = [];

    if (stats.cacheHitRate < 0.1) {
      recommendations.push('Consider increasing cache size or adjusting time window');
    }

    if (stats.deduplicationRate > 0.5) {
      recommendations.push('High duplication rate detected, consider investigating event sources');
    }

    if (stats.avgResponseTime > 10) {
      recommendations.push('High response time, consider optimizing deduplication strategy');
    }

    return {
      performanceMetrics: this.performanceMetrics,
      currentConfig: this.config,
      recommendations,
    };
  }
}