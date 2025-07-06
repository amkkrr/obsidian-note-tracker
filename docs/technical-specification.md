# Obsidian 访问计数插件 - 技术规格文档

## 1. 项目概述

### 1.1 项目描述
开发一个 Obsidian 插件，自动为笔记文件添加访问计数功能。每次访问文件时，插件会在该文件的 frontmatter 中更新指定的计数标签，实现对笔记访问频率的统计和追踪。

### 1.2 核心功能
- 自动监听文件访问事件
- 在 frontmatter 中维护访问计数
- 支持自定义计数标签名称
- 可配置作用范围（目录级别）
- 防止重复计数机制
- 批量处理优化性能

### 1.3 技术栈
- **开发语言**: TypeScript
- **框架**: Obsidian Plugin API
- **构建工具**: esbuild
- **包管理**: npm
- **版本控制**: Git

## 2. 系统架构

### 2.1 整体架构图
```
┌─────────────────────────────────────────────────────────────────┐
│                     Obsidian Plugin Host                       │
├─────────────────────────────────────────────────────────────────┤
│                     Plugin Main Class                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  AccessTracker  │  │ ConfigManager   │  │  UIManager      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │FrontmatterMgr   │  │   PathFilter    │  │  BatchProcessor │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  CacheManager   │  │  ErrorHandler   │  │  EventEmitter   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 核心组件职责

#### 2.2.1 AccessTracker
**职责**: 监听文件访问事件，触发计数逻辑
- 注册 Obsidian 文件访问事件监听器
- 实现访问频率控制（防重复计数）
- 管理访问事件的生命周期

#### 2.2.2 FrontmatterManager
**职责**: 安全地读取和更新 frontmatter 数据
- 解析现有 frontmatter 格式
- 保持原有格式的安全更新
- 处理无 frontmatter 的文件
- 数据验证和错误恢复

#### 2.2.3 ConfigManager
**职责**: 管理插件配置和设置
- 配置数据的持久化
- 配置验证和默认值处理
- 配置变更事件通知
- 设置迁移和兼容性处理

#### 2.2.4 PathFilter
**职责**: 实现文件路径过滤逻辑
- 目录范围匹配算法
- 递归子目录处理
- 排除规则实现
- 路径规范化处理

#### 2.2.5 BatchProcessor
**职责**: 批量处理文件更新操作
- 更新操作队列管理
- 批量处理调度算法
- 防抖动机制实现
- 错误处理和重试机制

#### 2.2.6 CacheManager
**职责**: 管理内存缓存和性能优化
- LRU 缓存实现
- 访问时间记录
- 内存使用监控
- 缓存清理策略

## 3. 接口设计

### 3.1 核心接口定义

```typescript
interface IAccessTracker {
  startTracking(): void;
  stopTracking(): void;
  onFileAccess(file: TFile): Promise<void>;
  isTracking(): boolean;
}

interface IFrontmatterManager {
  readCounter(file: TFile, key: string): Promise<number>;
  updateCounter(file: TFile, key: string, value: number): Promise<void>;
  hasValidFrontmatter(file: TFile): boolean;
  createFrontmatter(file: TFile, data: Record<string, any>): Promise<void>;
}

interface IConfigManager {
  getConfig(): PluginConfig;
  updateConfig(config: Partial<PluginConfig>): Promise<void>;
  validateConfig(config: PluginConfig): ValidationResult;
  onConfigChange(callback: (config: PluginConfig) => void): void;
}

interface IPathFilter {
  shouldTrackFile(file: TFile): boolean;
  isWithinScope(filePath: string): boolean;
  addIncludePath(path: string): void;
  removeIncludePath(path: string): void;
}

interface IBatchProcessor {
  enqueueUpdate(operation: UpdateOperation): void;
  flush(): Promise<void>;
  setMaxBatchSize(size: number): void;
  setFlushInterval(interval: number): void;
}
```

### 3.2 数据类型定义

```typescript
interface PluginConfig {
  counterKey: string;
  includedPaths: string[];
  excludedPaths: string[];
  recursive: boolean;
  minInterval: number;
  batchSize: number;
  maxCacheSize: number;
  enabled: boolean;
  debugMode: boolean;
}

interface UpdateOperation {
  file: TFile;
  key: string;
  value: number;
  timestamp: number;
  retryCount: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface AccessRecord {
  filePath: string;
  lastAccess: number;
  accessCount: number;
}
```

## 4. 数据流程

### 4.1 文件访问处理流程
```
文件打开事件
    ↓
PathFilter 检查是否在作用范围内
    ↓
CacheManager 检查是否需要计数（防重复）
    ↓
FrontmatterManager 读取当前计数
    ↓
计算新的计数值
    ↓
BatchProcessor 加入更新队列
    ↓
批量处理更新操作
    ↓
FrontmatterManager 更新 frontmatter
    ↓
更新缓存记录
```

### 4.2 配置变更处理流程
```
用户修改配置
    ↓
ConfigManager 验证配置
    ↓
保存配置到存储
    ↓
通知相关组件配置变更
    ↓
PathFilter 更新过滤规则
    ↓
BatchProcessor 更新处理参数
    ↓
CacheManager 清理相关缓存
```

## 5. 性能要求

### 5.1 响应时间要求
- 文件访问事件处理: < 10ms
- 配置更新响应: < 100ms
- 批量更新处理: < 1s
- 设置界面响应: < 200ms

### 5.2 资源使用限制
- 内存使用: < 20MB
- 磁盘空间: < 1MB
- CPU 使用: < 5% (空闲时)
- 网络带宽: 无需网络访问

### 5.3 可扩展性要求
- 支持同时跟踪 10,000+ 文件
- 支持每分钟 1,000+ 次文件访问
- 支持 100+ 个配置的目录路径
- 支持 7x24 小时连续运行

## 6. 安全性考虑

### 6.1 数据完整性
- 文件更新的原子性操作
- 配置数据的验证和清理
- 异常情况的回滚机制
- 数据备份和恢复策略

### 6.2 权限控制
- 只读取必要的文件元数据
- 不访问文件内容（除 frontmatter）
- 遵守 Obsidian 插件沙箱限制
- 用户数据的隐私保护

### 6.3 错误处理
- 全面的异常捕获和处理
- 用户友好的错误提示
- 详细的调试日志记录
- 优雅的降级机制

## 7. 兼容性要求

### 7.1 平台兼容性
- Windows 10/11
- macOS 10.15+
- Linux (Ubuntu 18.04+)
- iOS (Obsidian Mobile)
- Android (Obsidian Mobile)

### 7.2 Obsidian 版本兼容性
- 最低版本: Obsidian 1.0.0
- 推荐版本: Obsidian 1.4.0+
- API 版本: 1.0.0+

### 7.3 第三方插件兼容性
- 不与其他插件冲突
- 遵循 Obsidian 插件最佳实践
- 支持主流主题和 CSS 片段

## 8. 测试策略

### 8.1 单元测试
- 每个组件独立测试
- 接口契约测试
- 边界条件测试
- 异常情况测试

### 8.2 集成测试
- 组件间交互测试
- 端到端功能测试
- 性能基准测试
- 兼容性测试

### 8.3 用户接受测试
- 功能可用性测试
- 用户体验测试
- 文档准确性测试
- 错误处理测试

## 9. 部署和发布

### 9.1 构建流程
- TypeScript 编译
- 代码压缩和优化
- 依赖打包
- 版本号管理

### 9.2 发布流程
- 代码审查和质量检查
- 测试用例执行
- 发布包生成
- 社区插件市场提交

### 9.3 版本管理
- 语义化版本控制
- 变更日志维护
- 向后兼容性保证
- 升级路径规划

## 10. 维护和支持

### 10.1 监控和诊断
- 性能监控指标
- 错误日志收集
- 用户反馈收集
- 使用统计分析

### 10.2 持续改进
- 定期性能优化
- 功能增强计划
- 安全漏洞修复
- 用户需求响应

### 10.3 社区支持
- 问题报告处理
- 功能请求评估
- 开发者文档维护
- 社区贡献指导