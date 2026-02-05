'use client'

import { useState, useEffect, useCallback } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals } from '@/lib/storage'
import { getWeeklySummary } from '@/lib/overview-insights'
import { getAllSilentAlerts } from '@/lib/silent-alerts'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import QuickActionsInline from '@/components/ui/QuickActionsInline'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function SemanaPage() {
  const [loading, setLoading] = useState(true)
  const [weekData, setWeekData] = useState(null)
  const [weeklyInsights, setWeeklyInsights] = useState([])

  useEffect(() => {
    loadWeekData()
  }, [])

  async function loadWeekData() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const categorias = await getCategorias()
      const goals = await getGoals()
      const budgets = getBudgetsFromLocalStorage()

      const weeklySummary = getWeeklySummary(movimientos, lifeEntries, categorias, goals)

      // Get insights from last 7 days
      const now = new Date()
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const recentMovimientos = movimientos.filter(m => new Date(m.fecha) >= last7Days)
      const recentEntries = lifeEntries.filter(e => new Date(e.created_at) >= last7Days)

      const alerts = getAllSilentAlerts(recentMovimientos, recentEntries, budgets, categorias)

      setWeekData(weeklySummary)
      setWeeklyInsights(alerts.slice(0, 5)) // Max 5 insights
    } catch (error) {
      console.error('Error loading week data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = useCallback((amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Esta Semana" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!weekData) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Esta Semana" />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin datos esta semana
            </h3>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Esta Semana" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Atajos rápidos */}
        <div className="pb-2">
          <QuickActionsInline onActionComplete={loadWeekData} />
        </div>

        {/* Money */}
        {weekData.money && (
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💰</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Money</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Gasto semanal</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {formatAmount(weekData.money.thisWeek)}
                </span>
              </div>

              {weekData.money.prevWeek > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400">vs semana anterior:</span>
                  <span className={`font-semibold ${
                    weekData.money.trend === 'up'
                      ? 'text-red-600 dark:text-red-400'
                      : weekData.money.trend === 'down'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {weekData.money.delta > 0 ? '+' : ''}{weekData.money.delta}%
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Mental */}
        {weekData.mental && weekData.mental.count > 0 && (
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🧠</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Mental</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Promedio semanal</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {weekData.mental.thisWeek}/10
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">Tendencia:</span>
                <span className={`font-semibold ${
                  weekData.mental.trend === 'improving'
                    ? 'text-green-600 dark:text-green-400'
                    : weekData.mental.trend === 'declining'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}>
                  {weekData.mental.trend === 'improving' ? '↗ Mejorando' :
                   weekData.mental.trend === 'declining' ? '↘ Bajando' :
                   '→ Estable'}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Físico */}
        {weekData.physical && (
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💪</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Físico</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Días activos</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {weekData.physical.activeDays}/7
                </span>
              </div>

              {weekData.physical.totalEntries > 0 && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  {weekData.physical.totalEntries} {weekData.physical.totalEntries === 1 ? 'hábito' : 'hábitos'} registrados
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Objetivos */}
        {weekData.goals && weekData.goals.active > 0 && (
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎯</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Objetivos</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Activos</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {weekData.goals.active}
                </span>
              </div>

              <div className="flex gap-4 text-xs">
                {weekData.goals.onTrack > 0 && (
                  <div className="text-green-600 dark:text-green-400">
                    {weekData.goals.onTrack} en camino
                  </div>
                )}
                {weekData.goals.atRisk > 0 && (
                  <div className="text-orange-600 dark:text-orange-400">
                    {weekData.goals.atRisk} en riesgo
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Insights semanales */}
        {weeklyInsights.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
              Insights de esta semana
            </h3>
            {weeklyInsights.map((alert, i) => (
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
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {alert.title}
                </div>
                {alert.message && (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {alert.message}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
