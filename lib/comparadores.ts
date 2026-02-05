/**
 * Comparadores Económicos V1
 * Dónde comprar · Cuándo comprar · Optimización de changuito
 *
 * Funciones puras. Sin APIs externas. Sin IA.
 * Basado exclusivamente en historial de compras del usuario.
 */

// ── Types ────────────────────────────────────────────────────

export interface PurchaseRecord {
  productoId: string
  precio: number
  tienda: string
  fecha: string // ISO date or YYYY-MM-DD
}

export interface CartItem {
  productoId: string
  cantidad: number
}

// ── 1) Dónde Comprar ────────────────────────────────────────

export interface BestStoreResult {
  bestStore: string
  cheapestAvgPrice: number
  expensiveStore: string
  expensiveAvgPrice: number
  deltaPercent: number
}

interface StoreStats {
  store: string
  prices: number[]
  avg: number
}

/**
 * Para un producto, rankea tiendas por precio promedio histórico.
 * Devuelve la más barata, la más cara y el delta entre ambas.
 *
 * Retorna null si hay menos de 2 tiendas o datos insuficientes.
 */
export function getBestStoreForProduct(
  productId: string,
  history: PurchaseRecord[]
): BestStoreResult | null {
  const filtered = history.filter(
    (r) => normalize(r.productoId) === normalize(productId) && r.precio > 0
  )

  if (filtered.length === 0) return null

  // Group by tienda
  const byStore = new Map<string, number[]>()
  for (const r of filtered) {
    const key = normalize(r.tienda)
    if (!byStore.has(key)) byStore.set(key, [])
    byStore.get(key)!.push(r.precio)
  }

  const stores: StoreStats[] = Array.from(byStore.entries()).map(
    ([store, prices]) => ({
      store,
      prices,
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    })
  )

  // Edge case: una sola tienda
  if (stores.length === 1) {
    const only = stores[0]
    return {
      bestStore: only.store,
      cheapestAvgPrice: round2(only.avg),
      expensiveStore: only.store,
      expensiveAvgPrice: round2(only.avg),
      deltaPercent: 0,
    }
  }

  stores.sort((a, b) => a.avg - b.avg)

  const cheapest = stores[0]
  const expensive = stores[stores.length - 1]
  const delta =
    cheapest.avg > 0
      ? Math.round(((expensive.avg - cheapest.avg) / cheapest.avg) * 100)
      : 0

  return {
    bestStore: cheapest.store,
    cheapestAvgPrice: round2(cheapest.avg),
    expensiveStore: expensive.store,
    expensiveAvgPrice: round2(expensive.avg),
    deltaPercent: delta,
  }
}

// ── 2) Cuándo Comprar ───────────────────────────────────────

export interface BestWeekResult {
  cheapestWeek: number // 1-4
  avgPrice: number
  deltaVsOverall: number // % cheaper than overall avg
}

/**
 * Detecta la semana del mes (1–4) con precio promedio más bajo
 * para un producto, usando solo datos históricos.
 *
 * Retorna null si hay menos de 4 registros.
 */
export function getBestWeekToBuy(
  productId: string,
  history: PurchaseRecord[]
): BestWeekResult | null {
  const filtered = history.filter(
    (r) => normalize(r.productoId) === normalize(productId) && r.precio > 0
  )

  if (filtered.length < 4) return null

  // Group by week of month (1-4)
  const byWeek = new Map<number, number[]>()
  for (const r of filtered) {
    const week = weekOfMonth(r.fecha)
    if (!byWeek.has(week)) byWeek.set(week, [])
    byWeek.get(week)!.push(r.precio)
  }

  if (byWeek.size === 0) return null

  // Calculate avg per week
  const weekAvgs: { week: number; avg: number; count: number }[] = []
  for (const [week, prices] of byWeek) {
    weekAvgs.push({
      week,
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      count: prices.length,
    })
  }

  // Overall average
  const allPrices = filtered.map((r) => r.precio)
  const overallAvg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length

  // Find cheapest week
  weekAvgs.sort((a, b) => a.avg - b.avg)
  const cheapest = weekAvgs[0]

  const delta =
    overallAvg > 0
      ? Math.round(((cheapest.avg - overallAvg) / overallAvg) * 100)
      : 0

  return {
    cheapestWeek: cheapest.week,
    avgPrice: round2(cheapest.avg),
    deltaVsOverall: delta,
  }
}

// ── 3) Optimización de Changuito ────────────────────────────

export interface OptimizedStoreGroup {
  tienda: string
  productos: { productoId: string; cantidad: number; precioUnitario: number; subtotal: number }[]
  subtotal: number
}

export interface CartOptimizationResult {
  optimizedByStore: OptimizedStoreGroup[]
  totalOptimizedCost: number
  totalSingleStoreCost: number
  potentialSavings: number
}

/**
 * Dados items de un changuito, asigna cada producto a su tienda
 * históricamente más barata. Calcula ahorro vs comprar todo en una sola.
 *
 * Retorna null si no hay historial suficiente.
 */
export function optimizeCart(
  cartItems: CartItem[],
  history: PurchaseRecord[]
): CartOptimizationResult | null {
  if (cartItems.length === 0 || history.length === 0) return null

  // For each product, find best store
  const assignments: {
    productoId: string
    cantidad: number
    bestStore: string
    bestPrice: number
  }[] = []

  for (const item of cartItems) {
    const result = getBestStoreForProduct(item.productoId, history)
    if (!result) continue

    assignments.push({
      productoId: item.productoId,
      cantidad: item.cantidad,
      bestStore: result.bestStore,
      bestPrice: result.cheapestAvgPrice,
    })
  }

  if (assignments.length === 0) return null

  // Group by best store
  const byStore = new Map<string, OptimizedStoreGroup>()
  for (const a of assignments) {
    if (!byStore.has(a.bestStore)) {
      byStore.set(a.bestStore, {
        tienda: a.bestStore,
        productos: [],
        subtotal: 0,
      })
    }
    const group = byStore.get(a.bestStore)!
    const subtotal = round2(a.bestPrice * a.cantidad)
    group.productos.push({
      productoId: a.productoId,
      cantidad: a.cantidad,
      precioUnitario: a.bestPrice,
      subtotal,
    })
    group.subtotal = round2(group.subtotal + subtotal)
  }

  const optimizedByStore = Array.from(byStore.values()).sort(
    (a, b) => b.subtotal - a.subtotal
  )
  const totalOptimizedCost = round2(
    optimizedByStore.reduce((s, g) => s + g.subtotal, 0)
  )

  // Calculate single-store cost: find the store with most coverage
  // then price everything there (using that store's avg, or fallback to overall avg)
  const storeCoverage = new Map<string, number>()
  for (const a of assignments) {
    const filtered = history.filter(
      (r) => normalize(r.productoId) === normalize(a.productoId) && r.precio > 0
    )
    const stores = new Set(filtered.map((r) => normalize(r.tienda)))
    for (const s of stores) {
      storeCoverage.set(s, (storeCoverage.get(s) || 0) + 1)
    }
  }

  // Pick store with best coverage as "single store" reference
  let singleStore = ''
  let maxCoverage = 0
  for (const [store, count] of storeCoverage) {
    if (count > maxCoverage) {
      maxCoverage = count
      singleStore = store
    }
  }

  let totalSingleStoreCost = 0
  for (const a of assignments) {
    const storePrice = getAvgPriceAtStore(
      a.productoId,
      singleStore,
      history
    )
    // If no price at this store, use best price + 10% penalty
    const price = storePrice !== null ? storePrice : a.bestPrice * 1.1
    totalSingleStoreCost += round2(price * a.cantidad)
  }
  totalSingleStoreCost = round2(totalSingleStoreCost)

  const potentialSavings = round2(
    Math.max(0, totalSingleStoreCost - totalOptimizedCost)
  )

  return {
    optimizedByStore,
    totalOptimizedCost,
    totalSingleStoreCost,
    potentialSavings,
  }
}

// ── Helpers ──────────────────────────────────────────────────

function normalize(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function weekOfMonth(dateStr: string): number {
  const d = new Date(dateStr)
  const day = d.getDate()
  if (day <= 7) return 1
  if (day <= 14) return 2
  if (day <= 21) return 3
  return 4
}

function getAvgPriceAtStore(
  productId: string,
  store: string,
  history: PurchaseRecord[]
): number | null {
  const prices = history.filter(
    (r) =>
      normalize(r.productoId) === normalize(productId) &&
      normalize(r.tienda) === normalize(store) &&
      r.precio > 0
  )
  if (prices.length === 0) return null
  return prices.reduce((s, r) => s + r.precio, 0) / prices.length
}
