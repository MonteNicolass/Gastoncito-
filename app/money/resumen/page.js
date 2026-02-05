'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getCategorias } from '@/lib/storage'
import { getAllMonthlyInsights } from '@/lib/monthly-insights'
import { fetchAllRates, getCachedRates, getRatesLastUpdated } from '@/lib/services/market-rates'
import { arsToUsdBlue, formatUsd } from '@/lib/services/currency-conversion'
import { compareWithInflation, getCurrentInflation } from '@/lib/services/macro-snapshots'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { BarChart3, TrendingUp, DollarSign } from 'lucide-react'

// Helper para obtener presupuestos de localStorage
function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function ResumenMensualPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState(null)
  const [rates, setRates] = useState(null)

  useEffect(() => {
    loadInsights()
    loadRates()
  }, [])

  async function loadInsights() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const categorias = await getCategorias()
      const budgets = getBudgetsFromLocalStorage()

      const data = getAllMonthlyInsights(movimientos, categorias, budgets)
      setInsights(data)
    } catch (error) {
      console.error('Error loading monthly insights:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadRates() {
    try {
      const fetchedRates = await fetchAllRates()
      setRates(fetchedRates)
    } catch {
      setRates(getCachedRates())
    }
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    })
  }

  const getMonthName = () => {
    const now = new Date()
    return now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Resumen Mensual" backHref="/money" />
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Month title */}
          <div className="text-center">
            <Skeleton className="w-32 h-6 mx-auto rounded-lg" />
          </div>

          {/* Balance card */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-800">
            <Skeleton className="w-24 h-4 mb-4" />
            <div className="space-y-3">
              <div className="flex justify-between">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-28 h-7" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-28 h-7" />
              </div>
              <div className="h-px bg-blue-200 dark:bg-blue-800" />
              <div className="flex justify-between">
                <Skeleton className="w-16 h-4" />
                <Skeleton className="w-32 h-9" />
              </div>
            </div>
          </div>

          {/* Comparison card */}
          <Card className="p-4">
            <Skeleton className="w-28 h-3 mb-3" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="w-24 h-4" />
                  <Skeleton className="w-20 h-5" />
                </div>
              ))}
            </div>
          </Card>

          {/* Top categories */}
          <Card className="p-4">
            <Skeleton className="w-28 h-3 mb-3" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="flex-1 h-4" />
                  <Skeleton className="w-20 h-5" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (!insights) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Resumen Mensual" backHref="/money" />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Card className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <BarChart3 className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin datos todavía
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Cuando registres movimientos, acá vas a ver el resumen del mes
            </p>
          </Card>
        </div>
      </div>
    )
  }

  const { summary, comparison, topCategories, highestDay, prediction, alerts } = insights

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Resumen Mensual" backHref="/money" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Mes actual */}
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {getMonthName()}
          </h2>
        </div>

        {/* Alertas visuales */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <Card
                key={index}
                className={`p-4 ${
                  alert.severity === 'high'
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {alert.type === 'spending_up' ? '📈' : '⚠️'}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        alert.severity === 'high'
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-yellow-700 dark:text-yellow-300'
                      }`}
                    >
                      {alert.message}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Resumen general */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Balance del mes
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Gastos</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatAmount(summary.totalGastos)}
                </span>
                {rates && summary.totalGastos >= 50000 && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">
                    ≈ {formatUsd(arsToUsdBlue(summary.totalGastos))}
                  </span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Ingresos</span>
              <div className="text-right">
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatAmount(summary.totalIngresos)}
                </span>
                {rates && summary.totalIngresos >= 50000 && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2">
                    ≈ {formatUsd(arsToUsdBlue(summary.totalIngresos))}
                  </span>
                )}
              </div>
            </div>
            <div className="h-px bg-blue-200 dark:bg-blue-800" />
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Balance</span>
              <span
                className={`text-3xl font-bold ${
                  summary.balance >= 0
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatAmount(summary.balance)}
              </span>
            </div>
          </div>
          {/* USD rate context */}
          {rates && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-blue-200 dark:border-blue-800 text-xs text-zinc-400 dark:text-zinc-500">
              <DollarSign className="w-3 h-3" />
              <span>Blue ${rates.blue?.sell?.toLocaleString('es-AR')}</span>
              {getRatesLastUpdated() && (
                <span> · {getRatesLastUpdated()}</span>
              )}
            </div>
          )}
        </Card>

        {/* Comparación con mes anterior */}
        {comparison.previous.totalGastos > 0 && (
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              vs Mes anterior
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Gastos mes anterior</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {formatAmount(comparison.previous.totalGastos)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Gastos este mes</span>
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {formatAmount(comparison.current.totalGastos)}
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Diferencia</span>
                <span
                  className={`text-sm font-medium ${
                    comparison.isSpendingUp
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}
                >
                  {comparison.isSpendingUp ? '+' : ''}
                  {comparison.deltaPercentGastos}%
                </span>
              </div>
            </div>
            {/* Inflation context - only when there's a significant spending change */}
            {(() => {
              const inflationContext = compareWithInflation(comparison.deltaPercentGastos)
              if (!inflationContext || Math.abs(comparison.deltaPercentGastos) < 5) return null

              return (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {inflationContext.context}
                  </p>
                </div>
              )
            })()}
          </Card>
        )}

        {/* Predicción fin de mes */}
        {prediction && (
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              Proyección de cierre
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Promedio diario
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatAmount(prediction.dailyAverage)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Días restantes: {prediction.remainingDays}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Proyectado: {formatAmount(prediction.projectedRemaining)}
                </span>
              </div>
              <div className="h-px bg-purple-200 dark:bg-purple-800 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  Total proyectado
                </span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatAmount(prediction.projectedTotal)}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                Basado en {prediction.currentDay} días de actividad
              </p>
            </div>
          </Card>
        )}

        {/* Top 5 categorías */}
        {topCategories.length > 0 && (
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              Top 5 categorías
            </h3>
            <div className="space-y-2">
              {topCategories.map((cat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate block">
                      {cat.name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex-shrink-0">
                    {formatAmount(cat.total)}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Día con mayor gasto */}
        {highestDay && (
          <Card className="p-4">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
              Día con mayor gasto
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatDate(highestDay.date)}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {highestDay.date.split('-')[2]} de {getMonthName().split(' ')[0]}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatAmount(highestDay.total)}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Sin datos */}
        {summary.totalGastos === 0 && summary.totalIngresos === 0 && (
          <Card className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin movimientos este mes
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Registrá gastos o ingresos para ver el resumen
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
