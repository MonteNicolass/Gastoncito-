'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ProgressRing from '@/components/ui/ProgressRing'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Flame,
  ChevronRight,
  BarChart3,
  BookOpen,
  LineChart,
  Plus,
  Smile,
  Frown,
  Meh
} from 'lucide-react'

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

      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const prevWeekEntries = mentalEntries.filter(e => {
        const d = new Date(e.created_at)
        return d >= twoWeeksAgo && d < weekAgo
      })
      const prevWeekAvg = prevWeekEntries.length > 0
        ? prevWeekEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / prevWeekEntries.length
        : null

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

      let variability = null
      if (weekEntries.length >= 3) {
        const scores = weekEntries.map(e => e.meta.mood_score)
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
        variability = Math.sqrt(variance)
      }

      let trend = 'stable'
      if (weekAvg !== null && prevWeekAvg !== null) {
        if (weekAvg > prevWeekAvg + 0.5) trend = 'up'
        else if (weekAvg < prevWeekAvg - 0.5) trend = 'down'
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

  const getMoodIcon = (score) => {
    if (score >= 7) return Smile
    if (score >= 4) return Meh
    return Frown
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Mental" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  const MoodIcon = stats?.weekAvg ? getMoodIcon(stats.weekAvg) : Meh

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Mental" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Hero Section - Purple gradient */}
        <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-pink-700 dark:from-purple-800 dark:via-purple-900 dark:to-pink-900 rounded-3xl p-6 overflow-hidden">
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
                  <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    stats.trend === 'up'
                      ? 'bg-emerald-500/30 text-emerald-200'
                      : 'bg-red-500/30 text-red-200'
                  }`}>
                    {stats.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stats.trend === 'up' ? 'Mejorando' : 'Bajando'}
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
                <Flame className="w-4 h-4 text-orange-300" />
                <span className="text-xs text-purple-200">
                  {stats.streak} días de racha
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick action */}
        <button
          onClick={() => router.push('/chat')}
          className="w-full p-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl transition-all shadow-lg shadow-purple-500/20 active:scale-[0.98] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">¿Cómo te sentís?</p>
              <p className="text-purple-200 text-xs">Registrar estado</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/60" />
        </button>

        {/* Navigation */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Explorar
          </h3>
          <div className="space-y-1">
            {[
              { icon: BarChart3, label: 'Resumen mensual', href: '/mental/resumen' },
              { icon: BookOpen, label: 'Mi diario', href: '/mental/diario' },
              { icon: LineChart, label: 'Insights', href: '/mental/insights' }
            ].map(({ icon: Icon, label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="w-full p-3 rounded-xl text-left bg-white dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <Icon className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex-1">{label}</span>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Variability insight */}
        {stats?.variability !== null && stats.variability > 2 && (
          <Card className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20">
            <div className="flex items-start gap-3">
              <Meh className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Semana variable</p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  Tu estado mental fluctuó bastante esta semana. Revisá qué factores pueden estar influyendo.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
