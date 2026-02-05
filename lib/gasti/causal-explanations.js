/**
 * Causal Explanations - Explain spending changes
 *
 * Separates "price changes" from "behavior changes"
 * Uses inflation as proxy for price, frequency for behavior
 *
 * Note: These are approximations, not precise calculations
 */

import { CATEGORY_DEFINITIONS } from './human-categories'

// Monthly inflation rates (approximate, updated periodically)
const INFLATION_CACHE_KEY = 'gaston_monthly_inflation'
const DEFAULT_MONTHLY_INFLATION = 4 // 4% as fallback

/**
 * Explain monthly variation for a category
 * @param {Array} thisMonthGastos - This month's expenses
 * @param {Array} lastMonthGastos - Last month's expenses
 * @param {string} categoryId - Category to analyze
 * @param {number} monthlyInflation - Monthly inflation rate (%)
 */
export function explainCategoryVariation(thisMonthGastos, lastMonthGastos, categoryId, monthlyInflation = null) {
  // Filter by category
  const thisMonth = thisMonthGastos.filter(g => g.category_id === categoryId)
  const lastMonth = lastMonthGastos.filter(g => g.category_id === categoryId)

  const thisTotal = thisMonth.reduce((s, g) => s + g.monto, 0)
  const lastTotal = lastMonth.reduce((s, g) => s + g.monto, 0)

  if (lastTotal === 0) return null

  const totalDiff = thisTotal - lastTotal
  if (Math.abs(totalDiff) < 1000) return null // Not significant

  // Get inflation rate
  const inflation = monthlyInflation || getStoredInflation() || DEFAULT_MONTHLY_INFLATION

  // Calculate components
  const thisCount = thisMonth.length
  const lastCount = lastMonth.length

  const thisAvgTicket = thisCount > 0 ? thisTotal / thisCount : 0
  const lastAvgTicket = lastCount > 0 ? lastTotal / lastCount : 0

  // Price component: assume inflation affects avg ticket
  // Expected price increase = lastTotal * (inflation / 100)
  const priceComponent = Math.round(lastTotal * (inflation / 100))

  // Behavior component: frequency change
  // More purchases = more spending independent of price
  const frequencyChange = thisCount - lastCount
  const behaviorFromFrequency = frequencyChange > 0
    ? frequencyChange * lastAvgTicket
    : frequencyChange * thisAvgTicket

  // Remaining diff is mix of both (allocate proportionally)
  const explained = priceComponent + behaviorFromFrequency
  const unexplained = totalDiff - explained

  // Distribute unexplained proportionally
  const priceShare = priceComponent / (Math.abs(priceComponent) + Math.abs(behaviorFromFrequency) + 1)
  const behaviorShare = 1 - priceShare

  const finalPriceComponent = Math.round(priceComponent + (unexplained * priceShare))
  const finalBehaviorComponent = Math.round(behaviorFromFrequency + (unexplained * behaviorShare))

  // Calculate percentages
  const totalAbs = Math.abs(finalPriceComponent) + Math.abs(finalBehaviorComponent)
  const pricePercent = totalAbs > 0 ? Math.round((Math.abs(finalPriceComponent) / totalAbs) * 100) : 50
  const behaviorPercent = 100 - pricePercent

  const catDef = CATEGORY_DEFINITIONS[categoryId]
  const catName = catDef?.name || categoryId

  return {
    categoryId,
    categoryName: catName,
    totalDiff,
    priceComponent: finalPriceComponent,
    behaviorComponent: finalBehaviorComponent,
    pricePercent,
    behaviorPercent,
    inflation,
    thisMonthTotal: thisTotal,
    lastMonthTotal: lastTotal,
    thisMonthCount: thisCount,
    lastMonthCount: lastCount,
    message: generateExplanationMessage(catName, totalDiff, pricePercent, behaviorPercent),
    detail: generateExplanationDetail(finalPriceComponent, finalBehaviorComponent, frequencyChange)
  }
}

/**
 * Explain total monthly variation
 */
export function explainTotalVariation(thisMonthGastos, lastMonthGastos, monthlyInflation = null) {
  const thisTotal = thisMonthGastos.reduce((s, g) => s + g.monto, 0)
  const lastTotal = lastMonthGastos.reduce((s, g) => s + g.monto, 0)

  if (lastTotal === 0) return null

  const totalDiff = thisTotal - lastTotal
  if (Math.abs(totalDiff) < 5000) return null // Not significant

  const inflation = monthlyInflation || getStoredInflation() || DEFAULT_MONTHLY_INFLATION

  // Calculate by category and aggregate
  const categories = new Set([
    ...thisMonthGastos.map(g => g.category_id),
    ...lastMonthGastos.map(g => g.category_id)
  ])

  let totalPriceComponent = 0
  let totalBehaviorComponent = 0
  const categoryBreakdown = []

  for (const cat of categories) {
    if (!cat) continue

    const explanation = explainCategoryVariation(
      thisMonthGastos,
      lastMonthGastos,
      cat,
      inflation
    )

    if (explanation) {
      totalPriceComponent += explanation.priceComponent
      totalBehaviorComponent += explanation.behaviorComponent

      if (Math.abs(explanation.totalDiff) >= 2000) {
        categoryBreakdown.push(explanation)
      }
    }
  }

  const totalAbs = Math.abs(totalPriceComponent) + Math.abs(totalBehaviorComponent)
  const pricePercent = totalAbs > 0 ? Math.round((Math.abs(totalPriceComponent) / totalAbs) * 100) : 50
  const behaviorPercent = 100 - pricePercent

  // Sort breakdown by impact
  categoryBreakdown.sort((a, b) => Math.abs(b.totalDiff) - Math.abs(a.totalDiff))

  return {
    totalDiff,
    priceComponent: totalPriceComponent,
    behaviorComponent: totalBehaviorComponent,
    pricePercent,
    behaviorPercent,
    inflation,
    thisMonthTotal: thisTotal,
    lastMonthTotal: lastTotal,
    categoryBreakdown: categoryBreakdown.slice(0, 3),
    message: generateTotalExplanationMessage(totalDiff, pricePercent, behaviorPercent),
    detail: generateTotalExplanationDetail(categoryBreakdown)
  }
}

/**
 * Generate explanation message for category
 */
function generateExplanationMessage(catName, diff, pricePercent, behaviorPercent) {
  const direction = diff > 0 ? 'subió' : 'bajó'
  const amount = formatMoney(Math.abs(diff))

  if (pricePercent >= 70) {
    return `${catName} ${direction} ${amount}. Mayormente por precios.`
  }

  if (behaviorPercent >= 70) {
    return `${catName} ${direction} ${amount}. Mayormente por ${diff > 0 ? 'más compras' : 'menos compras'}.`
  }

  return `${catName} ${direction} ${amount}.\n≈${pricePercent}% inflación, ≈${behaviorPercent}% por ${diff > 0 ? 'más compras' : 'menos compras'}.`
}

/**
 * Generate detail for explanation
 */
function generateExplanationDetail(priceComp, behaviorComp, freqChange) {
  const parts = []

  if (Math.abs(priceComp) >= 500) {
    parts.push(`Inflación: ${priceComp > 0 ? '+' : ''}$${formatNumber(priceComp)}`)
  }

  if (Math.abs(behaviorComp) >= 500) {
    const label = freqChange > 0 ? 'más compras' : freqChange < 0 ? 'menos compras' : 'cambio de hábito'
    parts.push(`${capitalizeFirst(label)}: ${behaviorComp > 0 ? '+' : ''}$${formatNumber(behaviorComp)}`)
  }

  return parts.join(' / ')
}

/**
 * Generate total explanation message
 */
function generateTotalExplanationMessage(diff, pricePercent, behaviorPercent) {
  const direction = diff > 0 ? 'Gastaste más' : 'Gastaste menos'
  const amount = formatMoney(Math.abs(diff))

  return `${direction}: ${amount}`
}

/**
 * Generate total explanation detail
 */
function generateTotalExplanationDetail(breakdown) {
  if (breakdown.length === 0) return null

  const topCategory = breakdown[0]
  return `Mayor cambio: ${topCategory.categoryName} (${topCategory.totalDiff > 0 ? '+' : ''}$${formatNumber(topCategory.totalDiff)})`
}

/**
 * Get stored monthly inflation
 */
function getStoredInflation() {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(INFLATION_CACHE_KEY)
    if (!data) return null

    const { rate, month } = JSON.parse(data)
    const currentMonth = new Date().toISOString().slice(0, 7)

    // Use if from current or last month
    if (month === currentMonth || isLastMonth(month)) {
      return rate
    }

    return null
  } catch {
    return null
  }
}

/**
 * Store monthly inflation rate
 * Call this from macro-snapshots integration
 */
export function storeInflation(rate) {
  if (typeof window === 'undefined') return

  localStorage.setItem(INFLATION_CACHE_KEY, JSON.stringify({
    rate,
    month: new Date().toISOString().slice(0, 7)
  }))
}

/**
 * Check if month string is last month
 */
function isLastMonth(monthStr) {
  const date = new Date(monthStr + '-01')
  const now = new Date()
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  return date.getFullYear() === lastMonth.getFullYear() &&
         date.getMonth() === lastMonth.getMonth()
}

/**
 * Get causal insight for Vision display
 */
export function getCausalInsightForVision(movimientos) {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  const thisMonthGastos = movimientos.filter(m =>
    m.tipo === 'gasto' && new Date(m.fecha) >= thisMonth
  )
  const lastMonthGastos = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return m.tipo === 'gasto' && fecha >= lastMonth && fecha <= lastMonthEnd
  })

  const explanation = explainTotalVariation(thisMonthGastos, lastMonthGastos)
  if (!explanation) return null

  return {
    id: 'causal_monthly',
    type: 'causal',
    icon: explanation.totalDiff > 0 ? 'TrendingUp' : 'TrendingDown',
    color: explanation.totalDiff > 0 ? 'amber' : 'emerald',
    title: explanation.message,
    detail: `≈${explanation.pricePercent}% inflación, ≈${explanation.behaviorPercent}% comportamiento`,
    breakdown: explanation.categoryBreakdown,
    action: {
      label: 'Ver detalle',
      type: 'navigate',
      href: '/money/insights'
    }
  }
}

/**
 * Format money
 */
function formatMoney(amount) {
  return `$${formatNumber(Math.round(amount))}`
}

/**
 * Format number
 */
function formatNumber(num) {
  return num.toLocaleString('es-AR')
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
