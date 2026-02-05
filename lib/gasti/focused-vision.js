/**
 * Focused Vision - Condensed view for Resumen
 *
 * Shows exactly:
 * - 1 key economic insight
 * - 1 causal explanation of the month
 * - 1 actionable recommendation
 *
 * Total read time: < 10 seconds
 */

import { generateSimpleInsights } from './simple-insights'
import { getCausalInsightForVision, explainTotalVariation } from './causal-explanations'
import { getTopCumulativeInsight } from './cumulative-awareness'
import { isInsightDismissed } from './actionable-ctas'

/**
 * Get condensed vision data
 * Returns exactly 3 items max, prioritized
 */
export function getFocusedVisionData(movimientos, budgets = []) {
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

  const result = {
    economicInsight: null,
    causalExplanation: null,
    recommendation: null,
    isEmpty: false
  }

  // Not enough data
  if (thisMonthGastos.length < 3) {
    result.isEmpty = true
    return result
  }

  // 1. Get key economic insight (highest impact)
  result.economicInsight = getKeyEconomicInsight(thisMonthGastos, lastMonthGastos, budgets)

  // 2. Get causal explanation
  result.causalExplanation = getCausalExplanation(thisMonthGastos, lastMonthGastos)

  // 3. Get actionable recommendation
  result.recommendation = getActionableRecommendation(movimientos, thisMonthGastos, budgets)

  return result
}

/**
 * Get single most important economic insight
 */
function getKeyEconomicInsight(thisMonth, lastMonth, budgets) {
  const thisTotal = thisMonth.reduce((s, m) => s + m.monto, 0)
  const lastTotal = lastMonth.reduce((s, m) => s + m.monto, 0)

  // Priority 1: Budget exceeded
  if (budgets && budgets.length > 0) {
    for (const budget of budgets) {
      let spent = 0
      if (budget.type === 'category') {
        spent = thisMonth
          .filter(g => g.category_id === budget.category || g.categoria === budget.target_id)
          .reduce((s, g) => s + g.monto, 0)
      } else if (budget.type === 'wallet') {
        spent = thisMonth
          .filter(g => g.metodo === budget.target_id)
          .reduce((s, g) => s + g.monto, 0)
      }

      const percent = (spent / budget.limit) * 100
      if (percent >= 100) {
        const id = `budget_exceeded_${budget.name || budget.target_id}`
        if (isInsightDismissed(id)) continue

        return {
          id,
          type: 'economic',
          icon: 'AlertTriangle',
          color: 'red',
          title: `Presupuesto "${budget.name}" superado`,
          value: `${Math.round(percent)}%`,
          detail: `$${formatNumber(spent)} de $${formatNumber(budget.limit)}`,
          action: {
            label: 'Ajustar',
            type: 'navigate',
            href: '/money/presupuestos'
          }
        }
      }
    }
  }

  // Priority 2: Significant month-over-month change
  if (lastTotal > 0) {
    const diff = thisTotal - lastTotal
    const diffPercent = Math.round((diff / lastTotal) * 100)

    if (Math.abs(diff) >= 10000 && Math.abs(diffPercent) >= 20) {
      const id = diff > 0 ? 'month_spending_up' : 'month_spending_down'
      if (!isInsightDismissed(id)) {
        return {
          id,
          type: 'economic',
          icon: diff > 0 ? 'TrendingUp' : 'TrendingDown',
          color: diff > 0 ? 'amber' : 'emerald',
          title: diff > 0
            ? `+${diffPercent}% vs mes pasado`
            : `${diffPercent}% vs mes pasado`,
          value: `$${formatNumber(Math.abs(diff))}`,
          detail: diff > 0 ? 'Estás gastando más este mes' : 'Buen ritmo de ahorro',
          action: diff > 0 ? {
            label: 'Ver qué cambió',
            type: 'navigate',
            href: '/money/insights'
          } : null
        }
      }
    }
  }

  // Priority 3: High daily average
  const daysElapsed = new Date().getDate()
  const dailyAvg = thisTotal / daysElapsed
  const projectedMonth = dailyAvg * 30

  if (projectedMonth >= lastTotal * 1.3 && lastTotal > 0) {
    const id = 'high_daily_projection'
    if (!isInsightDismissed(id)) {
      return {
        id,
        type: 'economic',
        icon: 'TrendingUp',
        color: 'amber',
        title: `Proyección: $${formatNumber(Math.round(projectedMonth))}`,
        value: `$${formatNumber(Math.round(dailyAvg))}/día`,
        detail: `${Math.round((projectedMonth / lastTotal - 1) * 100)}% más que el mes pasado si seguís así`,
        action: {
          label: 'Ver detalle',
          type: 'navigate',
          href: '/money/resumen'
        }
      }
    }
  }

  return null
}

/**
 * Get causal explanation of monthly changes
 */
function getCausalExplanation(thisMonth, lastMonth) {
  const explanation = explainTotalVariation(thisMonth, lastMonth)
  if (!explanation) return null

  const id = 'causal_monthly'
  if (isInsightDismissed(id)) return null

  // Only show if there's meaningful variation
  if (Math.abs(explanation.totalDiff) < 5000) return null

  const mainFactor = explanation.pricePercent >= 60 ? 'precios' :
                    explanation.behaviorPercent >= 60 ? 'comportamiento' : 'mixto'

  let insight
  if (mainFactor === 'precios') {
    insight = `La mayoría del cambio es por inflación (~${explanation.pricePercent}%)`
  } else if (mainFactor === 'comportamiento') {
    insight = explanation.totalDiff > 0
      ? `Compraste más seguido este mes (~${explanation.behaviorPercent}% del cambio)`
      : `Redujiste frecuencia de compras (~${explanation.behaviorPercent}% del cambio)`
  } else {
    insight = `≈${explanation.pricePercent}% inflación, ≈${explanation.behaviorPercent}% comportamiento`
  }

  return {
    id,
    type: 'causal',
    icon: 'Lightbulb',
    color: 'blue',
    title: explanation.totalDiff > 0 ? 'Por qué gastaste más' : 'Por qué gastaste menos',
    value: null,
    detail: insight,
    breakdown: explanation.categoryBreakdown,
    action: {
      label: 'Ver por categoría',
      type: 'navigate',
      href: '/money/insights'
    }
  }
}

/**
 * Get single actionable recommendation
 */
function getActionableRecommendation(movimientos, thisMonth, budgets) {
  // Priority 1: Cumulative small expense
  const cumulative = getTopCumulativeInsight(movimientos)
  if (cumulative && !isInsightDismissed(cumulative.id)) {
    return {
      id: cumulative.id,
      type: 'recommendation',
      icon: 'Target',
      color: 'indigo',
      title: 'Oportunidad de ahorro',
      value: `$${formatNumber(cumulative.totalMonth || cumulative.priority)}/mes`,
      detail: cumulative.message,
      action: cumulative.action || {
        label: 'Ver detalle',
        type: 'navigate',
        href: '/money/insights'
      }
    }
  }

  // Priority 2: Budget at risk (80-99%)
  if (budgets && budgets.length > 0) {
    for (const budget of budgets) {
      let spent = 0
      if (budget.type === 'category') {
        spent = thisMonth
          .filter(g => g.category_id === budget.category || g.categoria === budget.target_id)
          .reduce((s, g) => s + g.monto, 0)
      } else if (budget.type === 'wallet') {
        spent = thisMonth
          .filter(g => g.metodo === budget.target_id)
          .reduce((s, g) => s + g.monto, 0)
      }

      const percent = (spent / budget.limit) * 100
      if (percent >= 80 && percent < 100) {
        const id = `budget_warning_${budget.name || budget.target_id}`
        if (isInsightDismissed(id)) continue

        const remaining = budget.limit - spent
        return {
          id,
          type: 'recommendation',
          icon: 'Target',
          color: 'amber',
          title: `Cuidado con "${budget.name}"`,
          value: `$${formatNumber(Math.round(remaining))} restante`,
          detail: `Usaste ${Math.round(percent)}% del presupuesto`,
          action: {
            label: 'Ver gastos',
            type: 'navigate',
            href: '/money/movimientos'
          }
        }
      }
    }
  }

  // Priority 3: Top repeated expense (suggest habitual)
  const repeated = findTopRepeated(thisMonth)
  if (repeated && !isInsightDismissed(`repeated_${repeated.motivo}`)) {
    return {
      id: `repeated_${repeated.motivo}`,
      type: 'recommendation',
      icon: 'Repeat',
      color: 'blue',
      title: `"${capitalizeFirst(repeated.motivo)}" se repite`,
      value: `${repeated.count}x = $${formatNumber(repeated.total)}`,
      detail: '¿Lo marcamos como gasto habitual?',
      action: {
        label: 'Marcar habitual',
        type: 'mark_habitual',
        data: { motivo: repeated.motivo }
      }
    }
  }

  return null
}

/**
 * Find most repeated expense
 */
function findTopRepeated(gastos) {
  const byMotivo = {}

  gastos.forEach(g => {
    const key = (g.motivo || '').toLowerCase()
    if (!key) return

    if (!byMotivo[key]) {
      byMotivo[key] = { motivo: g.motivo, count: 0, total: 0 }
    }
    byMotivo[key].count++
    byMotivo[key].total += g.monto
  })

  let top = null
  for (const data of Object.values(byMotivo)) {
    if (data.count >= 4 && (!top || data.count > top.count)) {
      top = data
    }
  }

  return top
}

/**
 * Get Vision data as single condensed message for Chat
 */
export function getVisionSummaryForChat(movimientos, budgets = []) {
  const data = getFocusedVisionData(movimientos, budgets)

  if (data.isEmpty) {
    return null
  }

  // Priority: economic > recommendation > causal
  const primary = data.economicInsight || data.recommendation || data.causalExplanation

  if (!primary) return null

  return {
    id: primary.id,
    type: 'vision_summary',
    title: primary.title,
    detail: primary.detail,
    action: primary.action ? {
      label: primary.action.label,
      type: primary.action.type,
      href: primary.action.href
    } : null
  }
}

/**
 * Format number
 */
function formatNumber(num) {
  return Math.round(num).toLocaleString('es-AR')
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
