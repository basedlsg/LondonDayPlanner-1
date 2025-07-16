// server/lib/cache.ts

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time To Live in milliseconds
  accessCount: number; // Track access frequency
  lastAccessed: number; // Track last access time
  tags?: string[]; // Support for tag-based invalidation
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRatio: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval?: NodeJS.Timeout;
  private stats = { hits: 0, misses: 0 };
  private maxSize: number;
  
  constructor(cleanupIntervalMs = 5 * 60 * 1000, maxSize = 1000) { // Default cleanup every 5 minutes, max 1000 items
    this.maxSize = maxSize;
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    // Ensure Node.js timeout doesn't keep process alive if not needed in some environments
    if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access statistics
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.stats.hits++;
    
    return item.data as T;
  }

  async set<T>(key: string, data: T, ttlMs = 30 * 60 * 1000, tags?: string[]): Promise<void> { // Default TTL 30 minutes
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: ttlMs,
      accessCount: 0,
      lastAccessed: now,
      tags
    });
  }

  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttlMs = 30 * 60 * 1000, // Default TTL 30 minutes
    tags?: string[]
  ): Promise<T> {
    const cachedData = await this.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }

    const freshData = await fetchFn();
    await this.set(key, freshData, ttlMs, tags);
    return freshData;
  }

  // LRU eviction - remove least recently used item
  private evictLRU(): void {
    let lruKey: string | null = null;
    let oldestAccess = Date.now();
    
    for (const [key, item] of this.cache.entries()) {
      if (item.lastAccessed < oldestAccess) {
        oldestAccess = item.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      this.cache.delete(lruKey);
      console.log(`🗑️ [Cache] Evicted LRU item: ${lruKey}`);
    }
  }

  // Tag-based invalidation
  async invalidateByTag(tag: string): Promise<number> {
    let deleted = 0;
    for (const [key, item] of this.cache.entries()) {
      if (item.tags?.includes(tag)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    console.log(`🗑️ [Cache] Invalidated ${deleted} items with tag: ${tag}`);
    return deleted;
  }

  // Get cache statistics
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.cache.size,
      hitRatio: total > 0 ? this.stats.hits / total : 0
    };
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  // Get cache keys with pattern matching
  getKeys(pattern?: string): string[] {
    const keys = Array.from(this.cache.keys());
    if (!pattern) return keys;
    
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return keys.filter(key => regex.test(key));
  }

  private cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;
    for (const [key, item] of Array.from(this.cache.entries())) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    if (deletedCount > 0) {
      // console.log(`Cache cleanup: Removed ${deletedCount} stale items.`);
    }
  }

  /**
   * Clears the interval timer. Call this when the cache is no longer needed 
   * to allow the Node.js process to exit gracefully if this is the only active timer.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cache.clear();
    // console.log("MemoryCache destroyed and cleanup interval cleared.");
  }
}

// Cache key generation utility function
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
  // Create a stable string representation by sorting keys
  const sortedKeys = Object.keys(params).sort();
  const stableParams: Record<string, any> = {};
  for (const key of sortedKeys) {
    // Ensure value is serializable and consistent (e.g., stringify objects if needed)
    // For simplicity, direct assignment is used here. Complex objects might need careful handling.
    stableParams[key] = params[key];
  }
  
  // Using JSON.stringify for a robust serialization of parameters
  // Consider a more performant hashing function for very high-traffic scenarios if JSON.stringify becomes a bottleneck
  const paramString = JSON.stringify(stableParams);
  return `${prefix}:${paramString}`;
} 