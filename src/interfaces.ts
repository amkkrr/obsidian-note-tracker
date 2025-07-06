/**
 * 事件驱动架构核心接口定义
 * 
 * 定义了事件系统的核心契约，包括事件发射器、处理器链、
 * 异步处理器等组件的接口规范
 */

/** 事件优先级枚举 */
export enum EventPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4,
}

/** 事件状态枚举 */
export enum EventStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/** 基础事件接口 */
export interface IBaseEvent {
  /** 事件唯一标识 */
  id: string;
  /** 事件类型 */
  type: string;
  /** 事件发生时间戳 */
  timestamp: number;
  /** 事件优先级 */
  priority: EventPriority;
  /** 事件状态 */
  status: EventStatus;
  /** 事件数据载荷 */
  payload: any;
  /** 事件元数据 */
  metadata?: Record<string, any>;
  /** 事件上下文信息 */
  context?: IEventContext;
}

/** 事件上下文接口 */
export interface IEventContext {
  /** 事件来源 */
  source: string;
  /** 用户ID */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
  /** 跟踪ID */
  traceId?: string;
  /** 相关事件ID */
  correlationId?: string;
  /** 额外的上下文数据 */
  data?: Record<string, any>;
}

/** 事件监听器接口 */
export interface IEventListener<T extends IBaseEvent = IBaseEvent> {
  /** 监听器唯一标识 */
  id: string;
  /** 监听器优先级 */
  priority: EventPriority;
  /** 是否为一次性监听器 */
  once: boolean;
  /** 事件处理函数 */
  handler: (event: T) => Promise<void> | void;
  /** 错误处理函数 */
  errorHandler?: (error: Error, event: T) => void;
  /** 监听器过滤器 */
  filter?: (event: T) => boolean;
}

/** 事件发射器接口 */
export interface IEventEmitter {
  /** 注册事件监听器 */
  on<T extends IBaseEvent>(
    eventType: string,
    listener: IEventListener<T> | ((event: T) => Promise<void> | void)
  ): this;

  /** 注册一次性事件监听器 */
  once<T extends IBaseEvent>(
    eventType: string,
    listener: IEventListener<T> | ((event: T) => Promise<void> | void)
  ): this;

  /** 移除事件监听器 */
  off(eventType: string, listenerId?: string): this;

  /** 发射事件 */
  emit<T extends IBaseEvent>(event: T): Promise<void>;

  /** 获取事件监听器数量 */
  listenerCount(eventType: string): number;

  /** 获取所有事件类型 */
  eventNames(): string[];

  /** 清理所有监听器 */
  removeAllListeners(eventType?: string): this;
}

/** 事件处理器接口 */
export interface IEventHandler<T extends IBaseEvent = IBaseEvent> {
  /** 处理器唯一标识 */
  id: string;
  /** 处理器优先级 */
  priority: EventPriority;
  /** 是否可以处理该事件 */
  canHandle(event: T): boolean;
  /** 处理事件 */
  handle(event: T, context?: IProcessingContext): Promise<IProcessingResult>;
  /** 获取处理器描述 */
  getDescription(): string;
}

/** 处理链接口 */
export interface IProcessingChain {
  /** 添加处理器 */
  addHandler(handler: IEventHandler): this;
  /** 移除处理器 */
  removeHandler(handlerId: string): this;
  /** 处理事件 */
  process<T extends IBaseEvent>(event: T): Promise<IProcessingResult>;
  /** 获取处理器数量 */
  getHandlerCount(): number;
}

/** 处理上下文接口 */
export interface IProcessingContext {
  /** 处理开始时间 */
  startTime: number;
  /** 已处理的处理器数量 */
  processedHandlers: number;
  /** 处理链中的总处理器数量 */
  totalHandlers: number;
  /** 是否应该停止处理 */
  shouldStop: boolean;
  /** 处理结果集合 */
  results: IProcessingResult[];
  /** 上下文数据 */
  data: Record<string, any>;
}

/** 处理结果接口 */
export interface IProcessingResult {
  /** 处理器ID */
  handlerId: string;
  /** 处理是否成功 */
  success: boolean;
  /** 处理耗时（毫秒） */
  duration: number;
  /** 错误信息 */
  error?: Error;
  /** 结果数据 */
  data?: any;
  /** 是否应该停止后续处理 */
  stopPropagation?: boolean;
}

/** 事件去重配置接口 */
export interface IDeduplicationConfig {
  /** 去重窗口时间（毫秒） */
  windowMs: number;
  /** 最大缓存事件数量 */
  maxCacheSize: number;
  /** 去重键生成函数 */
  keyGenerator?: (event: IBaseEvent) => string;
  /** 是否启用内容去重 */
  contentBasedDeduplication: boolean;
}

/** 防抖配置接口 */
export interface IDebounceConfig {
  /** 防抖延迟时间（毫秒） */
  delayMs: number;
  /** 最大等待时间（毫秒） */
  maxWaitMs?: number;
  /** 是否在前沿触发 */
  leading?: boolean;
  /** 是否在后沿触发 */
  trailing?: boolean;
}

/** 异步处理器配置接口 */
export interface IAsyncProcessorConfig {
  /** 最大并发处理数 */
  maxConcurrency: number;
  /** 队列最大长度 */
  maxQueueSize: number;
  /** 处理超时时间（毫秒） */
  timeoutMs: number;
  /** 重试次数 */
  retryCount: number;
  /** 重试延迟时间（毫秒） */
  retryDelayMs: number;
  /** 是否启用批处理 */
  batchProcessing: boolean;
  /** 批处理大小 */
  batchSize?: number;
  /** 批处理等待时间（毫秒） */
  batchWaitMs?: number;
}

/** 异步处理器接口 */
export interface IAsyncProcessor {
  /** 处理器配置 */
  config: IAsyncProcessorConfig;
  /** 开始处理 */
  start(): Promise<void>;
  /** 停止处理 */
  stop(): Promise<void>;
  /** 添加事件到队列 */
  enqueue(event: IBaseEvent): Promise<void>;
  /** 获取队列状态 */
  getQueueStatus(): IQueueStatus;
  /** 获取处理统计信息 */
  getStats(): IProcessorStats;
}

/** 队列状态接口 */
export interface IQueueStatus {
  /** 队列长度 */
  queueSize: number;
  /** 正在处理的任务数 */
  processingCount: number;
  /** 是否运行中 */
  isRunning: boolean;
  /** 是否已满 */
  isFull: boolean;
}

/** 处理器统计信息接口 */
export interface IProcessorStats {
  /** 已处理事件总数 */
  totalProcessed: number;
  /** 成功处理数量 */
  successCount: number;
  /** 失败处理数量 */
  failureCount: number;
  /** 平均处理时间（毫秒） */
  avgProcessingTime: number;
  /** 最大处理时间（毫秒） */
  maxProcessingTime: number;
  /** 当前队列长度 */
  currentQueueSize: number;
  /** 错误率 */
  errorRate: number;
}

/** 事件序列化接口 */
export interface IEventSerializer {
  /** 序列化事件 */
  serialize(event: IBaseEvent): string;
  /** 反序列化事件 */
  deserialize(data: string): IBaseEvent;
}

/** 事件存储接口 */
export interface IEventStore {
  /** 保存事件 */
  save(event: IBaseEvent): Promise<void>;
  /** 根据ID获取事件 */
  getById(id: string): Promise<IBaseEvent | null>;
  /** 根据类型获取事件 */
  getByType(type: string, limit?: number): Promise<IBaseEvent[]>;
  /** 删除事件 */
  delete(id: string): Promise<void>;
  /** 清理过期事件 */
  cleanup(olderThan: number): Promise<number>;
}

/** 事件总线接口 */
export interface IEventBus extends IEventEmitter {
  /** 设置事件存储 */
  setEventStore(store: IEventStore): this;
  /** 设置序列化器 */
  setSerializer(serializer: IEventSerializer): this;
  /** 启用事件持久化 */
  enablePersistence(): this;
  /** 禁用事件持久化 */
  disablePersistence(): this;
  /** 重放事件 */
  replay(fromTimestamp?: number): Promise<void>;
}