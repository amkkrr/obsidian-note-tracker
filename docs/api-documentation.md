# Obsidian 访问计数插件 - API 文档

## 1. 核心接口定义

### 1.1 IAccessTracker

监听文件访问事件并触发计数逻辑的核心接口。

```typescript
interface IAccessTracker {
    /**
     * 开始跟踪文件访问事件
     * @throws {Error} 如果已经在跟踪中则抛出异常
     */
    startTracking(): void;

    /**
     * 停止跟踪文件访问事件
     */
    stopTracking(): void;

    /**
     * 处理文件访问事件
     * @param file 被访问的文件对象
     * @returns Promise<void>
     */
    onFileAccess(file: TFile): Promise<void>;

    /**
     * 检查是否正在跟踪
     * @returns boolean 跟踪状态
     */
    isTracking(): boolean;

    /**
     * 获取跟踪统计信息
     * @returns TrackingStats 统计数据
     */
    getStats(): TrackingStats;
}
```

#### 使用示例
```typescript
const tracker = new AccessTracker(app, configManager);

// 开始跟踪
tracker.startTracking();

// 检查状态
if (tracker.isTracking()) {
    console.log('Tracking is active');
}

// 获取统计信息
const stats = tracker.getStats();
console.log(`Processed ${stats.totalAccesses} file accesses`);

// 停止跟踪
tracker.stopTracking();
```

### 1.2 IFrontmatterManager

管理文件 frontmatter 读写操作的接口。

```typescript
interface IFrontmatterManager {
    /**
     * 读取文件中指定键的计数值
     * @param file 目标文件
     * @param key 计数器键名
     * @returns Promise<number> 当前计数值，不存在则返回 0
     * @throws {FrontmatterError} 解析错误时抛出异常
     */
    readCounter(file: TFile, key: string): Promise<number>;

    /**
     * 更新文件中指定键的计数值
     * @param file 目标文件
     * @param key 计数器键名
     * @param value 新的计数值
     * @returns Promise<void>
     * @throws {FrontmatterError} 更新失败时抛出异常
     */
    updateCounter(file: TFile, key: string, value: number): Promise<void>;

    /**
     * 检查文件是否包含有效的 frontmatter
     * @param file 目标文件
     * @returns boolean 是否包含有效 frontmatter
     */
    hasValidFrontmatter(file: TFile): boolean;

    /**
     * 为文件创建 frontmatter
     * @param file 目标文件
     * @param data 初始数据
     * @returns Promise<void>
     * @throws {FrontmatterError} 创建失败时抛出异常
     */
    createFrontmatter(file: TFile, data: Record<string, any>): Promise<void>;

    /**
     * 批量更新多个文件的计数器
     * @param updates 更新操作数组
     * @returns Promise<BatchUpdateResult> 批量更新结果
     */
    batchUpdateCounters(updates: CounterUpdate[]): Promise<BatchUpdateResult>;
}
```

#### 使用示例
```typescript
const frontmatterManager = new FrontmatterManager(app.vault);

// 读取计数值
const currentCount = await frontmatterManager.readCounter(file, 'access_count');

// 更新计数值
await frontmatterManager.updateCounter(file, 'access_count', currentCount + 1);

// 检查 frontmatter
if (!frontmatterManager.hasValidFrontmatter(file)) {
    await frontmatterManager.createFrontmatter(file, { access_count: 1 });
}

// 批量更新
const updates: CounterUpdate[] = [
    { file: file1, key: 'access_count', value: 5 },
    { file: file2, key: 'access_count', value: 3 }
];
const result = await frontmatterManager.batchUpdateCounters(updates);
console.log(`Updated ${result.successCount} files, ${result.failureCount} failures`);
```

### 1.3 IConfigManager

管理插件配置的接口。

```typescript
interface IConfigManager {
    /**
     * 获取当前配置
     * @returns PluginConfig 当前配置对象
     */
    getConfig(): PluginConfig;

    /**
     * 更新配置
     * @param config 部分配置对象
     * @returns Promise<void>
     * @throws {ConfigError} 配置验证失败时抛出异常
     */
    updateConfig(config: Partial<PluginConfig>): Promise<void>;

    /**
     * 验证配置有效性
     * @param config 待验证的配置
     * @returns ValidationResult 验证结果
     */
    validateConfig(config: PluginConfig): ValidationResult;

    /**
     * 注册配置变更监听器
     * @param callback 配置变更回调函数
     * @returns () => void 取消监听的函数
     */
    onConfigChange(callback: (config: PluginConfig) => void): () => void;

    /**
     * 重置配置为默认值
     * @returns Promise<void>
     */
    resetToDefaults(): Promise<void>;

    /**
     * 导出配置为 JSON
     * @returns string JSON 格式的配置
     */
    exportConfig(): string;

    /**
     * 从 JSON 导入配置
     * @param json JSON 格式的配置字符串
     * @returns Promise<void>
     * @throws {ConfigError} 导入失败时抛出异常
     */
    importConfig(json: string): Promise<void>;
}
```

#### 使用示例
```typescript
const configManager = new ConfigManager(plugin);

// 获取配置
const config = configManager.getConfig();
console.log(`Counter key: ${config.counterKey}`);

// 更新配置
await configManager.updateConfig({
    counterKey: 'visit_count',
    minInterval: 5000
});

// 监听配置变更
const unsubscribe = configManager.onConfigChange((newConfig) => {
    console.log('Config updated:', newConfig);
});

// 验证配置
const validation = configManager.validateConfig(config);
if (!validation.isValid) {
    console.error('Config errors:', validation.errors);
}

// 取消监听
unsubscribe();
```

### 1.4 IPathFilter

处理文件路径过滤逻辑的接口。

```typescript
interface IPathFilter {
    /**
     * 检查文件是否应该被跟踪
     * @param file 目标文件
     * @returns boolean 是否应该跟踪
     */
    shouldTrackFile(file: TFile): boolean;

    /**
     * 检查文件路径是否在作用范围内
     * @param filePath 文件路径
     * @returns boolean 是否在范围内
     */
    isWithinScope(filePath: string): boolean;

    /**
     * 添加包含路径
     * @param path 要包含的路径
     * @returns void
     */
    addIncludePath(path: string): void;

    /**
     * 移除包含路径
     * @param path 要移除的路径
     * @returns boolean 是否成功移除
     */
    removeIncludePath(path: string): boolean;

    /**
     * 添加排除路径
     * @param path 要排除的路径
     * @returns void
     */
    addExcludePath(path: string): void;

    /**
     * 移除排除路径
     * @param path 要移除的路径
     * @returns boolean 是否成功移除
     */
    removeExcludePath(path: string): boolean;

    /**
     * 获取当前过滤规则
     * @returns FilterRules 过滤规则对象
     */
    getFilterRules(): FilterRules;

    /**
     * 重置过滤规则
     * @returns void
     */
    resetFilters(): void;
}
```

#### 使用示例
```typescript
const pathFilter = new PathFilter(configManager);

// 检查文件是否应该跟踪
if (pathFilter.shouldTrackFile(file)) {
    await tracker.onFileAccess(file);
}

// 添加/移除路径
pathFilter.addIncludePath('Notes/');
pathFilter.addExcludePath('Notes/Private/');

// 检查路径范围
if (pathFilter.isWithinScope('Notes/Public/test.md')) {
    console.log('File is within tracking scope');
}

// 获取过滤规则
const rules = pathFilter.getFilterRules();
console.log('Include paths:', rules.includePaths);
console.log('Exclude paths:', rules.excludePaths);
```

### 1.5 IBatchProcessor

处理批量更新操作的接口。

```typescript
interface IBatchProcessor {
    /**
     * 将更新操作加入队列
     * @param operation 更新操作
     * @returns void
     */
    enqueueUpdate(operation: UpdateOperation): void;

    /**
     * 立即处理所有待处理的更新
     * @returns Promise<ProcessResult> 处理结果
     */
    flush(): Promise<ProcessResult>;

    /**
     * 设置最大批处理大小
     * @param size 最大批处理大小
     * @returns void
     */
    setMaxBatchSize(size: number): void;

    /**
     * 设置刷新间隔
     * @param interval 间隔时间（毫秒）
     * @returns void
     */
    setFlushInterval(interval: number): void;

    /**
     * 获取队列状态
     * @returns QueueStatus 队列状态信息
     */
    getQueueStatus(): QueueStatus;

    /**
     * 暂停批处理
     * @returns void
     */
    pause(): void;

    /**
     * 恢复批处理
     * @returns void
     */
    resume(): void;

    /**
     * 清空队列
     * @returns void
     */
    clear(): void;
}
```

#### 使用示例
```typescript
const batchProcessor = new BatchProcessor(frontmatterManager);

// 配置批处理参数
batchProcessor.setMaxBatchSize(10);
batchProcessor.setFlushInterval(1000);

// 添加更新操作
batchProcessor.enqueueUpdate({
    file: file,
    key: 'access_count',
    value: newValue,
    timestamp: Date.now(),
    retryCount: 0
});

// 获取队列状态
const status = batchProcessor.getQueueStatus();
console.log(`Queue size: ${status.queueSize}, Processing: ${status.isProcessing}`);

// 强制刷新
const result = await batchProcessor.flush();
console.log(`Processed ${result.processedCount} operations`);
```

## 2. 数据类型定义

### 2.1 核心类型

```typescript
/**
 * 插件配置接口
 */
interface PluginConfig {
    /** 计数器在 frontmatter 中的键名 */
    counterKey: string;
    
    /** 包含的路径列表 */
    includedPaths: string[];
    
    /** 排除的路径列表 */
    excludedPaths: string[];
    
    /** 是否递归包含子目录 */
    recursive: boolean;
    
    /** 最小计数间隔（毫秒），防止重复计数 */
    minInterval: number;
    
    /** 批处理最大大小 */
    batchSize: number;
    
    /** 最大缓存大小 */
    maxCacheSize: number;
    
    /** 是否启用插件 */
    enabled: boolean;
    
    /** 是否启用调试模式 */
    debugMode: boolean;
    
    /** 自动刷新间隔（毫秒） */
    autoFlushInterval: number;
}

/**
 * 更新操作接口
 */
interface UpdateOperation {
    /** 目标文件 */
    file: TFile;
    
    /** 计数器键名 */
    key: string;
    
    /** 新的计数值 */
    value: number;
    
    /** 操作时间戳 */
    timestamp: number;
    
    /** 重试次数 */
    retryCount: number;
    
    /** 操作优先级 */
    priority?: 'low' | 'normal' | 'high';
}

/**
 * 计数器更新接口
 */
interface CounterUpdate {
    /** 目标文件 */
    file: TFile;
    
    /** 计数器键名 */
    key: string;
    
    /** 新的计数值 */
    value: number;
}

/**
 * 访问记录接口
 */
interface AccessRecord {
    /** 文件路径 */
    filePath: string;
    
    /** 最后访问时间 */
    lastAccess: number;
    
    /** 总访问次数 */
    accessCount: number;
    
    /** 首次访问时间 */
    firstAccess: number;
}
```

### 2.2 结果类型

```typescript
/**
 * 验证结果接口
 */
interface ValidationResult {
    /** 是否验证通过 */
    isValid: boolean;
    
    /** 错误信息列表 */
    errors: string[];
    
    /** 警告信息列表 */
    warnings: string[];
}

/**
 * 批量更新结果接口
 */
interface BatchUpdateResult {
    /** 成功更新的数量 */
    successCount: number;
    
    /** 失败的数量 */
    failureCount: number;
    
    /** 失败的操作列表 */
    failures: FailedOperation[];
    
    /** 处理耗时（毫秒） */
    processingTime: number;
}

/**
 * 失败操作接口
 */
interface FailedOperation {
    /** 原始操作 */
    operation: UpdateOperation;
    
    /** 错误信息 */
    error: string;
    
    /** 失败时间 */
    failureTime: number;
}

/**
 * 处理结果接口
 */
interface ProcessResult {
    /** 处理的操作数量 */
    processedCount: number;
    
    /** 成功的操作数量 */
    successCount: number;
    
    /** 失败的操作数量 */
    failureCount: number;
    
    /** 处理时间（毫秒） */
    processingTime: number;
    
    /** 失败的操作列表 */
    failures: FailedOperation[];
}

/**
 * 跟踪统计接口
 */
interface TrackingStats {
    /** 总访问次数 */
    totalAccesses: number;
    
    /** 处理的文件数量 */
    processedFiles: number;
    
    /** 跳过的访问次数 */
    skippedAccesses: number;
    
    /** 错误次数 */
    errorCount: number;
    
    /** 开始跟踪时间 */
    startTime: number;
    
    /** 最后活动时间 */
    lastActivityTime: number;
}

/**
 * 队列状态接口
 */
interface QueueStatus {
    /** 队列大小 */
    queueSize: number;
    
    /** 是否正在处理 */
    isProcessing: boolean;
    
    /** 是否已暂停 */
    isPaused: boolean;
    
    /** 下次刷新时间 */
    nextFlushTime: number;
    
    /** 待处理的高优先级操作数量 */
    highPriorityCount: number;
}

/**
 * 过滤规则接口
 */
interface FilterRules {
    /** 包含路径列表 */
    includePaths: string[];
    
    /** 排除路径列表 */
    excludePaths: string[];
    
    /** 是否递归 */
    recursive: boolean;
    
    /** 文件扩展名过滤 */
    allowedExtensions: string[];
    
    /** 最小文件大小（字节） */
    minFileSize: number;
    
    /** 最大文件大小（字节） */
    maxFileSize: number;
}
```

### 2.3 错误类型

```typescript
/**
 * 插件基础错误类
 */
abstract class PluginError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
    }
}

/**
 * Frontmatter 操作错误
 */
class FrontmatterError extends PluginError {
    constructor(message: string, details?: any) {
        super(message, 'FRONTMATTER_ERROR', details);
    }
}

/**
 * 配置错误
 */
class ConfigError extends PluginError {
    constructor(message: string, details?: any) {
        super(message, 'CONFIG_ERROR', details);
    }
}

/**
 * 文件访问错误
 */
class FileAccessError extends PluginError {
    constructor(message: string, details?: any) {
        super(message, 'FILE_ACCESS_ERROR', details);
    }
}

/**
 * 批处理错误
 */
class BatchProcessingError extends PluginError {
    constructor(message: string, details?: any) {
        super(message, 'BATCH_PROCESSING_ERROR', details);
    }
}
```

## 3. 事件系统

### 3.1 事件类型定义

```typescript
/**
 * 插件事件类型
 */
enum PluginEventType {
    /** 文件访问事件 */
    FILE_ACCESSED = 'file-accessed',
    
    /** 计数器更新事件 */
    COUNTER_UPDATED = 'counter-updated',
    
    /** 配置变更事件 */
    CONFIG_CHANGED = 'config-changed',
    
    /** 批处理完成事件 */
    BATCH_PROCESSED = 'batch-processed',
    
    /** 错误事件 */
    ERROR_OCCURRED = 'error-occurred',
    
    /** 跟踪开始事件 */
    TRACKING_STARTED = 'tracking-started',
    
    /** 跟踪停止事件 */
    TRACKING_STOPPED = 'tracking-stopped'
}

/**
 * 事件数据接口
 */
interface EventData {
    /** 事件时间戳 */
    timestamp: number;
    
    /** 事件来源 */
    source: string;
    
    /** 事件详细数据 */
    data?: any;
}

/**
 * 文件访问事件数据
 */
interface FileAccessedEventData extends EventData {
    /** 被访问的文件 */
    file: TFile;
    
    /** 访问类型 */
    accessType: 'open' | 'modify' | 'close';
    
    /** 是否被计数 */
    wasCounted: boolean;
}

/**
 * 计数器更新事件数据
 */
interface CounterUpdatedEventData extends EventData {
    /** 目标文件 */
    file: TFile;
    
    /** 计数器键名 */
    key: string;
    
    /** 旧值 */
    oldValue: number;
    
    /** 新值 */
    newValue: number;
}
```

### 3.2 事件发射器接口

```typescript
interface IEventEmitter {
    /**
     * 监听事件
     * @param event 事件类型
     * @param listener 事件监听器
     * @returns () => void 取消监听的函数
     */
    on<T extends EventData>(
        event: PluginEventType,
        listener: (data: T) => void
    ): () => void;

    /**
     * 监听事件（一次性）
     * @param event 事件类型
     * @param listener 事件监听器
     * @returns () => void 取消监听的函数
     */
    once<T extends EventData>(
        event: PluginEventType,
        listener: (data: T) => void
    ): () => void;

    /**
     * 发射事件
     * @param event 事件类型
     * @param data 事件数据
     * @returns void
     */
    emit<T extends EventData>(event: PluginEventType, data: T): void;

    /**
     * 移除监听器
     * @param event 事件类型
     * @param listener 要移除的监听器
     * @returns boolean 是否成功移除
     */
    off<T extends EventData>(
        event: PluginEventType,
        listener: (data: T) => void
    ): boolean;

    /**
     * 移除所有监听器
     * @param event 可选的事件类型，不提供则移除所有事件的监听器
     * @returns void
     */
    removeAllListeners(event?: PluginEventType): void;
}
```

#### 使用示例
```typescript
const eventEmitter = new EventEmitter();

// 监听文件访问事件
const unsubscribe = eventEmitter.on(
    PluginEventType.FILE_ACCESSED,
    (data: FileAccessedEventData) => {
        console.log(`File accessed: ${data.file.path}, counted: ${data.wasCounted}`);
    }
);

// 监听计数器更新事件
eventEmitter.on(
    PluginEventType.COUNTER_UPDATED,
    (data: CounterUpdatedEventData) => {
        console.log(`Counter updated for ${data.file.path}: ${data.oldValue} -> ${data.newValue}`);
    }
);

// 发射事件
eventEmitter.emit(PluginEventType.FILE_ACCESSED, {
    timestamp: Date.now(),
    source: 'AccessTracker',
    file: file,
    accessType: 'open',
    wasCounted: true
});

// 取消监听
unsubscribe();
```

## 4. 工具函数和助手类

### 4.1 Logger 工具

```typescript
enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

interface ILogger {
    /**
     * 记录调试信息
     * @param message 消息
     * @param data 附加数据
     */
    debug(message: string, data?: any): void;

    /**
     * 记录信息
     * @param message 消息
     * @param data 附加数据
     */
    info(message: string, data?: any): void;

    /**
     * 记录警告
     * @param message 消息
     * @param data 附加数据
     */
    warn(message: string, data?: any): void;

    /**
     * 记录错误
     * @param message 消息
     * @param error 错误对象或附加数据
     */
    error(message: string, error?: any): void;

    /**
     * 设置日志级别
     * @param level 日志级别
     */
    setLevel(level: LogLevel): void;
}
```

### 4.2 验证器工具

```typescript
interface IValidator {
    /**
     * 验证文件路径
     * @param path 文件路径
     * @returns boolean 是否有效
     */
    isValidPath(path: string): boolean;

    /**
     * 验证计数器键名
     * @param key 键名
     * @returns boolean 是否有效
     */
    isValidCounterKey(key: string): boolean;

    /**
     * 验证配置对象
     * @param config 配置对象
     * @returns ValidationResult 验证结果
     */
    validateConfig(config: PluginConfig): ValidationResult;

    /**
     * 清理和规范化路径
     * @param path 原始路径
     * @returns string 规范化后的路径
     */
    normalizePath(path: string): string;

    /**
     * 验证时间间隔
     * @param interval 时间间隔（毫秒）
     * @returns boolean 是否有效
     */
    isValidInterval(interval: number): boolean;
}
```

### 4.3 缓存管理器

```typescript
interface ICacheManager<K, V> {
    /**
     * 获取缓存值
     * @param key 缓存键
     * @returns V | undefined 缓存值或 undefined
     */
    get(key: K): V | undefined;

    /**
     * 设置缓存值
     * @param key 缓存键
     * @param value 缓存值
     * @param ttl 可选的过期时间（毫秒）
     * @returns void
     */
    set(key: K, value: V, ttl?: number): void;

    /**
     * 检查缓存是否存在
     * @param key 缓存键
     * @returns boolean 是否存在
     */
    has(key: K): boolean;

    /**
     * 删除缓存
     * @param key 缓存键
     * @returns boolean 是否成功删除
     */
    delete(key: K): boolean;

    /**
     * 清空所有缓存
     * @returns void
     */
    clear(): void;

    /**
     * 获取缓存大小
     * @returns number 缓存条目数量
     */
    size(): number;

    /**
     * 清理过期缓存
     * @returns number 清理的条目数量
     */
    cleanup(): number;
}
```

## 5. 最佳实践和使用建议

### 5.1 性能优化

```typescript
// 1. 使用批处理减少 I/O 操作
const batchProcessor = new BatchProcessor(frontmatterManager);
batchProcessor.setMaxBatchSize(50);
batchProcessor.setFlushInterval(2000);

// 2. 实现防抖动机制
class DebouncedTracker {
    private debounceMap = new Map<string, NodeJS.Timeout>();

    onFileAccess(file: TFile): void {
        const existing = this.debounceMap.get(file.path);
        if (existing) {
            clearTimeout(existing);
        }

        const timeout = setTimeout(async () => {
            await this.processFileAccess(file);
            this.debounceMap.delete(file.path);
        }, 500);

        this.debounceMap.set(file.path, timeout);
    }
}

// 3. 使用 LRU 缓存优化内存使用
const cache = new LRUCache<string, AccessRecord>(1000);
```

### 5.2 错误处理

```typescript
// 1. 实现重试机制
async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
    throw new Error('Max retries exceeded');
}

// 2. 优雅的错误处理
class GracefulErrorHandler {
    handleError(error: Error, context: string): void {
        this.logger.error(`Error in ${context}:`, error);
        
        if (error instanceof FrontmatterError) {
            this.notifyUser('Failed to update file counter. Please check file permissions.');
        } else if (error instanceof ConfigError) {
            this.notifyUser('Invalid configuration. Resetting to defaults.');
            this.configManager.resetToDefaults();
        } else {
            this.notifyUser('An unexpected error occurred. Please check the console for details.');
        }
    }
}
```

### 5.3 内存管理

```typescript
// 1. 正确清理资源
class ResourceManager {
    private resources: Array<() => void> = [];

    register(cleanup: () => void): void {
        this.resources.push(cleanup);
    }

    cleanup(): void {
        this.resources.forEach(cleanup => {
            try {
                cleanup();
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        });
        this.resources = [];
    }
}

// 2. 使用弱引用避免内存泄漏
class WeakRefCache<T extends object> {
    private cache = new Map<string, WeakRef<T>>();

    set(key: string, value: T): void {
        this.cache.set(key, new WeakRef(value));
    }

    get(key: string): T | undefined {
        const ref = this.cache.get(key);
        if (!ref) return undefined;

        const value = ref.deref();
        if (!value) {
            this.cache.delete(key);
            return undefined;
        }

        return value;
    }
}
```

这个 API 文档详细定义了所有核心接口、数据类型、事件系统和工具函数，为开发者提供了完整的 API 参考。接下来我会编写用户文档。