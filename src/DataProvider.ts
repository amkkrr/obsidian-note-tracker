import { TFile } from 'obsidian';
import { IDataProvider, AccessTrendData, AccessSearchPattern, AggregatedStats } from './interfaces/data-provider';
import { AccessRecord } from './interfaces/data-types';
import { IFrontmatterManager } from './interfaces/core';
import { CacheManager } from './CacheManager';

export class DataProvider implements IDataProvider {
    private frontmatterManager: IFrontmatterManager;
    private cacheManager: CacheManager;
    private counterKey: string;

    constructor(
        frontmatterManager: IFrontmatterManager,
        cacheManager: CacheManager,
        counterKey: string = 'view_count'
    ) {
        this.frontmatterManager = frontmatterManager;
        this.cacheManager = cacheManager;
        this.counterKey = counterKey;
    }

    async getMostFrequent(limit: number): Promise<AccessRecord[]> {
        const allRecords = await this.getAllStats();
        return allRecords
            .sort((a, b) => b.accessCount - a.accessCount)
            .slice(0, limit);
    }

    async getMostRecent(limit: number): Promise<AccessRecord[]> {
        const allRecords = await this.getAllStats();
        return allRecords
            .sort((a, b) => b.lastAccess - a.lastAccess)
            .slice(0, limit);
    }

    async getUnaccessedSince(since: Date): Promise<AccessRecord[]> {
        const allRecords = await this.getAllStats();
        const sinceTimestamp = since.getTime();
        return allRecords.filter(record => record.lastAccess < sinceTimestamp);
    }

    async findByAccessCount(min: number, max: number): Promise<AccessRecord[]> {
        const allRecords = await this.getAllStats();
        return allRecords.filter(record => 
            record.accessCount >= min && record.accessCount <= max
        );
    }

    async getAccessHistory(file: TFile): Promise<number[]> {
        // For now, return single access time from cache/frontmatter
        // In a full implementation, this would track detailed history
        const record = await this.getFileStats(file);
        return record ? [record.firstAccess, record.lastAccess] : [];
    }

    async getFileStats(file: TFile): Promise<AccessRecord | null> {
        try {
            // Try to get from cache first
            const cached = this.cacheManager.get(file.path);
            if (cached) {
                return cached;
            }

            // Get from frontmatter
            const accessCount = await this.frontmatterManager.readCounter(file, this.counterKey);
            if (accessCount > 0) {
                const record: AccessRecord = {
                    filePath: file.path,
                    lastAccess: file.stat.mtime,
                    accessCount: accessCount,
                    firstAccess: file.stat.ctime
                };
                
                // Update cache
                this.cacheManager.update(file.path);
                
                return record;
            }

            return null;
        } catch (error) {
            console.error(`Error getting file stats for ${file.path}:`, error);
            return null;
        }
    }

    async getAllStats(): Promise<AccessRecord[]> {
        // Get all cached records
        const cachedRecords = this.cacheManager.getAllRecords();
        
        // For a complete implementation, we would also scan all files
        // and read their frontmatter to get comprehensive stats
        return cachedRecords;
    }

    async getAccessedInRange(startTime: number, endTime: number): Promise<AccessRecord[]> {
        const allRecords = await this.getAllStats();
        return allRecords.filter(record => 
            record.lastAccess >= startTime && record.lastAccess <= endTime
        );
    }

    async getAccessTrends(days: number): Promise<AccessTrendData> {
        const allRecords = await this.getAllStats();
        const now = Date.now();
        const startTime = now - (days * 24 * 60 * 60 * 1000);
        
        const recentRecords = allRecords.filter(record => 
            record.lastAccess >= startTime
        );

        // Calculate daily accesses
        const dailyAccesses = this.calculateDailyAccesses(recentRecords, days);
        
        // Calculate hourly pattern
        const hourlyPattern = this.calculateHourlyPattern(recentRecords);
        
        // Calculate growth rate (simplified)
        const growthRate = this.calculateGrowthRate(recentRecords, days);
        
        // Find peak hour
        const peakHour = hourlyPattern.reduce((max, hour) => 
            hour.count > max.count ? hour : max
        ).hour;

        return {
            dailyAccesses,
            hourlyPattern,
            growthRate,
            peakHour
        };
    }

    async searchByPattern(pattern: AccessSearchPattern): Promise<AccessRecord[]> {
        let results = await this.getAllStats();

        // Apply filters
        if (pattern.minAccessCount !== undefined) {
            results = results.filter(record => record.accessCount >= pattern.minAccessCount!);
        }

        if (pattern.maxAccessCount !== undefined) {
            results = results.filter(record => record.accessCount <= pattern.maxAccessCount!);
        }

        if (pattern.pathPattern) {
            const regex = new RegExp(pattern.pathPattern.replace(/\*/g, '.*'));
            results = results.filter(record => regex.test(record.filePath));
        }

        if (pattern.timeRange) {
            results = results.filter(record => 
                record.lastAccess >= pattern.timeRange!.start && 
                record.lastAccess <= pattern.timeRange!.end
            );
        }

        // Apply sorting
        if (pattern.sortBy) {
            results.sort((a, b) => {
                const aValue = a[pattern.sortBy!];
                const bValue = b[pattern.sortBy!];
                const comparison = typeof aValue === 'string' ? 
                    aValue.localeCompare(bValue as string) : 
                    (aValue as number) - (bValue as number);
                
                return pattern.sortDirection === 'desc' ? -comparison : comparison;
            });
        }

        return results;
    }

    async getAggregatedStats(): Promise<AggregatedStats> {
        const allRecords = await this.getAllStats();
        
        if (allRecords.length === 0) {
            return {
                totalFiles: 0,
                totalAccesses: 0,
                averageAccessesPerFile: 0,
                mostAccessedFile: null,
                leastAccessedFile: null,
                firstAccess: null,
                lastAccess: null,
                accessRanges: []
            };
        }

        const totalAccesses = allRecords.reduce((sum, record) => sum + record.accessCount, 0);
        const mostAccessedFile = allRecords.reduce((max, record) => 
            record.accessCount > max.accessCount ? record : max
        );
        const leastAccessedFile = allRecords.reduce((min, record) => 
            record.accessCount < min.accessCount ? record : min
        );
        const firstAccess = Math.min(...allRecords.map(r => r.firstAccess));
        const lastAccess = Math.max(...allRecords.map(r => r.lastAccess));

        // Calculate access ranges
        const accessRanges = this.calculateAccessRanges(allRecords);

        return {
            totalFiles: allRecords.length,
            totalAccesses,
            averageAccessesPerFile: totalAccesses / allRecords.length,
            mostAccessedFile,
            leastAccessedFile,
            firstAccess,
            lastAccess,
            accessRanges
        };
    }

    async reset(): Promise<void> {
        this.cacheManager.clear();
        // In a complete implementation, this would also clear frontmatter data
    }

    async exportData(format: 'json' | 'csv' | 'markdown'): Promise<string> {
        const allRecords = await this.getAllStats();
        
        switch (format) {
            case 'json':
                return JSON.stringify(allRecords, null, 2);
            
            case 'csv':
                return this.exportToCsv(allRecords);
            
            case 'markdown':
                return this.exportToMarkdown(allRecords);
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    private calculateDailyAccesses(records: AccessRecord[], days: number): Array<{date: string, count: number}> {
        const dailyMap = new Map<string, number>();
        
        records.forEach(record => {
            const date = new Date(record.lastAccess).toISOString().split('T')[0];
            dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
        });

        const result = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
            const dateStr = date.toISOString().split('T')[0];
            result.push({
                date: dateStr,
                count: dailyMap.get(dateStr) || 0
            });
        }

        return result.reverse();
    }

    private calculateHourlyPattern(records: AccessRecord[]): Array<{hour: number, count: number}> {
        const hourlyMap = new Map<number, number>();
        
        records.forEach(record => {
            const hour = new Date(record.lastAccess).getHours();
            hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
        });

        const result = [];
        for (let hour = 0; hour < 24; hour++) {
            result.push({
                hour,
                count: hourlyMap.get(hour) || 0
            });
        }

        return result;
    }

    private calculateGrowthRate(records: AccessRecord[], days: number): number {
        const now = Date.now();
        const halfwayPoint = now - (days * 12 * 60 * 60 * 1000); // Half the period
        
        const recentCount = records.filter(r => r.lastAccess >= halfwayPoint).length;
        const olderCount = records.filter(r => r.lastAccess < halfwayPoint).length;
        
        return olderCount === 0 ? 0 : ((recentCount - olderCount) / olderCount) * 100;
    }

    private calculateAccessRanges(records: AccessRecord[]): Array<{range: string, count: number}> {
        const ranges = [
            { range: '1-5', min: 1, max: 5 },
            { range: '6-10', min: 6, max: 10 },
            { range: '11-25', min: 11, max: 25 },
            { range: '26-50', min: 26, max: 50 },
            { range: '51-100', min: 51, max: 100 },
            { range: '100+', min: 101, max: Infinity }
        ];

        return ranges.map(range => ({
            range: range.range,
            count: records.filter(record => 
                record.accessCount >= range.min && record.accessCount <= range.max
            ).length
        }));
    }

    private exportToCsv(records: AccessRecord[]): string {
        const headers = ['File Path', 'Access Count', 'First Access', 'Last Access'];
        const rows = records.map(record => [
            record.filePath,
            record.accessCount.toString(),
            new Date(record.firstAccess).toISOString(),
            new Date(record.lastAccess).toISOString()
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    private exportToMarkdown(records: AccessRecord[]): string {
        const lines = [
            '# Access Statistics',
            '',
            '| File Path | Access Count | First Access | Last Access |',
            '|-----------|--------------|--------------|-------------|'
        ];

        records.forEach(record => {
            lines.push(
                `| ${record.filePath} | ${record.accessCount} | ${new Date(record.firstAccess).toLocaleString()} | ${new Date(record.lastAccess).toLocaleString()} |`
            );
        });

        return lines.join('\n');
    }
}