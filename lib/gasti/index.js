/**
 * Gasti - Friction-reduced expense tracking
 *
 * Inspired by Gasti.pro
 * Goals:
 * - 1 step registration
 * - Human-readable categories
 * - Simple insights with action
 * - Causal explanations
 * - No noise, no decoration
 */

// Re-export all modules
export * from './quick-add'
export * from './human-categories'
export * from './simple-insights'
export * from './causal-explanations'
export * from './actionable-ctas'

import {
  getAutocompleteSuggestions,
  parseQuickInput,
  detectPattern,
  getRecentShortcuts,
  saveToQuickAddHistory
} from './quick-add'

import {
  CATEGORY_DEFINITIONS,
  getHumanCategories,
  matchToCategory,
  enrichWithSemantics,
  getCategoryColors
} from './human-categories'

import {
  generateSimpleInsights,
  getInsightColors
} from './simple-insights'

import {
  explainTotalVariation,
  getCausalInsightForVision
} from './causal-explanations'

import {
  generateCTA,
  executeCTA,
  filterDismissed,
  isInsightDismissed,
  dismissCTA,
  getCTAStyles
} from './actionable-ctas'

/**
 * Complete gasto flow: parse, enrich, detect patterns
 * @param {string} input - Quick input text
 * @param {Array} movimientos - Historical movements
 * @param {Array} wallets - Available wallets
 */
export function processQuickGasto(input, movimientos = [], wallets = []) {
  // Get autocomplete suggestions
  const suggestions = getAutocompleteSuggestions(input, movimientos, wallets)

  // Parse input
  const parsed = parseQuickInput(input, suggestions)
  if (!parsed) return null

  // Enrich with semantics
  const enriched = enrichWithSemantics(parsed)

  // Detect pattern
  const pattern = detectPattern(enriched, movimientos)

  return {
    gasto: enriched,
    suggestions,
    pattern,
    isComplete: enriched.monto > 0 && enriched.motivo,
    needsConfirmation: false // No confirmations
  }
}

/**
 * Get all insights for Vision page
 * Returns max 3, sorted by priority
 */
export function getInsightsForVision(movimientos, budgets = []) {
  const insights = []

  // 1. Simple insights (spending patterns)
  const simpleInsights = generateSimpleInsights(movimientos, budgets)
  insights.push(...simpleInsights)

  // 2. Causal explanation (1 max)
  const causalInsight = getCausalInsightForVision(movimientos)
  if (causalInsight) {
    insights.push(causalInsight)
  }

  // Filter dismissed
  const filtered = filterDismissed(insights)

  // Sort by priority and limit to 3
  return filtered
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map(insight => ({
      ...insight,
      cta: generateCTA(insight),
      colors: getInsightColors(insight.color)
    }))
}

/**
 * Get spending awareness for Money page
 * Shows frequency and repetition patterns
 */
export function getSpendingAwareness(movimientos) {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recentGastos = movimientos.filter(m =>
    m.tipo === 'gasto' && new Date(m.fecha) >= thirtyDaysAgo
  )

  // Count by day of week
  const byDayOfWeek = [0, 0, 0, 0, 0, 0, 0]
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

  recentGastos.forEach(g => {
    const day = new Date(g.fecha).getDay()
    byDayOfWeek[day]++
  })

  const peakDay = byDayOfWeek.indexOf(Math.max(...byDayOfWeek))
  const avgPerDay = recentGastos.length / 30

  // Repeated expenses
  const repeated = getRecentShortcuts(movimientos, 5)

  // Calculate daily average
  const totalSpent = recentGastos.reduce((s, g) => s + g.monto, 0)
  const dailyAvg = Math.round(totalSpent / 30)

  return {
    recentCount: recentGastos.length,
    avgPerDay: Math.round(avgPerDay * 10) / 10,
    peakDayName: dayNames[peakDay],
    peakDayCount: byDayOfWeek[peakDay],
    repeatedExpenses: repeated,
    dailyAvg,
    byDayOfWeek: byDayOfWeek.map((count, i) => ({
      day: dayNames[i],
      count,
      isMax: i === peakDay
    }))
  }
}

/**
 * Get chat context suggestion
 * Returns 1 actionable suggestion max
 */
export function getChatContextSuggestion(movimientos, budgets = []) {
  const insights = getInsightsForVision(movimientos, budgets)

  if (insights.length === 0) return null

  // Return highest priority insight
  const top = insights[0]

  return {
    id: top.id,
    type: 'expense_insight',
    message: top.title,
    detail: top.detail,
    cta: top.cta
  }
}

/**
 * Record gasto and run post-processing
 */
export async function recordAndProcess(gasto, movimientos = []) {
  // Save to quick add history
  saveToQuickAddHistory(gasto)

  // Detect patterns for future suggestions
  const pattern = detectPattern(gasto, movimientos)

  return {
    gasto,
    pattern,
    suggestion: pattern?.suggestRule
      ? {
          type: 'create_rule',
          message: 'Este gasto se repite seguido. ¿Crear una regla?'
        }
      : null
  }
}

/**
 * Get month comparison data for simple visualization
 */
export function getMonthComparisonData(movimientos) {
  const now = new Date()
  const months = []

  for (let i = 0; i < 3; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

    const gastos = movimientos.filter(m => {
      const fecha = new Date(m.fecha)
      return m.tipo === 'gasto' && fecha >= monthStart && fecha <= monthEnd
    })

    const total = gastos.reduce((s, g) => s + g.monto, 0)

    months.unshift({
      month: monthStart.toLocaleDateString('es-AR', { month: 'short' }),
      total,
      count: gastos.length
    })
  }

  const max = Math.max(...months.map(m => m.total))

  return months.map(m => ({
    ...m,
    percentage: max > 0 ? Math.round((m.total / max) * 100) : 0
  }))
}

/**
 * Get top categories data for simple visualization
 */
export function getTopCategoriesData(movimientos, limit = 5) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const thisMonth = movimientos.filter(m =>
    m.tipo === 'gasto' && new Date(m.fecha) >= monthStart
  )

  // Group by category
  const byCategory = {}
  thisMonth.forEach(g => {
    const cat = g.category_id || 'otros'
    byCategory[cat] = (byCategory[cat] || 0) + g.monto
  })

  // Sort and limit
  const sorted = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)

  const total = Object.values(byCategory).reduce((s, v) => s + v, 0)
  const max = sorted[0]?.[1] || 0

  return sorted.map(([catId, amount]) => {
    const catDef = CATEGORY_DEFINITIONS[catId]

    return {
      id: catId,
      name: catDef?.name || catId,
      icon: catDef?.icon || 'MoreHorizontal',
      color: catDef?.color || 'zinc',
      amount,
      percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      barWidth: max > 0 ? Math.round((amount / max) * 100) : 0
    }
  })
}
