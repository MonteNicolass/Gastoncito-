// lib/user-preferences.js
// Sistema de preferencias de usuario (local-first)

const PREFERENCES_KEY = 'gaston_user_preferences'

const DEFAULT_PREFERENCES = {
  vision: {
    visibleCards: ['money', 'mental', 'fisico', 'objetivos', 'alertas', 'crossMoodMoney', 'crossExerciseMood', 'crossExerciseMoney', 'resumen'],
    cardOrder: ['money', 'mental', 'fisico', 'objetivos', 'alertas', 'crossMoodMoney', 'crossExerciseMood', 'crossExerciseMoney', 'resumen'],
    maxVisible: 9
  },
  money: {
    visibleCards: ['balance', 'topCategoria', 'presupuestoRiesgo', 'proyeccion'],
    cardOrder: ['balance', 'topCategoria', 'presupuestoRiesgo', 'proyeccion']
  },
  mental: {
    visibleCards: ['promedio', 'tendencia', 'racha'],
    cardOrder: ['promedio', 'tendencia', 'racha']
  },
  fisico: {
    visibleCards: ['diasActivos', 'racha', 'consistencia'],
    cardOrder: ['diasActivos', 'racha', 'consistencia']
  },
  objetivos: {
    visibleCards: ['progreso', 'enRiesgo', 'cumplidos'],
    cardOrder: ['progreso', 'enRiesgo', 'cumplidos']
  },
  comportamiento: {
    visibleCards: ['alertas', 'rachas'],
    cardOrder: ['alertas', 'rachas']
  }
}

/**
 * Obtiene las preferencias del usuario desde localStorage
 */
export function getUserPreferences() {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES

  try {
    const stored = localStorage.getItem(PREFERENCES_KEY)
    if (!stored) return DEFAULT_PREFERENCES

    const parsed = JSON.parse(stored)

    // Merge con defaults para asegurar que todas las keys existen
    return {
      vision: { ...DEFAULT_PREFERENCES.vision, ...parsed.vision },
      money: { ...DEFAULT_PREFERENCES.money, ...parsed.money },
      mental: { ...DEFAULT_PREFERENCES.mental, ...parsed.mental },
      fisico: { ...DEFAULT_PREFERENCES.fisico, ...parsed.fisico },
      objetivos: { ...DEFAULT_PREFERENCES.objetivos, ...parsed.objetivos },
      comportamiento: { ...DEFAULT_PREFERENCES.comportamiento, ...parsed.comportamiento }
    }
  } catch (error) {
    console.error('Error loading preferences:', error)
    return DEFAULT_PREFERENCES
  }
}

/**
 * Guarda las preferencias del usuario en localStorage
 */
export function saveUserPreferences(preferences) {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.error('Error saving preferences:', error)
  }
}

/**
 * Actualiza preferencias de una sección específica
 */
export function updateSectionPreferences(section, updates) {
  const current = getUserPreferences()
  const updated = {
    ...current,
    [section]: { ...current[section], ...updates }
  }
  saveUserPreferences(updated)
  return updated
}

/**
 * Reordena cards en una sección
 */
export function reorderCards(section, fromIndex, toIndex) {
  const prefs = getUserPreferences()
  const order = [...prefs[section].cardOrder]

  const [movedCard] = order.splice(fromIndex, 1)
  order.splice(toIndex, 0, movedCard)

  return updateSectionPreferences(section, { cardOrder: order })
}

/**
 * Mueve un card hacia arriba
 */
export function moveCardUp(section, cardId) {
  const prefs = getUserPreferences()
  const order = prefs[section].cardOrder
  const index = order.indexOf(cardId)

  if (index <= 0) return prefs

  return reorderCards(section, index, index - 1)
}

/**
 * Mueve un card hacia abajo
 */
export function moveCardDown(section, cardId) {
  const prefs = getUserPreferences()
  const order = prefs[section].cardOrder
  const index = order.indexOf(cardId)

  if (index === -1 || index >= order.length - 1) return prefs

  return reorderCards(section, index, index + 1)
}

/**
 * Alterna visibilidad de un card
 */
export function toggleCardVisibility(section, cardId) {
  const prefs = getUserPreferences()
  const visible = prefs[section].visibleCards

  const newVisible = visible.includes(cardId)
    ? visible.filter(id => id !== cardId)
    : [...visible, cardId]

  return updateSectionPreferences(section, { visibleCards: newVisible })
}

/**
 * Resetea preferencias a defaults
 */
export function resetPreferences(section = null) {
  if (section) {
    return updateSectionPreferences(section, DEFAULT_PREFERENCES[section])
  } else {
    saveUserPreferences(DEFAULT_PREFERENCES)
    return DEFAULT_PREFERENCES
  }
}

/**
 * Obtiene cards ordenados y filtrados por visibilidad
 */
export function getVisibleCards(section, allCards) {
  const prefs = getUserPreferences()
  const { cardOrder, visibleCards } = prefs[section]

  return cardOrder
    .filter(id => visibleCards.includes(id) && allCards[id])
    .map(id => ({ id, ...allCards[id] }))
}
