import { App, PluginSettingTab, Setting } from 'obsidian';
import NoteViewTrackerPlugin from './main';

// 插件设置的接口
export interface NoteViewTrackerSettings {
    showInStatusBar: boolean;
}

// 默认设置
export const DEFAULT_SETTINGS: NoteViewTrackerSettings = {
    showInStatusBar: true,
};

// 设置页面的UI实现
export class NoteViewTrackerSettingTab extends PluginSettingTab {
    plugin: NoteViewTrackerPlugin;

    constructor(app: App, plugin: NoteViewTrackerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();

        containerEl.createEl('h2', { text: 'Note View Tracker Settings' });

        new Setting(containerEl)
            .setName('Show view count in status bar')
            .setDesc('If enabled, the view count of the current note will be shown in the status bar.')
            .addToggle(toggle =>
                toggle.setValue(this.plugin.settings.showInStatusBar).onChange(async value => {
                    this.plugin.settings.showInStatusBar = value;
                    await this.plugin.savePluginData();
                    // 立即更新状态栏的可见性
                    this.plugin.updateStatusBar(this.app.workspace.getActiveFile());
                }),
            );
    }
}