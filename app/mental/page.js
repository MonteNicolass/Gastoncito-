'use client'

import { useState, useEffect } from 'react'
import { initDB, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

export default function MentalPage() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    await initDB()
    const entries = await getLifeEntries()
    const mentalEntries = entries.filter(e => e.domain === 'mental' && e.meta?.mood_score)

    // Últimos 7 días
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekEntries = mentalEntries.filter(e => new Date(e.created_at) >= weekAgo)

    // Promedio semanal
    const weekAvg = weekEntries.length > 0
      ? weekEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / weekEntries.length
      : null

    // Racha de registros consecutivos
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

    // Días esta semana con registro
    const daysThisWeek = new Set(
      weekEntries.map(e => new Date(e.created_at).toDateString())
    ).size

    setStats({ weekAvg, streak, daysThisWeek, totalWeekEntries: weekEntries.length })
  }

  const getWeekStatus = () => {
    if (!stats) return null
    if (stats.daysThisWeek >= 5) return { text: 'Semana completa', icon: '✨', color: 'text-green-600 dark:text-green-400' }
    if (stats.daysThisWeek >= 3) return { text: 'Vas bien', icon: '✓', color: 'text-blue-600 dark:text-blue-400' }
    return { text: `${stats.daysThisWeek}/7 días`, icon: '→', color: 'text-zinc-500 dark:text-zinc-400' }
  }

  const weekStatus = getWeekStatus()

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Tu mente" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Estado actual - Card grande */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200/50 dark:border-purple-800/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
                Esta semana
              </h2>
              {stats?.weekAvg ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                    {Math.round(stats.weekAvg * 10) / 10}
                  </span>
                  <span className="text-lg text-zinc-400 dark:text-zinc-500">/10</span>
                </div>
              ) : (
                <p className="text-lg text-zinc-500 dark:text-zinc-400">Sin registros aún</p>
              )}
            </div>
            {weekStatus && (
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-zinc-800/60 ${weekStatus.color}`}>
                <span className="text-sm">{weekStatus.icon}</span>
                <span className="text-xs font-semibold">{weekStatus.text}</span>
              </div>
            )}
          </div>

          {/* Barra semanal visual */}
          {stats && (
            <div className="flex gap-1.5">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    i < stats.daysThisWeek
                      ? 'bg-purple-500 dark:bg-purple-400'
                      : 'bg-purple-200 dark:bg-purple-800/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Racha */}
          {stats?.streak > 0 && (
            <div className="mt-4 pt-4 border-t border-purple-200/50 dark:border-purple-700/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {stats.streak} {stats.streak === 1 ? 'día' : 'días'} seguidos registrando
                </span>
              </div>
            </div>
          )}
        </Card>

        {/* Acción rápida */}
        <a href="/chat" className="block">
          <Card className="p-5 bg-purple-600 hover:bg-purple-700 transition-colors">
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

        {/* Navegación */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Explorar
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <ListRow label="📊 Resumen mensual" href="/mental/resumen" />
            <ListRow label="📝 Mi diario" href="/mental/diario" />
            <ListRow label="📈 Insights" href="/mental/insights" />
          </Card>
        </div>
      </div>
    </div>
  )
}
