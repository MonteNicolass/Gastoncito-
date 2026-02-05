/**
 * Unified Alert Engine
 * Central orchestrator for all predictive alerts
 *
 * Usage:
 * const { alerts, suggestions } = await runAlertEngine(data)
 */

import {
  getActiveAlerts,
  upsertAlert,
  dismissAlert,
  resolveAlert,
  saveAlerts,
  getStoredAlerts
} from './alert-storage'

import { generateEconomicAlerts } from './economic-alerts'
import { generateWellnessAlerts } from './wellness-alerts'
import { generateMacroAlerts } from './macro-alerts'
import { generateRatoneandoAlerts, getRatoneandoAlertForChat } from './ratoneando-alerts'
import { getProactiveSuggestions, getPrimaryCta, formatSuggestionForChat } from './proactive-suggestions'
import { generateMiraPreciosAlerts } from '../mira-precios'
import { generateDietAlertsForEngine } from '../dieta'
import { getEconomicAlerts } from '../economic-alerts-engine'
import { getStoredPrices } from '../ratoneando/price-storage'

// Re-export for convenience
export {
  dismissAlert,
  resolveAlert,
  getActiveAlerts,
  getPrimaryCta,
  formatSuggestionForChat
}

export { getSuggestionIcon, getSuggestionColors } from './proactive-suggestions'

/**
 * Run the complete alert engine
 * Call this from the main app to generate/update alerts
 *
 * @param {Object} data - All required data
 * @param {Array} data.movimientos - User movements
 * @param {Array} data.lifeEntries - Life entries (mental, physical)
 * @param {Array} data.budgets - User budgets
 * @param {Array} data.subscriptions - User subscriptions
 * @param {Object} data.rates - Current market rates
 * @param {Object} data.context - User context (last entries, etc)
 * @param {Object} data.ratoneandoResult - Result from ratoneando engine
 * @param {Object} data.patterns - Purchase patterns from ratoneando
 */
export async function runAlertEngine(data) {
  const {
    movimientos = [],
    lifeEntries = [],
    budgets = [],
    subscriptions = [],
    rates = null,
    context = {},
    ratoneandoResult = null,
    patterns = null
  } = data

  // Generate V1 typed economic alerts (new engine)
  const priceHistory = (getStoredPrices() || []).map(p => ({
    product_name: p.product_name,
    price: p.price,
    fetched_at: p.fetched_at,
  }))
  const v1Alerts = getEconomicAlerts({ movimientos, subscriptions, priceHistory })

  // Generate all alert types (legacy + new)
  const economicAlerts = generateEconomicAlerts(movimientos, budgets, subscriptions, rates)
  const wellnessAlerts = generateWellnessAlerts(lifeEntries)
  const macroAlerts = generateMacroAlerts(movimientos, subscriptions)

  // Generate ratoneando alerts (integrated, not parallel)
  const ratoneandoAlerts = ratoneandoResult
    ? generateRatoneandoAlerts(ratoneandoResult, patterns)
    : []

  // Generate MiráPrecios alerts (price intelligence)
  const miraPreciosAlerts = generateMiraPreciosAlerts(movimientos)

  // Generate diet-aware alerts (optional, based on user diet)
  const dietAlerts = patterns ? generateDietAlertsForEngine(patterns) : []

  // Convert V1 alerts to unified format
  const v1Converted = v1Alerts.map(a => ({
    id: a.id,
    type: 'economic',
    subtype: a.type,
    severity: a.severity,
    title: a.type === 'daily_anomaly' ? 'Gasto diario alto' :
           a.type === 'monthly_overspend' ? 'Gasto mensual alto' :
           a.type === 'category_overflow' ? 'Categoría desbordada' :
           a.type === 'heavy_subscriptions' ? 'Suscripciones pesadas' :
           a.type === 'expensive_price' ? 'Precio caro' :
           'Sin registros',
    message: a.text,
    detail: a.text,
    action: {
      type: a.cta.action === 'navigate' ? 'view_movements' : 'chat_prefill',
      label: a.cta.label,
      href: a.cta.href
    }
  }))

  // Combine all alerts (V1 + legacy + other engines)
  const allNewAlerts = [...v1Converted, ...economicAlerts, ...wellnessAlerts, ...macroAlerts, ...ratoneandoAlerts, ...miraPreciosAlerts, ...dietAlerts]

  // Update storage with new alerts
  for (const alert of allNewAlerts) {
    upsertAlert(alert)
  }

  // Get active alerts (filters dismissed, sorts by severity)
  const activeAlerts = getActiveAlerts()

  // Generate proactive suggestions from alerts + context
  const suggestions = getProactiveSuggestions(activeAlerts, context)

  return {
    alerts: activeAlerts,
    suggestions,
    counts: {
      economic: economicAlerts.length,
      economicV1: v1Alerts.length,
      wellness: wellnessAlerts.length,
      macro: macroAlerts.length,
      ratoneando: ratoneandoAlerts.length,
      miraPrecios: miraPreciosAlerts.length,
      dieta: dietAlerts.length,
      total: activeAlerts.length
    }
  }
}

/**
 * Quick check for any active alerts (lightweight)
 * Use for badge counts, etc
 */
export function hasActiveAlerts() {
  return getActiveAlerts().length > 0
}

/**
 * Get alert count by type
 */
export function getAlertCounts() {
  const alerts = getActiveAlerts()

  return {
    total: alerts.length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
    economic: alerts.filter(a => a.type === 'economic').length,
    wellness: alerts.filter(a => a.type === 'wellness').length,
    macro: alerts.filter(a => a.type === 'macro').length
  }
}

/**
 * Get top N alerts by severity
 */
export function getTopAlerts(limit = 3) {
  return getActiveAlerts().slice(0, limit)
}

/**
 * Get alerts for a specific domain
 */
export function getAlertsByDomain(domain) {
  const typeMap = {
    'money': 'economic',
    'mental': 'wellness',
    'physical': 'wellness',
    'macro': 'macro'
  }

  const alertType = typeMap[domain] || domain

  return getActiveAlerts().filter(a => {
    if (alertType === 'wellness') {
      // For wellness, also filter by subtype
      if (domain === 'mental') {
        return a.type === 'wellness' && ['mental_pattern', 'low_mood_avg'].includes(a.subtype)
      }
      if (domain === 'physical') {
        return a.type === 'wellness' && ['physical_inactivity', 'no_physical_data', 'fatigue_pattern'].includes(a.subtype)
      }
    }
    return a.type === alertType
  })
}

/**
 * Get user context for suggestions
 * Call this to build the context object
 */
export async function buildUserContext(data) {
  const { lifeEntries = [], goals = [] } = data
  const now = new Date()
  const today = now.toDateString()

  // Check if user has logged mood today
  const hasMoodToday = lifeEntries.some(e => {
    return e.domain === 'mental' && new Date(e.created_at).toDateString() === today
  })

  // Check if user has logged activity today
  const hasActivityToday = lifeEntries.some(e => {
    return e.domain === 'physical' && new Date(e.created_at).toDateString() === today
  })

  // Check if goals were reviewed this week
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const checkedGoalsThisWeek = goals.some(g => {
    return g.updated_at && new Date(g.updated_at) > weekAgo
  })

  return {
    hasMoodToday,
    hasActivityToday,
    checkedGoalsThisWeek,
    checkedBudgetThisWeek: false, // Would need to track this separately
    dayOfWeek: now.getDay(),
    hour: now.getHours(),
    dayOfMonth: now.getDate()
  }
}

/**
 * Get the most important alert for chat context
 */
export function getPriorityAlertForChat() {
  const alerts = getActiveAlerts()
  if (alerts.length === 0) return null

  // Prioritize high severity, then most recent
  const highPriority = alerts.find(a => a.severity === 'high')
  return highPriority || alerts[0]
}

/**
 * Format alert for display
 */
export function formatAlertForDisplay(alert) {
  const severityColors = {
    high: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
    medium: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
    low: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
  }

  const severityIcons = {
    high: 'AlertTriangle',
    medium: 'AlertCircle',
    low: 'Info'
  }

  return {
    ...alert,
    colorClasses: severityColors[alert.severity] || severityColors.low,
    iconName: severityIcons[alert.severity] || 'Info'
  }
}

/**
 * Mark an alert as acted upon
 * This resolves the alert (removes it)
 */
export function actOnAlert(alertId) {
  resolveAlert(alertId)
}

/**
 * Utility: Clean old alerts (run periodically)
 */
export function cleanupOldAlerts() {
  const alerts = getStoredAlerts()
  const now = Date.now()
  const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days

  const cleaned = alerts.filter(a => {
    const age = now - (a.first_detected_at || 0)
    return age < maxAge
  })

  if (cleaned.length !== alerts.length) {
    saveAlerts(cleaned)
  }
}
