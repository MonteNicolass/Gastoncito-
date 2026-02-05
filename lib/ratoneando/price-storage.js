/**
 * Price Storage System
 * Stores product prices in localStorage (no IndexedDB modification)
 *
 * Philosophy: Only store products the user actually buys
 */

const PRICES_KEY = 'gaston_product_prices'
const PRICE_HISTORY_KEY = 'gaston_price_history'

/**
 * Get all stored prices
 */
export function getStoredPrices() {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(PRICES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Save prices to storage
 */
export function savePrices(prices) {
  if (typeof window === 'undefined') return
  localStorage.setItem(PRICES_KEY, JSON.stringify(prices))
}

/**
 * Add or update a product price
 * Always keeps history, never overwrites
 */
export function upsertPrice(priceData) {
  const { product_name, brand, category, supermarket, price, unit } = priceData

  if (!product_name || !price || !supermarket) return null

  const prices = getStoredPrices()
  const now = new Date().toISOString()

  const newPrice = {
    id: `price_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    product_name: normalizeProductName(product_name),
    brand: brand || null,
    category: category || inferCategory(product_name),
    supermarket: normalizeSupermarket(supermarket),
    price,
    unit: unit || 'unidad',
    fetched_at: now
  }

  prices.push(newPrice)
  savePrices(prices)

  // Also update history for trends
  addToHistory(newPrice)

  return newPrice
}

/**
 * Get latest price for a product at a specific supermarket
 */
export function getLatestPrice(productName, supermarket = null) {
  const prices = getStoredPrices()
  const normalized = normalizeProductName(productName)

  let filtered = prices.filter(p =>
    normalizeProductName(p.product_name) === normalized
  )

  if (supermarket) {
    filtered = filtered.filter(p =>
      normalizeSupermarket(p.supermarket) === normalizeSupermarket(supermarket)
    )
  }

  // Sort by date, most recent first
  filtered.sort((a, b) => new Date(b.fetched_at) - new Date(a.fetched_at))

  return filtered[0] || null
}

/**
 * Get all prices for a product (across supermarkets)
 */
export function getPricesForProduct(productName) {
  const prices = getStoredPrices()
  const normalized = normalizeProductName(productName)

  // Group by supermarket, keep only latest per supermarket
  const bySuper = {}

  prices
    .filter(p => normalizeProductName(p.product_name) === normalized)
    .sort((a, b) => new Date(b.fetched_at) - new Date(a.fetched_at))
    .forEach(p => {
      const superKey = normalizeSupermarket(p.supermarket)
      if (!bySuper[superKey]) {
        bySuper[superKey] = p
      }
    })

  return Object.values(bySuper)
}

/**
 * Get cheapest option for a product
 */
export function getCheapestOption(productName) {
  const options = getPricesForProduct(productName)
  if (options.length === 0) return null

  return options.reduce((min, p) => p.price < min.price ? p : min, options[0])
}

/**
 * Get price history for a product
 */
export function getPriceHistory(productName, days = 90) {
  if (typeof window === 'undefined') return []

  try {
    const historyData = localStorage.getItem(PRICE_HISTORY_KEY)
    const history = historyData ? JSON.parse(historyData) : []

    const normalized = normalizeProductName(productName)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    return history.filter(h =>
      normalizeProductName(h.product_name) === normalized &&
      new Date(h.fetched_at) >= cutoff
    )
  } catch {
    return []
  }
}

/**
 * Add to price history
 */
function addToHistory(priceRecord) {
  if (typeof window === 'undefined') return

  try {
    const historyData = localStorage.getItem(PRICE_HISTORY_KEY)
    const history = historyData ? JSON.parse(historyData) : []

    history.push({
      product_name: priceRecord.product_name,
      supermarket: priceRecord.supermarket,
      price: priceRecord.price,
      fetched_at: priceRecord.fetched_at
    })

    // Keep only last 90 days
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)

    const cleaned = history.filter(h => new Date(h.fetched_at) >= cutoff)

    localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(cleaned))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Calculate average price for a product
 */
export function getAveragePrice(productName, days = 30) {
  const history = getPriceHistory(productName, days)
  if (history.length === 0) return null

  const sum = history.reduce((acc, h) => acc + h.price, 0)
  return sum / history.length
}

/**
 * Get price trend (up, down, stable)
 */
export function getPriceTrend(productName) {
  const history = getPriceHistory(productName, 30)
  if (history.length < 3) return 'unknown'

  // Compare first half avg vs second half avg
  const mid = Math.floor(history.length / 2)
  const firstHalf = history.slice(0, mid)
  const secondHalf = history.slice(mid)

  const avgFirst = firstHalf.reduce((sum, h) => sum + h.price, 0) / firstHalf.length
  const avgSecond = secondHalf.reduce((sum, h) => sum + h.price, 0) / secondHalf.length

  const change = ((avgSecond - avgFirst) / avgFirst) * 100

  if (change > 5) return 'up'
  if (change < -5) return 'down'
  return 'stable'
}

/**
 * Normalize product name for comparison
 */
export function normalizeProductName(name) {
  if (!name) return ''
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Normalize supermarket name
 */
export function normalizeSupermarket(name) {
  if (!name) return 'otro'

  const normalized = name.toLowerCase().trim()

  // Common supermarket mappings
  const mappings = {
    'dia': 'dia',
    'dia%': 'dia',
    'carrefour': 'carrefour',
    'carrefour express': 'carrefour',
    'coto': 'coto',
    'coto digital': 'coto',
    'jumbo': 'jumbo',
    'disco': 'disco',
    'vea': 'vea',
    'changomas': 'changomas',
    'walmart': 'changomas',
    'la anonima': 'la anonima',
    'makro': 'makro',
    'maxiconsumo': 'maxiconsumo',
    'diarco': 'diarco',
    'vital': 'vital',
    'chino': 'almacen',
    'almacen': 'almacen',
    'verduleria': 'verduleria',
    'carniceria': 'carniceria'
  }

  for (const [key, value] of Object.entries(mappings)) {
    if (normalized.includes(key)) return value
  }

  return normalized
}

/**
 * Infer category from product name
 */
export function inferCategory(productName) {
  if (!productName) return 'otros'

  const name = productName.toLowerCase()

  const categories = {
    'lacteos': ['leche', 'yogur', 'queso', 'manteca', 'crema', 'ricota'],
    'carnes': ['carne', 'pollo', 'cerdo', 'asado', 'milanesa', 'hamburguesa', 'chorizo', 'salchicha'],
    'panaderia': ['pan', 'facturas', 'medialunas', 'galletitas', 'tostadas'],
    'frutas': ['manzana', 'banana', 'naranja', 'mandarina', 'pera', 'uva', 'frutilla'],
    'verduras': ['papa', 'tomate', 'cebolla', 'lechuga', 'zanahoria', 'zapallo', 'morron'],
    'bebidas': ['agua', 'gaseosa', 'jugo', 'cerveza', 'vino', 'coca', 'sprite', 'fanta'],
    'limpieza': ['detergente', 'lavandina', 'jabon', 'desodorante', 'shampoo', 'papel higienico'],
    'almacen': ['arroz', 'fideos', 'aceite', 'azucar', 'harina', 'sal', 'yerba', 'cafe', 'te'],
    'congelados': ['helado', 'empanadas', 'pizza', 'nuggets', 'papas fritas']
  }

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(kw => name.includes(kw))) {
      return category
    }
  }

  return 'otros'
}

/**
 * Get all unique products the user has tracked
 */
export function getTrackedProducts() {
  const prices = getStoredPrices()
  const products = new Map()

  prices.forEach(p => {
    const key = normalizeProductName(p.product_name)
    if (!products.has(key) || new Date(p.fetched_at) > new Date(products.get(key).fetched_at)) {
      products.set(key, p)
    }
  })

  return Array.from(products.values())
}

/**
 * Get products by category
 */
export function getProductsByCategory(category) {
  const products = getTrackedProducts()
  return products.filter(p => p.category === category)
}

/**
 * Clean old prices (keep last 90 days)
 */
export function cleanOldPrices() {
  const prices = getStoredPrices()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const cleaned = prices.filter(p => new Date(p.fetched_at) >= cutoff)

  if (cleaned.length !== prices.length) {
    savePrices(cleaned)
  }
}
