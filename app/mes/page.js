'use client'

import { useState, useEffect, useCallback } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals } from '@/lib/storage'
import { getMoneyOverview, getMentalOverview, getPhysicalOverview, getGoalsOverview } from '@/lib/overview-insights'
import { generateMonthlyRetrospective } from '@/lib/monthly-retrospective'
import { getMonthlyHighlights } from '@/lib/monthly-highlights'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

const MONTHLY_HISTORY_KEY = 'gaston_monthly_history'

function getMonthlyHistory() {
  if (typeof window === 'undefined') return {}
  const data = localStorage.getItem(MONTHLY_HISTORY_KEY)
  return data ? JSON.parse(data) : {}
}

function saveMonthlyHistory(month, retrospective, highlights) {
  if (typeof window === 'undefined') return
  const history = getMonthlyHistory()
  history[month] = {
    retrospective,
    highlights,
    savedAt: new Date().toISOString()
  }
  localStorage.setItem(MONTHLY_HISTORY_KEY, JSON.stringify(history))
}

export default function MesPage() {
  const [loading, setLoading] = useState(true)
  const [monthData, setMonthData] = useState(null)
  const [retrospective, setRetrospective] = useState(null)
  const [highlights, setHighlights] = useState([])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  useEffect(() => {
    loadMonthData()
  }, [selectedMonth])

  async function loadMonthData() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const categorias = await getCategorias()
      const goals = await getGoals()

      // Parse selected month
      const [year, month] = selectedMonth.split('-').map(Number)
      const monthIndex = month - 1

      // Check if we have saved history for this month
      const history = getMonthlyHistory()
      const now = new Date()
      const isCurrentMonth = year === now.getFullYear() && monthIndex === now.getMonth()

      // Filter data for selected month
      const monthMovimientos = movimientos.filter(m => {
        const fecha = new Date(m.fecha)
        return fecha.getMonth() === monthIndex && fecha.getFullYear() === year
      })

      const monthStart = new Date(year, monthIndex, 1)
      const monthEnd = new Date(year, monthIndex + 1, 0)
      const monthLifeEntries = lifeEntries.filter(e => {
        const date = new Date(e.created_at)
        return date >= monthStart && date <= monthEnd
      })

      const money = getMoneyOverview(monthMovimientos, categorias, null)
      const mental = getMentalOverview(monthLifeEntries)
      const physical = getPhysicalOverview(monthLifeEntries)
      const goalsData = getGoalsOverview(goals)

      const physicalDays = monthLifeEntries.filter(e => e.domain === 'physical')
      const uniqueDays = new Set(physicalDays.map(e => {
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

      // Load or generate retrospective and highlights
      if (!isCurrentMonth && history[selectedMonth]) {
        // Load from history
        setRetrospective(history[selectedMonth].retrospective)
        setHighlights(history[selectedMonth].highlights)
      } else {
        // Generate fresh
        const retro = generateMonthlyRetrospective(movimientos, lifeEntries, categorias, goals, selectedMonth)
        const monthHighlights = getMonthlyHighlights(movimientos, lifeEntries, selectedMonth)

        setRetrospective(retro)
        setHighlights(monthHighlights)

        // Save to history if current month (preserve snapshot)
        if (isCurrentMonth) {
          saveMonthlyHistory(selectedMonth, retro, monthHighlights)
        }
      }
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

  const navigateMonth = useCallback((direction) => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const date = new Date(year, month - 1, 1)

    if (direction === 'prev') {
      date.setMonth(date.getMonth() - 1)
    } else {
      date.setMonth(date.getMonth() + 1)
    }

    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(newMonth)
    setLoading(true)
  }, [selectedMonth])

  const canNavigateNext = useCallback(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return selectedMonth < currentMonth
  }, [selectedMonth])

  const getMonthLabel = useCallback(() => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  }, [selectedMonth])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Mes" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!monthData) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Mes" />
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
              {getMonthLabel()}
            </h2>

            <button
              onClick={() => navigateMonth('next')}
              disabled={!canNavigateNext()}
              className={`p-2 rounded-lg transition-colors ${
                canNavigateNext()
                  ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  : 'opacity-30 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🗓️</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin datos en {getMonthLabel()}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No hay registros para este mes
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Mes" />

      {/* Month Navigation */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
            {getMonthLabel()}
          </h2>

          <button
            onClick={() => navigateMonth('next')}
            disabled={!canNavigateNext()}
            className={`p-2 rounded-lg transition-colors ${
              canNavigateNext()
                ? 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                : 'opacity-30 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
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

        {/* Retrospectiva del Mes */}
        {retrospective && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📝</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Retrospectiva del Mes</h3>
            </div>

            <div className="space-y-3">
              {retrospective.mental && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧠</span>
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Mental</span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {retrospective.mental.text}
                  </p>
                </div>
              )}

              {retrospective.physical && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💪</span>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Físico</span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {retrospective.physical.text}
                  </p>
                </div>
              )}

              {retrospective.money && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💰</span>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">Money</span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {retrospective.money.text}
                  </p>
                </div>
              )}

              {retrospective.goals && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Objetivos</span>
                  </div>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {retrospective.goals.text}
                  </p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Eventos Destacados */}
        {highlights.length > 0 && (
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⭐</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Eventos Destacados</h3>
            </div>

            <div className="space-y-2">
              {highlights.map((highlight, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-base mt-0.5">{highlight.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                      {highlight.title}
                    </p>
                    {highlight.subtitle && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {highlight.subtitle}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
