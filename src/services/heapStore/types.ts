/**
 * Configuration options for the heap store
 */
export interface HeapStoreConfig<T> {
  /** Default time-to-live in milliseconds for cached items. undefined = no expiration */
  defaultTTL?: number;
  /** Maximum number of items to store. undefined = no limit */
  maxSize?: number;
  /** Callback fired when an item is evicted */
  onEvict?: (key: string, value: T) => void;
}

/**
 * Metadata for a stored item
 */
export interface StoredItem<T> {
  value: T;
  expiresAt?: number;
  createdAt: number;
  accessedAt: number;
}

/**
 * Statistics about the heap store
 */
export interface HeapStoreStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
}

/**
 * Interface for heap storage implementations
 */
export interface HeapStorage<T = any> {
  /**
   * Store a value with the given key
   */
  put(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Retrieve a value by key
   */
  get(key: string): Promise<T | undefined>;

  /**
   * Check if a key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Delete a value by key
   */
  delete(key: string): Promise<boolean>;

  /**
   * Clear all values
   */
  clear(): Promise<void>;

  /**
   * Get all keys currently in the store
   */
  keys(): Promise<string[]>;

  /**
   * Get the number of items in the store
   */
  size(): Promise<number>;

  /**
   * Get statistics about the store
   */
  getStats(): Promise<HeapStoreStats>;
}
