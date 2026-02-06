import type { Quote } from './providers'

const CACHE_KEY = 'gaston_market_quotes'
const TTL_MS = 30 * 60 * 1000 // 30 minutes

interface CacheEntry {
  quotes: Quote[]
  savedAt: number
}

function readCache(): CacheEntry | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(quotes: Quote[]): void {
  if (typeof window === 'undefined') return
  const entry: CacheEntry = { quotes, savedAt: Date.now() }
  localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
}

export function getCachedQuotes(): { quotes: Quote[]; isStale: boolean; lastUpdated: string | null } {
  const entry = readCache()
  if (!entry || entry.quotes.length === 0) {
    return { quotes: [], isStale: true, lastUpdated: null }
  }

  const isStale = Date.now() - entry.savedAt > TTL_MS
  const lastUpdated = new Date(entry.savedAt).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  // Mark cached quotes with source='cache' if stale
  const quotes = isStale
    ? entry.quotes.map(q => ({ ...q, source: 'cache' as const }))
    : entry.quotes

  return { quotes, isStale, lastUpdated }
}

export function saveQuotesToCache(quotes: Quote[]): void {
  writeCache(quotes)
}

export function isCacheFresh(): boolean {
  const entry = readCache()
  if (!entry) return false
  return Date.now() - entry.savedAt <= TTL_MS
}

export function clearQuotesCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY)
}
