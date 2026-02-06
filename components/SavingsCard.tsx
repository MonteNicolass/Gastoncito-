'use client'

import { PiggyBank, ArrowDownRight, Lightbulb } from 'lucide-react'

interface SavingsItem {
  message: string
  amount: number
}

interface Props {
  totalSavings: number
  items: SavingsItem[]
  subtitle?: string
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function SavingsCard({ totalSavings, items, subtitle }: Props) {
  if (!totalSavings || totalSavings < 500) return null

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <PiggyBank className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
        <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
          Ahorro potencial / mes
        </h3>
      </div>

      <div>
        <p className="text-3xl font-display font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
          {formatARS(totalSavings)}
        </p>
        {subtitle && (
          <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Recommendations */}
      {items.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {items.slice(0, 2).map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                {i === 0 ? (
                  <ArrowDownRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Lightbulb className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-2">
                  {item.message}
                </p>
                {item.amount > 0 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium mt-0.5">
                    ~{formatARS(item.amount)}/mes
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
