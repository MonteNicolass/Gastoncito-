// lib/insights/mentalInsights.js
// Helpers puros para análisis de datos de Mental

/**
 * Obtiene entries de mental con mood_score en últimos N días
 */
function getMentalEntriesInRange(lifeEntries, days) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  return lifeEntries
    .filter(e => e.domain === 'mental' && e.meta?.mood_score)
    .filter(e => {
      const created = new Date(e.created_at)
      return created >= startDate && created < today
    })
    .map(e => ({
      date: e.created_at,
      score: e.meta.mood_score
    }))
}

/**
 * Calcula promedio de mood en N días
 */
export function getAverageMood(lifeEntries, days = 7) {
  const entries = getMentalEntriesInRange(lifeEntries, days)

  if (entries.length === 0) {
    return null
  }

  const sum = entries.reduce((acc, e) => acc + e.score, 0)
  const avg = sum / entries.length

  return {
    average: parseFloat(avg.toFixed(2)),
    count: entries.length
  }
}

/**
 * Calcula variabilidad (desviación estándar simple)
 */
export function getMoodVariability(lifeEntries, days = 7) {
  const entries = getMentalEntriesInRange(lifeEntries, days)

  if (entries.length < 2) {
    return null
  }

  const scores = entries.map(e => e.score)
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length

  const squaredDiffs = scores.map(score => Math.pow(score - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / scores.length
  const stdDev = Math.sqrt(variance)

  return {
    stdDev: parseFloat(stdDev.toFixed(2)),
    interpretation: stdDev < 0.5 ? 'Estable' : stdDev < 1.5 ? 'Variable' : 'Muy variable'
  }
}

/**
 * Detecta rachas (streaks) de estados altos o bajos
 */
export function getMoodStreaks(lifeEntries, days = 30) {
  const entries = getMentalEntriesInRange(lifeEntries, days)

  if (entries.length < 3) {
    return {
      lowStreak: null,
      highStreak: null
    }
  }

  // Ordenar por fecha
  const sorted = entries.sort((a, b) => new Date(a.date) - new Date(b.date))

  // Detectar rachas bajas (≤4) y altas (≥7)
  let lowStreak = 0
  let highStreak = 0
  let maxLowStreak = 0
  let maxHighStreak = 0

  sorted.forEach(e => {
    if (e.score <= 4) {
      lowStreak++
      highStreak = 0
      if (lowStreak > maxLowStreak) {
        maxLowStreak = lowStreak
      }
    } else if (e.score >= 7) {
      highStreak++
      lowStreak = 0
      if (highStreak > maxHighStreak) {
        maxHighStreak = highStreak
      }
    } else {
      lowStreak = 0
      highStreak = 0
    }
  })

  return {
    lowStreak: maxLowStreak >= 3 ? maxLowStreak : null,
    highStreak: maxHighStreak >= 3 ? maxHighStreak : null
  }
}

/**
 * Obtiene tendencia (últimos 7 días vs anteriores 7 días)
 */
export function getMoodTrend(lifeEntries) {
  const last7 = getAverageMood(lifeEntries, 7)
  const previous7 = (() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const start = new Date(today)
    start.setDate(today.getDate() - 14)
    const end = new Date(today)
    end.setDate(today.getDate() - 7)

    const entries = lifeEntries
      .filter(e => e.domain === 'mental' && e.meta?.mood_score)
      .filter(e => {
        const created = new Date(e.created_at)
        return created >= start && created < end
      })

    if (entries.length === 0) return null

    const sum = entries.reduce((acc, e) => acc + e.meta.mood_score, 0)
    return {
      average: parseFloat((sum / entries.length).toFixed(2)),
      count: entries.length
    }
  })()

  if (!last7 || !previous7) {
    return null
  }

  const delta = last7.average - previous7.average

  return {
    current: last7.average,
    previous: previous7.average,
    delta: parseFloat(delta.toFixed(2)),
    trend: delta > 0.3 ? 'Mejorando' : delta < -0.3 ? 'Bajando' : 'Estable'
  }
}
