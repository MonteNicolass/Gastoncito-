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
        title: 'Presupuesto en riesgo',
        message: `${budget.name}: ${Math.round(percentage)}% gastado`,
        data: { budget, spent, percentage }
      })
    } else if (percentage >= 100) {
      alerts.push({
        type: 'budget_exceeded',
        severity: 'high',
        title: 'Presupuesto excedido',
        message: `${budget.name}: ${Math.round(percentage)}% gastado`,
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
      alerts.push({
        type: 'atypical_spending',
        severity: 'low',
        title: 'Gasto atípico',
        message: `${mov.categoria}: $${mov.monto.toLocaleString()} (${Math.round((mov.monto / avg - 1) * 100)}% más que promedio)`,
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
      severity: 'medium',
      title: 'Estado bajo',
      message: `Promedio últimos 7 días: ${Math.round(avg * 10) / 10}/10`,
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

  const physicalEntries = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= last7Days
  )

  // Contar días únicos con actividad
  const uniqueDays = new Set(physicalEntries.map(e => {
    const date = new Date(e.created_at)
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }))

  const activeDays = uniqueDays.size

  if (activeDays === 0) {
    return [{
      type: 'no_physical_activity',
      severity: 'medium',
      title: 'Sin actividad física',
      message: 'No registraste hábitos en los últimos 7 días',
      data: { activeDays: 0 }
    }]
  } else if (activeDays <= 2) {
    return [{
      type: 'low_physical_activity',
      severity: 'low',
      title: 'Poca actividad física',
      message: `Solo ${activeDays} ${activeDays === 1 ? 'día' : 'días'} activo esta semana`,
      data: { activeDays }
    }]
  }

  return []
}

/**
 * Obtener todas las alertas silenciosas
 */
export function getAllSilentAlerts(movimientos, lifeEntries, budgets, categorias) {
  const alerts = [
    ...detectBudgetsAtRisk(movimientos, budgets, categorias),
    ...detectAtypicalSpending(movimientos),
    ...detectLowMoodStreak(lifeEntries),
    ...detectHabitDropoff(lifeEntries)
  ]

  // Ordenar por severidad
  const severityOrder = { high: 0, medium: 1, low: 2 }
  return alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
