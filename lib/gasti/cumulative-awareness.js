/**
 * Cumulative Awareness - Impact of small repeated expenses
 *
 * "Este gasto parece chico, pero repetido X veces impacta $Y"
 * "En conjunto con otros gastos similares, suman $Z"
 *
 * Prioriza impacto mensual, no evento aislado
 */

/**
 * Analyze cumulative impact of small repeated expenses
 * @param {Array} movimientos - All movements
 * @param {number} smallThreshold - What counts as "small" (default: 2000 ARS)
 */
export function analyzeCumulativeImpact(movimientos, smallThreshold = 2000) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const thisMonthGastos = movimientos.filter(m =>
    m.tipo === 'gasto' && new Date(m.fecha) >= monthStart
  )

  const insights = []

  // 1. Find small expenses that add up
  const smallExpenses = thisMonthGastos.filter(g => g.monto <= smallThreshold)
  const smallByMotivo = groupByMotivo(smallExpenses)

  for (const [motivo, data] of Object.entries(smallByMotivo)) {
    if (data.count >= 3 && data.total >= 3000) {
      const avgEach = Math.round(data.total / data.count)
      const projectedMonthly = Math.round(data.total * (30 / now.getDate()))

      insights.push({
        id: `cumulative_small_${motivo.slice(0, 20)}`,
        type: 'cumulative_small',
        priority: data.total,
        motivo: data.originalMotivo,
        count: data.count,
        avgAmount: avgEach,
        totalMonth: data.total,
        projectedMonth: projectedMonthly,
        message: `"${capitalizeFirst(data.originalMotivo)}" parece chico ($${formatNumber(avgEach)}) pero ${data.count}x ya sumó $${formatNumber(data.total)}`,
        detail: `Proyección mensual: ~$${formatNumber(projectedMonthly)}`,
        action: {
          label: 'Marcar habitual',
          type: 'mark_habitual',
          data: { motivo: data.originalMotivo }
        }
      })
    }
  }

  // 2. Find grouped categories that together are significant
  const categoryGroups = analyzeRelatedCategories(thisMonthGastos)
  insights.push(...categoryGroups)

  // 3. Detect "invisible" daily expenses
  const dailyInvisibles = detectInvisibleDailyExpenses(thisMonthGastos, now.getDate())
  insights.push(...dailyInvisibles)

  // Sort by total impact
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 3)
}

/**
 * Detect expenses that seem small daily but add up
 * Target: coffee, snacks, transit, etc
 */
function detectInvisibleDailyExpenses(gastos, daysElapsed) {
  const insights = []
  const dailyCategories = ['comida', 'transporte', 'otros']

  const byCategory = {}
  gastos.forEach(g => {
    const cat = g.category_id || 'otros'
    if (!byCategory[cat]) byCategory[cat] = { count: 0, total: 0 }
    byCategory[cat].count++
    byCategory[cat].total += g.monto
  })

  for (const cat of dailyCategories) {
    const data = byCategory[cat]
    if (!data) continue

    const dailyAvg = data.total / daysElapsed
    const frequency = data.count / daysElapsed

    // High frequency + individually small = invisible drain
    if (frequency >= 0.5 && dailyAvg <= 3000 && data.total >= 10000) {
      insights.push({
        id: `invisible_daily_${cat}`,
        type: 'invisible_drain',
        priority: data.total,
        category: cat,
        dailyAvg: Math.round(dailyAvg),
        monthlyTotal: data.total,
        frequency: Math.round(frequency * 10) / 10,
        message: `Gastos diarios en ${getCategoryLabel(cat)}: ~$${formatNumber(Math.round(dailyAvg))}/día`,
        detail: `${data.count} gastos este mes = $${formatNumber(data.total)}`,
        action: {
          label: 'Ver detalle',
          type: 'navigate',
          href: `/money/movimientos?category=${cat}`
        }
      })
    }
  }

  return insights
}

/**
 * Analyze if related categories together are problematic
 */
function analyzeRelatedCategories(gastos) {
  const insights = []

  // Define category groups
  const groups = [
    { name: 'Delivery + Comida afuera', categories: ['delivery', 'comida'], threshold: 30000 },
    { name: 'Entretenimiento total', categories: ['ocio', 'streaming', 'salidas'], threshold: 25000 },
    { name: 'Transporte completo', categories: ['transporte', 'nafta', 'uber'], threshold: 40000 }
  ]

  const byCategory = {}
  gastos.forEach(g => {
    const cat = (g.category_id || 'otros').toLowerCase()
    const motivo = (g.motivo || '').toLowerCase()

    // Also check motivo for sub-categorization
    let effectiveCat = cat
    if (motivo.includes('delivery') || motivo.includes('pedido') || motivo.includes('rappi')) {
      effectiveCat = 'delivery'
    } else if (motivo.includes('uber') || motivo.includes('cabify') || motivo.includes('taxi')) {
      effectiveCat = 'uber'
    } else if (motivo.includes('nafta') || motivo.includes('ypf') || motivo.includes('shell')) {
      effectiveCat = 'nafta'
    }

    if (!byCategory[effectiveCat]) byCategory[effectiveCat] = 0
    byCategory[effectiveCat] += g.monto
  })

  for (const group of groups) {
    const groupTotal = group.categories.reduce((sum, cat) => sum + (byCategory[cat] || 0), 0)

    if (groupTotal >= group.threshold) {
      insights.push({
        id: `group_${group.name.slice(0, 15)}`,
        type: 'category_group',
        priority: groupTotal,
        groupName: group.name,
        categories: group.categories,
        total: groupTotal,
        message: `${group.name}: $${formatNumber(groupTotal)} este mes`,
        detail: 'En conjunto suman más de lo que parece',
        action: {
          label: 'Ver desglose',
          type: 'navigate',
          href: '/money/insights'
        }
      })
    }
  }

  return insights
}

/**
 * Get single most impactful cumulative insight for Vision
 */
export function getTopCumulativeInsight(movimientos) {
  const insights = analyzeCumulativeImpact(movimientos)
  if (insights.length === 0) return null

  return insights[0]
}

/**
 * Get cumulative insight for Chat context
 * Single, actionable message
 */
export function getCumulativeInsightForChat(movimientos) {
  const top = getTopCumulativeInsight(movimientos)
  if (!top) return null

  return {
    id: top.id,
    type: 'cumulative_awareness',
    message: top.message,
    detail: top.detail,
    suggestedAction: top.action ? {
      label: top.action.label,
      type: top.action.type
    } : null
  }
}

/**
 * Check if a new expense triggers cumulative alert
 * Call after recording expense
 */
export function checkCumulativeAlert(gasto, movimientos) {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Find similar expenses this month
  const motivoLower = (gasto.motivo || '').toLowerCase()
  const similar = movimientos.filter(m => {
    if (m.tipo !== 'gasto') return false
    if (new Date(m.fecha) < monthStart) return false
    return (m.motivo || '').toLowerCase().includes(motivoLower) ||
           motivoLower.includes((m.motivo || '').toLowerCase().slice(0, 5))
  })

  if (similar.length < 2) return null

  const totalSimilar = similar.reduce((s, m) => s + m.monto, 0) + gasto.monto
  const count = similar.length + 1

  // Alert if cumulative is significant
  if (totalSimilar >= 5000 && count >= 3) {
    return {
      type: 'cumulative_warning',
      message: `"${capitalizeFirst(gasto.motivo)}" ya suma $${formatNumber(totalSimilar)} este mes (${count}x)`,
      severity: totalSimilar >= 15000 ? 'high' : 'medium',
      suggestHabitual: count >= 4
    }
  }

  return null
}

/**
 * Group expenses by motivo
 */
function groupByMotivo(gastos) {
  const result = {}

  gastos.forEach(g => {
    const key = (g.motivo || '').toLowerCase()
    if (!key) return

    if (!result[key]) {
      result[key] = { count: 0, total: 0, originalMotivo: g.motivo }
    }
    result[key].count++
    result[key].total += g.monto
  })

  return result
}

/**
 * Get category display label
 */
function getCategoryLabel(cat) {
  const labels = {
    comida: 'comida',
    transporte: 'transporte',
    delivery: 'delivery',
    ocio: 'entretenimiento',
    otros: 'varios'
  }
  return labels[cat] || cat
}

/**
 * Format number with thousands separator
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
