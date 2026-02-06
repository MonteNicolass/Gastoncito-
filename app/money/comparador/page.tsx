'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { getComparatorSummary, compareProduct, type ProductComparison } from '@/lib/prices/priceComparator'
import { getProductPriceHistory, type ProductPriceHistory } from '@/lib/prices/priceHistory'
import { getTrackedProducts } from '@/lib/ratoneando/price-storage'
import { addToCart, getCart } from '@/lib/cart/cartStore'
import { saveDecision } from '@/lib/decisions/decisionStore'
import {
  Search,
  Trophy,
  ShoppingCart,
  Plus,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  Package,
  Check,
  Save,
} from 'lucide-react'

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function BadgeLabel({ badge }: { badge: 'barato' | 'normal' | 'caro' }) {
  const styles = {
    barato: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    normal: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    caro: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  }
  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${styles[badge]}`}>
      {badge === 'barato' ? 'Más barato' : badge === 'caro' ? 'Más caro' : 'Normal'}
    </span>
  )
}

export default function ComparadorPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [addedToCart, setAddedToCart] = useState<Set<string>>(new Set())
  const [cartFeedback, setCartFeedback] = useState<string | null>(null)
  const [savedComparison, setSavedComparison] = useState(false)

  const tracked = useMemo(() => getTrackedProducts(), [])
  const comparator = useMemo(() => getComparatorSummary(), [])
  const cartProductIds = useMemo(() => new Set(getCart().map(i => i.productId)), [])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return tracked
    const q = searchQuery.toLowerCase()
    return tracked.filter((p: any) => p.product_name.toLowerCase().includes(q))
  }, [tracked, searchQuery])

  const comparison: ProductComparison | null = useMemo(() => {
    if (!selectedProduct) return null
    return compareProduct(selectedProduct)
  }, [selectedProduct])

  const history: ProductPriceHistory | null = useMemo(() => {
    if (!selectedProduct) return null
    return getProductPriceHistory(selectedProduct)
  }, [selectedProduct])

  function handleAddToCart(productName: string) {
    addToCart(productName)
    setAddedToCart(prev => new Set(prev).add(productName))
    setCartFeedback(productName)
    setTimeout(() => setCartFeedback(null), 2000)
  }

  function handleSaveComparison() {
    if (!comparison || !comparison.cheapestStore) return
    saveDecision({
      tipo: 'comparacion_producto',
      producto: comparison.productName,
      tienda_barata: comparison.cheapestStore,
      precio_barato: comparison.stores[0]?.latestPrice ?? 0,
      tiendas_comparadas: comparison.stores.length,
      ahorro_vs_caro: comparison.maxSaving,
      fecha: new Date().toISOString(),
    } as any)
    setSavedComparison(true)
    setTimeout(() => setSavedComparison(false), 2000)
  }

  // Product detail view
  if (selectedProduct && (comparison || history)) {
    const name = comparison?.productName || history?.productName || selectedProduct
    const inCart = cartProductIds.has(selectedProduct) || addedToCart.has(name)

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
        <TopBar title={name} backHref="/money/comparador" action={null} />

        <div className="px-4 pt-4 space-y-4">
          {/* Price history summary */}
          {history && (
            <Card className="p-4 space-y-3">
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Histórico de precios
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Mínimo</p>
                  <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatARS(history.minPrice)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Promedio</p>
                  <p className="text-sm font-bold font-mono text-zinc-700 dark:text-zinc-300 tabular-nums">
                    {formatARS(history.avgPrice)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-500 mb-0.5">Actual</p>
                  <p className={`text-sm font-bold font-mono tabular-nums ${
                    history.isAtHistoricLow
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : history.isAboveAvg
                      ? 'text-red-500'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {history.currentPrice !== null ? formatARS(history.currentPrice) : '-'}
                  </p>
                </div>
              </div>

              {/* Summary text */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                history.isAtHistoricLow
                  ? 'bg-emerald-50 dark:bg-emerald-900/10'
                  : history.isAboveAvg
                  ? 'bg-red-50 dark:bg-red-900/10'
                  : 'bg-zinc-100 dark:bg-zinc-800'
              }`}>
                {history.isAboveAvg ? (
                  <TrendingUp className="w-4 h-4 text-red-500" />
                ) : history.deltaVsAvgPercent < -5 ? (
                  <TrendingDown className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Minus className="w-4 h-4 text-zinc-400" />
                )}
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {history.summary}
                </span>
              </div>

              <p className="text-[10px] text-zinc-400 text-center">
                {history.dataPoints} registros en {history.storeCount} tiendas
              </p>
            </Card>
          )}

          {/* Store comparison table */}
          {comparison && comparison.stores.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Ranking por tienda
                </h3>
              </div>

              <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {comparison.stores.map((store, i) => (
                  <div key={store.store} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold tabular-nums w-5 text-center ${
                        i === 0 ? 'text-amber-500' : 'text-zinc-400'
                      }`}>
                        {i + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {capitalize(store.store)}
                          </p>
                          <BadgeLabel badge={store.badge} />
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          {store.dataPoints} registros · Prom: {formatARS(store.avgPrice)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold font-mono tabular-nums ${
                        i === 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}>
                        {formatARS(store.latestPrice)}
                      </p>
                      <p className={`text-[10px] font-mono tabular-nums ${
                        store.deltaVsAvg < 0 ? 'text-emerald-600' : store.deltaVsAvg > 0 ? 'text-red-500' : 'text-zinc-400'
                      }`}>
                        {store.deltaVsAvg > 0 ? '+' : ''}{store.deltaVsAvg}% vs promedio
                      </p>
                    </div>
                  </div>
                ))}
              </Card>

              {comparison.maxSaving > 0 && (
                <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
                  <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    Ahorrás {formatARS(comparison.maxSaving)} ({comparison.maxSavingPercent}%) comprando en {capitalize(comparison.cheapestStore || '')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={() => handleAddToCart(name)}
              disabled={inCart}
              className={`w-full py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                inCart
                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
              }`}
            >
              {inCart ? (
                <>
                  <Check className="w-4 h-4" />
                  {cartFeedback === name ? 'Agregado al carrito' : 'Ya está en el carrito'}
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Agregar al carrito
                </>
              )}
            </button>

            {comparison && comparison.stores.length >= 2 && (
              <button
                onClick={handleSaveComparison}
                disabled={savedComparison}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                  savedComparison
                    ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {savedComparison ? (
                  <>
                    <Check className="w-4 h-4" />
                    Comparación guardada
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar comparación
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Product list view
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <TopBar
        title="Comparador"
        backHref="/herramientas/financieras"
        action={
          <button
            onClick={() => router.push('/money/carrito')}
            className="flex items-center gap-1 text-xs font-medium text-terra-500 active:scale-95 transition-transform"
          >
            <ShoppingCart className="w-4 h-4" />
            Carrito
          </button>
        }
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 ring-terra-500/30"
            autoFocus
          />
        </div>

        {/* Global store ranking */}
        {!searchQuery && comparator.storeRanking.length >= 2 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Ranking general
              </h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {comparator.storeRanking.slice(0, 5).map((store, i) => (
                <div
                  key={store.store}
                  className={`flex-shrink-0 px-3 py-2 rounded-xl border ${
                    i === 0
                      ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10'
                      : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50'
                  }`}
                >
                  <p className={`text-xs font-bold ${i === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500'}`}>
                    #{i + 1}
                  </p>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {capitalize(store.store)}
                  </p>
                  <p className={`text-[10px] font-mono ${
                    store.avgDelta < 0 ? 'text-emerald-600' : store.avgDelta > 0 ? 'text-red-500' : 'text-zinc-400'
                  }`}>
                    {store.avgDelta > 0 ? '+' : ''}{store.avgDelta}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Product list */}
        {tracked.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin productos registrados
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Registrá compras con producto y supermercado desde el chat para comparar precios
            </p>
          </Card>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((p: any) => {
              const comp = compareProduct(p.product_name)
              return (
                <button
                  key={p.product_name}
                  onClick={() => setSelectedProduct(p.product_name)}
                  className="w-full text-left"
                >
                  <Card className="p-3 hover:shadow-md transition-shadow active:scale-[0.99]">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {p.product_name}
                        </p>
                        {comp && comp.stores.length >= 2 ? (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {comp.stores.length} tiendas · Ahorro: {formatARS(comp.maxSaving)}
                          </p>
                        ) : (
                          <p className="text-xs text-zinc-400">
                            {formatARS(p.price)} en {p.supermarket}
                          </p>
                        )}
                      </div>
                      {comp && comp.cheapestStore && (
                        <BadgeLabel badge="barato" />
                      )}
                    </div>
                  </Card>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
