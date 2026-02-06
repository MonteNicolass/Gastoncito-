'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getLifeEntries } from '@/lib/storage'
import {
  getSpendingByMood,
  getMoodByExercise
} from '@/lib/insights/crossInsights'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { BarChart3 } from 'lucide-react'

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
        <div className="space-y-2 mb-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Cruces de datos
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
            Relaciones entre tu estado, gastos y hábitos (últimos 30 días)
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
                  {insights.moodByExercise.avgWithExercise}/10
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Días sin ejercicio
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  {insights.moodByExercise.avgWithoutExercise}/10
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
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-zinc-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Faltan datos para cruzar
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Registrá estado, gastos y ejercicio para ver patrones
            </p>
          </Card>
        )}

        {/* Explicación */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300">
              ¿Qué son estos datos?
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
              Muestran patrones entre tu estado, gastos y hábitos. No son consejos,
              solo información para que tengas más conciencia de cómo se relacionan.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
