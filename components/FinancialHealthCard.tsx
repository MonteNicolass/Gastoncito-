'use client'

import { Heart, Wallet, Receipt, Repeat, AlertCircle } from 'lucide-react'

interface CategorySlice {
  name: string
  amount: number
  percent: number
  color: string
}

interface Props {
  income: number
  expenses: number
  topCategories: CategorySlice[]
  subscriptionsTotal: number
  healthScore: number
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function getScoreConfig(score: number) {
  if (score >= 70) return { label: 'Saludable', color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500', fill: 'bg-emerald-500' }
  if (score >= 50) return { label: 'Moderado', color: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500', fill: 'bg-amber-500' }
  return { label: 'Ajustado', color: 'text-red-600 dark:text-red-400', ring: 'ring-red-500', fill: 'bg-red-500' }
}

const CATEGORY_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-purple-500',
  'bg-rose-500',
]

export default function FinancialHealthCard({ income, expenses, topCategories, subscriptionsTotal, healthScore }: Props) {
  const expenseRatio = income > 0 ? Math.min(100, Math.round((expenses / income) * 100)) : 0
  const scoreCfg = getScoreConfig(healthScore)

  return (
    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-4 h-4 text-terra-500" strokeWidth={1.75} />
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
            Salud financiera
          </h3>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          healthScore >= 70 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
          : healthScore >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {scoreCfg.label} · {healthScore}
        </span>
      </div>

      {/* Income vs Expenses ratio bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Ingresos → Gastos
          </span>
          <span className={`text-xs font-bold font-mono ${
            expenseRatio >= 90 ? 'text-red-500' :
            expenseRatio >= 70 ? 'text-amber-500' :
            'text-emerald-500'
          }`}>
            {expenseRatio}%
          </span>
        </div>

        <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              expenseRatio >= 90 ? 'bg-red-500' :
              expenseRatio >= 70 ? 'bg-amber-500' :
              'bg-emerald-500'
            }`}
            style={{ width: `${expenseRatio}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span className="font-mono">{formatARS(income)}</span>
          <span className="font-mono">{formatARS(expenses)}</span>
        </div>
      </div>

      {/* Top categories */}
      {topCategories.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          {topCategories.slice(0, 3).map((cat, i) => (
            <div key={cat.name} className="flex items-center gap-2.5">
              <div className={`w-1.5 h-4 rounded-full ${CATEGORY_COLORS[i] || CATEGORY_COLORS[0]}`} />
              <span className="text-xs text-zinc-600 dark:text-zinc-300 flex-1 capitalize truncate">
                {cat.name}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                {cat.percent}%
              </span>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 font-mono w-20 text-right">
                {formatARS(cat.amount)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Subscriptions */}
      {subscriptionsTotal > 0 && (
        <div className="flex items-center gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <Repeat className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.75} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400 flex-1">
            Suscripciones
          </span>
          <span className="text-sm font-semibold font-mono text-zinc-700 dark:text-zinc-300">
            {formatARS(subscriptionsTotal)}
          </span>
          {income > 0 && (
            <span className="text-[10px] text-zinc-400 font-mono">
              {Math.round((subscriptionsTotal / income) * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Warning if over budget */}
      {expenseRatio >= 90 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/40">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
          <span className="text-xs text-red-600 dark:text-red-400">
            Gastos al {expenseRatio}% de ingresos
          </span>
        </div>
      )}
    </div>
  )
}
