// lib/insights/behaviorInsights.js
// Detección temprana de patrones comportamentales

/**
 * Detecta gasto excesivo (threshold + variabilidad)
 */
export function detectExcessiveSpending(movimientos, days = 30) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  const gastos = movimientos
    .filter(m => m.tipo === 'gasto')
    .filter(m => {
      const fecha = new Date(m.fecha)
      return fecha >= startDate && fecha < today
    })

  if (gastos.length < 7) return null

  const dailyTotals = {}
  gastos.forEach(g => {
    const date = g.fecha
    dailyTotals[date] = (dailyTotals[date] || 0) + g.monto
  })

  const values = Object.values(dailyTotals)
  const average = values.reduce((a, b) => a + b, 0) / values.length
  const max = Math.max(...values)

  // Detectar si el max es > 2x el promedio
  if (max > average * 2) {
    return {
      detected: true,
      maxDaily: max,
      averageDaily: parseFloat(average.toFixed(2)),
      threshold: parseFloat((average * 2).toFixed(2)),
      message: `Día con gasto ${Math.round((max / average) * 100 - 100)}% mayor al promedio`
    }
  }

  return null
}

/**
 * Detecta racha de días con estado mental bajo
 */
export function detectLowMoodStreak(lifeEntries, days = 14) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  const mentalEntries = lifeEntries
    .filter(e => e.domain === 'mental' && e.meta?.mood_score)
    .filter(e => {
      const created = new Date(e.created_at)
      return created >= startDate && created < today
    })
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

  if (mentalEntries.length < 5) return null

  let currentStreak = 0
  let maxStreak = 0

  mentalEntries.forEach(e => {
    if (e.meta.mood_score <= 4) {
      currentStreak++
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak
      }
    } else {
      currentStreak = 0
    }
  })

  if (maxStreak >= 3) {
    return {
      detected: true,
      streakLength: maxStreak,
      message: `${maxStreak} días consecutivos con estado ≤4`
    }
  }

  return null
}

/**
 * Detecta falta de ejercicio prolongada
 */
export function detectInactivity(lifeEntries, days = 14) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  const exerciseKeywords = [
    'entrené', 'entrene', 'gym', 'gimnasio', 'corrí', 'corri',
    'caminé', 'camine', 'pesas', 'yoga', 'pilates', 'natación',
    'bicicleta', 'bici', 'ejercicio', 'cardio', 'deporte'
  ]

  const physicalEntries = lifeEntries
    .filter(e => e.domain === 'physical')
    .filter(e => {
      const created = new Date(e.created_at)
      return created >= startDate && created < today
    })

  const hasExercise = physicalEntries.some(e => {
    const text = (e.text || '').toLowerCase()
    return exerciseKeywords.some(kw => text.includes(kw))
  })

  if (!hasExercise && physicalEntries.length === 0) {
    return {
      detected: true,
      daysWithoutExercise: days,
      message: `${days} días sin registrar ejercicio`
    }
  }

  return null
}

/**
 * Detecta delivery frecuente
 */
export function detectFrequentDelivery(movimientos, days = 7) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  const deliveryKeywords = ['pedidosya', 'rappi', 'uber eats', 'delivery']

  const deliveries = movimientos
    .filter(m => m.tipo === 'gasto')
    .filter(m => {
      const fecha = new Date(m.fecha)
      return fecha >= startDate && fecha < today
    })
    .filter(m => {
      const desc = (m.descripcion || '').toLowerCase()
      const merchant = (m.merchant || '').toLowerCase()
      const combined = desc + ' ' + merchant
      return deliveryKeywords.some(kw => combined.includes(kw))
    })

  const deliveryCount = deliveries.length
  const deliveryTotal = deliveries.reduce((sum, d) => sum + d.monto, 0)

  if (deliveryCount >= 4) {
    return {
      detected: true,
      deliveryCount,
      deliveryTotal: parseFloat(deliveryTotal.toFixed(2)),
      averagePerOrder: parseFloat((deliveryTotal / deliveryCount).toFixed(2)),
      message: `${deliveryCount} pedidos de delivery en ${days} días`
    }
  }

  return null
}

/**
 * Agrupa todas las detecciones
 */
export function getAllBehaviorInsights(movimientos, lifeEntries) {
  return {
    excessiveSpending: detectExcessiveSpending(movimientos, 30),
    lowMoodStreak: detectLowMoodStreak(lifeEntries, 14),
    inactivity: detectInactivity(lifeEntries, 14),
    frequentDelivery: detectFrequentDelivery(movimientos, 7)
  }
}
