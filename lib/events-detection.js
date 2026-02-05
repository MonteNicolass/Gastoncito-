/**
 * Detección de Eventos Importantes - Hitos automáticos
 */

/**
 * Detecta mejor semana mental
 */
export function detectBestMentalWeek(lifeEntries) {
  const now = new Date()
  const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const mentalEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last60Days
  )

  if (mentalEntries.length < 7) return null

  // Calcular promedios semanales
  const weeklyAverages = []
  const weeksToCheck = 8

  for (let i = 0; i < weeksToCheck; i++) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)

    const weekEntries = mentalEntries.filter(e => {
      const date = new Date(e.created_at)
      return date >= weekStart && date < weekEnd
    })

    if (weekEntries.length > 0) {
      const avg = weekEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / weekEntries.length
      weeklyAverages.push({ week: i, avg, start: weekStart, end: weekEnd })
    }
  }

  if (weeklyAverages.length < 2) return null

  // Encontrar la mejor semana (excluyendo la actual)
  const bestWeek = weeklyAverages
    .filter(w => w.week > 0)
    .sort((a, b) => b.avg - a.avg)[0]

  // Verificar si es significativamente mejor
  const otherWeeks = weeklyAverages.filter(w => w.week !== bestWeek.week)
  const otherAvg = otherWeeks.reduce((sum, w) => sum + w.avg, 0) / otherWeeks.length

  if (bestWeek.avg - otherAvg > 1.0) {
    return {
      type: 'best_mental_week',
      title: 'Mejor semana mental en 2 meses',
      description: `Promedio de ${Math.round(bestWeek.avg * 10) / 10}/10`,
      date: bestWeek.start,
      data: { avg: bestWeek.avg, comparison: otherAvg }
    }
  }

  return null
}

/**
 * Detecta mayor gasto diario del mes
 */
export function detectHighestDailySpending(movimientos) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthMovimientos = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear && m.tipo === 'gasto'
  })

  if (monthMovimientos.length < 5) return null

  // Agrupar por día
  const dailyTotals = {}
  monthMovimientos.forEach(m => {
    const date = new Date(m.fecha).toISOString().slice(0, 10)
    dailyTotals[date] = (dailyTotals[date] || 0) + m.monto
  })

  const days = Object.entries(dailyTotals)
  if (days.length === 0) return null

  const maxDay = days.sort((a, b) => b[1] - a[1])[0]
  const avgDay = days.reduce((sum, d) => sum + d[1], 0) / days.length

  // Solo reportar si es significativamente mayor
  if (maxDay[1] > avgDay * 2) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }

    const formatDate = (dateStr) => {
      const date = new Date(dateStr)
      return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    }

    return {
      type: 'highest_daily_spending',
      title: 'Mayor gasto diario del mes',
      description: `${formatAmount(maxDay[1])} el ${formatDate(maxDay[0])}`,
      date: new Date(maxDay[0]),
      data: { amount: maxDay[1], avg: avgDay }
    }
  }

  return null
}

/**
 * Detecta racha física más larga
 */
export function detectLongestPhysicalStreak(lifeEntries) {
  const now = new Date()
  const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const physicalEntries = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= last90Days
  )

  if (physicalEntries.length < 3) return null

  // Obtener días únicos ordenados
  const activeDaysSet = new Set(physicalEntries.map(e => {
    const d = new Date(e.created_at)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }))

  const activeDays = Array.from(activeDaysSet)
    .map(d => {
      const [year, month, day] = d.split('-')
      return new Date(parseInt(year), parseInt(month), parseInt(day))
    })
    .sort((a, b) => a - b)

  // Encontrar racha más larga
  let currentStreak = 1
  let maxStreak = 1
  let maxStreakEnd = activeDays[0]

  for (let i = 1; i < activeDays.length; i++) {
    const diffDays = Math.floor((activeDays[i] - activeDays[i - 1]) / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      currentStreak++
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
        maxStreakEnd = activeDays[i]
      }
    } else {
      currentStreak = 1
    }
  }

  if (maxStreak >= 5) {
    return {
      type: 'longest_physical_streak',
      title: 'Racha física más larga',
      description: `${maxStreak} días consecutivos`,
      date: maxStreakEnd,
      data: { streak: maxStreak }
    }
  }

  return null
}

/**
 * Detecta objetivo completado recientemente
 */
export function detectRecentGoalCompleted(goals) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const recentCompleted = goals.filter(g =>
    g.status === 'completed' &&
    g.updated_at &&
    new Date(g.updated_at) >= last7Days
  )

  if (recentCompleted.length === 0) return null

  const goal = recentCompleted[0]

  return {
    type: 'goal_completed',
    title: 'Objetivo cumplido',
    description: goal.title,
    date: new Date(goal.updated_at),
    data: { goal }
  }
}

/**
 * Detecta gasto mensual más bajo
 */
export function detectLowestMonthlySpending(movimientos) {
  const now = new Date()
  const last6Months = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

  const recentMovs = movimientos.filter(m =>
    m.tipo === 'gasto' &&
    new Date(m.fecha) >= last6Months
  )

  if (recentMovs.length < 20) return null

  // Agrupar por mes
  const monthlyTotals = {}
  recentMovs.forEach(m => {
    const date = new Date(m.fecha)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    monthlyTotals[key] = (monthlyTotals[key] || 0) + m.monto
  })

  const months = Object.entries(monthlyTotals)
  if (months.length < 3) return null

  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`
  const currentMonth = monthlyTotals[currentMonthKey]

  if (!currentMonth) return null

  const otherMonths = months.filter(m => m[0] !== currentMonthKey)
  const minOtherMonth = Math.min(...otherMonths.map(m => m[1]))

  // Solo reportar si es significativamente menor
  if (currentMonth < minOtherMonth * 0.8) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }

    return {
      type: 'lowest_monthly_spending',
      title: 'Mes con menor gasto',
      description: `${formatAmount(currentMonth)} este mes`,
      date: now,
      data: { amount: currentMonth, comparison: minOtherMonth }
    }
  }

  return null
}

/**
 * Detecta todos los eventos importantes
 */
export function detectAllEvents(movimientos, lifeEntries, goals) {
  const events = [
    detectBestMentalWeek(lifeEntries),
    detectHighestDailySpending(movimientos),
    detectLongestPhysicalStreak(lifeEntries),
    detectRecentGoalCompleted(goals),
    detectLowestMonthlySpending(movimientos)
  ].filter(e => e !== null)

  // Ordenar por fecha (más reciente primero)
  return events.sort((a, b) => b.date - a.date)
}
