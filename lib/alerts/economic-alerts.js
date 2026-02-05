/**
 * Economic Alerts Engine
 * Detects spending anomalies, budget risks, and subscription issues
 */

import { generateAlertId, hasTriggeredToday, isAlertDismissed } from './alert-storage'

/**
 * Analyze spending patterns and generate alerts
 * @param {Array} movimientos - All movements
 * @param {Array} budgets - User budgets from localStorage
 * @param {Array} subscriptions - User subscriptions
 * @param {Object} rates - Current market rates
 */
export function generateEconomicAlerts(movimientos, budgets, subscriptions, rates) {
  const alerts = []

  // Get gastos only
  const gastos = movimientos.filter(m => m.tipo === 'gasto')

  // 1. Category spending anomalies
  const categoryAlerts = detectCategoryAnomalies(gastos)
  alerts.push(...categoryAlerts)

  // 2. Budget risk alerts
  const budgetAlerts = detectBudgetRisks(gastos, budgets)
  alerts.push(...budgetAlerts)

  // 3. Subscription price alerts
  const subscriptionAlerts = detectSubscriptionIssues(subscriptions, rates)
  alerts.push(...subscriptionAlerts)

  // 4. High spending day alert
  const spendingAlert = detectHighSpendingStreak(gastos)
  if (spendingAlert) alerts.push(spendingAlert)

  // Filter out dismissed and already triggered today
  return alerts.filter(a => !isAlertDismissed(a.id) && !hasTriggeredToday(a.id))
}

/**
 * Detect category spending anomalies (+20% vs 2-month average)
 */
function detectCategoryAnomalies(gastos) {
  const alerts = []
  const now = new Date()

  // Get current month gastos
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const currentMonthGastos = gastos.filter(g => {
    const d = new Date(g.fecha)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  // Get last 2 months gastos (excluding current)
  const twoMonthsAgo = new Date(currentYear, currentMonth - 2, 1)
  const lastMonthEnd = new Date(currentYear, currentMonth, 0)

  const historicalGastos = gastos.filter(g => {
    const d = new Date(g.fecha)
    return d >= twoMonthsAgo && d <= lastMonthEnd
  })

  // Group by category
  const currentByCategory = groupByCategory(currentMonthGastos)
  const historicalByCategory = groupByCategory(historicalGastos)

  // Calculate days elapsed in current month for projection
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const projectionMultiplier = daysInMonth / dayOfMonth

  for (const [category, currentTotal] of Object.entries(currentByCategory)) {
    if (!category || category === 'undefined') continue

    const historicalTotal = historicalByCategory[category] || 0
    if (historicalTotal === 0) continue

    // Average per month over 2 months
    const avgMonthly = historicalTotal / 2

    // Project current month total
    const projectedTotal = currentTotal * projectionMultiplier

    // Check if +20% above average
    const percentChange = ((projectedTotal - avgMonthly) / avgMonthly) * 100

    if (percentChange >= 20) {
      const alertId = generateAlertId('economic', 'category_anomaly', category)

      alerts.push({
        id: alertId,
        type: 'economic',
        subtype: 'category_anomaly',
        severity: percentChange >= 50 ? 'high' : 'medium',
        title: `Gasto en ${category}`,
        message: `Estás gastando más en ${category.toLowerCase()} que lo habitual`,
        detail: `+${Math.round(percentChange)}% vs promedio`,
        category,
        currentTotal,
        avgMonthly,
        percentChange: Math.round(percentChange),
        action: {
          type: 'adjust_budget',
          label: 'Ajustar presupuesto',
          category
        }
      })
    }
  }

  return alerts
}

/**
 * Detect budget risk (projected to exceed)
 */
function detectBudgetRisks(gastos, budgets) {
  const alerts = []
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Current month gastos
  const currentMonthGastos = gastos.filter(g => {
    const d = new Date(g.fecha)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const remainingDays = daysInMonth - dayOfMonth

  for (const budget of budgets) {
    let spent = 0

    if (budget.type === 'category') {
      spent = currentMonthGastos
        .filter(g => g.categoria === budget.target)
        .reduce((sum, g) => sum + g.monto, 0)
    } else if (budget.type === 'wallet') {
      spent = currentMonthGastos
        .filter(g => g.metodo === budget.target)
        .reduce((sum, g) => sum + g.monto, 0)
    }

    const percentUsed = (spent / budget.amount) * 100
    const dailyAvg = dayOfMonth > 0 ? spent / dayOfMonth : 0
    const projected = spent + (dailyAvg * remainingDays)
    const daysUntilExceeded = dailyAvg > 0 ? Math.floor((budget.amount - spent) / dailyAvg) : Infinity

    // Alert if projected to exceed or already >85%
    if (projected > budget.amount && percentUsed < 100 && daysUntilExceeded <= 14) {
      const alertId = generateAlertId('economic', 'budget_risk', `${budget.type}_${budget.target}`)

      alerts.push({
        id: alertId,
        type: 'economic',
        subtype: 'budget_risk',
        severity: daysUntilExceeded <= 5 ? 'high' : 'medium',
        title: `Presupuesto ${budget.target}`,
        message: daysUntilExceeded <= 0
          ? `Ya superaste el presupuesto de ${budget.target.toLowerCase()}`
          : `Si seguís así, vas a superar el presupuesto en ${daysUntilExceeded} días`,
        detail: `${Math.round(percentUsed)}% usado`,
        budget,
        spent,
        percentUsed: Math.round(percentUsed),
        daysUntilExceeded,
        action: {
          type: 'view_budget',
          label: 'Ver presupuesto',
          budgetId: budget.id
        }
      })
    }

    // Alert if already exceeded
    if (percentUsed >= 100) {
      const alertId = generateAlertId('economic', 'budget_exceeded', `${budget.type}_${budget.target}`)

      alerts.push({
        id: alertId,
        type: 'economic',
        subtype: 'budget_exceeded',
        severity: 'high',
        title: `Presupuesto superado`,
        message: `Superaste el presupuesto de ${budget.target.toLowerCase()}`,
        detail: `${Math.round(percentUsed)}% del límite`,
        budget,
        spent,
        percentUsed: Math.round(percentUsed),
        action: {
          type: 'adjust_budget',
          label: 'Ajustar límite',
          budgetId: budget.id
        }
      })
    }
  }

  return alerts
}

/**
 * Detect subscription price issues (due to USD/taxes)
 */
function detectSubscriptionIssues(subscriptions, rates) {
  const alerts = []

  if (!rates) return alerts

  // Check for USD subscriptions with significant price changes
  for (const sub of subscriptions) {
    // This would compare with stored historical prices
    // For now, we flag USD subs where the rate has moved significantly
    if (sub.currency === 'USD' || sub.name?.toLowerCase().includes('chatgpt') ||
        sub.name?.toLowerCase().includes('claude') || sub.name?.toLowerCase().includes('github')) {
      // We'd need historical rate data to detect changes
      // For now, just ensure users are aware of USD subs
    }
  }

  return alerts
}

/**
 * Detect high spending streak (3+ days above average)
 */
function detectHighSpendingStreak(gastos) {
  const now = new Date()

  // Get last 30 days average
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const last30Days = gastos.filter(g => new Date(g.fecha) >= thirtyDaysAgo)

  if (last30Days.length < 10) return null // Need enough data

  const totalLast30 = last30Days.reduce((sum, g) => sum + g.monto, 0)
  const dailyAvg = totalLast30 / 30

  // Check last 3 days
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
  const last3Days = gastos.filter(g => new Date(g.fecha) >= threeDaysAgo)

  const totalLast3 = last3Days.reduce((sum, g) => sum + g.monto, 0)
  const avgLast3 = totalLast3 / 3

  // If last 3 days avg is 50%+ higher than 30-day avg
  if (avgLast3 > dailyAvg * 1.5 && totalLast3 > dailyAvg * 2) {
    const alertId = generateAlertId('economic', 'spending_streak')

    return {
      id: alertId,
      type: 'economic',
      subtype: 'spending_streak',
      severity: avgLast3 > dailyAvg * 2 ? 'high' : 'medium',
      title: 'Racha de gasto alto',
      message: 'Los últimos días gastaste más de lo habitual',
      detail: `Promedio últimos 3 días: $${Math.round(avgLast3).toLocaleString('es-AR')}`,
      dailyAvg,
      avgLast3,
      action: {
        type: 'view_movements',
        label: 'Ver movimientos'
      }
    }
  }

  return null
}

/**
 * Helper: Group gastos by category
 */
function groupByCategory(gastos) {
  const grouped = {}
  for (const g of gastos) {
    const cat = g.categoria || 'Otro'
    grouped[cat] = (grouped[cat] || 0) + g.monto
  }
  return grouped
}

/**
 * Format currency for alerts
 */
export function formatAlertAmount(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0
  }).format(amount)
}
