/**
 * Price Alerts System
 * Detects significant price changes on user's frequent products
 *
 * Conditions:
 * - below_avg: Price dropped below user's average
 * - spike: Price spiked above historical
 * - discount: Significant discount detected
 */

import { getAveragePrice, getPriceHistory, getPriceTrend, getPricesForProduct } from './price-storage'
import { getMostBoughtProducts } from './purchase-patterns'

const PRICE_ALERTS_KEY = 'gaston_price_alerts'
const ALERTS_DISMISSED_KEY = 'gaston_price_alerts_dismissed'

/**
 * Generate price alerts for user's frequent products
 * @param {Object} patterns - User purchase patterns
 */
export function generatePriceAlerts(patterns) {
  if (!patterns || patterns.dataPoints < 5) {
    return []
  }

  const alerts = []
  const frequentProducts = getMostBoughtProducts(patterns, 10)

  frequentProducts.forEach(product => {
    // Check for below average prices
    const belowAvgAlert = checkBelowAverage(product)
    if (belowAvgAlert) alerts.push(belowAvgAlert)

    // Check for price spikes
    const spikeAlert = checkPriceSpike(product)
    if (spikeAlert) alerts.push(spikeAlert)

    // Check for discounts
    const discountAlert = checkDiscount(product)
    if (discountAlert) alerts.push(discountAlert)
  })

  // Filter dismissed alerts
  const dismissed = getDismissedAlerts()
  const filtered = alerts.filter(a => !dismissed.includes(a.id))

  // Dedupe and sort by priority
  const unique = dedupeAlerts(filtered)

  return unique
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
    .slice(0, 3)
}

/**
 * Check if product is below average price
 */
function checkBelowAverage(productName) {
  const avgPrice = getAveragePrice(productName, 30)
  const prices = getPricesForProduct(productName)

  if (!avgPrice || prices.length === 0) return null

  // Find best current price
  const best = prices.reduce((min, p) => p.price < min.price ? p : min, prices[0])

  const discount = ((avgPrice - best.price) / avgPrice) * 100

  if (discount >= 15) {
    return {
      id: `below_avg_${productName}_${best.supermarket}`,
      type: 'below_avg',
      condition: 'below_avg',
      priority: discount >= 25 ? 'high' : 'medium',
      product: productName,
      store: best.supermarket,
      currentPrice: best.price,
      avgPrice: Math.round(avgPrice),
      discount: Math.round(discount),
      message: `${capitalize(productName)} está ${Math.round(discount)}% abajo de tu promedio`,
      detail: `$${best.price.toLocaleString('es-AR')} en ${capitalize(best.supermarket)} (promedio: $${Math.round(avgPrice).toLocaleString('es-AR')})`,
      action: 'stockear',
      triggeredAt: new Date().toISOString()
    }
  }

  return null
}

/**
 * Check for price spike
 */
function checkPriceSpike(productName) {
  const avgPrice = getAveragePrice(productName, 30)
  const prices = getPricesForProduct(productName)

  if (!avgPrice || prices.length === 0) return null

  // Check if ALL current prices are above average
  const allAbove = prices.every(p => p.price > avgPrice * 1.15)

  if (allAbove) {
    const minCurrent = Math.min(...prices.map(p => p.price))
    const spike = ((minCurrent - avgPrice) / avgPrice) * 100

    if (spike >= 20) {
      return {
        id: `spike_${productName}`,
        type: 'spike',
        condition: 'spike',
        priority: spike >= 35 ? 'high' : 'medium',
        product: productName,
        currentPrice: minCurrent,
        avgPrice: Math.round(avgPrice),
        spike: Math.round(spike),
        message: `${capitalize(productName)} subió ${Math.round(spike)}%`,
        detail: `Precio actual alto respecto a tu histórico`,
        action: 'esperar',
        triggeredAt: new Date().toISOString()
      }
    }
  }

  return null
}

/**
 * Check for discount
 */
function checkDiscount(productName) {
  const prices = getPricesForProduct(productName)
  if (prices.length < 2) return null

  // Compare cheapest vs most expensive current option
  const sorted = [...prices].sort((a, b) => a.price - b.price)
  const cheapest = sorted[0]
  const mostExpensive = sorted[sorted.length - 1]

  const discount = ((mostExpensive.price - cheapest.price) / mostExpensive.price) * 100

  if (discount >= 25) {
    return {
      id: `discount_${productName}_${cheapest.supermarket}`,
      type: 'discount',
      condition: 'discount',
      priority: discount >= 40 ? 'high' : 'medium',
      product: productName,
      store: cheapest.supermarket,
      discountedPrice: cheapest.price,
      regularPrice: mostExpensive.price,
      discount: Math.round(discount),
      message: `${capitalize(productName)} con ${Math.round(discount)}% off en ${capitalize(cheapest.supermarket)}`,
      detail: `$${cheapest.price.toLocaleString('es-AR')} vs $${mostExpensive.price.toLocaleString('es-AR')} en ${capitalize(mostExpensive.supermarket)}`,
      action: 'aprovechar',
      triggeredAt: new Date().toISOString()
    }
  }

  return null
}

/**
 * Get active price alerts
 */
export function getActivePriceAlerts() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(PRICE_ALERTS_KEY)
    const alerts = data ? JSON.parse(data) : []

    // Filter to last 7 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)

    return alerts.filter(a => new Date(a.triggeredAt) >= cutoff)
  } catch {
    return []
  }
}

/**
 * Save alerts
 */
export function savePriceAlerts(alerts) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts))
}

/**
 * Dismiss an alert
 */
export function dismissPriceAlert(alertId) {
  if (typeof window === 'undefined') return

  const dismissed = getDismissedAlerts()
  if (!dismissed.includes(alertId)) {
    dismissed.push(alertId)
    localStorage.setItem(ALERTS_DISMISSED_KEY, JSON.stringify(dismissed))
  }
}

/**
 * Get dismissed alert IDs
 */
function getDismissedAlerts() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(ALERTS_DISMISSED_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Remove duplicate alerts (same product, same type)
 */
function dedupeAlerts(alerts) {
  const seen = new Set()
  return alerts.filter(a => {
    const key = `${a.product}_${a.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Format alert for display
 */
export function formatPriceAlert(alert) {
  const icons = {
    below_avg: 'TrendingDown',
    spike: 'TrendingUp',
    discount: 'Percent'
  }

  const colors = {
    high: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-500'
    },
    medium: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-500'
    },
    low: {
      bg: 'bg-zinc-50 dark:bg-zinc-800/50',
      border: 'border-zinc-200 dark:border-zinc-700',
      text: 'text-zinc-700 dark:text-zinc-300',
      icon: 'text-zinc-500'
    }
  }

  // Spike alerts are warnings (different color)
  if (alert.type === 'spike') {
    colors.high = {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-500'
    }
  }

  return {
    ...alert,
    iconName: icons[alert.type] || 'Info',
    colors: colors[alert.priority] || colors.medium
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
 * Clean old alerts (>30 days)
 */
export function cleanOldPriceAlerts() {
  if (typeof window === 'undefined') return

  const alerts = getActivePriceAlerts()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30)

  const cleaned = alerts.filter(a => new Date(a.triggeredAt) >= cutoff)

  if (cleaned.length !== alerts.length) {
    savePriceAlerts(cleaned)
  }

  // Also clean old dismissed
  const dismissed = getDismissedAlerts()
  if (dismissed.length > 100) {
    localStorage.setItem(ALERTS_DISMISSED_KEY, JSON.stringify(dismissed.slice(-50)))
  }
}
