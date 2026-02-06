import { getStoredPrices, getPricesForProduct, getAveragePrice, normalizeProductName, getTrackedProducts } from '@/lib/ratoneando/price-storage'

// ── Types ────────────────────────────────────────────────

export interface PriceHistoryEntry {
  price: number
  store: string
  date: string
}

export interface ProductPriceHistory {
  productId: string
  productName: string
  category: string | null
  minPrice: number
  maxPrice: number
  avgPrice: number
  currentPrice: number | null
  currentStore: string | null
  deltaVsAvg: number
  deltaVsAvgPercent: number
  deltaVsMin: number
  deltaVsMinPercent: number
  isAtHistoricLow: boolean
  isAboveAvg: boolean
  summary: string
  entries: PriceHistoryEntry[]
  storeCount: number
  dataPoints: number
}

export interface PriceHistoryOverview {
  products: ProductPriceHistory[]
  productsAboveAvg: number
  productsBelowAvg: number
  productsAtLow: number
  hasData: boolean
}

// ── Core Function ────────────────────────────────────────

export function getProductPriceHistory(productName: string, days: number = 90): ProductPriceHistory | null {
  const prices = getStoredPrices()
  const normalized = normalizeProductName(productName)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const relevant = prices
    .filter((p: any) => normalizeProductName(p.product_name) === normalized)
    .filter((p: any) => new Date(p.fetched_at) >= cutoff)
    .sort((a: any, b: any) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime())

  if (relevant.length === 0) return null

  const allPrices = relevant.map((p: any) => p.price)
  const minPrice = Math.min(...allPrices)
  const maxPrice = Math.max(...allPrices)
  const avgPrice = Math.round(allPrices.reduce((s: number, p: number) => s + p, 0) / allPrices.length)

  // Current = latest entry per store
  const latestPrices = getPricesForProduct(productName)
  const currentBest = latestPrices.length > 0
    ? latestPrices.reduce((min: any, p: any) => p.price < min.price ? p : min, latestPrices[0])
    : null

  const currentPrice = currentBest?.price ?? null
  const currentStore = currentBest?.supermarket ?? null

  const deltaVsAvg = currentPrice !== null ? currentPrice - avgPrice : 0
  const deltaVsAvgPercent = currentPrice !== null && avgPrice > 0
    ? Math.round(((currentPrice - avgPrice) / avgPrice) * 100)
    : 0

  const deltaVsMin = currentPrice !== null ? currentPrice - minPrice : 0
  const deltaVsMinPercent = currentPrice !== null && minPrice > 0
    ? Math.round(((currentPrice - minPrice) / minPrice) * 100)
    : 0

  const isAtHistoricLow = currentPrice !== null && currentPrice <= minPrice
  const isAboveAvg = deltaVsAvgPercent > 5

  // Build summary text
  let summary = ''
  if (currentPrice === null) {
    summary = 'Sin precio actual registrado'
  } else if (isAtHistoricLow) {
    summary = 'Está en su precio más bajo registrado'
  } else if (deltaVsAvgPercent > 0) {
    summary = `Hoy está +${deltaVsAvgPercent}% vs tu promedio`
  } else if (deltaVsAvgPercent < 0) {
    summary = `Hoy está ${deltaVsAvgPercent}% vs tu promedio`
  } else {
    summary = 'Está en su precio promedio'
  }

  const stores = new Set(relevant.map((p: any) => p.supermarket))

  return {
    productId: normalized,
    productName: relevant[0].product_name,
    category: relevant[0].category || null,
    minPrice,
    maxPrice,
    avgPrice,
    currentPrice,
    currentStore,
    deltaVsAvg,
    deltaVsAvgPercent,
    deltaVsMin,
    deltaVsMinPercent,
    isAtHistoricLow,
    isAboveAvg,
    summary,
    entries: relevant.map((p: any) => ({
      price: p.price,
      store: p.supermarket,
      date: p.fetched_at,
    })),
    storeCount: stores.size,
    dataPoints: relevant.length,
  }
}

// ── Overview ─────────────────────────────────────────────

export function getPriceHistoryOverview(): PriceHistoryOverview {
  const tracked = getTrackedProducts()
  if (tracked.length === 0) return { products: [], productsAboveAvg: 0, productsBelowAvg: 0, productsAtLow: 0, hasData: false }

  const products: ProductPriceHistory[] = []

  for (const t of tracked) {
    const history = getProductPriceHistory(t.product_name)
    if (history && history.dataPoints >= 2) {
      products.push(history)
    }
  }

  return {
    products: products.sort((a, b) => b.deltaVsAvgPercent - a.deltaVsAvgPercent),
    productsAboveAvg: products.filter(p => p.isAboveAvg).length,
    productsBelowAvg: products.filter(p => p.deltaVsAvgPercent < -5).length,
    productsAtLow: products.filter(p => p.isAtHistoricLow).length,
    hasData: products.length > 0,
  }
}
