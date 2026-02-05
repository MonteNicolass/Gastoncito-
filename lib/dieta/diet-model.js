/**
 * Diet Model
 * Represents user's habitual food consumption
 *
 * Rules:
 * - Diet is optional
 * - If not loaded, infer from purchase patterns
 * - Never suggest new foods
 * - Never change what user eats
 */

const DIET_STORAGE_KEY = 'gaston_user_diet'
const DIET_INFERRED_KEY = 'gaston_diet_inferred'

/**
 * Diet item structure
 * @typedef {Object} DietItem
 * @property {string} name - Food/product name
 * @property {string} category - Category (carnes, lacteos, verduras, etc)
 * @property {string} frequency - 'daily' | 'weekly' | 'monthly' | 'occasional'
 * @property {number} avgMonthlyQty - Estimated monthly quantity
 * @property {boolean} isEssential - Critical for user's diet
 * @property {string} source - 'explicit' | 'inferred'
 */

/**
 * Food categories for organization
 */
export const FOOD_CATEGORIES = {
  carnes: {
    name: 'Carnes',
    items: ['carne', 'pollo', 'cerdo', 'pescado', 'milanesa', 'asado', 'bife', 'chorizo', 'hamburguesa']
  },
  lacteos: {
    name: 'Lácteos',
    items: ['leche', 'queso', 'yogur', 'manteca', 'crema', 'ricotta']
  },
  verduras: {
    name: 'Verduras',
    items: ['papa', 'tomate', 'cebolla', 'lechuga', 'zanahoria', 'zapallo', 'morron', 'acelga', 'espinaca']
  },
  frutas: {
    name: 'Frutas',
    items: ['manzana', 'banana', 'naranja', 'mandarina', 'limon', 'pera', 'uva', 'frutilla']
  },
  almacen: {
    name: 'Almacén',
    items: ['arroz', 'fideos', 'aceite', 'azucar', 'harina', 'yerba', 'cafe', 'te', 'sal', 'pan', 'galletitas']
  },
  huevos: {
    name: 'Huevos',
    items: ['huevos', 'huevo']
  },
  bebidas: {
    name: 'Bebidas',
    items: ['agua', 'gaseosa', 'jugo', 'cerveza', 'vino']
  },
  congelados: {
    name: 'Congelados',
    items: ['helado', 'empanadas', 'pizza congelada', 'vegetales congelados']
  }
}

/**
 * Get user's diet (explicit or inferred)
 * @param {Object} patterns - Purchase patterns (optional, for inference)
 * @returns {Object|null} Diet object or null
 */
export function getUserDiet(patterns = null) {
  // Try explicit diet first
  const explicit = getExplicitDiet()
  if (explicit && explicit.items.length > 0) {
    return explicit
  }

  // Try inferred diet
  const inferred = getInferredDiet()
  if (inferred && inferred.items.length > 0) {
    return inferred
  }

  // Return null if no diet available
  return null
}

/**
 * Get explicitly set diet
 */
export function getExplicitDiet() {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(DIET_STORAGE_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Get inferred diet from purchase patterns
 */
export function getInferredDiet() {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(DIET_INFERRED_KEY)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Save explicit diet
 * @param {Array} items - Diet items
 */
export function saveExplicitDiet(items) {
  if (typeof window === 'undefined') return

  const diet = {
    items,
    source: 'explicit',
    updatedAt: new Date().toISOString()
  }

  localStorage.setItem(DIET_STORAGE_KEY, JSON.stringify(diet))
}

/**
 * Save inferred diet (from purchase patterns)
 * @param {Array} items - Inferred diet items
 */
export function saveInferredDiet(items) {
  if (typeof window === 'undefined') return

  const diet = {
    items,
    source: 'inferred',
    inferredAt: new Date().toISOString()
  }

  localStorage.setItem(DIET_INFERRED_KEY, JSON.stringify(diet))
}

/**
 * Check if user has any diet data
 */
export function hasDietData() {
  const explicit = getExplicitDiet()
  const inferred = getInferredDiet()

  return (explicit && explicit.items.length > 0) || (inferred && inferred.items.length > 0)
}

/**
 * Get diet items by category
 */
export function getDietByCategory(diet) {
  if (!diet || !diet.items) return {}

  const byCategory = {}

  diet.items.forEach(item => {
    const cat = item.category || 'otros'
    if (!byCategory[cat]) {
      byCategory[cat] = []
    }
    byCategory[cat].push(item)
  })

  return byCategory
}

/**
 * Get essential diet items
 */
export function getEssentialItems(diet) {
  if (!diet || !diet.items) return []

  return diet.items.filter(item => item.isEssential)
}

/**
 * Get frequently consumed items
 */
export function getFrequentItems(diet) {
  if (!diet || !diet.items) return []

  return diet.items.filter(item =>
    item.frequency === 'daily' || item.frequency === 'weekly'
  )
}

/**
 * Check if a product is part of user's diet
 * @param {string} productName - Product to check
 * @param {Object} diet - User's diet
 */
export function isInDiet(productName, diet) {
  if (!diet || !diet.items) return false

  const normalized = productName.toLowerCase().trim()

  return diet.items.some(item => {
    const itemName = item.name.toLowerCase()
    return itemName.includes(normalized) || normalized.includes(itemName)
  })
}

/**
 * Get matching diet item for a product
 */
export function getDietItemForProduct(productName, diet) {
  if (!diet || !diet.items) return null

  const normalized = productName.toLowerCase().trim()

  return diet.items.find(item => {
    const itemName = item.name.toLowerCase()
    return itemName.includes(normalized) || normalized.includes(itemName)
  })
}

/**
 * Infer category from product name
 */
export function inferFoodCategory(productName) {
  const normalized = productName.toLowerCase()

  for (const [catKey, catData] of Object.entries(FOOD_CATEGORIES)) {
    if (catData.items.some(item => normalized.includes(item))) {
      return catKey
    }
  }

  return 'otros'
}

/**
 * Convert frequency string to monthly multiplier
 */
export function frequencyToMonthly(frequency) {
  switch (frequency) {
    case 'daily': return 30
    case 'weekly': return 4
    case 'monthly': return 1
    case 'occasional': return 0.5
    default: return 1
  }
}

/**
 * Convert purchase count to frequency
 */
export function countToFrequency(count, days = 90) {
  const perMonth = (count / days) * 30

  if (perMonth >= 15) return 'daily'
  if (perMonth >= 3) return 'weekly'
  if (perMonth >= 1) return 'monthly'
  return 'occasional'
}

/**
 * Get diet confidence level
 * @returns 'high' | 'medium' | 'low' | 'none'
 */
export function getDietConfidence(diet) {
  if (!diet) return 'none'

  if (diet.source === 'explicit') return 'high'

  const itemCount = diet.items?.length || 0

  if (itemCount >= 15) return 'high'
  if (itemCount >= 8) return 'medium'
  if (itemCount >= 3) return 'low'

  return 'none'
}

/**
 * Clear all diet data
 */
export function clearDietData() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(DIET_STORAGE_KEY)
  localStorage.removeItem(DIET_INFERRED_KEY)
}
