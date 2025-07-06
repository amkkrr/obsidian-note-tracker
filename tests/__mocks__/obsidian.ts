// Mock Obsidian API for testing
export class TFile {
  path: string;
  stat: { mtime: number; ctime: number };
  
  constructor(path: string) {
    this.path = path;
    this.stat = {
      mtime: Date.now(),
      ctime: Date.now() - 86400000 // 1 day ago
    };
  }
}

export class Vault {
  read = jest.fn().mockResolvedValue('---\nview_count: 1\n---\nContent');
  modify = jest.fn().mockResolvedValue(undefined);
}

export class MetadataCache {
  getFileCache = jest.fn().mockReturnValue({
    frontmatter: { view_count: 1 }
  });
}

export class Workspace {
  on = jest.fn().mockReturnValue({ unregister: jest.fn() });
  getActiveFile = jest.fn().mockReturnValue(null);
}

export class App {
  vault = new Vault();
  metadataCache = new MetadataCache();
  workspace = new Workspace();
}

export class Plugin {
  app = new App();
  
  registerEvent = jest.fn();
  addStatusBarItem = jest.fn().mockReturnValue({
    setText: jest.fn()
  });
  addSettingTab = jest.fn();
  loadData = jest.fn().mockResolvedValue({});
  saveData = jest.fn().mockResolvedValue(undefined);
}

export class PluginSettingTab {
  constructor(app: App, plugin: Plugin) {}
  
  display = jest.fn();
  hide = jest.fn();
}

export class Setting {
  setName = jest.fn().mockReturnThis();
  setDesc = jest.fn().mockReturnThis();
  addText = jest.fn().mockReturnThis();
  addToggle = jest.fn().mockReturnThis();
  addSlider = jest.fn().mockReturnThis();
  addTextArea = jest.fn().mockReturnThis();
  addButton = jest.fn().mockReturnThis();
  addDropdown = jest.fn().mockReturnThis();
}

// Add jest global mock
(global as any).jest = require('jest');