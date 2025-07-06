import { TFile } from 'obsidian';
import { AccessRecord } from './data-types';

/**
 * Interface for querying and analyzing access data
 */
export interface IDataProvider {
    /**
     * Get the most frequently accessed notes
     * @param limit The maximum number of notes to return
     * @returns A promise that resolves to an array of AccessRecord
     */
    getMostFrequent(limit: number): Promise<AccessRecord[]>;

    /**
     * Get the most recently accessed notes
     * @param limit The maximum number of notes to return
     * @returns A promise that resolves to an array of AccessRecord
     */
    getMostRecent(limit: number): Promise<AccessRecord[]>;

    /**
     * Get notes that have not been accessed since a given date
     * @param since The date to compare against
     * @returns A promise that resolves to an array of AccessRecord
     */
    getUnaccessedSince(since: Date): Promise<AccessRecord[]>;

    /**
     * Find notes with an access count within a specific range
     * @param min The minimum access count
     * @param max The maximum access count
     * @returns A promise that resolves to an array of AccessRecord
     */
    findByAccessCount(min: number, max: number): Promise<AccessRecord[]>;

    /**
     * Get the full access history for a specific file
     * @param file The file to get the history for
     * @returns A promise that resolves to an array of access timestamps
     */
    getAccessHistory(file: TFile): Promise<number[]>;

    /**
     * Get access statistics for a specific file
     * @param file The file to get stats for
     * @returns A promise that resolves to an AccessRecord or null if not found
     */
    getFileStats(file: TFile): Promise<AccessRecord | null>;

    /**
     * Get access statistics for all tracked files
     * @returns A promise that resolves to an array of AccessRecord
     */
    getAllStats(): Promise<AccessRecord[]>;

    /**
     * Get notes accessed within a specific time range
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @returns A promise that resolves to an array of AccessRecord
     */
    getAccessedInRange(startTime: number, endTime: number): Promise<AccessRecord[]>;

    /**
     * Get access trends over time
     * @param days Number of days to analyze
     * @returns A promise that resolves to trend data
     */
    getAccessTrends(days: number): Promise<AccessTrendData>;

    /**
     * Search for files by access patterns
     * @param pattern Search pattern/criteria
     * @returns A promise that resolves to matching AccessRecord array
     */
    searchByPattern(pattern: AccessSearchPattern): Promise<AccessRecord[]>;

    /**
     * Get aggregated statistics
     * @returns A promise that resolves to aggregated stats
     */
    getAggregatedStats(): Promise<AggregatedStats>;

    /**
     * Reset all access data
     * @returns A promise that resolves when reset is complete
     */
    reset(): Promise<void>;

    /**
     * Export access data
     * @param format Export format ('json' | 'csv' | 'markdown')
     * @returns A promise that resolves to exported data string
     */
    exportData(format: 'json' | 'csv' | 'markdown'): Promise<string>;
}

/**
 * Access trend data interface
 */
export interface AccessTrendData {
    /** Daily access counts */
    dailyAccesses: Array<{
        date: string;
        count: number;
    }>;
    /** Most active hours */
    hourlyPattern: Array<{
        hour: number;
        count: number;
    }>;
    /** Growth rate */
    growthRate: number;
    /** Peak access time */
    peakHour: number;
}

/**
 * Access search pattern interface
 */
export interface AccessSearchPattern {
    /** Minimum access count */
    minAccessCount?: number;
    /** Maximum access count */
    maxAccessCount?: number;
    /** File path pattern (glob) */
    pathPattern?: string;
    /** Access time range */
    timeRange?: {
        start: number;
        end: number;
    };
    /** Sort order */
    sortBy?: 'accessCount' | 'lastAccess' | 'firstAccess' | 'filePath';
    /** Sort direction */
    sortDirection?: 'asc' | 'desc';
}

/**
 * Aggregated statistics interface
 */
export interface AggregatedStats {
    /** Total number of tracked files */
    totalFiles: number;
    /** Total access count across all files */
    totalAccesses: number;
    /** Average accesses per file */
    averageAccessesPerFile: number;
    /** Most accessed file */
    mostAccessedFile: AccessRecord | null;
    /** Least accessed file */
    leastAccessedFile: AccessRecord | null;
    /** First tracked access */
    firstAccess: number | null;
    /** Last tracked access */
    lastAccess: number | null;
    /** Files by access count ranges */
    accessRanges: {
        range: string;
        count: number;
    }[];
}