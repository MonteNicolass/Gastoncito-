'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Dumbbell, TrendingUp, TrendingDown } from 'lucide-react'
import { initDB, getLifeEntriesByDomain } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function ResumenFisicoPage() {
  const [loading, setLoading] = useState(true)
  const [allEntries, setAllEntries] = useState([])

  const loadResumen = useCallback(async () => {
    try {
      await initDB()
      const data = await getLifeEntriesByDomain('physical')
      setAllEntries(data)
    } catch (error) {
      console.error('Error loading fisico resumen:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadResumen()
  }, [loadResumen])

  const data = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const currentDay = now.getDate()

    const parsed = allEntries.map(e => ({ ...e, _date: new Date(e.created_at) }))

    const physicalEntries = parsed.filter(e =>
      e._date.getMonth() === currentMonth &&
      e._date.getFullYear() === currentYear
    )

    if (physicalEntries.length === 0) return null

    const uniqueDays = new Set(physicalEntries.map(e =>
      `${e._date.getFullYear()}-${e._date.getMonth()}-${e._date.getDate()}`
    ))
    const activeDays = uniqueDays.size

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const denominator = Math.min(currentDay, daysInMonth)

    let longestStreak = 0
    let currentStreak = 0
    for (let day = 1; day <= currentDay; day++) {
      const dayKey = `${currentYear}-${currentMonth}-${day}`
      if (uniqueDays.has(dayKey)) {
        currentStreak++
        if (currentStreak > longestStreak) longestStreak = currentStreak
      } else {
        currentStreak = 0
      }
    }

    const consistency = Math.round((activeDays / denominator) * 100)

    // Previous month comparison
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear
    const prevMonthEntries = parsed.filter(e =>
      e._date.getMonth() === prevMonth &&
      e._date.getFullYear() === prevYear
    )
    const prevUniqueDays = new Set(prevMonthEntries.map(e =>
      `${e._date.getFullYear()}-${e._date.getMonth()}-${e._date.getDate()}`
    ))
    const prevActiveDays = prevUniqueDays.size
    const prevDaysInMonth = new Date(prevYear, prevMonth + 1, 0).getDate()
    const prevConsistency = prevActiveDays > 0 ? Math.round((prevActiveDays / prevDaysInMonth) * 100) : null

    const daysDelta = activeDays - prevActiveDays
    const consistencyDelta = prevConsistency !== null ? consistency - prevConsistency : null

    // Top activities from text
    const activityCounts = {}
    physicalEntries.forEach(e => {
      const text = (e.text || '').trim()
      if (text) {
        const key = text.toLowerCase()
        activityCounts[key] = activityCounts[key] || { label: text, count: 0 }
        activityCounts[key].count++
      }
    })
    const topActivities = Object.values(activityCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calendar grid
    const calendarDays = []
    const firstDay = new Date(currentYear, currentMonth, 1).getDay()
    const mondayOffset = firstDay === 0 ? 6 : firstDay - 1
    for (let i = 0; i < mondayOffset; i++) calendarDays.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = `${currentYear}-${currentMonth}-${day}`
      calendarDays.push({
        day,
        active: uniqueDays.has(dayKey),
        future: day > currentDay
      })
    }

    return {
      activeDays,
      longestStreak,
      consistency,
      totalEntries: physicalEntries.length,
      daysInMonth,
      denominator,
      topActivities,
      calendarDays,
      daysDelta,
      consistencyDelta,
      prevActiveDays
    }
  }, [allEntries])

  const getMonthName = () => {
    return new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  }

  const getConsistencyColor = (c) => {
    if (c >= 75) return 'text-emerald-600 dark:text-emerald-400'
    if (c >= 50) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getConsistencyBg = (c) => {
    if (c >= 75) return 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/50'
    if (c >= 50) return 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/50'
    return 'bg-red-50 dark:bg-red-950/20 border-red-200/60 dark:border-red-800/50'
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Resumen Mensual" backHref="/fisico" />
        <div className="flex-1 px-4 py-4 space-y-4">
          <div className="h-6 w-40 mx-auto bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 animate-pulse" />
            <div className="h-28 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 animate-pulse" />
          </div>
          <div className="h-32 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 animate-pulse" />
          <div className="h-48 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 animate-pulse" />
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Resumen Mensual" backHref="/fisico" />
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Dumbbell className="w-7 h-7 text-amber-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin actividad este mes
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Registrá actividad física para ver el resumen mensual
            </p>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Resumen Mensual" backHref="/fisico" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="text-center mb-1">
          <h2 className="text-lg font-display font-bold text-zinc-900 dark:text-zinc-100 capitalize">
            {getMonthName()}
          </h2>
        </div>

        {/* Active days + Streak */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200/60 dark:border-amber-800/50">
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
              Días activos
            </div>
            <div className="text-4xl font-display font-bold text-amber-600 dark:text-amber-400 mb-1">
              {data.activeDays}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                de {data.denominator}
              </span>
              {data.daysDelta !== 0 && data.prevActiveDays > 0 && (
                <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                  data.daysDelta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {data.daysDelta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {data.daysDelta > 0 ? '+' : ''}{data.daysDelta}
                </span>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">
              Racha más larga
            </div>
            <div className="text-4xl font-display font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              {data.longestStreak}
            </div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              días seguidos
            </div>
          </Card>
        </div>

        {/* Consistency */}
        <Card className={`p-4 ${getConsistencyBg(data.consistency)}`}>
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Consistencia
          </h3>
          <div className="text-center">
            <div className={`text-5xl font-display font-bold mb-1 ${getConsistencyColor(data.consistency)}`}>
              {data.consistency}%
            </div>
            <div className="flex items-center justify-center gap-2">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {data.consistency >= 75 ? 'Excelente' : data.consistency >= 50 ? 'Bien' : 'Puede mejorar'}
              </span>
              {data.consistencyDelta !== null && data.consistencyDelta !== 0 && (
                <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                  data.consistencyDelta > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  {data.consistencyDelta > 0 ? '+' : ''}{data.consistencyDelta}pp
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Calendar */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Actividad del mes
          </h3>
          <div className="grid grid-cols-7 gap-1">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => (
              <div key={d} className="text-center text-[9px] font-medium text-zinc-400 dark:text-zinc-600 pb-1">
                {d}
              </div>
            ))}
            {data.calendarDays.map((day, i) => (
              <div key={i} className="aspect-square flex items-center justify-center">
                {day ? (
                  <div className={`w-full h-full rounded-lg flex items-center justify-center text-[10px] font-medium transition-colors ${
                    day.active
                      ? 'bg-amber-500 text-white'
                      : day.future
                        ? 'text-zinc-300 dark:text-zinc-700'
                        : 'text-zinc-500 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800/50'
                  }`}>
                    {day.day}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>

        {/* Top activities */}
        {data.topActivities.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Actividades frecuentes
            </h3>
            <div className="space-y-2">
              {data.topActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1 truncate">
                    {activity.label}
                  </span>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex-shrink-0">
                    {activity.count}x
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Total */}
        <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Total de actividades
            </span>
            <span className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">
              {data.totalEntries}
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}
