'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'
import ProgressRing from '@/components/ui/ProgressRing'
import RecommendationCard from '@/components/ui/RecommendationCard'

export default function MentalPage() {
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
      const mentalEntries = entries.filter(e => e.domain === 'mental' && e.meta?.mood_score)

      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const weekEntries = mentalEntries.filter(e => new Date(e.created_at) >= weekAgo)

      const weekAvg = weekEntries.length > 0
        ? weekEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / weekEntries.length
        : null

      // Semana anterior
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const prevWeekEntries = mentalEntries.filter(e => {
        const d = new Date(e.created_at)
        return d >= twoWeeksAgo && d < weekAgo
      })
      const prevWeekAvg = prevWeekEntries.length > 0
        ? prevWeekEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / prevWeekEntries.length
        : null

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

        const hasEntry = mentalEntries.some(e => {
          const entryDate = new Date(e.created_at)
          return entryDate >= dayStart && entryDate <= dayEnd
        })

        if (hasEntry) {
          streak++
        } else if (i > 0) {
          break
        }
      }

      const daysThisWeek = new Set(
        weekEntries.map(e => new Date(e.created_at).toDateString())
      ).size

      // Variabilidad
      let variability = null
      if (weekEntries.length >= 3) {
        const scores = weekEntries.map(e => e.meta.mood_score)
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
        variability = Math.sqrt(variance)
      }

      // Trend
      let trend = 'stable'
      if (weekAvg !== null && prevWeekAvg !== null) {
        if (weekAvg > prevWeekAvg + 0.5) trend = 'improving'
        else if (weekAvg < prevWeekAvg - 0.5) trend = 'declining'
      }

      setStats({ weekAvg, streak, daysThisWeek, totalWeekEntries: weekEntries.length, prevWeekAvg, variability, trend })
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 7) return 'green'
    if (score >= 5) return 'purple'
    if (score >= 3) return 'orange'
    return 'zinc'
  }

  const getRecommendation = () => {
    if (!stats) return null

    if (stats.weekAvg !== null && stats.weekAvg < 4) {
      return {
        emoji: '💜',
        title: 'Cuidá tu bienestar',
        description: 'Tu estado mental estuvo bajo esta semana. Tomate un momento para vos.',
        action: () => router.push('/mental/diario'),
        actionLabel: 'Escribir',
        variant: 'info'
      }
    }

    if (stats.daysThisWeek === 0) {
      return {
        emoji: '📝',
        title: 'Empezá a registrar',
        description: 'No tenés registros esta semana. Un registro diario ayuda a entenderte mejor.',
        action: () => router.push('/chat'),
        actionLabel: 'Registrar',
        variant: 'default'
      }
    }

    if (stats.variability && stats.variability > 2.5) {
      return {
        emoji: '📊',
        title: 'Semana variable',
        description: 'Tu estado mental fluctuó bastante. Revisá qué factores pueden influir.',
        action: () => router.push('/mental/insights'),
        actionLabel: 'Ver insights',
        variant: 'info'
      }
    }

    if (stats.trend === 'improving') {
      return {
        emoji: '✨',
        title: 'Vas mejorando',
        description: 'Tu estado mental mejoró respecto a la semana pasada.',
        variant: 'success'
      }
    }

    if (stats.streak >= 7) {
      return {
        emoji: '🔥',
        title: 'Excelente racha',
        description: `${stats.streak} días seguidos registrando. Mantené el hábito.`,
        variant: 'success'
      }
    }

    return {
      emoji: '🧠',
      title: 'Seguí registrando',
      description: 'Cada registro te ayuda a conocerte mejor.',
      action: () => router.push('/chat'),
      actionLabel: 'Registrar',
      variant: 'default'
    }
  }

  const recommendation = getRecommendation()

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Tu mente" />
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
      <TopBar title="Tu mente" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Hero Section - Purple gradient */}
        <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-700 dark:from-purple-800 dark:via-purple-900 dark:to-pink-900 rounded-3xl p-6 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 opacity-30">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl ${
              stats?.weekAvg >= 7 ? 'bg-emerald-400' :
              stats?.weekAvg >= 5 ? 'bg-purple-300' :
              stats?.weekAvg >= 3 ? 'bg-orange-400' :
              'bg-pink-400'
            }`} />
          </div>

          <div className="relative flex items-center gap-5">
            <ProgressRing
              progress={stats?.weekAvg ? stats.weekAvg * 10 : 0}
              size={100}
              strokeWidth={8}
              color={stats?.weekAvg ? getScoreColor(stats.weekAvg) : 'zinc'}
              label={stats?.weekAvg ? (Math.round(stats.weekAvg * 10) / 10).toString() : '–'}
              sublabel="/10"
            />

            <div className="flex-1">
              <p className="text-xs font-medium text-purple-200 uppercase tracking-wider mb-1">
                Esta semana
              </p>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-3xl font-bold text-white">
                  {stats?.weekAvg ? (Math.round(stats.weekAvg * 10) / 10) : '–'}
                </span>
                <span className="text-lg text-purple-200">/10</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-purple-200">
                  {stats?.daysThisWeek || 0}/7 días
                </span>
                {stats?.trend && stats.trend !== 'stable' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    stats.trend === 'improving'
                      ? 'bg-emerald-500/30 text-emerald-200'
                      : 'bg-red-500/30 text-red-200'
                  }`}>
                    {stats.trend === 'improving' ? '↑ Mejorando' : '↓ Bajando'}
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
                    i < (stats?.daysThisWeek || 0)
                      ? 'bg-white'
                      : 'bg-white/30'
                  }`}
                />
              ))}
            </div>
            {stats?.streak > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-base">🔥</span>
                <span className="text-xs text-purple-200">
                  {stats.streak} días de racha
                </span>
              </div>
            )}
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
          <Card className="p-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <span className="text-2xl">🧠</span>
                </div>
                <div>
                  <p className="text-white font-semibold">¿Cómo te sentís hoy?</p>
                  <p className="text-purple-200 text-sm">Registrar estado</p>
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
            <ListRow label="📊 Resumen mensual" href="/mental/resumen" />
            <ListRow label="📝 Mi diario" href="/mental/diario" />
            <ListRow label="📈 Insights" href="/mental/insights" />
          </Card>
        </div>
      </div>
    </div>
  )
}
