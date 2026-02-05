/**
 * Score Global - Indicador 0-100 del estado general
 * NO es un juicio - es una referencia
 */

/**
 * Calcula score de Mental (0-100)
 */
function getMentalScore(lifeEntries) {
  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const mentalEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last30Days
  )

  if (mentalEntries.length === 0) return 50 // Neutral si no hay datos

  const avg = mentalEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / mentalEntries.length

  // Convertir de 1-10 a 0-100
  const score = (avg / 10) * 100

  return Math.round(score)
}

/**
 * Calcula score de Físico (0-100)
 */
function getPhysicalScore(lifeEntries) {
  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const physicalEntries = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= last30Days
  )

  if (physicalEntries.length === 0) return 30 // Bajo si no hay actividad

  // Días activos de los últimos 30
  const activeDays = new Set(physicalEntries.map(e => {
    const d = new Date(e.created_at)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  })).size

  // Score basado en días activos (ideal: 15+ días al mes = 100)
  const score = Math.min((activeDays / 15) * 100, 100)

  return Math.round(score)
}

/**
 * Calcula score de Money (0-100)
 */
function getMoneyScore(movimientos, budgets) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthMovimientos = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear && m.tipo === 'gasto'
  })

  if (monthMovimientos.length === 0) return 70 // Neutral-alto si no hay gastos

  const totalSpent = monthMovimientos.reduce((sum, m) => sum + m.monto, 0)

  // Si hay presupuestos, evaluar cumplimiento
  if (budgets && budgets.length > 0) {
    const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0)

    if (totalBudget > 0) {
      const percentage = (totalSpent / totalBudget) * 100

      // Score inverso: menos gasto respecto al presupuesto = mejor score
      if (percentage <= 75) return 100
      if (percentage <= 90) return 85
      if (percentage <= 100) return 70
      if (percentage <= 110) return 50
      return 30
    }
  }

  // Sin presupuestos: evaluar variabilidad (menos variabilidad = mejor)
  const prev30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const last30Movs = movimientos.filter(m => new Date(m.fecha) >= prev30Days && m.tipo === 'gasto')

  if (last30Movs.length > 5) {
    const amounts = last30Movs.map(m => m.monto)
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length
    const stdDev = Math.sqrt(variance)
    const cv = stdDev / avg // Coeficiente de variación

    // Menor variabilidad = mejor score
    if (cv < 0.5) return 85
    if (cv < 1.0) return 70
    if (cv < 1.5) return 55
    return 40
  }

  return 60 // Neutral
}

/**
 * Calcula score de Objetivos (0-100)
 */
function getGoalsScore(goals) {
  const activeGoals = goals.filter(g => g.status === 'active')

  if (activeGoals.length === 0) return 50 // Neutral si no hay objetivos

  const avgProgress = activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length

  // Score = progreso promedio
  return Math.round(avgProgress)
}

/**
 * Calcula el Score Global (0-100)
 */
export function calculateGlobalScore(movimientos, lifeEntries, goals, budgets) {
  const mentalScore = getMentalScore(lifeEntries)
  const physicalScore = getPhysicalScore(lifeEntries)
  const moneyScore = getMoneyScore(movimientos, budgets)
  const goalsScore = getGoalsScore(goals)

  // Promedio ponderado
  const weights = {
    mental: 0.30,
    physical: 0.25,
    money: 0.25,
    goals: 0.20
  }

  const globalScore = Math.round(
    mentalScore * weights.mental +
    physicalScore * weights.physical +
    moneyScore * weights.money +
    goalsScore * weights.goals
  )

  return {
    global: globalScore,
    breakdown: {
      mental: mentalScore,
      physical: physicalScore,
      money: moneyScore,
      goals: goalsScore
    }
  }
}

/**
 * Obtiene descriptor textual del score
 */
export function getScoreLabel(score) {
  if (score >= 80) return 'Excelente'
  if (score >= 65) return 'Bueno'
  if (score >= 50) return 'Regular'
  if (score >= 35) return 'Bajo'
  return 'Muy bajo'
}

/**
 * Obtiene color del score
 */
export function getScoreColor(score) {
  if (score >= 80) return 'green'
  if (score >= 65) return 'blue'
  if (score >= 50) return 'yellow'
  if (score >= 35) return 'orange'
  return 'red'
}
