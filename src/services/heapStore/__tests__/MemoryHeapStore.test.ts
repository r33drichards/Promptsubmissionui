import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryHeapStore } from '../MemoryHeapStore';

describe('MemoryHeapStore', () => {
  let store: MemoryHeapStore<string>;

  beforeEach(() => {
    store = new MemoryHeapStore<string>();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', async () => {
      await store.put('key1', 'value1');
      const result = await store.get('key1');
      expect(result).toBe('value1');
    });

    it('should return undefined for non-existent keys', async () => {
      const result = await store.get('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', async () => {
      await store.put('key1', 'value1');
      expect(await store.has('key1')).toBe(true);
      expect(await store.has('nonexistent')).toBe(false);
    });

    it('should delete values', async () => {
      await store.put('key1', 'value1');
      const deleted = await store.delete('key1');
      expect(deleted).toBe(true);
      expect(await store.get('key1')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await store.delete('nonexistent');
      expect(deleted).toBe(false);
    });

    it('should clear all values', async () => {
      await store.put('key1', 'value1');
      await store.put('key2', 'value2');
      await store.clear();
      expect(await store.size()).toBe(0);
      expect(await store.get('key1')).toBeUndefined();
    });

    it('should get all keys', async () => {
      await store.put('key1', 'value1');
      await store.put('key2', 'value2');
      await store.put('key3', 'value3');
      const keys = await store.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('should return correct size', async () => {
      expect(await store.size()).toBe(0);
      await store.put('key1', 'value1');
      expect(await store.size()).toBe(1);
      await store.put('key2', 'value2');
      expect(await store.size()).toBe(2);
    });
  });

  describe('TTL (Time-To-Live)', () => {
    it('should expire items after TTL', async () => {
      await store.put('key1', 'value1', 100); // 100ms TTL

      // Should exist immediately
      expect(await store.get('key1')).toBe('value1');

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be expired now
      expect(await store.get('key1')).toBeUndefined();
    });

    it('should use default TTL from config', async () => {
      const storeWithTTL = new MemoryHeapStore<string>({
        defaultTTL: 100,
      });

      await storeWithTTL.put('key1', 'value1');
      expect(await storeWithTTL.get('key1')).toBe('value1');

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(await storeWithTTL.get('key1')).toBeUndefined();
    });

    it('should override default TTL with item-specific TTL', async () => {
      const storeWithTTL = new MemoryHeapStore<string>({
        defaultTTL: 1000, // 1 second default
      });

      await storeWithTTL.put('key1', 'value1', 100); // Override with 100ms

      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(await storeWithTTL.get('key1')).toBeUndefined();
    });

    it('should not expire items without TTL', async () => {
      await store.put('key1', 'value1'); // No TTL

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(await store.get('key1')).toBe('value1');
    });
  });

  describe('Max Size and LRU Eviction', () => {
    it('should enforce max size', async () => {
      const limitedStore = new MemoryHeapStore<string>({
        maxSize: 3,
      });

      await limitedStore.put('key1', 'value1');
      await limitedStore.put('key2', 'value2');
      await limitedStore.put('key3', 'value3');
      expect(await limitedStore.size()).toBe(3);

      // Adding 4th item should evict the least recently used
      await limitedStore.put('key4', 'value4');
      expect(await limitedStore.size()).toBe(3);
    });

    it('should evict least recently accessed item', async () => {
      const limitedStore = new MemoryHeapStore<string>({
        maxSize: 2,
      });

      await limitedStore.put('key1', 'value1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await limitedStore.put('key2', 'value2');

      // Access key1 to make it more recently used
      await limitedStore.get('key1');

      // Adding key3 should evict key2 (least recently accessed)
      await limitedStore.put('key3', 'value3');

      expect(await limitedStore.has('key1')).toBe(true);
      expect(await limitedStore.has('key2')).toBe(false);
      expect(await limitedStore.has('key3')).toBe(true);
    });

    it('should call onEvict callback when item is evicted', async () => {
      const onEvict = vi.fn();
      const limitedStore = new MemoryHeapStore<string>({
        maxSize: 2,
        onEvict,
      });

      await limitedStore.put('key1', 'value1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await limitedStore.put('key2', 'value2');
      await limitedStore.put('key3', 'value3'); // Should evict key1

      expect(onEvict).toHaveBeenCalledWith('key1', 'value1');
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      await store.put('key1', 'value1');

      await store.get('key1'); // Hit
      await store.get('key1'); // Hit
      await store.get('nonexistent'); // Miss

      const stats = await store.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
    });

    it('should track evictions', async () => {
      const limitedStore = new MemoryHeapStore<string>({
        maxSize: 2,
      });

      await limitedStore.put('key1', 'value1');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await limitedStore.put('key2', 'value2');
      await limitedStore.put('key3', 'value3'); // Should evict key1

      const stats = await limitedStore.getStats();
      expect(stats.evictions).toBe(1);
    });

    it('should track current size', async () => {
      await store.put('key1', 'value1');
      await store.put('key2', 'value2');

      const stats = await store.getStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('Complex Data Types', () => {
    interface User {
      id: string;
      name: string;
      email: string;
    }

    it('should handle object values', async () => {
      const userStore = new MemoryHeapStore<User>();
      const user: User = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      };

      await userStore.put('user-123', user);
      const retrieved = await userStore.get('user-123');

      expect(retrieved).toEqual(user);
    });

    it('should handle array values', async () => {
      const arrayStore = new MemoryHeapStore<number[]>();
      const numbers = [1, 2, 3, 4, 5];

      await arrayStore.put('numbers', numbers);
      const retrieved = await arrayStore.get('numbers');

      expect(retrieved).toEqual(numbers);
    });
  });

  describe('Edge Cases', () => {
    it('should handle overwriting existing keys', async () => {
      await store.put('key1', 'value1');
      await store.put('key1', 'value2');

      expect(await store.get('key1')).toBe('value2');
      expect(await store.size()).toBe(1);
    });

    it('should handle empty string keys', async () => {
      await store.put('', 'value');
      expect(await store.get('')).toBe('value');
    });

    it('should handle empty string values', async () => {
      await store.put('key', '');
      expect(await store.get('key')).toBe('');
    });

    it('should call onEvict for all items when clearing', async () => {
      const onEvict = vi.fn();
      const storeWithCallback = new MemoryHeapStore<string>({ onEvict });

      await storeWithCallback.put('key1', 'value1');
      await storeWithCallback.put('key2', 'value2');
      await storeWithCallback.clear();

      expect(onEvict).toHaveBeenCalledTimes(2);
    });
  });
});
