import { TFile } from 'obsidian';
import { IPathFilter } from './interfaces/core';
import { PluginConfig, FilterRules } from './interfaces/data-types';

export class PathFilter implements IPathFilter {
    private includePaths: string[] = [];
    private excludePaths: string[] = [];
    private includePatterns: RegExp[] = [];
    private excludePatterns: RegExp[] = [];

    constructor(config?: PluginConfig) {
        if (config) {
            this.updateFromConfig(config);
        }
    }

    shouldTrackFile(file: TFile): boolean {
        if (!file || !file.path) {
            return false;
        }

        const filePath = file.path;
        
        // If file matches exclude patterns, don't track it
        if (this.matchesExcludePattern(filePath)) {
            return false;
        }

        // If no include patterns specified, track all files (except excluded ones)
        if (this.includePaths.length === 0) {
            return true;
        }

        // File must match at least one include pattern
        return this.matchesIncludePattern(filePath);
    }

    isWithinScope(filePath: string): boolean {
        if (!filePath) {
            return false;
        }

        // Check exclude patterns first
        if (this.matchesExcludePattern(filePath)) {
            return false;
        }

        // If no include patterns, everything is in scope (except excluded)
        if (this.includePaths.length === 0) {
            return true;
        }

        // Must match include patterns
        return this.matchesIncludePattern(filePath);
    }

    addIncludePath(path: string): void {
        if (path && !this.includePaths.includes(path)) {
            this.includePaths.push(path);
            this.updateIncludePatterns();
        }
    }

    removeIncludePath(path: string): boolean {
        const index = this.includePaths.indexOf(path);
        if (index > -1) {
            this.includePaths.splice(index, 1);
            this.updateIncludePatterns();
            return true;
        }
        return false;
    }

    addExcludePath(path: string): void {
        if (path && !this.excludePaths.includes(path)) {
            this.excludePaths.push(path);
            this.updateExcludePatterns();
        }
    }

    removeExcludePath(path: string): boolean {
        const index = this.excludePaths.indexOf(path);
        if (index > -1) {
            this.excludePaths.splice(index, 1);
            this.updateExcludePatterns();
            return true;
        }
        return false;
    }

    getFilterRules(): FilterRules {
        return {
            includePaths: [...this.includePaths],
            excludePaths: [...this.excludePaths]
        };
    }

    resetFilters(): void {
        this.includePaths = [];
        this.excludePaths = [];
        this.includePatterns = [];
        this.excludePatterns = [];
    }

    updateFromConfig(config: PluginConfig): void {
        this.includePaths = config.includedPaths ? [...config.includedPaths] : [];
        this.excludePaths = config.excludedPaths ? [...config.excludedPaths] : [];
        this.updateIncludePatterns();
        this.updateExcludePatterns();
    }

    matchesIncludePattern(path: string): boolean {
        if (this.includePatterns.length === 0) {
            return true;
        }

        return this.includePatterns.some(pattern => pattern.test(path));
    }

    matchesExcludePattern(path: string): boolean {
        return this.excludePatterns.some(pattern => pattern.test(path));
    }

    private updateIncludePatterns(): void {
        this.includePatterns = this.includePaths.map(path => this.pathToRegex(path));
    }

    private updateExcludePatterns(): void {
        this.excludePatterns = this.excludePaths.map(path => this.pathToRegex(path));
    }

    private pathToRegex(path: string): RegExp {
        // Convert glob-like patterns to regex
        let regexStr = path
            .replace(/\./g, '\\.')  // Escape dots
            .replace(/\*/g, '.*')   // Convert * to .*
            .replace(/\?/g, '.')    // Convert ? to .
            .replace(/\//g, '\\/'); // Escape forward slashes

        // If path doesn't end with *, add end-of-string anchor
        if (!path.endsWith('*')) {
            regexStr += '$';
        }

        // If path doesn't start with *, add start-of-string anchor
        if (!path.startsWith('*')) {
            regexStr = '^' + regexStr;
        }

        return new RegExp(regexStr);
    }

    // Test a path against include/exclude rules (for testing purposes)
    testPath(path: string): boolean {
        return this.isWithinScope(path);
    }
}