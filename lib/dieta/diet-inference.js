/**
 * Diet Inference
 * Infers user's diet from purchase history
 *
 * Rules:
 * - Only use reliable data (min frequency threshold)
 * - Never assume foods user never bought
 * - Update inference periodically, not in real-time
 */

import {
  saveInferredDiet,
  inferFoodCategory,
  countToFrequency,
  FOOD_CATEGORIES
} from './diet-model'

const INFERENCE_CACHE_KEY = 'gaston_diet_inference_meta'
const MIN_DATA_POINTS = 10 // Minimum purchases to infer
const MIN_FREQUENCY = 2 // Minimum times bought to include

/**
 * Infer diet from purchase patterns
 * @param {Object} patterns - Purchase patterns from ratoneando
 * @param {boolean} force - Force re-inference even if recent
 */
export function inferDietFromPatterns(patterns, force = false) {
  if (!patterns || patterns.dataPoints < MIN_DATA_POINTS) {
    return null
  }

  // Check if we should re-infer
  if (!force && !shouldReinfer()) {
    return null
  }

  const dietItems = []

  // Extract from frequent products
  const frequentProducts = patterns.frequentProducts || []

  frequentProducts.forEach(product => {
    // Only include if bought at least MIN_FREQUENCY times
    if (product.frequency < MIN_FREQUENCY) return

    // Only include food-related items
    const category = inferFoodCategory(product.name)
    if (category === 'otros' && !isFoodRelated(product.name)) return

    dietItems.push({
      name: product.name,
      category,
      frequency: countToFrequency(product.frequency, 90),
      avgMonthlyQty: Math.ceil(product.frequency / 3), // 90 days / 3 = monthly
      avgMonthlySpend: product.avgSpend * Math.ceil(product.frequency / 3),
      isEssential: product.frequency >= 8, // Bought 8+ times in 90 days
      source: 'inferred',
      lastSeen: new Date().toISOString()
    })
  })

  // Add from dominant categories if not already covered
  const dominantCategories = patterns.dominantCategories || []

  dominantCategories.forEach(cat => {
    const categoryItems = getCategoryDefaults(cat.name)
    categoryItems.forEach(item => {
      // Only add if not already in diet
      const exists = dietItems.some(d =>
        d.name.toLowerCase().includes(item.toLowerCase()) ||
        item.toLowerCase().includes(d.name.toLowerCase())
      )

      if (!exists && cat.count >= 3) {
        dietItems.push({
          name: item,
          category: inferFoodCategory(item),
          frequency: 'weekly',
          avgMonthlyQty: 4,
          avgMonthlySpend: Math.round(cat.avgSpend / 3),
          isEssential: false,
          source: 'inferred_category',
          lastSeen: new Date().toISOString()
        })
      }
    })
  })

  // Save inference
  if (dietItems.length >= 3) {
    saveInferredDiet(dietItems)
    updateInferenceMeta()
  }

  return dietItems
}

/**
 * Check if product name is food-related
 */
function isFoodRelated(name) {
  const foodKeywords = [
    'comida', 'alimento', 'comestible', 'comestibles',
    'desayuno', 'almuerzo', 'cena', 'merienda',
    'snack', 'golosina', 'dulce'
  ]

  const normalized = name.toLowerCase()

  // Check food keywords
  if (foodKeywords.some(kw => normalized.includes(kw))) return true

  // Check all food categories
  for (const catData of Object.values(FOOD_CATEGORIES)) {
    if (catData.items.some(item => normalized.includes(item))) return true
  }

  return false
}

/**
 * Get default items for a category
 */
function getCategoryDefaults(categoryName) {
  const catNorm = categoryName.toLowerCase()

  // Map category names to food items
  const mappings = {
    'carnes': ['carne', 'pollo'],
    'lacteos': ['leche', 'queso'],
    'verduras': ['papa', 'tomate', 'cebolla'],
    'frutas': ['banana', 'manzana'],
    'almacen': ['arroz', 'fideos', 'aceite'],
    'bebidas': ['agua', 'gaseosa'],
    'supermercado': ['leche', 'pan', 'huevos'],
    'comida': ['arroz', 'fideos', 'aceite']
  }

  for (const [key, items] of Object.entries(mappings)) {
    if (catNorm.includes(key)) return items
  }

  return []
}

/**
 * Check if we should re-infer diet
 */
function shouldReinfer() {
  if (typeof window === 'undefined') return true

  try {
    const meta = localStorage.getItem(INFERENCE_CACHE_KEY)
    if (!meta) return true

    const { lastInferred } = JSON.parse(meta)
    const daysSince = (Date.now() - new Date(lastInferred).getTime()) / (24 * 60 * 60 * 1000)

    // Re-infer every 7 days
    return daysSince >= 7
  } catch {
    return true
  }
}

/**
 * Update inference metadata
 */
function updateInferenceMeta() {
  if (typeof window === 'undefined') return

  localStorage.setItem(INFERENCE_CACHE_KEY, JSON.stringify({
    lastInferred: new Date().toISOString()
  }))
}

/**
 * Enrich diet with price data
 * @param {Array} dietItems - Diet items
 * @param {Function} getPriceForProduct - Price lookup function
 */
export function enrichDietWithPrices(dietItems, getPriceForProduct) {
  if (!dietItems || !getPriceForProduct) return dietItems

  return dietItems.map(item => {
    const priceData = getPriceForProduct(item.name)

    if (priceData) {
      return {
        ...item,
        currentPrice: priceData.price,
        supermarket: priceData.supermarket,
        priceUpdatedAt: priceData.fetched_at
      }
    }

    return item
  })
}

/**
 * Calculate diet coverage score
 * How much of user's food purchases are covered by diet
 */
export function calculateDietCoverage(dietItems, patterns) {
  if (!dietItems || !patterns) return 0

  const frequentProducts = patterns.frequentProducts || []
  if (frequentProducts.length === 0) return 0

  let matched = 0

  frequentProducts.forEach(product => {
    const inDiet = dietItems.some(item =>
      item.name.toLowerCase().includes(product.name.toLowerCase()) ||
      product.name.toLowerCase().includes(item.name.toLowerCase())
    )
    if (inDiet) matched++
  })

  return Math.round((matched / frequentProducts.length) * 100)
}

/**
 * Identify missing essential items
 * Items user buys frequently but aren't in diet
 */
export function findMissingEssentials(dietItems, patterns) {
  if (!patterns) return []

  const frequentProducts = patterns.frequentProducts || []
  const missing = []

  frequentProducts.forEach(product => {
    // Only consider frequent purchases
    if (product.frequency < 5) return

    // Check if in diet
    const inDiet = dietItems?.some(item =>
      item.name.toLowerCase().includes(product.name.toLowerCase()) ||
      product.name.toLowerCase().includes(item.name.toLowerCase())
    )

    if (!inDiet && isFoodRelated(product.name)) {
      missing.push({
        name: product.name,
        frequency: product.frequency,
        category: inferFoodCategory(product.name)
      })
    }
  })

  return missing
}
