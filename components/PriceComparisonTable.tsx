'use client'

import { TrendingDown, TrendingUp, Minus, BarChart3 } from 'lucide-react'

interface PriceEntry {
  store: string
  price: number
}

interface PriceRow {
  product: string
  entries: PriceEntry[]
  cheapestStore: string
  avgPrice: number
}

interface Props {
  rows: PriceRow[]
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

function getDelta(price: number, avg: number): { percent: number; label: 'barato' | 'normal' | 'caro' } {
  if (avg === 0) return { percent: 0, label: 'normal' }
  const percent = Math.round(((price - avg) / avg) * 100)
  if (percent <= -10) return { percent, label: 'barato' }
  if (percent >= 10) return { percent, label: 'caro' }
  return { percent, label: 'normal' }
}

const BADGE_STYLES = {
  barato: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    Icon: TrendingDown,
  },
  normal: {
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'text-zinc-500 dark:text-zinc-400',
    Icon: Minus,
  },
  caro: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    Icon: TrendingUp,
  },
}

export default function PriceComparisonTable({ rows }: Props) {
  if (!rows || rows.length === 0) return null

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <BarChart3 className="w-4 h-4 text-terra-500" />
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Comparador de precios
        </h3>
      </div>

      <div className="rounded-2xl bg-white dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border-b border-zinc-200/60 dark:border-zinc-700/60">
          <span className="text-[10px] font-semibold text-zinc-400 uppercase">Producto</span>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase text-right w-16">Dónde</span>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase text-right w-16">Precio</span>
          <span className="text-[10px] font-semibold text-zinc-400 uppercase text-right w-14">vs avg</span>
        </div>

        {/* Rows */}
        {rows.map((row, i) => {
          const cheapest = row.entries.reduce(
            (min, e) => (e.price < min.price ? e : min),
            row.entries[0]
          )
          const { percent, label } = getDelta(cheapest.price, row.avgPrice)
          const badge = BADGE_STYLES[label]
          const BadgeIcon = badge.Icon

          return (
            <div
              key={row.product}
              className={`grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 items-center ${
                i < rows.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''
              }`}
            >
              {/* Product */}
              <div className="min-w-0">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate block">
                  {capitalize(row.product)}
                </span>
                {row.entries.length > 1 && (
                  <span className="text-[10px] text-zinc-400">
                    {row.entries.length} opciones
                  </span>
                )}
              </div>

              {/* Store */}
              <span className="text-xs text-zinc-600 dark:text-zinc-400 w-16 text-right truncate">
                {capitalize(cheapest.store)}
              </span>

              {/* Price */}
              <span className={`text-sm font-bold font-mono w-16 text-right ${
                label === 'barato'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : label === 'caro'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-zinc-700 dark:text-zinc-300'
              }`}>
                {formatARS(cheapest.price)}
              </span>

              {/* Delta badge */}
              <div className="w-14 flex justify-end">
                {label !== 'normal' && (
                  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                    <BadgeIcon className="w-2.5 h-2.5" />
                    {percent > 0 ? '+' : ''}{percent}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
