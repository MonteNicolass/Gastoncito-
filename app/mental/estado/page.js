'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/ui/TopBar'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import { initDB, addLifeEntry, getLifeEntries } from '@/lib/storage'
import {
  getAverageMood,
  getMoodVariability,
  getMoodStreaks,
  getMoodTrend
} from '@/lib/insights/mentalInsights'

export default function EstadoPage() {
  const router = useRouter()
  const [mood, setMood] = useState(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [trends, setTrends] = useState(null)
  const [loadingTrends, setLoadingTrends] = useState(true)

  useEffect(() => {
    loadTrends()
  }, [])

  async function loadTrends() {
    try {
      await initDB()
      const entries = await getLifeEntries()

      const avg7 = getAverageMood(entries, 7)
      const avg30 = getAverageMood(entries, 30)
      const variability = getMoodVariability(entries, 7)
      const streaks = getMoodStreaks(entries, 30)
      const trend = getMoodTrend(entries)

      setTrends({
        avg7,
        avg30,
        variability,
        streaks,
        trend
      })
    } catch (error) {
      console.error('Error loading trends:', error)
    } finally {
      setLoadingTrends(false)
    }
  }

  const handleSubmit = async () => {
    if (!mood) return

    setIsSubmitting(true)
    try {
      await addLifeEntry({
        text: note || `Estado: ${mood}/10`,
        domain: 'mental',
        meta: { mood_score: mood }
      })
      router.push('/mental/diario')
    } catch (error) {
      console.error('Error saving mood entry:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Tu estado" backHref="/mental" />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Trends Section */}
          {!loadingTrends && trends && (trends.avg7 || trends.avg30) && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
                Cómo venís
              </h3>

              {/* Card unificado de tendencias */}
              <Card className="p-5 bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50">
                <div className="space-y-4">
                  {/* Promedios */}
                  {(trends.avg7 || trends.avg30) && (
                    <div className="flex items-center gap-4">
                      {trends.avg7 && (
                        <div className="flex-1">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
                            Últimos 7 días
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                              {trends.avg7.average}
                            </span>
                            <span className="text-sm text-zinc-400 dark:text-zinc-500">/10</span>
                          </div>
                        </div>
                      )}
                      {trends.avg30 && (
                        <div className="flex-1">
                          <span className="text-xs text-zinc-500 dark:text-zinc-400 block mb-1">
                            Último mes
                          </span>
                          <div className="flex items-baseline gap-1">
                            <span className="text-xl font-semibold text-zinc-700 dark:text-zinc-300">
                              {trends.avg30.average}
                            </span>
                            <span className="text-sm text-zinc-400 dark:text-zinc-500">/10</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Variabilidad y Tendencia */}
                  <div className="flex items-center gap-3 pt-3 border-t border-zinc-200/50 dark:border-zinc-700/50">
                    {trends.variability && (
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/60 dark:bg-zinc-800/60">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400">Estabilidad:</span>
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          {trends.variability.interpretation}
                        </span>
                      </div>
                    )}
                    {trends.trend && (
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${
                        trends.trend.trend === 'Mejorando'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : trends.trend.trend === 'Bajando'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}>
                        <span className="text-xs font-semibold">
                          {trends.trend.trend === 'Mejorando' ? '↑' : trends.trend.trend === 'Bajando' ? '↓' : '→'} {trends.trend.trend}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Rachas */}
                  {(trends.streaks?.lowStreak > 0 || trends.streaks?.highStreak > 0) && (
                    <div className="flex items-center gap-3">
                      {trends.streaks?.highStreak > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                          <span className="text-zinc-600 dark:text-zinc-400">{trends.streaks.highStreak}d buenos</span>
                        </div>
                      )}
                      {trends.streaks?.lowStreak > 0 && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-orange-500">•</span>
                          <span className="text-zinc-600 dark:text-zinc-400">{trends.streaks.lowStreak}d difíciles</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Mood Score Selection */}
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-1">
                ¿Cómo te sentís hoy?
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Elegí un número del 1 al 10
              </p>
            </div>

            <div className="grid grid-cols-5 gap-2.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  data-testid={`mood-btn-${score}`}
                  onClick={() => setMood(score)}
                  className={`
                    h-14 rounded-2xl font-bold text-lg transition-all active:scale-95
                    ${mood === score
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 scale-105 shadow-lg'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }
                  `}
                >
                  {score}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400 dark:text-zinc-500 px-1">
              <span>Muy mal</span>
              <span>Excelente</span>
            </div>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
              Nota opcional
            </label>
            <textarea
              data-testid="mood-note-input"
              placeholder="¿Qué te hizo sentir así?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-terra-500/50 focus:border-terra-500 transition-all resize-none text-sm"
            />
          </div>

          {/* Submit Button */}
          <Button
            data-testid="mood-submit-btn"
            onClick={handleSubmit}
            disabled={!mood || isSubmitting}
            className="w-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200"
            size="lg"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar estado'}
          </Button>
        </div>
      </div>
    </div>
  )
}
