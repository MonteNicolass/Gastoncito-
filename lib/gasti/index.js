/**
 * Gasti - Intelligent Personal Finance Assistant
 *
 * Inspired by Gasti.pro
 * Goals:
 * - 1 step registration
 * - Human-readable categories
 * - Simple insights with action
 * - Causal explanations
 * - Cumulative awareness
 * - Habitual expense detection
 * - No noise, no decoration
 */

// Re-export all modules
export * from './quick-add'
export * from './human-categories'
export * from './simple-insights'
export * from './causal-explanations'
export * from './actionable-ctas'
export * from './cumulative-awareness'
export * from './focused-vision'
export * from './habitual-expenses'

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

import {
  analyzeCumulativeImpact,
  getTopCumulativeInsight,
  getCumulativeInsightForChat,
  checkCumulativeAlert
} from './cumulative-awareness'

import {
  getFocusedVisionData,
  getVisionSummaryForChat
} from './focused-vision'

import {
  getHabitualExpenses,
  markAsHabitual,
  matchesHabitual,
  shouldSuggestHabitual,
  dismissHabitualSuggestion,
  getHabitualShortcuts,
  updateHabitualStats,
  getHabitualsProjection
} from './habitual-expenses'

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

  // Check if matches habitual
  const habitual = matchesHabitual(enriched.motivo)

  // Check if should suggest habitual
  const habitualSuggestion = !habitual ? shouldSuggestHabitual(enriched, movimientos) : null

  return {
    gasto: enriched,
    suggestions,
    pattern,
    habitual,
    habitualSuggestion,
    isComplete: enriched.monto > 0 && enriched.motivo,
    needsConfirmation: false // No confirmations
  }
}

/**
 * Get all insights for Vision page
 * Returns max 3, sorted by priority
 * Structure: 1 economic + 1 causal + 1 recommendation
 */
export function getInsightsForVision(movimientos, budgets = []) {
  // Use focused vision for condensed view
  const focused = getFocusedVisionData(movimientos, budgets)

  const insights = []

  // 1. Key economic insight
  if (focused.economicInsight) {
    insights.push({
      ...focused.economicInsight,
      priority: 100,
      cta: focused.economicInsight.action ? {
        label: focused.economicInsight.action.label,
        action: focused.economicInsight.action
      } : null,
      colors: getInsightColors(focused.economicInsight.color)
    })
  }

  // 2. Causal explanation
  if (focused.causalExplanation) {
    insights.push({
      ...focused.causalExplanation,
      priority: 90,
      cta: focused.causalExplanation.action ? {
        label: focused.causalExplanation.action.label,
        action: focused.causalExplanation.action
      } : null,
      colors: getInsightColors(focused.causalExplanation.color)
    })
  }

  // 3. Actionable recommendation
  if (focused.recommendation) {
    insights.push({
      ...focused.recommendation,
      priority: 80,
      cta: focused.recommendation.action ? {
        label: focused.recommendation.action.label,
        action: focused.recommendation.action
      } : null,
      colors: getInsightColors(focused.recommendation.color)
    })
  }

  // Fallback to simple insights if focused view is empty
  if (insights.length === 0) {
    const simpleInsights = generateSimpleInsights(movimientos, budgets)
    const causalInsight = getCausalInsightForVision(movimientos)

    if (causalInsight) simpleInsights.push(causalInsight)

    const filtered = filterDismissed(simpleInsights)
    return filtered
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map(insight => ({
        ...insight,
        cta: generateCTA(insight),
        colors: getInsightColors(insight.color)
      }))
  }

  return insights
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
 * "Hay una forma simple de reducir este gasto este mes."
 */
export function getChatContextSuggestion(movimientos, budgets = []) {
  // Priority 1: Cumulative awareness (small expenses adding up)
  const cumulative = getCumulativeInsightForChat(movimientos)
  if (cumulative) {
    return {
      id: cumulative.id,
      type: 'cumulative_awareness',
      message: cumulative.message,
      detail: cumulative.detail,
      cta: cumulative.suggestedAction ? {
        label: cumulative.suggestedAction.label,
        action: { type: cumulative.suggestedAction.type }
      } : null
    }
  }

  // Priority 2: Vision summary (economic/causal/recommendation)
  const visionSummary = getVisionSummaryForChat(movimientos, budgets)
  if (visionSummary) {
    return {
      id: visionSummary.id,
      type: 'vision_summary',
      message: visionSummary.title,
      detail: visionSummary.detail,
      cta: visionSummary.action ? {
        label: visionSummary.action.label,
        action: visionSummary.action
      } : null
    }
  }

  // Priority 3: Simple insights fallback
  const insights = getInsightsForVision(movimientos, budgets)
  if (insights.length === 0) return null

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
 * Returns alerts, suggestions, and pattern info
 */
export async function recordAndProcess(gasto, movimientos = []) {
  // Save to quick add history
  saveToQuickAddHistory(gasto)

  // Detect patterns for future suggestions
  const pattern = detectPattern(gasto, movimientos)

  // Check cumulative impact alert
  const cumulativeAlert = checkCumulativeAlert(gasto, movimientos)

  // Update habitual stats if applicable
  const habitualUpdate = updateHabitualStats(gasto)

  // Check if should suggest marking as habitual
  const habitualSuggestion = !habitualUpdate ? shouldSuggestHabitual(gasto, movimientos) : null

  return {
    gasto,
    pattern,
    cumulativeAlert,
    habitualUpdate,
    habitualSuggestion,
    suggestion: getPostProcessSuggestion(pattern, cumulativeAlert, habitualSuggestion)
  }
}

/**
 * Get single suggestion from post-process results
 */
function getPostProcessSuggestion(pattern, cumulativeAlert, habitualSuggestion) {
  // Priority 1: Cumulative alert (highest impact)
  if (cumulativeAlert && cumulativeAlert.severity === 'high') {
    return {
      type: 'cumulative_warning',
      message: cumulativeAlert.message,
      severity: cumulativeAlert.severity
    }
  }

  // Priority 2: Habitual suggestion
  if (habitualSuggestion) {
    return {
      type: 'mark_habitual',
      message: habitualSuggestion.question,
      detail: habitualSuggestion.impact,
      data: { motivo: habitualSuggestion.motivo }
    }
  }

  // Priority 3: Pattern rule suggestion
  if (pattern?.suggestRule) {
    return {
      type: 'create_rule',
      message: 'Este gasto se repite seguido. ¿Crear una regla?'
    }
  }

  // Priority 4: Medium cumulative alert
  if (cumulativeAlert) {
    return {
      type: 'cumulative_info',
      message: cumulativeAlert.message,
      severity: cumulativeAlert.severity
    }
  }

  return null
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
