'use client'

import { useState, useEffect, useCallback } from 'react'
import { initDB, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { Brain } from 'lucide-react'

export default function ResumenMentalPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  const loadResumen = useCallback(async () => {
    try {
      await initDB()
      const lifeEntries = await getLifeEntries()

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

      // Entradas mentales del mes actual
      const mentalEntries = lifeEntries.filter(e =>
        e.domain === 'mental' && e.meta?.mood_score
      )

      const currentMonthEntries = mentalEntries.filter(e => {
        const date = new Date(e.created_at)
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear
      })

      const prevMonthEntries = mentalEntries.filter(e => {
        const date = new Date(e.created_at)
        return date.getMonth() === prevMonth && date.getFullYear() === prevYear
      })

      // Promedio mensual
      const avgCurrent = currentMonthEntries.length > 0
        ? currentMonthEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / currentMonthEntries.length
        : 0

      const avgPrev = prevMonthEntries.length > 0
        ? prevMonthEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / prevMonthEntries.length
        : 0

      // Mejor y peor semana
      const weeks = {}
      currentMonthEntries.forEach(e => {
        const date = new Date(e.created_at)
        const weekNum = Math.ceil(date.getDate() / 7)
        if (!weeks[weekNum]) weeks[weekNum] = []
        weeks[weekNum].push(e.meta.mood_score)
      })

      const weekAverages = Object.entries(weeks).map(([week, scores]) => ({
        week: parseInt(week),
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        count: scores.length
      }))

      weekAverages.sort((a, b) => b.avg - a.avg)

      const bestWeek = weekAverages[0] || null
      const worstWeek = weekAverages[weekAverages.length - 1] || null

      // Tendencia
      let trend = 'stable'
      if (avgCurrent > avgPrev + 0.5) trend = 'improving'
      else if (avgCurrent < avgPrev - 0.5) trend = 'declining'

      setData({
        avgCurrent: Math.round(avgCurrent * 10) / 10,
        avgPrev: Math.round(avgPrev * 10) / 10,
        trend,
        totalEntries: currentMonthEntries.length,
        bestWeek,
        worstWeek,
        weekAverages
      })
    } catch (error) {
      console.error('Error loading mental resumen:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadResumen()
  }, [loadResumen])

  const getMonthName = () => {
    const now = new Date()
    return now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  }

  const getTrendText = (trend) => {
    if (trend === 'improving') return 'Mejorando'
    if (trend === 'declining') return 'Bajando'
    return 'Estable'
  }

  const getTrendColor = (trend) => {
    if (trend === 'improving') return 'text-green-600 dark:text-green-400'
    if (trend === 'declining') return 'text-red-600 dark:text-red-400'
    return 'text-zinc-600 dark:text-zinc-400'
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Resumen Mensual" backHref="/mental" />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Card className="p-4 animate-pulse">
            <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </Card>
        </div>
      </div>
    )
  }

  if (!data || data.totalEntries === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Resumen Mensual" backHref="/mental" />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <Brain className="w-7 h-7 text-zinc-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin registros este mes
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Registra tu estado diario para ver el resumen mensual
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Resumen Mensual" backHref="/mental" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Mes actual */}
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {getMonthName()}
          </h2>
        </div>

        {/* Promedio mensual */}
        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/20 dark:to-purple-900/20 border-purple-200 dark:border-purple-800">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Promedio del mes
          </h3>
          <div className="text-center">
            <div className="text-5xl font-bold text-purple-600 dark:text-purple-400 mb-2">
              {data.avgCurrent}/10
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.totalEntries} registros
            </div>
          </div>
        </Card>

        {/* Comparación vs mes anterior */}
        {data.avgPrev > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              vs Mes anterior
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Mes anterior</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {data.avgPrev}/10
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Este mes</span>
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {data.avgCurrent}/10
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Tendencia</span>
                <span className={`text-sm font-semibold ${getTrendColor(data.trend)}`}>
                  {getTrendText(data.trend)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Mejor y peor semana */}
        {data.weekAverages.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {data.bestWeek && (
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                  Mejor semana
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {Math.round(data.bestWeek.avg * 10) / 10}/10
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Semana {data.bestWeek.week}
                </div>
              </Card>
            )}
            {data.worstWeek && (
              <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                  Peor semana
                </div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                  {Math.round(data.worstWeek.avg * 10) / 10}/10
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Semana {data.worstWeek.week}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Tendencia general */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Tendencia general
          </h3>
          <div className="space-y-2">
            {data.weekAverages.map((week) => (
              <div key={week.week} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                    S{week.week}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-600 dark:bg-purple-400 rounded-full"
                      style={{ width: `${(week.avg / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex-shrink-0">
                  {Math.round(week.avg * 10) / 10}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
