'use client'

import Card from '@/components/ui/Card'
import CartComparison from '@/components/CartComparison'
import { Trophy, Medal, Store, Package, ArrowDown } from 'lucide-react'
import type { CartAnalysis, StoreRanking, OptimizedAllocation } from '@/lib/cart/cartOptimizer'

interface Props {
  analysis: CartAnalysis
  cartItemCount: number
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

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-4 h-4 text-amber-500" />
  if (rank === 2) return <Medal className="w-4 h-4 text-zinc-400" />
  if (rank === 3) return <Medal className="w-4 h-4 text-amber-700" />
  return <span className="text-xs font-bold text-zinc-400 w-4 text-center">{rank}</span>
}

function RankBadge({ badge }: { badge: StoreRanking['badge'] }) {
  if (badge === 'cheapest') {
    return (
      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
        Más barato
      </span>
    )
  }
  if (badge === 'expensive') {
    return (
      <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
        Más caro
      </span>
    )
  }
  return null
}

export default function CartSummary({ analysis, cartItemCount }: Props) {
  const { ranking, optimization, missingProducts } = analysis

  return (
    <div className="space-y-4">
      {/* Store Ranking */}
      {ranking.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Store className="w-4 h-4 text-zinc-500" />
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Ranking por supermercado
            </h3>
          </div>

          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {ranking.map((store) => (
              <div key={store.supermarket} className="flex items-center gap-3 px-4 py-3">
                <RankIcon rank={store.rank} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {capitalize(store.supermarket)}
                    </p>
                    <RankBadge badge={store.badge} />
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {store.itemsFound}/{cartItemCount} productos · {store.coverage}% cobertura
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold font-mono tabular-nums ${
                    store.rank === 1
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {formatARS(store.total)}
                  </p>
                  {store.differenceVsBest > 0 && (
                    <p className="text-[10px] text-red-500">
                      +{formatARS(store.differenceVsBest)} (+{store.percentMoreVsBest}%)
                    </p>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Comparison: Option A vs Option B */}
      {optimization && (
        <CartComparison optimization={optimization} />
      )}

      {/* Decision Block */}
      {optimization && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <ArrowDown className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              {optimization.decision.title}
            </h3>
          </div>

          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 p-4 space-y-3">
              {optimization.decision.allocations.map((alloc: OptimizedAllocation) => (
                <div key={alloc.supermarket} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Store className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                        {capitalize(alloc.supermarket)}
                      </span>
                    </div>
                    <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                      {formatARS(alloc.subtotal)}
                    </span>
                  </div>
                  <div className="pl-5 space-y-0.5">
                    {alloc.products.map((p) => (
                      <div key={p.productName} className="flex items-center justify-between">
                        <span className="text-xs text-emerald-700/70 dark:text-emerald-400/70">
                          {p.productName} x{p.quantity}
                        </span>
                        <span className="text-xs font-mono text-emerald-700/70 dark:text-emerald-400/70 tabular-nums">
                          {formatARS(p.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Total */}
              <div className="pt-3 border-t border-emerald-200/50 dark:border-emerald-700/30 flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  Total
                </span>
                <span className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-300 tabular-nums">
                  {formatARS(optimization.decision.total)}
                </span>
              </div>

              {optimization.decision.savingsVsWorst > 0 && (
                <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70 text-center">
                  Ahorrás {formatARS(optimization.decision.savingsVsWorst)} vs la opción más cara
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Missing products */}
      {missingProducts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Package className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Sin datos de precio
            </h3>
          </div>
          <Card className="p-3">
            <div className="flex flex-wrap gap-1.5">
              {missingProducts.map((name) => (
                <span
                  key={name}
                  className="px-2 py-1 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                >
                  {name}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
