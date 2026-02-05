/**
 * Timing Patterns Module
 * Detects when prices are better (day of week, time patterns)
 *
 * Philosophy: Simple day-based patterns, no complex time series
 */

import { getPriceHistory, normalizeProductName } from '../ratoneando/price-storage'

const TIMING_CACHE_KEY = 'gaston_timing_patterns_cache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const DAYS_SHORT = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/**
 * Analyze price patterns by day of week
 * @param {string} productName - Product to analyze
 * @param {string} supermarket - Optional supermarket filter
 */
export function analyzeDayPatterns(productName, supermarket = null) {
  const normalized = normalizeProductName(productName)
  const cacheKey = `day_${normalized}_${supermarket || 'all'}`

  // Check cache
  const cached = getCachedPattern(cacheKey)
  if (cached) return cached

  // Get 60-day history for pattern analysis
  let history = getPriceHistory(productName, 60)

  // Filter by supermarket if specified
  if (supermarket) {
    history = history.filter(p =>
      p.supermarket && p.supermarket.toLowerCase().includes(supermarket.toLowerCase())
    )
  }

  // Need at least 14 data points for meaningful patterns
  if (history.length < 14) {
    return {
      hasPattern: false,
      productName: normalized,
      message: 'Sin suficientes datos para detectar patrones'
    }
  }

  // Group prices by day of week
  const dayPrices = {}
  for (let i = 0; i < 7; i++) {
    dayPrices[i] = []
  }

  for (const entry of history) {
    const date = new Date(entry.fetched_at)
    const day = date.getDay()
    dayPrices[day].push(entry.price)
  }

  // Calculate average per day
  const dayAverages = {}
  const validDays = []

  for (let i = 0; i < 7; i++) {
    if (dayPrices[i].length >= 2) {
      dayAverages[i] = dayPrices[i].reduce((a, b) => a + b, 0) / dayPrices[i].length
      validDays.push(i)
    }
  }

  // Need at least 4 days with data
  if (validDays.length < 4) {
    return {
      hasPattern: false,
      productName: normalized,
      message: 'Datos insuficientes por día'
    }
  }

  // Calculate overall average
  const overallAvg = Object.values(dayAverages).reduce((a, b) => a + b, 0) / validDays.length

  // Find best and worst days
  let bestDay = validDays[0]
  let worstDay = validDays[0]

  for (const day of validDays) {
    if (dayAverages[day] < dayAverages[bestDay]) bestDay = day
    if (dayAverages[day] > dayAverages[worstDay]) worstDay = day
  }

  // Calculate significance (difference from average)
  const bestDeviation = ((dayAverages[bestDay] - overallAvg) / overallAvg) * 100
  const worstDeviation = ((dayAverages[worstDay] - overallAvg) / overallAvg) * 100

  // Only significant if >5% difference
  const isSignificant = Math.abs(bestDeviation) >= 5 || Math.abs(worstDeviation) >= 5

  const result = {
    hasPattern: isSignificant,
    productName: normalized,
    supermarket,
    dayAverages: Object.fromEntries(
      validDays.map(d => [DAYS[d], Math.round(dayAverages[d])])
    ),
    bestDay: {
      dayIndex: bestDay,
      dayName: DAYS[bestDay],
      dayShort: DAYS_SHORT[bestDay],
      avgPrice: Math.round(dayAverages[bestDay]),
      deviation: Math.round(bestDeviation)
    },
    worstDay: {
      dayIndex: worstDay,
      dayName: DAYS[worstDay],
      dayShort: DAYS_SHORT[worstDay],
      avgPrice: Math.round(dayAverages[worstDay]),
      deviation: Math.round(worstDeviation)
    },
    overallAvg: Math.round(overallAvg),
    dataPoints: history.length,
    message: isSignificant
      ? `Suele estar más barato los ${DAYS[bestDay]}`
      : 'Sin patrón claro por día'
  }

  // Cache result
  setCachedPattern(cacheKey, result)

  return result
}

/**
 * Get timing recommendation for a product
 * Returns actionable advice if pattern exists
 */
export function getTimingRecommendation(productName, supermarket = null) {
  const pattern = analyzeDayPatterns(productName, supermarket)

  if (!pattern.hasPattern) {
    return null
  }

  const today = new Date().getDay()
  const { bestDay, worstDay } = pattern

  // If today is best day
  if (today === bestDay.dayIndex) {
    return {
      type: 'good_day',
      message: `Hoy es buen día para comprarlo`,
      detail: `Los ${bestDay.dayName} suele estar ${Math.abs(bestDay.deviation)}% más barato`,
      urgency: 'low'
    }
  }

  // If today is worst day
  if (today === worstDay.dayIndex && Math.abs(worstDay.deviation) >= 8) {
    return {
      type: 'bad_day',
      message: `Los ${DAYS[today]} suele estar más caro`,
      detail: `Conviene esperar al ${bestDay.dayName} (${Math.abs(bestDay.deviation)}% menos)`,
      urgency: 'medium'
    }
  }

  // Days until best day
  const daysUntilBest = (bestDay.dayIndex - today + 7) % 7
  if (daysUntilBest <= 2 && Math.abs(bestDay.deviation) >= 5) {
    return {
      type: 'wait',
      message: `En ${daysUntilBest === 1 ? 'mañana' : `${daysUntilBest} días`} suele estar mejor`,
      detail: `Los ${bestDay.dayName}: $${bestDay.avgPrice} promedio`,
      urgency: 'low'
    }
  }

  return null
}

/**
 * Analyze timing patterns for a supermarket (not product-specific)
 * Detects general shopping patterns
 */
export function analyzeSupermarketPatterns(supermarket) {
  const cacheKey = `super_${supermarket.toLowerCase()}`

  const cached = getCachedPattern(cacheKey)
  if (cached) return cached

  // Get all price history for this supermarket
  // This would need access to all products - simplified version
  // In practice, aggregate from multiple products

  return {
    hasPattern: false,
    supermarket,
    message: 'Análisis general no disponible'
  }
}

/**
 * Check if now is a good time to buy based on patterns
 */
export function isGoodTimeToBuy(productName, supermarket = null) {
  const recommendation = getTimingRecommendation(productName, supermarket)

  if (!recommendation) {
    return { isGood: true, reason: null }
  }

  if (recommendation.type === 'good_day') {
    return { isGood: true, reason: recommendation.message }
  }

  if (recommendation.type === 'bad_day') {
    return { isGood: false, reason: recommendation.message, alternative: recommendation.detail }
  }

  if (recommendation.type === 'wait') {
    return { isGood: false, reason: recommendation.message, alternative: recommendation.detail }
  }

  return { isGood: true, reason: null }
}

/**
 * Get weekly price distribution visualization data
 */
export function getWeeklyDistribution(productName, supermarket = null) {
  const pattern = analyzeDayPatterns(productName, supermarket)

  if (!pattern.hasPattern && !pattern.dayAverages) {
    return null
  }

  const distribution = DAYS.map((day, idx) => ({
    day: DAYS_SHORT[idx],
    dayFull: day,
    avg: pattern.dayAverages?.[day] || null,
    isBest: idx === pattern.bestDay?.dayIndex,
    isWorst: idx === pattern.worstDay?.dayIndex
  }))

  return distribution
}

/**
 * Cache helpers
 */
function getCachedPattern(key) {
  if (typeof window === 'undefined') return null

  try {
    const cacheData = localStorage.getItem(TIMING_CACHE_KEY)
    const cache = cacheData ? JSON.parse(cacheData) : {}

    const entry = cache[key]
    if (!entry) return null

    if (Date.now() - entry.cachedAt > CACHE_TTL) {
      return null
    }

    return entry.data
  } catch {
    return null
  }
}

function setCachedPattern(key, data) {
  if (typeof window === 'undefined') return

  try {
    const cacheData = localStorage.getItem(TIMING_CACHE_KEY)
    const cache = cacheData ? JSON.parse(cacheData) : {}

    cache[key] = {
      data,
      cachedAt: Date.now()
    }

    // Keep only last 30 entries
    const keys = Object.keys(cache)
    if (keys.length > 30) {
      const toRemove = keys.slice(0, keys.length - 30)
      toRemove.forEach(k => delete cache[k])
    }

    localStorage.setItem(TIMING_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear timing cache
 */
export function clearTimingCache() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TIMING_CACHE_KEY)
  }
}
