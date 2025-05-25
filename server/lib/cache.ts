// server/lib/cache.ts

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time To Live in milliseconds
}

export class MemoryCache {
  private cache = new Map<string, CacheItem<any>>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(cleanupIntervalMs = 5 * 60 * 1000) { // Default cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
    // Ensure Node.js timeout doesn't keep process alive if not needed in some environments
    if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    
    if (!item) {
      // console.log(`Cache MISS for key: ${key}`);
      return null;
    }
    
    if (Date.now() - item.timestamp > item.ttl) {
      // console.log(`Cache STALE for key: ${key}`);
      this.cache.delete(key);
      return null;
    }
    
    // console.log(`Cache HIT for key: ${key}`);
    return item.data as T;
  }

  async set<T>(key: string, data: T, ttlMs = 30 * 60 * 1000): Promise<void> { // Default TTL 30 minutes
    // console.log(`Cache SET for key: ${key}, TTL: ${ttlMs}ms`);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  async getOrSet<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttlMs = 30 * 60 * 1000 // Default TTL 30 minutes
  ): Promise<T> {
    const cachedData = await this.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }

    // console.log(`Cache MISS (getOrSet) for key: ${key}, fetching...`);
    const freshData = await fetchFn();
    await this.set(key, freshData, ttlMs);
    return freshData;
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