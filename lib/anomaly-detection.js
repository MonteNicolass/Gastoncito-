/**
 * Detección de Anomalías - Desviaciones automáticas sin IA
 */

/**
 * Detecta gasto diario anormal (spike)
 */
export function detectDailySpendingAnomaly(movimientos) {
  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const today = now.toISOString().slice(0, 10)

  // Calcular gasto diario de los últimos 30 días
  const dailySpending = {}
  movimientos
    .filter(m => m.tipo === 'gasto' && new Date(m.fecha) >= last30Days)
    .forEach(m => {
      const date = m.fecha.slice(0, 10)
      dailySpending[date] = (dailySpending[date] || 0) + m.monto
    })

  const days = Object.entries(dailySpending)
  if (days.length < 7) return null

  // Promedio (excluyendo hoy)
  const otherDays = days.filter(d => d[0] !== today)
  if (otherDays.length === 0) return null

  const avgDaily = otherDays.reduce((sum, d) => sum + d[1], 0) / otherDays.length

  // Gasto de hoy
  const todaySpending = dailySpending[today]
  if (!todaySpending) return null

  // Detectar anomalía: +30% o más vs promedio
  const percentAbove = ((todaySpending - avgDaily) / avgDaily) * 100

  if (percentAbove >= 30) {
    const formatAmount = (amount) => {
      return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
    }

    return {
      type: 'daily_spending_anomaly',
      severity: percentAbove >= 50 ? 'high' : 'medium',
      title: `Anomalía: gasto diario +${Math.round(percentAbove)}% vs promedio`,
      message: `Hoy: ${formatAmount(todaySpending)}, promedio: ${formatAmount(avgDaily)}`,
      data: { today: todaySpending, avg: avgDaily, percentAbove }
    }
  }

  return null
}

/**
 * Detecta spike inusual en categoría
 */
export function detectCategorySpike(movimientos, categorias) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Gastos por categoría última semana
  const currentCategorySpending = {}
  movimientos
    .filter(m => m.tipo === 'gasto' && new Date(m.fecha) >= last7Days && m.categoria)
    .forEach(m => {
      currentCategorySpending[m.categoria] = (currentCategorySpending[m.categoria] || 0) + m.monto
    })

  // Gastos por categoría semana anterior
  const prevCategorySpending = {}
  movimientos
    .filter(m => {
      const fecha = new Date(m.fecha)
      return m.tipo === 'gasto' && fecha >= prev7Days && fecha < last7Days && m.categoria
    })
    .forEach(m => {
      prevCategorySpending[m.categoria] = (prevCategorySpending[m.categoria] || 0) + m.monto
    })

  // Detectar spikes (>100% aumento)
  for (const [categoria, currentAmount] of Object.entries(currentCategorySpending)) {
    const prevAmount = prevCategorySpending[categoria] || 0

    if (prevAmount > 0) {
      const increase = ((currentAmount - prevAmount) / prevAmount) * 100

      if (increase >= 100) {
        const formatAmount = (amount) => {
          return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
        }

        return {
          type: 'category_spike',
          severity: 'medium',
          title: `Anomalía: ${categoria} +${Math.round(increase)}% esta semana`,
          message: `${formatAmount(currentAmount)} vs ${formatAmount(prevAmount)} semana anterior`,
          data: { categoria, current: currentAmount, prev: prevAmount, increase }
        }
      }
    }
  }

  return null
}

/**
 * Detecta caída sostenida de estado mental
 */
export function detectMentalDecline(lifeEntries) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recent7d = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last7Days
  )

  const last30d = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last30Days
  )

  if (recent7d.length < 3 || last30d.length < 5) return null

  const avg7d = recent7d.reduce((sum, e) => sum + e.meta.mood_score, 0) / recent7d.length
  const avg30d = last30d.reduce((sum, e) => sum + e.meta.mood_score, 0) / last30d.length

  // Detectar caída significativa: -1.5 pts o más
  const decline = avg30d - avg7d

  if (decline >= 1.5) {
    return {
      type: 'mental_decline',
      severity: 'high',
      title: `Anomalía: estado mental -${Math.round(decline * 10) / 10} pts últimos 7 días`,
      message: `Promedio 7d: ${Math.round(avg7d * 10) / 10}/10, promedio 30d: ${Math.round(avg30d * 10) / 10}/10`,
      data: { avg7d, avg30d, decline }
    }
  }

  return null
}

/**
 * Detecta variabilidad mental anormal
 */
export function detectMentalVariability(lifeEntries) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const recent = lifeEntries.filter(e =>
    e.domain === 'mental' &&
    e.meta?.mood_score &&
    new Date(e.created_at) >= last7Days
  )

  if (recent.length < 4) return null

  const scores = recent.map(e => e.meta.mood_score)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / scores.length
  const stdDev = Math.sqrt(variance)

  // Variabilidad alta: stdDev > 2.5
  if (stdDev > 2.5) {
    return {
      type: 'mental_variability',
      severity: 'medium',
      title: `Anomalía: alta variabilidad mental últimos 7 días`,
      message: `Desviación estándar: ${Math.round(stdDev * 10) / 10} (rango ${Math.min(...scores)}-${Math.max(...scores)}/10)`,
      data: { stdDev, min: Math.min(...scores), max: Math.max(...scores) }
    }
  }

  return null
}

/**
 * Detecta racha física rota inesperadamente
 */
export function detectPhysicalStreakBroken(lifeEntries) {
  const physicalEntries = lifeEntries
    .filter(e => e.domain === 'physical')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  if (physicalEntries.length < 5) return null

  // Calcular última racha antes del gap actual
  const now = new Date()
  const lastExercise = new Date(physicalEntries[0].created_at)
  const daysSinceLast = Math.floor((now - lastExercise) / (1000 * 60 * 60 * 24))

  // Solo alertar si hace 3-7 días (no muy reciente, no muy antiguo)
  if (daysSinceLast < 3 || daysSinceLast > 7) return null

  // Buscar racha previa
  let streakBeforeGap = 0
  for (let i = 1; i < Math.min(physicalEntries.length, 10); i++) {
    const current = new Date(physicalEntries[i].created_at)
    const prev = new Date(physicalEntries[i - 1].created_at)
    const diffDays = Math.floor((prev - current) / (1000 * 60 * 60 * 24))

    if (diffDays <= 2) {
      streakBeforeGap++
    } else {
      break
    }
  }

  // Si había racha de 5+ días, alertar
  if (streakBeforeGap >= 5) {
    return {
      type: 'physical_streak_broken',
      severity: 'medium',
      title: `Anomalía: racha de ${streakBeforeGap} días rota hace ${daysSinceLast} días`,
      message: `Última actividad: ${lastExercise.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`,
      data: { streak: streakBeforeGap, daysSinceLast, lastDate: lastExercise }
    }
  }

  return null
}

/**
 * Detecta progreso estancado en objetivos
 */
export function detectStalledGoals(goals) {
  const now = new Date()
  const threshold = 7 * 24 * 60 * 60 * 1000 // 7 días

  const stalledGoals = goals.filter(g => {
    if (g.status !== 'active') return false
    if (!g.updated_at) return false

    const lastUpdate = new Date(g.updated_at)
    const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24))

    // Estancado: no actualizado en 7+ días y progreso < 80%
    return daysSinceUpdate >= 7 && (g.progress || 0) < 80
  })

  if (stalledGoals.length === 0) return null

  return {
    type: 'stalled_goals',
    severity: 'low',
    title: `Anomalía: ${stalledGoals.length} ${stalledGoals.length === 1 ? 'objetivo estancado' : 'objetivos estancados'}`,
    message: `Sin actualizar hace 7+ días`,
    data: { count: stalledGoals.length, goals: stalledGoals }
  }
}

/**
 * Detecta todas las anomalías
 */
export function detectAllAnomalies(movimientos, lifeEntries, categorias, goals) {
  const anomalies = [
    detectDailySpendingAnomaly(movimientos),
    detectCategorySpike(movimientos, categorias),
    detectMentalDecline(lifeEntries),
    detectMentalVariability(lifeEntries),
    detectPhysicalStreakBroken(lifeEntries),
    detectStalledGoals(goals)
  ].filter(a => a !== null)

  // Ordenar por severidad
  const severityOrder = { high: 0, medium: 1, low: 2 }
  return anomalies.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
