/**
 * Simple Insights - Quick, readable expense insights
 *
 * Goals:
 * - < 5 second read time
 * - Actionable CTA with each insight
 * - Max 3 visible at a time
 * - Prioritize by $ impact
 */

import { CATEGORY_DEFINITIONS, getCategoryColors } from './human-categories'

/**
 * Generate simple insights from expenses
 * @param {Array} movimientos - All movements
 * @param {Array} budgets - User budgets
 * @returns {Array} - Sorted insights (max 3)
 */
export function generateSimpleInsights(movimientos, budgets = []) {
  const insights = []
  const now = new Date()

  // Current and previous month
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

  const thisMonthTotal = thisMonthGastos.reduce((s, m) => s + m.monto, 0)
  const lastMonthTotal = lastMonthGastos.reduce((s, m) => s + m.monto, 0)

  // 1. Month vs month comparison
  if (lastMonthTotal > 0) {
    const diff = thisMonthTotal - lastMonthTotal
    const diffPercent = Math.round((diff / lastMonthTotal) * 100)

    if (Math.abs(diff) >= 5000) {
      insights.push({
        id: 'month_comparison',
        type: 'comparison',
        priority: Math.abs(diff),
        icon: diff > 0 ? 'TrendingUp' : 'TrendingDown',
        color: diff > 0 ? 'amber' : 'emerald',
        title: diff > 0
          ? `Gastaste ${formatPercent(diffPercent)} más este mes`
          : `Gastaste ${formatPercent(Math.abs(diffPercent))} menos este mes`,
        value: formatMoney(Math.abs(diff)),
        detail: diff > 0
          ? `$${formatNumber(thisMonthTotal)} vs $${formatNumber(lastMonthTotal)} el mes pasado`
          : `Ahorraste $${formatNumber(Math.abs(diff))} comparado con el mes pasado`,
        action: diff > 0 ? {
          label: 'Ver detalle',
          type: 'navigate',
          href: '/money/insights'
        } : null
      })
    }
  }

  // 2. Repeated expense detection
  const repeatedInsight = findRepeatedExpenses(thisMonthGastos)
  if (repeatedInsight) {
    insights.push(repeatedInsight)
  }

  // 3. Category anomaly
  const categoryAnomaly = findCategoryAnomaly(thisMonthGastos, lastMonthGastos)
  if (categoryAnomaly) {
    insights.push(categoryAnomaly)
  }

  // 4. Budget status
  const budgetInsight = getBudgetInsight(thisMonthGastos, budgets)
  if (budgetInsight) {
    insights.push(budgetInsight)
  }

  // 5. Top category this month
  const topCategoryInsight = getTopCategoryInsight(thisMonthGastos)
  if (topCategoryInsight) {
    insights.push(topCategoryInsight)
  }

  // Sort by priority (impact) and limit to 3
  return insights
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
}

/**
 * Find repeated expenses
 */
function findRepeatedExpenses(gastos) {
  const byMotivo = new Map()

  gastos.forEach(g => {
    const key = (g.motivo || '').toLowerCase()
    if (!key) return

    if (!byMotivo.has(key)) {
      byMotivo.set(key, { count: 0, total: 0, motivo: g.motivo })
    }
    byMotivo.get(key).count++
    byMotivo.get(key).total += g.monto
  })

  // Find most repeated
  let topRepeated = null
  for (const [, data] of byMotivo.entries()) {
    if (data.count >= 3 && (!topRepeated || data.count > topRepeated.count)) {
      topRepeated = data
    }
  }

  if (!topRepeated) return null

  return {
    id: 'repeated_expense',
    type: 'pattern',
    priority: topRepeated.total,
    icon: 'Repeat',
    color: 'blue',
    title: `"${capitalizeFirst(topRepeated.motivo)}" se repitió ${topRepeated.count} veces`,
    value: formatMoney(topRepeated.total),
    detail: 'Total acumulado este mes',
    action: {
      label: 'Crear regla',
      type: 'create_rule',
      data: { motivo: topRepeated.motivo }
    }
  }
}

/**
 * Find category with unusual spending
 */
function findCategoryAnomaly(thisMonth, lastMonth) {
  const thisMonthByCategory = groupByCategory(thisMonth)
  const lastMonthByCategory = groupByCategory(lastMonth)

  let biggestAnomaly = null
  let biggestDiff = 0

  for (const [cat, thisTotal] of Object.entries(thisMonthByCategory)) {
    const lastTotal = lastMonthByCategory[cat] || 0
    const diff = thisTotal - lastTotal

    if (diff > 5000 && diff > biggestDiff) {
      biggestDiff = diff
      biggestAnomaly = {
        category: cat,
        thisMonth: thisTotal,
        lastMonth: lastTotal,
        diff
      }
    }
  }

  if (!biggestAnomaly) return null

  const catDef = CATEGORY_DEFINITIONS[biggestAnomaly.category]
  const catName = catDef?.name || biggestAnomaly.category

  return {
    id: `category_anomaly_${biggestAnomaly.category}`,
    type: 'anomaly',
    priority: biggestAnomaly.diff,
    icon: 'AlertCircle',
    color: 'amber',
    title: `${catName} está fuera de tu patrón`,
    value: `+${formatMoney(biggestAnomaly.diff)}`,
    detail: `$${formatNumber(biggestAnomaly.thisMonth)} vs $${formatNumber(biggestAnomaly.lastMonth)} el mes pasado`,
    action: {
      label: 'Ajustar presupuesto',
      type: 'navigate',
      href: '/money/presupuestos'
    }
  }
}

/**
 * Get budget status insight
 */
function getBudgetInsight(gastos, budgets) {
  if (!budgets || budgets.length === 0) return null

  let worstBudget = null
  let worstPercent = 0

  for (const budget of budgets) {
    let spent = 0

    if (budget.type === 'category') {
      spent = gastos
        .filter(g => g.category_id === budget.category)
        .reduce((s, g) => s + g.monto, 0)
    } else if (budget.type === 'wallet') {
      spent = gastos
        .filter(g => g.metodo === budget.wallet)
        .reduce((s, g) => s + g.monto, 0)
    }

    const percent = (spent / budget.amount) * 100

    if (percent >= 80 && percent > worstPercent) {
      worstPercent = percent
      worstBudget = { ...budget, spent, percent }
    }
  }

  if (!worstBudget) return null

  const isOver = worstBudget.percent >= 100

  return {
    id: `budget_${worstBudget.category || worstBudget.wallet}`,
    type: 'budget',
    priority: worstBudget.spent,
    icon: isOver ? 'AlertTriangle' : 'Target',
    color: isOver ? 'red' : 'amber',
    title: isOver
      ? `Presupuesto de ${worstBudget.name || worstBudget.category} superado`
      : `${Math.round(worstBudget.percent)}% del presupuesto usado`,
    value: formatMoney(worstBudget.spent),
    detail: `Límite: $${formatNumber(worstBudget.amount)}`,
    action: {
      label: 'Ajustar límite',
      type: 'navigate',
      href: '/money/presupuestos'
    }
  }
}

/**
 * Get top category insight
 */
function getTopCategoryInsight(gastos) {
  if (gastos.length < 5) return null

  const byCategory = groupByCategory(gastos)
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])

  if (sorted.length === 0) return null

  const [topCat, topAmount] = sorted[0]
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0)
  const percent = Math.round((topAmount / total) * 100)

  if (percent < 30) return null // Not dominant enough

  const catDef = CATEGORY_DEFINITIONS[topCat]
  const catName = catDef?.name || topCat

  return {
    id: `top_category_${topCat}`,
    type: 'category',
    priority: topAmount,
    icon: catDef?.icon || 'PieChart',
    color: catDef?.color || 'zinc',
    title: `${catName} es tu mayor gasto`,
    value: `${percent}%`,
    detail: `$${formatNumber(topAmount)} de $${formatNumber(total)}`,
    action: {
      label: 'Ver movimientos',
      type: 'navigate',
      href: `/money/movimientos?category=${topCat}`
    }
  }
}

/**
 * Group gastos by category
 */
function groupByCategory(gastos) {
  const result = {}

  gastos.forEach(g => {
    const cat = g.category_id || 'otros'
    result[cat] = (result[cat] || 0) + g.monto
  })

  return result
}

/**
 * Format money for display
 */
function formatMoney(amount) {
  return `$${formatNumber(Math.round(amount))}`
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
  return num.toLocaleString('es-AR')
}

/**
 * Format percent
 */
function formatPercent(num) {
  return `${Math.abs(num)}%`
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Get insight action icon
 */
export function getInsightIcon(iconName) {
  const icons = {
    'TrendingUp': 'TrendingUp',
    'TrendingDown': 'TrendingDown',
    'Repeat': 'Repeat',
    'AlertCircle': 'AlertCircle',
    'AlertTriangle': 'AlertTriangle',
    'Target': 'Target',
    'PieChart': 'PieChart'
  }
  return icons[iconName] || 'Info'
}

/**
 * Get insight color classes
 */
export function getInsightColors(color) {
  const colors = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-500'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-500'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-950/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      icon: 'text-red-500'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-500'
    },
    zinc: {
      bg: 'bg-zinc-50 dark:bg-zinc-800/50',
      border: 'border-zinc-200 dark:border-zinc-700',
      text: 'text-zinc-700 dark:text-zinc-300',
      icon: 'text-zinc-500'
    }
  }
  return colors[color] || colors.zinc
}
