/**
 * Macro Contextual Alerts
 * Only shows macro data when it directly impacts user
 * NEVER shows inflation/USD alone - always tied to user spending
 */

import { generateAlertId, hasTriggeredToday, isAlertDismissed } from './alert-storage'
import { getCurrentInflation, compareWithInflation } from '../services/macro-snapshots'
import { getUsdChangePercent, getCachedRates } from '../services/market-rates'

/**
 * Generate macro-context alerts
 * @param {Array} movimientos - User movements
 * @param {Array} subscriptions - User subscriptions (USD ones)
 */
export function generateMacroAlerts(movimientos, subscriptions) {
  const alerts = []

  // 1. User spending vs inflation
  const inflationAlert = detectInflationImpact(movimientos)
  if (inflationAlert) alerts.push(inflationAlert)

  // 2. USD rate impact on subscriptions
  const usdAlert = detectUsdImpactOnSubs(subscriptions)
  if (usdAlert) alerts.push(usdAlert)

  // Filter out dismissed and already triggered today
  return alerts.filter(a => !isAlertDismissed(a.id) && !hasTriggeredToday(a.id))
}

/**
 * Detect inflation impact on user spending
 * Only alert if user's spending change differs significantly from inflation
 */
function detectInflationImpact(movimientos) {
  const inflation = getCurrentInflation()
  if (!inflation?.monthly) return null

  const gastos = movimientos.filter(m => m.tipo === 'gasto')
  if (gastos.length < 20) return null // Need enough data

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Get current month and previous month spending
  const currentMonthGastos = gastos.filter(g => {
    const d = new Date(g.fecha)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const prevMonthGastos = gastos.filter(g => {
    const d = new Date(g.fecha)
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear
  })

  if (currentMonthGastos.length < 5 || prevMonthGastos.length < 5) return null

  // Calculate spending change
  const currentTotal = currentMonthGastos.reduce((sum, g) => sum + g.monto, 0)
  const prevTotal = prevMonthGastos.reduce((sum, g) => sum + g.monto, 0)

  // Adjust for partial month
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const projectedCurrent = (currentTotal / dayOfMonth) * daysInMonth

  const spendingChange = ((projectedCurrent - prevTotal) / prevTotal) * 100

  // Compare with inflation
  const comparison = compareWithInflation(spendingChange)
  if (!comparison) return null

  // Only alert if spending is significantly above inflation (+10% more)
  if (comparison.status === 'above' && comparison.difference >= 10) {
    const alertId = generateAlertId('macro', 'spending_above_inflation')

    return {
      id: alertId,
      type: 'macro',
      subtype: 'spending_above_inflation',
      severity: comparison.difference >= 20 ? 'high' : 'medium',
      title: 'Gasto vs inflación',
      message: `Tu gasto subió ${Math.round(spendingChange)}%. Inflación del mes: ${inflation.monthly}%`,
      detail: `Estás ${Math.round(comparison.difference)}% arriba de la inflación`,
      userSpendingChange: Math.round(spendingChange),
      inflation: inflation.monthly,
      difference: Math.round(comparison.difference),
      action: {
        type: 'view_insights',
        label: 'Ver análisis'
      }
    }
  }

  // Positive alert: user beat inflation
  if (comparison.status === 'below' && Math.abs(comparison.difference) >= 5) {
    const alertId = generateAlertId('macro', 'spending_below_inflation')

    return {
      id: alertId,
      type: 'macro',
      subtype: 'spending_below_inflation',
      severity: 'low',
      title: 'Bien ahí',
      message: `Tu gasto subió ${Math.round(spendingChange)}%, menos que la inflación (${inflation.monthly}%)`,
      detail: 'Estás controlando bien los gastos',
      userSpendingChange: Math.round(spendingChange),
      inflation: inflation.monthly,
      difference: Math.round(comparison.difference),
      action: null // Positive, no action needed
    }
  }

  return null
}

/**
 * Detect USD rate impact on subscriptions
 * Only alert if user has USD subs and rate changed significantly
 */
function detectUsdImpactOnSubs(subscriptions) {
  const rates = getCachedRates()
  if (!rates) return null

  // Find USD subscriptions
  const usdSubs = subscriptions.filter(sub => {
    const name = sub.name?.toLowerCase() || ''
    return name.includes('chatgpt') || name.includes('claude') ||
           name.includes('github') || name.includes('notion') ||
           name.includes('midjourney') || name.includes('adobe') ||
           name.includes('vercel') || name.includes('microsoft') ||
           sub.currency === 'USD'
  })

  if (usdSubs.length === 0) return null

  // Get USD change over 30 days
  const usdChange = getUsdChangePercent(30)
  if (usdChange === null || Math.abs(usdChange) < 5) return null

  // Calculate total monthly USD spend
  const totalUsd = usdSubs.reduce((sum, sub) => {
    // Rough estimate based on common prices
    if (sub.name?.toLowerCase().includes('chatgpt')) return sum + 20
    if (sub.name?.toLowerCase().includes('claude')) return sum + 20
    if (sub.name?.toLowerCase().includes('github')) return sum + 10
    if (sub.name?.toLowerCase().includes('notion')) return sum + 10
    return sum + 15 // Default estimate
  }, 0)

  // Calculate ARS impact
  const currentRate = rates.tarjeta?.sell || rates.blue?.sell || 1500
  const oldRate = currentRate / (1 + usdChange / 100)
  const arsImpact = totalUsd * (currentRate - oldRate)

  if (usdChange > 5) {
    const alertId = generateAlertId('macro', 'usd_impact_subs')

    return {
      id: alertId,
      type: 'macro',
      subtype: 'usd_impact_subs',
      severity: usdChange > 15 ? 'high' : 'medium',
      title: 'Suscripciones USD',
      message: `El dólar subió ${Math.round(usdChange)}% este mes`,
      detail: `Impacto estimado: +$${Math.round(arsImpact).toLocaleString('es-AR')} en suscripciones`,
      usdChange: Math.round(usdChange),
      subsCount: usdSubs.length,
      arsImpact: Math.round(arsImpact),
      action: {
        type: 'view_subscriptions',
        label: 'Ver suscripciones'
      }
    }
  }

  return null
}

/**
 * Generate category-specific inflation context
 * For use in detailed views, not as standalone alerts
 */
export function getCategoryInflationContext(categoryName, userCategoryChange) {
  const inflation = getCurrentInflation()
  if (!inflation?.monthly) return null

  // Category-specific inflation multipliers
  const categoryMultipliers = {
    'comida': 1.2,       // Food: 20% above general
    'transporte': 1.1,   // Transport: 10% above
    'servicios': 1.5,    // Utilities: 50% above
    'salud': 1.3,        // Health: 30% above
    'educación': 1.1,    // Education: 10% above
    'entretenimiento': 0.9 // Entertainment: 10% below
  }

  const multiplier = categoryMultipliers[categoryName.toLowerCase()] || 1.0
  const categoryInflation = inflation.monthly * multiplier

  const comparison = {
    userChange: userCategoryChange,
    categoryInflation,
    generalInflation: inflation.monthly,
    difference: userCategoryChange - categoryInflation,
    status: userCategoryChange > categoryInflation + 2 ? 'above' :
            userCategoryChange < categoryInflation - 2 ? 'below' : 'similar'
  }

  return comparison
}
