'use client'

import Card from '@/components/ui/Card'
import { Store, Shuffle, CheckCircle } from 'lucide-react'
import type { OptimizationResult } from '@/lib/cart/cartOptimizer'

interface Props {
  optimization: OptimizationResult
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

export default function CartComparison({ optimization }: Props) {
  const { optionA, optionB, savings, savingsPercent, bestStrategy } = optimization
  const singleWins = bestStrategy === 'single_store'
  const multiWins = bestStrategy === 'multi_store'

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
        Opciones de compra
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Option A: Single store */}
        <Card className={`p-4 relative overflow-hidden ${singleWins ? 'ring-1 ring-emerald-500/20' : 'opacity-80'}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Todo en uno
              </span>
            </div>

            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {capitalize(optionA.store)}
            </p>

            <div>
              <p className={`text-2xl font-bold font-mono tracking-tight ${
                singleWins ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'
              }`}>
                {formatARS(optionA.total)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {optionA.coverage}% de tu lista
              </p>
            </div>

            {singleWins && (
              <div className="absolute top-3 right-3">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
            )}
          </div>
        </Card>

        {/* Option B: Multi-store */}
        <Card className={`p-4 relative overflow-hidden ${multiWins ? 'ring-1 ring-emerald-500/20' : 'opacity-80'}`}>
          <div className="space-y-3">
            <div className="flex items-center gap-1.5">
              <Shuffle className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Optimizado
              </span>
            </div>

            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {optionB.storeCount} supermercados
            </p>

            <div>
              <p className={`text-2xl font-bold font-mono tracking-tight ${
                multiWins ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'
              }`}>
                {formatARS(optionB.total)}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                Cada uno donde sea más barato
              </p>
            </div>

            {multiWins && (
              <div className="absolute top-3 right-3">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Savings row */}
      {savings > 0 && (
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            Ahorrás {formatARS(savings)} ({savingsPercent}%) eligiendo la mejor opción
          </span>
        </div>
      )}
    </div>
  )
}
