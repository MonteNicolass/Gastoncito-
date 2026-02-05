/**
 * Baseline Personal - Cálculo de patrones normales del usuario
 * Usado para todas las comparaciones y detección de anomalías
 */

const BASELINE_KEY = 'gaston_baseline'
const BASELINE_CACHE_HOURS = 6 // Recalcular cada 6 horas

/**
 * Calcula baseline de Money
 */
function calculateMoneyBaseline(movimientos) {
  const now = new Date()
  const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const gastos = movimientos.filter(m =>
    m.tipo === 'gasto' &&
    new Date(m.fecha) >= last60Days
  )

  if (gastos.length < 10) return null

  // Gasto diario
  const dailySpending = {}
  gastos.forEach(m => {
    const date = m.fecha.slice(0, 10)
    dailySpending[date] = (dailySpending[date] || 0) + m.monto
  })

  const days = Object.values(dailySpending)
  const avgDaily = days.reduce((a, b) => a + b, 0) / days.length

  // Variabilidad (desviación estándar)
  const variance = days.reduce((sum, val) => sum + Math.pow(val - avgDaily, 2), 0) / days.length
  const stdDev = Math.sqrt(variance)

  // Rango normal (±1 desviación estándar)
  const normalRange = {
    min: Math.max(0, avgDaily - stdDev),
    max: avgDaily + stdDev
  }

  // Gasto semanal promedio
  const weeklySpending = {}
  gastos.forEach(m => {
    const date = new Date(m.fecha)
    const weekKey = getWeekKey(date)
    weeklySpending[weekKey] = (weeklySpending[weekKey] || 0) + m.monto
  })

  const weeks = Object.values(weeklySpending)
  const avgWeekly = weeks.length > 0 ? weeks.reduce((a, b) => a + b, 0) / weeks.length : 0

  return {
    avgDaily,
    avgWeekly,
    stdDev,
    normalRange,
    sampleSize: gastos.length,
    calculatedAt: new Date().toISOString()
  }
}

/**
 * Calcula baseline de Mental
 */
function calculateMentalBaseline(lifeEntries) {
  const now = new Date()
  const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const mentalEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last60Days
  )

  if (mentalEntries.length < 10) return null

  const scores = mentalEntries.map(e => e.meta.mood_score)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length

  // Variabilidad
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  // Rango normal (±0.8 desviación estándar)
  const normalRange = {
    min: Math.max(1, avg - stdDev * 0.8),
    max: Math.min(10, avg + stdDev * 0.8)
  }

  // Frecuencia de registro
  const daysWithEntries = new Set(mentalEntries.map(e => {
    const d = new Date(e.created_at)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  })).size

  const avgEntriesPerWeek = (daysWithEntries / 60) * 7

  return {
    avgScore: Math.round(avg * 10) / 10,
    stdDev: Math.round(stdDev * 10) / 10,
    normalRange: {
      min: Math.round(normalRange.min * 10) / 10,
      max: Math.round(normalRange.max * 10) / 10
    },
    avgEntriesPerWeek: Math.round(avgEntriesPerWeek * 10) / 10,
    sampleSize: mentalEntries.length,
    calculatedAt: new Date().toISOString()
  }
}

/**
 * Calcula baseline de Físico
 */
function calculatePhysicalBaseline(lifeEntries) {
  const now = new Date()
  const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const physicalEntries = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= last60Days
  )

  if (physicalEntries.length < 3) return null

  // Días activos únicos
  const activeDays = new Set(physicalEntries.map(e => {
    const d = new Date(e.created_at)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }))

  const activeDaysCount = activeDays.size
  const avgPerWeek = (activeDaysCount / 60) * 7

  // Calcular gaps entre sesiones
  const sorted = physicalEntries.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const gaps = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].created_at)
    const curr = new Date(sorted[i].created_at)
    const daysDiff = Math.floor((curr - prev) / (1000 * 60 * 60 * 24))
    if (daysDiff > 0) gaps.push(daysDiff)
  }

  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0
  const maxAcceptableGap = Math.ceil(avgGap * 1.8) // 80% más que el promedio

  return {
    avgPerWeek: Math.round(avgPerWeek * 10) / 10,
    avgGapDays: Math.round(avgGap * 10) / 10,
    maxAcceptableGap,
    totalActiveDays: activeDaysCount,
    sampleSize: physicalEntries.length,
    calculatedAt: new Date().toISOString()
  }
}

/**
 * Calcula baseline de Objetivos
 */
function calculateGoalsBaseline(goals) {
  const activeGoals = goals.filter(g => g.status === 'active')

  if (activeGoals.length === 0) return null

  // Progreso promedio
  const avgProgress = activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length

  // Días desde última actualización promedio
  const now = new Date()
  const daysSinceUpdate = activeGoals
    .filter(g => g.updated_at)
    .map(g => Math.floor((now - new Date(g.updated_at)) / (1000 * 60 * 60 * 24)))

  const avgDaysSinceUpdate = daysSinceUpdate.length > 0
    ? daysSinceUpdate.reduce((a, b) => a + b, 0) / daysSinceUpdate.length
    : 0

  const maxAcceptableStall = Math.ceil(avgDaysSinceUpdate * 1.5)

  return {
    avgProgress: Math.round(avgProgress),
    avgDaysSinceUpdate: Math.round(avgDaysSinceUpdate * 10) / 10,
    maxAcceptableStall,
    activeCount: activeGoals.length,
    calculatedAt: new Date().toISOString()
  }
}

/**
 * Calcula baseline completo
 */
export function calculateFullBaseline(movimientos, lifeEntries, goals) {
  return {
    money: calculateMoneyBaseline(movimientos),
    mental: calculateMentalBaseline(lifeEntries),
    physical: calculatePhysicalBaseline(lifeEntries),
    goals: calculateGoalsBaseline(goals),
    calculatedAt: new Date().toISOString()
  }
}

/**
 * Obtiene baseline (de caché o recalcula)
 */
export function getBaseline(movimientos, lifeEntries, goals) {
  if (typeof window === 'undefined') {
    return calculateFullBaseline(movimientos, lifeEntries, goals)
  }

  const cached = localStorage.getItem(BASELINE_KEY)
  if (cached) {
    const baseline = JSON.parse(cached)
    const cacheAge = Date.now() - new Date(baseline.calculatedAt).getTime()
    const cacheValid = cacheAge < BASELINE_CACHE_HOURS * 60 * 60 * 1000

    if (cacheValid) {
      return baseline
    }
  }

  // Recalcular y guardar
  const baseline = calculateFullBaseline(movimientos, lifeEntries, goals)
  localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline))
  return baseline
}

/**
 * Fuerza recálculo de baseline
 */
export function recalculateBaseline(movimientos, lifeEntries, goals) {
  const baseline = calculateFullBaseline(movimientos, lifeEntries, goals)
  if (typeof window !== 'undefined') {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline))
  }
  return baseline
}

/**
 * Helper: obtiene clave de semana
 */
function getWeekKey(date) {
  const year = date.getFullYear()
  const week = getWeekNumber(date)
  return `${year}-W${week}`
}

/**
 * Helper: obtiene número de semana del año
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}
