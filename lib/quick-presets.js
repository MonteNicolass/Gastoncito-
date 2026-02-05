// lib/quick-presets.js
// Sistema de presets inteligentes (sin IA, solo datos locales)

const PRESETS_KEY = 'gaston_quick_presets'

const DEFAULT_PRESETS = {
  lastWallet: null,
  lastCategory: null,
  lastAmount: null,
  lastMoodScore: null,
  lastHabitType: null,
  lastNoteType: null,
  lastGoalType: null
}

/**
 * Obtiene presets guardados
 */
export function getPresets() {
  if (typeof window === 'undefined') return DEFAULT_PRESETS

  try {
    const stored = localStorage.getItem(PRESETS_KEY)
    if (!stored) return DEFAULT_PRESETS

    return { ...DEFAULT_PRESETS, ...JSON.parse(stored) }
  } catch (error) {
    console.error('Error loading presets:', error)
    return DEFAULT_PRESETS
  }
}

/**
 * Guarda un preset
 */
export function savePreset(key, value) {
  if (typeof window === 'undefined') return

  try {
    const current = getPresets()
    const updated = { ...current, [key]: value }
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving preset:', error)
  }
}

/**
 * Guarda múltiples presets a la vez
 */
export function savePresets(updates) {
  if (typeof window === 'undefined') return

  try {
    const current = getPresets()
    const updated = { ...current, ...updates }
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Error saving presets:', error)
  }
}

/**
 * Obtiene la billetera más frecuente (últimos 30 días)
 */
export function getMostFrequentWallet(movimientos) {
  if (!movimientos || movimientos.length === 0) return null

  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recentMovs = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha >= last30Days
  })

  const walletCount = {}
  recentMovs.forEach(m => {
    if (m.metodo) walletCount[m.metodo] = (walletCount[m.metodo] || 0) + 1
  })

  const sorted = Object.entries(walletCount).sort((a, b) => b[1] - a[1])
  return sorted.length > 0 ? sorted[0][0] : null
}

/**
 * Obtiene la categoría más frecuente (últimos 30 días)
 */
export function getMostFrequentCategory(movimientos) {
  if (!movimientos || movimientos.length === 0) return null

  const now = new Date()
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const recentMovs = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha >= last30Days && m.tipo === 'gasto'
  })

  const categoryCount = {}
  recentMovs.forEach(m => {
    if (m.categoria) categoryCount[m.categoria] = (categoryCount[m.categoria] || 0) + 1
  })

  const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])
  return sorted.length > 0 ? sorted[0][0] : null
}

/**
 * Resetea presets a defaults
 */
export function resetPresets() {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(PRESETS_KEY)
  } catch (error) {
    console.error('Error resetting presets:', error)
  }
}
