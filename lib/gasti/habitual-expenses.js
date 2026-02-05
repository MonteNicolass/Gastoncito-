/**
 * Habitual Expenses - Detect and suggest habitual patterns
 *
 * "¿Lo marco como gasto habitual?" (1 tap)
 * Reduces friction for recurring expense tracking
 */

const HABITUAL_KEY = 'gaston_habitual_expenses'
const HABITUAL_SUGGESTIONS_KEY = 'gaston_habitual_suggestions'
const SUGGESTION_COOLDOWN_DAYS = 7

/**
 * Get stored habitual expenses
 */
export function getHabitualExpenses() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(HABITUAL_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Add expense as habitual
 */
export function markAsHabitual(expense) {
  if (typeof window === 'undefined') return

  const habituals = getHabitualExpenses()
  const motivoLower = (expense.motivo || '').toLowerCase()

  // Check if already exists
  const existing = habituals.find(h => h.motivo.toLowerCase() === motivoLower)
  if (existing) {
    // Update stats
    existing.count++
    existing.avgAmount = Math.round((existing.avgAmount * (existing.count - 1) + expense.monto) / existing.count)
    existing.lastAmount = expense.monto
    existing.lastDate = new Date().toISOString()
  } else {
    // Add new
    habituals.push({
      id: `habitual_${Date.now()}`,
      motivo: expense.motivo,
      avgAmount: expense.monto,
      lastAmount: expense.monto,
      metodo: expense.metodo || 'efectivo',
      category_id: expense.category_id,
      frequency: detectFrequency(expense),
      count: 1,
      createdAt: new Date().toISOString(),
      lastDate: new Date().toISOString()
    })
  }

  localStorage.setItem(HABITUAL_KEY, JSON.stringify(habituals))

  // Clear any pending suggestion for this expense
  clearSuggestion(motivoLower)

  return habituals.find(h => h.motivo.toLowerCase() === motivoLower)
}

/**
 * Remove habitual expense
 */
export function removeHabitual(motivoOrId) {
  if (typeof window === 'undefined') return

  const habituals = getHabitualExpenses()
  const filtered = habituals.filter(h =>
    h.id !== motivoOrId && h.motivo.toLowerCase() !== motivoOrId.toLowerCase()
  )

  localStorage.setItem(HABITUAL_KEY, JSON.stringify(filtered))
}

/**
 * Check if expense matches a habitual
 */
export function matchesHabitual(motivo) {
  const habituals = getHabitualExpenses()
  const motivoLower = (motivo || '').toLowerCase()

  return habituals.find(h => {
    const hMotivo = h.motivo.toLowerCase()
    return hMotivo === motivoLower ||
           hMotivo.includes(motivoLower) ||
           motivoLower.includes(hMotivo)
  })
}

/**
 * Check if we should suggest marking as habitual
 * Returns suggestion object or null
 */
export function shouldSuggestHabitual(gasto, movimientos) {
  const motivoLower = (gasto.motivo || '').toLowerCase()
  if (!motivoLower) return null

  // Already habitual?
  if (matchesHabitual(motivoLower)) return null

  // Recently dismissed?
  if (isSuggestionDismissed(motivoLower)) return null

  // Count occurrences
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const similar = movimientos.filter(m => {
    if (m.tipo !== 'gasto') return false
    if (new Date(m.fecha) < thirtyDaysAgo) return false
    const mMotivo = (m.motivo || '').toLowerCase()
    return mMotivo === motivoLower ||
           mMotivo.includes(motivoLower.slice(0, 5)) ||
           motivoLower.includes(mMotivo.slice(0, 5))
  })

  // Need at least 3 occurrences to suggest
  if (similar.length < 3) return null

  const total = similar.reduce((s, m) => s + m.monto, 0)
  const avgAmount = Math.round(total / similar.length)

  return {
    id: `suggest_habitual_${motivoLower.slice(0, 20)}`,
    motivo: gasto.motivo,
    count: similar.length,
    avgAmount,
    total,
    message: `"${capitalizeFirst(gasto.motivo)}" se repite seguido`,
    question: '¿Lo marco como gasto habitual?',
    impact: `${similar.length} veces = $${formatNumber(total)}`
  }
}

/**
 * Dismiss habitual suggestion
 */
export function dismissHabitualSuggestion(motivo) {
  if (typeof window === 'undefined') return

  try {
    const data = localStorage.getItem(HABITUAL_SUGGESTIONS_KEY)
    const dismissed = data ? JSON.parse(data) : {}

    dismissed[motivo.toLowerCase()] = {
      dismissedAt: Date.now()
    }

    // Clean old entries
    const cleaned = {}
    Object.entries(dismissed).forEach(([key, entry]) => {
      const daysSince = (Date.now() - entry.dismissedAt) / (24 * 60 * 60 * 1000)
      if (daysSince < SUGGESTION_COOLDOWN_DAYS * 2) {
        cleaned[key] = entry
      }
    })

    localStorage.setItem(HABITUAL_SUGGESTIONS_KEY, JSON.stringify(cleaned))
  } catch {
    // Ignore
  }
}

/**
 * Check if suggestion was dismissed
 */
function isSuggestionDismissed(motivo) {
  if (typeof window === 'undefined') return false

  try {
    const data = localStorage.getItem(HABITUAL_SUGGESTIONS_KEY)
    const dismissed = data ? JSON.parse(data) : {}

    const entry = dismissed[motivo.toLowerCase()]
    if (!entry) return false

    const daysSince = (Date.now() - entry.dismissedAt) / (24 * 60 * 60 * 1000)
    return daysSince < SUGGESTION_COOLDOWN_DAYS
  } catch {
    return false
  }
}

/**
 * Clear suggestion for motivo
 */
function clearSuggestion(motivo) {
  if (typeof window === 'undefined') return

  try {
    const data = localStorage.getItem(HABITUAL_SUGGESTIONS_KEY)
    const dismissed = data ? JSON.parse(data) : {}
    delete dismissed[motivo.toLowerCase()]
    localStorage.setItem(HABITUAL_SUGGESTIONS_KEY, JSON.stringify(dismissed))
  } catch {
    // Ignore
  }
}

/**
 * Detect frequency type from expense
 */
function detectFrequency(expense) {
  const amount = expense.monto || 0

  // Simple heuristics based on typical amounts
  if (amount < 1500) return 'daily'
  if (amount < 5000) return 'weekly'
  if (amount < 20000) return 'biweekly'
  return 'monthly'
}

/**
 * Get habitual expenses as shortcuts for quick add
 */
export function getHabitualShortcuts(limit = 5) {
  const habituals = getHabitualExpenses()

  return habituals
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(h => ({
      motivo: h.motivo,
      suggestedAmount: h.avgAmount,
      metodo: h.metodo,
      category_id: h.category_id,
      count: h.count,
      isHabitual: true
    }))
}

/**
 * Update habitual stats after recording expense
 */
export function updateHabitualStats(gasto) {
  const habitual = matchesHabitual(gasto.motivo)
  if (!habitual) return null

  const habituals = getHabitualExpenses()
  const index = habituals.findIndex(h => h.id === habitual.id)
  if (index === -1) return null

  habituals[index].count++
  habituals[index].avgAmount = Math.round(
    (habituals[index].avgAmount * (habituals[index].count - 1) + gasto.monto) / habituals[index].count
  )
  habituals[index].lastAmount = gasto.monto
  habituals[index].lastDate = new Date().toISOString()

  localStorage.setItem(HABITUAL_KEY, JSON.stringify(habituals))

  return habituals[index]
}

/**
 * Get monthly projection for habituals
 */
export function getHabitualsProjection() {
  const habituals = getHabitualExpenses()
  if (habituals.length === 0) return null

  let monthlyTotal = 0
  const items = []

  habituals.forEach(h => {
    let multiplier = 1
    switch (h.frequency) {
      case 'daily': multiplier = 30; break
      case 'weekly': multiplier = 4; break
      case 'biweekly': multiplier = 2; break
      case 'monthly': multiplier = 1; break
    }

    const monthlyAmount = h.avgAmount * multiplier
    monthlyTotal += monthlyAmount

    items.push({
      motivo: h.motivo,
      frequency: h.frequency,
      avgAmount: h.avgAmount,
      monthlyProjection: monthlyAmount
    })
  })

  return {
    total: monthlyTotal,
    items: items.sort((a, b) => b.monthlyProjection - a.monthlyProjection),
    message: `Tus gastos habituales suman ~$${formatNumber(monthlyTotal)}/mes`
  }
}

/**
 * Format number with thousands separator
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
