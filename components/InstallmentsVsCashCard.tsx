'use client'

import { useState, useMemo } from 'react'
import Card from '@/components/ui/Card'
import { Calculator, CheckCircle, Equal, Save, Check } from 'lucide-react'
import { calculateInstallments } from '@/lib/calculators/installments'
import {
  saveDecision,
  getDecisionsByType,
  type CuotasDecision,
  type FinancialDecision,
} from '@/lib/decisions/decisionStore'

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string): string {
  const d = new Date(dateString)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

const LABEL_CONFIG = {
  cuotas_mejor: { text: 'Cuotas (VP) más barato', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/10', Icon: CheckCircle },
  contado_mejor: { text: 'Contado más barato', color: 'text-terra-600 dark:text-terra-400', bg: 'bg-terra-50 dark:bg-terra-900/10', Icon: CheckCircle },
  similar: { text: 'Similar (diferencia menor al 3%)', color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800', Icon: Equal },
}

export default function InstallmentsVsCashCard() {
  const [cuotaValue, setCuotaValue] = useState('')
  const [numCuotas, setNumCuotas] = useState('12')
  const [inflacion, setInflacion] = useState('40')
  const [contado, setContado] = useState('')
  const [saved, setSaved] = useState(false)
  const [recentDecisions, setRecentDecisions] = useState<FinancialDecision[]>(
    () => getDecisionsByType('cuotas_vs_contado').slice(0, 3)
  )

  const cuota = parseFloat(cuotaValue) || 0
  const n = parseInt(numCuotas) || 0
  const inf = parseFloat(inflacion) || 0
  const cash = parseFloat(contado) || 0

  const result = useMemo(() => {
    if (cuota <= 0 || n <= 0 || inf <= 0) return null
    return calculateInstallments(cuota, n, inf, cash > 0 ? cash : undefined)
  }, [cuota, n, inf, cash])

  function handleSave() {
    if (!result) return

    const decision: Omit<CuotasDecision, 'id'> = {
      tipo: 'cuotas_vs_contado',
      inputs: {
        cuota,
        numCuotas: n,
        inflacion: inf,
        contado: cash > 0 ? cash : null,
      },
      resultado: {
        presentValue: result.presentValue,
        totalNominal: result.totalNominal,
        monthlyRate: result.monthlyRate,
        label: result.label ?? null,
        differenceVsCash: result.differenceVsCash ?? null,
        differencePercent: result.differencePercent ?? null,
      },
      fecha: new Date().toISOString(),
    }

    saveDecision(decision as any)
    setSaved(true)
    setRecentDecisions(getDecisionsByType('cuotas_vs_contado').slice(0, 3))
    setTimeout(() => setSaved(false), 2000)
  }

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
              onChange={(e) => { setCuotaValue(e.target.value); setSaved(false) }}
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
              onChange={(e) => { setNumCuotas(e.target.value); setSaved(false) }}
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
              onChange={(e) => { setInflacion(e.target.value); setSaved(false) }}
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
              onChange={(e) => { setContado(e.target.value); setSaved(false) }}
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

            {/* Save button */}
            <button
              onClick={handleSave}
              disabled={saved}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                saved
                  ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Guardado
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar análisis
                </>
              )}
            </button>
          </div>
        )}
      </Card>

      {/* Recent saved analyses */}
      {recentDecisions.length > 0 && (
        <Card className="p-3 space-y-1">
          <p className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 mb-1">
            Últimos análisis
          </p>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {recentDecisions.map(d => {
              if (d.tipo !== 'cuotas_vs_contado') return null
              const labelText = d.resultado.label === 'cuotas_mejor'
                ? 'Cuotas'
                : d.resultado.label === 'contado_mejor'
                ? 'Contado'
                : 'Similar'
              return (
                <div key={d.id} className="flex items-center justify-between py-2 px-1">
                  <div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {d.inputs.numCuotas}x {formatARS(d.inputs.cuota)}
                    </p>
                    <p className="text-[10px] text-zinc-500">
                      {formatDate(d.fecha)} · {labelText}
                    </p>
                  </div>
                  <span className="text-xs font-bold font-mono text-zinc-700 dark:text-zinc-300 tabular-nums">
                    VP {formatARS(d.resultado.presentValue)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
