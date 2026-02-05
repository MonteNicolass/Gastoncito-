/**
 * Reglas Automáticas Definidas por Usuario
 * Guardadas en localStorage, evaluadas al cargar datos
 */

const RULES_KEY = 'gaston_user_rules'

/**
 * Obtiene todas las reglas del usuario
 */
export function getUserRules() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(RULES_KEY)
  return data ? JSON.parse(data) : []
}

/**
 * Guarda reglas del usuario
 */
export function saveUserRules(rules) {
  if (typeof window === 'undefined') return
  localStorage.setItem(RULES_KEY, JSON.stringify(rules))
}

/**
 * Agrega una nueva regla
 */
export function addUserRule(rule) {
  const rules = getUserRules()
  const newRule = {
    id: Date.now().toString(),
    enabled: true,
    created_at: new Date().toISOString(),
    ...rule
  }
  rules.push(newRule)
  saveUserRules(rules)
  return newRule
}

/**
 * Actualiza una regla existente
 */
export function updateUserRule(id, updates) {
  const rules = getUserRules()
  const index = rules.findIndex(r => r.id === id)
  if (index === -1) return null

  rules[index] = { ...rules[index], ...updates, updated_at: new Date().toISOString() }
  saveUserRules(rules)
  return rules[index]
}

/**
 * Elimina una regla
 */
export function deleteUserRule(id) {
  const rules = getUserRules()
  const filtered = rules.filter(r => r.id !== id)
  saveUserRules(filtered)
}

/**
 * Toggle enabled/disabled
 */
export function toggleUserRule(id) {
  const rules = getUserRules()
  const rule = rules.find(r => r.id === id)
  if (!rule) return null

  rule.enabled = !rule.enabled
  saveUserRules(rules)
  return rule
}

/**
 * Evalúa regla de gasto diario
 */
function evaluateDailySpendingRule(rule, movimientos) {
  const today = new Date().toISOString().slice(0, 10)
  const todayMovs = movimientos.filter(m => m.fecha === today && m.tipo === 'gasto')
  const totalToday = todayMovs.reduce((sum, m) => sum + m.monto, 0)

  if (totalToday > rule.threshold) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }

    return {
      type: 'user_rule_triggered',
      ruleId: rule.id,
      severity: 'medium',
      title: `Regla: gasto diario supera ${formatAmount(rule.threshold)}`,
      message: `Total hoy: ${formatAmount(totalToday)}`,
      data: { rule, actualValue: totalToday }
    }
  }

  return null
}

/**
 * Evalúa regla de días sin ejercicio
 */
function evaluatePhysicalInactivityRule(rule, lifeEntries) {
  const physicalEntries = lifeEntries.filter(e => e.domain === 'physical')

  if (physicalEntries.length === 0) {
    // Sin registros de ejercicio nunca
    if (rule.days <= 7) { // Solo alertar si el threshold es razonable
      return {
        type: 'user_rule_triggered',
        ruleId: rule.id,
        severity: 'low',
        title: `Regla: sin ejercicio registrado`,
        message: `Nunca registraste actividad física`,
        data: { rule, actualValue: null }
      }
    }
    return null
  }

  const sorted = physicalEntries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  const lastExercise = new Date(sorted[0].created_at)
  const now = new Date()
  const daysSince = Math.floor((now - lastExercise) / (1000 * 60 * 60 * 24))

  if (daysSince >= rule.days) {
    return {
      type: 'user_rule_triggered',
      ruleId: rule.id,
      severity: daysSince >= rule.days * 1.5 ? 'high' : 'medium',
      title: `Regla: ${daysSince} días sin ejercicio`,
      message: `Límite: ${rule.days} días`,
      data: { rule, actualValue: daysSince }
    }
  }

  return null
}

/**
 * Evalúa regla de estado mental bajo
 */
function evaluateLowMoodRule(rule, lifeEntries) {
  const now = new Date()
  const startDate = new Date(now.getTime() - rule.days * 24 * 60 * 60 * 1000)

  const recentMood = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= startDate
  )

  if (recentMood.length < rule.days * 0.5) return null // Insuficientes registros

  // Contar días con mood bajo
  const lowMoodDays = recentMood.filter(e => e.meta.mood_score < rule.threshold).length

  if (lowMoodDays >= rule.days * 0.7) { // 70% o más de días con mood bajo
    const avg = recentMood.reduce((sum, e) => sum + e.meta.mood_score, 0) / recentMood.length

    return {
      type: 'user_rule_triggered',
      ruleId: rule.id,
      severity: 'high',
      title: `Regla: estado mental bajo ${rule.days} días`,
      message: `Promedio: ${Math.round(avg * 10) / 10}/10 (límite: ${rule.threshold}/10)`,
      data: { rule, actualValue: avg }
    }
  }

  return null
}

/**
 * Evalúa regla de presupuesto
 */
function evaluateBudgetRule(rule, movimientos, budgets) {
  const now = new Date()
  const currentMonth = now.toISOString().slice(0, 7)

  const monthMovs = movimientos.filter(m => m.fecha.startsWith(currentMonth) && m.tipo === 'gasto')

  let totalSpent = 0
  let budgetLimit = 0

  if (rule.budgetType === 'category') {
    totalSpent = monthMovs.filter(m => m.categoria === rule.target).reduce((sum, m) => sum + m.monto, 0)
    const budget = budgets.find(b => b.type === 'category' && b.target_id === rule.target)
    budgetLimit = budget ? budget.amount : 0
  } else if (rule.budgetType === 'wallet') {
    totalSpent = monthMovs.filter(m => m.metodo === rule.target).reduce((sum, m) => sum + m.monto, 0)
    const budget = budgets.find(b => b.type === 'wallet' && b.target_id === rule.target)
    budgetLimit = budget ? budget.amount : 0
  } else if (rule.budgetType === 'total') {
    totalSpent = monthMovs.reduce((sum, m) => sum + m.monto, 0)
    budgetLimit = rule.threshold
  }

  const percentage = budgetLimit > 0 ? (totalSpent / budgetLimit) * 100 : 0

  if (percentage >= rule.thresholdPercent) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }

    return {
      type: 'user_rule_triggered',
      ruleId: rule.id,
      severity: percentage >= 100 ? 'high' : 'medium',
      title: `Regla: presupuesto al ${Math.round(percentage)}%`,
      message: `${formatAmount(totalSpent)} de ${formatAmount(budgetLimit)}`,
      data: { rule, actualValue: percentage }
    }
  }

  return null
}

/**
 * Evalúa todas las reglas activas
 */
export function evaluateUserRules(movimientos, lifeEntries, budgets) {
  const rules = getUserRules().filter(r => r.enabled)
  const alerts = []

  rules.forEach(rule => {
    let alert = null

    switch (rule.type) {
      case 'daily_spending':
        alert = evaluateDailySpendingRule(rule, movimientos)
        break
      case 'physical_inactivity':
        alert = evaluatePhysicalInactivityRule(rule, lifeEntries)
        break
      case 'low_mood':
        alert = evaluateLowMoodRule(rule, lifeEntries)
        break
      case 'budget_threshold':
        alert = evaluateBudgetRule(rule, movimientos, budgets)
        break
    }

    if (alert) alerts.push(alert)
  })

  return alerts
}
