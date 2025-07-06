import { Plugin, TFile, WorkspaceLeaf } from 'obsidian';
import { NoteViewTrackerSettingTab, NoteViewTrackerSettings, DEFAULT_SETTINGS } from './settings';
import { PluginData } from './types';
import { AccessTracker } from './AccessTracker';
import { FrontmatterManager } from './FrontmatterManager';
import { PathFilter } from './PathFilter';
import { EventEmitter } from './config/EventEmitter';
import { IEventEmitter } from './interfaces/core';
import { CacheManager } from './CacheManager';
import { BatchProcessor } from './BatchProcessor';
import { DataProvider } from './DataProvider';

export default class NoteViewTrackerPlugin extends Plugin {
    settings: NoteViewTrackerSettings;
    pluginData: PluginData;
    statusBarItemEl: HTMLElement;
    
    // New components
    private accessTracker: AccessTracker;
    private frontmatterManager: FrontmatterManager;
    private pathFilter: PathFilter;
    private eventEmitter: IEventEmitter;
    private cacheManager: CacheManager;
    private batchProcessor: BatchProcessor;
    private dataProvider: DataProvider;

    async onload() {
        console.log('Loading Note View Tracker plugin');

        await this.loadPluginData();

        // Initialize components
        this.initializeComponents();

        // 添加状态栏项目
        this.statusBarItemEl = this.addStatusBarItem();

        // 添加设置页面
        this.addSettingTab(new NoteViewTrackerSettingTab(this.app, this));

        // Start access tracking
        await this.accessTracker.start();

        // 插件加载时，为当前活动文件更新一次状态栏
        this.updateStatusBar(this.app.workspace.getActiveFile());
    }

    async onunload() {
        console.log('Unloading Note View Tracker plugin');
        
        // Stop access tracking
        if (this.accessTracker) {
            await this.accessTracker.stop();
        }

        // Cleanup components
        if (this.batchProcessor) {
            this.batchProcessor.destroy();
        }
        if (this.cacheManager) {
            this.cacheManager.stopCleanup();
        }
    }

    private initializeComponents(): void {
        // Initialize event emitter
        this.eventEmitter = new EventEmitter();

        // Initialize components
        this.frontmatterManager = new FrontmatterManager(this);
        this.cacheManager = new CacheManager(1000);
        this.batchProcessor = new BatchProcessor(this.frontmatterManager);
        this.dataProvider = new DataProvider(this.frontmatterManager, this.cacheManager, 'view_count');
        this.pathFilter = new PathFilter();
        this.accessTracker = new AccessTracker(this, this.eventEmitter);

        // Start cache cleanup
        this.cacheManager.startCleanup(60000); // 1 minute cleanup interval

        // Set up event handlers
        this.eventEmitter.on('file-access', this.handleFileAccess.bind(this));
    }

    private handleFileAccess = async (event: any) => {
        const file = event.file;
        
        if (!file) {
            this.updateStatusBar(null);
            return;
        }

        // Check if file should be tracked
        if (!this.pathFilter.shouldTrackFile(file)) {
            return;
        }

        // Use cache to prevent duplicate processing
        const minInterval = this.settings.minTimeBetweenUpdates || 1000;
        if (!this.cacheManager.shouldProcess(file.path, minInterval)) {
            return;
        }

        try {
            // Enqueue update to be processed in a batch
            this.batchProcessor.enqueueUpdate({
                file,
                key: 'view_count',
                value: 1, // Increment amount
                timestamp: Date.now(),
                retryCount: 0,
                priority: 'normal'
            });

            // Update cache
            this.cacheManager.update(file.path);

            // Update legacy view counts for backward compatibility
            const currentCount = await this.frontmatterManager.readCounter(file, 'view_count');
            this.pluginData.viewCounts[file.path] = currentCount + 1;

            // Update status bar immediately for responsiveness
            this.updateStatusBar(file);

            // Save plugin data
            await this.savePluginData();
        } catch (error) {
            console.error('Error handling file access:', error);
        }
    };

    // 更新状态栏的显示内容
    async updateStatusBar(file: TFile | null) {
        if (file && this.settings.showInStatusBar) {
            try {
                // Use DataProvider to get file stats
                const stats = await this.dataProvider.getFileStats(file);
                const count = stats ? stats.accessCount : (this.pluginData.viewCounts[file.path] || 0);
                
                this.statusBarItemEl.setText(`View Count: ${count}`);
            } catch (error) {
                // Fall back to legacy count if data provider fails
                const count = this.pluginData.viewCounts[file.path] || 0;
                this.statusBarItemEl.setText(`View Count: ${count}`);
            }
        } else {
            this.statusBarItemEl.setText('');
        }
    }

    // 加载插件数据（包括设置和访问计数）
    async loadPluginData() {
        const loadedData = await this.loadData();
        this.pluginData = Object.assign({}, { viewCounts: {} }, loadedData);
        this.settings = Object.assign({}, DEFAULT_SETTINGS, loadedData?.settings);
    }

    // 保存插件数据（包括设置和访问计数）
    async savePluginData() {
        await this.saveData({
            settings: this.settings,
            viewCounts: this.pluginData.viewCounts,
        });
    }
}