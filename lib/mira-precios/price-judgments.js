/**
 * Price Judgments Module
 * Generates contextual "expensive/cheap" judgments
 *
 * Philosophy: Simple thresholds, clear human-readable messages
 */

import { calculateProductMetrics, isPriceHigh, isPriceLow } from './price-metrics'

/**
 * Judgment levels
 */
export const JUDGMENT = {
  VERY_CHEAP: 'very_cheap',
  CHEAP: 'cheap',
  NORMAL: 'normal',
  EXPENSIVE: 'expensive',
  VERY_EXPENSIVE: 'very_expensive'
}

/**
 * Generate a price judgment for a product at a given price
 * @param {string} productName - Product name
 * @param {number} currentPrice - Price to evaluate
 * @param {string} brand - Optional brand
 * @param {string} supermarket - Optional supermarket
 */
export function getPriceJudgment(productName, currentPrice, brand = null, supermarket = null) {
  const metrics = calculateProductMetrics(productName, brand, supermarket)

  if (!metrics.hasData) {
    return {
      judgment: JUDGMENT.NORMAL,
      hasData: false,
      message: null,
      detail: null,
      metrics: null
    }
  }

  const { averages, percentile, deviationPercent, range30 } = metrics

  // Calculate deviation from avg30
  const deviation = ((currentPrice - averages.day30) / averages.day30) * 100

  // Determine judgment level
  let judgment = JUDGMENT.NORMAL
  let message = null
  let detail = null
  let emoji = null

  // Very expensive: >20% above avg OR top 10%
  if (deviation >= 20 || percentile >= 90) {
    judgment = JUDGMENT.VERY_EXPENSIVE
    emoji = '📈'
    message = `${Math.abs(Math.round(deviation))}% por encima de lo habitual`
    detail = percentile >= 90
      ? 'De los precios más altos del último mes'
      : `Tu promedio es $${formatNumber(averages.day30)}`
  }
  // Expensive: >10% above avg OR top 20%
  else if (deviation >= 10 || percentile >= 80) {
    judgment = JUDGMENT.EXPENSIVE
    emoji = '↑'
    message = `${Math.abs(Math.round(deviation))}% por encima de lo que solés pagar`
    detail = `Promedio 30d: $${formatNumber(averages.day30)}`
  }
  // Very cheap: <-20% below avg OR bottom 10%
  else if (deviation <= -20 || percentile <= 10) {
    judgment = JUDGMENT.VERY_CHEAP
    emoji = '🎯'
    message = 'Precio muy bajo'
    detail = `${Math.abs(Math.round(deviation))}% menos que tu promedio`
  }
  // Cheap: <-10% below avg OR bottom 20%
  else if (deviation <= -10 || percentile <= 20) {
    judgment = JUDGMENT.CHEAP
    emoji = '↓'
    message = 'De los más bajos del último mes'
    detail = `${Math.abs(Math.round(deviation))}% menos que $${formatNumber(averages.day30)}`
  }
  // Normal range
  else {
    judgment = JUDGMENT.NORMAL
    emoji = '→'
    message = 'Precio dentro de lo normal'
    detail = `Rango habitual: $${formatNumber(range30.min)} - $${formatNumber(range30.max)}`
  }

  return {
    judgment,
    hasData: true,
    emoji,
    message,
    detail,
    deviation: Math.round(deviation),
    percentile,
    isHigh: isPriceHigh(metrics),
    isLow: isPriceLow(metrics),
    metrics
  }
}

/**
 * Get a short judgment label for compact UI
 */
export function getJudgmentLabel(judgment) {
  const labels = {
    [JUDGMENT.VERY_CHEAP]: 'Muy barato',
    [JUDGMENT.CHEAP]: 'Barato',
    [JUDGMENT.NORMAL]: 'Normal',
    [JUDGMENT.EXPENSIVE]: 'Caro',
    [JUDGMENT.VERY_EXPENSIVE]: 'Muy caro'
  }
  return labels[judgment] || 'Normal'
}

/**
 * Get color scheme for judgment
 */
export function getJudgmentColors(judgment) {
  const colors = {
    [JUDGMENT.VERY_CHEAP]: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-300 dark:border-emerald-700'
    },
    [JUDGMENT.CHEAP]: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800'
    },
    [JUDGMENT.NORMAL]: {
      bg: 'bg-zinc-100 dark:bg-zinc-800',
      text: 'text-zinc-600 dark:text-zinc-400',
      border: 'border-zinc-200 dark:border-zinc-700'
    },
    [JUDGMENT.EXPENSIVE]: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800'
    },
    [JUDGMENT.VERY_EXPENSIVE]: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-300 dark:border-red-700'
    }
  }
  return colors[judgment] || colors[JUDGMENT.NORMAL]
}

/**
 * Generate judgment for a purchase (movimiento with parsed products)
 * Returns array of judgments for each product in the purchase
 */
export function judgePurchase(movimiento) {
  if (!movimiento.parsed_products || movimiento.parsed_products.length === 0) {
    return []
  }

  const judgments = []

  for (const product of movimiento.parsed_products) {
    const judgment = getPriceJudgment(
      product.name,
      product.price,
      product.brand,
      movimiento.supermarket || null
    )

    if (judgment.hasData && judgment.judgment !== JUDGMENT.NORMAL) {
      judgments.push({
        product: product.name,
        brand: product.brand,
        price: product.price,
        ...judgment
      })
    }
  }

  // Sort by deviation magnitude (most notable first)
  return judgments.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation))
}

/**
 * Get the most notable judgment from a purchase
 * Returns the single most interesting price insight
 */
export function getMostNotableJudgment(movimiento) {
  const judgments = judgePurchase(movimiento)

  if (judgments.length === 0) return null

  // Prioritize very cheap/expensive over regular cheap/expensive
  const veryNotable = judgments.find(j =>
    j.judgment === JUDGMENT.VERY_CHEAP || j.judgment === JUDGMENT.VERY_EXPENSIVE
  )

  return veryNotable || judgments[0]
}

/**
 * Generate a summary sentence for a shopping trip
 * Returns a human-readable summary of price performance
 */
export function generatePurchaseSummary(movimiento) {
  const judgments = judgePurchase(movimiento)

  if (judgments.length === 0) {
    return null
  }

  const cheap = judgments.filter(j =>
    j.judgment === JUDGMENT.CHEAP || j.judgment === JUDGMENT.VERY_CHEAP
  )
  const expensive = judgments.filter(j =>
    j.judgment === JUDGMENT.EXPENSIVE || j.judgment === JUDGMENT.VERY_EXPENSIVE
  )

  // All good
  if (cheap.length > 0 && expensive.length === 0) {
    if (cheap.length === 1) {
      return {
        type: 'positive',
        message: `${cheap[0].product} a buen precio`,
        detail: cheap[0].detail
      }
    }
    return {
      type: 'positive',
      message: `${cheap.length} productos a buen precio`,
      detail: null
    }
  }

  // Some expensive
  if (expensive.length > 0 && cheap.length === 0) {
    if (expensive.length === 1) {
      return {
        type: 'warning',
        message: `${expensive[0].product} ${expensive[0].message.toLowerCase()}`,
        detail: expensive[0].detail
      }
    }
    return {
      type: 'warning',
      message: `${expensive.length} productos por encima de lo habitual`,
      detail: null
    }
  }

  // Mixed
  if (expensive.length > 0 && cheap.length > 0) {
    return {
      type: 'mixed',
      message: `${cheap.length} a buen precio, ${expensive.length} por encima`,
      detail: null
    }
  }

  return null
}

/**
 * Check if we should alert for this judgment
 * Only alert for notable price differences
 */
export function shouldAlertForJudgment(judgment) {
  return judgment.judgment === JUDGMENT.VERY_CHEAP ||
         judgment.judgment === JUDGMENT.VERY_EXPENSIVE ||
         Math.abs(judgment.deviation) >= 15
}

/**
 * Format number for display
 */
function formatNumber(num) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0
  }).format(num)
}
