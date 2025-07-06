/**
 * Storage abstraction for configuration persistence
 * Provides a unified interface for different storage backends
 */

import { ConfigBackup, StorageOptions } from '../interfaces/data-types';

/**
 * Storage interface for configuration persistence
 */
export interface IStorage {
    /**
     * Load data from storage
     * @param key - Storage key
     * @returns Promise resolving to stored data or null if not found
     */
    load<T>(key: string): Promise<T | null>;

    /**
     * Save data to storage
     * @param key - Storage key
     * @param data - Data to save
     * @returns Promise that resolves when save is complete
     */
    save<T>(key: string, data: T): Promise<void>;

    /**
     * Remove data from storage
     * @param key - Storage key
     * @returns Promise that resolves when removal is complete
     */
    remove(key: string): Promise<void>;

    /**
     * Check if a key exists in storage
     * @param key - Storage key
     * @returns Promise resolving to true if key exists
     */
    exists(key: string): Promise<boolean>;

    /**
     * Clear all data from storage
     * @returns Promise that resolves when clearing is complete
     */
    clear(): Promise<void>;

    /**
     * Get all keys from storage
     * @returns Promise resolving to array of all keys
     */
    keys(): Promise<string[]>;
}

/**
 * Enhanced storage interface with backup and metadata support
 */
export interface IEnhancedStorage extends IStorage {
    /**
     * Save data with metadata
     * @param key - Storage key
     * @param data - Data to save
     * @param metadata - Additional metadata
     * @returns Promise that resolves when save is complete
     */
    saveWithMetadata<T>(key: string, data: T, metadata?: Record<string, any>): Promise<void>;

    /**
     * Load data with metadata
     * @param key - Storage key
     * @returns Promise resolving to data and metadata
     */
    loadWithMetadata<T>(key: string): Promise<{ data: T; metadata: Record<string, any> } | null>;

    /**
     * Create a backup of current data
     * @param key - Storage key
     * @param reason - Reason for backup
     * @returns Promise resolving to backup information
     */
    createBackup(key: string, reason: string): Promise<ConfigBackup>;

    /**
     * Restore data from a backup
     * @param key - Storage key
     * @param backup - Backup to restore
     * @returns Promise that resolves when restore is complete
     */
    restoreBackup(key: string, backup: ConfigBackup): Promise<void>;

    /**
     * Get all backups for a key
     * @param key - Storage key
     * @returns Promise resolving to array of backups
     */
    getBackups(key: string): Promise<ConfigBackup[]>;

    /**
     * Remove old backups
     * @param key - Storage key
     * @param keepCount - Number of backups to keep
     * @returns Promise that resolves when cleanup is complete
     */
    cleanupBackups(key: string, keepCount: number): Promise<void>;
}

/**
 * In-memory storage implementation for testing and development
 */
export class InMemoryStorage implements IEnhancedStorage {
    private data = new Map<string, any>();
    private metadata = new Map<string, Record<string, any>>();
    private backups = new Map<string, ConfigBackup[]>();

    /**
     * Load data from memory
     * @param key - Storage key
     * @returns Promise resolving to stored data or null
     */
    public async load<T>(key: string): Promise<T | null> {
        const data = this.data.get(key);
        return data !== undefined ? data : null;
    }

    /**
     * Save data to memory
     * @param key - Storage key
     * @param data - Data to save
     */
    public async save<T>(key: string, data: T): Promise<void> {
        this.data.set(key, data);
    }

    /**
     * Remove data from memory
     * @param key - Storage key
     */
    public async remove(key: string): Promise<void> {
        this.data.delete(key);
        this.metadata.delete(key);
        this.backups.delete(key);
    }

    /**
     * Check if key exists in memory
     * @param key - Storage key
     * @returns Promise resolving to true if key exists
     */
    public async exists(key: string): Promise<boolean> {
        return this.data.has(key);
    }

    /**
     * Clear all data from memory
     */
    public async clear(): Promise<void> {
        this.data.clear();
        this.metadata.clear();
        this.backups.clear();
    }

    /**
     * Get all keys from memory
     * @returns Promise resolving to array of keys
     */
    public async keys(): Promise<string[]> {
        return Array.from(this.data.keys());
    }

    /**
     * Save data with metadata to memory
     * @param key - Storage key
     * @param data - Data to save
     * @param metadata - Additional metadata
     */
    public async saveWithMetadata<T>(
        key: string,
        data: T,
        metadata: Record<string, any> = {}
    ): Promise<void> {
        await this.save(key, data);
        this.metadata.set(key, {
            ...metadata,
            savedAt: Date.now(),
            type: typeof data
        });
    }

    /**
     * Load data with metadata from memory
     * @param key - Storage key
     * @returns Promise resolving to data and metadata
     */
    public async loadWithMetadata<T>(
        key: string
    ): Promise<{ data: T; metadata: Record<string, any> } | null> {
        const data = await this.load<T>(key);
        if (data === null) {
            return null;
        }

        const metadata = this.metadata.get(key) || {};
        return { data, metadata };
    }

    /**
     * Create a backup of current data
     * @param key - Storage key
     * @param reason - Reason for backup
     * @returns Promise resolving to backup information
     */
    public async createBackup(key: string, reason: string): Promise<ConfigBackup> {
        const data = await this.load(key);
        if (data === null) {
            throw new Error(`No data found for key: ${key}`);
        }

        const backup: ConfigBackup = {
            timestamp: Date.now(),
            version: data.version || '1.0.0',
            config: JSON.parse(JSON.stringify(data)), // Deep clone
            reason
        };

        // Store backup
        const keyBackups = this.backups.get(key) || [];
        keyBackups.push(backup);
        this.backups.set(key, keyBackups);

        return backup;
    }

    /**
     * Restore data from a backup
     * @param key - Storage key
     * @param backup - Backup to restore
     */
    public async restoreBackup(key: string, backup: ConfigBackup): Promise<void> {
        await this.save(key, backup.config);
    }

    /**
     * Get all backups for a key
     * @param key - Storage key
     * @returns Promise resolving to array of backups
     */
    public async getBackups(key: string): Promise<ConfigBackup[]> {
        return this.backups.get(key) || [];
    }

    /**
     * Remove old backups, keeping only the specified number
     * @param key - Storage key
     * @param keepCount - Number of backups to keep
     */
    public async cleanupBackups(key: string, keepCount: number): Promise<void> {
        const keyBackups = this.backups.get(key) || [];
        if (keyBackups.length <= keepCount) {
            return;
        }

        // Sort by timestamp and keep the most recent
        keyBackups.sort((a, b) => b.timestamp - a.timestamp);
        const toKeep = keyBackups.slice(0, keepCount);
        this.backups.set(key, toKeep);
    }
}

/**
 * JSON file storage implementation for Node.js environments
 */
export class FileStorage implements IEnhancedStorage {
    private fs: any;
    private path: any;
    private baseDir: string;

    constructor(baseDir: string) {
        // Dynamically import fs and path for Node.js compatibility
        try {
            this.fs = require('fs').promises;
            this.path = require('path');
            this.baseDir = baseDir;
            this.ensureDirectoryExists();
        } catch (error) {
            throw new Error('FileStorage requires Node.js environment with fs module');
        }
    }

    /**
     * Ensure the base directory exists
     */
    private async ensureDirectoryExists(): Promise<void> {
        try {
            await this.fs.access(this.baseDir);
        } catch {
            await this.fs.mkdir(this.baseDir, { recursive: true });
        }
    }

    /**
     * Get file path for a key
     * @param key - Storage key
     * @returns File path
     */
    private getFilePath(key: string): string {
        return this.path.join(this.baseDir, `${key}.json`);
    }

    /**
     * Get backup directory path for a key
     * @param key - Storage key
     * @returns Backup directory path
     */
    private getBackupDir(key: string): string {
        return this.path.join(this.baseDir, 'backups', key);
    }

    /**
     * Load data from file
     * @param key - Storage key
     * @returns Promise resolving to stored data or null
     */
    public async load<T>(key: string): Promise<T | null> {
        try {
            const filePath = this.getFilePath(key);
            const data = await this.fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if ((error as any).code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    /**
     * Save data to file
     * @param key - Storage key
     * @param data - Data to save
     */
    public async save<T>(key: string, data: T): Promise<void> {
        await this.ensureDirectoryExists();
        const filePath = this.getFilePath(key);
        const jsonData = JSON.stringify(data, null, 2);
        await this.fs.writeFile(filePath, jsonData, 'utf8');
    }

    /**
     * Remove file
     * @param key - Storage key
     */
    public async remove(key: string): Promise<void> {
        try {
            const filePath = this.getFilePath(key);
            await this.fs.unlink(filePath);
        } catch (error) {
            if ((error as any).code !== 'ENOENT') {
                throw error;
            }
        }
    }

    /**
     * Check if file exists
     * @param key - Storage key
     * @returns Promise resolving to true if file exists
     */
    public async exists(key: string): Promise<boolean> {
        try {
            const filePath = this.getFilePath(key);
            await this.fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Clear all files
     */
    public async clear(): Promise<void> {
        try {
            const files = await this.fs.readdir(this.baseDir);
            const deletePromises = files
                .filter((file: string) => file.endsWith('.json'))
                .map((file: string) => this.fs.unlink(this.path.join(this.baseDir, file)));
            await Promise.all(deletePromises);
        } catch (error) {
            // Directory might not exist, which is fine
        }
    }

    /**
     * Get all keys
     * @returns Promise resolving to array of keys
     */
    public async keys(): Promise<string[]> {
        try {
            const files = await this.fs.readdir(this.baseDir);
            return files
                .filter((file: string) => file.endsWith('.json'))
                .map((file: string) => file.slice(0, -5)); // Remove .json extension
        } catch {
            return [];
        }
    }

    /**
     * Save data with metadata to file
     * @param key - Storage key
     * @param data - Data to save
     * @param metadata - Additional metadata
     */
    public async saveWithMetadata<T>(
        key: string,
        data: T,
        metadata: Record<string, any> = {}
    ): Promise<void> {
        const wrapper = {
            data,
            metadata: {
                ...metadata,
                savedAt: Date.now(),
                type: typeof data
            }
        };
        await this.save(key, wrapper);
    }

    /**
     * Load data with metadata from file
     * @param key - Storage key
     * @returns Promise resolving to data and metadata
     */
    public async loadWithMetadata<T>(
        key: string
    ): Promise<{ data: T; metadata: Record<string, any> } | null> {
        const wrapper = await this.load<any>(key);
        if (wrapper === null) {
            return null;
        }

        // Handle old format without metadata
        if (wrapper.data === undefined) {
            return {
                data: wrapper,
                metadata: {}
            };
        }

        return {
            data: wrapper.data,
            metadata: wrapper.metadata || {}
        };
    }

    /**
     * Create a backup of current data
     * @param key - Storage key
     * @param reason - Reason for backup
     * @returns Promise resolving to backup information
     */
    public async createBackup(key: string, reason: string): Promise<ConfigBackup> {
        const data = await this.load(key);
        if (data === null) {
            throw new Error(`No data found for key: ${key}`);
        }

        const backup: ConfigBackup = {
            timestamp: Date.now(),
            version: (data as any).version || '1.0.0',
            config: data,
            reason
        };

        // Ensure backup directory exists
        const backupDir = this.getBackupDir(key);
        await this.fs.mkdir(backupDir, { recursive: true });

        // Save backup
        const backupFile = this.path.join(backupDir, `${backup.timestamp}.json`);
        await this.fs.writeFile(backupFile, JSON.stringify(backup, null, 2), 'utf8');

        return backup;
    }

    /**
     * Restore data from a backup
     * @param key - Storage key
     * @param backup - Backup to restore
     */
    public async restoreBackup(key: string, backup: ConfigBackup): Promise<void> {
        await this.save(key, backup.config);
    }

    /**
     * Get all backups for a key
     * @param key - Storage key
     * @returns Promise resolving to array of backups
     */
    public async getBackups(key: string): Promise<ConfigBackup[]> {
        try {
            const backupDir = this.getBackupDir(key);
            const files = await this.fs.readdir(backupDir);
            const backups: ConfigBackup[] = [];

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = this.path.join(backupDir, file);
                    const data = await this.fs.readFile(filePath, 'utf8');
                    backups.push(JSON.parse(data));
                }
            }

            return backups.sort((a, b) => b.timestamp - a.timestamp);
        } catch {
            return [];
        }
    }

    /**
     * Remove old backups, keeping only the specified number
     * @param key - Storage key
     * @param keepCount - Number of backups to keep
     */
    public async cleanupBackups(key: string, keepCount: number): Promise<void> {
        const backups = await this.getBackups(key);
        if (backups.length <= keepCount) {
            return;
        }

        const backupDir = this.getBackupDir(key);
        const toDelete = backups.slice(keepCount);

        for (const backup of toDelete) {
            const filePath = this.path.join(backupDir, `${backup.timestamp}.json`);
            try {
                await this.fs.unlink(filePath);
            } catch {
                // File might already be deleted, continue
            }
        }
    }
}

/**
 * Storage adapter for Obsidian plugins
 */
export class ObsidianStorage implements IEnhancedStorage {
    private plugin: any; // Obsidian Plugin instance
    private backups = new Map<string, ConfigBackup[]>();

    constructor(plugin: any) {
        this.plugin = plugin;
    }

    /**
     * Load data using Obsidian's plugin data system
     * @param key - Storage key
     * @returns Promise resolving to stored data or null
     */
    public async load<T>(key: string): Promise<T | null> {
        try {
            const data = await this.plugin.loadData();
            return data && data[key] !== undefined ? data[key] : null;
        } catch {
            return null;
        }
    }

    /**
     * Save data using Obsidian's plugin data system
     * @param key - Storage key
     * @param value - Data to save
     */
    public async save<T>(key: string, value: T): Promise<void> {
        const data = await this.plugin.loadData() || {};
        data[key] = value;
        await this.plugin.saveData(data);
    }

    /**
     * Remove data using Obsidian's plugin data system
     * @param key - Storage key
     */
    public async remove(key: string): Promise<void> {
        const data = await this.plugin.loadData() || {};
        delete data[key];
        await this.plugin.saveData(data);
    }

    /**
     * Check if key exists
     * @param key - Storage key
     * @returns Promise resolving to true if key exists
     */
    public async exists(key: string): Promise<boolean> {
        const data = await this.plugin.loadData() || {};
        return data[key] !== undefined;
    }

    /**
     * Clear all data
     */
    public async clear(): Promise<void> {
        await this.plugin.saveData({});
        this.backups.clear();
    }

    /**
     * Get all keys
     * @returns Promise resolving to array of keys
     */
    public async keys(): Promise<string[]> {
        const data = await this.plugin.loadData() || {};
        return Object.keys(data);
    }

    /**
     * Save data with metadata
     * @param key - Storage key
     * @param data - Data to save
     * @param metadata - Additional metadata
     */
    public async saveWithMetadata<T>(
        key: string,
        data: T,
        metadata: Record<string, any> = {}
    ): Promise<void> {
        const wrapper = {
            data,
            metadata: {
                ...metadata,
                savedAt: Date.now(),
                type: typeof data
            }
        };
        await this.save(key, wrapper);
    }

    /**
     * Load data with metadata
     * @param key - Storage key
     * @returns Promise resolving to data and metadata
     */
    public async loadWithMetadata<T>(
        key: string
    ): Promise<{ data: T; metadata: Record<string, any> } | null> {
        const wrapper = await this.load<any>(key);
        if (wrapper === null) {
            return null;
        }

        // Handle old format without metadata
        if (wrapper.data === undefined) {
            return {
                data: wrapper,
                metadata: {}
            };
        }

        return {
            data: wrapper.data,
            metadata: wrapper.metadata || {}
        };
    }

    /**
     * Create a backup of current data
     * @param key - Storage key
     * @param reason - Reason for backup
     * @returns Promise resolving to backup information
     */
    public async createBackup(key: string, reason: string): Promise<ConfigBackup> {
        const data = await this.load(key);
        if (data === null) {
            throw new Error(`No data found for key: ${key}`);
        }

        const backup: ConfigBackup = {
            timestamp: Date.now(),
            version: (data as any).version || '1.0.0',
            config: JSON.parse(JSON.stringify(data)), // Deep clone
            reason
        };

        // Store backup in memory (Obsidian doesn't have good file backup support)
        const keyBackups = this.backups.get(key) || [];
        keyBackups.push(backup);
        this.backups.set(key, keyBackups);

        return backup;
    }

    /**
     * Restore data from a backup
     * @param key - Storage key
     * @param backup - Backup to restore
     */
    public async restoreBackup(key: string, backup: ConfigBackup): Promise<void> {
        await this.save(key, backup.config);
    }

    /**
     * Get all backups for a key
     * @param key - Storage key
     * @returns Promise resolving to array of backups
     */
    public async getBackups(key: string): Promise<ConfigBackup[]> {
        return this.backups.get(key) || [];
    }

    /**
     * Remove old backups, keeping only the specified number
     * @param key - Storage key
     * @param keepCount - Number of backups to keep
     */
    public async cleanupBackups(key: string, keepCount: number): Promise<void> {
        const keyBackups = this.backups.get(key) || [];
        if (keyBackups.length <= keepCount) {
            return;
        }

        // Sort by timestamp and keep the most recent
        keyBackups.sort((a, b) => b.timestamp - a.timestamp);
        const toKeep = keyBackups.slice(0, keepCount);
        this.backups.set(key, toKeep);
    }
}

/**
 * Create appropriate storage instance based on environment
 * @param environment - Target environment ('memory', 'file', 'obsidian')
 * @param options - Storage-specific options
 * @returns Storage instance
 */
export function createStorage(
    environment: 'memory' | 'file' | 'obsidian',
    options: any = {}
): IEnhancedStorage {
    switch (environment) {
        case 'memory':
            return new InMemoryStorage();
        case 'file':
            if (!options.baseDir) {
                throw new Error('FileStorage requires baseDir option');
            }
            return new FileStorage(options.baseDir);
        case 'obsidian':
            if (!options.plugin) {
                throw new Error('ObsidianStorage requires plugin option');
            }
            return new ObsidianStorage(options.plugin);
        default:
            throw new Error(`Unknown storage environment: ${environment}`);
    }
}