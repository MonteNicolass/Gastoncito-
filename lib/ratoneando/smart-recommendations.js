/**
 * Smart Recommendations Engine
 * Proactive, not on-demand recommendations
 *
 * Philosophy:
 * - Never suggest products user never bought
 * - Prioritize monthly savings, not unit prices
 * - Max 1-2 visible recommendations
 */

import { getPricesForProduct, getCheapestOption, getAveragePrice, getPriceTrend } from './price-storage'
import { getMostBoughtProducts, getShoppingProfile } from './purchase-patterns'

const RECO_CACHE_KEY = 'gaston_recommendations'
const RECO_DISMISSED_KEY = 'gaston_reco_dismissed'

/**
 * Generate smart recommendations based on patterns and prices
 * @param {Object} patterns - Purchase patterns
 * @param {Array} movimientos - Recent movements for context
 */
export function generateRecommendations(patterns, movimientos = []) {
  if (!patterns || patterns.dataPoints < 5) {
    return []
  }

  const recommendations = []

  // 1. Product substitution opportunities
  const substitutions = findSubstitutionOpportunities(patterns)
  recommendations.push(...substitutions)

  // 2. Supermarket switch opportunities
  const superSwitch = findSupermarketSavings(patterns)
  if (superSwitch) recommendations.push(superSwitch)

  // 3. Price drop alerts on frequent products
  const priceDrops = findPriceDrops(patterns)
  recommendations.push(...priceDrops)

  // 4. Timing recommendations
  const timing = findTimingOpportunities(patterns, movimientos)
  if (timing) recommendations.push(timing)

  // Filter dismissed and sort by potential savings
  const dismissed = getDismissedRecos()
  const filtered = recommendations
    .filter(r => !dismissed.includes(r.id))
    .sort((a, b) => (b.monthlySavings || 0) - (a.monthlySavings || 0))

  // Return max 2 recommendations
  return filtered.slice(0, 2)
}

/**
 * Find product substitution opportunities
 */
function findSubstitutionOpportunities(patterns) {
  const opportunities = []
  const frequentProducts = patterns.frequentProducts || []

  frequentProducts.forEach(product => {
    const prices = getPricesForProduct(product.name)
    if (prices.length < 2) return // Need at least 2 options

    // Find cheapest vs current preference
    const sorted = [...prices].sort((a, b) => a.price - b.price)
    const cheapest = sorted[0]
    const mostExpensive = sorted[sorted.length - 1]

    if (!cheapest || !mostExpensive) return

    const priceDiff = mostExpensive.price - cheapest.price
    const percentSaving = (priceDiff / mostExpensive.price) * 100

    // Only recommend if >15% savings
    if (percentSaving < 15) return

    // Estimate monthly savings based on frequency
    const monthlyPurchases = Math.ceil(product.frequency / 3) // Rough monthly estimate
    const monthlySavings = Math.round(priceDiff * monthlyPurchases)

    if (monthlySavings < 500) return // Min $500/month savings

    opportunities.push({
      id: `sub_${product.name}_${cheapest.supermarket}`,
      type: 'substitution',
      priority: monthlySavings > 2000 ? 'high' : 'medium',
      product: product.name,
      category: product.category,
      currentPrice: mostExpensive.price,
      currentStore: mostExpensive.supermarket,
      suggestedPrice: cheapest.price,
      suggestedStore: cheapest.supermarket,
      percentSaving: Math.round(percentSaving),
      monthlySavings,
      message: `${capitalize(product.name)} está $${Math.round(priceDiff)} más barato en ${capitalize(cheapest.supermarket)}`,
      detail: `Ahorro estimado: ~$${monthlySavings.toLocaleString('es-AR')}/mes`
    })
  })

  return opportunities.slice(0, 3)
}

/**
 * Find supermarket switch savings
 */
function findSupermarketSavings(patterns) {
  const supers = patterns.preferredSupermarkets || []
  if (supers.length < 2) return null

  // Compare user's primary vs alternatives
  const primary = supers[0]
  const alternative = supers[1]

  if (!primary || !alternative) return null

  // Simple heuristic: if alternative has lower avg spend per visit
  // but user goes there less, suggest reconsidering
  if (alternative.avgSpend < primary.avgSpend * 0.85) {
    const potentialSaving = (primary.avgSpend - alternative.avgSpend) * primary.count
    const monthlySavings = Math.round(potentialSaving / 3) // Rough monthly

    if (monthlySavings < 1000) return null

    return {
      id: `super_switch_${alternative.normalized}`,
      type: 'supermarket_switch',
      priority: monthlySavings > 3000 ? 'high' : 'medium',
      currentStore: primary.name,
      suggestedStore: alternative.name,
      monthlySavings,
      message: `Tus compras en ${capitalize(alternative.name)} salen más baratas`,
      detail: `Podrías ahorrar ~$${monthlySavings.toLocaleString('es-AR')}/mes cambiando más compras ahí`
    }
  }

  return null
}

/**
 * Find price drops on frequent products
 */
function findPriceDrops(patterns) {
  const drops = []
  const frequentProducts = patterns.frequentProducts || []

  frequentProducts.slice(0, 10).forEach(product => {
    const avgPrice = getAveragePrice(product.name, 30)
    const latestPrices = getPricesForProduct(product.name)

    if (!avgPrice || latestPrices.length === 0) return

    // Find any current price significantly below average
    latestPrices.forEach(price => {
      const discount = ((avgPrice - price.price) / avgPrice) * 100

      if (discount >= 15) {
        drops.push({
          id: `drop_${product.name}_${price.supermarket}`,
          type: 'price_drop',
          priority: discount > 25 ? 'high' : 'medium',
          product: product.name,
          store: price.supermarket,
          currentPrice: price.price,
          avgPrice: Math.round(avgPrice),
          discount: Math.round(discount),
          message: `${capitalize(product.name)} bajó ${Math.round(discount)}% en ${capitalize(price.supermarket)}`,
          detail: `Ahora $${price.price.toLocaleString('es-AR')} (antes ~$${Math.round(avgPrice).toLocaleString('es-AR')})`
        })
      }
    })
  })

  return drops.slice(0, 2)
}

/**
 * Find timing-based opportunities
 */
function findTimingOpportunities(patterns, movimientos) {
  // Check if user tends to shop on expensive days
  const shoppingDays = patterns.shoppingDays || []
  if (shoppingDays.length === 0) return null

  const topDay = shoppingDays[0]

  // Weekend shopping is often more expensive
  if (topDay.day === 0 || topDay.day === 6) {
    // Check if user has enough data to suggest weekday shopping
    const weekdaySpend = patterns.preferredSupermarkets?.reduce((sum, s) => sum + s.totalSpent, 0) || 0

    if (weekdaySpend > 10000) {
      return {
        id: 'timing_weekday',
        type: 'timing',
        priority: 'low',
        message: 'Los fines de semana suelen tener precios más altos',
        detail: 'Considerá hacer la compra grande entre semana',
        monthlySavings: null // Hard to estimate
      }
    }
  }

  return null
}

/**
 * Get specific recommendation for a product
 */
export function getProductRecommendation(productName, patterns) {
  const prices = getPricesForProduct(productName)
  if (prices.length < 2) return null

  const cheapest = getCheapestOption(productName)
  const avgPrice = getAveragePrice(productName, 30)
  const trend = getPriceTrend(productName)

  return {
    product: productName,
    cheapestOption: cheapest,
    avgPrice,
    trend,
    recommendation: generateProductAdvice(cheapest, avgPrice, trend)
  }
}

/**
 * Generate natural language advice for a product
 */
function generateProductAdvice(cheapest, avgPrice, trend) {
  if (!cheapest) return null

  let advice = `Mejor precio en ${capitalize(cheapest.supermarket)}: $${cheapest.price.toLocaleString('es-AR')}`

  if (avgPrice && cheapest.price < avgPrice * 0.9) {
    advice += '. Está abajo del promedio, buen momento para stockear.'
  } else if (trend === 'up') {
    advice += '. El precio viene subiendo.'
  }

  return advice
}

/**
 * Get total potential monthly savings
 */
export function getTotalPotentialSavings(recommendations) {
  return recommendations.reduce((sum, r) => sum + (r.monthlySavings || 0), 0)
}

/**
 * Format recommendation for display
 */
export function formatRecommendation(reco) {
  const colors = {
    high: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300'
    },
    medium: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300'
    },
    low: {
      bg: 'bg-zinc-50 dark:bg-zinc-800/50',
      border: 'border-zinc-200 dark:border-zinc-700',
      text: 'text-zinc-700 dark:text-zinc-300'
    }
  }

  return {
    ...reco,
    colors: colors[reco.priority] || colors.medium
  }
}

/**
 * Dismiss a recommendation
 */
export function dismissRecommendation(recoId) {
  if (typeof window === 'undefined') return

  const dismissed = getDismissedRecos()
  if (!dismissed.includes(recoId)) {
    dismissed.push(recoId)
    localStorage.setItem(RECO_DISMISSED_KEY, JSON.stringify(dismissed))
  }
}

/**
 * Get dismissed recommendation IDs
 */
function getDismissedRecos() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(RECO_DISMISSED_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Clear old dismissed (after 30 days)
 */
export function cleanDismissedRecos() {
  // For simplicity, just clear all after 30 days
  // In production, would track timestamps
  if (typeof window === 'undefined') return

  const dismissed = getDismissedRecos()
  if (dismissed.length > 50) {
    // Keep only last 20
    localStorage.setItem(RECO_DISMISSED_KEY, JSON.stringify(dismissed.slice(-20)))
  }
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Generate summary insight for Resumen General
 */
export function getSavingsInsight(recommendations, patterns) {
  if (recommendations.length === 0) {
    return null
  }

  const totalSavings = getTotalPotentialSavings(recommendations)

  if (totalSavings === 0) {
    return null
  }

  // Check if savings come from product switches or store switches
  const hasProductSwitch = recommendations.some(r => r.type === 'substitution')
  const hasStoreSwitch = recommendations.some(r => r.type === 'supermarket_switch')

  let insight = {
    type: 'savings_opportunity',
    amount: totalSavings,
    message: '',
    subtext: ''
  }

  if (totalSavings >= 5000) {
    insight.message = `Podrías ahorrar ~$${totalSavings.toLocaleString('es-AR')}/mes`
    insight.subtext = hasStoreSwitch
      ? 'Cambiando dónde comprás, no qué comprás'
      : 'Con pequeños cambios en tus compras habituales'
  } else if (totalSavings >= 2000) {
    insight.message = `Detecté oportunidades de ahorro`
    insight.subtext = `~$${totalSavings.toLocaleString('es-AR')}/mes sin cambiar hábitos`
  } else {
    insight.message = `Tus compras están bastante optimizadas`
    insight.subtext = 'Seguí así'
  }

  return insight
}
