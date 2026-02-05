/**
 * Diet-Aware Savings Projections
 * Calculates expected vs optimized spending based on diet
 *
 * Rules:
 * - Use only reliable data
 * - Show single number with brief justification
 * - Don't overcommit on estimates
 */

import { getUserDiet, getFrequentItems, getDietConfidence, frequencyToMonthly } from './diet-model'
import { getCheapestOption, getAveragePrice } from '../ratoneando/price-storage'

/**
 * Calculate monthly savings projection
 * @param {Object} diet - User's diet
 * @param {Object} patterns - Purchase patterns
 */
export function calculateMonthlySavingsProjection(diet, patterns) {
  if (!diet || !diet.items || diet.items.length === 0) {
    return null
  }

  const confidence = getDietConfidence(diet)
  if (confidence === 'none') return null

  const frequentItems = getFrequentItems(diet)
  if (frequentItems.length === 0) return null

  let totalExpected = 0
  let totalOptimized = 0
  let itemsAnalyzed = 0
  let savingsSources = []

  frequentItems.forEach(item => {
    const avgPrice = getAveragePrice(item.name, 30)
    const cheapest = getCheapestOption(item.name)

    if (!avgPrice || !cheapest) return

    const monthlyQty = item.avgMonthlyQty || frequencyToMonthly(item.frequency)
    const expectedCost = avgPrice * monthlyQty
    const optimizedCost = cheapest.price * monthlyQty

    totalExpected += expectedCost
    totalOptimized += optimizedCost
    itemsAnalyzed++

    // Track savings source
    const savings = expectedCost - optimizedCost
    if (savings > 200) {
      savingsSources.push({
        item: item.name,
        savings: Math.round(savings),
        store: cheapest.supermarket
      })
    }
  })

  if (itemsAnalyzed < 3) return null

  const monthlySavings = Math.round(totalExpected - totalOptimized)

  // Only show if meaningful
  if (monthlySavings < 500) return null

  // Determine main savings source
  const topSource = savingsSources
    .sort((a, b) => b.savings - a.savings)[0]

  // Generate justification
  let justification = ''
  if (topSource) {
    justification = `Mayor ahorro en ${topSource.item} comprando en ${capitalize(topSource.store)}`
  } else if (patterns?.preferredSupermarkets?.length >= 2) {
    const alt = patterns.preferredSupermarkets[1]
    justification = `Priorizando compras en ${capitalize(alt.name)}`
  } else {
    justification = 'Comprando en el mejor momento y lugar'
  }

  return {
    expectedMonthly: Math.round(totalExpected),
    optimizedMonthly: Math.round(totalOptimized),
    monthlySavings,
    savingsPercent: Math.round((monthlySavings / totalExpected) * 100),
    itemsAnalyzed,
    confidence,
    justification,
    topSavingsSources: savingsSources.slice(0, 3),
    message: `Siguiendo estas recomendaciones, podrías ahorrar ~$${monthlySavings.toLocaleString('es-AR')}/mes`,
    detail: justification
  }
}

/**
 * Get weekly shopping projection
 * @param {Object} diet - User's diet
 */
export function getWeeklyProjection(diet) {
  if (!diet || !diet.items) return null

  const monthly = calculateMonthlySavingsProjection(diet)
  if (!monthly) return null

  return {
    expectedWeekly: Math.round(monthly.expectedMonthly / 4),
    optimizedWeekly: Math.round(monthly.optimizedMonthly / 4),
    weeklySavings: Math.round(monthly.monthlySavings / 4)
  }
}

/**
 * Calculate year-to-date potential savings
 * @param {Object} diet - User's diet
 * @param {Array} movimientos - User's movements
 */
export function calculateYTDPotentialSavings(diet, movimientos) {
  if (!diet || !diet.items) return null

  const monthlyProjection = calculateMonthlySavingsProjection(diet)
  if (!monthlyProjection) return null

  // Calculate months elapsed this year
  const now = new Date()
  const monthsElapsed = now.getMonth() + 1

  // Rough estimate of potential savings
  const ytdPotential = monthlyProjection.monthlySavings * monthsElapsed

  // Don't show small amounts
  if (ytdPotential < 2000) return null

  return {
    ytdPotential,
    monthsRemaining: 12 - monthsElapsed,
    yearEndProjection: monthlyProjection.monthlySavings * 12,
    message: `Podrías haber ahorrado ~$${ytdPotential.toLocaleString('es-AR')} este año`,
    remainingMessage: `Aún podés ahorrar ~$${(monthlyProjection.monthlySavings * (12 - monthsElapsed)).toLocaleString('es-AR')} este año`
  }
}

/**
 * Get savings by category
 * @param {Object} diet - User's diet
 */
export function getSavingsByCategory(diet) {
  if (!diet || !diet.items) return []

  const byCategory = {}

  diet.items.forEach(item => {
    const avgPrice = getAveragePrice(item.name, 30)
    const cheapest = getCheapestOption(item.name)

    if (!avgPrice || !cheapest) return

    const cat = item.category || 'otros'
    const monthlyQty = item.avgMonthlyQty || 4
    const savings = (avgPrice - cheapest.price) * monthlyQty

    if (!byCategory[cat]) {
      byCategory[cat] = { category: cat, savings: 0, items: 0 }
    }
    byCategory[cat].savings += savings
    byCategory[cat].items++
  })

  return Object.values(byCategory)
    .filter(c => c.savings > 100)
    .sort((a, b) => b.savings - a.savings)
    .map(c => ({
      ...c,
      savings: Math.round(c.savings),
      message: `${capitalize(c.category)}: ~$${Math.round(c.savings).toLocaleString('es-AR')}/mes`
    }))
}

/**
 * Compare actual vs optimized spending
 * @param {Object} diet - User's diet
 * @param {Array} movimientos - Recent movements
 */
export function compareActualVsOptimized(diet, movimientos) {
  if (!diet || !diet.items || !movimientos) return null

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Get actual food spending
  const foodGastos = movimientos.filter(m => {
    if (m.tipo !== 'gasto') return false
    if (new Date(m.fecha) < thirtyDaysAgo) return false

    const motivo = (m.motivo || '').toLowerCase()
    const cat = (m.categoria || '').toLowerCase()

    return cat.includes('comida') || cat.includes('super') ||
           motivo.includes('super') || motivo.includes('mercado')
  })

  const actualSpend = foodGastos.reduce((sum, m) => sum + m.monto, 0)

  // Get optimized projection
  const projection = calculateMonthlySavingsProjection(diet)
  if (!projection) return null

  const diff = actualSpend - projection.optimizedMonthly
  const overspendPercent = Math.round((diff / projection.optimizedMonthly) * 100)

  if (diff < 500) return null // Not significant

  return {
    actualSpend: Math.round(actualSpend),
    optimizedSpend: projection.optimizedMonthly,
    overspend: Math.round(diff),
    overspendPercent,
    message: diff > 0
      ? `Gastaste ~$${Math.round(diff).toLocaleString('es-AR')} más de lo óptimo este mes`
      : `Gastaste menos de lo esperado`,
    severity: overspendPercent > 30 ? 'high' : overspendPercent > 15 ? 'medium' : 'low'
  }
}

/**
 * Get savings insight for Vision/Resumen
 */
export function getDietSavingsInsight(diet, patterns) {
  const projection = calculateMonthlySavingsProjection(diet, patterns)
  if (!projection) return null

  // Only show if savings are meaningful
  if (projection.monthlySavings < 1000) return null

  return {
    type: 'diet_savings',
    amount: projection.monthlySavings,
    message: projection.message,
    detail: projection.detail,
    confidence: projection.confidence,
    cta: {
      label: 'Ver detalle',
      action: 'show_savings_detail'
    }
  }
}

/**
 * Capitalize helper
 */
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
