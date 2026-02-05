'use client'

import { useState, useEffect, useCallback } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals } from '@/lib/storage'
import { getMoneyOverview, getMentalOverview, getPhysicalOverview, getGoalsOverview } from '@/lib/overview-insights'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function MesPage() {
  const [loading, setLoading] = useState(true)
  const [monthData, setMonthData] = useState(null)

  useEffect(() => {
    loadMonthData()
  }, [])

  async function loadMonthData() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const categorias = await getCategorias()
      const goals = await getGoals()

      const money = getMoneyOverview(movimientos, categorias, null)
      const mental = getMentalOverview(lifeEntries)
      const physical = getPhysicalOverview(lifeEntries)
      const goalsData = getGoalsOverview(goals)

      // Calculate current month data
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      const monthMovimientos = movimientos.filter(m => {
        const fecha = new Date(m.fecha)
        return fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear
      })

      const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const physicalLast30 = lifeEntries.filter(e =>
        e.domain === 'physical' && new Date(e.created_at) >= last30Days
      )

      const uniqueDays = new Set(physicalLast30.map(e => {
        const date = new Date(e.created_at)
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      }))

      setMonthData({
        money,
        mental,
        physical,
        goals: goalsData,
        activeDays: uniqueDays.size,
        monthMovimientos
      })
    } catch (error) {
      console.error('Error loading month data:', error)
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
        <TopBar title="Este Mes" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!monthData) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Este Mes" />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🗓️</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Todavía no hay datos de este mes
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Esta vista resume el mes actual completo
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Este Mes" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Money */}
        {monthData.money && (
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💰</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Money</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Gasto mensual</span>
                <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {formatAmount(monthData.money.gastos)}
                </span>
              </div>

              {monthData.money.trend && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-600 dark:text-zinc-400">vs mes anterior:</span>
                  <span className={`font-semibold ${
                    monthData.money.trend === 'up'
                      ? 'text-red-600 dark:text-red-400'
                      : monthData.money.trend === 'down'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}>
                    {monthData.money.trendPercent > 0 ? '+' : ''}{monthData.money.trendPercent}%
                  </span>
                </div>
              )}

              {monthData.money.topCategory && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-2 mt-2">
                  Top: {monthData.money.topCategory.name} ({formatAmount(monthData.money.topCategory.amount)})
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Mental */}
        {monthData.mental && monthData.mental.average30d > 0 && (
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🧠</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Mental</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Promedio mensual</span>
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {monthData.mental.average30d}/10
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400">Tendencia:</span>
                <span className={`font-semibold ${
                  monthData.mental.trend === 'improving'
                    ? 'text-green-600 dark:text-green-400'
                    : monthData.mental.trend === 'declining'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-zinc-600 dark:text-zinc-400'
                }`}>
                  {monthData.mental.trend === 'improving' ? '↗ Mejorando' :
                   monthData.mental.trend === 'declining' ? '↘ Bajando' :
                   '→ Estable'}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Físico */}
        {monthData.physical && (
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💪</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Físico</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Días activos (últimos 30)</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {monthData.activeDays}/30
                </span>
              </div>

              {monthData.physical.daysSinceLastExercise !== null && (
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                  {monthData.physical.daysSinceLastExercise === 0 ? 'Hoy hiciste ejercicio' :
                   monthData.physical.daysSinceLastExercise === 1 ? 'Último: ayer' :
                   `Último: hace ${monthData.physical.daysSinceLastExercise} días`}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Objetivos */}
        {monthData.goals && monthData.goals.total > 0 && (
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎯</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Objetivos</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Activos</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {monthData.goals.total}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Progreso promedio</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {monthData.goals.averageProgress}%
                </span>
              </div>

              {monthData.goals.atRisk > 0 && (
                <div className="text-xs text-orange-600 dark:text-orange-400 border-t border-blue-200 dark:border-blue-700 pt-2 mt-2">
                  {monthData.goals.atRisk} en riesgo
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
