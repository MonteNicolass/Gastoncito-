'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getMovimientos, getLifeEntries } from '@/lib/storage'
import { getAllBehaviorInsights } from '@/lib/insights/behaviorInsights'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function ComportamientoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState(null)

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()

      const detected = getAllBehaviorInsights(movimientos, lifeEntries)
      setInsights(detected)
    } catch (error) {
      console.error('Error loading insights:', error)
    } finally {
      setLoading(false)
    }
  }

  const hasDetections = insights && Object.values(insights).some(i => i && i.detected)

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
  }

  const getIntensityBadge = (intensity) => {
    const colors = {
      baja: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
      media: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
      alta: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
    }
    return (
      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-lg ${colors[intensity] || colors.baja}`}>
        {intensity.toUpperCase()}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Comportamiento" />
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
      <TopBar title="Comportamiento" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Alertas tempranas
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 px-1">
            Patrones detectados automáticamente. No son diagnósticos, solo observaciones.
          </p>
        </div>

        {/* Racha de gasto alto */}
        {insights?.highSpendingStreak?.detected && (
          <Card className="p-4 border-l-4 border-orange-500">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300">
                      💸 Racha de gasto alto
                    </h3>
                    {getIntensityBadge(insights.highSpendingStreak.intensity)}
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {insights.highSpendingStreak.message}
                  </p>
                </div>
              </div>
              {insights.highSpendingStreak.dateRange && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  📅 {formatDate(insights.highSpendingStreak.dateRange.start)} - {formatDate(insights.highSpendingStreak.dateRange.end)}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Umbral:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.highSpendingStreak.threshold.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Promedio:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.highSpendingStreak.average.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Variabilidad inusual */}
        {insights?.spendingVariability?.detected && (
          <Card className="p-4 border-l-4 border-yellow-500">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                      📊 Variabilidad inusual de gasto
                    </h3>
                    {getIntensityBadge(insights.spendingVariability.intensity)}
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {insights.spendingVariability.message}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Promedio:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.spendingVariability.mean.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Desv. estándar:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.spendingVariability.stdDev.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Racha estado bajo */}
        {insights?.lowMoodStreak?.detected && (
          <Card className="p-4 border-l-4 border-purple-500">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-300">
                      💭 Racha de estado bajo
                    </h3>
                    {getIntensityBadge(insights.lowMoodStreak.intensity)}
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {insights.lowMoodStreak.message}
                  </p>
                </div>
              </div>
              {insights.lowMoodStreak.dateRange && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  📅 {formatDate(insights.lowMoodStreak.dateRange.start)} - {formatDate(insights.lowMoodStreak.dateRange.end)}
                </div>
              )}
              <Button
                onClick={() => router.push('/mental/estado')}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                Registrar estado actual
              </Button>
            </div>
          </Card>
        )}

        {/* Inactividad */}
        {insights?.inactivity?.detected && (
          <Card className="p-4 border-l-4 border-blue-500">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                      🏃 Caída de actividad física
                    </h3>
                    {getIntensityBadge(insights.inactivity.intensity)}
                  </div>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {insights.inactivity.message}
                  </p>
                </div>
              </div>
              {insights.inactivity.dateRange && (
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  📅 {formatDate(insights.inactivity.dateRange.start)} - {formatDate(insights.inactivity.dateRange.end)}
                </div>
              )}
              <Button
                onClick={() => router.push('/fisico/habitos')}
                variant="ghost"
                size="sm"
                className="w-full"
              >
                Registrar ejercicio
              </Button>
            </div>
          </Card>
        )}

        {/* Delivery frecuente */}
        {insights?.frequentDelivery?.detected && (
          <Card className="p-4 border-l-4 border-red-500">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                    🛵 Delivery frecuente
                  </h3>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {insights.frequentDelivery.message}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Total gastado:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.frequentDelivery.deliveryTotal.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">Promedio/pedido:</span>
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    ${insights.frequentDelivery.averagePerOrder.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Sin detecciones */}
        {!hasDetections && (
          <Card className="p-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
              Todo en orden
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No se detectaron patrones de comportamiento inusuales.
            </p>
          </Card>
        )}

        {/* Explicación */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-blue-900 dark:text-blue-300">
              ¿Cómo funcionan las alertas tempranas?
            </h4>
            <p className="text-xs text-blue-800 dark:text-blue-400 leading-relaxed">
              Estas alertas se disparan automáticamente cuando se detectan patrones basados en
              umbrales simples. La intensidad (baja/media/alta) indica qué tan fuerte es el patrón.
              No son diagnósticos ni recomendaciones, solo información para tu conocimiento.
            </p>
          </div>
        </Card>

        {/* Link a reglas */}
        <Button
          onClick={() => router.push('/mas/reglas')}
          variant="secondary"
          className="w-full"
        >
          Configurar reglas de categorización
        </Button>
      </div>
    </div>
  )
}
