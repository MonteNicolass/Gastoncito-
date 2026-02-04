'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getLifeEntries } from '@/lib/storage'
import {
  getSpendingByMood,
  getMoodByExercise
} from '@/lib/insights/crossInsights'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function MentalInsightsPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState({
    spendingByMood: null,
    moodByExercise: null
  })

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()

      const spendingByMood = getSpendingByMood(movimientos, lifeEntries, 30)
      const moodByExercise = getMoodByExercise(lifeEntries, 30)

      setInsights({
        spendingByMood,
        moodByExercise
      })
    } catch (error) {
      console.error('Error loading insights:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Insights" backHref="/mental" />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Card className="p-4 animate-pulse">
            <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Insights" backHref="/mental" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Cruces de datos (últimos 30 días)
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
            Relaciones entre tu estado mental, gastos y hábitos
          </p>
        </div>

        {/* Gasto por mood */}
        {insights.spendingByMood && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Gasto según estado
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Días con estado bajo (≤4)
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  ${insights.spendingByMood.lowMoodAvg.toLocaleString()}/día
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Días con estado normal/alto
                </span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  ${insights.spendingByMood.normalMoodAvg.toLocaleString()}/día
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {insights.spendingByMood.deltaPercent > 10
                    ? `En días con estado bajo, el gasto promedio fue ${Math.abs(insights.spendingByMood.deltaPercent)}% mayor.`
                    : insights.spendingByMood.deltaPercent < -10
                    ? `En días con estado bajo, el gasto promedio fue ${Math.abs(insights.spendingByMood.deltaPercent)}% menor.`
                    : 'El gasto promedio es similar independientemente del estado.'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Basado en {insights.spendingByMood.lowMoodDays} días con estado bajo y{' '}
                  {insights.spendingByMood.normalMoodDays} días normales/altos
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Mood por ejercicio */}
        {insights.moodByExercise && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Estado según ejercicio
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Días con ejercicio
                </span>
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {insights.moodByExercise.avgWithExercise}/5
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Días sin ejercicio
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {insights.moodByExercise.avgWithoutExercise}/5
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
              <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-3">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  {insights.moodByExercise.delta > 0.5
                    ? `En días con ejercicio, el estado promedio fue ${insights.moodByExercise.delta.toFixed(1)} puntos mayor.`
                    : insights.moodByExercise.delta < -0.5
                    ? `En días con ejercicio, el estado promedio fue ${Math.abs(insights.moodByExercise.delta).toFixed(1)} puntos menor.`
                    : 'El estado promedio es similar con o sin ejercicio.'}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  Basado en {insights.moodByExercise.daysWithExercise} días con ejercicio y{' '}
                  {insights.moodByExercise.daysWithoutExercise} días sin ejercicio
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Sin datos suficientes */}
        {!insights.spendingByMood && !insights.moodByExercise && (
          <Card className="p-6 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No hay suficientes datos para mostrar cruces.
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
              Necesitas registrar tu estado mental, gastos y ejercicio regularmente para ver patrones.
            </p>
          </Card>
        )}

        {/* Explicación */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300">
              ¿Qué son los insights?
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
              Los insights muestran patrones y relaciones entre tus datos. No son consejos,
              solo información para que veas cómo se relacionan tus hábitos, gastos y estado mental.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
