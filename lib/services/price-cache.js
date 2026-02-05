/**
 * Price Cache Service
 * Local-first caching for external price data
 * Works offline with fallback to cached values
 */

const CACHE_KEY = 'gaston_price_cache'
const DEFAULT_TTL_HOURS = 6

/**
 * Get the entire cache object
 */
export function getCache() {
  if (typeof window === 'undefined') return {}
  try {
    const data = localStorage.getItem(CACHE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

/**
 * Save the entire cache object
 */
function saveCache(cache) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('Failed to save price cache:', e)
  }
}

/**
 * Get a cached price by key
 * Returns null if expired or not found
 */
export function getCachedPrice(key, ttlHours = DEFAULT_TTL_HOURS) {
  const cache = getCache()
  const entry = cache[key]

  if (!entry) return null

  const now = Date.now()
  const expiresAt = entry.timestamp + (ttlHours * 60 * 60 * 1000)

  if (now > expiresAt) {
    return null // Expired
  }

  return entry.data
}

/**
 * Set a cached price
 */
export function setCachedPrice(key, data) {
  const cache = getCache()
  cache[key] = {
    data,
    timestamp: Date.now()
  }
  saveCache(cache)
}

/**
 * Get cache entry with metadata (for showing "last updated")
 */
export function getCacheEntry(key) {
  const cache = getCache()
  return cache[key] || null
}

/**
 * Clear all cached prices
 */
export function clearPriceCache() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
}

/**
 * Format "last updated" time
 */
export function formatLastUpdated(timestamp) {
  if (!timestamp) return null

  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (minutes < 1) return 'Recién'
  if (minutes < 60) return `Hace ${minutes} min`
  if (hours < 24) return `Hace ${hours}h`

  const date = new Date(timestamp)
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}
