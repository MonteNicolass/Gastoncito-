'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import { Heart, AlertTriangle, CheckCircle, TrendingUp, Settings } from 'lucide-react'
import type { HealthSnapshot, CategoryBreakdown } from '@/lib/finance/healthSnapshot'
import { setEstimatedIncome } from '@/lib/finance/healthSnapshot'

interface Props {
  snapshot: HealthSnapshot
  onIncomeUpdated?: () => void
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

const LEVEL_CONFIG = {
  saludable: { color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-200/50 dark:border-emerald-800/30', Icon: CheckCircle },
  moderado: { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-200/50 dark:border-amber-800/30', Icon: TrendingUp },
  ajustado: { color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10', border: 'border-orange-200/50 dark:border-orange-800/30', Icon: AlertTriangle },
  critico: { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10', border: 'border-red-200/50 dark:border-red-800/30', Icon: AlertTriangle },
}

export default function FinancialHealthSnapshot({ snapshot, onIncomeUpdated }: Props) {
  const [showIncomeInput, setShowIncomeInput] = useState(false)
  const [incomeValue, setIncomeValue] = useState(snapshot.estimatedIncome > 0 ? String(snapshot.estimatedIncome) : '')

  function handleSaveIncome() {
    const amount = parseInt(incomeValue)
    if (amount > 0) {
      setEstimatedIncome(amount)
      setShowIncomeInput(false)
      onIncomeUpdated?.()
    }
  }

  const cfg = LEVEL_CONFIG[snapshot.level]
  const LevelIcon = cfg.Icon

  return (
    <div className="space-y-4">
      {/* Level header */}
      <Card className={`p-4 ${cfg.bg} border ${cfg.border}`}>
        <div className="flex items-center gap-3">
          <LevelIcon className={`w-5 h-5 ${cfg.color}`} />
          <div className="flex-1">
            <p className={`text-sm font-semibold ${cfg.color}`}>
              {capitalize(snapshot.level)}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {snapshot.summary}
            </p>
          </div>
        </div>
      </Card>

      {/* Income setting */}
      {!snapshot.hasIncome && !showIncomeInput && (
        <button
          onClick={() => setShowIncomeInput(true)}
          className="w-full p-3 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 text-center hover:border-terra-400 dark:hover:border-terra-600 transition-colors active:scale-[0.99]"
        >
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Configurar ingreso mensual estimado
          </p>
          <p className="text-[10px] text-zinc-400 mt-0.5">
            Para calcular tu salud financiera
          </p>
        </button>
      )}

      {showIncomeInput && (
        <Card className="p-4 space-y-3">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Ingreso mensual estimado
          </p>
          <div className="flex gap-2">
            <input
              type="number"
              value={incomeValue}
              onChange={(e) => setIncomeValue(e.target.value)}
              placeholder="Ej: 500000"
              className="flex-1 px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 ring-terra-500/30"
              autoFocus
            />
            <button
              onClick={handleSaveIncome}
              className="px-4 py-2 rounded-xl bg-terra-500 text-white text-sm font-semibold active:scale-95 transition-transform"
            >
              Guardar
            </button>
          </div>
        </Card>
      )}

      {/* Ratio bars */}
      {snapshot.hasIncome && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-zinc-500" />
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Distribución del ingreso
              </h3>
            </div>
            <button
              onClick={() => setShowIncomeInput(true)}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>

          {/* Income display */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Ingreso estimado</span>
            <span className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
              {formatARS(snapshot.estimatedIncome)}
            </span>
          </div>

          {/* Stacked bar */}
          <div>
            <div className="h-4 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex">
              <div
                className="h-full bg-terra-500 transition-all"
                style={{ width: `${Math.min(snapshot.expenseRatio, 100)}%` }}
                title={`Gastos: ${snapshot.expenseRatio}%`}
              />
              {snapshot.remainingRatio > 0 && (
                <div
                  className="h-full bg-emerald-400 transition-all"
                  style={{ width: `${snapshot.remainingRatio}%` }}
                  title={`Disponible: ${snapshot.remainingRatio}%`}
                />
              )}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-terra-500 font-medium">
                Gastos {snapshot.expenseRatio}%
              </span>
              {snapshot.remainingRatio > 0 && (
                <span className="text-[10px] text-emerald-500 font-medium">
                  Disponible {snapshot.remainingRatio}%
                </span>
              )}
            </div>
          </div>

          {/* Subscriptions ratio */}
          {snapshot.subscriptionsTotal > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Suscripciones
              </span>
              <div className="text-right">
                <span className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                  {formatARS(snapshot.subscriptionsTotal)}
                </span>
                <span className={`text-xs ml-1.5 font-semibold ${
                  snapshot.subscriptionRatio > 20
                    ? 'text-red-500'
                    : snapshot.subscriptionRatio > 12
                    ? 'text-amber-500'
                    : 'text-zinc-400'
                }`}>
                  ({snapshot.subscriptionRatio}%)
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Critical categories */}
      {snapshot.criticalCategories.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Categorías por encima del promedio
          </h3>
          <Card className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {snapshot.criticalCategories.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {capitalize(cat.name)}
                  </p>
                  <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    +{cat.vsAvgPercent}% vs meses anteriores
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                    {formatARS(cat.amount)}
                  </p>
                  <p className="text-[10px] text-red-500 font-semibold">
                    {cat.percent}% del gasto
                  </p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
