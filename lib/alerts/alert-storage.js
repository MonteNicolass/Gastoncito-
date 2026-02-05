/**
 * Alert Storage Service
 * Manages predictive alerts in localStorage
 * No IndexedDB changes - fully backward compatible
 */

const ALERTS_KEY = 'gaston_predictive_alerts'
const DISMISSED_KEY = 'gaston_dismissed_alerts'
const ALERT_COOLDOWN_DAYS = 7

/**
 * Get all stored alerts
 */
export function getStoredAlerts() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(ALERTS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Save alerts to storage
 */
export function saveAlerts(alerts) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
  } catch (e) {
    console.warn('Failed to save alerts:', e)
  }
}

/**
 * Add or update an alert
 */
export function upsertAlert(alert) {
  const alerts = getStoredAlerts()
  const existingIndex = alerts.findIndex(a => a.id === alert.id)

  const now = Date.now()
  const alertData = {
    ...alert,
    last_triggered_at: now,
    first_detected_at: existingIndex >= 0 ? alerts[existingIndex].first_detected_at : now
  }

  if (existingIndex >= 0) {
    alerts[existingIndex] = alertData
  } else {
    alerts.push(alertData)
  }

  saveAlerts(alerts)
  return alertData
}

/**
 * Remove an alert by ID
 */
export function removeAlert(alertId) {
  const alerts = getStoredAlerts()
  const filtered = alerts.filter(a => a.id !== alertId)
  saveAlerts(filtered)
}

/**
 * Get dismissed alerts registry
 */
export function getDismissedAlerts() {
  if (typeof window === 'undefined') return {}

  try {
    const data = localStorage.getItem(DISMISSED_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

/**
 * Dismiss an alert (won't show for cooldown period)
 */
export function dismissAlert(alertId) {
  const dismissed = getDismissedAlerts()
  dismissed[alertId] = Date.now()

  // Clean old dismissals (older than cooldown)
  const cutoff = Date.now() - (ALERT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000)
  const cleaned = {}
  for (const [id, timestamp] of Object.entries(dismissed)) {
    if (timestamp > cutoff) {
      cleaned[id] = timestamp
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(cleaned))
  }

  // Also remove from active alerts
  removeAlert(alertId)
}

/**
 * Check if an alert is currently dismissed
 */
export function isAlertDismissed(alertId) {
  const dismissed = getDismissedAlerts()
  const dismissedAt = dismissed[alertId]

  if (!dismissedAt) return false

  const cooldownMs = ALERT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
  return Date.now() - dismissedAt < cooldownMs
}

/**
 * Get active alerts (not dismissed, sorted by severity)
 */
export function getActiveAlerts() {
  const alerts = getStoredAlerts()

  const severityOrder = { high: 0, medium: 1, low: 2 }

  return alerts
    .filter(a => !a.dismissed && !isAlertDismissed(a.id))
    .sort((a, b) => {
      // Sort by severity first, then by date
      const severityDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2)
      if (severityDiff !== 0) return severityDiff
      return (b.last_triggered_at || 0) - (a.last_triggered_at || 0)
    })
}

/**
 * Check if we've already triggered this alert type today
 */
export function hasTriggeredToday(alertId) {
  const alerts = getStoredAlerts()
  const alert = alerts.find(a => a.id === alertId)

  if (!alert?.last_triggered_at) return false

  const today = new Date().toDateString()
  const triggeredDate = new Date(alert.last_triggered_at).toDateString()

  return today === triggeredDate
}

/**
 * Check if alert was triggered within N days
 * Used for longer cooldowns (e.g., ratoneando: 14 days)
 */
export function hasTriggeredRecently(alertId, days = 7) {
  const alerts = getStoredAlerts()
  const alert = alerts.find(a => a.id === alertId)

  if (!alert?.last_triggered_at) return false

  const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)
  return alert.last_triggered_at > cutoff
}

/**
 * Mark an alert as acted upon (resolves it)
 */
export function resolveAlert(alertId) {
  removeAlert(alertId)
}

/**
 * Generate a unique alert ID based on type and entity
 */
export function generateAlertId(type, subtype, entityId = null) {
  const base = `${type}_${subtype}`
  return entityId ? `${base}_${entityId}` : base
}

/**
 * Clear all alerts (for testing/reset)
 */
export function clearAllAlerts() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(ALERTS_KEY)
  localStorage.removeItem(DISMISSED_KEY)
}
