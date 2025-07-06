import { Plugin, TFile, Vault } from 'obsidian';
import { IFrontmatterManager } from './interfaces/core';
import { CounterUpdate, BatchUpdateResult } from './interfaces/data-types';
import { FrontmatterError } from './interfaces/errors';

export class FrontmatterManager implements IFrontmatterManager {
    private plugin: Plugin;
    private vault: Vault;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
        this.vault = plugin.app.vault;
    }

    async readCounter(file: TFile, key: string): Promise<number> {
        try {
            const frontmatter = await this.getFrontmatter(file);
            if (!frontmatter || !(key in frontmatter)) {
                return 0;
            }
            
            const value = frontmatter[key];
            if (typeof value === 'number') {
                return value;
            }
            
            const parsed = parseInt(value, 10);
            return isNaN(parsed) ? 0 : parsed;
        } catch (error) {
            throw new FrontmatterError(`Failed to read counter '${key}' from file '${file.path}': ${error.message}`);
        }
    }

    async updateCounter(file: TFile, key: string, value: number): Promise<void> {
        try {
            const frontmatter = await this.getFrontmatter(file) || {};
            frontmatter[key] = value;
            await this.updateFrontmatter(file, frontmatter);
        } catch (error) {
            throw new FrontmatterError(`Failed to update counter '${key}' in file '${file.path}': ${error.message}`);
        }
    }

    hasValidFrontmatter(file: TFile): boolean {
        try {
            const cache = this.plugin.app.metadataCache.getFileCache(file);
            return !!(cache && cache.frontmatter);
        } catch (error) {
            return false;
        }
    }

    async createFrontmatter(file: TFile, data: Record<string, any>): Promise<void> {
        try {
            const content = await this.vault.read(file);
            const frontmatterYaml = this.formatFrontmatterYaml(data);
            
            const newContent = content.startsWith('---\n') 
                ? content.replace(/^---\n.*?\n---\n/s, frontmatterYaml)
                : frontmatterYaml + content;
            
            await this.vault.modify(file, newContent);
        } catch (error) {
            throw new FrontmatterError(`Failed to create frontmatter for file '${file.path}': ${error.message}`);
        }
    }

    async batchUpdateCounters(updates: CounterUpdate[]): Promise<BatchUpdateResult> {
        const results: BatchUpdateResult = {
            successful: [],
            failed: [],
            total: updates.length
        };

        for (const update of updates) {
            try {
                await this.updateCounter(update.file, update.key, update.value);
                results.successful.push(update);
            } catch (error) {
                results.failed.push({
                    update,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return results;
    }

    async getFrontmatter(file: TFile): Promise<Record<string, any> | null> {
        try {
            const cache = this.plugin.app.metadataCache.getFileCache(file);
            if (cache && cache.frontmatter) {
                return { ...cache.frontmatter };
            }
            
            const content = await this.vault.read(file);
            const frontmatterMatch = content.match(/^---\n(.*?)\n---\n/s);
            
            if (frontmatterMatch) {
                const yamlContent = frontmatterMatch[1];
                return this.parseYaml(yamlContent);
            }
            
            return null;
        } catch (error) {
            throw new FrontmatterError(`Failed to get frontmatter from file '${file.path}': ${error.message}`);
        }
    }

    async updateFrontmatter(file: TFile, data: Record<string, any>): Promise<void> {
        try {
            const content = await this.vault.read(file);
            const frontmatterYaml = this.formatFrontmatterYaml(data);
            
            let newContent: string;
            if (content.startsWith('---\n')) {
                newContent = content.replace(/^---\n.*?\n---\n/s, frontmatterYaml);
            } else {
                newContent = frontmatterYaml + content;
            }
            
            await this.vault.modify(file, newContent);
        } catch (error) {
            throw new FrontmatterError(`Failed to update frontmatter in file '${file.path}': ${error.message}`);
        }
    }

    private formatFrontmatterYaml(data: Record<string, any>): string {
        const lines = ['---'];
        
        for (const [key, value] of Object.entries(data)) {
            if (value === null || value === undefined) {
                lines.push(`${key}: null`);
            } else if (typeof value === 'string') {
                lines.push(`${key}: "${value}"`);
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                lines.push(`${key}: ${value}`);
            } else if (Array.isArray(value)) {
                lines.push(`${key}:`);
                value.forEach(item => {
                    lines.push(`  - ${JSON.stringify(item)}`);
                });
            } else {
                lines.push(`${key}: ${JSON.stringify(value)}`);
            }
        }
        
        lines.push('---');
        return lines.join('\n') + '\n';
    }

    private parseYaml(yamlContent: string): Record<string, any> {
        const result: Record<string, any> = {};
        const lines = yamlContent.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const colonIndex = trimmed.indexOf(':');
            if (colonIndex === -1) continue;
            
            const key = trimmed.substring(0, colonIndex).trim();
            const valueStr = trimmed.substring(colonIndex + 1).trim();
            
            if (valueStr === 'null') {
                result[key] = null;
            } else if (valueStr === 'true') {
                result[key] = true;
            } else if (valueStr === 'false') {
                result[key] = false;
            } else if (!isNaN(Number(valueStr))) {
                result[key] = Number(valueStr);
            } else if (valueStr.startsWith('"') && valueStr.endsWith('"')) {
                result[key] = valueStr.slice(1, -1);
            } else {
                result[key] = valueStr;
            }
        }
        
        return result;
    }
}