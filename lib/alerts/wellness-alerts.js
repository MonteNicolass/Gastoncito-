/**
 * Wellness Alerts Engine
 * Detects mental and physical health patterns
 */

import { generateAlertId, hasTriggeredToday, isAlertDismissed } from './alert-storage'

/**
 * Generate wellness alerts from life entries
 * @param {Array} lifeEntries - All life entries
 */
export function generateWellnessAlerts(lifeEntries) {
  const alerts = []

  // Separate by domain
  const mentalEntries = lifeEntries.filter(e => e.domain === 'mental')
  const physicalEntries = lifeEntries.filter(e => e.domain === 'physical')

  // 1. Mental state alerts
  const mentalAlerts = detectMentalPatterns(mentalEntries)
  alerts.push(...mentalAlerts)

  // 2. Physical activity alerts
  const physicalAlerts = detectPhysicalInactivity(physicalEntries)
  alerts.push(...physicalAlerts)

  // 3. Cross-domain fatigue detection
  const fatigueAlert = detectFatigue(mentalEntries, physicalEntries)
  if (fatigueAlert) alerts.push(fatigueAlert)

  // Filter out dismissed and already triggered today
  return alerts.filter(a => !isAlertDismissed(a.id) && !hasTriggeredToday(a.id))
}

/**
 * Detect negative mental patterns
 * Alert if 3+ negative entries in 7 days
 */
function detectMentalPatterns(mentalEntries) {
  const alerts = []
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get entries from last 7 days
  const recentEntries = mentalEntries.filter(e => new Date(e.created_at) >= sevenDaysAgo)

  if (recentEntries.length < 3) return alerts // Need enough data

  // Count entries with low mood score (<=4)
  const lowMoodEntries = recentEntries.filter(e => {
    const score = e.meta?.mood_score
    return score && score <= 4
  })

  // Count entries with negative sentiment in text
  const negativePhrases = ['ansioso', 'ansiosa', 'estresado', 'estresada', 'cansado', 'cansada',
    'mal', 'triste', 'bajón', 'agotado', 'agotada', 'frustrado', 'frustrada',
    'preocupado', 'preocupada', 'nervioso', 'nerviosa', 'abrumado', 'abrumada']

  const negativeTextEntries = recentEntries.filter(e => {
    const text = (e.text || '').toLowerCase()
    return negativePhrases.some(phrase => text.includes(phrase))
  })

  const totalNegative = new Set([
    ...lowMoodEntries.map(e => e.id),
    ...negativeTextEntries.map(e => e.id)
  ]).size

  if (totalNegative >= 3) {
    // Detect the most common issue
    let dominantIssue = 'más bajo que de costumbre'
    let foundIssue = null

    for (const entry of [...lowMoodEntries, ...negativeTextEntries]) {
      const text = (entry.text || '').toLowerCase()
      if (text.includes('ansio')) { foundIssue = 'ansioso'; break }
      if (text.includes('estres')) { foundIssue = 'estresado'; break }
      if (text.includes('cansad') || text.includes('agotad')) { foundIssue = 'cansado'; break }
      if (text.includes('trist') || text.includes('bajón')) { foundIssue = 'triste'; break }
    }

    if (foundIssue) {
      dominantIssue = `más ${foundIssue} que de costumbre`
    }

    const alertId = generateAlertId('wellness', 'mental_pattern')

    alerts.push({
      id: alertId,
      type: 'wellness',
      subtype: 'mental_pattern',
      severity: totalNegative >= 5 ? 'high' : 'medium',
      title: 'Estado mental',
      message: `Últimamente te sentiste ${dominantIssue}`,
      detail: `${totalNegative} registros en 7 días`,
      entriesCount: totalNegative,
      action: {
        type: 'register_mood',
        label: 'Registrar estado'
      }
    })
  }

  // Check for declining trend
  const avgScore = recentEntries
    .filter(e => e.meta?.mood_score)
    .reduce((sum, e) => sum + e.meta.mood_score, 0) /
    recentEntries.filter(e => e.meta?.mood_score).length

  if (avgScore && avgScore < 5) {
    const alertId = generateAlertId('wellness', 'low_mood_avg')

    // Only add if not already alerting for pattern
    if (!alerts.some(a => a.subtype === 'mental_pattern')) {
      alerts.push({
        id: alertId,
        type: 'wellness',
        subtype: 'low_mood_avg',
        severity: avgScore < 4 ? 'high' : 'medium',
        title: 'Ánimo bajo',
        message: 'Tu estado promedio esta semana está bajo',
        detail: `Promedio: ${avgScore.toFixed(1)}/10`,
        avgScore,
        action: {
          type: 'set_goal',
          label: 'Fijar objetivo'
        }
      })
    }
  }

  return alerts
}

/**
 * Detect physical inactivity
 * Alert at 7, 14, 21 days without activity
 */
function detectPhysicalInactivity(physicalEntries) {
  const alerts = []
  const now = new Date()

  if (physicalEntries.length === 0) {
    // No physical entries ever - suggest starting
    const alertId = generateAlertId('wellness', 'no_physical_data')

    alerts.push({
      id: alertId,
      type: 'wellness',
      subtype: 'no_physical_data',
      severity: 'low',
      title: 'Actividad física',
      message: 'Todavía no registraste actividad física',
      detail: 'Empezar es lo más difícil',
      action: {
        type: 'register_activity',
        label: 'Registrar actividad'
      }
    })

    return alerts
  }

  // Find most recent activity
  const sortedEntries = [...physicalEntries].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )
  const lastActivity = new Date(sortedEntries[0].created_at)
  const daysSinceActivity = Math.floor((now - lastActivity) / (24 * 60 * 60 * 1000))

  // Alert thresholds: 7, 14, 21 days
  const thresholds = [
    { days: 21, severity: 'high', message: '21 días sin registrar ejercicio' },
    { days: 14, severity: 'medium', message: '14 días sin registrar ejercicio' },
    { days: 7, severity: 'low', message: '7 días sin registrar ejercicio' }
  ]

  for (const threshold of thresholds) {
    if (daysSinceActivity >= threshold.days) {
      const alertId = generateAlertId('wellness', `physical_inactive_${threshold.days}`)

      alerts.push({
        id: alertId,
        type: 'wellness',
        subtype: 'physical_inactivity',
        severity: threshold.severity,
        title: 'Actividad física',
        message: threshold.message,
        detail: `Último registro: ${formatDaysAgo(daysSinceActivity)}`,
        daysSinceActivity,
        lastActivity,
        action: {
          type: 'register_activity',
          label: 'Registrar actividad'
        }
      })

      break // Only show one threshold
    }
  }

  return alerts
}

/**
 * Detect fatigue pattern (mental + physical indicators)
 */
function detectFatigue(mentalEntries, physicalEntries) {
  const now = new Date()
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Recent mental entries
  const recentMental = mentalEntries.filter(e => new Date(e.created_at) >= fourteenDaysAgo)

  // Count fatigue-related mentions
  const fatiguePhrases = ['cansado', 'cansada', 'agotado', 'agotada', 'sin energía',
    'exhausto', 'exhausta', 'dormí mal', 'no dormí', 'insomnio']

  const fatigueEntries = recentMental.filter(e => {
    const text = (e.text || '').toLowerCase()
    return fatiguePhrases.some(phrase => text.includes(phrase))
  })

  // Check physical inactivity
  const recentPhysical = physicalEntries.filter(e => new Date(e.created_at) >= fourteenDaysAgo)
  const hasLowActivity = recentPhysical.length < 3 // Less than 3 activities in 2 weeks

  // Fatigue pattern: 3+ fatigue mentions AND low activity
  if (fatigueEntries.length >= 3 && hasLowActivity) {
    const alertId = generateAlertId('wellness', 'fatigue_pattern')

    return {
      id: alertId,
      type: 'wellness',
      subtype: 'fatigue_pattern',
      severity: 'medium',
      title: 'Cansancio acumulado',
      message: 'Muchos días de cansancio sin descanso',
      detail: 'Moverte un poco puede ayudar',
      fatigueCount: fatigueEntries.length,
      activityCount: recentPhysical.length,
      action: {
        type: 'suggest_light_activity',
        label: 'Actividad liviana'
      }
    }
  }

  return null
}

/**
 * Format days ago for display
 */
function formatDaysAgo(days) {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  if (days < 14) return 'Hace 1 semana'
  if (days < 21) return 'Hace 2 semanas'
  if (days < 30) return 'Hace 3 semanas'
  return 'Hace más de 1 mes'
}
