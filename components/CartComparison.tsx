'use client'

import Card from '@/components/ui/Card'
import { ShoppingCart, ArrowRight, CheckCircle } from 'lucide-react'

interface CartOption {
  store: string
  estimatedCost: number
  coverage: number
  itemsFound: number
}

interface Props {
  single: CartOption
  optimized: CartOption
  basketSize: number
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function CartComparison({ single, optimized, basketSize }: Props) {
  if (!single || !optimized) return null

  const savings = single.estimatedCost - optimized.estimatedCost
  if (savings < 1000) return null

  const savingsPercent = Math.round((savings / single.estimatedCost) * 100)
  const bestIsOptimized = optimized.estimatedCost < single.estimatedCost

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <ShoppingCart className="w-4 h-4 text-zinc-500" />
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Tu changuito ({basketSize} productos)
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Option A: Single store */}
        <Card className={`p-4 ${!bestIsOptimized ? 'ring-1 ring-emerald-500/20' : 'opacity-75'}`}>
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${!bestIsOptimized ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                Todo en uno
              </span>
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {capitalize(single.store)}
            </p>
            <p className={`text-xl font-bold font-mono ${
              !bestIsOptimized ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'
            }`}>
              {formatARS(single.estimatedCost)}
            </p>
            <p className="text-[10px] text-zinc-500">
              {single.coverage}% de tu lista
            </p>
          </div>
        </Card>

        {/* Option B: Optimized */}
        <Card className={`p-4 ${bestIsOptimized ? 'ring-1 ring-emerald-500/20' : 'opacity-75'}`}>
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${bestIsOptimized ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                Más barato
              </span>
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {capitalize(optimized.store)}
            </p>
            <p className={`text-xl font-bold font-mono ${
              bestIsOptimized ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'
            }`}>
              {formatARS(optimized.estimatedCost)}
            </p>
            <p className="text-[10px] text-zinc-500">
              {optimized.coverage}% de tu lista
            </p>
          </div>
        </Card>
      </div>

      {/* Savings row */}
      <div className="flex items-center justify-center gap-2 py-2">
        <CheckCircle className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Ahorrás {formatARS(savings)} ({savingsPercent}%)
        </span>
      </div>
    </div>
  )
}
