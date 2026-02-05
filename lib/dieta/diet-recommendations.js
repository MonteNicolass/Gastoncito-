/**
 * Diet-Aware Recommendations
 * Filters and prioritizes recommendations based on user's diet
 *
 * Rules:
 * - Only recommend products in diet
 * - Never suggest new foods
 * - Focus on where/when, not what
 */

import { getUserDiet, isInDiet, getFrequentItems, getDietConfidence } from './diet-model'
import { getCheapestOption, getAveragePrice } from '../ratoneando/price-storage'
import { analyzeDayPatterns, isGoodTimeToBuy } from '../mira-precios/timing-patterns'
import { getPriceJudgment, JUDGMENT } from '../mira-precios/price-judgments'

const DIET_RECO_DISMISSED_KEY = 'gaston_diet_reco_dismissed'
const DISMISS_COOLDOWN_DAYS = 14

/**
 * Filter recommendations to only diet-relevant items
 * @param {Array} recommendations - Raw recommendations
 * @param {Object} diet - User's diet
 */
export function filterByDiet(recommendations, diet) {
  if (!diet || !diet.items || diet.items.length === 0) {
    return recommendations
  }

  return recommendations.filter(reco => {
    // Keep non-product recommendations (timing, store switch)
    if (!reco.product) return true

    // Only keep if product is in diet
    return isInDiet(reco.product, diet)
  })
}

/**
 * Prioritize recommendations for diet items
 * @param {Array} recommendations - Recommendations to prioritize
 * @param {Object} diet - User's diet
 */
export function prioritizeByDiet(recommendations, diet) {
  if (!diet || !diet.items) return recommendations

  return [...recommendations].sort((a, b) => {
    const aInDiet = a.product ? isInDiet(a.product, diet) : false
    const bInDiet = b.product ? isInDiet(b.product, diet) : false

    // Diet items first
    if (aInDiet && !bInDiet) return -1
    if (!aInDiet && bInDiet) return 1

    // Then by savings
    return (b.monthlySavings || 0) - (a.monthlySavings || 0)
  })
}

/**
 * Generate "Compra Ideal Hoy" recommendation
 * Based only on diet items + current prices
 * @param {Object} diet - User's diet
 * @param {Object} patterns - Purchase patterns
 */
export function getIdealPurchaseToday(diet, patterns) {
  if (!diet || !diet.items || diet.items.length === 0) {
    return null
  }

  const confidence = getDietConfidence(diet)
  if (confidence === 'none' || confidence === 'low') {
    return null
  }

  const frequentItems = getFrequentItems(diet)
  if (frequentItems.length === 0) return null

  const today = new Date()
  const dayOfWeek = today.getDay()
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

  let bestSupermarket = null
  let bestSavings = 0
  let itemsToday = []
  let totalExpected = 0
  let totalOptimized = 0

  // Check each diet item
  frequentItems.forEach(item => {
    const cheapest = getCheapestOption(item.name)
    const avgPrice = getAveragePrice(item.name, 30)
    const timing = isGoodTimeToBuy(item.name)

    if (!cheapest || !avgPrice) return

    const expectedPrice = avgPrice
    const optimizedPrice = cheapest.price

    totalExpected += expectedPrice * (item.avgMonthlyQty / 4) // Weekly portion
    totalOptimized += optimizedPrice * (item.avgMonthlyQty / 4)

    // Track if today is good for this item
    if (timing.isGood) {
      itemsToday.push({
        name: item.name,
        store: cheapest.supermarket,
        price: cheapest.price,
        reason: timing.reason
      })
    }

    // Count supermarket votes
    if (cheapest.supermarket) {
      if (!bestSupermarket || cheapest.supermarket === bestSupermarket.name) {
        bestSupermarket = { name: cheapest.supermarket, count: (bestSupermarket?.count || 0) + 1 }
      }
    }
  })

  const weeklySavings = Math.round(totalExpected - totalOptimized)
  const monthlySavings = weeklySavings * 4

  // Only show if meaningful savings
  if (monthlySavings < 500) return null

  // Check if dismissed recently
  if (isDismissed('ideal_purchase_today')) return null

  return {
    id: 'ideal_purchase_today',
    type: 'diet_ideal_purchase',
    supermarket: bestSupermarket?.name || null,
    dayName: dayNames[dayOfWeek],
    isGoodDay: itemsToday.length >= frequentItems.length * 0.5,
    itemsCount: frequentItems.length,
    goodItemsToday: itemsToday.slice(0, 3),
    weeklySavings,
    monthlySavings,
    message: bestSupermarket
      ? `Compra ideal hoy: ${capitalize(bestSupermarket.name)}`
      : `Hoy es buen día para comprar`,
    detail: `Ahorro estimado: ~$${monthlySavings.toLocaleString('es-AR')}/mes`,
    confidence
  }
}

/**
 * Get diet-aware price alerts
 * Only alerts for items in user's diet
 */
export function getDietPriceAlerts(diet, patterns) {
  if (!diet || !diet.items || diet.items.length === 0) {
    return []
  }

  const alerts = []
  const frequentItems = getFrequentItems(diet)

  frequentItems.forEach(item => {
    const cheapest = getCheapestOption(item.name)
    if (!cheapest) return

    const judgment = getPriceJudgment(item.name, cheapest.price, null, cheapest.supermarket)

    if (!judgment.hasData) return

    // Alert for expensive items
    if (judgment.judgment === JUDGMENT.EXPENSIVE || judgment.judgment === JUDGMENT.VERY_EXPENSIVE) {
      // Check if dismissed
      if (isDismissed(`diet_expensive_${item.name}`)) return

      alerts.push({
        id: `diet_expensive_${item.name}`,
        type: 'diet_price_high',
        product: item.name,
        category: item.category,
        isEssential: item.isEssential,
        price: cheapest.price,
        deviation: judgment.deviation,
        message: `${capitalize(item.name)} está caro esta semana`,
        detail: judgment.detail,
        severity: item.isEssential ? 'medium' : 'low',
        action: {
          type: 'wait',
          label: 'Conviene esperar'
        }
      })
    }

    // Alert for good prices
    if (judgment.judgment === JUDGMENT.CHEAP || judgment.judgment === JUDGMENT.VERY_CHEAP) {
      alerts.push({
        id: `diet_cheap_${item.name}`,
        type: 'diet_price_low',
        product: item.name,
        category: item.category,
        isEssential: item.isEssential,
        price: cheapest.price,
        store: cheapest.supermarket,
        deviation: judgment.deviation,
        message: `${capitalize(item.name)} está a buen precio`,
        detail: `${Math.abs(judgment.deviation)}% menos en ${capitalize(cheapest.supermarket)}`,
        severity: 'low',
        action: {
          type: 'buy',
          label: 'Buen momento'
        }
      })
    }
  })

  // Limit and sort by severity
  return alerts
    .sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
    })
    .slice(0, 2)
}

/**
 * Generate context message for recommendations
 */
export function getDietContextMessage(diet) {
  if (!diet || !diet.items || diet.items.length === 0) {
    return null
  }

  const confidence = getDietConfidence(diet)

  if (confidence === 'high') {
    return 'En base a tu dieta habitual'
  }

  if (confidence === 'medium') {
    return 'Para los alimentos que solés consumir'
  }

  return null
}

/**
 * Check if recommendation was dismissed
 */
function isDismissed(recoId) {
  if (typeof window === 'undefined') return false

  try {
    const data = localStorage.getItem(DIET_RECO_DISMISSED_KEY)
    const dismissed = data ? JSON.parse(data) : {}

    const entry = dismissed[recoId]
    if (!entry) return false

    const daysSince = (Date.now() - entry.dismissedAt) / (24 * 60 * 60 * 1000)
    return daysSince < DISMISS_COOLDOWN_DAYS
  } catch {
    return false
  }
}

/**
 * Dismiss a diet recommendation
 */
export function dismissDietRecommendation(recoId) {
  if (typeof window === 'undefined') return

  try {
    const data = localStorage.getItem(DIET_RECO_DISMISSED_KEY)
    const dismissed = data ? JSON.parse(data) : {}

    dismissed[recoId] = {
      dismissedAt: Date.now()
    }

    // Clean old dismissals
    const cleaned = {}
    Object.entries(dismissed).forEach(([id, entry]) => {
      const daysSince = (Date.now() - entry.dismissedAt) / (24 * 60 * 60 * 1000)
      if (daysSince < DISMISS_COOLDOWN_DAYS * 2) {
        cleaned[id] = entry
      }
    })

    localStorage.setItem(DIET_RECO_DISMISSED_KEY, JSON.stringify(cleaned))
  } catch {
    // Ignore
  }
}

/**
 * Capitalize helper
 */
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
