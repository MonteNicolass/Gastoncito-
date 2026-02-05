/**
 * Progression Engine
 * Calculates visible progress across all domains
 *
 * Philosophy:
 * - Progress should be felt, not just seen
 * - No gamification, just clarity
 * - Comparison is against yourself, not others
 */

const PROGRESSION_CACHE_KEY = 'gaston_progression_cache'
const PROGRESSION_HISTORY_KEY = 'gaston_progression_history'

/**
 * Calculate overall monthly state
 * Returns: 'stable' | 'improving' | 'at_risk' | 'excellent'
 */
export function calculateMonthlyState(data) {
  const {
    movimientos = [],
    lifeEntries = [],
    budgets = [],
    goals = [],
    alertsResolved = 0,
    alertsActive = 0
  } = data

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Current month data
  const currentMovimientos = movimientos.filter(m => new Date(m.fecha) >= monthStart)
  const currentEntries = lifeEntries.filter(e => new Date(e.created_at) >= monthStart)

  // Previous month data
  const prevMovimientos = movimientos.filter(m => {
    const d = new Date(m.fecha)
    return d >= prevMonthStart && d <= prevMonthEnd
  })
  const prevEntries = lifeEntries.filter(e => {
    const d = new Date(e.created_at)
    return d >= prevMonthStart && d <= prevMonthEnd
  })

  // Calculate domain scores (0-100)
  const moneyScore = calculateMoneyScore(currentMovimientos, prevMovimientos, budgets)
  const mentalScore = calculateMentalScore(currentEntries, prevEntries)
  const physicalScore = calculatePhysicalScore(currentEntries, prevEntries)
  const alertScore = calculateAlertScore(alertsResolved, alertsActive)

  // Weighted average
  const overallScore = Math.round(
    moneyScore * 0.30 +
    mentalScore * 0.25 +
    physicalScore * 0.20 +
    alertScore * 0.25
  )

  // Determine state
  let state = 'stable'
  if (overallScore >= 80) state = 'excellent'
  else if (overallScore >= 60) state = 'stable'
  else if (overallScore >= 40) state = 'improving'
  else state = 'at_risk'

  return {
    state,
    score: overallScore,
    domains: {
      money: moneyScore,
      mental: mentalScore,
      physical: physicalScore,
      alerts: alertScore
    }
  }
}

/**
 * Money score: budget control + spending stability
 */
function calculateMoneyScore(current, previous, budgets) {
  let score = 50 // Base

  const currentGasto = current.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0)
  const prevGasto = previous.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0)

  // Spending trend
  if (prevGasto > 0) {
    const change = ((currentGasto - prevGasto) / prevGasto) * 100
    if (change <= -10) score += 25 // Spending down significantly
    else if (change <= 0) score += 15 // Spending down
    else if (change <= 15) score += 5 // Slight increase
    else if (change <= 30) score -= 10 // Moderate increase
    else score -= 25 // High increase
  }

  // Budget adherence
  if (budgets.length > 0) {
    const budgetScore = budgets.reduce((sum, b) => {
      const spent = current
        .filter(m => m.tipo === 'gasto' && (m.categoria === b.category || m.metodo === b.wallet))
        .reduce((s, m) => s + m.monto, 0)
      const usage = (spent / b.amount) * 100
      if (usage <= 75) return sum + 30
      if (usage <= 100) return sum + 15
      return sum - 10
    }, 0) / budgets.length

    score += budgetScore
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * Mental score: stability + consistency
 */
function calculateMentalScore(current, previous) {
  const currentMental = current.filter(e => e.domain === 'mental' && e.meta?.mood_score)
  const prevMental = previous.filter(e => e.domain === 'mental' && e.meta?.mood_score)

  if (currentMental.length === 0) return 40 // No data penalty

  // Average mood
  const avgMood = currentMental.reduce((s, e) => s + e.meta.mood_score, 0) / currentMental.length
  const prevAvg = prevMental.length > 0
    ? prevMental.reduce((s, e) => s + e.meta.mood_score, 0) / prevMental.length
    : avgMood

  // Stability (low variance is good)
  const variance = currentMental.reduce((s, e) => {
    return s + Math.pow(e.meta.mood_score - avgMood, 2)
  }, 0) / currentMental.length
  const stdDev = Math.sqrt(variance)

  let score = avgMood * 10 // Base from mood (0-100)

  // Stability bonus
  if (stdDev < 1) score += 15
  else if (stdDev < 1.5) score += 10
  else if (stdDev < 2) score += 5
  else score -= 5

  // Trend bonus
  if (avgMood > prevAvg + 0.5) score += 10
  else if (avgMood < prevAvg - 0.5) score -= 10

  // Consistency bonus (entries per week)
  const weeks = Math.max(1, Math.ceil((new Date() - new Date(new Date().getFullYear(), new Date().getMonth(), 1)) / (7 * 24 * 60 * 60 * 1000)))
  const entriesPerWeek = currentMental.length / weeks
  if (entriesPerWeek >= 5) score += 10
  else if (entriesPerWeek >= 3) score += 5

  return Math.min(100, Math.max(0, Math.round(score)))
}

/**
 * Physical score: activity streak + consistency
 */
function calculatePhysicalScore(current, previous) {
  const currentPhysical = current.filter(e => e.domain === 'physical')
  const prevPhysical = previous.filter(e => e.domain === 'physical')

  if (currentPhysical.length === 0) return 30 // No data penalty

  // Days with activity
  const activeDays = new Set(
    currentPhysical.map(e => new Date(e.created_at).toDateString())
  ).size

  const prevActiveDays = new Set(
    prevPhysical.map(e => new Date(e.created_at).toDateString())
  ).size

  // Calculate streak
  const streak = calculateStreak(currentPhysical)

  let score = 40 // Base

  // Activity volume
  const daysSoFar = new Date().getDate()
  const activityRate = activeDays / daysSoFar
  if (activityRate >= 0.5) score += 25 // Active every other day
  else if (activityRate >= 0.3) score += 15
  else if (activityRate >= 0.15) score += 5

  // Streak bonus
  if (streak >= 7) score += 20
  else if (streak >= 3) score += 10
  else if (streak >= 1) score += 5

  // Trend vs previous month
  if (activeDays > prevActiveDays) score += 10
  else if (activeDays < prevActiveDays * 0.7) score -= 10

  return Math.min(100, Math.max(0, Math.round(score)))
}

/**
 * Alert score: resolved vs active
 */
function calculateAlertScore(resolved, active) {
  if (resolved === 0 && active === 0) return 70 // Neutral

  const total = resolved + active
  const resolvedRate = resolved / total

  let score = 50

  if (resolvedRate >= 0.8) score = 90
  else if (resolvedRate >= 0.6) score = 75
  else if (resolvedRate >= 0.4) score = 60
  else if (resolvedRate >= 0.2) score = 45
  else score = 30

  // Penalty for many active alerts
  if (active > 5) score -= 20
  else if (active > 3) score -= 10

  return Math.min(100, Math.max(0, score))
}

/**
 * Calculate activity streak
 */
function calculateStreak(entries) {
  if (entries.length === 0) return 0

  const dates = [...new Set(
    entries.map(e => new Date(e.created_at).toDateString())
  )].sort((a, b) => new Date(b) - new Date(a))

  let streak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dateStr = checkDate.toDateString()

    if (dates.includes(dateStr)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return streak
}

/**
 * Get domain progression with comparison
 */
export function getDomainProgressions(data) {
  const {
    movimientos = [],
    lifeEntries = [],
    budgets = [],
    goals = []
  } = data

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

  // Money: budget control percentage
  const moneyProgression = calculateMoneyProgression(movimientos, budgets, monthStart)

  // Mental: stable days ratio
  const mentalProgression = calculateMentalProgression(lifeEntries, monthStart, prevMonthStart, prevMonthEnd)

  // Physical: activity streak
  const physicalProgression = calculatePhysicalProgression(lifeEntries, monthStart, prevMonthStart, prevMonthEnd)

  // Goals: accumulated progress
  const goalsProgression = calculateGoalsProgression(goals)

  return {
    money: moneyProgression,
    mental: mentalProgression,
    physical: physicalProgression,
    goals: goalsProgression
  }
}

function calculateMoneyProgression(movimientos, budgets, monthStart) {
  const currentMonth = movimientos.filter(m => new Date(m.fecha) >= monthStart && m.tipo === 'gasto')
  const totalSpent = currentMonth.reduce((s, m) => s + m.monto, 0)

  if (budgets.length === 0) {
    return {
      value: null,
      label: 'Sin presupuestos',
      trend: 'neutral',
      detail: 'Definí presupuestos para trackear'
    }
  }

  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const usagePercent = Math.round((totalSpent / totalBudget) * 100)

  // Calculate controlled budgets
  const controlledCount = budgets.filter(b => {
    const spent = currentMonth
      .filter(m => m.categoria === b.category || m.metodo === b.wallet)
      .reduce((s, m) => s + m.monto, 0)
    return spent <= b.amount
  }).length

  const controlPercent = Math.round((controlledCount / budgets.length) * 100)

  let trend = 'neutral'
  let detail = ''

  if (controlPercent >= 80) {
    trend = 'up'
    detail = 'Presupuestos bajo control'
  } else if (controlPercent >= 50) {
    trend = 'neutral'
    detail = 'Algunos presupuestos excedidos'
  } else {
    trend = 'down'
    detail = 'Revisar límites de gasto'
  }

  return {
    value: controlPercent,
    label: `${controlPercent}% controlado`,
    trend,
    detail,
    raw: { controlled: controlledCount, total: budgets.length, spent: totalSpent, budget: totalBudget }
  }
}

function calculateMentalProgression(entries, monthStart, prevMonthStart, prevMonthEnd) {
  const current = entries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= monthStart
  )

  const previous = entries.filter(e => {
    const d = new Date(e.created_at)
    return e.domain === 'mental' && e.meta?.mood_score && d >= prevMonthStart && d <= prevMonthEnd
  })

  if (current.length === 0) {
    return {
      value: null,
      label: 'Sin registros',
      trend: 'neutral',
      detail: 'Registrá tu estado para ver progreso'
    }
  }

  const avgMood = current.reduce((s, e) => s + e.meta.mood_score, 0) / current.length
  const prevAvg = previous.length > 0
    ? previous.reduce((s, e) => s + e.meta.mood_score, 0) / previous.length
    : avgMood

  // Calculate stable days (mood >= 6)
  const stableDays = new Set(
    current.filter(e => e.meta.mood_score >= 6)
      .map(e => new Date(e.created_at).toDateString())
  ).size

  const totalDays = new Set(current.map(e => new Date(e.created_at).toDateString())).size
  const stablePercent = Math.round((stableDays / totalDays) * 100)

  let trend = 'neutral'
  if (avgMood > prevAvg + 0.3) trend = 'up'
  else if (avgMood < prevAvg - 0.3) trend = 'down'

  const trendText = trend === 'up' ? 'Mejor que el mes pasado' :
                    trend === 'down' ? 'En descenso' : 'Sin cambios'

  return {
    value: stablePercent,
    label: `${stableDays} días estables`,
    trend,
    detail: trendText,
    raw: { avgMood: Math.round(avgMood * 10) / 10, prevAvg: Math.round(prevAvg * 10) / 10, stableDays, totalDays }
  }
}

function calculatePhysicalProgression(entries, monthStart, prevMonthStart, prevMonthEnd) {
  const current = entries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= monthStart
  )

  const previous = entries.filter(e => {
    const d = new Date(e.created_at)
    return e.domain === 'physical' && d >= prevMonthStart && d <= prevMonthEnd
  })

  const streak = calculateStreak(current)
  const prevStreak = calculateStreak(previous)

  const currentDays = new Set(current.map(e => new Date(e.created_at).toDateString())).size
  const prevDays = new Set(previous.map(e => new Date(e.created_at).toDateString())).size

  let trend = 'neutral'
  if (currentDays > prevDays) trend = 'up'
  else if (currentDays < prevDays * 0.8) trend = 'down'

  const trendText = trend === 'up' ? 'Mejor que el mes pasado' :
                    trend === 'down' ? 'En descenso' : 'Sin cambios'

  if (streak === 0 && currentDays === 0) {
    return {
      value: 0,
      label: 'Sin actividad',
      trend: 'neutral',
      detail: 'Registrá ejercicio para empezar'
    }
  }

  return {
    value: streak,
    label: streak > 0 ? `${streak}d racha` : `${currentDays}d activo`,
    trend,
    detail: trendText,
    raw: { streak, currentDays, prevDays }
  }
}

function calculateGoalsProgression(goals) {
  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  if (activeGoals.length === 0 && completedGoals.length === 0) {
    return {
      value: null,
      label: 'Sin objetivos',
      trend: 'neutral',
      detail: 'Definí metas para trackear'
    }
  }

  const avgProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((s, g) => s + Math.min(100, (g.progress / g.target) * 100), 0) / activeGoals.length)
    : 100

  // Check for stalled goals (no update in 7+ days)
  const stalledCount = activeGoals.filter(g => {
    if (!g.updated_at) return true
    const daysSinceUpdate = (Date.now() - new Date(g.updated_at).getTime()) / (24 * 60 * 60 * 1000)
    return daysSinceUpdate > 7
  }).length

  let trend = 'neutral'
  if (completedGoals.length > 0 && stalledCount === 0) trend = 'up'
  else if (stalledCount > activeGoals.length / 2) trend = 'down'

  const detail = completedGoals.length > 0
    ? `${completedGoals.length} completado${completedGoals.length > 1 ? 's' : ''}`
    : stalledCount > 0
    ? `${stalledCount} estancado${stalledCount > 1 ? 's' : ''}`
    : 'En progreso'

  return {
    value: avgProgress,
    label: `${avgProgress}% avance`,
    trend,
    detail,
    raw: { active: activeGoals.length, completed: completedGoals.length, stalled: stalledCount, avgProgress }
  }
}

/**
 * Get 3-month history for trends
 */
export function getProgressionHistory() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(PROGRESSION_HISTORY_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Save current month progression to history
 */
export function saveProgressionToHistory(monthlyState, progressions) {
  if (typeof window === 'undefined') return

  const now = new Date()
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const history = getProgressionHistory()

  // Find or create entry for current month
  const existingIdx = history.findIndex(h => h.month === monthKey)
  const entry = {
    month: monthKey,
    state: monthlyState.state,
    score: monthlyState.score,
    domains: monthlyState.domains,
    progressions: {
      money: progressions.money?.value,
      mental: progressions.mental?.value,
      physical: progressions.physical?.value,
      goals: progressions.goals?.value
    },
    savedAt: Date.now()
  }

  if (existingIdx >= 0) {
    history[existingIdx] = entry
  } else {
    history.push(entry)
  }

  // Keep only last 6 months
  const sorted = history.sort((a, b) => b.month.localeCompare(a.month)).slice(0, 6)

  localStorage.setItem(PROGRESSION_HISTORY_KEY, JSON.stringify(sorted))
}

/**
 * Get trend for last 3 months
 */
export function getHistoricalTrend() {
  const history = getProgressionHistory()

  if (history.length < 2) {
    return { trend: 'neutral', data: history }
  }

  const recent = history.slice(0, 3)
  const scores = recent.map(h => h.score)

  // Simple linear trend
  let trend = 'neutral'
  if (scores.length >= 2) {
    const diff = scores[0] - scores[scores.length - 1]
    if (diff > 10) trend = 'up'
    else if (diff < -10) trend = 'down'
  }

  return {
    trend,
    data: recent.map(h => ({
      month: h.month,
      score: h.score,
      state: h.state
    }))
  }
}

/**
 * Get state label and color
 */
export function getStateDisplay(state) {
  const displays = {
    excellent: {
      label: 'Excelente',
      color: 'emerald',
      icon: 'TrendingUp'
    },
    stable: {
      label: 'Estable',
      color: 'blue',
      icon: 'Minus'
    },
    improving: {
      label: 'En mejora',
      color: 'amber',
      icon: 'TrendingUp'
    },
    at_risk: {
      label: 'Necesita atención',
      color: 'red',
      icon: 'AlertTriangle'
    }
  }

  return displays[state] || displays.stable
}

/**
 * Format month name
 */
export function formatMonth(monthKey) {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('es-AR', { month: 'short' })
}
