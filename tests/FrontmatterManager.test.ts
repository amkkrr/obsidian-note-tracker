import { FrontmatterManager } from '../src/FrontmatterManager';
import { TFile, Plugin } from '../__mocks__/obsidian';
import { FrontmatterError } from '../src/interfaces/errors';

describe('FrontmatterManager', () => {
  let frontmatterManager: FrontmatterManager;
  let mockPlugin: Plugin;
  let mockFile: TFile;

  beforeEach(() => {
    mockPlugin = new Plugin() as any;
    frontmatterManager = new FrontmatterManager(mockPlugin);
    mockFile = new TFile('test.md') as any;
  });

  describe('readCounter', () => {
    it('should return 0 for non-existent counter', async () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockReturnValue({
        frontmatter: {}
      });

      const result = await frontmatterManager.readCounter(mockFile, 'view_count');
      expect(result).toBe(0);
    });

    it('should return existing counter value', async () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockReturnValue({
        frontmatter: { view_count: 5 }
      });

      const result = await frontmatterManager.readCounter(mockFile, 'view_count');
      expect(result).toBe(5);
    });

    it('should parse string numbers correctly', async () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockReturnValue({
        frontmatter: { view_count: '10' }
      });

      const result = await frontmatterManager.readCounter(mockFile, 'view_count');
      expect(result).toBe(10);
    });

    it('should return 0 for invalid number strings', async () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockReturnValue({
        frontmatter: { view_count: 'invalid' }
      });

      const result = await frontmatterManager.readCounter(mockFile, 'view_count');
      expect(result).toBe(0);
    });

    it('should throw FrontmatterError on metadata cache failure', async () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });

      await expect(frontmatterManager.readCounter(mockFile, 'view_count'))
        .rejects.toThrow(FrontmatterError);
    });
  });

  describe('updateCounter', () => {
    it('should update existing frontmatter', async () => {
      mockPlugin.app.vault.read = jest.fn().mockResolvedValue('---\nview_count: 1\n---\nContent');
      mockPlugin.app.vault.modify = jest.fn().mockResolvedValue(undefined);

      await frontmatterManager.updateCounter(mockFile, 'view_count', 5);

      expect(mockPlugin.app.vault.modify).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining('view_count: 5')
      );
    });

    it('should create frontmatter if none exists', async () => {
      mockPlugin.app.vault.read = jest.fn().mockResolvedValue('Just content');
      mockPlugin.app.vault.modify = jest.fn().mockResolvedValue(undefined);

      await frontmatterManager.updateCounter(mockFile, 'view_count', 1);

      expect(mockPlugin.app.vault.modify).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining('---\nview_count: 1\n---')
      );
    });

    it('should throw FrontmatterError on vault error', async () => {
      mockPlugin.app.vault.read = jest.fn().mockRejectedValue(new Error('Vault error'));

      await expect(frontmatterManager.updateCounter(mockFile, 'view_count', 5))
        .rejects.toThrow(FrontmatterError);
    });
  });

  describe('hasValidFrontmatter', () => {
    it('should return true for valid frontmatter', () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockReturnValue({
        frontmatter: { view_count: 1 }
      });

      const result = frontmatterManager.hasValidFrontmatter(mockFile);
      expect(result).toBe(true);
    });

    it('should return false for missing frontmatter', () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockReturnValue({});

      const result = frontmatterManager.hasValidFrontmatter(mockFile);
      expect(result).toBe(false);
    });

    it('should return false on cache error', () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockImplementation(() => {
        throw new Error('Cache error');
      });

      const result = frontmatterManager.hasValidFrontmatter(mockFile);
      expect(result).toBe(false);
    });
  });

  describe('createFrontmatter', () => {
    it('should create frontmatter for file without any', async () => {
      mockPlugin.app.vault.read = jest.fn().mockResolvedValue('Just content');
      mockPlugin.app.vault.modify = jest.fn().mockResolvedValue(undefined);

      await frontmatterManager.createFrontmatter(mockFile, { view_count: 1 });

      expect(mockPlugin.app.vault.modify).toHaveBeenCalledWith(
        mockFile,
        '---\nview_count: 1\n---\nJust content'
      );
    });

    it('should replace existing frontmatter', async () => {
      mockPlugin.app.vault.read = jest.fn().mockResolvedValue('---\nold: value\n---\nContent');
      mockPlugin.app.vault.modify = jest.fn().mockResolvedValue(undefined);

      await frontmatterManager.createFrontmatter(mockFile, { new_key: 'new_value' });

      expect(mockPlugin.app.vault.modify).toHaveBeenCalledWith(
        mockFile,
        expect.stringContaining('new_key: "new_value"')
      );
    });

    it('should handle different data types correctly', async () => {
      mockPlugin.app.vault.read = jest.fn().mockResolvedValue('Content');
      mockPlugin.app.vault.modify = jest.fn().mockResolvedValue(undefined);

      const data = {
        string_val: 'text',
        number_val: 42,
        boolean_val: true,
        null_val: null,
        array_val: ['item1', 'item2']
      };

      await frontmatterManager.createFrontmatter(mockFile, data);

      const modifyCall = (mockPlugin.app.vault.modify as jest.Mock).mock.calls[0][1];
      expect(modifyCall).toContain('string_val: "text"');
      expect(modifyCall).toContain('number_val: 42');
      expect(modifyCall).toContain('boolean_val: true');
      expect(modifyCall).toContain('null_val: null');
      expect(modifyCall).toContain('array_val:');
    });
  });

  describe('batchUpdateCounters', () => {
    it('should process all successful updates', async () => {
      const updates = [
        { file: mockFile, key: 'view_count', value: 5 },
        { file: new TFile('test2.md') as any, key: 'access_count', value: 3 }
      ];

      // Mock successful updates
      jest.spyOn(frontmatterManager, 'updateCounter').mockResolvedValue(undefined);

      const result = await frontmatterManager.batchUpdateCounters(updates);

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.total).toBe(2);
    });

    it('should handle mixed success and failure', async () => {
      const updates = [
        { file: mockFile, key: 'view_count', value: 5 },
        { file: new TFile('test2.md') as any, key: 'access_count', value: 3 }
      ];

      // Mock one success, one failure
      jest.spyOn(frontmatterManager, 'updateCounter')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Update failed'));

      const result = await frontmatterManager.batchUpdateCounters(updates);

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Update failed');
    });
  });

  describe('getFrontmatter', () => {
    it('should return cached frontmatter when available', async () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockReturnValue({
        frontmatter: { view_count: 5, title: 'Test' }
      });

      const result = await frontmatterManager.getFrontmatter(mockFile);

      expect(result).toEqual({ view_count: 5, title: 'Test' });
    });

    it('should parse frontmatter from file content when cache unavailable', async () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockReturnValue(null);
      mockPlugin.app.vault.read = jest.fn().mockResolvedValue('---\nview_count: 3\ntitle: "Test"\n---\nContent');

      const result = await frontmatterManager.getFrontmatter(mockFile);

      expect(result).toEqual({ view_count: 3, title: 'Test' });
    });

    it('should return null for files without frontmatter', async () => {
      mockPlugin.app.metadataCache.getFileCache = jest.fn().mockReturnValue(null);
      mockPlugin.app.vault.read = jest.fn().mockResolvedValue('Just content without frontmatter');

      const result = await frontmatterManager.getFrontmatter(mockFile);

      expect(result).toBeNull();
    });
  });

  describe('updateFrontmatter', () => {
    it('should update multiple fields at once', async () => {
      mockPlugin.app.vault.read = jest.fn().mockResolvedValue('---\nold: value\n---\nContent');
      mockPlugin.app.vault.modify = jest.fn().mockResolvedValue(undefined);

      const data = { view_count: 5, last_modified: '2023-01-01' };
      await frontmatterManager.updateFrontmatter(mockFile, data);

      const modifyCall = (mockPlugin.app.vault.modify as jest.Mock).mock.calls[0][1];
      expect(modifyCall).toContain('view_count: 5');
      expect(modifyCall).toContain('last_modified: "2023-01-01"');
    });

    it('should preserve existing content after frontmatter', async () => {
      mockPlugin.app.vault.read = jest.fn().mockResolvedValue('---\nold: value\n---\n# Title\nContent here');
      mockPlugin.app.vault.modify = jest.fn().mockResolvedValue(undefined);

      await frontmatterManager.updateFrontmatter(mockFile, { new_field: 'value' });

      const modifyCall = (mockPlugin.app.vault.modify as jest.Mock).mock.calls[0][1];
      expect(modifyCall).toContain('# Title\nContent here');
    });
  });
});