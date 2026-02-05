/**
 * Historia Personal - Resúmenes textuales automáticos por períodos
 * NO IA - Solo métricas + comparación neutral
 */

/**
 * Genera resumen textual para últimos 7 días
 */
export function get7DaysSummary(movimientos, lifeEntries, categorias) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Movimientos
  const currentMovs = movimientos.filter(m => new Date(m.fecha) >= last7Days && m.tipo === 'gasto')
  const prevMovs = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha >= prev7Days && fecha < last7Days && m.tipo === 'gasto'
  })

  const currentSpend = currentMovs.reduce((sum, m) => sum + m.monto, 0)
  const prevSpend = prevMovs.reduce((sum, m) => sum + m.monto, 0)
  const avgDaily = currentSpend / 7

  // Mental
  const currentMental = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last7Days
  )
  const prevMental = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= prev7Days &&
    new Date(e.created_at) < last7Days
  )

  const currentMentalAvg = currentMental.length > 0
    ? currentMental.reduce((sum, e) => sum + e.meta.mood_score, 0) / currentMental.length
    : null
  const prevMentalAvg = prevMental.length > 0
    ? prevMental.reduce((sum, e) => sum + e.meta.mood_score, 0) / prevMental.length
    : null

  // Físico
  const currentPhysical = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= last7Days
  )
  const prevPhysical = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= prev7Days &&
    new Date(e.created_at) < last7Days
  )

  const currentActiveDays = new Set(currentPhysical.map(e => {
    const d = new Date(e.created_at)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  })).size

  const prevActiveDays = new Set(prevPhysical.map(e => {
    const d = new Date(e.created_at)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  })).size

  const insights = []

  // Gasto
  if (currentMovs.length > 0) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }
    insights.push(`En los últimos 7 días tu gasto promedio fue ${formatAmount(avgDaily)}/día`)

    if (prevSpend > 0) {
      const delta = ((currentSpend - prevSpend) / prevSpend) * 100
      if (Math.abs(delta) > 10) {
        const direction = delta > 0 ? 'aumentó' : 'disminuyó'
        insights.push(`Tu gasto ${direction} ${Math.abs(Math.round(delta))}% respecto a la semana anterior`)
      }
    }
  }

  // Mental
  if (currentMentalAvg !== null) {
    insights.push(`Tu estado mental promedio fue ${Math.round(currentMentalAvg * 10) / 10}/10`)

    if (prevMentalAvg !== null) {
      const delta = currentMentalAvg - prevMentalAvg
      if (Math.abs(delta) > 0.5) {
        const trend = delta > 0 ? 'mejor' : 'peor'
        insights.push(`Tu estado mental fue ${trend} que la semana anterior`)
      } else {
        insights.push(`Tu estado mental se mantuvo estable`)
      }
    }
  }

  // Físico
  if (currentPhysical.length > 0) {
    insights.push(`Registraste actividad física ${currentActiveDays} de 7 días`)

    if (prevActiveDays > 0) {
      const delta = currentActiveDays - prevActiveDays
      if (delta > 0) {
        insights.push(`Aumentaste ${delta} días activos respecto a la semana anterior`)
      } else if (delta < 0) {
        insights.push(`La actividad física disminuyó ${Math.abs(delta)} días`)
      }
    }
  }

  return {
    period: '7 días',
    insights,
    data: {
      spending: currentSpend,
      avgDaily,
      mentalAvg: currentMentalAvg,
      activeDays: currentActiveDays
    }
  }
}

/**
 * Genera resumen textual para últimos 30 días
 */
export function get30DaysSummary(movimientos, lifeEntries, categorias) {
  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const prev30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  // Movimientos
  const currentMovs = movimientos.filter(m => new Date(m.fecha) >= last30Days && m.tipo === 'gasto')
  const prevMovs = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha >= prev30Days && fecha < last30Days && m.tipo === 'gasto'
  })

  const currentSpend = currentMovs.reduce((sum, m) => sum + m.monto, 0)
  const prevSpend = prevMovs.reduce((sum, m) => sum + m.monto, 0)

  // Top categoría
  const categoryTotals = {}
  currentMovs.forEach(m => {
    if (m.categoria) {
      categoryTotals[m.categoria] = (categoryTotals[m.categoria] || 0) + m.monto
    }
  })
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

  // Mental
  const currentMental = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last30Days
  )
  const prevMental = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= prev30Days &&
    new Date(e.created_at) < last30Days
  )

  const currentMentalAvg = currentMental.length > 0
    ? currentMental.reduce((sum, e) => sum + e.meta.mood_score, 0) / currentMental.length
    : null
  const prevMentalAvg = prevMental.length > 0
    ? prevMental.reduce((sum, e) => sum + e.meta.mood_score, 0) / prevMental.length
    : null

  // Variabilidad mental
  let mentalVariability = null
  if (currentMental.length > 1) {
    const scores = currentMental.map(e => e.meta.mood_score)
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length
    mentalVariability = Math.sqrt(variance)
  }

  // Físico
  const currentPhysical = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= last30Days
  )

  const currentActiveDays = new Set(currentPhysical.map(e => {
    const d = new Date(e.created_at)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  })).size

  const insights = []

  // Gasto
  if (currentMovs.length > 0) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }
    insights.push(`En los últimos 30 días gastaste ${formatAmount(currentSpend)} en total`)

    if (topCategory) {
      insights.push(`Tu mayor gasto fue en ${topCategory[0]} (${formatAmount(topCategory[1])})`)
    }

    if (prevSpend > 0) {
      const delta = ((currentSpend - prevSpend) / prevSpend) * 100
      if (Math.abs(delta) > 5) {
        const direction = delta > 0 ? 'aumentó' : 'disminuyó'
        insights.push(`Tu gasto mensual ${direction} ${Math.abs(Math.round(delta))}% respecto al período anterior`)
      }
    }
  }

  // Mental
  if (currentMentalAvg !== null) {
    insights.push(`Tu estado mental promedio fue ${Math.round(currentMentalAvg * 10) / 10}/10`)

    if (mentalVariability !== null) {
      if (mentalVariability < 1.5) {
        insights.push(`Tu estado mental fue estable durante el mes`)
      } else if (mentalVariability > 2.5) {
        insights.push(`Tu estado mental tuvo alta variabilidad`)
      }
    }
  }

  // Físico
  if (currentPhysical.length > 0) {
    insights.push(`Registraste actividad física ${currentActiveDays} de 30 días`)
    const consistency = (currentActiveDays / 30) * 100
    if (consistency >= 50) {
      insights.push(`Mantuviste buena consistencia física (${Math.round(consistency)}%)`)
    } else if (consistency < 30) {
      insights.push(`La actividad física fue irregular este mes`)
    }
  }

  return {
    period: '30 días',
    insights,
    data: {
      spending: currentSpend,
      mentalAvg: currentMentalAvg,
      mentalVariability,
      activeDays: currentActiveDays,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null
    }
  }
}

/**
 * Genera resumen textual para últimos 90 días
 */
export function get90DaysSummary(movimientos, lifeEntries, categorias) {
  const now = new Date()
  const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Movimientos
  const currentMovs = movimientos.filter(m => new Date(m.fecha) >= last90Days && m.tipo === 'gasto')
  const currentSpend = currentMovs.reduce((sum, m) => sum + m.monto, 0)
  const avgMonthly = currentSpend / 3

  // Mental - tendencia general
  const mentalEntries = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last90Days
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  let mentalTrend = null
  if (mentalEntries.length > 5) {
    // Comparar primeros 30 días vs últimos 30 días
    const first30 = mentalEntries.slice(0, Math.floor(mentalEntries.length / 3))
    const last30 = mentalEntries.slice(-Math.floor(mentalEntries.length / 3))

    const firstAvg = first30.reduce((sum, e) => sum + e.meta.mood_score, 0) / first30.length
    const lastAvg = last30.reduce((sum, e) => sum + e.meta.mood_score, 0) / last30.length

    const delta = lastAvg - firstAvg
    if (delta > 0.5) mentalTrend = 'mejorando'
    else if (delta < -0.5) mentalTrend = 'empeorando'
    else mentalTrend = 'estable'
  }

  // Físico
  const physicalEntries = lifeEntries.filter(e =>
    e.domain === 'physical' &&
    new Date(e.created_at) >= last90Days
  )

  const activeDays = new Set(physicalEntries.map(e => {
    const d = new Date(e.created_at)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  })).size

  const insights = []

  // Gasto
  if (currentMovs.length > 0) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }
    insights.push(`En los últimos 90 días tu gasto promedio mensual fue ${formatAmount(avgMonthly)}`)

    // Mes con mayor gasto
    const monthlySpend = {}
    currentMovs.forEach(m => {
      const date = new Date(m.fecha)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      monthlySpend[key] = (monthlySpend[key] || 0) + m.monto
    })
    const maxMonth = Object.entries(monthlySpend).sort((a, b) => b[1] - a[1])[0]
    if (maxMonth) {
      const [year, month] = maxMonth[0].split('-')
      const monthName = new Date(parseInt(year), parseInt(month)).toLocaleDateString('es-AR', { month: 'long' })
      insights.push(`${monthName} fue el mes con mayor gasto (${formatAmount(maxMonth[1])})`)
    }
  }

  // Mental
  if (mentalTrend) {
    if (mentalTrend === 'mejorando') {
      insights.push(`Tu estado mental mostró tendencia positiva en el trimestre`)
    } else if (mentalTrend === 'empeorando') {
      insights.push(`Tu estado mental mostró tendencia negativa en el trimestre`)
    } else {
      insights.push(`Tu estado mental se mantuvo estable durante el trimestre`)
    }
  }

  // Físico
  if (physicalEntries.length > 0) {
    const avgPerMonth = activeDays / 3
    insights.push(`Registraste actividad física ${activeDays} de 90 días (promedio ${Math.round(avgPerMonth)}/mes)`)

    if (avgPerMonth >= 12) {
      insights.push(`Mantuviste buena consistencia física en el trimestre`)
    } else if (avgPerMonth < 8) {
      insights.push(`La actividad física fue baja durante el trimestre`)
    }
  }

  return {
    period: '90 días',
    insights,
    data: {
      spending: currentSpend,
      avgMonthly,
      mentalTrend,
      activeDays
    }
  }
}

/**
 * Obtiene todos los resúmenes de historia
 */
export function getAllHistorySummaries(movimientos, lifeEntries, categorias) {
  return {
    week: get7DaysSummary(movimientos, lifeEntries, categorias),
    month: get30DaysSummary(movimientos, lifeEntries, categorias),
    quarter: get90DaysSummary(movimientos, lifeEntries, categorias)
  }
}
