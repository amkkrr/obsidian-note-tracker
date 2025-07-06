import { CacheManager } from '../src/CacheManager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager(10); // Small cache for testing
  });

  afterEach(() => {
    cacheManager.stopCleanup();
  });

  describe('shouldProcess', () => {
    it('should return true for new file', () => {
      const result = cacheManager.shouldProcess('test.md', 1000);
      expect(result).toBe(true);
    });

    it('should return false if within interval', () => {
      cacheManager.update('test.md');
      const result = cacheManager.shouldProcess('test.md', 60000); // 1 minute
      expect(result).toBe(false);
    });

    it('should return true if past interval', (done) => {
      cacheManager.update('test.md');
      setTimeout(() => {
        const result = cacheManager.shouldProcess('test.md', 10); // 10ms
        expect(result).toBe(true);
        done();
      }, 15);
    });
  });

  describe('update', () => {
    it('should create new record for new file', () => {
      cacheManager.update('test.md');
      const record = cacheManager.get('test.md');
      
      expect(record).toBeDefined();
      expect(record?.filePath).toBe('test.md');
      expect(record?.accessCount).toBe(1);
    });

    it('should increment count for existing file', () => {
      cacheManager.update('test.md');
      cacheManager.update('test.md');
      
      const record = cacheManager.get('test.md');
      expect(record?.accessCount).toBe(2);
    });

    it('should evict oldest when cache is full', () => {
      // Fill cache to max
      for (let i = 0; i < 10; i++) {
        cacheManager.update(`test${i}.md`);
      }
      
      // Add one more to trigger eviction
      cacheManager.update('new.md');
      
      expect(cacheManager.getSize()).toBe(10);
      expect(cacheManager.get('test0.md')).toBeUndefined();
      expect(cacheManager.get('new.md')).toBeDefined();
    });
  });

  describe('cache management', () => {
    it('should clear all records', () => {
      cacheManager.update('test1.md');
      cacheManager.update('test2.md');
      
      cacheManager.clear();
      
      expect(cacheManager.getSize()).toBe(0);
      expect(cacheManager.get('test1.md')).toBeUndefined();
    });

    it('should track hit/miss statistics', () => {
      cacheManager.update('test.md');
      cacheManager.get('test.md'); // hit
      cacheManager.get('nonexistent.md'); // miss
      
      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
    });

    it('should return correct hit rate', () => {
      cacheManager.update('test.md');
      cacheManager.get('test.md'); // hit
      cacheManager.get('test.md'); // hit
      cacheManager.get('nonexistent.md'); // miss
      
      const hitRate = cacheManager.getHitRate();
      expect(hitRate).toBe(2/3); // 2 hits out of 3 total
    });
  });

  describe('utility methods', () => {
    it('should return most accessed files', () => {
      cacheManager.update('test1.md');
      cacheManager.update('test2.md');
      cacheManager.update('test2.md'); // 2 accesses
      cacheManager.update('test1.md'); // 2 accesses
      cacheManager.update('test2.md'); // 3 accesses
      
      const mostAccessed = cacheManager.getMostAccessed(2);
      expect(mostAccessed).toHaveLength(2);
      expect(mostAccessed[0].filePath).toBe('test2.md');
      expect(mostAccessed[0].accessCount).toBe(3);
    });

    it('should return recently accessed files', () => {
      cacheManager.update('old.md');
      setTimeout(() => {
        cacheManager.update('new.md');
        
        const recent = cacheManager.getRecentlyAccessed(1);
        expect(recent[0].filePath).toBe('new.md');
      }, 1);
    });
  });
});