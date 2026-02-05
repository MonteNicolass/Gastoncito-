/**
 * Price Metrics Module
 * Calculates historical averages, trends, and percentiles per product
 *
 * Philosophy: Simple heuristics, no ML, robust results
 */

import { getPriceHistory, normalizeProductName } from '../ratoneando/price-storage'

const METRICS_CACHE_KEY = 'gaston_price_metrics_cache'
const CACHE_TTL = 2 * 60 * 60 * 1000 // 2 hours

/**
 * Calculate comprehensive metrics for a product
 * @param {string} productName - Product name
 * @param {string} brand - Optional brand
 * @param {string} supermarket - Optional supermarket filter
 */
export function calculateProductMetrics(productName, brand = null, supermarket = null) {
  const normalized = normalizeProductName(productName)
  const cacheKey = `${normalized}_${brand || 'all'}_${supermarket || 'all'}`

  // Check cache first
  const cached = getCachedMetrics(cacheKey)
  if (cached) return cached

  // Get history for different time periods
  const history90 = getPriceHistory(productName, 90)
  const history30 = getPriceHistory(productName, 30)
  const history7 = getPriceHistory(productName, 7)

  // Filter by brand/supermarket if specified
  const filterHistory = (h) => {
    let filtered = h
    if (brand) {
      filtered = filtered.filter(p =>
        p.brand && normalizeProductName(p.brand) === normalizeProductName(brand)
      )
    }
    if (supermarket) {
      filtered = filtered.filter(p =>
        p.supermarket && p.supermarket.toLowerCase().includes(supermarket.toLowerCase())
      )
    }
    return filtered
  }

  const h90 = filterHistory(history90)
  const h30 = filterHistory(history30)
  const h7 = filterHistory(history7)

  // Not enough data
  if (h30.length < 3) {
    return {
      hasData: false,
      productName: normalized,
      message: 'Sin suficientes datos'
    }
  }

  // Calculate averages
  const avg90 = h90.length > 0 ? calcAverage(h90) : null
  const avg30 = calcAverage(h30)
  const avg7 = h7.length > 0 ? calcAverage(h7) : avg30

  // Min/Max in 30 days
  const min30 = Math.min(...h30.map(p => p.price))
  const max30 = Math.max(...h30.map(p => p.price))

  // Current price (most recent)
  const sortedByDate = [...h30].sort((a, b) => new Date(b.fetched_at) - new Date(a.fetched_at))
  const currentPrice = sortedByDate[0]?.price || avg30

  // Percentile of current price within 30d
  const percentile = calculatePercentile(h30.map(p => p.price), currentPrice)

  // Trend: compare 7d avg vs 30d avg
  const trend = calculateTrend(avg7, avg30)

  // Deviation from 30d average
  const deviationPercent = ((currentPrice - avg30) / avg30) * 100

  const metrics = {
    hasData: true,
    productName: normalized,
    brand,
    supermarket,
    dataPoints: h30.length,
    averages: {
      day7: Math.round(avg7),
      day30: Math.round(avg30),
      day90: avg90 ? Math.round(avg90) : null
    },
    range30: {
      min: Math.round(min30),
      max: Math.round(max30)
    },
    currentPrice: Math.round(currentPrice),
    percentile: Math.round(percentile * 100), // 0-100
    trend, // 'up' | 'down' | 'stable'
    deviationPercent: Math.round(deviationPercent),
    lastUpdated: sortedByDate[0]?.fetched_at || null
  }

  // Cache the result
  setCachedMetrics(cacheKey, metrics)

  return metrics
}

/**
 * Calculate average price from history
 */
function calcAverage(history) {
  if (history.length === 0) return 0
  const sum = history.reduce((acc, h) => acc + h.price, 0)
  return sum / history.length
}

/**
 * Calculate percentile of a value within a dataset
 * Returns 0-1 (0 = lowest, 1 = highest)
 */
function calculatePercentile(values, value) {
  if (values.length === 0) return 0.5

  const sorted = [...values].sort((a, b) => a - b)
  let count = 0

  for (const v of sorted) {
    if (v < value) count++
    else break
  }

  return count / sorted.length
}

/**
 * Calculate trend comparing short-term vs long-term average
 */
function calculateTrend(shortAvg, longAvg) {
  if (!shortAvg || !longAvg) return 'stable'

  const change = ((shortAvg - longAvg) / longAvg) * 100

  if (change > 5) return 'up'
  if (change < -5) return 'down'
  return 'stable'
}

/**
 * Get metrics for multiple products at once
 */
export function getMultipleProductMetrics(productNames) {
  return productNames.map(name => calculateProductMetrics(name))
}

/**
 * Check if price is significantly higher than historical
 */
export function isPriceHigh(metrics) {
  if (!metrics?.hasData) return false

  // High if: >10% above avg30 OR in top 20% (percentile >= 80)
  return metrics.deviationPercent >= 10 || metrics.percentile >= 80
}

/**
 * Check if price is significantly lower than historical
 */
export function isPriceLow(metrics) {
  if (!metrics?.hasData) return false

  // Low if: <-10% below avg30 OR in bottom 20% (percentile <= 20)
  return metrics.deviationPercent <= -10 || metrics.percentile <= 20
}

/**
 * Get cache
 */
function getCachedMetrics(key) {
  if (typeof window === 'undefined') return null

  try {
    const cacheData = localStorage.getItem(METRICS_CACHE_KEY)
    const cache = cacheData ? JSON.parse(cacheData) : {}

    const entry = cache[key]
    if (!entry) return null

    // Check TTL
    if (Date.now() - entry.cachedAt > CACHE_TTL) {
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

/**
 * Set cache
 */
function setCachedMetrics(key, data) {
  if (typeof window === 'undefined') return

  try {
    const cacheData = localStorage.getItem(METRICS_CACHE_KEY)
    const cache = cacheData ? JSON.parse(cacheData) : {}

    cache[key] = {
      data,
      cachedAt: Date.now()
    }

    // Keep only last 50 entries
    const keys = Object.keys(cache)
    if (keys.length > 50) {
      const toRemove = keys.slice(0, keys.length - 50)
      toRemove.forEach(k => delete cache[k])
    }

    localStorage.setItem(METRICS_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear metrics cache
 */
export function clearMetricsCache() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(METRICS_CACHE_KEY)
  }
}
