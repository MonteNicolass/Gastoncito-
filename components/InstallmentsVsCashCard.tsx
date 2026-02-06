'use client'

import { useState, useMemo } from 'react'
import Card from '@/components/ui/Card'
import { Calculator, CheckCircle, Equal } from 'lucide-react'
import { calculateInstallments } from '@/lib/calculators/installments'

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

const LABEL_CONFIG = {
  cuotas_mejor: { text: 'Cuotas (VP) más barato', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10', Icon: CheckCircle },
  contado_mejor: { text: 'Contado más barato', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/10', Icon: CheckCircle },
  similar: { text: 'Similar (diferencia menor al 3%)', color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800', Icon: Equal },
}

export default function InstallmentsVsCashCard() {
  const [cuotaValue, setCuotaValue] = useState('')
  const [numCuotas, setNumCuotas] = useState('12')
  const [inflacion, setInflacion] = useState('40')
  const [contado, setContado] = useState('')

  const cuota = parseFloat(cuotaValue) || 0
  const n = parseInt(numCuotas) || 0
  const inf = parseFloat(inflacion) || 0
  const cash = parseFloat(contado) || 0

  const result = useMemo(() => {
    if (cuota <= 0 || n <= 0 || inf <= 0) return null
    return calculateInstallments(cuota, n, inf, cash > 0 ? cash : undefined)
  }, [cuota, n, inf, cash])

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Calculator className="w-4 h-4 text-emerald-500" />
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Cuotas vs Contado
        </h3>
      </div>

      <Card className="p-4 space-y-3">
        {/* Inputs */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-1">
              Valor cuota
            </label>
            <input
              type="number"
              value={cuotaValue}
              onChange={(e) => setCuotaValue(e.target.value)}
              placeholder="10.000"
              className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 ring-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-1">
              Cuotas
            </label>
            <input
              type="number"
              value={numCuotas}
              onChange={(e) => setNumCuotas(e.target.value)}
              placeholder="12"
              className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 ring-emerald-500/30"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-1">
              Inflación anual (%)
            </label>
            <input
              type="number"
              value={inflacion}
              onChange={(e) => setInflacion(e.target.value)}
              placeholder="40"
              className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 ring-emerald-500/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-1">
              Contado (opcional)
            </label>
            <input
              type="number"
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              placeholder="90.000"
              className="w-full px-3 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 ring-emerald-500/30"
            />
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
            {/* PV big number */}
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Valor presente (cuotas)
              </span>
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatARS(result.presentValue)}
              </span>
            </div>

            {/* Total nominal */}
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Total nominal ({numCuotas}x {cuotaValue ? formatARS(cuota) : '-'})
              </span>
              <span className="text-sm font-semibold font-mono text-zinc-600 dark:text-zinc-400 tabular-nums">
                {formatARS(result.totalNominal)}
              </span>
            </div>

            {/* Monthly rate */}
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Tasa mensual implícita
              </span>
              <span className="text-xs font-semibold text-zinc-500 tabular-nums">
                {result.monthlyRate}%
              </span>
            </div>

            {/* vs Cash comparison */}
            {result.contado !== null && result.label && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Diferencia vs contado
                  </span>
                  <span className={`text-sm font-bold font-mono tabular-nums ${
                    (result.differenceVsCash ?? 0) < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-500'
                  }`}>
                    {(result.differenceVsCash ?? 0) > 0 ? '+' : ''}{formatARS(Math.abs(result.differenceVsCash ?? 0))}
                    {result.differencePercent !== null && ` (${result.differencePercent > 0 ? '+' : ''}${result.differencePercent}%)`}
                  </span>
                </div>

                {(() => {
                  const cfg = LABEL_CONFIG[result.label!]
                  const LabelIcon = cfg.Icon
                  return (
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cfg.bg}`}>
                      <LabelIcon className={`w-4 h-4 ${cfg.color}`} />
                      <span className={`text-sm font-semibold ${cfg.color}`}>
                        {cfg.text}
                      </span>
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
