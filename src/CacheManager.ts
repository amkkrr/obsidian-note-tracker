import { AccessRecord } from './interfaces/data-types';

interface ICacheManager {
    shouldProcess(filePath: string, interval: number): boolean;
    update(filePath: string): void;
    get(filePath: string): AccessRecord | undefined;
    clear(): void;
    getSize(): number;
    setMaxSize(size: number): void;
    getMaxSize(): number;
    getStats(): {
        hits: number;
        misses: number;
        size: number;
        maxSize: number;
    };
    startCleanup(interval: number): void;
    stopCleanup(): void;
}

export class CacheManager implements ICacheManager {
    private cache: Map<string, AccessRecord>;
    private maxSize: number;
    private stats: {
        hits: number;
        misses: number;
    };
    private cleanupInterval?: NodeJS.Timeout;

    constructor(maxSize: number = 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.stats = {
            hits: 0,
            misses: 0
        };
    }

    shouldProcess(filePath: string, interval: number): boolean {
        const record = this.cache.get(filePath);
        
        if (!record) {
            this.stats.misses++;
            return true;
        }

        this.stats.hits++;
        const timeSinceLastAccess = Date.now() - record.lastAccess;
        return timeSinceLastAccess >= interval;
    }

    update(filePath: string): void {
        const now = Date.now();
        const existing = this.cache.get(filePath);

        if (existing) {
            existing.lastAccess = now;
            existing.accessCount++;
        } else {
            // Check if we need to evict items
            if (this.cache.size >= this.maxSize) {
                this.evictOldest();
            }

            this.cache.set(filePath, {
                filePath,
                lastAccess: now,
                accessCount: 1,
                firstAccess: now
            });
        }
    }

    get(filePath: string): AccessRecord | undefined {
        const record = this.cache.get(filePath);
        if (record) {
            this.stats.hits++;
            return { ...record }; // Return a copy
        } else {
            this.stats.misses++;
            return undefined;
        }
    }

    clear(): void {
        this.cache.clear();
        this.stats.hits = 0;
        this.stats.misses = 0;
    }

    getSize(): number {
        return this.cache.size;
    }

    setMaxSize(size: number): void {
        this.maxSize = size;
        
        // Evict items if current size exceeds new max size
        while (this.cache.size > this.maxSize) {
            this.evictOldest();
        }
    }

    getMaxSize(): number {
        return this.maxSize;
    }

    getStats(): {
        hits: number;
        misses: number;
        size: number;
        maxSize: number;
    } {
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            size: this.cache.size,
            maxSize: this.maxSize
        };
    }

    startCleanup(interval: number): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }

        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, interval);
    }

    stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
    }

    private evictOldest(): void {
        let oldestKey: string | undefined;
        let oldestTime = Infinity;

        for (const [key, record] of this.cache) {
            if (record.lastAccess < oldestTime) {
                oldestTime = record.lastAccess;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    private performCleanup(): void {
        const now = Date.now();
        const maxAge = 30 * 60 * 1000; // 30 minutes

        for (const [key, record] of this.cache) {
            if (now - record.lastAccess > maxAge) {
                this.cache.delete(key);
            }
        }
    }

    // Additional utility methods
    getAllRecords(): AccessRecord[] {
        return Array.from(this.cache.values()).map(record => ({ ...record }));
    }

    getRecordsByAccessCount(minCount: number): AccessRecord[] {
        return this.getAllRecords().filter(record => record.accessCount >= minCount);
    }

    getMostAccessed(limit: number = 10): AccessRecord[] {
        return this.getAllRecords()
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, limit);
    }

    getRecentlyAccessed(limit: number = 10): AccessRecord[] {
        return this.getAllRecords()
            .sort((a, b) => b.lastAccess - a.lastAccess)
            .slice(0, limit);
    }

    removeRecord(filePath: string): boolean {
        return this.cache.delete(filePath);
    }

    hasRecord(filePath: string): boolean {
        return this.cache.has(filePath);
    }

    getHitRate(): number {
        const total = this.stats.hits + this.stats.misses;
        return total > 0 ? this.stats.hits / total : 0;
    }
}