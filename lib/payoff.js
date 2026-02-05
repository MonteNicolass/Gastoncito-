/**
 * Payoff System
 * Immediate feedback for user actions
 *
 * Rules:
 * - Max 1 payoff visible at a time
 * - Non-invasive, disappears automatically
 * - Always positive reinforcement, never negative
 */

const PAYOFF_HISTORY_KEY = 'gaston_payoff_history'
const MONTHLY_STATS_KEY = 'gaston_monthly_stats'

/**
 * Generate payoff message for an action
 * @param {string} actionType - Type of action performed
 * @param {Object} context - Action context (amount, category, etc)
 * @returns {Object|null} Payoff message or null
 */
export function generatePayoff(actionType, context = {}) {
  switch (actionType) {
    case 'expense_logged':
      return generateExpensePayoff(context)

    case 'income_logged':
      return generateIncomePayoff(context)

    case 'mood_logged':
      return generateMoodPayoff(context)

    case 'activity_logged':
      return generateActivityPayoff(context)

    case 'alert_resolved':
      return generateAlertPayoff(context)

    case 'recommendation_followed':
      return generateRecommendationPayoff(context)

    case 'goal_progress':
      return generateGoalPayoff(context)

    case 'budget_under':
      return generateBudgetPayoff(context)

    default:
      return null
  }
}

/**
 * Expense payoff - show impact on budget/savings
 */
function generateExpensePayoff(context) {
  const { amount, category, budgetRemaining, isUnderBudget, ratoneandoSavings } = context

  // Priority: ratoneando savings > budget status > generic
  if (ratoneandoSavings && ratoneandoSavings > 0) {
    return {
      type: 'savings',
      icon: 'PiggyBank',
      color: 'emerald',
      message: 'Buen movimiento',
      detail: `Ahorraste $${ratoneandoSavings.toLocaleString('es-AR')} vs tu promedio`
    }
  }

  if (isUnderBudget && budgetRemaining) {
    const percent = Math.round((budgetRemaining / (budgetRemaining + amount)) * 100)
    return {
      type: 'budget',
      icon: 'Check',
      color: 'blue',
      message: 'Dentro del presupuesto',
      detail: `Te queda ${percent}% de ${category || 'tu límite'}`
    }
  }

  // Generic acknowledgment
  return {
    type: 'logged',
    icon: 'Check',
    color: 'zinc',
    message: 'Registrado',
    detail: null
  }
}

/**
 * Income payoff - positive reinforcement
 */
function generateIncomePayoff(context) {
  const { amount, isRecurring } = context

  if (isRecurring) {
    return {
      type: 'income',
      icon: 'TrendingUp',
      color: 'emerald',
      message: 'Ingreso registrado',
      detail: 'Suma a tu balance mensual'
    }
  }

  return {
    type: 'income',
    icon: 'Plus',
    color: 'emerald',
    message: 'Ingreso registrado',
    detail: amount >= 10000 ? 'Buen ingreso' : null
  }
}

/**
 * Mood payoff - streak or consistency bonus
 */
function generateMoodPayoff(context) {
  const { score, streak, isImproving } = context

  if (streak && streak >= 7) {
    return {
      type: 'streak',
      icon: 'Flame',
      color: 'purple',
      message: `${streak} días seguidos`,
      detail: 'Tu constancia ayuda a ver patrones'
    }
  }

  if (isImproving) {
    return {
      type: 'improvement',
      icon: 'TrendingUp',
      color: 'purple',
      message: 'Mejorando',
      detail: 'Tu promedio subió esta semana'
    }
  }

  if (score >= 7) {
    return {
      type: 'good_mood',
      icon: 'Check',
      color: 'purple',
      message: 'Buen día',
      detail: null
    }
  }

  // Always acknowledge, never judge
  return {
    type: 'logged',
    icon: 'Check',
    color: 'zinc',
    message: 'Registrado',
    detail: null
  }
}

/**
 * Activity payoff - streak focus
 */
function generateActivityPayoff(context) {
  const { streak, isNewStreak, activityType } = context

  if (streak >= 7) {
    return {
      type: 'streak',
      icon: 'Flame',
      color: 'orange',
      message: `${streak} días de racha`,
      detail: 'Consistencia es clave'
    }
  }

  if (isNewStreak && streak >= 3) {
    return {
      type: 'streak_start',
      icon: 'Zap',
      color: 'orange',
      message: `Racha de ${streak} días`,
      detail: 'Seguí así'
    }
  }

  return {
    type: 'activity',
    icon: 'Check',
    color: 'orange',
    message: 'Actividad registrada',
    detail: activityType || null
  }
}

/**
 * Alert resolved payoff - close the loop
 */
function generateAlertPayoff(context) {
  const { alertType, impact } = context

  if (impact === 'high') {
    return {
      type: 'alert_resolved',
      icon: 'Shield',
      color: 'emerald',
      message: 'Alerta resuelta',
      detail: 'Esto mejora tu balance general'
    }
  }

  return {
    type: 'alert_resolved',
    icon: 'Check',
    color: 'blue',
    message: 'Alerta resuelta',
    detail: null
  }
}

/**
 * Recommendation followed payoff - savings feedback
 */
function generateRecommendationPayoff(context) {
  const { type, savings, message } = context

  if (savings && savings > 0) {
    return {
      type: 'recommendation',
      icon: 'PiggyBank',
      color: 'emerald',
      message: 'Buen movimiento',
      detail: `~$${savings.toLocaleString('es-AR')} de ahorro este mes`
    }
  }

  return {
    type: 'recommendation',
    icon: 'Check',
    color: 'emerald',
    message: message || 'Aplicado',
    detail: null
  }
}

/**
 * Goal progress payoff
 */
function generateGoalPayoff(context) {
  const { progress, target, justCompleted, goalTitle } = context

  if (justCompleted) {
    return {
      type: 'goal_complete',
      icon: 'Trophy',
      color: 'indigo',
      message: 'Objetivo cumplido',
      detail: goalTitle || null
    }
  }

  const percent = Math.round((progress / target) * 100)

  if (percent >= 75) {
    return {
      type: 'goal_close',
      icon: 'Target',
      color: 'indigo',
      message: `${percent}% completado`,
      detail: 'Ya casi'
    }
  }

  if (percent >= 50) {
    return {
      type: 'goal_halfway',
      icon: 'TrendingUp',
      color: 'indigo',
      message: `${percent}% completado`,
      detail: 'Vas por buen camino'
    }
  }

  return null // No payoff for early progress
}

/**
 * Budget under payoff
 */
function generateBudgetPayoff(context) {
  const { category, percentRemaining } = context

  return {
    type: 'budget_good',
    icon: 'Check',
    color: 'blue',
    message: 'Presupuesto bajo control',
    detail: `${percentRemaining}% disponible en ${category}`
  }
}

/**
 * Calculate context for payoff generation
 * Call this before generating payoff
 */
export function calculatePayoffContext(actionType, data, existingData = {}) {
  const context = {}

  switch (actionType) {
    case 'expense_logged': {
      const { amount, category, budgets = [], movimientos = [] } = data

      // Check budget status
      const relevantBudget = budgets.find(b => b.category === category)
      if (relevantBudget) {
        const monthStart = new Date()
        monthStart.setDate(1)
        monthStart.setHours(0, 0, 0, 0)

        const spent = movimientos
          .filter(m => m.tipo === 'gasto' && m.categoria === category && new Date(m.fecha) >= monthStart)
          .reduce((s, m) => s + m.monto, 0)

        context.budgetRemaining = relevantBudget.amount - spent
        context.isUnderBudget = spent + amount <= relevantBudget.amount
      }

      context.amount = amount
      context.category = category
      break
    }

    case 'mood_logged': {
      const { score, lifeEntries = [] } = data

      // Calculate streak
      const mentalEntries = lifeEntries.filter(e => e.domain === 'mental')
      const streak = calculateMoodStreak(mentalEntries)

      // Check if improving (last 7 days vs previous 7)
      const last7 = mentalEntries.filter(e => {
        const d = new Date(e.created_at)
        return d >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && e.meta?.mood_score
      })
      const prev7 = mentalEntries.filter(e => {
        const d = new Date(e.created_at)
        return d >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) &&
               d < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && e.meta?.mood_score
      })

      const avgLast = last7.length > 0 ? last7.reduce((s, e) => s + e.meta.mood_score, 0) / last7.length : null
      const avgPrev = prev7.length > 0 ? prev7.reduce((s, e) => s + e.meta.mood_score, 0) / prev7.length : null

      context.score = score
      context.streak = streak
      context.isImproving = avgLast && avgPrev && avgLast > avgPrev + 0.5
      break
    }

    case 'activity_logged': {
      const { activityType, lifeEntries = [] } = data

      const physicalEntries = lifeEntries.filter(e => e.domain === 'physical')
      const streak = calculateActivityStreak(physicalEntries)
      const prevStreak = existingData.prevStreak || 0

      context.activityType = activityType
      context.streak = streak
      context.isNewStreak = streak > prevStreak && streak >= 3
      break
    }

    case 'goal_progress': {
      const { progress, target, goalTitle, previousProgress } = data
      context.progress = progress
      context.target = target
      context.goalTitle = goalTitle
      context.justCompleted = previousProgress < target && progress >= target
      break
    }
  }

  return context
}

/**
 * Calculate mood logging streak
 */
function calculateMoodStreak(entries) {
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
 * Calculate activity streak
 */
function calculateActivityStreak(entries) {
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
 * Track monthly stats for payoff context
 */
export function updateMonthlyStats(type, value) {
  if (typeof window === 'undefined') return

  try {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const data = localStorage.getItem(MONTHLY_STATS_KEY)
    const stats = data ? JSON.parse(data) : {}

    if (!stats[monthKey]) {
      stats[monthKey] = {
        totalSaved: 0,
        alertsResolved: 0,
        recommendationsFollowed: 0,
        goalsCompleted: 0,
        activityStreak: 0,
        moodStreak: 0
      }
    }

    switch (type) {
      case 'saved':
        stats[monthKey].totalSaved += value
        break
      case 'alert_resolved':
        stats[monthKey].alertsResolved++
        break
      case 'recommendation':
        stats[monthKey].recommendationsFollowed++
        break
      case 'goal_completed':
        stats[monthKey].goalsCompleted++
        break
      case 'activity_streak':
        stats[monthKey].activityStreak = Math.max(stats[monthKey].activityStreak, value)
        break
      case 'mood_streak':
        stats[monthKey].moodStreak = Math.max(stats[monthKey].moodStreak, value)
        break
    }

    // Keep only last 3 months
    const keys = Object.keys(stats).sort().reverse().slice(0, 3)
    const cleaned = {}
    keys.forEach(k => { cleaned[k] = stats[k] })

    localStorage.setItem(MONTHLY_STATS_KEY, JSON.stringify(cleaned))
  } catch (e) {
    console.warn('Failed to update monthly stats:', e)
  }
}

/**
 * Get monthly stats for display
 */
export function getMonthlyStats() {
  if (typeof window === 'undefined') return null

  try {
    const now = new Date()
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const data = localStorage.getItem(MONTHLY_STATS_KEY)
    const stats = data ? JSON.parse(data) : {}

    return stats[monthKey] || null
  } catch {
    return null
  }
}

/**
 * Get summary payoff for monthly achievements
 */
export function getMonthlySummaryPayoff() {
  const stats = getMonthlyStats()
  if (!stats) return null

  const achievements = []

  if (stats.totalSaved >= 5000) {
    achievements.push({
      type: 'savings',
      icon: 'PiggyBank',
      label: `$${stats.totalSaved.toLocaleString('es-AR')} ahorrado`
    })
  }

  if (stats.alertsResolved >= 5) {
    achievements.push({
      type: 'alerts',
      icon: 'Shield',
      label: `${stats.alertsResolved} alertas resueltas`
    })
  }

  if (stats.activityStreak >= 7) {
    achievements.push({
      type: 'activity',
      icon: 'Flame',
      label: `${stats.activityStreak}d racha física`
    })
  }

  if (stats.goalsCompleted >= 1) {
    achievements.push({
      type: 'goals',
      icon: 'Trophy',
      label: `${stats.goalsCompleted} objetivo${stats.goalsCompleted > 1 ? 's' : ''}`
    })
  }

  return achievements.length > 0 ? achievements : null
}
