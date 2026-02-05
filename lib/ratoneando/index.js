/**
 * Ratoneando Engine
 * Unified smart savings assistant for Gastoncito
 *
 * Philosophy:
 * - Gastón recommends, doesn't ask
 * - Shows decisions, not raw data
 * - Prioritizes monthly savings, not unit prices
 */

import { cleanOldPrices, upsertPrice, getTrackedProducts } from './price-storage'
import { analyzePurchasePatterns, getCachedPatterns, getShoppingProfile } from './purchase-patterns'
import { generateRecommendations, getSavingsInsight, dismissRecommendation, getTotalPotentialSavings } from './smart-recommendations'
import { optimizeCart, formatCartOptimization, getQuickSavingsTip } from './cart-optimizer'
import { generatePriceAlerts, dismissPriceAlert, cleanOldPriceAlerts } from './price-alerts'
import { findSubstitutions, markSubstitutionShown, dismissSubstitution } from './substitutions'

// Re-export for convenience
export {
  upsertPrice,
  dismissRecommendation,
  dismissPriceAlert,
  dismissSubstitution,
  markSubstitutionShown
}

/**
 * Run the complete ratoneando analysis
 * @param {Array} movimientos - User movements
 * @param {boolean} forceRefresh - Force pattern recalculation
 */
export async function runRatoneandoEngine(movimientos, forceRefresh = false) {
  // 1. Clean old data
  cleanOldPrices()
  cleanOldPriceAlerts()

  // 2. Get or calculate patterns
  let patterns = forceRefresh ? null : getCachedPatterns()
  if (!patterns) {
    patterns = analyzePurchasePatterns(movimientos, 90)
  }

  // If not enough data, return minimal result
  if (patterns.dataPoints < 5) {
    return {
      hasData: false,
      patterns: null,
      recommendations: [],
      priceAlerts: [],
      substitutions: [],
      cartOptimization: null,
      savingsInsight: null,
      profile: null
    }
  }

  // 3. Generate all insights
  const recommendations = generateRecommendations(patterns, movimientos)
  const priceAlerts = generatePriceAlerts(patterns)
  const substitutions = findSubstitutions(patterns)
  const cartOptimization = optimizeCart(patterns)
  const savingsInsight = getSavingsInsight(recommendations, patterns)
  const profile = getShoppingProfile(patterns)

  // 4. Calculate total potential savings
  const totalPotentialSavings = getTotalPotentialSavings(recommendations)

  return {
    hasData: true,
    patterns,
    recommendations,
    priceAlerts,
    substitutions,
    cartOptimization,
    savingsInsight,
    profile,
    totalPotentialSavings,
    trackedProducts: getTrackedProducts().length
  }
}

/**
 * Get quick savings summary for Resumen General
 * This is the key integration point
 */
export function getSavingsSummary(ratoneandoResult) {
  if (!ratoneandoResult || !ratoneandoResult.hasData) {
    return null
  }

  const {
    savingsInsight,
    recommendations,
    cartOptimization,
    totalPotentialSavings
  } = ratoneandoResult

  // Priority: Monthly savings > Cart optimization > General insight
  if (totalPotentialSavings >= 3000) {
    return {
      type: 'savings',
      priority: 'high',
      title: `~$${totalPotentialSavings.toLocaleString('es-AR')}/mes de ahorro posible`,
      subtitle: recommendations.length > 0
        ? recommendations[0].message
        : 'Sin cambiar tus hábitos',
      action: {
        label: 'Ver cómo',
        type: 'navigate',
        href: '/money/insights'
      }
    }
  }

  // Cart optimization insight
  if (cartOptimization) {
    const formatted = formatCartOptimization(cartOptimization)
    if (formatted && cartOptimization.alternative?.difference >= 2000) {
      return {
        type: 'cart',
        priority: 'medium',
        title: formatted.primary.text,
        subtitle: cartOptimization.alternative
          ? `vs ${formatted.secondary?.text}: ${formatted.secondary?.subtext}`
          : formatted.primary.subtext,
        action: null
      }
    }
  }

  // General savings insight
  if (savingsInsight) {
    return {
      type: 'general',
      priority: savingsInsight.amount >= 2000 ? 'medium' : 'low',
      title: savingsInsight.message,
      subtitle: savingsInsight.subtext,
      action: null
    }
  }

  return null
}

/**
 * Get spending context (for Resumen when showing money stats)
 * Contextualizes if spending changed due to prices vs consumption
 */
export function getSpendingContext(ratoneandoResult, currentMonthSpend, previousMonthSpend) {
  if (!ratoneandoResult?.hasData || !currentMonthSpend || !previousMonthSpend) {
    return null
  }

  const spendChange = ((currentMonthSpend - previousMonthSpend) / previousMonthSpend) * 100

  // If spending went up
  if (spendChange > 10) {
    // Check if it's due to prices (products have been increasing)
    const priceAlerts = ratoneandoResult.priceAlerts || []
    const spikes = priceAlerts.filter(a => a.type === 'spike')

    if (spikes.length >= 2) {
      return {
        message: 'Tus gastos subieron por precios, no por consumo',
        detail: `${spikes.length} productos con aumentos detectados`,
        type: 'price_driven'
      }
    }
  }

  // If spending went down despite price increases
  if (spendChange < -5) {
    const recommendations = ratoneandoResult.recommendations || []
    if (recommendations.some(r => r.type === 'substitution' || r.type === 'supermarket_switch')) {
      return {
        message: 'Tus cambios de compra están funcionando',
        detail: 'Gastás menos manteniendo hábitos',
        type: 'optimization_working'
      }
    }
  }

  return null
}

/**
 * Learn from a new gasto (extract product/price if supermarket purchase)
 */
export function learnFromGasto(gasto) {
  if (!gasto || gasto.tipo !== 'gasto') return

  const motivo = (gasto.motivo || '').toLowerCase()
  const metodo = (gasto.metodo || '').toLowerCase()

  // Check if it's a supermarket purchase
  const supermarkets = ['dia', 'carrefour', 'coto', 'jumbo', 'disco', 'vea', 'changomas', 'walmart', 'chino', 'almacen']
  const isSupermarket = supermarkets.some(s => motivo.includes(s) || metodo.includes(s))

  if (!isSupermarket) return

  // Try to extract product and store
  let store = null
  for (const s of supermarkets) {
    if (motivo.includes(s)) {
      store = s
      break
    }
  }

  // Extract potential product
  const products = [
    'leche', 'pan', 'huevos', 'queso', 'yogur', 'arroz', 'fideos',
    'aceite', 'yerba', 'cafe', 'azucar', 'carne', 'pollo'
  ]

  let product = null
  for (const p of products) {
    if (motivo.includes(p)) {
      product = p
      break
    }
  }

  // If we found both, save the price
  if (store && product) {
    upsertPrice({
      product_name: product,
      supermarket: store,
      price: gasto.monto, // This is rough, but builds data over time
      unit: 'unidad'
    })
  }
}

/**
 * Format insights for display in Resumen General
 */
export function formatForResumen(ratoneandoResult) {
  if (!ratoneandoResult?.hasData) {
    return {
      hasSavings: false,
      summary: null,
      alerts: []
    }
  }

  const summary = getSavingsSummary(ratoneandoResult)
  const alerts = [
    ...(ratoneandoResult.priceAlerts || []).slice(0, 2),
    ...(ratoneandoResult.substitutions || []).slice(0, 1)
  ]

  return {
    hasSavings: summary !== null || alerts.length > 0,
    summary,
    alerts: alerts.map(a => ({
      id: a.id,
      type: a.type,
      message: a.message,
      detail: a.detail,
      priority: a.priority || 'medium'
    }))
  }
}

/**
 * Get Gastón's decision message
 * This is for the chat or quick insights
 */
export function getGastonDecision(ratoneandoResult) {
  if (!ratoneandoResult?.hasData) {
    return null
  }

  const { totalPotentialSavings, cartOptimization, recommendations } = ratoneandoResult

  // Priority messages
  if (totalPotentialSavings >= 5000) {
    return `Podrías ahorrar ~$${totalPotentialSavings.toLocaleString('es-AR')}/mes sin cambiar hábitos`
  }

  if (cartOptimization?.alternative?.difference >= 3000) {
    const best = cartOptimization.recommendation.store
    const diff = cartOptimization.alternative.difference
    return `Si hacés la compra en ${capitalize(best)} ahorrás ~$${diff.toLocaleString('es-AR')}`
  }

  if (recommendations.length > 0 && recommendations[0].monthlySavings >= 1500) {
    return recommendations[0].message
  }

  return null
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
