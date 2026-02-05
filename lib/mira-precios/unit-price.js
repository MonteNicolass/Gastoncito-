/**
 * Unit Price Module
 * Normalizes prices to standard units for fair comparison
 *
 * Philosophy: Parse common formats, handle edge cases gracefully
 */

/**
 * Standard units for normalization
 */
export const STANDARD_UNITS = {
  WEIGHT: {
    kg: 1,
    g: 0.001,
    gr: 0.001,
    mg: 0.000001
  },
  VOLUME: {
    l: 1,
    lt: 1,
    lts: 1,
    litro: 1,
    litros: 1,
    ml: 0.001,
    cc: 0.001
  },
  COUNT: {
    u: 1,
    un: 1,
    unidad: 1,
    unidades: 1,
    pack: 1,
    paq: 1
  }
}

/**
 * Common product patterns with known units
 */
const PRODUCT_PATTERNS = {
  // Weight-based products
  weight: [
    'carne', 'pollo', 'cerdo', 'pescado', 'milanesa', 'asado', 'bife',
    'queso', 'jamon', 'fiambre', 'verdura', 'fruta', 'papa', 'cebolla',
    'tomate', 'lechuga', 'manzana', 'banana', 'naranja', 'arroz', 'azucar',
    'harina', 'yerba', 'cafe'
  ],
  // Volume-based products
  volume: [
    'leche', 'aceite', 'vino', 'cerveza', 'gaseosa', 'agua', 'jugo',
    'detergente', 'lavandina', 'shampoo', 'acondicionador'
  ],
  // Count-based products
  count: [
    'huevo', 'pan', 'galletita', 'yogur', 'fideo', 'ravioles'
  ]
}

/**
 * Parse quantity and unit from product name
 * Examples:
 * - "Leche 1L" -> { quantity: 1, unit: 'l', type: 'volume' }
 * - "Queso 200g" -> { quantity: 0.2, unit: 'kg', type: 'weight' }
 * - "Huevos x12" -> { quantity: 12, unit: 'u', type: 'count' }
 */
export function parseQuantityFromName(productName) {
  const name = productName.toLowerCase()

  // Common patterns
  const patterns = [
    // "1L", "500ml", "1.5lts"
    /(\d+(?:[.,]\d+)?)\s*(l|lt|lts|litro|litros|ml|cc)\b/i,
    // "1kg", "500g", "200gr"
    /(\d+(?:[.,]\d+)?)\s*(kg|g|gr|mg)\b/i,
    // "x12", "x 6", "12u", "6 unidades"
    /x\s*(\d+)|(\d+)\s*(u|un|unidad|unidades)\b/i,
    // "pack 6", "pack de 12"
    /pack\s*(?:de\s*)?(\d+)/i
  ]

  for (const pattern of patterns) {
    const match = name.match(pattern)
    if (match) {
      // Handle different capture groups
      const numStr = match[1] || match[2] || match[0].match(/\d+/)?.[0]
      const unit = (match[2] || match[3] || '').toLowerCase()

      if (numStr) {
        const quantity = parseFloat(numStr.replace(',', '.'))
        return normalizeToStandard(quantity, unit)
      }
    }
  }

  // Try to infer from product type
  return inferFromProductType(name)
}

/**
 * Normalize quantity to standard unit
 */
function normalizeToStandard(quantity, unit) {
  const unitLower = unit.toLowerCase()

  // Check weight
  if (STANDARD_UNITS.WEIGHT[unitLower] !== undefined) {
    return {
      quantity: quantity * STANDARD_UNITS.WEIGHT[unitLower],
      unit: 'kg',
      originalQuantity: quantity,
      originalUnit: unit,
      type: 'weight'
    }
  }

  // Check volume
  if (STANDARD_UNITS.VOLUME[unitLower] !== undefined) {
    return {
      quantity: quantity * STANDARD_UNITS.VOLUME[unitLower],
      unit: 'l',
      originalQuantity: quantity,
      originalUnit: unit,
      type: 'volume'
    }
  }

  // Check count
  if (STANDARD_UNITS.COUNT[unitLower] !== undefined || !isNaN(quantity)) {
    return {
      quantity: quantity,
      unit: 'u',
      originalQuantity: quantity,
      originalUnit: unit || 'u',
      type: 'count'
    }
  }

  return null
}

/**
 * Infer unit type from product name
 */
function inferFromProductType(productName) {
  const name = productName.toLowerCase()

  for (const product of PRODUCT_PATTERNS.weight) {
    if (name.includes(product)) {
      return {
        quantity: 1,
        unit: 'kg',
        type: 'weight',
        inferred: true
      }
    }
  }

  for (const product of PRODUCT_PATTERNS.volume) {
    if (name.includes(product)) {
      return {
        quantity: 1,
        unit: 'l',
        type: 'volume',
        inferred: true
      }
    }
  }

  for (const product of PRODUCT_PATTERNS.count) {
    if (name.includes(product)) {
      return {
        quantity: 1,
        unit: 'u',
        type: 'count',
        inferred: true
      }
    }
  }

  return null
}

/**
 * Calculate price per standard unit
 * @param {number} price - Total price
 * @param {string} productName - Product name with quantity info
 */
export function calculateUnitPrice(price, productName) {
  const parsed = parseQuantityFromName(productName)

  if (!parsed || parsed.quantity === 0) {
    return null
  }

  const unitPrice = price / parsed.quantity

  return {
    unitPrice: Math.round(unitPrice * 100) / 100,
    unit: parsed.unit,
    type: parsed.type,
    quantity: parsed.quantity,
    originalQuantity: parsed.originalQuantity,
    originalUnit: parsed.originalUnit,
    inferred: parsed.inferred || false
  }
}

/**
 * Compare two products by unit price
 * @returns negative if a is cheaper, positive if b is cheaper, 0 if equal
 */
export function compareByUnitPrice(productA, productB) {
  const unitA = calculateUnitPrice(productA.price, productA.name)
  const unitB = calculateUnitPrice(productB.price, productB.name)

  // Can't compare if missing data
  if (!unitA || !unitB) {
    return null
  }

  // Can't compare different unit types
  if (unitA.type !== unitB.type) {
    return null
  }

  return unitA.unitPrice - unitB.unitPrice
}

/**
 * Format unit price for display
 */
export function formatUnitPrice(unitPriceResult) {
  if (!unitPriceResult) return null

  const { unitPrice, unit, type } = unitPriceResult

  const unitLabels = {
    kg: '/kg',
    l: '/lt',
    u: '/u'
  }

  return {
    formatted: `$${formatNumber(unitPrice)}${unitLabels[unit] || ''}`,
    short: `$${formatNumber(unitPrice)}/${unit}`,
    number: unitPrice,
    label: unitLabels[unit] || `/${unit}`
  }
}

/**
 * Find cheapest option among products by unit price
 */
export function findCheapestByUnit(products) {
  const withUnitPrices = products
    .map(p => ({
      ...p,
      unitPriceData: calculateUnitPrice(p.price, p.name)
    }))
    .filter(p => p.unitPriceData !== null)

  if (withUnitPrices.length === 0) return null

  // Group by unit type
  const byType = {}
  for (const p of withUnitPrices) {
    const type = p.unitPriceData.type
    if (!byType[type]) byType[type] = []
    byType[type].push(p)
  }

  // Find cheapest in each type
  const cheapest = {}
  for (const [type, items] of Object.entries(byType)) {
    items.sort((a, b) => a.unitPriceData.unitPrice - b.unitPriceData.unitPrice)
    cheapest[type] = items[0]
  }

  return cheapest
}

/**
 * Generate comparison insight between products
 */
export function generateUnitPriceComparison(products) {
  if (products.length < 2) return null

  const cheapest = findCheapestByUnit(products)
  if (!cheapest) return null

  const insights = []

  for (const [type, product] of Object.entries(cheapest)) {
    const others = products.filter(p => {
      const up = calculateUnitPrice(p.price, p.name)
      return up && up.type === type && p.name !== product.name
    })

    if (others.length > 0) {
      const avgOthers = others.reduce((sum, p) => {
        const up = calculateUnitPrice(p.price, p.name)
        return sum + (up?.unitPrice || 0)
      }, 0) / others.length

      const savings = ((avgOthers - product.unitPriceData.unitPrice) / avgOthers) * 100

      if (savings >= 10) {
        insights.push({
          product: product.name,
          type,
          unitPrice: product.unitPriceData.unitPrice,
          unit: product.unitPriceData.unit,
          savings: Math.round(savings),
          message: `${Math.round(savings)}% más barato por ${product.unitPriceData.unit}`
        })
      }
    }
  }

  return insights.length > 0 ? insights : null
}

/**
 * Format number helper
 */
function formatNumber(num) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0
  }).format(num)
}
