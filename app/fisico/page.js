'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntriesByDomain } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import {
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Flame,
  ChevronRight,
  BarChart3,
  Activity,
  Apple,
  Plus,
  Calendar,
  Timer
} from 'lucide-react'

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function getWeekDays() {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

const INTENSITY_LABELS = { baja: 'Baja', media: 'Media', alta: 'Alta' }
const TYPE_LABELS = { cardio: 'Cardio', fuerza: 'Fuerza', flexibilidad: 'Flex', otro: 'Otro' }

export default function FisicoPage() {
  const router = useRouter()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    try {
      await initDB()
      const data = await getLifeEntriesByDomain('physical')
      setEntries(data)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => {
    if (!entries.length) return null

    const now = new Date()
    const weekDays = getWeekDays()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const parsed = entries.map(e => ({ ...e, _date: new Date(e.created_at) }))

    // Today's entries
    const todayEntries = parsed
      .filter(e => isSameDay(e._date, today))
      .sort((a, b) => b._date - a._date)

    // Week activity map
    const weekActive = weekDays.map(day =>
      parsed.some(e => isSameDay(e._date, day))
    )
    const activeDays = weekActive.filter(Boolean).length

    // Previous week for trend
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const prevWeekDays = new Set(
      parsed
        .filter(e => e._date >= twoWeeksAgo && e._date < weekAgo)
        .map(e => e._date.toDateString())
    ).size

    // Streak
    let streak = 0
    const checkDay = new Date(today)
    for (let i = 0; i < 60; i++) {
      const hasActivity = parsed.some(e => isSameDay(e._date, checkDay))
      if (hasActivity) {
        streak++
      } else if (i > 0) {
        break
      }
      checkDay.setDate(checkDay.getDate() - 1)
    }

    // Days since last
    let daysSinceLast = null
    if (parsed.length > 0) {
      const sorted = [...parsed].sort((a, b) => b._date - a._date)
      daysSinceLast = Math.floor((now - sorted[0]._date) / (1000 * 60 * 60 * 24))
    }

    // Trend
    let trend = 'stable'
    if (activeDays > prevWeekDays + 1) trend = 'up'
    else if (activeDays < prevWeekDays - 1) trend = 'down'

    // Week activity count
    const weekStart = weekDays[0]
    const weekEnd = new Date(weekDays[6])
    weekEnd.setHours(23, 59, 59, 999)
    const weekActivities = parsed.filter(e => e._date >= weekStart && e._date <= weekEnd).length

    return {
      activeDays,
      weekActive,
      streak,
      daysSinceLast,
      weekActivities,
      trend,
      todayEntries
    }
  }, [entries])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Físico" />
        <div className="flex-1 px-4 py-6 space-y-5">
          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 p-6 animate-pulse">
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded mb-5" />
            <div className="h-12 w-20 bg-zinc-200 dark:bg-zinc-800 rounded mb-4" />
            <div className="flex gap-1.5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              ))}
            </div>
          </div>
          <div className="h-14 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          <div className="space-y-1.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const hasTodayEntries = stats?.todayEntries?.length > 0

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Físico" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              Esta semana
            </p>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {stats?.activeDays || 0}
              </span>
              <span className="text-xl text-zinc-300 dark:text-zinc-600 font-display">días</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {stats?.weekActivities || 0} actividades
              </span>
              {stats?.trend && stats.trend !== 'stable' && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  stats.trend === 'up'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {stats.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stats.trend === 'up' ? 'Más activo' : 'Menos activo'}
                </span>
              )}
            </div>
          </div>

          {/* Weekly progress dots — real days Lun-Dom */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-1.5 mb-1.5">
              {(stats?.weekActive || Array(7).fill(false)).map((active, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    active
                      ? 'bg-amber-500'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-1.5 mb-3">
              {DAY_LABELS.map((label, i) => (
                <span key={i} className="flex-1 text-center text-[9px] text-zinc-400 dark:text-zinc-600 font-medium">
                  {label}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              {stats?.streak > 0 ? (
                <div className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {stats.streak} días de racha
                  </span>
                </div>
              ) : (
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {stats?.daysSinceLast === 0 ? 'Activo hoy' :
                   stats?.daysSinceLast === 1 ? 'Último: ayer' :
                   stats?.daysSinceLast != null ? `Hace ${stats.daysSinceLast} días` : 'Sin registros'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Today section */}
        {hasTodayEntries ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                Hoy
              </h3>
              <button
                onClick={() => router.push('/fisico/habitos')}
                className="text-[10px] font-semibold text-amber-600 dark:text-amber-400"
              >
                + Agregar otra
              </button>
            </div>
            <div className="space-y-1.5">
              {stats.todayEntries.map(entry => (
                <Card key={entry.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {entry.text}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {entry.meta?.activity_type && (
                          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {TYPE_LABELS[entry.meta.activity_type] || entry.meta.activity_type}
                          </span>
                        )}
                        {entry.meta?.duration_min && (
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5">
                            <Timer className="w-2.5 h-2.5" />
                            {entry.meta.duration_min} min
                          </span>
                        )}
                        {entry.meta?.intensity && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            entry.meta.intensity === 'alta' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                            entry.meta.intensity === 'media' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                            'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {INTENSITY_LABELS[entry.meta.intensity]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <button
            onClick={() => router.push('/fisico/habitos')}
            className="w-full p-4 rounded-2xl bg-amber-500 dark:bg-amber-600 transition-all active:scale-[0.98] flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5 text-white" />
              <div className="text-left">
                <p className="text-white font-semibold text-sm">Registrar actividad</p>
                <p className="text-amber-100 text-[10px]">Todavía no registraste nada hoy</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/60" />
          </button>
        )}

        {/* Navigation */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
            Explorar
          </h3>
          <div className="space-y-1.5">
            {[
              { icon: BarChart3, label: 'Resumen mensual', href: '/fisico/resumen' },
              { icon: Activity, label: 'Actividad física', href: '/fisico/habitos' },
              { icon: Apple, label: 'Comida', href: '/fisico/comida' }
            ].map(({ icon: Icon, label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="w-full p-3.5 rounded-2xl text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-amber-500 dark:text-amber-400" strokeWidth={1.75} />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{label}</span>
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
              </button>
            ))}
          </div>
        </div>

        {/* Inactivity warning */}
        {stats?.daysSinceLast != null && stats.daysSinceLast >= 3 && (
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Retomá el movimiento</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Hace {stats.daysSinceLast} días que no registrás actividad.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
