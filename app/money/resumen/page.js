'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getCategorias } from '@/lib/storage'
import { getAllMonthlyInsights } from '@/lib/monthly-insights'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

// Helper para obtener presupuestos de localStorage
function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function ResumenMensualPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState(null)

  useEffect(() => {
    loadInsights()
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
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Card className="p-4 animate-pulse">
            <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
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
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin datos
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Registra algunos movimientos para ver el resumen mensual
            </p>
          </Card>
        </div>
      </div>
    )
  }

  const { summary, comparison, topCategories, highestDay, prediction, alerts } = insights

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Resumen Mensual" backHref="/money" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
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
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatAmount(summary.totalGastos)}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Ingresos</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatAmount(summary.totalIngresos)}
              </span>
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
        </Card>

        {/* Comparación con mes anterior */}
        {comparison.previous.totalGastos > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
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
          </Card>
        )}

        {/* Predicción fin de mes */}
        {prediction && (
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
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
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
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
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
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
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin movimientos este mes
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Registra gastos o ingresos para ver el resumen
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
