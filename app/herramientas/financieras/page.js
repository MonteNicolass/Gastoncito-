'use client'

import { useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function HerramientasFinancierasPage() {
  const [cuotaValue, setCuotaValue] = useState('')
  const [numCuotas, setNumCuotas] = useState('12')
  const [tasaAnual, setTasaAnual] = useState('100')
  const [contadoValue, setContadoValue] = useState('')

  const calculatePresentValue = () => {
    const cuota = parseFloat(cuotaValue) || 0
    const n = parseInt(numCuotas) || 1
    const tasaAnualNum = parseFloat(tasaAnual) || 0
    const i = tasaAnualNum / 100 / 12 // Tasa mensual

    if (cuota === 0 || i === 0) return 0

    // Valor presente = cuota / (1 + i)^n sumado para cada mes
    let valorPresente = 0
    for (let mes = 1; mes <= n; mes++) {
      valorPresente += cuota / Math.pow(1 + i, mes)
    }

    return valorPresente
  }

  const presentValue = calculatePresentValue()
  const totalCuotas = (parseFloat(cuotaValue) || 0) * (parseInt(numCuotas) || 1)
  const contado = parseFloat(contadoValue) || 0
  const diferencia = contado > 0 ? presentValue - contado : 0
  const conviene = contado > 0 ? (presentValue < contado ? 'cuotas' : 'contado') : null

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Herramientas Financieras" backHref="/herramientas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Precios Activos */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💹</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Precios de Activos</h3>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
            Consultá cotizaciones actualizadas de dólar, acciones, bonos y más
          </p>
          <a
            href="https://finanzasargy.com"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold text-center transition-colors"
          >
            Abrir Finanzas Argy →
          </a>
        </Card>

        {/* Calculadora Cuotas vs Contado */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🧮</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cuotas vs Contado</h3>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
            Calculá el valor presente de las cuotas considerando inflación
          </p>

          <div className="space-y-3">
            {/* Inputs */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Valor de cada cuota
              </label>
              <input
                type="number"
                value={cuotaValue}
                onChange={(e) => setCuotaValue(e.target.value)}
                placeholder="Ej: 10000"
                className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Número de cuotas
              </label>
              <input
                type="number"
                value={numCuotas}
                onChange={(e) => setNumCuotas(e.target.value)}
                placeholder="Ej: 12"
                className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Inflación anual estimada (%)
              </label>
              <input
                type="number"
                value={tasaAnual}
                onChange={(e) => setTasaAnual(e.target.value)}
                placeholder="Ej: 100"
                className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Precio de contado (opcional)
              </label>
              <input
                type="number"
                value={contadoValue}
                onChange={(e) => setContadoValue(e.target.value)}
                placeholder="Ej: 90000"
                className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Results */}
            {cuotaValue && numCuotas && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Valor presente (actualizado)</span>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatAmount(presentValue)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Total nominal en cuotas</span>
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    {formatAmount(totalCuotas)}
                  </span>
                </div>

                {contado > 0 && (
                  <>
                    <div className="flex items-baseline justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">Diferencia vs contado</span>
                      <span className={`text-sm font-semibold ${diferencia < 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {diferencia < 0 ? '' : '+'}{formatAmount(Math.abs(diferencia))}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                        💡 {conviene === 'cuotas' ? 'Convienen las cuotas' : 'Conviene pagar de contado'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Comparadores de Precios */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🛒</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Comparadores de Precios</h3>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
            Encontrá los mejores precios en supermercados online
          </p>

          <div className="space-y-2">
            <a
              href="https://www.ratoneando.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-semibold text-center transition-colors"
            >
              Ratoneando →
            </a>

            <a
              href="https://www.miraprecios.com.ar"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 px-4 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-semibold text-center transition-colors"
            >
              Mira Precios →
            </a>
          </div>

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3">
            Estructura preparada para integración futura con APIs de supermercados
          </p>
        </Card>
      </div>
    </div>
  )
}
