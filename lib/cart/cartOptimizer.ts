import { getPricesForProduct, getCheapestOption } from '@/lib/ratoneando/price-storage'
import type { CartItem } from './cartStore'

// ── Types ────────────────────────────────────────────────

interface ProductAtStore {
  productId: string
  productName: string
  quantity: number
  supermarket: string
  unitPrice: number
  lineTotal: number
}

export interface StoreRanking {
  rank: number
  supermarket: string
  total: number
  coverage: number
  itemsFound: number
  differenceVsBest: number
  percentMoreVsBest: number
  badge: 'cheapest' | 'mid' | 'expensive' | null
}

export interface OptimizedAllocation {
  supermarket: string
  products: { productName: string; quantity: number; unitPrice: number; lineTotal: number }[]
  subtotal: number
}

export interface OptimizationResult {
  optionA: {
    label: string
    store: string
    total: number
    coverage: number
    itemsMissing: string[]
  }
  optionB: {
    label: string
    allocations: OptimizedAllocation[]
    total: number
    storeCount: number
  }
  savings: number
  savingsPercent: number
  bestStrategy: 'single_store' | 'multi_store'
  decision: {
    title: string
    allocations: OptimizedAllocation[]
    total: number
    savingsVsWorst: number
  }
}

export interface CartAnalysis {
  ranking: StoreRanking[]
  optimization: OptimizationResult | null
  hasEnoughData: boolean
  missingProducts: string[]
}

// ── Helpers ──────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ── Main Analyzer ────────────────────────────────────────

export function analyzeCart(items: CartItem[]): CartAnalysis {
  if (!items || items.length === 0) {
    return { ranking: [], optimization: null, hasEnoughData: false, missingProducts: [] }
  }

  // Step 1: Get prices for each product across stores
  const productPrices = new Map<string, Map<string, number>>()
  const allStores = new Set<string>()
  const missingProducts: string[] = []

  for (const item of items) {
    const prices = getPricesForProduct(item.productName)
    const priceMap = new Map<string, number>()

    for (const p of prices) {
      priceMap.set(p.supermarket, p.price)
      allStores.add(p.supermarket)
    }

    if (priceMap.size === 0) {
      missingProducts.push(item.productName)
    }

    productPrices.set(item.productId, priceMap)
  }

  const itemsWithPrices = items.filter(i => !missingProducts.includes(i.productName))

  if (allStores.size === 0 || itemsWithPrices.length === 0) {
    return { ranking: [], optimization: null, hasEnoughData: false, missingProducts }
  }

  // Step 2: Build per-store totals
  interface StoreTotals {
    supermarket: string
    total: number
    itemsFound: number
    itemsMissing: string[]
    breakdown: ProductAtStore[]
  }

  const storeTotals: StoreTotals[] = []

  for (const store of allStores) {
    let total = 0
    let found = 0
    const missing: string[] = []
    const breakdown: ProductAtStore[] = []

    for (const item of itemsWithPrices) {
      const priceMap = productPrices.get(item.productId)
      const price = priceMap?.get(store)

      if (price) {
        const lineTotal = price * item.quantity
        total += lineTotal
        found++
        breakdown.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          supermarket: store,
          unitPrice: price,
          lineTotal,
        })
      } else {
        missing.push(item.productName)
      }
    }

    if (found > 0) {
      storeTotals.push({
        supermarket: store,
        total: Math.round(total),
        itemsFound: found,
        itemsMissing: missing,
        breakdown,
      })
    }
  }

  // Filter to stores with >= 50% coverage
  const minCoverage = itemsWithPrices.length * 0.5
  const validStores = storeTotals.filter(s => s.itemsFound >= minCoverage)

  if (validStores.length === 0) {
    return { ranking: [], optimization: null, hasEnoughData: false, missingProducts }
  }

  // Sort by total ascending
  validStores.sort((a, b) => a.total - b.total)

  // Step 3: Build ranking
  const bestTotal = validStores[0].total
  const ranking: StoreRanking[] = validStores.map((s, i) => ({
    rank: i + 1,
    supermarket: s.supermarket,
    total: s.total,
    coverage: Math.round((s.itemsFound / itemsWithPrices.length) * 100),
    itemsFound: s.itemsFound,
    differenceVsBest: s.total - bestTotal,
    percentMoreVsBest: bestTotal > 0 ? Math.round(((s.total - bestTotal) / bestTotal) * 100) : 0,
    badge: i === 0 ? 'cheapest' : i === validStores.length - 1 && validStores.length > 2 ? 'expensive' : i > 0 ? 'mid' : null,
  }))

  // Step 4: Option A - best single store
  const bestStore = validStores[0]
  const optionA = {
    label: `Todo en ${capitalize(bestStore.supermarket)}`,
    store: bestStore.supermarket,
    total: bestStore.total,
    coverage: Math.round((bestStore.itemsFound / itemsWithPrices.length) * 100),
    itemsMissing: bestStore.itemsMissing,
  }

  // Step 5: Option B - each product at cheapest store
  const optimizedItems: { productName: string; quantity: number; unitPrice: number; lineTotal: number; supermarket: string }[] = []

  for (const item of itemsWithPrices) {
    const priceMap = productPrices.get(item.productId)
    if (!priceMap || priceMap.size === 0) continue

    let cheapestStore = ''
    let cheapestPrice = Infinity

    for (const [store, price] of priceMap) {
      if (price < cheapestPrice) {
        cheapestPrice = price
        cheapestStore = store
      }
    }

    if (cheapestStore) {
      optimizedItems.push({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: cheapestPrice,
        lineTotal: Math.round(cheapestPrice * item.quantity),
        supermarket: cheapestStore,
      })
    }
  }

  // Group by store
  const byStore = new Map<string, typeof optimizedItems>()
  for (const item of optimizedItems) {
    if (!byStore.has(item.supermarket)) byStore.set(item.supermarket, [])
    byStore.get(item.supermarket)!.push(item)
  }

  const allocations: OptimizedAllocation[] = Array.from(byStore.entries())
    .map(([store, prods]) => ({
      supermarket: store,
      products: prods.map(p => ({
        productName: p.productName,
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        lineTotal: p.lineTotal,
      })),
      subtotal: prods.reduce((s, p) => s + p.lineTotal, 0),
    }))
    .sort((a, b) => b.subtotal - a.subtotal)

  const optimizedTotal = optimizedItems.reduce((s, i) => s + i.lineTotal, 0)

  const optionB = {
    label: 'Cada producto donde sea más barato',
    allocations,
    total: optimizedTotal,
    storeCount: allocations.length,
  }

  // Step 6: Compare
  const savings = Math.max(0, optionA.total - optimizedTotal)
  const savingsPercent = optionA.total > 0 ? Math.round((savings / optionA.total) * 100) : 0
  const bestStrategy: 'single_store' | 'multi_store' = savings >= 500 && allocations.length > 1 ? 'multi_store' : 'single_store'

  // Step 7: Decision
  const worstTotal = validStores.length > 1 ? validStores[validStores.length - 1].total : optionA.total
  const winningTotal = bestStrategy === 'multi_store' ? optimizedTotal : optionA.total
  const winningAllocations = bestStrategy === 'multi_store'
    ? allocations
    : [{
        supermarket: bestStore.supermarket,
        products: bestStore.breakdown.map(b => ({
          productName: b.productName,
          quantity: b.quantity,
          unitPrice: b.unitPrice,
          lineTotal: b.lineTotal,
        })),
        subtotal: bestStore.total,
      }]

  const optimization: OptimizationResult = {
    optionA,
    optionB,
    savings,
    savingsPercent,
    bestStrategy,
    decision: {
      title: 'Conviene comprar así',
      allocations: winningAllocations,
      total: winningTotal,
      savingsVsWorst: Math.max(0, worstTotal - winningTotal),
    },
  }

  return {
    ranking,
    optimization: validStores.length >= 2 ? optimization : null,
    hasEnoughData: true,
    missingProducts,
  }
}
