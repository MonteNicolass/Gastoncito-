/**
 * Market Rates Service - Argentina
 * Fetches and caches USD blue, oficial, and crypto rates
 * Uses localStorage for history (no IndexedDB changes)
 */

import { getCachedPrice, setCachedPrice, getCacheEntry, formatLastUpdated } from './price-cache'

const RATES_CACHE_KEY = 'gaston_market_rates'
const RATES_HISTORY_KEY = 'gaston_rates_history'

// Default TTL: 2 hours for exchange rates
const RATES_TTL_HOURS = 2

/**
 * Fetch all USD rates from DolarApi
 * Returns: { blue, oficial, tarjeta, mep, ccl }
 */
export async function fetchAllRates() {
  const cacheKey = 'all_usd_rates'
  const cached = getCachedPrice(cacheKey, RATES_TTL_HOURS)

  if (cached) return cached

  try {
    const response = await fetch('https://dolarapi.com/v1/dolares', {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) throw new Error('API error')

    const data = await response.json()

    // Parse the response into a clean object
    const rates = {
      blue: null,
      oficial: null,
      tarjeta: null,
      mep: null,
      ccl: null,
      cripto: null,
      fetched_at: Date.now()
    }

    for (const item of data) {
      const casa = item.casa?.toLowerCase()
      if (casa === 'blue') {
        rates.blue = { buy: item.compra, sell: item.venta }
      } else if (casa === 'oficial') {
        rates.oficial = { buy: item.compra, sell: item.venta }
      } else if (casa === 'tarjeta') {
        rates.tarjeta = { buy: item.compra, sell: item.venta }
      } else if (casa === 'bolsa' || casa === 'mep') {
        rates.mep = { buy: item.compra, sell: item.venta }
      } else if (casa === 'contadoconliqui' || casa === 'ccl') {
        rates.ccl = { buy: item.compra, sell: item.venta }
      } else if (casa === 'cripto') {
        rates.cripto = { buy: item.compra, sell: item.venta }
      }
    }

    // Cache and save to history
    setCachedPrice(cacheKey, rates)
    saveToHistory(rates)

    return rates
  } catch (error) {
    console.warn('Failed to fetch rates:', error)
    // Return cached even if expired
    const entry = getCacheEntry(cacheKey)
    return entry?.data || getDefaultRates()
  }
}

/**
 * Get USD Blue rate
 */
export async function getUsdBlue() {
  const rates = await fetchAllRates()
  return rates.blue?.sell || 1200
}

/**
 * Get USD Oficial rate
 */
export async function getUsdOficial() {
  const rates = await fetchAllRates()
  return rates.oficial?.sell || 1000
}

/**
 * Get USD Tarjeta rate (includes taxes)
 */
export async function getUsdTarjeta() {
  const rates = await fetchAllRates()
  return rates.tarjeta?.sell || 1500
}

/**
 * Get USD Cripto/USDT rate
 */
export async function getUsdCripto() {
  const rates = await fetchAllRates()
  return rates.cripto?.sell || rates.blue?.sell || 1200
}

/**
 * Get all rates synchronously from cache (for UI)
 * Returns null if not cached
 */
export function getCachedRates() {
  const entry = getCacheEntry('all_usd_rates')
  return entry?.data || null
}

/**
 * Get last updated time for rates
 */
export function getRatesLastUpdated() {
  const entry = getCacheEntry('all_usd_rates')
  return entry?.timestamp ? formatLastUpdated(entry.timestamp) : null
}

/**
 * Save rates to history (append only, max 90 days)
 */
function saveToHistory(rates) {
  if (typeof window === 'undefined') return

  try {
    const historyStr = localStorage.getItem(RATES_HISTORY_KEY)
    const history = historyStr ? JSON.parse(historyStr) : []

    // Add today's rates (one entry per day)
    const today = new Date().toISOString().slice(0, 10)
    const existingIndex = history.findIndex(h => h.date === today)

    const entry = {
      date: today,
      blue: rates.blue?.sell,
      oficial: rates.oficial?.sell,
      tarjeta: rates.tarjeta?.sell,
      cripto: rates.cripto?.sell
    }

    if (existingIndex >= 0) {
      history[existingIndex] = entry
    } else {
      history.push(entry)
    }

    // Keep only last 90 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    const filtered = history.filter(h => new Date(h.date) >= cutoff)

    localStorage.setItem(RATES_HISTORY_KEY, JSON.stringify(filtered))
  } catch (e) {
    console.warn('Failed to save rates history:', e)
  }
}

/**
 * Get rates history for a period
 */
export function getRatesHistory(days = 30) {
  if (typeof window === 'undefined') return []

  try {
    const historyStr = localStorage.getItem(RATES_HISTORY_KEY)
    if (!historyStr) return []

    const history = JSON.parse(historyStr)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    return history
      .filter(h => new Date(h.date) >= cutoff)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  } catch {
    return []
  }
}

/**
 * Get USD change percentage over period
 */
export function getUsdChangePercent(days = 30) {
  const history = getRatesHistory(days)
  if (history.length < 2) return null

  const oldest = history[0].blue
  const newest = history[history.length - 1].blue

  if (!oldest || !newest) return null

  return ((newest - oldest) / oldest) * 100
}

/**
 * Default fallback rates
 */
function getDefaultRates() {
  return {
    blue: { buy: 1150, sell: 1200 },
    oficial: { buy: 950, sell: 1000 },
    tarjeta: { buy: 1450, sell: 1500 },
    mep: { buy: 1100, sell: 1150 },
    ccl: { buy: 1120, sell: 1170 },
    cripto: { buy: 1180, sell: 1220 },
    fetched_at: null
  }
}

/**
 * Force refresh rates (bypass cache)
 */
export async function forceRefreshRates() {
  // Clear the cache entry
  if (typeof window !== 'undefined') {
    const cache = JSON.parse(localStorage.getItem('gaston_price_cache') || '{}')
    delete cache['all_usd_rates']
    localStorage.setItem('gaston_price_cache', JSON.stringify(cache))
  }
  return fetchAllRates()
}
