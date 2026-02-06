'use client'

import Card from '@/components/ui/Card'
import { TrendingUp, TrendingDown, Minus, Clock, ArrowDown } from 'lucide-react'
import type { ProductPriceHistory, PriceHistoryOverview } from '@/lib/prices/priceHistory'

interface Props {
  overview: PriceHistoryOverview
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function DeltaBadge({ percent }: { percent: number }) {
  if (percent > 5) {
    return (
      <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30">
        <TrendingUp className="w-3 h-3 text-red-500" />
        <span className="text-[10px] font-semibold text-red-600 dark:text-red-400">+{percent}%</span>
      </div>
    )
  }
  if (percent < -5) {
    return (
      <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
        <TrendingDown className="w-3 h-3 text-emerald-500" />
        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{percent}%</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800">
      <Minus className="w-3 h-3 text-zinc-400" />
      <span className="text-[10px] font-semibold text-zinc-500">Normal</span>
    </div>
  )
}

function ProductRow({ product }: { product: ProductPriceHistory }) {
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {product.productName}
          </p>
          <DeltaBadge percent={product.deltaVsAvgPercent} />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {product.summary}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        {product.currentPrice !== null && (
          <p className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
            {formatARS(product.currentPrice)}
          </p>
        )}
        <div className="flex items-center gap-2 justify-end mt-0.5">
          <span className="text-[10px] text-zinc-400">
            Min {formatARS(product.minPrice)}
          </span>
          <span className="text-[10px] text-zinc-400">
            Prom {formatARS(product.avgPrice)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function PriceHistorySummary({ overview }: Props) {
  if (!overview.hasData) return null

  const aboveAvg = overview.products.filter(p => p.isAboveAvg)
  const atLow = overview.products.filter(p => p.isAtHistoricLow)
  const rest = overview.products.filter(p => !p.isAboveAvg && !p.isAtHistoricLow)

  return (
    <div className="space-y-4">
      {/* Summary counters */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-800/30 p-3 text-center">
          <p className="text-lg font-bold text-red-600 dark:text-red-400 tabular-nums">
            {overview.productsAboveAvg}
          </p>
          <p className="text-[10px] text-red-600/70 dark:text-red-400/70 font-medium">Sobre promedio</p>
        </div>
        <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 p-3 text-center">
          <p className="text-lg font-bold text-zinc-700 dark:text-zinc-300 tabular-nums">
            {overview.products.length - overview.productsAboveAvg - overview.productsAtLow}
          </p>
          <p className="text-[10px] text-zinc-500 font-medium">Normal</p>
        </div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {overview.productsAtLow}
          </p>
          <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70 font-medium">Mínimo hist.</p>
        </div>
      </div>

      {/* Products above average */}
      {aboveAvg.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <TrendingUp className="w-4 h-4 text-red-500" />
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Por encima de tu promedio
            </h3>
          </div>
          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {aboveAvg.slice(0, 5).map((p) => (
              <ProductRow key={p.productId} product={p} />
            ))}
          </Card>
        </div>
      )}

      {/* Products at historic low */}
      {atLow.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <ArrowDown className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              En mínimo histórico
            </h3>
          </div>
          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {atLow.slice(0, 5).map((p) => (
              <ProductRow key={p.productId} product={p} />
            ))}
          </Card>
        </div>
      )}

      {/* Rest */}
      {rest.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Clock className="w-4 h-4 text-zinc-400" />
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Todos los productos
            </h3>
          </div>
          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {rest.slice(0, 8).map((p) => (
              <ProductRow key={p.productId} product={p} />
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
