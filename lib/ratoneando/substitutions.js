/**
 * Smart Substitutions
 * Suggests alternatives for products that became expensive
 *
 * Rules:
 * - Only suggest products/brands user has bought before
 * - Non-invasive: one suggestion at a time
 * - Don't insist if ignored
 */

import { getPricesForProduct, getAveragePrice, getPriceTrend, normalizeProductName } from './price-storage'
import { getMostBoughtProducts } from './purchase-patterns'

const SUBS_DISMISSED_KEY = 'gaston_subs_dismissed'
const SUBS_SHOWN_KEY = 'gaston_subs_shown'

// Products that can be substituted within same category
const SUBSTITUTION_GROUPS = {
  'lacteos': {
    'leche': ['leche entera', 'leche descremada', 'leche deslactosada'],
    'yogur': ['yogur firme', 'yogur bebible', 'yogur griego'],
    'queso': ['queso cremoso', 'queso rallado', 'queso untable']
  },
  'almacen': {
    'arroz': ['arroz largo fino', 'arroz parboil', 'arroz integral'],
    'fideos': ['fideos secos', 'fideos tallarin', 'fideos mostachol'],
    'aceite': ['aceite girasol', 'aceite mezcla', 'aceite oliva']
  },
  'bebidas': {
    'gaseosa': ['coca cola', 'pepsi', 'manaos', 'cunnington'],
    'agua': ['agua mineral', 'agua saborizada', 'soda']
  },
  'limpieza': {
    'detergente': ['ala', 'skip', 'ariel', 'ace', 'zorro'],
    'jabon': ['dove', 'lux', 'rexona', 'protex']
  }
}

/**
 * Find substitution opportunities
 * @param {Object} patterns - User purchase patterns
 */
export function findSubstitutions(patterns) {
  if (!patterns || patterns.dataPoints < 10) {
    return []
  }

  const substitutions = []
  const frequentProducts = patterns.frequentProducts || []
  const knownBrands = patterns.preferredBrands?.map(b => b.name) || []

  // Check each frequent product
  frequentProducts.forEach(product => {
    const trend = getPriceTrend(product.name)

    // Only suggest substitutions for rising prices
    if (trend !== 'up') return

    const avgPrice = getAveragePrice(product.name, 60)
    const currentPrices = getPricesForProduct(product.name)

    if (!avgPrice || currentPrices.length === 0) return

    const currentMin = Math.min(...currentPrices.map(p => p.price))
    const priceIncrease = ((currentMin - avgPrice) / avgPrice) * 100

    // Only if price increased >20%
    if (priceIncrease < 20) return

    // Find alternatives in same category
    const alternatives = findAlternatives(product.name, product.category, frequentProducts, knownBrands)

    if (alternatives.length === 0) return

    // Find best alternative (cheapest that user knows)
    const bestAlt = alternatives
      .map(alt => ({
        name: alt,
        prices: getPricesForProduct(alt),
        avgPrice: getAveragePrice(alt, 30)
      }))
      .filter(a => a.prices.length > 0)
      .sort((a, b) => {
        const minA = Math.min(...a.prices.map(p => p.price))
        const minB = Math.min(...b.prices.map(p => p.price))
        return minA - minB
      })[0]

    if (!bestAlt) return

    const altMinPrice = Math.min(...bestAlt.prices.map(p => p.price))
    const savings = ((currentMin - altMinPrice) / currentMin) * 100

    if (savings >= 15) {
      substitutions.push({
        id: `sub_${normalizeProductName(product.name)}_${normalizeProductName(bestAlt.name)}`,
        type: 'brand_switch',
        currentProduct: product.name,
        currentPrice: currentMin,
        priceIncrease: Math.round(priceIncrease),
        alternative: bestAlt.name,
        alternativePrice: altMinPrice,
        savings: Math.round(savings),
        message: `${capitalize(product.name)} subió ${Math.round(priceIncrease)}%`,
        detail: `${capitalize(bestAlt.name)} sale ${Math.round(savings)}% menos y ya lo compraste antes`,
        category: product.category
      })
    }
  })

  // Filter dismissed and already shown this week
  const dismissed = getDismissedSubs()
  const shown = getRecentlyShownSubs()

  return substitutions
    .filter(s => !dismissed.includes(s.id) && !shown.includes(s.id))
    .slice(0, 1) // Max 1 substitution at a time
}

/**
 * Find alternatives for a product
 */
function findAlternatives(productName, category, frequentProducts, knownBrands) {
  const alternatives = []
  const normalizedProduct = normalizeProductName(productName)

  // 1. Look in substitution groups
  const categoryGroup = SUBSTITUTION_GROUPS[category]
  if (categoryGroup) {
    Object.values(categoryGroup).forEach(group => {
      if (group.some(item => normalizeProductName(item) === normalizedProduct)) {
        // Add other items in group that user has bought
        group.forEach(item => {
          if (normalizeProductName(item) !== normalizedProduct) {
            const isBought = frequentProducts.some(fp =>
              normalizeProductName(fp.name).includes(normalizeProductName(item))
            )
            if (isBought) {
              alternatives.push(item)
            }
          }
        })
      }
    })
  }

  // 2. Look for same product different brand
  knownBrands.forEach(brand => {
    const brandedProduct = `${productName} ${brand}`
    if (frequentProducts.some(fp =>
      normalizeProductName(fp.name).includes(normalizeProductName(brand))
    )) {
      alternatives.push(brandedProduct)
    }
  })

  return alternatives
}

/**
 * Mark substitution as shown
 */
export function markSubstitutionShown(subId) {
  if (typeof window === 'undefined') return

  const shown = getRecentlyShownSubs()
  shown.push({ id: subId, at: Date.now() })

  // Keep only last 7 days
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const filtered = shown.filter(s => s.at >= cutoff)

  localStorage.setItem(SUBS_SHOWN_KEY, JSON.stringify(filtered))
}

/**
 * Dismiss a substitution permanently
 */
export function dismissSubstitution(subId) {
  if (typeof window === 'undefined') return

  const dismissed = getDismissedSubs()
  if (!dismissed.includes(subId)) {
    dismissed.push(subId)
    localStorage.setItem(SUBS_DISMISSED_KEY, JSON.stringify(dismissed))
  }
}

/**
 * Get dismissed substitution IDs
 */
function getDismissedSubs() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(SUBS_DISMISSED_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Get recently shown substitutions (last 7 days)
 */
function getRecentlyShownSubs() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(SUBS_SHOWN_KEY)
    const shown = data ? JSON.parse(data) : []

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    return shown.filter(s => s.at >= cutoff).map(s => s.id)
  } catch {
    return []
  }
}

/**
 * Format substitution for display
 */
export function formatSubstitution(sub) {
  return {
    ...sub,
    colors: {
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-700 dark:text-purple-300',
      icon: 'text-purple-500'
    }
  }
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
