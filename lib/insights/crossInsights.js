// lib/insights/crossInsights.js
// Helpers puros para cruces de datos Money × Mental × Physical

/**
 * Calcula gasto promedio en días con estado mental bajo (≤4) vs resto
 */
export function getSpendingByMood(movimientos, lifeEntries, days = 30) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  // Obtener mood scores por día
  const moodByDate = {}

  lifeEntries
    .filter(e => e.domain === 'mental' && e.meta?.mood_score)
    .forEach(e => {
      const date = new Date(e.created_at).toISOString().slice(0, 10)
      const created = new Date(e.created_at)

      if (created >= startDate && created < today) {
        // Guardar el último mood del día
        if (!moodByDate[date] || new Date(e.created_at) > new Date(moodByDate[date].created_at)) {
          moodByDate[date] = {
            score: e.meta.mood_score,
            created_at: e.created_at
          }
        }
      }
    })

  // Calcular gastos por día
  const spendingByDate = {}

  movimientos
    .filter(m => m.tipo === 'gasto')
    .forEach(m => {
      const fecha = new Date(m.fecha)
      if (fecha >= startDate && fecha < today) {
        const dateKey = m.fecha
        spendingByDate[dateKey] = (spendingByDate[dateKey] || 0) + m.monto
      }
    })

  // Cruzar datos
  let lowMoodSpendingTotal = 0
  let lowMoodDays = 0
  let normalMoodSpendingTotal = 0
  let normalMoodDays = 0

  Object.keys(moodByDate).forEach(date => {
    const mood = moodByDate[date].score
    const spending = spendingByDate[date] || 0

    if (mood <= 4) {
      lowMoodSpendingTotal += spending
      lowMoodDays++
    } else {
      normalMoodSpendingTotal += spending
      normalMoodDays++
    }
  })

  if (lowMoodDays === 0 || normalMoodDays === 0) {
    return null
  }

  const lowMoodAvg = lowMoodSpendingTotal / lowMoodDays
  const normalMoodAvg = normalMoodSpendingTotal / normalMoodDays
  const delta = lowMoodAvg - normalMoodAvg
  const deltaPercent = normalMoodAvg > 0
    ? ((delta / normalMoodAvg) * 100).toFixed(1)
    : 0

  return {
    lowMoodAvg: parseFloat(lowMoodAvg.toFixed(2)),
    normalMoodAvg: parseFloat(normalMoodAvg.toFixed(2)),
    delta: parseFloat(delta.toFixed(2)),
    deltaPercent: parseFloat(deltaPercent),
    lowMoodDays,
    normalMoodDays
  }
}

/**
 * Calcula mood promedio en días con ejercicio vs sin ejercicio
 */
export function getMoodByExercise(lifeEntries, days = 30) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  // Palabras clave de ejercicio
  const exerciseKeywords = [
    'entrené', 'entrene', 'gym', 'gimnasio', 'corrí', 'corri',
    'caminé', 'camine', 'pesas', 'yoga', 'pilates', 'natación',
    'bicicleta', 'bici', 'ejercicio', 'cardio', 'deporte'
  ]

  // Obtener días con ejercicio
  const exerciseDates = new Set()

  lifeEntries
    .filter(e => e.domain === 'physical')
    .forEach(e => {
      const created = new Date(e.created_at)
      if (created >= startDate && created < today) {
        const text = (e.text || '').toLowerCase()
        const hasExercise = exerciseKeywords.some(kw => text.includes(kw))

        if (hasExercise) {
          const dateKey = created.toISOString().slice(0, 10)
          exerciseDates.add(dateKey)
        }
      }
    })

  // Obtener mood scores
  const moodScores = {
    withExercise: [],
    withoutExercise: []
  }

  lifeEntries
    .filter(e => e.domain === 'mental' && e.meta?.mood_score)
    .forEach(e => {
      const created = new Date(e.created_at)
      if (created >= startDate && created < today) {
        const dateKey = created.toISOString().slice(0, 10)
        const score = e.meta.mood_score

        if (exerciseDates.has(dateKey)) {
          moodScores.withExercise.push(score)
        } else {
          moodScores.withoutExercise.push(score)
        }
      }
    })

  if (moodScores.withExercise.length === 0 || moodScores.withoutExercise.length === 0) {
    return null
  }

  const avgWithExercise = moodScores.withExercise.reduce((a, b) => a + b, 0) / moodScores.withExercise.length
  const avgWithoutExercise = moodScores.withoutExercise.reduce((a, b) => a + b, 0) / moodScores.withoutExercise.length
  const delta = avgWithExercise - avgWithoutExercise

  return {
    avgWithExercise: parseFloat(avgWithExercise.toFixed(2)),
    avgWithoutExercise: parseFloat(avgWithoutExercise.toFixed(2)),
    delta: parseFloat(delta.toFixed(2)),
    daysWithExercise: moodScores.withExercise.length,
    daysWithoutExercise: moodScores.withoutExercise.length
  }
}

/**
 * Calcula gasto impulsivo promedio en días con ejercicio vs sin ejercicio
 */
export function getImpulsiveSpendingByExercise(movimientos, lifeEntries, days = 30) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  // Palabras clave de ejercicio
  const exerciseKeywords = [
    'entrené', 'entrene', 'gym', 'gimnasio', 'corrí', 'corri',
    'caminé', 'camine', 'pesas', 'yoga', 'pilates', 'natación',
    'bicicleta', 'bici', 'ejercicio', 'cardio', 'deporte'
  ]

  // Categorías impulsivas
  const impulsiveCategories = ['delivery', 'comida', 'entretenimiento', 'compras']

  // Obtener días con ejercicio
  const exerciseDates = new Set()

  lifeEntries
    .filter(e => e.domain === 'physical')
    .forEach(e => {
      const created = new Date(e.created_at)
      if (created >= startDate && created < today) {
        const text = (e.text || '').toLowerCase()
        const hasExercise = exerciseKeywords.some(kw => text.includes(kw))

        if (hasExercise) {
          const dateKey = created.toISOString().slice(0, 10)
          exerciseDates.add(dateKey)
        }
      }
    })

  // Calcular gastos impulsivos por día
  const spendingByDate = {
    withExercise: [],
    withoutExercise: []
  }

  movimientos
    .filter(m => m.tipo === 'gasto')
    .forEach(m => {
      const fecha = new Date(m.fecha)
      if (fecha >= startDate && fecha < today) {
        const dateKey = m.fecha
        const isImpulsive = impulsiveCategories.some(cat =>
          (m.categoria || '').toLowerCase().includes(cat) ||
          (m.descripcion || '').toLowerCase().includes(cat)
        )

        if (isImpulsive) {
          if (exerciseDates.has(dateKey)) {
            spendingByDate.withExercise.push(m.monto)
          } else {
            spendingByDate.withoutExercise.push(m.monto)
          }
        }
      }
    })

  if (spendingByDate.withExercise.length === 0 || spendingByDate.withoutExercise.length === 0) {
    return null
  }

  const avgWithExercise = spendingByDate.withExercise.reduce((a, b) => a + b, 0) / spendingByDate.withExercise.length
  const avgWithoutExercise = spendingByDate.withoutExercise.reduce((a, b) => a + b, 0) / spendingByDate.withoutExercise.length
  const delta = avgWithExercise - avgWithoutExercise
  const deltaPercent = avgWithoutExercise > 0
    ? ((delta / avgWithoutExercise) * 100).toFixed(1)
    : 0

  return {
    avgWithExercise: parseFloat(avgWithExercise.toFixed(2)),
    avgWithoutExercise: parseFloat(avgWithoutExercise.toFixed(2)),
    delta: parseFloat(delta.toFixed(2)),
    deltaPercent: parseFloat(deltaPercent),
    countWithExercise: spendingByDate.withExercise.length,
    countWithoutExercise: spendingByDate.withoutExercise.length
  }
}
