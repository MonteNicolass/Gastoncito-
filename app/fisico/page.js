'use client'

import { useState, useEffect } from 'react'
import { initDB, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

export default function FisicoPage() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    await initDB()
    const entries = await getLifeEntries()
    const physicalEntries = entries.filter(e => e.domain === 'physical')

    // Últimos 7 días
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const weekEntries = physicalEntries.filter(e => new Date(e.created_at) >= weekAgo)

    // Días únicos con actividad esta semana
    const activeDays = new Set(
      weekEntries.map(e => new Date(e.created_at).toDateString())
    ).size

    // Racha de días consecutivos
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

    // Días desde última actividad
    let daysSinceLast = null
    if (physicalEntries.length > 0) {
      const sorted = [...physicalEntries].sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      )
      const lastDate = new Date(sorted[0].created_at)
      daysSinceLast = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24))
    }

    // Actividades esta semana
    const weekActivities = weekEntries.length

    setStats({ activeDays, streak, daysSinceLast, weekActivities })
  }

  const getWeekStatus = () => {
    if (!stats) return null
    if (stats.activeDays >= 5) return { text: 'Semana activa', icon: '✨', color: 'text-green-600 dark:text-green-400' }
    if (stats.activeDays >= 3) return { text: 'Buen ritmo', icon: '✓', color: 'text-blue-600 dark:text-blue-400' }
    if (stats.activeDays >= 1) return { text: 'En movimiento', icon: '→', color: 'text-orange-600 dark:text-orange-400' }
    return { text: 'Empezá hoy', icon: '💪', color: 'text-zinc-500 dark:text-zinc-400' }
  }

  const weekStatus = getWeekStatus()

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Tu cuerpo" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Estado actual - Card grande */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-orange-200/50 dark:border-orange-800/50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
                Esta semana
              </h2>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                  {stats?.activeDays || 0}
                </span>
                <span className="text-lg text-zinc-400 dark:text-zinc-500">días activos</span>
              </div>
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
                    i < stats.activeDays
                      ? 'bg-orange-500 dark:bg-orange-400'
                      : 'bg-orange-200 dark:bg-orange-800/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Racha y último día */}
          <div className="mt-4 pt-4 border-t border-orange-200/50 dark:border-orange-700/50 flex items-center justify-between">
            {stats?.streak > 0 ? (
              <div className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {stats.streak} {stats.streak === 1 ? 'día' : 'días'} de racha
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {stats?.daysSinceLast === 0 ? 'Activo hoy' :
                   stats?.daysSinceLast === 1 ? 'Último: ayer' :
                   stats?.daysSinceLast ? `Hace ${stats.daysSinceLast} días` : 'Sin registros'}
                </span>
              </div>
            )}
            {stats?.weekActivities > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {stats.weekActivities} {stats.weekActivities === 1 ? 'actividad' : 'actividades'}
              </span>
            )}
          </div>
        </Card>

        {/* Acción rápida */}
        <a href="/chat" className="block">
          <Card className="p-5 bg-orange-600 hover:bg-orange-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <span className="text-2xl">💪</span>
                </div>
                <div>
                  <p className="text-white font-semibold">¿Hiciste ejercicio?</p>
                  <p className="text-orange-200 text-sm">Registrar actividad</p>
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
