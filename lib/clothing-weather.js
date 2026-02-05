/**
 * Clothing & Weather Learning System
 * Learns correlations between clothing, weather conditions, and user feedback
 * Storage: localStorage ('gaston_clothing_data')
 */

const STORAGE_KEY = 'gaston_clothing_data'

// Weather condition thresholds
const WEATHER_THRESHOLDS = {
  cold: { temp: 10, feels: 8 },
  cool: { temp: 15, feels: 13 },
  mild: { temp: 20, feels: 18 },
  warm: { temp: 25, feels: 23 },
  hot: { temp: 30, feels: 28 }
}

// Clothing categories
const CLOTHING_TYPES = {
  light: ['remera', 'short', 'musculosa', 'pollera', 'vestido liviano'],
  medium: ['jean', 'pantalón', 'camisa', 'remera manga larga', 'buzo fino'],
  warm: ['buzo', 'sweater', 'campera liviana', 'chaleco'],
  heavy: ['campera', 'abrigo', 'tapado', 'bufanda', 'gorro', 'guantes']
}

/**
 * Get stored clothing data
 */
export function getClothingData() {
  if (typeof window === 'undefined') return { entries: [], suggestions: [] }
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : { entries: [], suggestions: [] }
}

/**
 * Save clothing data
 */
function saveClothingData(data) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Log a clothing/weather experience
 * @param {Object} entry - { clothing: string[], weather: Object, feedback: 'cold'|'ok'|'hot', date: string }
 */
export function logClothingExperience(entry) {
  const data = getClothingData()
  data.entries.push({
    ...entry,
    id: Date.now(),
    created_at: new Date().toISOString()
  })

  // Keep only last 100 entries
  if (data.entries.length > 100) {
    data.entries = data.entries.slice(-100)
  }

  saveClothingData(data)
  return entry
}

/**
 * Parse natural language input for clothing/weather feedback
 * @param {string} text - Natural language input
 * @returns {Object|null} - Parsed data or null if not clothing-related
 */
export function parseClothingInput(text) {
  const lowerText = text.toLowerCase()

  // Feedback patterns
  const coldPatterns = ['tuve frío', 'me cagué de frío', 'pasé frío', 'mucho frío', 'helado', 'congelado']
  const hotPatterns = ['tuve calor', 'me cagué de calor', 'pasé calor', 'mucho calor', 'transpiré', 'morí de calor']
  const okPatterns = ['bien', 'cómodo', 'perfecto', 'justo']

  let feedback = null
  if (coldPatterns.some(p => lowerText.includes(p))) feedback = 'cold'
  else if (hotPatterns.some(p => lowerText.includes(p))) feedback = 'hot'
  else if (okPatterns.some(p => lowerText.includes(p))) feedback = 'ok'

  if (!feedback) return null

  // Extract clothing mentions
  const clothing = []
  Object.values(CLOTHING_TYPES).flat().forEach(item => {
    if (lowerText.includes(item)) clothing.push(item)
  })

  return { feedback, clothing, rawText: text }
}

/**
 * Get clothing suggestion based on weather conditions
 * @param {Object} weather - { temp, feelsLike, humidity, wind }
 * @returns {Object} - { suggestion: string, confidence: number, reason: string }
 */
export function getClothingSuggestion(weather) {
  const data = getClothingData()
  const { temp, feelsLike, humidity, wind } = weather

  // Find similar weather conditions in history
  const similarEntries = data.entries.filter(entry => {
    if (!entry.weather) return false
    const tempDiff = Math.abs(entry.weather.temp - temp)
    const feelsDiff = Math.abs((entry.weather.feelsLike || entry.weather.temp) - feelsLike)
    return tempDiff <= 5 && feelsDiff <= 5
  })

  // If no history, use defaults
  if (similarEntries.length < 3) {
    return getDefaultSuggestion(feelsLike, humidity, wind)
  }

  // Analyze what worked
  const okEntries = similarEntries.filter(e => e.feedback === 'ok')
  const coldEntries = similarEntries.filter(e => e.feedback === 'cold')
  const hotEntries = similarEntries.filter(e => e.feedback === 'hot')

  // Build suggestion based on patterns
  let suggestion = ''
  let confidence = 0
  let reason = ''

  if (okEntries.length > 0) {
    // Use what worked before
    const commonClothing = getMostCommonClothing(okEntries)
    suggestion = `Basado en tu historial: ${commonClothing.join(', ')}`
    confidence = Math.min(90, 50 + okEntries.length * 10)
    reason = `${okEntries.length} veces funcionó bien con clima similar`
  } else if (coldEntries.length > hotEntries.length) {
    // User tends to feel cold - suggest warmer
    suggestion = 'Abrigate un poco más de lo usual'
    confidence = 60
    reason = 'Tendés a tener frío con este clima'
  } else if (hotEntries.length > coldEntries.length) {
    // User tends to feel hot - suggest lighter
    suggestion = 'Vestite más liviano de lo usual'
    confidence = 60
    reason = 'Tendés a tener calor con este clima'
  } else {
    return getDefaultSuggestion(feelsLike, humidity, wind)
  }

  return { suggestion, confidence, reason }
}

/**
 * Get default clothing suggestion based on weather
 */
function getDefaultSuggestion(feelsLike, humidity, wind) {
  let suggestion = ''
  let reason = ''

  if (feelsLike < WEATHER_THRESHOLDS.cold.feels) {
    suggestion = 'Abrigo pesado, bufanda, capas'
    reason = 'Sensación térmica muy baja'
  } else if (feelsLike < WEATHER_THRESHOLDS.cool.feels) {
    suggestion = 'Campera o buzo, pantalón largo'
    reason = 'Clima fresco'
  } else if (feelsLike < WEATHER_THRESHOLDS.mild.feels) {
    suggestion = 'Buzo liviano o camisa'
    reason = 'Clima templado'
  } else if (feelsLike < WEATHER_THRESHOLDS.warm.feels) {
    suggestion = 'Remera, jean o pantalón liviano'
    reason = 'Clima agradable'
  } else if (feelsLike < WEATHER_THRESHOLDS.hot.feels) {
    suggestion = 'Ropa liviana, colores claros'
    reason = 'Hace calor'
  } else {
    suggestion = 'Ropa muy liviana, hidratate'
    reason = 'Mucho calor'
  }

  // Adjust for humidity
  if (humidity > 70 && feelsLike > 20) {
    suggestion += ' (evitá telas sintéticas)'
    reason += ', humedad alta'
  }

  // Adjust for wind
  if (wind > 20) {
    suggestion += ' + cortaviento'
    reason += ', viento fuerte'
  }

  return { suggestion, confidence: 40, reason }
}

/**
 * Get most common clothing items from entries
 */
function getMostCommonClothing(entries) {
  const counts = {}
  entries.forEach(entry => {
    (entry.clothing || []).forEach(item => {
      counts[item] = (counts[item] || 0) + 1
    })
  })

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([item]) => item)
}

/**
 * Get clothing insights summary
 */
export function getClothingInsights() {
  const data = getClothingData()
  const entries = data.entries

  if (entries.length < 5) {
    return null // Not enough data
  }

  const coldCount = entries.filter(e => e.feedback === 'cold').length
  const hotCount = entries.filter(e => e.feedback === 'hot').length
  const okCount = entries.filter(e => e.feedback === 'ok').length

  const total = entries.length
  const coldRate = Math.round((coldCount / total) * 100)
  const hotRate = Math.round((hotCount / total) * 100)

  let tendency = 'equilibrado'
  if (coldRate > 40) tendency = 'friolento'
  else if (hotRate > 40) tendency = 'caluroso'

  return {
    totalEntries: total,
    tendency,
    coldRate,
    hotRate,
    successRate: Math.round((okCount / total) * 100)
  }
}
