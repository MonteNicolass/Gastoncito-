/**
 * Price Classifier
 * Classifies a price as barato / normal / caro
 * based on user's personal purchase history
 *
 * No external APIs — purely local data
 */

// ── Types ────────────────────────────────────────────────────

export type PriceLabel = 'barato' | 'normal' | 'caro'

export interface PriceClassification {
  label: PriceLabel
  deltaPercent: number
}

export interface HistoryEntry {
  price: number
}

// ── Constants ────────────────────────────────────────────────

const CHEAP_THRESHOLD = 0.9
const EXPENSIVE_THRESHOLD = 1.1

// ── Main Function ────────────────────────────────────────────

/**
 * Classify a price relative to the user's historical average
 *
 * @param price - The current price to classify
 * @param history - Array of past price records for the same product
 * @returns { label, deltaPercent } or null if not enough history
 */
export function classifyPrice(
  price: number,
  history: HistoryEntry[]
): PriceClassification | null {
  if (!history || history.length === 0 || price <= 0) return null

  const prices = history.map(h => h.price).filter(p => p > 0)
  if (prices.length === 0) return null

  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
  if (avg <= 0) return null

  const ratio = price / avg
  const deltaPercent = Math.round((ratio - 1) * 100)

  let label: PriceLabel
  if (ratio < CHEAP_THRESHOLD) {
    label = 'barato'
  } else if (ratio > EXPENSIVE_THRESHOLD) {
    label = 'caro'
  } else {
    label = 'normal'
  }

  return { label, deltaPercent }
}
