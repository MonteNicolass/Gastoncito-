'use client'

import { Minus, Plus, Trash2, Store } from 'lucide-react'

interface Props {
  productId: string
  productName: string
  quantity: number
  cheapestPrice: number | null
  cheapestStore: string | null
  onQuantityChange: (productId: string, quantity: number) => void
  onRemove: (productId: string) => void
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

export default function CartItem({
  productId,
  productName,
  quantity,
  cheapestPrice,
  cheapestStore,
  onQuantityChange,
  onRemove,
}: Props) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50">
      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
          {productName}
        </p>
        {cheapestPrice !== null && cheapestStore ? (
          <div className="flex items-center gap-1 mt-0.5">
            <Store className="w-3 h-3 text-zinc-400" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {formatARS(cheapestPrice)} en {capitalize(cheapestStore)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
            Sin datos de precio
          </p>
        )}
      </div>

      {/* Quantity controls */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onQuantityChange(productId, quantity - 1)}
          className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 active:scale-95 transition-transform"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <span className="w-8 text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
          {quantity}
        </span>
        <button
          onClick={() => onQuantityChange(productId, quantity + 1)}
          className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 active:scale-95 transition-transform"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Line total + remove */}
      <div className="flex items-center gap-2">
        {cheapestPrice !== null && (
          <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
            {formatARS(cheapestPrice * quantity)}
          </span>
        )}
        <button
          onClick={() => onRemove(productId)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors active:scale-95"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
