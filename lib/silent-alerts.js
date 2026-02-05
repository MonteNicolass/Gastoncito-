// lib/silent-alerts.js
// Sistema de alertas silenciosas (visual, no intrusivo)

/**
 * Detecta presupuestos en riesgo (>75% gastado)
 */
export function detectBudgetsAtRisk(movimientos, budgets, categorias) {
  if (!budgets || budgets.length === 0) return []

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthMovements = movimientos.filter(mov => {
    const movDate = new Date(mov.fecha)
    return movDate.getMonth() === currentMonth &&
           movDate.getFullYear() === currentYear &&
           mov.tipo === 'gasto'
  })

  const alerts = []

  budgets.forEach(budget => {
    let spent = 0

    if (budget.type === 'category') {
      spent = monthMovements
        .filter(mov => {
          const cat = categorias.find(c => c.id === mov.category_id)
          return cat?.nombre === budget.target_id || mov.categoria === budget.target_id
        })
        .reduce((sum, mov) => sum + mov.monto, 0)
    } else {
      spent = monthMovements
        .filter(mov => mov.metodo === budget.target_id)
        .reduce((sum, mov) => sum + mov.monto, 0)
    }

    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

    if (percentage >= 75 && percentage < 100) {
      alerts.push({
        type: 'budget_at_risk',
        severity: 'medium',
        title: `${budget.name}: ${Math.round(percentage)}% del presupuesto`,
        message: `En riesgo este mes`,
        data: { budget, spent, percentage }
      })
    } else if (percentage >= 100) {
      alerts.push({
        type: 'budget_exceeded',
        severity: 'high',
        title: `${budget.name}: ${Math.round(percentage)}% del presupuesto`,
        message: `Excedido este mes`,
        data: { budget, spent, percentage }
      })
    }
  })

  return alerts
}

/**
 * Detecta gastos atípicos recientes (últimos 7 días)
 */
export function detectAtypicalSpending(movimientos) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Calcular promedio por categoría
  const categoryTotals = {}
  const categoryCounts = {}

  movimientos.filter(m => m.tipo === 'gasto' && m.categoria).forEach(m => {
    const cat = m.categoria
    categoryTotals[cat] = (categoryTotals[cat] || 0) + m.monto
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
  })

  const categoryAverages = {}
  Object.keys(categoryTotals).forEach(cat => {
    categoryAverages[cat] = categoryTotals[cat] / categoryCounts[cat]
  })

  // Detectar gastos atípicos en últimos 7 días
  const recentMovs = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha >= last7Days && m.tipo === 'gasto' && m.categoria
  })

  const alerts = []

  recentMovs.forEach(mov => {
    const avg = categoryAverages[mov.categoria]
    if (avg && mov.monto > avg * 2) {
      const percentAbove = Math.round((mov.monto / avg - 1) * 100)
      alerts.push({
        type: 'atypical_spending',
        severity: 'low',
        title: `${mov.categoria}: +${percentAbove}% vs promedio`,
        message: `Gasto atípico últimos 7 días`,
        data: { movimiento: mov, average: avg }
      })
    }
  })

  return alerts.slice(0, 3) // Máximo 3 alertas
}

/**
 * Detecta racha mental baja (últimos 7 días)
 */
export function detectLowMoodStreak(lifeEntries) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const mentalEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last7Days
  )

  if (mentalEntries.length === 0) return []

  const avg = mentalEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / mentalEntries.length

  if (avg < 5) {
    return [{
      type: 'low_mood_streak',
      severity: 'high',
      title: `Estado mental bajo: ${Math.round(avg * 10) / 10}/10`,
      message: `Promedio últimos 7 días`,
      data: { average: avg, count: mentalEntries.length }
    }]
  }

  return []
}

/**
 * Detecta caída de hábitos físicos
 */
export function detectHabitDropoff(lifeEntries) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const physicalEntries = lifeEntries.filter(e => e.domain === 'physical')

  if (physicalEntries.length === 0) return []

  // Encontrar último ejercicio
  const sorted = physicalEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const lastExercise = sorted[0]
  const lastDate = new Date(lastExercise.created_at)

  const daysSince = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))

  if (daysSince >= 7) {
    const formatDate = (d) => {
      return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    }
    return [{
      type: 'no_physical_activity',
      severity: 'high',
      title: `${daysSince} días sin ejercicio`,
      message: `Último: ${formatDate(lastDate)}`,
      data: { daysSince, lastDate }
    }]
  } else if (daysSince >= 4) {
    return [{
      type: 'low_physical_activity',
      severity: 'medium',
      title: `${daysSince} días sin ejercicio`,
      message: `Retomá hábitos físicos`,
      data: { daysSince }
    }]
  }

  return []
}

/**
 * Detecta correlación negativa gasto/mood
 */
export function detectSpendingMoodCorrelation(movimientos, lifeEntries) {
  // Import inline para evitar dependencia circular
  const { getSpendingByMood } = require('./insights/crossInsights')

  const result = getSpendingByMood(movimientos, lifeEntries, 30)

  if (!result || result.deltaPercent < 15) return []

  return [{
    type: 'spending_mood_correlation',
    severity: 'medium',
    title: `Gastás ${Math.abs(result.deltaPercent)}% más con estado bajo`,
    message: `Últimos 30 días`,
    data: result
  }]
}

/**
 * Obtener todas las alertas silenciosas
 */
export function getAllSilentAlerts(movimientos, lifeEntries, budgets, categorias) {
  const alerts = [
    ...detectBudgetsAtRisk(movimientos, budgets, categorias),
    ...detectLowMoodStreak(lifeEntries),
    ...detectHabitDropoff(lifeEntries),
    ...detectSpendingMoodCorrelation(movimientos, lifeEntries),
    ...detectAtypicalSpending(movimientos)
  ]

  // Ordenar por severidad
  const severityOrder = { high: 0, medium: 1, low: 2 }
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
