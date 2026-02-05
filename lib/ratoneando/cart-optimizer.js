/**
 * Cart Optimizer
 * Calculates optimal supermarket for user's typical basket
 *
 * Output: Single decision, not a list of products
 * "Compra ideal: Día ($X)" / "Alternativa: Coto (+$Y)"
 */

import { getPricesForProduct, getCheapestOption, getTrackedProducts } from './price-storage'
import { getMostBoughtProducts } from './purchase-patterns'

/**
 * Calculate optimal shopping location
 * @param {Object} patterns - User purchase patterns
 * @returns {Object} Optimization result with best store and alternatives
 */
export function optimizeCart(patterns) {
  if (!patterns || patterns.dataPoints < 10) {
    return null
  }

  // Get user's typical basket (top 10-15 products)
  const typicalBasket = getMostBoughtProducts(patterns, 15)

  if (typicalBasket.length < 5) {
    return null
  }

  // Get all known supermarkets
  const knownSupers = getKnownSupermarkets(typicalBasket)

  if (knownSupers.length < 2) {
    return null // Need at least 2 stores to compare
  }

  // Calculate basket cost at each supermarket
  const basketCosts = knownSupers.map(supermarket => {
    const cost = calculateBasketCost(typicalBasket, supermarket)
    return {
      supermarket,
      totalCost: cost.total,
      itemsFound: cost.found,
      itemsMissing: cost.missing,
      coverage: cost.coverage
    }
  })

  // Filter stores with good coverage (>60% of basket)
  const validStores = basketCosts
    .filter(s => s.coverage >= 0.6)
    .sort((a, b) => a.totalCost - b.totalCost)

  if (validStores.length === 0) {
    return null
  }

  const best = validStores[0]
  const alternative = validStores[1] || null

  return {
    recommendation: {
      store: best.supermarket,
      estimatedCost: best.totalCost,
      coverage: Math.round(best.coverage * 100),
      itemsFound: best.itemsFound
    },
    alternative: alternative ? {
      store: alternative.supermarket,
      estimatedCost: alternative.totalCost,
      difference: alternative.totalCost - best.totalCost,
      percentMore: Math.round(((alternative.totalCost - best.totalCost) / best.totalCost) * 100)
    } : null,
    basketSize: typicalBasket.length,
    analyzedStores: knownSupers.length
  }
}

/**
 * Get all supermarkets with price data for basket items
 */
function getKnownSupermarkets(basket) {
  const supers = new Set()

  basket.forEach(product => {
    const prices = getPricesForProduct(product)
    prices.forEach(p => {
      supers.add(p.supermarket)
    })
  })

  return Array.from(supers)
}

/**
 * Calculate cost of basket at specific supermarket
 */
function calculateBasketCost(basket, supermarket) {
  let total = 0
  let found = 0
  let missing = []

  basket.forEach(product => {
    const prices = getPricesForProduct(product)
    const priceAtStore = prices.find(p =>
      p.supermarket.toLowerCase() === supermarket.toLowerCase()
    )

    if (priceAtStore) {
      total += priceAtStore.price
      found++
    } else {
      // Use cheapest available as fallback estimate
      const cheapest = getCheapestOption(product)
      if (cheapest) {
        total += cheapest.price * 1.1 // Add 10% penalty for missing
      }
      missing.push(product)
    }
  })

  return {
    total: Math.round(total),
    found,
    missing,
    coverage: found / basket.length
  }
}

/**
 * Format cart optimization for display
 */
export function formatCartOptimization(result) {
  if (!result) return null

  const { recommendation, alternative } = result

  return {
    primary: {
      text: `Compra ideal: ${capitalize(recommendation.store)}`,
      subtext: `~$${recommendation.estimatedCost.toLocaleString('es-AR')}`,
      coverage: `${recommendation.coverage}% de tu lista habitual`
    },
    secondary: alternative ? {
      text: `Alternativa: ${capitalize(alternative.store)}`,
      subtext: `+$${alternative.difference.toLocaleString('es-AR')} (+${alternative.percentMore}%)`
    } : null
  }
}

/**
 * Get quick savings tip based on optimization
 */
export function getQuickSavingsTip(optimization, patterns) {
  if (!optimization || !patterns) return null

  const { recommendation, alternative } = optimization

  // If there's a significant difference
  if (alternative && alternative.percentMore >= 10) {
    const primarySuper = patterns.preferredSupermarkets?.[0]

    // Check if user is shopping at the more expensive option
    if (primarySuper && primarySuper.normalized !== recommendation.store.toLowerCase()) {
      const monthlySavings = Math.round(alternative.difference * (patterns.purchaseFrequency?.purchasesPerMonth || 4))

      return {
        type: 'store_switch',
        message: `Si hacés tu compra habitual en ${capitalize(recommendation.store)} ahorrás ~$${monthlySavings.toLocaleString('es-AR')}/mes`,
        detail: 'Sin cambiar qué comprás, solo dónde',
        potentialSavings: monthlySavings
      }
    }
  }

  return null
}

/**
 * Compare two supermarkets for user's basket
 */
export function compareSupermarkets(super1, super2, patterns) {
  const basket = getMostBoughtProducts(patterns, 15)

  const cost1 = calculateBasketCost(basket, super1)
  const cost2 = calculateBasketCost(basket, super2)

  const cheaper = cost1.total <= cost2.total ? super1 : super2
  const difference = Math.abs(cost1.total - cost2.total)
  const percentDiff = Math.round((difference / Math.min(cost1.total, cost2.total)) * 100)

  return {
    cheaper,
    difference,
    percentDiff,
    super1: { name: super1, cost: cost1.total, coverage: cost1.coverage },
    super2: { name: super2, cost: cost2.total, coverage: cost2.coverage },
    summary: difference > 1000
      ? `${capitalize(cheaper)} es ~$${difference.toLocaleString('es-AR')} más barato para tu compra`
      : 'Precios similares en ambos'
  }
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
