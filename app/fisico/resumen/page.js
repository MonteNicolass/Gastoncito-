'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dumbbell } from 'lucide-react'
import { initDB, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function ResumenFisicoPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  const loadResumen = useCallback(async () => {
    try {
      await initDB()
      const lifeEntries = await getLifeEntries()

      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // Entradas físicas del mes actual
      const physicalEntries = lifeEntries.filter(e => {
        const date = new Date(e.created_at)
        return e.domain === 'physical' &&
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
      })

      // Días activos del mes
      const uniqueDays = new Set(physicalEntries.map(e => {
        const date = new Date(e.created_at)
        return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      }))

      const activeDays = uniqueDays.size

      // Racha más larga del mes
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      let longestStreak = 0
      let currentStreak = 0

      for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `${currentYear}-${currentMonth}-${day}`
        if (uniqueDays.has(dayKey)) {
          currentStreak++
          if (currentStreak > longestStreak) {
            longestStreak = currentStreak
          }
        } else {
          currentStreak = 0
        }
      }

      // Consistencia (%)
      const consistency = Math.round((activeDays / daysInMonth) * 100)

      // Tipos de hábitos más frecuentes
      const habitTypes = {}
      physicalEntries.forEach(e => {
        const type = e.meta?.habit_type || 'Otro'
        habitTypes[type] = (habitTypes[type] || 0) + 1
      })

      const topHabits = Object.entries(habitTypes)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }))

      setData({
        activeDays,
        longestStreak,
        consistency,
        totalEntries: physicalEntries.length,
        daysInMonth,
        topHabits
      })
    } catch (error) {
      console.error('Error loading fisico resumen:', error)
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

  const getConsistencyColor = (consistency) => {
    if (consistency >= 75) return 'text-green-600 dark:text-green-400'
    if (consistency >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConsistencyBg = (consistency) => {
    if (consistency >= 75) return 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800'
    if (consistency >= 50) return 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20 border-yellow-200 dark:border-yellow-800'
    return 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-red-200 dark:border-red-800'
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Resumen Mensual" backHref="/fisico" />
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
        <TopBar title="Resumen Mensual" backHref="/fisico" />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Dumbbell className="w-7 h-7 text-orange-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin actividad este mes
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Registra hábitos físicos para ver el resumen mensual
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Resumen Mensual" backHref="/fisico" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Mes actual */}
        <div className="text-center mb-2">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {getMonthName()}
          </h2>
        </div>

        {/* Días activos y racha */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
              Días activos
            </div>
            <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-1">
              {data.activeDays}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              de {data.daysInMonth} días
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
              Racha más larga
            </div>
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {data.longestStreak}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              días seguidos
            </div>
          </Card>
        </div>

        {/* Consistencia */}
        <Card className={`p-4 bg-gradient-to-br ${getConsistencyBg(data.consistency)}`}>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Consistencia
          </h3>
          <div className="text-center">
            <div className={`text-5xl font-bold mb-2 ${getConsistencyColor(data.consistency)}`}>
              {data.consistency}%
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {data.consistency >= 75 ? 'Excelente' : data.consistency >= 50 ? 'Bien' : 'Puede mejorar'}
            </div>
          </div>
        </Card>

        {/* Hábitos más frecuentes */}
        {data.topHabits.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Hábitos más frecuentes
            </h3>
            <div className="space-y-2">
              {data.topHabits.map((habit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate block">
                      {habit.type}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex-shrink-0">
                    {habit.count}x
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Total de actividades */}
        <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Total de actividades
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {data.totalEntries}
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
