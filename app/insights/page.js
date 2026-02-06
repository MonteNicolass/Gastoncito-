'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getLifeEntries } from '@/lib/storage'
import {
  getSpendingByMood,
  getMoodByExercise,
  getImpulsiveSpendingByExercise
} from '@/lib/insights/crossInsights'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { DollarSign, Brain, Dumbbell, BarChart3 } from 'lucide-react'

export default function InsightsPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState({
    spendingByMood: null,
    moodByExercise: null,
    impulsiveByExercise: null
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
      const impulsiveByExercise = getImpulsiveSpendingByExercise(movimientos, lifeEntries, 30)

      setInsights({
        spendingByMood,
        moodByExercise,
        impulsiveByExercise
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
        <TopBar title="Insights Cruzados" />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Card className="p-4 animate-pulse">
            <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </Card>
        </div>
      </div>
    )
  }

  const hasInsights = insights.spendingByMood || insights.moodByExercise || insights.impulsiveByExercise

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Insights Cruzados" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-2 mb-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Cruces entre áreas
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
            Relaciones entre tu estado, gastos y actividad (últimos 30 días)
          </p>
        </div>

        {/* Money ↔ Mental */}
        {insights.spendingByMood && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex gap-1">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Money ↔ Mental
                  </h3>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {insights.spendingByMood.deltaPercent > 10
                      ? `En días con estado bajo (≤4/10), el gasto promedio fue ${Math.abs(insights.spendingByMood.deltaPercent)}% mayor.`
                      : insights.spendingByMood.deltaPercent < -10
                      ? `En días con estado bajo (≤4/10), el gasto promedio fue ${Math.abs(insights.spendingByMood.deltaPercent)}% menor.`
                      : 'El gasto promedio es similar independientemente del estado.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Estado bajo:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.spendingByMood.lowMoodAvg.toLocaleString()}/día
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ({insights.spendingByMood.lowMoodDays} días)
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Estado normal/alto:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.spendingByMood.normalMoodAvg.toLocaleString()}/día
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ({insights.spendingByMood.normalMoodDays} días)
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Mental ↔ Físico */}
        {insights.moodByExercise && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex gap-1">
                  <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <Dumbbell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Mental ↔ Físico
                  </h3>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {insights.moodByExercise.delta > 0.5
                      ? `En días con ejercicio, el estado promedio fue ${insights.moodByExercise.delta.toFixed(1)} puntos mayor.`
                      : insights.moodByExercise.delta < -0.5
                      ? `En días con ejercicio, el estado promedio fue ${Math.abs(insights.moodByExercise.delta).toFixed(1)} puntos menor.`
                      : 'El estado promedio es similar con o sin ejercicio.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Con ejercicio:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    {insights.moodByExercise.avgWithExercise}/10
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ({insights.moodByExercise.daysWithExercise} días)
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Sin ejercicio:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    {insights.moodByExercise.avgWithoutExercise}/10
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ({insights.moodByExercise.daysWithoutExercise} días)
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Money ↔ Físico */}
        {insights.impulsiveByExercise && (
          <Card className="p-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex gap-1">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <Dumbbell className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Money ↔ Físico
                  </h3>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {insights.impulsiveByExercise.deltaPercent < -10
                      ? `Días con ejercicio tuvieron ${Math.abs(insights.impulsiveByExercise.deltaPercent)}% menos gastos impulsivos.`
                      : insights.impulsiveByExercise.deltaPercent > 10
                      ? `Días con ejercicio tuvieron ${Math.abs(insights.impulsiveByExercise.deltaPercent)}% más gastos impulsivos.`
                      : 'Los gastos impulsivos son similares con o sin ejercicio.'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Con ejercicio:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.impulsiveByExercise.avgWithExercise.toLocaleString()}/compra
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ({insights.impulsiveByExercise.countWithExercise} compras)
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Sin ejercicio:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.impulsiveByExercise.avgWithoutExercise.toLocaleString()}/compra
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    ({insights.impulsiveByExercise.countWithoutExercise} compras)
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Sin datos suficientes */}
        {!hasInsights && (
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <BarChart3 className="w-7 h-7 text-zinc-500" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Faltan datos para cruzar
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Registrá estado, gastos y ejercicio para ver patrones
            </p>
          </Card>
        )}

        {/* Explicación */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300">
              ¿Qué son estos cruces?
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
              Muestran cómo se relacionan tus hábitos, estado y gastos. No son diagnósticos
              ni consejos, solo patrones en tus datos para que tengas más conciencia.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
