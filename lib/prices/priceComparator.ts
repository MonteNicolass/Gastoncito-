import { getStoredPrices, getPricesForProduct, normalizeProductName, getTrackedProducts } from '@/lib/ratoneando/price-storage'

// ── Types ────────────────────────────────────────────────

export interface StorePrice {
  store: string
  avgPrice: number
  latestPrice: number
  dataPoints: number
  badge: 'barato' | 'normal' | 'caro'
  deltaVsAvg: number
}

export interface ProductComparison {
  productId: string
  productName: string
  category: string | null
  stores: StorePrice[]
  globalAvg: number
  cheapestStore: string | null
  mostExpensiveStore: string | null
  maxSaving: number
  maxSavingPercent: number
}

export interface ComparatorSummary {
  products: ProductComparison[]
  storeRanking: { store: string; avgDelta: number; productsTracked: number; badge: 'barato' | 'normal' | 'caro' }[]
  hasData: boolean
}

// ── Core Functions ───────────────────────────────────────

export function getAveragePriceByStore(productName: string): Map<string, number> {
  const prices = getStoredPrices()
  const normalized = normalizeProductName(productName)
  const storeAccum = new Map<string, { sum: number; count: number }>()

  for (const p of prices) {
    if (normalizeProductName(p.product_name) !== normalized) continue
    const store = p.supermarket
    const acc = storeAccum.get(store) || { sum: 0, count: 0 }
    acc.sum += p.price
    acc.count++
    storeAccum.set(store, acc)
  }

  const result = new Map<string, number>()
  for (const [store, acc] of storeAccum) {
    result.set(store, Math.round(acc.sum / acc.count))
  }
  return result
}

export function getCheapestStore(productName: string): { store: string; avgPrice: number } | null {
  const byStore = getAveragePriceByStore(productName)
  if (byStore.size === 0) return null

  let cheapest: { store: string; avgPrice: number } | null = null
  for (const [store, avg] of byStore) {
    if (!cheapest || avg < cheapest.avgPrice) {
      cheapest = { store, avgPrice: avg }
    }
  }
  return cheapest
}

export function getPriceDeltaVsAverage(productName: string): { store: string; delta: number; deltaPercent: number }[] {
  const byStore = getAveragePriceByStore(productName)
  if (byStore.size < 2) return []

  let totalSum = 0
  let totalCount = 0
  for (const avg of byStore.values()) {
    totalSum += avg
    totalCount++
  }
  const globalAvg = totalSum / totalCount

  const result: { store: string; delta: number; deltaPercent: number }[] = []
  for (const [store, avg] of byStore) {
    result.push({
      store,
      delta: Math.round(avg - globalAvg),
      deltaPercent: globalAvg > 0 ? Math.round(((avg - globalAvg) / globalAvg) * 100) : 0,
    })
  }
  return result.sort((a, b) => a.delta - b.delta)
}

// ── Full Product Comparison ──────────────────────────────

export function compareProduct(productName: string): ProductComparison | null {
  const prices = getStoredPrices()
  const normalized = normalizeProductName(productName)
  const relevant = prices.filter((p: any) => normalizeProductName(p.product_name) === normalized)

  if (relevant.length === 0) return null

  const latestPrices = getPricesForProduct(productName)
  const byStore = getAveragePriceByStore(productName)

  if (byStore.size === 0) return null

  // Global average across all stores
  let globalSum = 0
  let globalCount = 0
  for (const p of relevant) {
    globalSum += p.price
    globalCount++
  }
  const globalAvg = globalCount > 0 ? Math.round(globalSum / globalCount) : 0

  // Build store list with badges
  const stores: StorePrice[] = []
  for (const [store, avgPrice] of byStore) {
    const latest = latestPrices.find((p: any) => p.supermarket === store)
    const deltaVsAvg = globalAvg > 0 ? Math.round(((avgPrice - globalAvg) / globalAvg) * 100) : 0
    stores.push({
      store,
      avgPrice,
      latestPrice: latest?.price ?? avgPrice,
      dataPoints: relevant.filter((p: any) => p.supermarket === store).length,
      badge: deltaVsAvg <= -8 ? 'barato' : deltaVsAvg >= 8 ? 'caro' : 'normal',
      deltaVsAvg,
    })
  }

  stores.sort((a, b) => a.avgPrice - b.avgPrice)

  const cheapestStore = stores.length > 0 ? stores[0].store : null
  const mostExpensiveStore = stores.length > 1 ? stores[stores.length - 1].store : null
  const maxSaving = stores.length > 1 ? stores[stores.length - 1].avgPrice - stores[0].avgPrice : 0
  const maxSavingPercent = stores.length > 1 && stores[stores.length - 1].avgPrice > 0
    ? Math.round((maxSaving / stores[stores.length - 1].avgPrice) * 100)
    : 0

  return {
    productId: normalized,
    productName: relevant[0].product_name,
    category: relevant[0].category || null,
    stores,
    globalAvg,
    cheapestStore,
    mostExpensiveStore,
    maxSaving,
    maxSavingPercent,
  }
}

// ── Global Comparator ────────────────────────────────────

export function getComparatorSummary(): ComparatorSummary {
  const tracked = getTrackedProducts()
  if (tracked.length === 0) return { products: [], storeRanking: [], hasData: false }

  const products: ProductComparison[] = []
  const storeDeltas = new Map<string, { totalDelta: number; count: number }>()

  for (const t of tracked) {
    const comparison = compareProduct(t.product_name)
    if (!comparison || comparison.stores.length < 2) continue
    products.push(comparison)

    for (const s of comparison.stores) {
      const acc = storeDeltas.get(s.store) || { totalDelta: 0, count: 0 }
      acc.totalDelta += s.deltaVsAvg
      acc.count++
      storeDeltas.set(s.store, acc)
    }
  }

  // Build store ranking
  const storeRanking = Array.from(storeDeltas.entries())
    .map(([store, acc]) => {
      const avgDelta = Math.round(acc.totalDelta / acc.count)
      return {
        store,
        avgDelta,
        productsTracked: acc.count,
        badge: (avgDelta <= -5 ? 'barato' : avgDelta >= 5 ? 'caro' : 'normal') as 'barato' | 'normal' | 'caro',
      }
    })
    .sort((a, b) => a.avgDelta - b.avgDelta)

  return {
    products: products.sort((a, b) => b.maxSavingPercent - a.maxSavingPercent),
    storeRanking,
    hasData: products.length > 0,
  }
}
