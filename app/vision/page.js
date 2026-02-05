'use client'

import { useState, useEffect, useCallback } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals, getWallets } from '@/lib/storage'
import { getAllOverviewData } from '@/lib/overview-insights'
import { getAllBehaviorInsights } from '@/lib/insights/behaviorInsights'
import { getAllSilentAlerts } from '@/lib/silent-alerts'
import { getUserPreferences, updateSectionPreferences } from '@/lib/user-preferences'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import CardManager from '@/components/ui/CardManager'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function VisionGeneralPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [preferences, setPreferences] = useState(null)

  const loadOverview = useCallback(async () => {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const categorias = await getCategorias()
      const goals = await getGoals()
      const wallets = await getWallets()
      const budgets = getBudgetsFromLocalStorage()

      const behaviorInsights = getAllBehaviorInsights(movimientos, lifeEntries)
      const overview = getAllOverviewData(movimientos, lifeEntries, categorias, goals, behaviorInsights, wallets)
      const silentAlerts = getAllSilentAlerts(movimientos, lifeEntries, budgets, categorias)

      setData(overview)
      setAlerts(silentAlerts)
      setPreferences(getUserPreferences().vision)
    } catch (error) {
      console.error('Error loading overview:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  const handleUpdatePreferences = useCallback((updates) => {
    const newPrefs = updateSectionPreferences('vision', updates)
    setPreferences(newPrefs.vision)
  }, [])

  const formatAmount = useCallback((amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }, [])

  // Definir todos los cards disponibles
  const allCards = {
    money: {
      title: '💰 Money',
      description: 'Gasto del mes',
      render: () => data?.money && (
        <a href="/money">
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800 hover:shadow-md transition-shadow cursor-pointer">
            <div className="mb-2">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">💰 Money</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Gastos mes</span>
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatAmount(data.money.gastos)}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Balance</span>
                <span className={`text-lg font-semibold ${data.money.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatAmount(data.money.balance)}
                </span>
              </div>
              {data.money.topCategory && (
                <div className="pt-2 border-t border-green-200 dark:border-green-800">
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Top: {data.money.topCategory.name}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </a>
      )
    },
    mental: {
      title: '🧠 Mental',
      description: 'Estado promedio',
      render: () => data?.mental && data.mental.average7d > 0 && (
        <a href="/mental">
          <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow cursor-pointer">
            <div className="mb-2">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">🧠 Mental</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">7 días</div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {data.mental.average7d}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">30 días</div>
                <div className="text-3xl font-bold text-purple-500 dark:text-purple-300">
                  {data.mental.average30d}
                </div>
              </div>
            </div>
          </Card>
        </a>
      )
    },
    fisico: {
      title: '💪 Físico',
      description: 'Actividad semanal',
      render: () => data?.physical && (
        <a href="/fisico">
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800 hover:shadow-md transition-shadow cursor-pointer">
            <div className="mb-2">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">💪 Físico</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Días activos</div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {data.physical.activeDays}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Racha</div>
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {data.physical.streak}
                </div>
              </div>
            </div>
          </Card>
        </a>
      )
    },
    objetivos: {
      title: '🎯 Objetivos',
      description: 'Progreso general',
      render: () => data?.goals && data.goals.total > 0 && (
        <a href="/objetivos">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow cursor-pointer">
            <div className="mb-2">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">🎯 Objetivos</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Progreso promedio</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {data.goals.averageProgress}%
                </span>
              </div>
              {data.goals.atRisk > 0 && (
                <div className="text-xs text-orange-600 dark:text-orange-400">
                  {data.goals.atRisk} en riesgo
                </div>
              )}
            </div>
          </Card>
        </a>
      )
    },
    alertas: {
      title: '⚠️ Alertas',
      description: 'Notificaciones activas',
      render: () => alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 px-1">
            ⚠️ Alertas
          </h3>
          {alerts.slice(0, 3).map((alert, i) => (
            <Card
              key={i}
              className={`p-3 ${
                alert.severity === 'high'
                  ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                  : alert.severity === 'medium'
                  ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                  : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {alert.title}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {alert.message}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )
    },
    resumen: {
      title: '📅 Resumen Semanal',
      description: 'Esta semana vs anterior',
      render: () => data?.weeklySummary && (
        <Card className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-200 dark:border-indigo-800">
          <div className="mb-3">
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">📅 Resumen Semanal</div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Esta semana vs anterior
            </h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">💰 Money</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {formatAmount(data.weeklySummary.money.thisWeek)}
              </span>
            </div>
            {data.weeklySummary.mental.thisWeek > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">🧠 Mental</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {data.weeklySummary.mental.thisWeek}/10
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">💪 Físico</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {data.weeklySummary.physical.activeDays} días
              </span>
            </div>
            {data.weeklySummary.goals.active > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">🎯 Objetivos</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {data.weeklySummary.goals.onTrack}/{data.weeklySummary.goals.active}
                </span>
              </div>
            )}
          </div>
        </Card>
      )
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Resumen General" />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Card className="p-4 animate-pulse">
            <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </Card>
        </div>
      </div>
    )
  }

  if (!data || !preferences) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Resumen General" />
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Cargando...
            </h3>
          </Card>
        </div>
      </div>
    )
  }

  // Obtener cards visibles y ordenados
  const visibleCards = preferences.cardOrder
    .filter(id => preferences.visibleCards.includes(id))
    .slice(0, preferences.maxVisible || 6)

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <TopBar title="Resumen General" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="text-center mb-2">
          <h2 className="text-sm text-zinc-500 dark:text-zinc-400">
            Cómo estás en general hasta ahora
          </h2>
        </div>

        {/* Cards visibles */}
        {visibleCards.map(cardId => {
          const card = allCards[cardId]
          if (!card) return null
          return <div key={cardId}>{card.render()}</div>
        })}

        {/* Mostrar resto colapsado si hay más de maxVisible */}
        {preferences.cardOrder.filter(id => preferences.visibleCards.includes(id)).length > (preferences.maxVisible || 6) && (
          <Card className="p-4 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {preferences.cardOrder.filter(id => preferences.visibleCards.includes(id)).length - (preferences.maxVisible || 6)} cards más ocultos
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Tocá el botón de personalizar para verlos
            </p>
          </Card>
        )}
      </div>

      {/* Botón de personalización */}
      <CardManager
        section="vision"
        cards={allCards}
        preferences={preferences}
        onUpdate={handleUpdatePreferences}
      />
    </div>
  )
}
