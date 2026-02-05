'use client'

import { useState, useEffect, useCallback } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals } from '@/lib/storage'
import { getWeeklySummary } from '@/lib/overview-insights'
import { getAllSilentAlerts } from '@/lib/silent-alerts'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

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
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
          <Card className="p-8 text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50">
            <div className="text-5xl mb-4">📆</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Tu semana empieza acá
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Registrá datos y acá vas a ver el resumen de 7 días
            </p>
            <a
              href="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all active:scale-95"
            >
              Empezar a registrar
            </a>
          </Card>
        </div>
      </div>
    )
  }

  // Calculate weekly progress
  const getWeeklyProgress = () => {
    let areas = 0
    let active = 0
    if (weekData.money) { areas++; if (weekData.money.thisWeek > 0) active++ }
    if (weekData.mental) { areas++; if (weekData.mental.count > 0) active++ }
    if (weekData.physical) { areas++; if (weekData.physical.totalEntries > 0) active++ }
    if (weekData.goals) { areas++; if (weekData.goals.active > 0) active++ }
    return { active, areas }
  }

  const { active: weeklyActive, areas: weeklyAreas } = getWeeklyProgress()

  const getWeekMessage = () => {
    if (weeklyActive === 0) return null
    if (weeklyActive >= 3) return 'Semana completa'
    if (weeklyActive >= 2) return 'Buena semana'
    return 'En camino'
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Esta Semana" />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {/* Weekly Progress Indicator */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i < weeklyActive
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
            {getWeekMessage() && (
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                {getWeekMessage()}
              </span>
            )}
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Últimos 7 días
          </span>
        </div>

        {/* Money */}
        {weekData.money && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
              Money
            </h3>
            <Card className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 border-zinc-700">
              <div className="flex items-baseline justify-between mb-2">
                <span className="text-xs text-zinc-400">Gasto semanal</span>
                {weekData.money.prevWeek > 0 && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    weekData.money.trend === 'up'
                      ? 'bg-red-500/20 text-red-400'
                      : weekData.money.trend === 'down'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {weekData.money.delta > 0 ? '+' : ''}{weekData.money.delta}%
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-white font-mono tracking-tight">
                {formatAmount(weekData.money.thisWeek)}
              </div>
              {weekData.money.prevWeek > 0 && (
                <div className="text-xs text-zinc-500 mt-1">
                  Semana anterior: {formatAmount(weekData.money.prevWeek)}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Mental */}
        {weekData.mental && weekData.mental.count > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
              Mental
            </h3>
            <Card className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Promedio semanal</div>
                  <div className="text-4xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {weekData.mental.thisWeek}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">de 10</div>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 ${
                  weekData.mental.trend === 'improving'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : weekData.mental.trend === 'declining'
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                }`}>
                  {weekData.mental.trend === 'improving' ? '↗ Mejorando' :
                   weekData.mental.trend === 'declining' ? '↘ Bajando' :
                   '→ Estable'}
                </div>
              </div>
              {/* Visual progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-purple-100 dark:bg-purple-900/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                    style={{ width: `${weekData.mental.thisWeek * 10}%` }}
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Físico */}
        {weekData.physical && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
              Físico
            </h3>
            <Card className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-800/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Días activos</div>
                  <div className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                    {weekData.physical.activeDays}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">de 7 días</div>
                </div>
                {weekData.physical.totalEntries > 0 && (
                  <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                    {weekData.physical.totalEntries} {weekData.physical.totalEntries === 1 ? 'actividad' : 'actividades'}
                  </div>
                )}
              </div>
              {/* Visual day indicators */}
              <div className="mt-4 flex gap-2">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      i < weekData.physical.activeDays
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500'
                        : 'bg-orange-100 dark:bg-orange-900/40'
                    }`}
                  />
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Objetivos */}
        {weekData.goals && weekData.goals.active > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
              Objetivos
            </h3>
            <Card className="p-5 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border-indigo-200/50 dark:border-indigo-800/50">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Activos</div>
                  <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                    {weekData.goals.active}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">objetivos</div>
                </div>
                <div className="flex flex-col gap-2">
                  {weekData.goals.onTrack > 0 && (
                    <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex items-center gap-1">
                      <span>✓</span> {weekData.goals.onTrack} en camino
                    </div>
                  )}
                  {weekData.goals.atRisk > 0 && (
                    <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 flex items-center gap-1">
                      <span>!</span> {weekData.goals.atRisk} en riesgo
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Insights semanales */}
        {weeklyInsights.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
              Qué pasó esta semana
            </h3>
            <Card className="p-4 space-y-3">
              {weeklyInsights.map((alert, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 ${i > 0 ? 'pt-3 border-t border-zinc-100 dark:border-zinc-800' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'high'
                      ? 'bg-red-100 dark:bg-red-900/40'
                      : alert.severity === 'medium'
                      ? 'bg-orange-100 dark:bg-orange-900/40'
                      : 'bg-amber-100 dark:bg-amber-900/40'
                  }`}>
                    <span className="text-sm">
                      {alert.severity === 'high' ? '⚠️' : alert.severity === 'medium' ? '📊' : '💡'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {alert.title}
                    </div>
                    {alert.message && (
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                        {alert.message}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
