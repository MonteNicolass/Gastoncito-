/**
 * MiráPrecios - Smart Price Intelligence Layer
 *
 * Orchestrates all price analysis modules to provide:
 * - "Is this expensive/cheap?" judgments
 * - "When should I buy?" timing recommendations
 * - Price per unit comparisons
 * - Actionable insights (max 1-2 at a time)
 *
 * Philosophy: Gastón suggests, user decides
 */

// Re-export all modules
export * from './price-metrics'
export * from './price-judgments'
export * from './timing-patterns'
export * from './unit-price'

import {
  calculateProductMetrics,
  isPriceHigh,
  isPriceLow,
  clearMetricsCache
} from './price-metrics'

import {
  getPriceJudgment,
  getMostNotableJudgment,
  generatePurchaseSummary,
  shouldAlertForJudgment,
  JUDGMENT,
  getJudgmentColors
} from './price-judgments'

import {
  analyzeDayPatterns,
  getTimingRecommendation,
  isGoodTimeToBuy,
  clearTimingCache
} from './timing-patterns'

import {
  calculateUnitPrice,
  formatUnitPrice,
  findCheapestByUnit,
  generateUnitPriceComparison
} from './unit-price'

/**
 * Complete price analysis for a product
 * Returns all available insights in one call
 */
export function analyzeProduct(productName, price, options = {}) {
  const { brand = null, supermarket = null, skipTiming = false } = options

  const result = {
    product: productName,
    price,
    brand,
    supermarket,
    hasInsights: false,
    insights: []
  }

  // 1. Price judgment (expensive/cheap)
  const judgment = getPriceJudgment(productName, price, brand, supermarket)
  result.judgment = judgment

  if (judgment.hasData && judgment.judgment !== JUDGMENT.NORMAL) {
    result.hasInsights = true
    result.insights.push({
      type: 'price_level',
      priority: judgment.judgment === JUDGMENT.VERY_EXPENSIVE ? 3 :
                judgment.judgment === JUDGMENT.VERY_CHEAP ? 3 :
                judgment.judgment === JUDGMENT.EXPENSIVE ? 2 : 1,
      message: judgment.message,
      detail: judgment.detail,
      emoji: judgment.emoji,
      colors: getJudgmentColors(judgment.judgment)
    })
  }

  // 2. Timing recommendation
  if (!skipTiming) {
    const timing = getTimingRecommendation(productName, supermarket)
    result.timing = timing

    if (timing) {
      result.hasInsights = true
      result.insights.push({
        type: 'timing',
        priority: timing.urgency === 'medium' ? 2 : 1,
        message: timing.message,
        detail: timing.detail,
        emoji: timing.type === 'good_day' ? 'calendar' : 'clock'
      })
    }
  }

  // 3. Unit price info
  const unitPrice = calculateUnitPrice(price, productName)
  result.unitPrice = unitPrice

  // Sort insights by priority (highest first)
  result.insights.sort((a, b) => b.priority - a.priority)

  // Limit to 2 insights max
  result.insights = result.insights.slice(0, 2)

  return result
}

/**
 * Analyze a full purchase (movimiento with products)
 * Returns summary and per-product insights
 */
export function analyzePurchase(movimiento) {
  if (!movimiento.parsed_products || movimiento.parsed_products.length === 0) {
    return {
      hasSummary: false,
      products: [],
      summary: null,
      topInsights: []
    }
  }

  const supermarket = movimiento.supermarket || movimiento.method || null
  const productAnalyses = []

  // Analyze each product
  for (const product of movimiento.parsed_products) {
    const analysis = analyzeProduct(product.name, product.price, {
      brand: product.brand,
      supermarket,
      skipTiming: true // Skip timing for individual products in bulk analysis
    })
    productAnalyses.push(analysis)
  }

  // Generate summary
  const summary = generatePurchaseSummary(movimiento)

  // Collect top insights across all products
  const allInsights = productAnalyses
    .filter(a => a.hasInsights)
    .flatMap(a => a.insights.map(i => ({
      ...i,
      product: a.product
    })))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2)

  // Unit price comparison
  const unitComparison = generateUnitPriceComparison(
    movimiento.parsed_products.map(p => ({ name: p.name, price: p.price }))
  )

  return {
    hasSummary: summary !== null || allInsights.length > 0,
    products: productAnalyses,
    summary,
    topInsights: allInsights,
    unitComparison,
    supermarket
  }
}

/**
 * Get insights for display in alerts/suggestions
 * Returns max 2 most relevant insights
 */
export function getMiraPreciosInsights(context = {}) {
  const { recentPurchases = [], watchlist = [] } = context
  const insights = []

  // Analyze recent purchases for notable prices
  for (const purchase of recentPurchases.slice(0, 5)) {
    const analysis = analyzePurchase(purchase)

    if (analysis.summary && analysis.summary.type === 'warning') {
      insights.push({
        id: `mira_purchase_${purchase.id}`,
        type: 'price_warning',
        priority: 2,
        message: analysis.summary.message,
        detail: analysis.summary.detail,
        source: 'mira_precios'
      })
    }

    if (analysis.summary && analysis.summary.type === 'positive') {
      insights.push({
        id: `mira_good_${purchase.id}`,
        type: 'price_good',
        priority: 1,
        message: analysis.summary.message,
        detail: analysis.summary.detail,
        source: 'mira_precios'
      })
    }
  }

  // Check watchlist timing
  for (const item of watchlist.slice(0, 3)) {
    const timing = isGoodTimeToBuy(item.name, item.supermarket)

    if (timing.isGood && timing.reason) {
      insights.push({
        id: `mira_timing_${item.name}`,
        type: 'timing_good',
        priority: 2,
        message: `${item.name}: ${timing.reason}`,
        detail: null,
        source: 'mira_precios'
      })
    }
  }

  // Sort and limit
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2)
}

/**
 * Generate alerts for the alert engine integration
 * Returns alerts in standard format
 */
export function generateMiraPreciosAlerts(movimientos = []) {
  const alerts = []

  // Only analyze last 7 days of purchases
  const recentDate = new Date()
  recentDate.setDate(recentDate.getDate() - 7)

  const recentPurchases = movimientos.filter(m => {
    if (!m.parsed_products || m.parsed_products.length === 0) return false
    return new Date(m.date) >= recentDate
  })

  // Analyze purchases
  for (const purchase of recentPurchases) {
    const analysis = analyzePurchase(purchase)

    // Alert for expensive products
    for (const productAnalysis of analysis.products) {
      if (productAnalysis.judgment?.judgment === JUDGMENT.VERY_EXPENSIVE) {
        alerts.push({
          id: `mira_expensive_${purchase.id}_${productAnalysis.product}`,
          type: 'mira_precios',
          subtype: 'precio_alto_vs_historico',
          severity: 'medium',
          title: productAnalysis.product,
          message: productAnalysis.judgment.message,
          detail: productAnalysis.judgment.detail,
          context: {
            movimiento_id: purchase.id,
            product: productAnalysis.product,
            price: productAnalysis.price,
            deviation: productAnalysis.judgment.deviation
          }
        })
      }
    }

    // Alert for good deals found
    if (analysis.summary?.type === 'positive') {
      alerts.push({
        id: `mira_good_deal_${purchase.id}`,
        type: 'mira_precios',
        subtype: 'buen_precio_encontrado',
        severity: 'low',
        title: 'Buen precio detectado',
        message: analysis.summary.message,
        detail: analysis.summary.detail,
        context: {
          movimiento_id: purchase.id
        }
      })
    }
  }

  // Limit alerts
  return alerts.slice(0, 3)
}

/**
 * Quick check if a price is notable (for inline display)
 */
export function quickPriceCheck(productName, price, options = {}) {
  const judgment = getPriceJudgment(productName, price, options.brand, options.supermarket)

  if (!judgment.hasData) {
    return { notable: false }
  }

  if (judgment.judgment === JUDGMENT.NORMAL) {
    return { notable: false }
  }

  return {
    notable: true,
    isHigh: judgment.isHigh,
    isLow: judgment.isLow,
    emoji: judgment.emoji,
    label: judgment.message,
    colors: getJudgmentColors(judgment.judgment)
  }
}

/**
 * Clear all MiráPrecios caches
 */
export function clearAllCaches() {
  clearMetricsCache()
  clearTimingCache()
}
