/**
 * Persistent Cache for Stock Data during the session
 */

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const stockCache = new Map<string, CacheEntry>();

/**
 * Gets cached data if it exists and is fresh
 */
export function getCachedStockData(symbol: string, range: string, interval: string): any | null {
  const key = `${symbol}-${range}-${interval}`;
  const entry = stockCache.get(key);
  
  if (!entry) return null;
  
  const isExpired = Date.now() - entry.timestamp > CACHE_TTL;
  if (isExpired) {
    stockCache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Sets stock data into the cache
 */
export function setCachedStockData(symbol: string, range: string, interval: string, data: any): void {
  const key = `${symbol}-${range}-${interval}`;
  stockCache.set(key, {
    data,
    timestamp: Date.now()
  });
}

/**
 * Clears all cached stock data (e.g. on Factory Reset)
 */
export function clearAllStockCache(): void {
  stockCache.clear();
}
