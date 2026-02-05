/**
 * Eventos Destacados del Mes - Hitos automáticos
 */

/**
 * Detecta mejor semana mental del mes
 */
function detectBestMentalWeek(lifeEntries, month) {
  const monthEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    e.created_at.startsWith(month)
  )

  if (monthEntries.length < 7) return null

  // Agrupar por semana
  const weeklyAverages = []
  const weekGroups = {}

  monthEntries.forEach(e => {
    const date = new Date(e.created_at)
    const weekKey = getWeekKey(date)
    if (!weekGroups[weekKey]) weekGroups[weekKey] = []
    weekGroups[weekKey].push(e.meta.mood_score)
  })

  Object.entries(weekGroups).forEach(([week, scores]) => {
    if (scores.length >= 3) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      weeklyAverages.push({ week, avg, count: scores.length })
    }
  })

  if (weeklyAverages.length === 0) return null

  const best = weeklyAverages.sort((a, b) => b.avg - a.avg)[0]

  return {
    type: 'best_mental_week',
    title: `Mejor semana mental: ${Math.round(best.avg * 10) / 10}/10`,
    week: best.week
  }
}

/**
 * Detecta peor semana mental del mes
 */
function detectWorstMentalWeek(lifeEntries, month) {
  const monthEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    e.created_at.startsWith(month)
  )

  if (monthEntries.length < 7) return null

  const weekGroups = {}
  monthEntries.forEach(e => {
    const date = new Date(e.created_at)
    const weekKey = getWeekKey(date)
    if (!weekGroups[weekKey]) weekGroups[weekKey] = []
    weekGroups[weekKey].push(e.meta.mood_score)
  })

  const weeklyAverages = []
  Object.entries(weekGroups).forEach(([week, scores]) => {
    if (scores.length >= 3) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length
      weeklyAverages.push({ week, avg })
    }
  })

  if (weeklyAverages.length === 0) return null

  const worst = weeklyAverages.sort((a, b) => a.avg - b.avg)[0]

  if (worst.avg < 5) {
    return {
      type: 'worst_mental_week',
      title: `Semana con estado mental bajo: ${Math.round(worst.avg * 10) / 10}/10`,
      week: worst.week
    }
  }

  return null
}

/**
 * Detecta racha física más larga del mes
 */
function detectLongestPhysicalStreak(lifeEntries, month) {
  const monthEntries = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    e.created_at.startsWith(month)
  )

  if (monthEntries.length < 3) return null

  const activeDays = Array.from(new Set(monthEntries.map(e => e.created_at.slice(0, 10))))
    .sort()
    .map(d => new Date(d))

  let longestStreak = 1
  let currentStreak = 1

  for (let i = 1; i < activeDays.length; i++) {
    const diffDays = Math.floor((activeDays[i] - activeDays[i - 1]) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      currentStreak++
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  if (longestStreak >= 5) {
    return {
      type: 'longest_streak',
      title: `Racha de ejercicio más larga: ${longestStreak} días consecutivos`
    }
  }

  return null
}

/**
 * Detecta mayor gasto semanal
 */
function detectHighestWeeklySpending(movimientos, month) {
  const monthMovs = movimientos.filter(m =>
    m.tipo === 'gasto' &&
    m.fecha.startsWith(month)
  )

  if (monthMovs.length < 5) return null

  const weeklySpending = {}
  monthMovs.forEach(m => {
    const date = new Date(m.fecha)
    const weekKey = getWeekKey(date)
    weeklySpending[weekKey] = (weeklySpending[weekKey] || 0) + m.monto
  })

  const weeks = Object.entries(weeklySpending)
  if (weeks.length === 0) return null

  const highest = weeks.sort((a, b) => b[1] - a[1])[0]
  const avgWeekly = weeks.reduce((sum, w) => sum + w[1], 0) / weeks.length

  if (highest[1] > avgWeekly * 1.5) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }

    return {
      type: 'highest_weekly_spending',
      title: `Mayor gasto semanal: ${formatAmount(highest[1])}`,
      week: highest[0]
    }
  }

  return null
}

/**
 * Detecta spike de gasto en categoría
 */
function detectCategorySpike(movimientos, month) {
  const monthMovs = movimientos.filter(m =>
    m.tipo === 'gasto' &&
    m.fecha.startsWith(month) &&
    m.categoria
  )

  if (monthMovs.length < 5) return null

  const categoryTotals = {}
  monthMovs.forEach(m => {
    categoryTotals[m.categoria] = (categoryTotals[m.categoria] || 0) + m.monto
  })

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])
  if (categories.length < 2) return null

  const top = categories[0]
  const second = categories[1]

  if (top[1] > second[1] * 2) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }

    return {
      type: 'category_spike',
      title: `Categoría dominante: ${top[0]} (${formatAmount(top[1])})`,
      category: top[0]
    }
  }

  return null
}

/**
 * Detecta cambio de tendencia mental
 */
function detectMentalTrendChange(lifeEntries, month) {
  const monthEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    e.created_at.startsWith(month)
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  if (monthEntries.length < 10) return null

  const firstHalf = monthEntries.slice(0, Math.floor(monthEntries.length / 2))
  const secondHalf = monthEntries.slice(Math.floor(monthEntries.length / 2))

  const firstAvg = firstHalf.reduce((sum, e) => sum + e.meta.mood_score, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((sum, e) => sum + e.meta.mood_score, 0) / secondHalf.length

  const diff = secondAvg - firstAvg

  if (Math.abs(diff) > 1.5) {
    const direction = diff > 0 ? 'mejoró' : 'empeoró'
    return {
      type: 'mental_trend_change',
      title: `Tendencia mental ${direction} hacia fin de mes`,
      diff
    }
  }

  return null
}

/**
 * Obtiene todos los eventos destacados del mes
 */
export function getMonthlyHighlights(movimientos, lifeEntries, month = null) {
  const now = new Date()
  const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const highlights = [
    detectBestMentalWeek(lifeEntries, targetMonth),
    detectWorstMentalWeek(lifeEntries, targetMonth),
    detectLongestPhysicalStreak(lifeEntries, targetMonth),
    detectHighestWeeklySpending(movimientos, targetMonth),
    detectCategorySpike(movimientos, targetMonth),
    detectMentalTrendChange(lifeEntries, targetMonth)
  ].filter(h => h !== null)

  return highlights
}

/**
 * Helper: obtiene clave de semana
 */
function getWeekKey(date) {
  const year = date.getFullYear()
  const week = getWeekNumber(date)
  return `${year}-W${week}`
}

/**
 * Helper: obtiene número de semana del año
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}
