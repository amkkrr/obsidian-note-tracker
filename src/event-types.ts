/**
 * 事件类型定义和基础事件类
 * 
 * 提供了事件系统的基础类型定义、事件基类实现
 * 以及常用的事件类型和工具函数
 */

import { 
  IBaseEvent, 
  IEventContext, 
  EventPriority, 
  EventStatus,
  IEventSerializer
} from './interfaces';

/** 事件ID生成器 */
export class EventIdGenerator {
  private static counter = 0;
  private static prefix = 'evt';

  /** 生成唯一事件ID */
  static generate(): string {
    return `${this.prefix}_${Date.now()}_${++this.counter}`;
  }

  /** 设置ID前缀 */
  static setPrefix(prefix: string): void {
    this.prefix = prefix;
  }
}

/** 基础事件类 */
export class BaseEvent implements IBaseEvent {
  public readonly id: string;
  public readonly type: string;
  public readonly timestamp: number;
  public priority: EventPriority;
  public status: EventStatus;
  public payload: any;
  public metadata?: Record<string, any>;
  public context?: IEventContext;

  constructor(
    type: string,
    payload: any,
    options: {
      priority?: EventPriority;
      metadata?: Record<string, any>;
      context?: IEventContext;
      id?: string;
    } = {}
  ) {
    this.id = options.id || EventIdGenerator.generate();
    this.type = type;
    this.timestamp = Date.now();
    this.priority = options.priority || EventPriority.NORMAL;
    this.status = EventStatus.PENDING;
    this.payload = payload;
    this.metadata = options.metadata;
    this.context = options.context;
  }

  /** 克隆事件 */
  clone(): BaseEvent {
    const cloned = new BaseEvent(this.type, this.payload, {
      priority: this.priority,
      metadata: this.metadata ? { ...this.metadata } : undefined,
      context: this.context ? { ...this.context } : undefined,
    });
    cloned.status = this.status;
    return cloned;
  }

  /** 更新事件状态 */
  updateStatus(status: EventStatus): void {
    this.status = status;
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata.statusUpdateTime = Date.now();
  }

  /** 添加元数据 */
  addMetadata(key: string, value: any): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    this.metadata[key] = value;
  }

  /** 获取元数据 */
  getMetadata(key: string): any {
    return this.metadata?.[key];
  }

  /** 检查事件是否过期 */
  isExpired(ttlMs: number): boolean {
    return Date.now() - this.timestamp > ttlMs;
  }

  /** 获取事件年龄（毫秒） */
  getAge(): number {
    return Date.now() - this.timestamp;
  }

  /** 生成事件哈希（用于去重） */
  getContentHash(): string {
    const content = {
      type: this.type,
      payload: this.payload,
      context: this.context,
    };
    return this.hash(JSON.stringify(content));
  }

  /** 简单哈希函数 */
  private hash(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /** 转换为JSON */
  toJSON(): any {
    return {
      id: this.id,
      type: this.type,
      timestamp: this.timestamp,
      priority: this.priority,
      status: this.status,
      payload: this.payload,
      metadata: this.metadata,
      context: this.context,
    };
  }

  /** 从JSON创建事件 */
  static fromJSON(json: any): BaseEvent {
    const event = new BaseEvent(json.type, json.payload, {
      priority: json.priority,
      metadata: json.metadata,
      context: json.context,
      id: json.id,
    });
    event.status = json.status;
    return event;
  }
}

/** 系统事件类 */
export class SystemEvent extends BaseEvent {
  constructor(
    type: string,
    payload: any,
    options: {
      priority?: EventPriority;
      metadata?: Record<string, any>;
      context?: IEventContext;
    } = {}
  ) {
    super(type, payload, {
      ...options,
      context: {
        source: 'system',
        ...options.context,
      },
    });
  }
}

/** 用户事件类 */
export class UserEvent extends BaseEvent {
  constructor(
    type: string,
    payload: any,
    userId: string,
    options: {
      priority?: EventPriority;
      metadata?: Record<string, any>;
      context?: IEventContext;
    } = {}
  ) {
    super(type, payload, {
      ...options,
      context: {
        source: 'user',
        userId,
        ...options.context,
      },
    });
  }
}

/** 错误事件类 */
export class ErrorEvent extends BaseEvent {
  constructor(
    error: Error,
    context?: IEventContext,
    options: {
      priority?: EventPriority;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super('error', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    }, {
      priority: EventPriority.HIGH,
      ...options,
      context: {
        source: 'system',
        ...context,
      },
    });
  }
}

/** 性能监控事件类 */
export class PerformanceEvent extends BaseEvent {
  constructor(
    operation: string,
    duration: number,
    options: {
      success?: boolean;
      metadata?: Record<string, any>;
      context?: IEventContext;
    } = {}
  ) {
    super('performance', {
      operation,
      duration,
      success: options.success ?? true,
    }, {
      priority: EventPriority.LOW,
      metadata: options.metadata,
      context: {
        source: 'system',
        ...options.context,
      },
    });
  }
}

/** 事件工厂类 */
export class EventFactory {
  /** 创建基础事件 */
  static createEvent(
    type: string,
    payload: any,
    options?: {
      priority?: EventPriority;
      metadata?: Record<string, any>;
      context?: IEventContext;
    }
  ): BaseEvent {
    return new BaseEvent(type, payload, options);
  }

  /** 创建系统事件 */
  static createSystemEvent(
    type: string,
    payload: any,
    options?: {
      priority?: EventPriority;
      metadata?: Record<string, any>;
      context?: IEventContext;
    }
  ): SystemEvent {
    return new SystemEvent(type, payload, options);
  }

  /** 创建用户事件 */
  static createUserEvent(
    type: string,
    payload: any,
    userId: string,
    options?: {
      priority?: EventPriority;
      metadata?: Record<string, any>;
      context?: IEventContext;
    }
  ): UserEvent {
    return new UserEvent(type, payload, userId, options);
  }

  /** 创建错误事件 */
  static createErrorEvent(
    error: Error,
    context?: IEventContext,
    options?: {
      priority?: EventPriority;
      metadata?: Record<string, any>;
    }
  ): ErrorEvent {
    return new ErrorEvent(error, context, options);
  }

  /** 创建性能监控事件 */
  static createPerformanceEvent(
    operation: string,
    duration: number,
    options?: {
      success?: boolean;
      metadata?: Record<string, any>;
      context?: IEventContext;
    }
  ): PerformanceEvent {
    return new PerformanceEvent(operation, duration, options);
  }
}

/** 事件类型常量 */
export const EventTypes = {
  // 系统事件
  SYSTEM_STARTED: 'system.started',
  SYSTEM_STOPPED: 'system.stopped',
  SYSTEM_ERROR: 'system.error',
  
  // 用户事件
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
  USER_ACTION: 'user.action',
  
  // 业务事件
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_COMPLETED: 'task.completed',
  TASK_DELETED: 'task.deleted',
  
  // 网络事件
  REQUEST_STARTED: 'request.started',
  REQUEST_COMPLETED: 'request.completed',
  REQUEST_FAILED: 'request.failed',
  
  // 性能事件
  PERFORMANCE_METRIC: 'performance.metric',
  PERFORMANCE_ALERT: 'performance.alert',
  
  // 错误事件
  ERROR_OCCURRED: 'error.occurred',
  ERROR_RECOVERED: 'error.recovered',
} as const;

/** 事件序列化器实现 */
export class JSONEventSerializer implements IEventSerializer {
  /** 序列化事件 */
  serialize(event: IBaseEvent): string {
    try {
      return JSON.stringify(event.toJSON ? event.toJSON() : event);
    } catch (error) {
      throw new Error(`Failed to serialize event: ${error.message}`);
    }
  }

  /** 反序列化事件 */
  deserialize(data: string): IBaseEvent {
    try {
      const json = JSON.parse(data);
      return BaseEvent.fromJSON(json);
    } catch (error) {
      throw new Error(`Failed to deserialize event: ${error.message}`);
    }
  }
}

/** 事件验证器 */
export class EventValidator {
  /** 验证事件对象 */
  static validate(event: any): event is IBaseEvent {
    if (!event || typeof event !== 'object') {
      return false;
    }

    const required = ['id', 'type', 'timestamp', 'priority', 'status'];
    for (const field of required) {
      if (!(field in event)) {
        return false;
      }
    }

    // 验证字段类型
    if (typeof event.id !== 'string' || event.id.length === 0) {
      return false;
    }

    if (typeof event.type !== 'string' || event.type.length === 0) {
      return false;
    }

    if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
      return false;
    }

    if (!Object.values(EventPriority).includes(event.priority)) {
      return false;
    }

    if (!Object.values(EventStatus).includes(event.status)) {
      return false;
    }

    return true;
  }

  /** 验证事件类型 */
  static validateType(type: string): boolean {
    return typeof type === 'string' && type.length > 0 && /^[a-zA-Z][a-zA-Z0-9._-]*$/.test(type);
  }

  /** 验证事件上下文 */
  static validateContext(context: any): context is IEventContext {
    if (!context || typeof context !== 'object') {
      return false;
    }

    if (!('source' in context) || typeof context.source !== 'string') {
      return false;
    }

    return true;
  }
}

/** 事件统计信息 */
export class EventStats {
  private stats = new Map<string, {
    count: number;
    lastSeen: number;
    avgSize: number;
    totalSize: number;
  }>();

  /** 记录事件 */
  record(event: IBaseEvent): void {
    const type = event.type;
    const size = JSON.stringify(event).length;
    
    if (!this.stats.has(type)) {
      this.stats.set(type, {
        count: 0,
        lastSeen: 0,
        avgSize: 0,
        totalSize: 0,
      });
    }

    const stat = this.stats.get(type)!;
    stat.count++;
    stat.lastSeen = event.timestamp;
    stat.totalSize += size;
    stat.avgSize = stat.totalSize / stat.count;
  }

  /** 获取统计信息 */
  getStats(): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [type, stat] of this.stats) {
      result[type] = {
        count: stat.count,
        lastSeen: new Date(stat.lastSeen).toISOString(),
        avgSize: Math.round(stat.avgSize),
        totalSize: stat.totalSize,
      };
    }

    return result;
  }

  /** 清理统计信息 */
  clear(): void {
    this.stats.clear();
  }

  /** 获取事件类型数量 */
  getEventTypeCount(): number {
    return this.stats.size;
  }

  /** 获取总事件数量 */
  getTotalEventCount(): number {
    let total = 0;
    for (const stat of this.stats.values()) {
      total += stat.count;
    }
    return total;
  }
}