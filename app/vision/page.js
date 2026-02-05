'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals, getWallets } from '@/lib/storage'
import { getAllOverviewData } from '@/lib/overview-insights'
import { getAllBehaviorInsights } from '@/lib/insights/behaviorInsights'
import { getAllSilentAlerts } from '@/lib/silent-alerts'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function VisionGeneralPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    loadOverview()
  }, [])

  async function loadOverview() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const categorias = await getCategorias()
      const goals = await getGoals()
      const wallets = await getWallets()
      const budgets = getBudgetsFromLocalStorage()

      const behaviorInsights = getAllBehaviorInsights(movimientos, lifeEntries)
      const overview = getAllOverviewData(movimientos, lifeEntries, categorias, goals, behaviorInsights, wallets)
      const silentAlerts = getAllSilentAlerts(movimientos, lifeEntries, budgets, categorias)

      setData(overview)
      setAlerts(silentAlerts)
    } catch (error) {
      console.error('Error loading overview:', error)
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

  const getTrendIcon = (trend) => {
    if (trend === 'up') return '↑'
    if (trend === 'down') return '↓'
    return '→'
  }

  const getTrendColor = (trend) => {
    if (trend === 'up') return 'text-red-600 dark:text-red-400'
    if (trend === 'down') return 'text-green-600 dark:text-green-400'
    return 'text-zinc-600 dark:text-zinc-400'
  }

  const getMentalTrendText = (trend) => {
    if (trend === 'improving') return 'Mejorando'
    if (trend === 'declining') return 'Bajando'
    return 'Estable'
  }

  const getMentalTrendColor = (trend) => {
    if (trend === 'improving') return 'text-green-600 dark:text-green-400'
    if (trend === 'declining') return 'text-red-600 dark:text-red-400'
    return 'text-zinc-600 dark:text-zinc-400'
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Visión General" />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Card className="p-4 animate-pulse">
            <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Visión General" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="text-center mb-2">
          <h2 className="text-sm text-zinc-500 dark:text-zinc-400">
            Resumen rápido de todas tus áreas
          </h2>
        </div>

        {/* Alertas Silenciosas */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 px-1">
              ⚠️ Alertas
            </h3>
            {alerts.map((alert, i) => (
              <Card
                key={i}
                className={`p-3 ${
                  alert.severity === 'high'
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    : alert.severity === 'medium'
                    ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {alert.title}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                      {alert.message}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Resumen Semanal */}
        {data?.weeklySummary && (
          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-200 dark:border-indigo-800">
            <div className="mb-3">
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">📅 Resumen Semanal</div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Esta semana vs anterior
              </h3>
            </div>

            <div className="space-y-3">
              {/* Money */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">💰 Money</span>
                  <span className={`text-xs font-semibold ${
                    data.weeklySummary.money.trend === 'up' ? 'text-red-600 dark:text-red-400' :
                    data.weeklySummary.money.trend === 'down' ? 'text-green-600 dark:text-green-400' :
                    'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {data.weeklySummary.money.delta !== 0 && (
                      `${data.weeklySummary.money.delta > 0 ? '+' : ''}${data.weeklySummary.money.delta}%`
                    )}
                    {data.weeklySummary.money.delta === 0 && '→'}
                  </span>
                </div>
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {formatAmount(data.weeklySummary.money.thisWeek)}
                </span>
              </div>

              {/* Mental */}
              {data.weeklySummary.mental.thisWeek > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">🧠 Mental</span>
                    <span className={`text-xs font-semibold ${
                      data.weeklySummary.mental.trend === 'improving' ? 'text-green-600 dark:text-green-400' :
                      data.weeklySummary.mental.trend === 'declining' ? 'text-red-600 dark:text-red-400' :
                      'text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {data.weeklySummary.mental.trend === 'improving' ? '↑' :
                       data.weeklySummary.mental.trend === 'declining' ? '↓' : '→'}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {data.weeklySummary.mental.thisWeek}/10
                  </span>
                </div>
              )}

              {/* Físico */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">💪 Físico</span>
                <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  {data.weeklySummary.physical.activeDays} días activos
                </span>
              </div>

              {/* Objetivos */}
              {data.weeklySummary.goals.active > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">🎯 Objetivos</span>
                  <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                    {data.weeklySummary.goals.onTrack}/{data.weeklySummary.goals.active} en camino
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Money */}
        {data?.money && (
          <a href="/money">
            <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">💰 Money</div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Gasto del mes
                  </h3>
                </div>
                <div className={`text-2xl font-bold ${getTrendColor(data.money.trend)}`}>
                  {getTrendIcon(data.money.trend)}
                </div>
              </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Gastos</span>
                <span className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatAmount(data.money.gastos)}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Balance mes</span>
                <span className={`text-lg font-semibold ${data.money.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatAmount(data.money.balance)}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Total billeteras</span>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatAmount(data.money.walletsBalance)}
                </span>
              </div>

              {data.money.topCategory && (
                <div className="pt-2 border-t border-green-200 dark:border-green-800">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Mayor gasto</div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {data.money.topCategory.name}
                    </span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatAmount(data.money.topCategory.amount)}
                    </span>
                  </div>
                </div>
              )}

              {data.money.trendPercent !== 0 && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {data.money.trendPercent > 0 ? '+' : ''}{data.money.trendPercent}% vs mes anterior
                </div>
              )}
            </div>
            </Card>
          </a>
        )}

        {/* Mental */}
        {data?.mental && data.mental.average7d > 0 && (
          <a href="/mental">
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">🧠 Mental</div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Últimos 7 días
                  </h3>
                </div>
              </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">7 días</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {data.mental.average7d}/10
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">30 días</div>
                  <div className="text-2xl font-bold text-purple-500 dark:text-purple-300">
                    {data.mental.average30d}/10
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-purple-200 dark:border-purple-800">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Tendencia</span>
                <span className={`text-sm font-semibold ${getMentalTrendColor(data.mental.trend)}`}>
                  {getMentalTrendText(data.mental.trend)}
                </span>
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                {data.mental.count} registros últimos 7 días
              </div>
            </div>
            </Card>
          </a>
        )}

        {/* Físico */}
        {data?.physical && (
          <a href="/fisico">
            <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">💪 Físico</div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Esta semana
                  </h3>
                </div>
              </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Días activos</div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {data.physical.activeDays}
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Racha actual</div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {data.physical.streak}
                </div>
              </div>
            </div>
            </Card>
          </a>
        )}

        {/* Objetivos */}
        {data?.goals && data.goals.total > 0 && (
          <a href="/objetivos">
            <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">🎯 Objetivos</div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {data.goals.total} {data.goals.total === 1 ? 'objetivo' : 'objetivos'}
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Progreso promedio</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data.goals.averageProgress}%
                </span>
              </div>

              {/* Barra de progreso */}
              <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${data.goals.averageProgress}%` }}
                />
              </div>

              {data.goals.atRisk > 0 && (
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-2">
                  {data.goals.atRisk} en riesgo (progreso bajo)
                </div>
              )}
            </div>
            </Card>
          </a>
        )}

        {/* Comportamiento */}
        {data?.behavior && data.behavior.activeAlerts > 0 && (
          <Card className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">⚠️ Comportamiento</div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                  Alertas activas
                </h3>
              </div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {data.behavior.activeAlerts}
              </div>
            </div>

            <a
              href="/comportamiento"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver detalles →
            </a>
          </Card>
        )}

        {/* Sin datos */}
        {(!data?.money && !data?.mental && !data?.physical && !data?.goals && !data?.behavior) && (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Empezá a registrar datos
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Registra movimientos, estado y hábitos para ver tu visión general
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
