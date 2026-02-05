/**
 * Quick Add - Ultra-fast expense registration
 *
 * Goals:
 * - 1 step registration
 * - Smart autocomplete
 * - Pattern detection for recurring expenses
 */

const QUICK_ADD_HISTORY_KEY = 'gaston_quick_add_history'
const PATTERN_THRESHOLD = 3 // Times a gasto must repeat to suggest pattern

/**
 * Autocomplete suggestions based on history
 * @param {string} input - Current input text
 * @param {Array} movimientos - Historical movements
 * @param {Array} wallets - Available wallets
 */
export function getAutocompleteSuggestions(input, movimientos = [], wallets = []) {
  if (!input || input.length < 2) return null

  const inputLower = input.toLowerCase()
  const suggestions = {
    amount: null,
    category: null,
    wallet: null,
    merchant: null,
    fullMatch: null
  }

  // Parse amount from input
  const amountMatch = input.match(/(\d+(?:[.,]\d+)?)/g)
  if (amountMatch) {
    suggestions.amount = parseFloat(amountMatch[0].replace(',', '.'))
  }

  // Find similar past expenses
  const recentGastos = movimientos
    .filter(m => m.tipo === 'gasto')
    .slice(-100) // Last 100

  // Extract merchant/description patterns
  const merchantCounts = new Map()
  const walletByMerchant = new Map()
  const categoryByMerchant = new Map()
  const amountsByMerchant = new Map()

  recentGastos.forEach(g => {
    const motivo = (g.motivo || '').toLowerCase()
    if (!motivo) return

    // Count merchants
    if (!merchantCounts.has(motivo)) {
      merchantCounts.set(motivo, 0)
      walletByMerchant.set(motivo, g.metodo)
      categoryByMerchant.set(motivo, g.category_id)
      amountsByMerchant.set(motivo, [])
    }
    merchantCounts.set(motivo, merchantCounts.get(motivo) + 1)
    amountsByMerchant.get(motivo).push(g.monto)
  })

  // Find best match
  let bestMatch = null
  let bestScore = 0

  for (const [merchant, count] of merchantCounts.entries()) {
    // Check if input matches merchant
    const textWithoutNumbers = inputLower.replace(/\d+/g, '').trim()
    if (merchant.includes(textWithoutNumbers) || textWithoutNumbers.includes(merchant.slice(0, 5))) {
      const score = count + (merchant.startsWith(textWithoutNumbers) ? 10 : 0)
      if (score > bestScore) {
        bestScore = score
        bestMatch = merchant
      }
    }
  }

  if (bestMatch) {
    suggestions.merchant = capitalizeFirst(bestMatch)
    suggestions.wallet = walletByMerchant.get(bestMatch)
    suggestions.category = categoryByMerchant.get(bestMatch)

    // Suggest typical amount if none provided
    if (!suggestions.amount) {
      const amounts = amountsByMerchant.get(bestMatch)
      if (amounts && amounts.length > 0) {
        suggestions.amount = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
      }
    }

    // Full match for 1-tap confirm
    if (suggestions.amount && suggestions.merchant) {
      suggestions.fullMatch = {
        monto: suggestions.amount,
        motivo: suggestions.merchant,
        metodo: suggestions.wallet || 'efectivo',
        category_id: suggestions.category,
        tipo: 'gasto'
      }
    }
  }

  // Default wallet suggestion (most used)
  if (!suggestions.wallet && wallets.length > 0) {
    const primary = wallets.find(w => w.is_primary)
    suggestions.wallet = primary?.nombre || wallets[0]?.nombre || 'efectivo'
  }

  return suggestions
}

/**
 * Parse quick input into structured gasto
 * Supports formats:
 * - "1500 almuerzo"
 * - "uber 800"
 * - "2000 super mp"
 * - "nafta 5000 ypf"
 */
export function parseQuickInput(input, suggestions = {}) {
  if (!input || typeof input !== 'string') return null

  const parts = input.trim().split(/\s+/)
  let amount = null
  let description = []
  let wallet = suggestions.wallet || null

  // Known wallet keywords
  const walletKeywords = {
    'mp': 'mercado pago',
    'efectivo': 'efectivo',
    'eft': 'efectivo',
    'cash': 'efectivo',
    'debito': 'debito',
    'credito': 'credito',
    'tarjeta': 'credito',
    'lemon': 'lemon cash',
    'brubank': 'brubank',
    'naranja': 'naranja x',
    'uala': 'ualá'
  }

  for (const part of parts) {
    const partLower = part.toLowerCase()

    // Check if it's a number (amount)
    if (/^\d+([.,]\d+)?$/.test(part)) {
      if (!amount) {
        amount = parseFloat(part.replace(',', '.'))
      }
      continue
    }

    // Check if it's a wallet keyword
    if (walletKeywords[partLower]) {
      wallet = walletKeywords[partLower]
      continue
    }

    // Otherwise it's part of description
    description.push(part)
  }

  if (!amount && !description.length) return null

  return {
    monto: amount || suggestions.amount || 0,
    motivo: description.length > 0 ? description.join(' ') : suggestions.merchant || '',
    metodo: wallet || 'efectivo',
    category_id: suggestions.category || null,
    tipo: 'gasto',
    fecha: new Date().toISOString().slice(0, 10)
  }
}

/**
 * Detect if this expense is a repeated pattern
 * @param {Object} gasto - The expense to check
 * @param {Array} movimientos - Historical movements
 */
export function detectPattern(gasto, movimientos = []) {
  if (!gasto.motivo) return null

  const motivoLower = gasto.motivo.toLowerCase()

  // Find similar expenses
  const similar = movimientos.filter(m => {
    if (m.tipo !== 'gasto') return false
    const mMotivo = (m.motivo || '').toLowerCase()
    return mMotivo === motivoLower ||
           mMotivo.includes(motivoLower) ||
           motivoLower.includes(mMotivo)
  })

  if (similar.length < PATTERN_THRESHOLD) return null

  // Calculate stats
  const amounts = similar.map(m => m.monto)
  const avgAmount = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length)
  const variance = Math.round(
    amounts.reduce((sum, a) => sum + Math.pow(a - avgAmount, 2), 0) / amounts.length
  )
  const isConsistent = Math.sqrt(variance) < avgAmount * 0.3 // <30% std dev

  // Calculate frequency
  const dates = similar.map(m => new Date(m.fecha)).sort((a, b) => a - b)
  let avgDaysBetween = 0
  if (dates.length >= 2) {
    let totalDays = 0
    for (let i = 1; i < dates.length; i++) {
      totalDays += (dates[i] - dates[i - 1]) / (24 * 60 * 60 * 1000)
    }
    avgDaysBetween = Math.round(totalDays / (dates.length - 1))
  }

  // Determine frequency type
  let frequencyType = 'irregular'
  if (avgDaysBetween <= 2) frequencyType = 'daily'
  else if (avgDaysBetween <= 9) frequencyType = 'weekly'
  else if (avgDaysBetween <= 16) frequencyType = 'biweekly'
  else if (avgDaysBetween <= 35) frequencyType = 'monthly'

  return {
    isPattern: true,
    occurrences: similar.length,
    avgAmount,
    isConsistent,
    frequencyType,
    avgDaysBetween,
    suggestRule: isConsistent && similar.length >= 5,
    suggestRecurring: frequencyType !== 'irregular' && isConsistent,
    message: getPatternMessage(similar.length, frequencyType, avgAmount)
  }
}

/**
 * Generate pattern detection message
 */
function getPatternMessage(count, frequency, avgAmount) {
  const freqLabels = {
    'daily': 'diario',
    'weekly': 'semanal',
    'biweekly': 'quincenal',
    'monthly': 'mensual',
    'irregular': 'frecuente'
  }

  if (frequency !== 'irregular') {
    return `Gasto ${freqLabels[frequency]} detectado (${count} veces, ~$${avgAmount.toLocaleString('es-AR')})`
  }

  return `Este gasto se repitió ${count} veces`
}

/**
 * Get quick add history (recent successful adds)
 */
export function getQuickAddHistory() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(QUICK_ADD_HISTORY_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Save to quick add history
 */
export function saveToQuickAddHistory(gasto) {
  if (typeof window === 'undefined') return

  try {
    const history = getQuickAddHistory()

    // Add to history
    history.unshift({
      motivo: gasto.motivo,
      monto: gasto.monto,
      metodo: gasto.metodo,
      category_id: gasto.category_id,
      timestamp: Date.now()
    })

    // Keep last 20
    const trimmed = history.slice(0, 20)
    localStorage.setItem(QUICK_ADD_HISTORY_KEY, JSON.stringify(trimmed))
  } catch {
    // Ignore
  }
}

/**
 * Get recent quick entries for shortcuts
 */
export function getRecentShortcuts(movimientos = [], limit = 5) {
  const gastos = movimientos.filter(m => m.tipo === 'gasto')

  // Group by motivo and count
  const byMotivo = new Map()
  gastos.forEach(g => {
    const key = (g.motivo || '').toLowerCase()
    if (!key) return

    if (!byMotivo.has(key)) {
      byMotivo.set(key, {
        motivo: g.motivo,
        metodo: g.metodo,
        category_id: g.category_id,
        count: 0,
        lastAmount: g.monto,
        amounts: []
      })
    }
    const entry = byMotivo.get(key)
    entry.count++
    entry.lastAmount = g.monto
    entry.amounts.push(g.monto)
  })

  // Sort by count and return top N
  return Array.from(byMotivo.values())
    .filter(e => e.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map(e => ({
      motivo: e.motivo,
      metodo: e.metodo,
      category_id: e.category_id,
      suggestedAmount: Math.round(e.amounts.reduce((a, b) => a + b, 0) / e.amounts.length),
      count: e.count
    }))
}

/**
 * Capitalize first letter
 */
function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
