# Obsidian 笔记访问计数插件 (Note View Tracker)

这是一个为 [Obsidian](https://obsidian.md) 设计的插件，用于跟踪和显示每个笔记的访问次数。

## 功能

-   **自动跟踪**: 每次您打开一个笔记时，插件会自动为其访问次数加一。
-   **状态栏显示**: 在Obsidian底部的状态栏中，清晰地显示当前活动笔记的总访问次数。
-   **设置选项**: 您可以在设置中选择是否在状态栏显示访问计数。
-   **数据持久化**: 访问数据安全地存储在您的Obsidian配置目录中，不会丢失。

## 如何使用

1.  安装插件后，它会自动开始工作。
2.  打开任何一个笔记。
3.  观察状态栏的右下角，您会看到一个 "View Count: X" 的文本，其中 X 是当前笔记被打开的次数。
4.  如果您不希望看到这个计数，可以到 `设置` -> `Note View Tracker` 中关闭它。

## 安装

### 来自Obsidian社区插件市场

1.  打开 Obsidian `设置`。
2.  导航到 `社区插件` 并确保 `限制模式` 已关闭。
3.  点击 `浏览` 并搜索 "Note View Tracker"。
4.  点击 `安装`，然后在安装完成后点击 `启用`。

### 手动安装

1.  从本仓库的 [Releases](https://github.com/your-repo/obsidian-note-view-tracker/releases) 页面下载最新的 `main.js`, `manifest.json`, `styles.css` 文件。
2.  将这三个文件复制到您的Obsidian vault的插件文件夹中：`<YourVault>/.obsidian/plugins/note-view-tracker/`。
3.  重新加载Obsidian或在设置中刷新插件列表，然后启用 "Note View Tracker" 插件。

## 开发者

如果您想为此项目做出贡献或自行构建：

1.  克隆此仓库。
2.  运行 `npm install` 安装所有依赖。
3.  运行 `npm run dev` 以在开发模式下进行构建和监听文件变化。
4.  运行 `npm run build` 以生成生产版本的文件。

## 项目结构

```
obsidian-note-tracker/
├── src/
│   ├── main.ts          # 插件主文件
│   ├── settings.ts      # 设置界面
│   └── types.ts         # 类型定义
├── docs/                # 文档目录
├── package.json         # 项目配置和依赖
├── tsconfig.json        # TypeScript配置
├── .eslintrc.json       # ESLint配置
├── .prettierrc          # Prettier配置
├── manifest.json        # Obsidian插件清单
├── esbuild.config.mjs   # 构建配置
└── README.md            # 项目说明
```

---

希望这个插件对您有帮助！