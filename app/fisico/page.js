'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'
import ProgressRing from '@/components/ui/ProgressRing'
import RecommendationCard from '@/components/ui/RecommendationCard'

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

      // Semana anterior
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const prevWeekEntries = physicalEntries.filter(e => {
        const d = new Date(e.created_at)
        return d >= twoWeeksAgo && d < weekAgo
      })
      const prevActiveDays = new Set(
        prevWeekEntries.map(e => new Date(e.created_at).toDateString())
      ).size

      // Streak
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

      // Days since last
      let daysSinceLast = null
      if (physicalEntries.length > 0) {
        const sorted = [...physicalEntries].sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        )
        const lastDate = new Date(sorted[0].created_at)
        daysSinceLast = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
      }

      // Trend
      let trend = 'stable'
      if (activeDays > prevActiveDays + 1) trend = 'improving'
      else if (activeDays < prevActiveDays - 1) trend = 'declining'

      const weekActivities = weekEntries.length

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

  const getRecommendation = () => {
    if (!stats) return null

    if (stats.daysSinceLast !== null && stats.daysSinceLast >= 3) {
      return {
        emoji: '💪',
        title: 'Retomá el movimiento',
        description: `Hace ${stats.daysSinceLast} días que no registrás actividad. Una caminata corta suma.`,
        action: () => router.push('/fisico/habitos'),
        actionLabel: 'Registrar',
        variant: 'warning'
      }
    }

    if (stats.activeDays === 0) {
      return {
        emoji: '🏃',
        title: 'Empezá la semana activo',
        description: 'Todavía no registraste actividad esta semana. Cualquier movimiento cuenta.',
        action: () => router.push('/chat'),
        actionLabel: 'Registrar',
        variant: 'default'
      }
    }

    if (stats.streak >= 5) {
      return {
        emoji: '🔥',
        title: 'Racha impresionante',
        description: `${stats.streak} días seguidos de actividad. Seguí así.`,
        variant: 'success'
      }
    }

    if (stats.trend === 'improving') {
      return {
        emoji: '📈',
        title: 'Mejorando el ritmo',
        description: 'Esta semana estás más activo que la anterior.',
        variant: 'success'
      }
    }

    if (stats.activeDays >= 5) {
      return {
        emoji: '✨',
        title: 'Semana muy activa',
        description: `${stats.activeDays} días de actividad. Excelente trabajo.`,
        variant: 'success'
      }
    }

    return {
      emoji: '💪',
      title: 'Seguí moviéndote',
      description: 'Cada día de actividad suma a tu bienestar.',
      action: () => router.push('/chat'),
      actionLabel: 'Registrar',
      variant: 'default'
    }
  }

  const recommendation = getRecommendation()

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Tu cuerpo" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Tu cuerpo" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Hero Section - Orange gradient */}
        <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 dark:from-orange-700 dark:via-orange-800 dark:to-amber-800 rounded-3xl p-6 overflow-hidden">
          {/* Glow effect */}
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
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    stats.trend === 'improving'
                      ? 'bg-emerald-500/30 text-emerald-100'
                      : 'bg-red-500/30 text-red-100'
                  }`}>
                    {stats.trend === 'improving' ? '↑ Más activo' : '↓ Menos activo'}
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
                  <span className="text-base">🔥</span>
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

        {/* Recommendation */}
        {recommendation && (
          <RecommendationCard
            emoji={recommendation.emoji}
            title={recommendation.title}
            description={recommendation.description}
            action={recommendation.action}
            actionLabel={recommendation.actionLabel}
            variant={recommendation.variant}
          />
        )}

        {/* Quick action */}
        <a href="/chat" className="block">
          <Card className="p-5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <span className="text-2xl">💪</span>
                </div>
                <div>
                  <p className="text-white font-semibold">¿Hiciste ejercicio?</p>
                  <p className="text-orange-100 text-sm">Registrar actividad</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>
        </a>

        {/* Navigation */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Explorar
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 hover:shadow-lg transition-shadow">
            <ListRow label="📊 Resumen mensual" href="/fisico/resumen" />
            <ListRow label="🏃 Hábitos" href="/fisico/habitos" />
            <ListRow label="🍎 Comida" href="/fisico/comida" />
            <ListRow label="💊 Salud" href="/fisico/salud" />
            <ListRow label="🏋️ Entrenos" href="/fisico/entrenos" />
          </Card>
        </div>
      </div>
    </div>
  )
}
