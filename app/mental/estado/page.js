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
    <div className="flex flex-col min-h-screen">
      <TopBar title="Estado" backHref="/mental" />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-8">
          {/* Trends Section */}
          {!loadingTrends && trends && (trends.avg7 || trends.avg30) && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Tendencias
              </h3>

              {/* Promedios */}
              {(trends.avg7 || trends.avg30) && (
                <Card className="p-4">
                  <div className="space-y-2">
                    {trends.avg7 && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Promedio 7 días
                        </span>
                        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                          {trends.avg7.average}/10
                        </span>
                      </div>
                    )}
                    {trends.avg30 && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Promedio 30 días
                        </span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">
                          {trends.avg30.average}/10
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Variabilidad */}
              {trends.variability && (
                <Card className="p-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Variabilidad (7d)
                    </span>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {trends.variability.interpretation}
                    </span>
                  </div>
                </Card>
              )}

              {/* Rachas */}
              {(trends.streaks?.lowStreak || trends.streaks?.highStreak) && (
                <Card className="p-4">
                  <div className="space-y-2">
                    {trends.streaks.lowStreak && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Racha días bajos (≤4)
                        </span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {trends.streaks.lowStreak} días
                        </span>
                      </div>
                    )}
                    {trends.streaks.highStreak && (
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Racha días altos (≥7)
                        </span>
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {trends.streaks.highStreak} días
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Tendencia */}
              {trends.trend && (
                <Card className="p-4">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Tendencia
                    </span>
                    <span className={`text-sm font-medium ${
                      trends.trend.trend === 'Mejorando'
                        ? 'text-green-600 dark:text-green-400'
                        : trends.trend.trend === 'Bajando'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {trends.trend.trend}
                    </span>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Mood Score Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 text-center">
              ¿Cómo te sientes hoy?
            </h2>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  data-testid={`mood-btn-${score}`}
                  onClick={() => setMood(score)}
                  className={`
                    h-14 rounded-xl font-bold text-lg transition-all
                    ${mood === score
                      ? 'bg-blue-600 text-white scale-105 shadow-lg'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }
                  `}
                >
                  {score}
                </button>
              ))}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
              1 = Muy mal · 10 = Excelente
            </p>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Notas (opcional)
            </label>
            <textarea
              data-testid="mood-note-input"
              placeholder="¿Qué te hizo sentir así?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            data-testid="mood-submit-btn"
            onClick={handleSubmit}
            disabled={!mood || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
