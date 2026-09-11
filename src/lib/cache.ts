// In-Memory Server Cache Helper for Master Data
// Prevents continuous cross-region network roundtrips to Supabase for stable data

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<any>>();

export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCached<T>(key: string, data: T, ttlSeconds: number = 30): void {
  // Gracefully handle if callers pass milliseconds (e.g. 30 * 1000)
  const normalizedSeconds = ttlSeconds > 1000 ? Math.round(ttlSeconds / 1000) : ttlSeconds;
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + normalizedSeconds * 1000,
  });
}

export function invalidateCache(prefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}
