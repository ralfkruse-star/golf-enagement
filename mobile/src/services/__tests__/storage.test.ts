import { storage } from '../storage';

describe('Storage Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get and set items', async () => {
    await storage.setItem('test_key', 'test_value');
    const value = await storage.getItem('test_key');
    expect(value).toBe('test_value');
  });

  it('should get and set JSON', async () => {
    const testData = { name: 'John', age: 30 };
    await storage.setJSON('test_json', testData);
    const retrieved = await storage.getJSON('test_json');
    expect(retrieved).toEqual(testData);
  });

  it('should return null for non-existent keys', async () => {
    const value = await storage.getItem('non_existent');
    expect(value).toBeNull();
  });

  it('should remove items', async () => {
    await storage.setItem('to_remove', 'value');
    await storage.removeItem('to_remove');
    const value = await storage.getItem('to_remove');
    expect(value).toBeNull();
  });
});
