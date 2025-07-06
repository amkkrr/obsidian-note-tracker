import { PathFilter } from '../src/PathFilter';
import { TFile } from './/__mocks__/obsidian';

describe('PathFilter', () => {
  let pathFilter: PathFilter;

  beforeEach(() => {
    pathFilter = new PathFilter();
  });

  describe('shouldTrackFile', () => {
    it('should track all files when no filters set', () => {
      const file = new TFile('notes/test.md');
      expect(pathFilter.shouldTrackFile(file as any)).toBe(true);
    });

    it('should exclude files matching exclude patterns', () => {
      pathFilter.addExcludePath('temp/*');
      
      const file1 = new TFile('temp/test.md');
      const file2 = new TFile('notes/test.md');
      
      expect(pathFilter.shouldTrackFile(file1 as any)).toBe(false);
      expect(pathFilter.shouldTrackFile(file2 as any)).toBe(true);
    });

    it('should only include files matching include patterns', () => {
      pathFilter.addIncludePath('notes/*');
      
      const file1 = new TFile('notes/test.md');
      const file2 = new TFile('archive/test.md');
      
      expect(pathFilter.shouldTrackFile(file1 as any)).toBe(true);
      expect(pathFilter.shouldTrackFile(file2 as any)).toBe(false);
    });

    it('should prioritize exclude over include', () => {
      pathFilter.addIncludePath('notes/*');
      pathFilter.addExcludePath('notes/private/*');
      
      const file1 = new TFile('notes/public.md');
      const file2 = new TFile('notes/private/secret.md');
      
      expect(pathFilter.shouldTrackFile(file1 as any)).toBe(true);
      expect(pathFilter.shouldTrackFile(file2 as any)).toBe(false);
    });
  });

  describe('path management', () => {
    it('should add and remove include paths', () => {
      pathFilter.addIncludePath('notes/*');
      expect(pathFilter.getFilterRules().includePaths).toContain('notes/*');
      
      const removed = pathFilter.removeIncludePath('notes/*');
      expect(removed).toBe(true);
      expect(pathFilter.getFilterRules().includePaths).not.toContain('notes/*');
    });

    it('should add and remove exclude paths', () => {
      pathFilter.addExcludePath('temp/*');
      expect(pathFilter.getFilterRules().excludePaths).toContain('temp/*');
      
      const removed = pathFilter.removeExcludePath('temp/*');
      expect(removed).toBe(true);
      expect(pathFilter.getFilterRules().excludePaths).not.toContain('temp/*');
    });

    it('should reset all filters', () => {
      pathFilter.addIncludePath('notes/*');
      pathFilter.addExcludePath('temp/*');
      
      pathFilter.resetFilters();
      
      const rules = pathFilter.getFilterRules();
      expect(rules.includePaths).toHaveLength(0);
      expect(rules.excludePaths).toHaveLength(0);
    });
  });

  describe('pattern matching', () => {
    it('should handle wildcard patterns', () => {
      expect(pathFilter.testPath('notes/test.md')).toBe(true);
      
      pathFilter.addIncludePath('notes/*.md');
      expect(pathFilter.testPath('notes/test.md')).toBe(true);
      expect(pathFilter.testPath('notes/test.txt')).toBe(false);
    });

    it('should handle directory patterns', () => {
      pathFilter.addIncludePath('notes/*');
      
      expect(pathFilter.testPath('notes/subfolder/test.md')).toBe(true);
      expect(pathFilter.testPath('archive/test.md')).toBe(false);
    });

    it('should handle exact path matches', () => {
      pathFilter.addIncludePath('specific-file.md');
      
      expect(pathFilter.testPath('specific-file.md')).toBe(true);
      expect(pathFilter.testPath('other-file.md')).toBe(false);
    });
  });
});