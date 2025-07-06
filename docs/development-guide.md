# Obsidian 访问计数插件 - 开发指南

## 1. 开发环境搭建

### 1.1 系统要求
- **Node.js**: 16.0.0 或更高版本
- **npm**: 7.0.0 或更高版本
- **Git**: 2.30.0 或更高版本
- **Obsidian**: 1.0.0 或更高版本
- **操作系统**: Windows 10+, macOS 10.15+, Linux Ubuntu 18.04+

### 1.2 开发工具推荐
- **IDE**: Visual Studio Code
- **扩展**: 
  - TypeScript Importer
  - ESLint
  - Prettier
  - GitLens
  - Obsidian Plugin Dev Utils

### 1.3 环境配置步骤

#### 步骤 1: 检查 Node.js 版本
```bash
node --version
npm --version
```

#### 步骤 2: 克隆项目模板
```bash
# 使用官方模板
git clone https://github.com/obsidianmd/obsidian-sample-plugin.git obsidian-access-counter
cd obsidian-access-counter

# 或者创建新的仓库
git init
git remote add origin <your-repo-url>
```

#### 步骤 3: 安装依赖
```bash
npm install
```

#### 步骤 4: 配置开发环境
```bash
# 复制到 Obsidian 插件目录
cp -r . ~/.obsidian/plugins/obsidian-access-counter/
# 或者创建符号链接
ln -s $(pwd) ~/.obsidian/plugins/obsidian-access-counter
```

#### 步骤 5: 启动开发模式
```bash
npm run dev
```

## 2. 项目结构

### 2.1 目录结构
```
obsidian-access-counter/
├── src/                          # 源代码目录
│   ├── main.ts                   # 插件主入口
│   ├── interfaces/               # 接口定义
│   │   ├── IAccessTracker.ts
│   │   ├── IFrontmatterManager.ts
│   │   ├── IConfigManager.ts
│   │   └── types.ts
│   ├── services/                 # 服务层
│   │   ├── AccessTracker.ts
│   │   ├── FrontmatterManager.ts
│   │   ├── ConfigManager.ts
│   │   ├── PathFilter.ts
│   │   ├── BatchProcessor.ts
│   │   └── CacheManager.ts
│   ├── ui/                       # 用户界面
│   │   ├── SettingsTab.ts
│   │   ├── StatusBarItem.ts
│   │   └── components/
│   ├── utils/                    # 工具函数
│   │   ├── logger.ts
│   │   ├── validators.ts
│   │   └── helpers.ts
│   └── constants/                # 常量定义
│       └── defaults.ts
├── tests/                        # 测试文件
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/                         # 文档
│   ├── technical-specification.md
│   ├── development-guide.md
│   ├── api-documentation.md
│   └── user-guide.md
├── dist/                         # 构建输出
├── manifest.json                 # 插件清单
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
├── esbuild.config.mjs            # 构建配置
├── eslint.config.js              # ESLint 配置
├── .gitignore                    # Git 忽略文件
└── README.md                     # 项目说明
```

### 2.2 核心文件说明

#### main.ts
```typescript
import { Plugin } from 'obsidian';
import { AccessTracker } from './services/AccessTracker';
import { ConfigManager } from './services/ConfigManager';
import { SettingsTab } from './ui/SettingsTab';

export default class AccessCounterPlugin extends Plugin {
    private accessTracker: AccessTracker;
    private configManager: ConfigManager;

    async onload() {
        // 初始化服务
        this.configManager = new ConfigManager(this);
        this.accessTracker = new AccessTracker(this, this.configManager);

        // 注册设置面板
        this.addSettingTab(new SettingsTab(this.app, this));

        // 启动访问跟踪
        await this.accessTracker.startTracking();

        console.log('Access Counter Plugin loaded');
    }

    onunload() {
        this.accessTracker?.stopTracking();
        console.log('Access Counter Plugin unloaded');
    }
}
```

#### manifest.json
```json
{
    "id": "obsidian-access-counter",
    "name": "Access Counter",
    "version": "1.0.0",
    "minAppVersion": "1.0.0",
    "description": "Automatically tracks file access count in frontmatter",
    "author": "Your Name",
    "authorUrl": "https://your-website.com",
    "fundingUrl": "https://your-funding-url.com",
    "isDesktopOnly": false
}
```

#### package.json
```json
{
    "name": "obsidian-access-counter",
    "version": "1.0.0",
    "description": "Obsidian plugin for tracking file access count",
    "main": "main.js",
    "scripts": {
        "dev": "node esbuild.config.mjs",
        "build": "tsc -noEmit -skipLibCheck && node esbuild.config.mjs production",
        "test": "jest",
        "test:watch": "jest --watch",
        "lint": "eslint src/ --ext .ts",
        "lint:fix": "eslint src/ --ext .ts --fix",
        "format": "prettier --write src/"
    },
    "keywords": [
        "obsidian",
        "plugin",
        "access",
        "counter",
        "tracking"
    ],
    "author": "Your Name",
    "license": "MIT",
    "devDependencies": {
        "@types/node": "^16.11.6",
        "@typescript-eslint/eslint-plugin": "^5.2.0",
        "@typescript-eslint/parser": "^5.2.0",
        "builtin-modules": "^3.2.0",
        "esbuild": "0.17.3",
        "eslint": "^8.1.0",
        "jest": "^29.0.0",
        "obsidian": "latest",
        "prettier": "^2.8.0",
        "tslib": "2.4.0",
        "typescript": "4.7.4"
    }
}
```

## 3. 开发工作流程

### 3.1 分支管理策略
```bash
# 主分支
main                  # 生产版本
develop              # 开发版本

# 功能分支
feature/access-tracker     # 访问跟踪功能
feature/config-manager     # 配置管理功能
feature/ui-components      # UI 组件开发

# 修复分支
hotfix/critical-bug       # 紧急修复
bugfix/minor-issue        # 一般修复
```

### 3.2 代码提交规范
```bash
# 提交消息格式
<type>(<scope>): <subject>

<body>

<footer>

# 类型说明
feat:     新功能
fix:      修复bug
docs:     文档更新
style:    代码格式化
refactor: 重构代码
test:     测试相关
chore:    构建过程或辅助工具的变动

# 示例
feat(tracker): implement file access monitoring
fix(frontmatter): handle missing frontmatter gracefully
docs(api): update interface documentation
```

### 3.3 开发流程

#### 步骤 1: 创建功能分支
```bash
git checkout -b feature/access-tracker
```

#### 步骤 2: 开发功能
```bash
# 编写代码
# 编写测试
# 更新文档
```

#### 步骤 3: 本地测试
```bash
npm run test
npm run lint
npm run build
```

#### 步骤 4: 提交代码
```bash
git add .
git commit -m "feat(tracker): implement basic access tracking"
```

#### 步骤 5: 推送和创建 PR
```bash
git push origin feature/access-tracker
# 在 GitHub 上创建 Pull Request
```

## 4. 代码规范

### 4.1 TypeScript 规范

#### 接口定义
```typescript
// 使用 I 前缀标识接口
interface IAccessTracker {
    startTracking(): void;
    stopTracking(): void;
}

// 使用 T 前缀标识类型
type TConfigKey = 'counterKey' | 'includedPaths' | 'excludedPaths';

// 使用 E 前缀标识枚举
enum EEventType {
    FILE_OPENED = 'file-opened',
    FILE_MODIFIED = 'file-modified'
}
```

#### 类定义
```typescript
class AccessTracker implements IAccessTracker {
    private readonly app: App;
    private isActive: boolean = false;
    
    constructor(app: App) {
        this.app = app;
    }
    
    public startTracking(): void {
        if (this.isActive) return;
        
        this.isActive = true;
        this.registerEventListeners();
    }
    
    private registerEventListeners(): void {
        this.app.workspace.on('file-open', this.onFileOpen.bind(this));
    }
    
    private onFileOpen(file: TFile): void {
        // 处理文件打开事件
    }
}
```

#### 错误处理
```typescript
class FrontmatterManager {
    async updateCounter(file: TFile, key: string, value: number): Promise<void> {
        try {
            const content = await this.app.vault.read(file);
            const updatedContent = this.updateFrontmatter(content, key, value);
            await this.app.vault.modify(file, updatedContent);
        } catch (error) {
            this.logger.error('Failed to update counter', { file: file.path, error });
            throw new Error(`Failed to update counter for ${file.path}: ${error.message}`);
        }
    }
}
```

### 4.2 代码组织原则

#### 单一职责原则
```typescript
// 好的例子 - 职责明确
class PathFilter {
    shouldTrackFile(file: TFile): boolean {
        return this.isWithinIncludedPaths(file) && !this.isWithinExcludedPaths(file);
    }
}

// 避免的例子 - 职责混乱
class FileManager {
    shouldTrackFile(file: TFile): boolean { /* ... */ }
    updateCounter(file: TFile): void { /* ... */ }
    saveConfig(config: PluginConfig): void { /* ... */ }
}
```

#### 依赖注入
```typescript
class AccessTracker {
    constructor(
        private app: App,
        private configManager: IConfigManager,
        private frontmatterManager: IFrontmatterManager
    ) {}
}
```

### 4.3 测试规范

#### 单元测试
```typescript
describe('AccessTracker', () => {
    let tracker: AccessTracker;
    let mockApp: jest.Mocked<App>;
    let mockConfigManager: jest.Mocked<IConfigManager>;
    
    beforeEach(() => {
        mockApp = createMockApp();
        mockConfigManager = createMockConfigManager();
        tracker = new AccessTracker(mockApp, mockConfigManager);
    });
    
    describe('startTracking', () => {
        it('should start tracking when not already active', () => {
            tracker.startTracking();
            expect(tracker.isTracking()).toBe(true);
        });
        
        it('should not start tracking when already active', () => {
            tracker.startTracking();
            tracker.startTracking();
            expect(mockApp.workspace.on).toHaveBeenCalledTimes(1);
        });
    });
});
```

#### 集成测试
```typescript
describe('Plugin Integration', () => {
    let plugin: AccessCounterPlugin;
    let testVault: TestVault;
    
    beforeEach(async () => {
        testVault = new TestVault();
        plugin = new AccessCounterPlugin(testVault.app, testVault.manifest);
        await plugin.onload();
    });
    
    it('should increment counter when file is opened', async () => {
        const file = await testVault.createFile('test.md', '# Test');
        await testVault.openFile(file);
        
        const content = await testVault.read(file);
        expect(content).toContain('access_count: 1');
    });
});
```

## 5. 调试和故障排除

### 5.1 调试环境配置

#### VS Code 调试配置
```json
{
    "type": "node",
    "request": "launch",
    "name": "Debug Plugin",
    "program": "${workspaceFolder}/main.js",
    "env": {
        "NODE_ENV": "development"
    },
    "console": "integratedTerminal"
}
```

#### 浏览器调试
```typescript
// 在代码中添加断点
debugger;

// 使用 console 输出
console.log('Debug info:', { file: file.path, counter: newValue });
console.warn('Warning:', warningMessage);
console.error('Error:', error);
```

### 5.2 常见问题解决

#### 问题 1: 插件无法加载
```bash
# 检查 manifest.json 格式
npm run lint:manifest

# 检查 TypeScript 编译错误
npm run build

# 检查 Obsidian 控制台错误
# 按 Ctrl+Shift+I (或 Cmd+Opt+I) 打开开发者工具
```

#### 问题 2: 文件无法更新
```typescript
// 检查文件权限
if (!this.app.vault.adapter.exists(file.path)) {
    throw new Error(`File not found: ${file.path}`);
}

// 检查文件是否被锁定
if (file.stat.mtime > this.lastProcessedTime) {
    // 文件已被其他进程修改
}
```

#### 问题 3: 内存泄漏
```typescript
// 正确清理事件监听器
onunload() {
    this.app.workspace.off('file-open', this.onFileOpen);
    this.cacheManager.clear();
    this.batchProcessor.flush();
}
```

### 5.3 性能分析

#### 性能测量
```typescript
class PerformanceProfiler {
    static measure<T>(name: string, fn: () => T): T {
        const start = performance.now();
        const result = fn();
        const end = performance.now();
        console.log(`${name}: ${end - start}ms`);
        return result;
    }
    
    static async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
        const start = performance.now();
        const result = await fn();
        const end = performance.now();
        console.log(`${name}: ${end - start}ms`);
        return result;
    }
}

// 使用示例
const counter = await PerformanceProfiler.measureAsync(
    'Update Counter',
    () => this.frontmatterManager.updateCounter(file, 'access_count', newValue)
);
```

#### 内存使用监控
```typescript
class MemoryMonitor {
    static logMemoryUsage(label: string): void {
        if (performance.memory) {
            const used = performance.memory.usedJSHeapSize;
            const total = performance.memory.totalJSHeapSize;
            console.log(`${label} - Memory: ${used}/${total} (${(used/total*100).toFixed(1)}%)`);
        }
    }
}
```

## 6. 构建和部署

### 6.1 构建流程

#### 开发构建
```bash
npm run dev
# 启动监视模式，自动重新构建
```

#### 生产构建
```bash
npm run build
# 生成优化的生产版本
```

#### 构建验证
```bash
npm run test
npm run lint
npm run build
```

### 6.2 版本发布

#### 准备发布
```bash
# 更新版本号
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.1 -> 1.1.0
npm version major  # 1.1.0 -> 2.0.0

# 更新 manifest.json
# 更新 CHANGELOG.md
# 更新 README.md
```

#### 创建发布
```bash
# 提交版本更新
git add .
git commit -m "chore: release v1.0.1"
git tag v1.0.1
git push origin main --tags

# 创建 GitHub Release
# 上传 main.js, manifest.json, styles.css
```

## 7. 测试策略

### 7.1 测试环境搭建
```bash
# 安装测试依赖
npm install --save-dev jest @types/jest ts-jest

# 配置 Jest
# jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/main.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    }
};
```

### 7.2 测试用例编写
```typescript
// 测试工具函数
export function createMockFile(path: string, content: string = ''): TFile {
    return {
        path,
        name: path.split('/').pop() || '',
        basename: path.split('/').pop()?.split('.')[0] || '',
        extension: path.split('.').pop() || '',
        stat: { mtime: Date.now(), ctime: Date.now(), size: content.length },
        vault: {} as Vault
    } as TFile;
}

// 测试示例
describe('FrontmatterManager', () => {
    let manager: FrontmatterManager;
    let mockVault: jest.Mocked<Vault>;
    
    beforeEach(() => {
        mockVault = {
            read: jest.fn(),
            modify: jest.fn()
        } as any;
        
        manager = new FrontmatterManager(mockVault);
    });
    
    it('should read existing counter from frontmatter', async () => {
        const file = createMockFile('test.md');
        const content = '---\naccess_count: 5\n---\n# Test';
        
        mockVault.read.mockResolvedValue(content);
        
        const counter = await manager.readCounter(file, 'access_count');
        expect(counter).toBe(5);
    });
    
    it('should return 0 for non-existent counter', async () => {
        const file = createMockFile('test.md');
        const content = '---\ntitle: Test\n---\n# Test';
        
        mockVault.read.mockResolvedValue(content);
        
        const counter = await manager.readCounter(file, 'access_count');
        expect(counter).toBe(0);
    });
});
```

这个开发指南提供了完整的开发环境搭建、项目结构、代码规范和测试策略。接下来我会继续编写 API 文档。