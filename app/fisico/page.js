'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntries } from '@/lib/storage'
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
  Pill,
  Plus,
  Calendar
} from 'lucide-react'

export default function FisicoPage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

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

      setStats({ activeDays, streak, daysSinceLast, weekActivities, prevActiveDays, trend })
    } finally {
      setLoading(false)
    }
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

          {/* Weekly progress dots */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex gap-1.5 mb-2">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    i < (stats?.activeDays || 0)
                      ? 'bg-amber-500'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
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
                   stats?.daysSinceLast ? `Hace ${stats.daysSinceLast} días` : 'Sin registros'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick action */}
        <button
          onClick={() => router.push('/chat')}
          className="w-full p-4 rounded-2xl bg-amber-500 dark:bg-amber-600 transition-all active:scale-[0.98] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-white font-semibold text-sm">¿Hiciste ejercicio?</p>
              <p className="text-amber-100 text-[10px]">Registrar actividad</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/60" />
        </button>

        {/* Navigation */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
            Explorar
          </h3>
          <div className="space-y-1.5">
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
        {stats?.daysSinceLast !== null && stats.daysSinceLast >= 3 && (
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
