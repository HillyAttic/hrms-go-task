/**
 * Request-level cache utility
 * Caches data within a single API request to prevent duplicate queries
 */

export class RequestCache {
  private cache = new Map<string, any>();

  /**
   * Get cached value or fetch and cache it
   */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    const result = await fetcher();
    this.cache.set(key, result);
    return result;
  }

  /**
   * Check if key exists in cache
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Get cached value without fetching
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T): void {
    this.cache.set(key, value);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}
