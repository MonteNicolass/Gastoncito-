/**
 * Retrospectiva Mensual - Resumen automático sin IA
 */

/**
 * Genera retrospectiva de Mental para el mes
 */
function generateMentalRetrospective(lifeEntries, currentMonth, previousMonth) {
  const currentEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    e.created_at.startsWith(currentMonth)
  )

  const previousEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    e.created_at.startsWith(previousMonth)
  )

  if (currentEntries.length === 0) return null

  const currentAvg = currentEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / currentEntries.length
  const previousAvg = previousEntries.length > 0
    ? previousEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / previousEntries.length
    : null

  // Estabilidad (desviación estándar)
  const scores = currentEntries.map(e => e.meta.mood_score)
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - currentAvg, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  const stability = stdDev < 1.5 ? 'estable' : stdDev < 2.5 ? 'variable' : 'muy variable'

  let text = `Este mes tu estado mental promedio fue ${Math.round(currentAvg * 10) / 10}/10`

  if (previousAvg !== null) {
    const diff = currentAvg - previousAvg
    if (Math.abs(diff) > 0.5) {
      const comparison = diff > 0 ? 'mejor' : 'peor'
      text += `, ${comparison} que el mes anterior`
    } else {
      text += `, similar al mes anterior`
    }
  }

  text += `. Fue ${stability} durante el período.`

  return {
    domain: 'mental',
    text,
    data: {
      avg: Math.round(currentAvg * 10) / 10,
      previousAvg: previousAvg ? Math.round(previousAvg * 10) / 10 : null,
      stability,
      stdDev: Math.round(stdDev * 10) / 10,
      entriesCount: currentEntries.length
    }
  }
}

/**
 * Genera retrospectiva de Físico para el mes
 */
function generatePhysicalRetrospective(lifeEntries, currentMonth) {
  const monthEntries = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    e.created_at.startsWith(currentMonth)
  )

  if (monthEntries.length === 0) return null

  // Días activos únicos
  const activeDays = new Set(monthEntries.map(e => e.created_at.slice(0, 10))).size

  // Rachas
  const sortedDays = Array.from(new Set(monthEntries.map(e => e.created_at.slice(0, 10))))
    .sort()
    .map(d => new Date(d))

  let longestStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDays.length; i++) {
    const diffDays = Math.floor((sortedDays[i] - sortedDays[i - 1]) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      currentStreak++
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      currentStreak = 1
    }
  }

  // Detectar caídas en segunda mitad
  const monthDate = new Date(currentMonth + '-01')
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
  const midMonth = Math.floor(daysInMonth / 2)

  const firstHalfDays = sortedDays.filter(d => d.getDate() <= midMonth).length
  const secondHalfDays = sortedDays.filter(d => d.getDate() > midMonth).length

  let text = `Registraste actividad física ${activeDays} de ${daysInMonth} días`

  if (longestStreak >= 5) {
    text += `, con una racha de ${longestStreak} días consecutivos`
  } else if (longestStreak >= 3) {
    text += `, con rachas cortas`
  }

  if (secondHalfDays < firstHalfDays * 0.6) {
    text += `. La actividad disminuyó en la segunda mitad del mes.`
  } else if (secondHalfDays > firstHalfDays * 1.4) {
    text += `. La actividad aumentó en la segunda mitad del mes.`
  } else {
    text += `. La actividad se mantuvo constante durante el mes.`
  }

  return {
    domain: 'physical',
    text,
    data: {
      activeDays,
      longestStreak,
      firstHalfDays,
      secondHalfDays,
      totalEntries: monthEntries.length
    }
  }
}

/**
 * Genera retrospectiva de Money para el mes
 */
function generateMoneyRetrospective(movimientos, categorias, currentMonth, previousMonth) {
  const currentMovs = movimientos.filter(m =>
    m.tipo === 'gasto' &&
    m.fecha.startsWith(currentMonth)
  )

  const previousMovs = movimientos.filter(m =>
    m.tipo === 'gasto' &&
    m.fecha.startsWith(previousMonth)
  )

  if (currentMovs.length === 0) return null

  const currentTotal = currentMovs.reduce((sum, m) => sum + m.monto, 0)
  const previousTotal = previousMovs.length > 0
    ? previousMovs.reduce((sum, m) => sum + m.monto, 0)
    : null

  // Top categorías
  const categoryTotals = {}
  currentMovs.forEach(m => {
    if (m.categoria) {
      categoryTotals[m.categoria] = (categoryTotals[m.categoria] || 0) + m.monto
    }
  })

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
  }

  let text = `El gasto total del mes fue ${formatAmount(currentTotal)}`

  if (previousTotal !== null && previousTotal > 0) {
    const diff = ((currentTotal - previousTotal) / previousTotal) * 100
    if (Math.abs(diff) > 5) {
      const direction = diff > 0 ? 'mayor' : 'menor'
      text += `, ${Math.abs(Math.round(diff))}% ${direction} que el mes anterior`
    }
  }

  if (topCategories.length > 0) {
    const topCat = topCategories[0][0]
    text += `, impulsado principalmente por ${topCat}.`
  } else {
    text += `.`
  }

  return {
    domain: 'money',
    text,
    data: {
      total: currentTotal,
      previousTotal,
      topCategories: topCategories.map(([name, amount]) => ({ name, amount })),
      movimientosCount: currentMovs.length
    }
  }
}

/**
 * Genera retrospectiva de Objetivos para el mes
 */
function generateGoalsRetrospective(goals) {
  const activeGoals = goals.filter(g => g.status === 'active')
  const completedThisMonth = goals.filter(g => {
    if (g.status !== 'completed' || !g.updated_at) return false
    const updated = new Date(g.updated_at)
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    return updated >= monthStart
  })

  if (activeGoals.length === 0 && completedThisMonth.length === 0) return null

  let text = ''

  if (completedThisMonth.length > 0) {
    text = `Cumpliste ${completedThisMonth.length} ${completedThisMonth.length === 1 ? 'objetivo' : 'objetivos'} este mes`
  }

  if (activeGoals.length > 0) {
    const avgProgress = activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length
    const onTrack = activeGoals.filter(g => (g.progress || 0) >= 50).length
    const stalled = activeGoals.filter(g => {
      if (!g.updated_at) return false
      const daysSince = Math.floor((Date.now() - new Date(g.updated_at)) / (1000 * 60 * 60 * 24))
      return daysSince >= 14 && (g.progress || 0) < 80
    }).length

    if (text) text += '. '
    text += `Progreso promedio de objetivos activos: ${Math.round(avgProgress)}%`

    if (stalled > 0) {
      text += `. ${stalled} ${stalled === 1 ? 'objetivo' : 'objetivos'} sin avance significativo.`
    } else if (onTrack > 0) {
      text += `. ${onTrack} en buen camino.`
    } else {
      text += `.`
    }
  }

  return {
    domain: 'goals',
    text,
    data: {
      activeCount: activeGoals.length,
      completedCount: completedThisMonth.length,
      avgProgress: activeGoals.length > 0
        ? Math.round(activeGoals.reduce((sum, g) => sum + (g.progress || 0), 0) / activeGoals.length)
        : 0
    }
  }
}

/**
 * Genera retrospectiva completa del mes
 */
export function generateMonthlyRetrospective(movimientos, lifeEntries, categorias, goals, month = null) {
  const now = new Date()
  const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const previousMonth = getPreviousMonth(currentMonth)

  return {
    month: currentMonth,
    mental: generateMentalRetrospective(lifeEntries, currentMonth, previousMonth),
    physical: generatePhysicalRetrospective(lifeEntries, currentMonth),
    money: generateMoneyRetrospective(movimientos, categorias, currentMonth, previousMonth),
    goals: generateGoalsRetrospective(goals)
  }
}

/**
 * Helper: obtiene mes anterior
 */
function getPreviousMonth(monthString) {
  const [year, month] = monthString.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  date.setMonth(date.getMonth() - 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}
