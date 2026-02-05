// lib/overview-insights.js
// Cálculos rápidos para Visión General

/**
 * Money Insights
 */
export function getMoneyOverview(movimientos, categorias, wallets) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  // Movimientos del mes actual
  const currentMovs = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear
  })

  // Movimientos del mes anterior
  const prevMovs = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha.getMonth() === prevMonth && fecha.getFullYear() === prevYear
  })

  const gastos = currentMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
  const ingresos = currentMovs.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
  const balance = ingresos - gastos

  const prevGastos = prevMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)

  // Indicador vs mes anterior
  let trend = 'stable'
  let trendPercent = 0
  if (prevGastos > 0) {
    const delta = gastos - prevGastos
    trendPercent = Math.round((delta / prevGastos) * 100)
    if (trendPercent > 5) trend = 'up'
    else if (trendPercent < -5) trend = 'down'
  }

  // Categoría con mayor gasto
  const categoryMap = {}
  currentMovs.filter(m => m.tipo === 'gasto').forEach(m => {
    let catName = m.categoria || 'Sin categoría'
    if (m.category_id && categorias) {
      const cat = categorias.find(c => c.id === m.category_id)
      if (cat) catName = cat.nombre
    }
    categoryMap[catName] = (categoryMap[catName] || 0) + m.monto
  })

  const topCategory = Object.entries(categoryMap)
    .sort((a, b) => b[1] - a[1])[0]

  // Balance total de billeteras
  const walletsBalance = wallets ? wallets.reduce((sum, w) => sum + (w.saldo || 0), 0) : 0

  return {
    gastos,
    ingresos,
    balance,
    walletsBalance,
    trend,
    trendPercent,
    topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null
  }
}

/**
 * Mental Insights
 */
export function getMentalOverview(lifeEntries) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const mentalEntries = lifeEntries.filter(e => e.domain === 'mental' && e.meta?.mood_score)

  const recent7 = mentalEntries.filter(e => new Date(e.created_at) >= last7Days)
  const recent30 = mentalEntries.filter(e => new Date(e.created_at) >= last30Days)
  const previous7 = mentalEntries.filter(e => {
    const date = new Date(e.created_at)
    return date >= last14Days && date < last7Days
  })

  const avg7 = recent7.length > 0
    ? recent7.reduce((sum, e) => sum + e.meta.mood_score, 0) / recent7.length
    : 0

  const avg30 = recent30.length > 0
    ? recent30.reduce((sum, e) => sum + e.meta.mood_score, 0) / recent30.length
    : 0

  const prevAvg7 = previous7.length > 0
    ? previous7.reduce((sum, e) => sum + e.meta.mood_score, 0) / previous7.length
    : 0

  let trend = 'stable'
  if (avg7 > prevAvg7 + 0.5) trend = 'improving'
  else if (avg7 < prevAvg7 - 0.5) trend = 'declining'

  return {
    average7d: Math.round(avg7 * 10) / 10,
    average30d: Math.round(avg30 * 10) / 10,
    trend,
    count: recent7.length
  }
}

/**
 * Physical Insights
 */
export function getPhysicalOverview(lifeEntries) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const physicalEntries = lifeEntries.filter(e => e.domain === 'physical')
  const recent7 = physicalEntries.filter(e => new Date(e.created_at) >= last7Days)

  // Días activos (conteo de días únicos)
  const uniqueDays = new Set(recent7.map(e => {
    const date = new Date(e.created_at)
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }))

  const activeDays = uniqueDays.size

  // Racha actual (días consecutivos con al menos un hábito)
  let streak = 0
  let checkDate = new Date(now)
  checkDate.setHours(0, 0, 0, 0)

  while (streak < 100) {
    const dayStart = new Date(checkDate)
    const dayEnd = new Date(checkDate)
    dayEnd.setHours(23, 59, 59, 999)

    const hasActivity = physicalEntries.some(e => {
      const entryDate = new Date(e.created_at)
      return entryDate >= dayStart && entryDate <= dayEnd
    })

    if (hasActivity) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return {
    activeDays,
    streak
  }
}

/**
 * Goals Insights
 */
export function getGoalsOverview(goals) {
  const activeGoals = goals.filter(g => g.status === 'active')

  if (activeGoals.length === 0) {
    return {
      averageProgress: 0,
      atRisk: 0,
      total: goals.length
    }
  }

  // Progreso promedio
  const totalProgress = activeGoals.reduce((sum, g) => {
    const percent = Math.min(100, (g.progress / g.target) * 100)
    return sum + percent
  }, 0)

  const averageProgress = Math.round(totalProgress / activeGoals.length)

  // Objetivos en riesgo (progreso < 25%)
  const atRisk = activeGoals.filter(g => {
    const percent = (g.progress / g.target) * 100
    return percent < 25
  }).length

  return {
    averageProgress,
    atRisk,
    total: activeGoals.length
  }
}

/**
 * Behavior Insights
 */
export function getBehaviorOverview(behaviorInsights) {
  if (!behaviorInsights) return { activeAlerts: 0 }

  let activeAlerts = 0

  if (behaviorInsights.highSpendingStreak?.detected) activeAlerts++
  if (behaviorInsights.spendingVariability?.detected) activeAlerts++
  if (behaviorInsights.lowMoodStreak?.detected) activeAlerts++
  if (behaviorInsights.inactivity?.detected) activeAlerts++
  if (behaviorInsights.frequentDelivery?.detected) activeAlerts++

  return { activeAlerts }
}

/**
 * Weekly Summary
 */
export function getWeeklySummary(movimientos, lifeEntries, categorias, goals) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last14Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Money esta semana vs semana anterior
  const thisWeekMovs = movimientos.filter(m => new Date(m.fecha) >= last7Days)
  const prevWeekMovs = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha >= last14Days && fecha < last7Days
  })

  const thisWeekGastos = thisWeekMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
  const prevWeekGastos = prevWeekMovs.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)

  const moneyDelta = prevWeekGastos > 0 ? Math.round(((thisWeekGastos - prevWeekGastos) / prevWeekGastos) * 100) : 0
  const moneyTrend = moneyDelta > 10 ? 'up' : moneyDelta < -10 ? 'down' : 'stable'

  // Mental esta semana vs semana anterior
  const thisWeekMental = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last7Days
  )
  const prevWeekMental = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last14Days &&
    new Date(e.created_at) < last7Days
  )

  const thisWeekMentalAvg = thisWeekMental.length > 0
    ? thisWeekMental.reduce((sum, e) => sum + e.meta.mood_score, 0) / thisWeekMental.length
    : 0

  const prevWeekMentalAvg = prevWeekMental.length > 0
    ? prevWeekMental.reduce((sum, e) => sum + e.meta.mood_score, 0) / prevWeekMental.length
    : 0

  const mentalDelta = prevWeekMentalAvg > 0 ? Math.round(((thisWeekMentalAvg - prevWeekMentalAvg) / prevWeekMentalAvg) * 100) : 0
  const mentalTrend = thisWeekMentalAvg > prevWeekMentalAvg + 0.5 ? 'improving' : thisWeekMentalAvg < prevWeekMentalAvg - 0.5 ? 'declining' : 'stable'

  // Físico esta semana
  const thisWeekPhysical = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= last7Days
  )

  const uniqueDays = new Set(thisWeekPhysical.map(e => {
    const date = new Date(e.created_at)
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  }))

  const activeDays = uniqueDays.size

  // Objetivos activos con progreso
  const activeGoals = goals.filter(g => g.status === 'active')
  const onTrackGoals = activeGoals.filter(g => {
    const percent = (g.progress / g.target) * 100
    return percent >= 25
  }).length

  return {
    money: {
      thisWeek: thisWeekGastos,
      prevWeek: prevWeekGastos,
      delta: moneyDelta,
      trend: moneyTrend
    },
    mental: {
      thisWeek: Math.round(thisWeekMentalAvg * 10) / 10,
      prevWeek: Math.round(prevWeekMentalAvg * 10) / 10,
      delta: mentalDelta,
      trend: mentalTrend,
      count: thisWeekMental.length
    },
    physical: {
      activeDays,
      totalEntries: thisWeekPhysical.length
    },
    goals: {
      active: activeGoals.length,
      onTrack: onTrackGoals,
      atRisk: activeGoals.length - onTrackGoals
    }
  }
}

/**
 * Get all overview data
 */
export function getAllOverviewData(movimientos, lifeEntries, categorias, goals, behaviorInsights, wallets) {
  return {
    money: getMoneyOverview(movimientos, categorias, wallets),
    mental: getMentalOverview(lifeEntries),
    physical: getPhysicalOverview(lifeEntries),
    goals: getGoalsOverview(goals),
    behavior: getBehaviorOverview(behaviorInsights),
    weeklySummary: getWeeklySummary(movimientos, lifeEntries, categorias, goals)
  }
}
