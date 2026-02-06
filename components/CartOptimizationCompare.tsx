'use client'

import Card from '@/components/ui/Card'
import { ShoppingCart, CheckCircle, Store, ArrowRight } from 'lucide-react'

interface CartOption {
  store: string
  cost: number
  items: number
  coverage: number
}

interface Props {
  single: CartOption
  optimized: CartOption
  basketSize: number
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

export default function CartOptimizationCompare({ single, optimized, basketSize }: Props) {
  if (!single || !optimized) return null

  const savings = single.cost - optimized.cost
  if (savings < 500) return null

  const savingsPercent = Math.round((savings / single.cost) * 100)
  const optimizedWins = optimized.cost < single.cost

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <ShoppingCart className="w-4 h-4 text-zinc-500" />
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Tu changuito · {basketSize} productos
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Option A: Todo en uno */}
        <Card className={`p-4 relative overflow-hidden ${!optimizedWins ? 'ring-1 ring-emerald-500/20' : 'opacity-80'}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Todo en uno
              </span>
            </div>

            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {capitalize(single.store)}
            </p>

            <div>
              <p className={`text-2xl font-bold font-mono tracking-tight ${
                !optimizedWins ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'
              }`}>
                {formatARS(single.cost)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {single.coverage}% de tu lista
              </p>
            </div>

            {!optimizedWins && (
              <div className="absolute top-3 right-3">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
            )}
          </div>
        </Card>

        {/* Option B: Optimizado */}
        <Card className={`p-4 relative overflow-hidden ${optimizedWins ? 'ring-1 ring-emerald-500/20' : 'opacity-80'}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Más barato
              </span>
            </div>

            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {capitalize(optimized.store)}
            </p>

            <div>
              <p className={`text-2xl font-bold font-mono tracking-tight ${
                optimizedWins ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'
              }`}>
                {formatARS(optimized.cost)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {optimized.coverage}% de tu lista
              </p>
            </div>

            {optimizedWins && (
              <div className="absolute top-3 right-3">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Savings row */}
      <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Ahorrás {formatARS(savings)} ({savingsPercent}%)
        </span>
      </div>
    </div>
  )
}
