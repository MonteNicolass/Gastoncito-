// Asset Quote History & Favorites (localStorage)
// Tracks daily prices for saved/favorite assets

const HISTORY_KEY = 'gaston_quote_history'
const FAVORITES_KEY = 'gaston_quote_favorites'

export interface QuoteHistoryEntry {
  date: string // YYYY-MM-DD
  buy: number | null
  sell: number | null
}

export interface AssetHistory {
  assetId: string
  assetName: string
  entries: QuoteHistoryEntry[]
}

// ── Favorites ──────────────────────────────────────────

export function getFavoriteAssets(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(FAVORITES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function toggleFavorite(assetId: string): string[] {
  const favorites = getFavoriteAssets()
  const idx = favorites.indexOf(assetId)
  if (idx >= 0) {
    favorites.splice(idx, 1)
  } else {
    favorites.push(assetId)
  }
  if (typeof window !== 'undefined') {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }
  return favorites
}

export function isFavorite(assetId: string): boolean {
  return getFavoriteAssets().includes(assetId)
}

// ── History ────────────────────────────────────────────

function readHistory(): Record<string, AssetHistory> {
  if (typeof window === 'undefined') return {}
  try {
    const data = localStorage.getItem(HISTORY_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function saveHistory(history: Record<string, AssetHistory>): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  }
}

export function saveQuoteToHistory(
  assetId: string,
  assetName: string,
  buy: number | null,
  sell: number | null,
): void {
  const history = readHistory()
  const today = new Date().toISOString().slice(0, 10)

  if (!history[assetId]) {
    history[assetId] = { assetId, assetName, entries: [] }
  }

  const asset = history[assetId]
  asset.assetName = assetName

  // Update today's entry or add new
  const existing = asset.entries.find(e => e.date === today)
  if (existing) {
    existing.buy = buy
    existing.sell = sell
  } else {
    asset.entries.push({ date: today, buy, sell })
  }

  // Keep last 90 days
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  asset.entries = asset.entries.filter(e => e.date >= cutoffStr)

  // Sort by date
  asset.entries.sort((a, b) => a.date.localeCompare(b.date))

  saveHistory(history)
}

export function getAssetHistory(assetId: string): AssetHistory | null {
  const history = readHistory()
  return history[assetId] || null
}

export function getAssetVariation(assetId: string): {
  currentSell: number | null
  previousSell: number | null
  delta: number | null
  deltaPercent: number | null
} | null {
  const asset = getAssetHistory(assetId)
  if (!asset || asset.entries.length === 0) return null

  const sorted = [...asset.entries].sort((a, b) => b.date.localeCompare(a.date))
  const current = sorted[0]
  const previous = sorted.length > 1 ? sorted[1] : null

  if (!current.sell) return null

  const delta = previous?.sell ? current.sell - previous.sell : null
  const deltaPercent = previous?.sell && previous.sell > 0
    ? Math.round(((current.sell - previous.sell) / previous.sell) * 1000) / 10
    : null

  return {
    currentSell: current.sell,
    previousSell: previous?.sell ?? null,
    delta,
    deltaPercent,
  }
}

export function saveBulkQuotesToHistory(
  quotes: { id: string; name: string; buy: number | null; sell: number | null }[],
): void {
  for (const q of quotes) {
    saveQuoteToHistory(q.id, q.name, q.buy, q.sell)
  }
}
