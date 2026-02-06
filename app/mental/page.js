'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
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

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Mental" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Hero Section */}
        <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              Esta semana
            </p>
          </div>

          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {stats?.weekAvg ? (Math.round(stats.weekAvg * 10) / 10) : '–'}
              </span>
              <span className="text-xl text-zinc-300 dark:text-zinc-600 font-display">/10</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                {stats?.daysThisWeek || 0}/7 días
              </span>
              {stats?.trend && stats.trend !== 'stable' && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  stats.trend === 'up'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                }`}>
                  {stats.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {stats.trend === 'up' ? 'Mejorando' : 'Bajando'}
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
                    i < (stats?.daysThisWeek || 0)
                      ? 'bg-zinc-500'
                      : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>
            {stats?.streak > 0 && (
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  {stats.streak} días de racha
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick action */}
        <button
          onClick={() => router.push('/chat')}
          className="w-full p-4 rounded-2xl bg-zinc-900 dark:bg-zinc-100 transition-all active:scale-[0.98] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Plus className="w-5 h-5 text-white dark:text-zinc-900" />
            <div className="text-left">
              <p className="text-white dark:text-zinc-900 font-semibold text-sm">¿Cómo te sentís?</p>
              <p className="text-zinc-400 dark:text-zinc-500 text-[10px]">Registrar estado</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/60 dark:text-zinc-900/60" />
        </button>

        {/* Navigation */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
            Explorar
          </h3>
          <div className="space-y-1.5">
            {[
              { icon: BarChart3, label: 'Resumen mensual', href: '/mental/resumen' },
              { icon: BookOpen, label: 'Mi diario', href: '/mental/diario' },
              { icon: LineChart, label: 'Insights', href: '/mental/insights' }
            ].map(({ icon: Icon, label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="w-full p-3.5 rounded-2xl text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{label}</span>
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
              </button>
            ))}
          </div>
        </div>

        {/* Variability insight */}
        {stats?.variability !== null && stats.variability > 2 && (
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <Meh className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Semana variable</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Tu estado mental fluctuó bastante esta semana.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
