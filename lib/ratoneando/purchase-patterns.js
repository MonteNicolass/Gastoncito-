/**
 * Purchase Patterns Detection
 * Infers shopping habits from existing gastos (movimientos)
 *
 * No new inputs required - all derived from existing data
 */

import { normalizeProductName, normalizeSupermarket, inferCategory } from './price-storage'

const PATTERNS_CACHE_KEY = 'gaston_purchase_patterns'
const PATTERNS_CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

/**
 * Analyze movimientos and extract purchase patterns
 * @param {Array} movimientos - All user movements
 * @param {number} days - Analysis window (default 90)
 */
export function analyzePurchasePatterns(movimientos, days = 90) {
  const now = new Date()
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Filter to gastos in supermarket-like categories
  const relevantGastos = movimientos.filter(m => {
    if (m.tipo !== 'gasto') return false
    if (new Date(m.fecha) < cutoff) return false

    const cat = (m.categoria || '').toLowerCase()
    const motivo = (m.motivo || '').toLowerCase()

    // Supermarket-related keywords
    const superKeywords = ['super', 'mercado', 'almacen', 'chino', 'compras', 'comida',
      'dia', 'coto', 'carrefour', 'jumbo', 'disco', 'vea', 'changomas']

    return cat.includes('comida') || cat.includes('super') || cat.includes('almacen') ||
           superKeywords.some(kw => motivo.includes(kw))
  })

  if (relevantGastos.length === 0) {
    return getEmptyPatterns()
  }

  // Extract patterns
  const patterns = {
    frequentProducts: extractFrequentProducts(relevantGastos),
    preferredBrands: extractPreferredBrands(relevantGastos),
    dominantCategories: extractDominantCategories(relevantGastos),
    preferredSupermarkets: extractPreferredSupermarkets(relevantGastos),
    purchaseFrequency: calculatePurchaseFrequency(relevantGastos),
    avgBasketSize: calculateAvgBasketSize(relevantGastos),
    shoppingDays: detectShoppingDays(relevantGastos),
    monthlySpend: calculateMonthlySpend(relevantGastos),
    analyzedAt: now.toISOString(),
    dataPoints: relevantGastos.length
  }

  // Cache patterns
  cachePatterns(patterns)

  return patterns
}

/**
 * Get cached patterns or recalculate
 */
export function getCachedPatterns() {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(PATTERNS_CACHE_KEY)
    if (!cached) return null

    const patterns = JSON.parse(cached)
    const age = Date.now() - new Date(patterns.analyzedAt).getTime()

    if (age > PATTERNS_CACHE_TTL) return null

    return patterns
  } catch {
    return null
  }
}

/**
 * Cache patterns
 */
function cachePatterns(patterns) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PATTERNS_CACHE_KEY, JSON.stringify(patterns))
}

/**
 * Extract frequently purchased products
 */
function extractFrequentProducts(gastos) {
  const products = new Map()

  gastos.forEach(g => {
    // Try to extract product from motivo
    const extracted = extractProductsFromMotivo(g.motivo)

    extracted.forEach(product => {
      const key = normalizeProductName(product)
      if (!products.has(key)) {
        products.set(key, { name: product, count: 0, totalSpent: 0 })
      }
      const entry = products.get(key)
      entry.count++
      // Estimate per-product spend (rough)
      entry.totalSpent += g.monto / extracted.length
    })
  })

  // Sort by frequency and return top 20
  return Array.from(products.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map(p => ({
      name: p.name,
      frequency: p.count,
      avgSpend: Math.round(p.totalSpent / p.count),
      category: inferCategory(p.name)
    }))
}

/**
 * Extract products from motivo text
 */
function extractProductsFromMotivo(motivo) {
  if (!motivo) return []

  // Common product patterns
  const products = []
  const text = motivo.toLowerCase()

  // Single product purchases
  const singleProducts = [
    'leche', 'pan', 'huevos', 'queso', 'yogur', 'manteca',
    'arroz', 'fideos', 'aceite', 'azucar', 'harina', 'yerba', 'cafe',
    'carne', 'pollo', 'cerdo', 'pescado',
    'papa', 'tomate', 'cebolla', 'lechuga', 'zanahoria',
    'manzana', 'banana', 'naranja',
    'gaseosa', 'agua', 'cerveza', 'vino',
    'jabon', 'detergente', 'papel higienico'
  ]

  singleProducts.forEach(product => {
    if (text.includes(product)) {
      products.push(product)
    }
  })

  // If no specific products found, infer from category
  if (products.length === 0) {
    const category = inferCategory(motivo)
    if (category !== 'otros') {
      products.push(category)
    }
  }

  return products
}

/**
 * Extract preferred brands
 */
function extractPreferredBrands(gastos) {
  const brands = new Map()

  // Common brands to look for
  const knownBrands = [
    'la serenisima', 'sancor', 'ilolay', 'tregar',
    'marolio', 'arcor', 'molinos', 'ledesma',
    'coca cola', 'pepsi', 'sprite', 'fanta', 'quilmes', 'brahma',
    'dove', 'rexona', 'axe', 'sedal', 'pantene',
    'ala', 'skip', 'ariel', 'ace'
  ]

  gastos.forEach(g => {
    const motivo = (g.motivo || '').toLowerCase()

    knownBrands.forEach(brand => {
      if (motivo.includes(brand)) {
        if (!brands.has(brand)) {
          brands.set(brand, { name: brand, count: 0 })
        }
        brands.get(brand).count++
      }
    })
  })

  return Array.from(brands.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
}

/**
 * Extract dominant product categories
 */
function extractDominantCategories(gastos) {
  const categories = new Map()

  gastos.forEach(g => {
    const cat = inferCategory(g.motivo)

    if (!categories.has(cat)) {
      categories.set(cat, { name: cat, count: 0, totalSpent: 0 })
    }
    const entry = categories.get(cat)
    entry.count++
    entry.totalSpent += g.monto
  })

  return Array.from(categories.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 8)
    .map(c => ({
      ...c,
      avgSpend: Math.round(c.totalSpent / c.count),
      percentage: 0 // Will be calculated in context
    }))
}

/**
 * Extract preferred supermarkets
 */
function extractPreferredSupermarkets(gastos) {
  const supers = new Map()

  gastos.forEach(g => {
    const supermarket = extractSupermarketFromGasto(g)
    if (!supermarket) return

    const key = normalizeSupermarket(supermarket)
    if (!supers.has(key)) {
      supers.set(key, { name: supermarket, normalized: key, count: 0, totalSpent: 0 })
    }
    const entry = supers.get(key)
    entry.count++
    entry.totalSpent += g.monto
  })

  return Array.from(supers.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5)
    .map(s => ({
      ...s,
      avgSpend: Math.round(s.totalSpent / s.count)
    }))
}

/**
 * Extract supermarket name from gasto
 */
function extractSupermarketFromGasto(gasto) {
  const motivo = (gasto.motivo || '').toLowerCase()
  const metodo = (gasto.metodo || '').toLowerCase()

  const supermarkets = [
    'dia', 'carrefour', 'coto', 'jumbo', 'disco', 'vea',
    'changomas', 'walmart', 'la anonima', 'makro', 'maxiconsumo',
    'diarco', 'vital', 'chino', 'almacen'
  ]

  for (const sup of supermarkets) {
    if (motivo.includes(sup)) return sup
  }

  return null
}

/**
 * Calculate purchase frequency
 */
function calculatePurchaseFrequency(gastos) {
  if (gastos.length < 2) return { avgDaysBetween: 0, purchasesPerWeek: 0, purchasesPerMonth: 0 }

  // Sort by date
  const sorted = [...gastos].sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

  // Calculate days between purchases
  let totalDays = 0
  let gapCount = 0

  for (let i = 1; i < sorted.length; i++) {
    const days = (new Date(sorted[i].fecha) - new Date(sorted[i - 1].fecha)) / (24 * 60 * 60 * 1000)
    if (days > 0 && days < 30) { // Ignore same-day and long gaps
      totalDays += days
      gapCount++
    }
  }

  const avgDaysBetween = gapCount > 0 ? Math.round(totalDays / gapCount) : 7

  return {
    avgDaysBetween,
    purchasesPerWeek: Math.round(7 / avgDaysBetween * 10) / 10,
    purchasesPerMonth: Math.round(30 / avgDaysBetween)
  }
}

/**
 * Calculate average basket size
 */
function calculateAvgBasketSize(gastos) {
  if (gastos.length === 0) return 0

  const total = gastos.reduce((sum, g) => sum + g.monto, 0)
  return Math.round(total / gastos.length)
}

/**
 * Detect preferred shopping days
 */
function detectShoppingDays(gastos) {
  const dayCounts = [0, 0, 0, 0, 0, 0, 0] // Sun-Sat
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

  gastos.forEach(g => {
    const day = new Date(g.fecha).getDay()
    dayCounts[day]++
  })

  return dayCounts
    .map((count, i) => ({ day: i, name: dayNames[i], count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
}

/**
 * Calculate monthly spend on groceries
 */
function calculateMonthlySpend(gastos) {
  if (gastos.length === 0) return { avg: 0, last30: 0, trend: 'stable' }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

  const last30 = gastos
    .filter(g => new Date(g.fecha) >= thirtyDaysAgo)
    .reduce((sum, g) => sum + g.monto, 0)

  const prev30 = gastos
    .filter(g => new Date(g.fecha) >= sixtyDaysAgo && new Date(g.fecha) < thirtyDaysAgo)
    .reduce((sum, g) => sum + g.monto, 0)

  const avg = Math.round((last30 + prev30) / 2)

  let trend = 'stable'
  if (prev30 > 0) {
    const change = ((last30 - prev30) / prev30) * 100
    if (change > 10) trend = 'up'
    else if (change < -10) trend = 'down'
  }

  return { avg, last30: Math.round(last30), trend }
}

/**
 * Return empty patterns structure
 */
function getEmptyPatterns() {
  return {
    frequentProducts: [],
    preferredBrands: [],
    dominantCategories: [],
    preferredSupermarkets: [],
    purchaseFrequency: { avgDaysBetween: 0, purchasesPerWeek: 0, purchasesPerMonth: 0 },
    avgBasketSize: 0,
    shoppingDays: [],
    monthlySpend: { avg: 0, last30: 0, trend: 'stable' },
    analyzedAt: new Date().toISOString(),
    dataPoints: 0
  }
}

/**
 * Get user's shopping profile summary
 */
export function getShoppingProfile(patterns) {
  if (!patterns || patterns.dataPoints < 5) {
    return null
  }

  const profile = {
    primarySupermarket: patterns.preferredSupermarkets[0]?.name || null,
    shoppingStyle: getShoppingStyle(patterns),
    monthlyBudget: patterns.monthlySpend.avg,
    topCategories: patterns.dominantCategories.slice(0, 3).map(c => c.name),
    typicalBasket: patterns.avgBasketSize
  }

  return profile
}

/**
 * Determine shopping style
 */
function getShoppingStyle(patterns) {
  const { purchaseFrequency, avgBasketSize } = patterns

  if (purchaseFrequency.purchasesPerWeek >= 3 && avgBasketSize < 5000) {
    return 'frequent_small' // Compras chicas frecuentes
  }

  if (purchaseFrequency.purchasesPerWeek <= 1 && avgBasketSize > 15000) {
    return 'bulk' // Compras grandes espaciadas
  }

  return 'balanced' // Mix equilibrado
}

/**
 * Get most bought products for recommendations
 */
export function getMostBoughtProducts(patterns, limit = 10) {
  if (!patterns) return []

  return patterns.frequentProducts
    .slice(0, limit)
    .map(p => p.name)
}
