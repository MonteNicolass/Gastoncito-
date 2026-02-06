'use client'

import Card from '@/components/ui/Card'
import { BarChart3, Trophy, Store } from 'lucide-react'
import type { ProductComparison, ComparatorSummary } from '@/lib/prices/priceComparator'

interface Props {
  summary: ComparatorSummary
  onProductSelect?: (productId: string) => void
}

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
  const labels = { barato: 'Más barato', normal: 'Normal', caro: 'Más caro' }

  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${styles[badge]}`}>
      {labels[badge]}
    </span>
  )
}

export default function ProductPriceComparison({ summary, onProductSelect }: Props) {
  if (!summary.hasData) return null

  return (
    <div className="space-y-4">
      {/* Store Ranking Global */}
      {summary.storeRanking.length >= 2 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Trophy className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Ranking general de tiendas
            </h3>
          </div>

          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {summary.storeRanking.map((store, i) => (
              <div key={store.store} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold tabular-nums w-5 text-center ${
                    i === 0 ? 'text-amber-500' : 'text-zinc-400'
                  }`}>
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {capitalize(store.store)}
                    </p>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {store.productsTracked} productos comparados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BadgeLabel badge={store.badge} />
                  <span className={`text-xs font-mono font-semibold tabular-nums ${
                    store.avgDelta <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                  }`}>
                    {store.avgDelta > 0 ? '+' : ''}{store.avgDelta}%
                  </span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Product Comparison Table */}
      {summary.products.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <BarChart3 className="w-4 h-4 text-terra-500" />
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Comparar productos
            </h3>
          </div>

          <div className="space-y-1.5">
            {summary.products.slice(0, 10).map((product) => (
              <button
                key={product.productId}
                onClick={() => onProductSelect?.(product.productId)}
                className="w-full text-left"
              >
                <Card className="p-3 hover:shadow-md transition-shadow active:scale-[0.99]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate flex-1">
                      {product.productName}
                    </p>
                    {product.maxSaving > 0 && (
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 ml-2">
                        Ahorrás {formatARS(product.maxSaving)}
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {product.stores.map((store) => (
                      <div
                        key={store.store}
                        className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg border ${
                          store.badge === 'barato'
                            ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-900/10'
                            : store.badge === 'caro'
                            ? 'border-red-200 dark:border-red-800/40 bg-red-50/50 dark:bg-red-900/10'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50'
                        }`}
                      >
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-0.5">
                          {capitalize(store.store)}
                        </p>
                        <p className={`text-sm font-bold font-mono tabular-nums ${
                          store.badge === 'barato'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : store.badge === 'caro'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}>
                          {formatARS(store.latestPrice)}
                        </p>
                        <p className={`text-[10px] font-mono tabular-nums ${
                          store.deltaVsAvg < 0 ? 'text-emerald-600' : store.deltaVsAvg > 0 ? 'text-red-500' : 'text-zinc-400'
                        }`}>
                          {store.deltaVsAvg > 0 ? '+' : ''}{store.deltaVsAvg}%
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
