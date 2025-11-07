import {
  HeapStorage,
  HeapStoreConfig,
  StoredItem,
  HeapStoreStats,
} from './types';

/**
 * In-memory heap storage implementation using a Map.
 * Provides efficient O(1) get/set operations with optional TTL support.
 *
 * Features:
 * - Automatic expiration of items with TTL
 * - Maximum size enforcement with LRU eviction
 * - Statistics tracking (hits, misses, evictions)
 * - Type-safe storage with generics
 *
 * @example
 * ```ts
 * const store = new MemoryHeapStore<User>({
 *   defaultTTL: 5 * 60 * 1000, // 5 minutes
 *   maxSize: 1000
 * });
 *
 * await store.put('user-123', { id: '123', name: 'John' });
 * const user = await store.get('user-123');
 * ```
 */
export class MemoryHeapStore<T = any> implements HeapStorage<T> {
  private store: Map<string, StoredItem<T>> = new Map();
  private stats: HeapStoreStats = {
    size: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
  };
  private config: HeapStoreConfig<T>;

  constructor(config: HeapStoreConfig<T> = {}) {
    this.config = config;
  }

  /**
   * Store a value with the given key
   */
  async put(key: string, value: T, ttl?: number): Promise<void> {
    const now = Date.now();
    const effectiveTTL = ttl ?? this.config.defaultTTL;

    // Clean expired items before adding new one
    this.cleanExpired();

    // Enforce max size if configured
    if (
      this.config.maxSize &&
      !this.store.has(key) &&
      this.store.size >= this.config.maxSize
    ) {
      this.evictLRU();
    }

    const item: StoredItem<T> = {
      value,
      createdAt: now,
      accessedAt: now,
      expiresAt: effectiveTTL ? now + effectiveTTL : undefined,
    };

    this.store.set(key, item);
    this.stats.size = this.store.size;
  }

  /**
   * Retrieve a value by key
   */
  async get(key: string): Promise<T | undefined> {
    const item = this.store.get(key);

    if (!item) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      this.stats.size = this.store.size;
      return undefined;
    }

    // Update access time for LRU
    item.accessedAt = Date.now();
    this.stats.hits++;
    return item.value;
  }

  /**
   * Check if a key exists and is not expired
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== undefined;
  }

  /**
   * Delete a value by key
   */
  async delete(key: string): Promise<boolean> {
    const item = this.store.get(key);
    const deleted = this.store.delete(key);

    if (deleted) {
      this.stats.size = this.store.size;
      if (this.config.onEvict && item) {
        this.config.onEvict(key, item.value);
      }
    }

    return deleted;
  }

  /**
   * Clear all values
   */
  async clear(): Promise<void> {
    if (this.config.onEvict) {
      // Notify for each item being cleared
      for (const [key, item] of this.store.entries()) {
        this.config.onEvict(key, item.value);
      }
    }

    this.store.clear();
    this.stats.size = 0;
    // Keep hits/misses/evictions for statistics purposes
  }

  /**
   * Get all keys currently in the store
   */
  async keys(): Promise<string[]> {
    this.cleanExpired();
    return Array.from(this.store.keys());
  }

  /**
   * Get the number of items in the store
   */
  async size(): Promise<number> {
    this.cleanExpired();
    return this.store.size;
  }

  /**
   * Get statistics about the store
   */
  async getStats(): Promise<HeapStoreStats> {
    return { ...this.stats, size: this.store.size };
  }

  /**
   * Remove all expired items from the store
   */
  private cleanExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.store.entries()) {
      if (item.expiresAt && now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const item = this.store.get(key);
      this.store.delete(key);
      if (this.config.onEvict && item) {
        this.config.onEvict(key, item.value);
      }
    }

    if (keysToDelete.length > 0) {
      this.stats.evictions += keysToDelete.length;
      this.stats.size = this.store.size;
    }
  }

  /**
   * Evict the least recently used item
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.store.entries()) {
      if (item.accessedAt < oldestTime) {
        oldestTime = item.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const item = this.store.get(oldestKey);
      this.store.delete(oldestKey);
      this.stats.evictions++;
      this.stats.size = this.store.size;

      if (this.config.onEvict && item) {
        this.config.onEvict(oldestKey, item.value);
      }
    }
  }
}
