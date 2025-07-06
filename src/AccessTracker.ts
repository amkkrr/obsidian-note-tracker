import { Plugin, TFile, Workspace } from 'obsidian';
import { IAccessTracker } from './interfaces/core';
import { IEventEmitter } from './interfaces/core';
import { AccessEvent } from './event-types';

export class AccessTracker implements IAccessTracker {
    private plugin: Plugin;
    private workspace: Workspace;
    private eventEmitter: IEventEmitter;
    private isActive: boolean = false;

    constructor(plugin: Plugin, eventEmitter: IEventEmitter) {
        this.plugin = plugin;
        this.workspace = plugin.app.workspace;
        this.eventEmitter = eventEmitter;
    }

    async start(): Promise<void> {
        if (this.isActive) {
            return;
        }

        this.isActive = true;
        
        // Listen for file-open events
        this.plugin.registerEvent(
            this.workspace.on('file-open', this.handleFileOpen.bind(this))
        );

        // Listen for active-leaf-change events for better coverage
        this.plugin.registerEvent(
            this.workspace.on('active-leaf-change', this.handleActiveLeafChange.bind(this))
        );
    }

    async stop(): Promise<void> {
        this.isActive = false;
        // Events are automatically unregistered when plugin is disabled
    }

    isTracking(): boolean {
        return this.isActive;
    }

    private handleFileOpen(file: TFile | null): void {
        if (!file || !this.isActive) {
            return;
        }

        this.trackFileAccess(file);
    }

    private handleActiveLeafChange(): void {
        if (!this.isActive) {
            return;
        }

        const activeFile = this.workspace.getActiveFile();
        if (activeFile) {
            this.trackFileAccess(activeFile);
        }
    }

    private trackFileAccess(file: TFile): void {
        const accessEvent: AccessEvent = {
            file,
            timestamp: Date.now(),
            type: 'file-access'
        };

        this.eventEmitter.emit('file-access', accessEvent);
    }
}