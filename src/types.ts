import { NoteViewTrackerSettings } from './settings';

// 定义存储访问计数的数据结构
// key是文件路径 (TFile.path), value是访问次数
export type ViewCounts = Record<string, number>;

// 插件需要保存的所有数据
export interface PluginData {
    settings: NoteViewTrackerSettings;
    viewCounts: ViewCounts;
}