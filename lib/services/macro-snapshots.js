/**
 * Macro Snapshots Service
 * Stores and provides contextual inflation/economic data
 *
 * IMPORTANT: This data is NEVER shown alone.
 * Only used to provide context to user's own spending patterns.
 *
 * Example: "Tu gasto en comida subió 14%. Inflación del mes: 20%."
 */

const MACRO_STORAGE_KEY = 'gaston_macro_snapshots'

// Reference inflation data (updated manually or via settings)
// Source: INDEC official data
const REFERENCE_INFLATION = {
  '2024-11': { monthly: 2.4, yoy: 166.0 },
  '2024-10': { monthly: 2.7, yoy: 193.0 },
  '2024-09': { monthly: 3.5, yoy: 209.0 },
  '2024-08': { monthly: 4.2, yoy: 236.7 },
  '2024-07': { monthly: 4.0, yoy: 263.4 },
  '2024-06': { monthly: 4.6, yoy: 271.5 },
  '2024-05': { monthly: 4.2, yoy: 276.4 },
  '2024-04': { monthly: 8.8, yoy: 289.4 },
  '2024-03': { monthly: 11.0, yoy: 287.9 },
  '2024-02': { monthly: 13.2, yoy: 276.2 },
  '2024-01': { monthly: 20.6, yoy: 254.2 },
  '2023-12': { monthly: 25.5, yoy: 211.4 }
}

// Category-specific inflation (approximations)
const CATEGORY_INFLATION = {
  'comida': 1.2,      // Food typically 20% above general
  'transporte': 1.1,  // Transport 10% above
  'salud': 1.3,       // Healthcare 30% above
  'educacion': 1.1,   // Education 10% above
  'entretenimiento': 0.9, // Entertainment 10% below
  'ropa': 1.0,        // Clothing at general rate
  'servicios': 1.5,   // Utilities 50% above (regulated catch-up)
  'alquiler': 1.0     // Rent at general rate
}

/**
 * Get stored macro snapshots
 */
function getStoredSnapshots() {
  if (typeof window === 'undefined') return {}

  try {
    const stored = localStorage.getItem(MACRO_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Save macro snapshot
 */
function saveSnapshot(month, data) {
  if (typeof window === 'undefined') return

  try {
    const snapshots = getStoredSnapshots()
    snapshots[month] = {
      ...data,
      updated_at: Date.now()
    }
    localStorage.setItem(MACRO_STORAGE_KEY, JSON.stringify(snapshots))
  } catch (e) {
    console.warn('Failed to save macro snapshot:', e)
  }
}

/**
 * Get inflation for a specific month
 * @param {string} month - Format: 'YYYY-MM'
 */
export function getMonthlyInflation(month) {
  // First check stored data
  const stored = getStoredSnapshots()
  if (stored[month]) {
    return stored[month]
  }

  // Fall back to reference data
  return REFERENCE_INFLATION[month] || null
}

/**
 * Get current month's inflation
 */
export function getCurrentInflation() {
  const now = new Date()
  // We typically have data for month-1
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const monthKey = prevMonth.toISOString().slice(0, 7)

  return getMonthlyInflation(monthKey)
}

/**
 * Update inflation data (manual or from settings)
 */
export function updateInflationData(month, monthlyRate, yoyRate) {
  saveSnapshot(month, {
    monthly: monthlyRate,
    yoy: yoyRate,
    source: 'manual'
  })
}

/**
 * Compare user's spending change with inflation
 * This is the ONLY way macro data should be surfaced
 *
 * @param {number} userChangePercent - User's spending change %
 * @param {string} category - Optional category for specific comparison
 * @returns {object|null} Contextual comparison or null if no data
 */
export function compareWithInflation(userChangePercent, category = null) {
  const inflation = getCurrentInflation()
  if (!inflation) return null

  // Get category-adjusted inflation if available
  let adjustedInflation = inflation.monthly
  if (category) {
    const categoryKey = category.toLowerCase()
    const multiplier = CATEGORY_INFLATION[categoryKey] || 1.0
    adjustedInflation = inflation.monthly * multiplier
  }

  const difference = userChangePercent - adjustedInflation
  const isAboveInflation = difference > 0
  const isBelowInflation = difference < 0
  const isNearInflation = Math.abs(difference) <= 2 // Within 2%

  return {
    userChange: userChangePercent,
    inflation: adjustedInflation,
    generalInflation: inflation.monthly,
    difference,
    status: isNearInflation ? 'similar' : isAboveInflation ? 'above' : 'below',
    context: generateContextMessage(userChangePercent, adjustedInflation, category)
  }
}

/**
 * Generate contextual message for comparison
 * NEVER shows inflation alone - always tied to user data
 */
function generateContextMessage(userChange, inflation, category) {
  const categoryLabel = category ? `en ${category}` : ''

  if (Math.abs(userChange - inflation) <= 2) {
    return `Tu gasto ${categoryLabel} siguió la inflación del mes (${inflation.toFixed(1)}%)`
  }

  if (userChange > inflation) {
    const diff = (userChange - inflation).toFixed(1)
    return `Tu gasto ${categoryLabel} subió ${diff}% más que la inflación (${inflation.toFixed(1)}%)`
  }

  const diff = (inflation - userChange).toFixed(1)
  return `Tu gasto ${categoryLabel} subió ${diff}% menos que la inflación (${inflation.toFixed(1)}%)`
}

/**
 * Get relevant macro context for monthly summary
 * Only returns data if it adds value to the user's view
 */
export function getMacroContextForMonth(month, userSpendingChange) {
  const inflation = getMonthlyInflation(month)
  if (!inflation) return null

  // Only provide context if user had significant spending change
  if (Math.abs(userSpendingChange) < 3) return null

  return compareWithInflation(userSpendingChange)
}

/**
 * Check if user's spending in a category beat inflation
 * Used for positive insights
 */
export function didBeatInflation(categoryChange, category = null) {
  const comparison = compareWithInflation(categoryChange, category)
  if (!comparison) return null

  return comparison.status === 'below'
}

/**
 * Get accumulated inflation for a period
 * @param {number} months - Number of months to calculate
 */
export function getAccumulatedInflation(months = 12) {
  const snapshots = { ...REFERENCE_INFLATION, ...getStoredSnapshots() }
  const sortedMonths = Object.keys(snapshots).sort().reverse().slice(0, months)

  if (sortedMonths.length === 0) return null

  let accumulated = 1
  for (const month of sortedMonths) {
    const monthlyRate = snapshots[month]?.monthly
    if (monthlyRate) {
      accumulated *= (1 + monthlyRate / 100)
    }
  }

  return {
    months: sortedMonths.length,
    accumulated: (accumulated - 1) * 100,
    avgMonthly: ((accumulated - 1) * 100) / sortedMonths.length
  }
}

/**
 * Format inflation for display
 */
export function formatInflation(rate) {
  if (rate === null || rate === undefined) return null
  return `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`
}
