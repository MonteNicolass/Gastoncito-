'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ProgressRing from '@/components/ui/ProgressRing'
import {
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Flame,
  ChevronRight,
  BarChart3,
  Activity,
  Apple,
  Pill,
  Plus,
  Calendar
} from 'lucide-react'
import PhysicalStatusCard from '@/components/PhysicalStatusCard'
import ConsistencyBar from '@/components/ConsistencyBar'

export default function FisicoPage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [consistency, setConsistency] = useState(null)
  const [activitiesLast14, setActivitiesLast14] = useState(0)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    try {
      await initDB()
      const entries = await getLifeEntries()
      const physicalEntries = entries.filter(e => e.domain === 'physical')

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const weekEntries = physicalEntries.filter(e => new Date(e.created_at) >= weekAgo)

      const activeDays = new Set(
        weekEntries.map(e => new Date(e.created_at).toDateString())
      ).size

      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const prevWeekEntries = physicalEntries.filter(e => {
        const d = new Date(e.created_at)
        return d >= twoWeeksAgo && d < weekAgo
      })
      const prevActiveDays = new Set(
        prevWeekEntries.map(e => new Date(e.created_at).toDateString())
      ).size

      let streak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dayStart = new Date(checkDate)
        const dayEnd = new Date(checkDate)
        dayEnd.setHours(23, 59, 59, 999)

        const hasActivity = physicalEntries.some(e => {
          const entryDate = new Date(e.created_at)
          return entryDate >= dayStart && entryDate <= dayEnd
        })

        if (hasActivity) {
          streak++
        } else if (i > 0) {
          break
        }
      }

      let daysSinceLast = null
      if (physicalEntries.length > 0) {
        const sorted = [...physicalEntries].sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        )
        const lastDate = new Date(sorted[0].created_at)
        daysSinceLast = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
      }

      let trend = 'stable'
      if (activeDays > prevActiveDays + 1) trend = 'up'
      else if (activeDays < prevActiveDays - 1) trend = 'down'

      const weekActivities = weekEntries.length

      // 14-day consistency bar
      const last14Entries = physicalEntries.filter(e => new Date(e.created_at) >= twoWeeksAgo)
      const activeDateSet = new Set(
        last14Entries.map(e => new Date(e.created_at).toDateString())
      )
      setActivitiesLast14(activeDateSet.size)

      const consistencyDays = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        consistencyDays.push(activeDateSet.has(d.toDateString()))
      }
      setConsistency(consistencyDays)

      setStats({ activeDays, streak, daysSinceLast, weekActivities, prevActiveDays, trend })
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (days) => {
    if (days >= 5) return 'green'
    if (days >= 3) return 'orange'
    if (days >= 1) return 'blue'
    return 'zinc'
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Físico" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Físico" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Hero Section - Orange gradient */}
        <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 dark:from-orange-700 dark:via-orange-800 dark:to-amber-800 rounded-3xl p-6 overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl ${
              stats?.activeDays >= 5 ? 'bg-emerald-400' :
              stats?.activeDays >= 3 ? 'bg-orange-300' :
              stats?.activeDays >= 1 ? 'bg-amber-400' :
              'bg-zinc-400'
            }`} />
          </div>

          <div className="relative flex items-center gap-5">
            <ProgressRing
              progress={stats?.activeDays ? (stats.activeDays / 7) * 100 : 0}
              size={100}
              strokeWidth={8}
              color={getScoreColor(stats?.activeDays || 0)}
              label={stats?.activeDays?.toString() || '0'}
              sublabel="días"
            />

            <div className="flex-1">
              <p className="text-xs font-medium text-orange-100 uppercase tracking-wider mb-1">
                Esta semana
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-white">
                  {stats?.activeDays || 0}
                </span>
                <span className="text-lg text-orange-100">días activos</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-orange-100">
                  {stats?.weekActivities || 0} actividades
                </span>
                {stats?.trend && stats.trend !== 'stable' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    stats.trend === 'up'
                      ? 'bg-emerald-500/30 text-emerald-100'
                      : 'bg-red-500/30 text-red-100'
                  }`}>
                    {stats.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stats.trend === 'up' ? 'Más activo' : 'Menos activo'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Weekly progress bar */}
          <div className="mt-4 pt-4 border-t border-white/20">
            <div className="flex gap-1.5 mb-2">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    i < (stats?.activeDays || 0)
                      ? 'bg-white'
                      : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between">
              {stats?.streak > 0 ? (
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-200" />
                  <span className="text-xs text-orange-100">
                    {stats.streak} días de racha
                  </span>
                </div>
              ) : (
                <span className="text-xs text-orange-100">
                  {stats?.daysSinceLast === 0 ? 'Activo hoy' :
                   stats?.daysSinceLast === 1 ? 'Último: ayer' :
                   stats?.daysSinceLast ? `Hace ${stats.daysSinceLast} días` : 'Sin registros'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick action */}
        <button
          onClick={() => router.push('/chat')}
          className="w-full p-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-2xl transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">¿Hiciste ejercicio?</p>
              <p className="text-orange-100 text-xs">Registrar actividad</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>

        {/* Physical Status Card */}
        <PhysicalStatusCard
          daysSinceLast={stats?.daysSinceLast ?? null}
          activitiesLast14={activitiesLast14}
          trend={stats?.trend || 'stable'}
          streak={stats?.streak || 0}
        />

        {/* Consistency Bar */}
        {consistency && <ConsistencyBar activeDays={consistency} />}

        {/* Navigation */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Explorar
          </h3>
          <div className="space-y-1">
            {[
              { icon: BarChart3, label: 'Resumen mensual', href: '/fisico/resumen' },
              { icon: Activity, label: 'Hábitos', href: '/fisico/habitos' },
              { icon: Apple, label: 'Comida', href: '/fisico/comida' },
              { icon: Pill, label: 'Salud', href: '/fisico/salud' },
              { icon: Dumbbell, label: 'Entrenos', href: '/fisico/entrenos' }
            ].map(({ icon: Icon, label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="w-full p-3 rounded-xl text-left bg-white dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <Icon className="w-5 h-5 text-orange-500 dark:text-orange-400" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex-1">{label}</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Inactivity warning */}
        {stats?.daysSinceLast !== null && stats.daysSinceLast >= 3 && (
          <Card className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Retomá el movimiento</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Hace {stats.daysSinceLast} días que no registrás actividad. Una caminata corta suma.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
