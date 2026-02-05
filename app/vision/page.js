'use client'

import { useState, useEffect, useCallback } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals, getWallets } from '@/lib/storage'
import { getAllOverviewData } from '@/lib/overview-insights'
import { getAllBehaviorInsights } from '@/lib/insights/behaviorInsights'
import { getAllSilentAlerts } from '@/lib/silent-alerts'
import { getUserPreferences, updateSectionPreferences } from '@/lib/user-preferences'
import { getSpendingByMood, getMoodByExercise, getImpulsiveSpendingByExercise } from '@/lib/insights/crossInsights'
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
  const [crossInsights, setCrossInsights] = useState(null)
  const [showAllAlerts, setShowAllAlerts] = useState(false)
  const [expandedAlertId, setExpandedAlertId] = useState(null)

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

      // Calculate cross insights
      const spendingByMood = getSpendingByMood(movimientos, lifeEntries, 30)
      const moodByExercise = getMoodByExercise(lifeEntries, 30)
      const impulsiveByExercise = getImpulsiveSpendingByExercise(movimientos, lifeEntries, 30)

      setData(overview)
      setAlerts(silentAlerts)
      setCrossInsights({ spendingByMood, moodByExercise, impulsiveByExercise })
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

  const getAlertExplanation = useCallback((alert) => {
    switch (alert.type) {
      case 'no_physical_activity':
        return `En los últimos ${alert.data.daysSince} días no registraste actividad física. Esto rompe tu racha anterior.`

      case 'low_physical_activity':
        return `Han pasado ${alert.data.daysSince} días desde tu última actividad física registrada.`

      case 'low_mood_streak':
        return `Tu estado mental promedio de los últimos 7 días es ${Math.round(alert.data.average * 10) / 10}/10, por debajo de tu promedio habitual.`

      case 'budget_at_risk':
        const daysLeftAtRisk = Math.max(0, 30 - new Date().getDate())
        return `Has gastado ${Math.round(alert.data.percentage)}% de tu presupuesto mensual para ${alert.data.budget.name}. Te quedan ${daysLeftAtRisk} días en el mes.`

      case 'budget_exceeded':
        const daysLeftExceeded = Math.max(0, 30 - new Date().getDate())
        return `Has superado el presupuesto mensual de ${alert.data.budget.name} en un ${Math.round(alert.data.percentage - 100)}%. Quedan ${daysLeftExceeded} días en el mes.`

      case 'spending_mood_correlation':
        return `Los días con estado mental bajo gastas ${Math.abs(alert.data.deltaPercent)}% más que los días con estado normal o alto.`

      case 'atypical_spending':
        return `Tu gasto en ${alert.data.movimiento.categoria} fue ${Math.round((alert.data.movimiento.monto / alert.data.average - 1) * 100)}% superior a tu promedio semanal habitual.`

      default:
        return null
    }
  }, [])

  const getAlertActions = useCallback((alert) => {
    switch (alert.type) {
      case 'no_physical_activity':
      case 'low_physical_activity':
        return [
          { label: 'Registrar ejercicio', href: '/chat', prefill: 'Fui al gimnasio' }
        ]

      case 'low_mood_streak':
        return [
          { label: 'Registrar estado', href: '/chat', prefill: 'Hoy me sentí ' }
        ]

      case 'budget_at_risk':
      case 'budget_exceeded':
        return [
          { label: 'Ver movimientos', href: '/money/movimientos' }
        ]

      case 'spending_mood_correlation':
        return [
          { label: 'Ver análisis', href: '/insights' }
        ]

      case 'atypical_spending':
        return [
          { label: 'Ver gastos', href: '/money/movimientos' }
        ]

      default:
        return []
    }
  }, [])

  // Definir todos los cards disponibles
  const allCards = {
    estadoGeneral: {
      title: '📊 Estado General',
      description: 'Resumen rápido',
      render: () => data && (
        <Card className="p-4 bg-gradient-to-br from-slate-50 to-zinc-50 dark:from-slate-950/20 dark:to-zinc-950/20 border-slate-200 dark:border-slate-800">
          <div className="space-y-3">
            {/* Mental */}
            {data.mental && data.mental.average7d > 0 && (
              <a href="/mental" className="block">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🧠</div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Mental</div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        Promedio 7d: {data.mental.average7d}/10
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {data.mental.trend === 'improving' && (
                      <span className="text-sm text-green-600 dark:text-green-400">↗</span>
                    )}
                    {data.mental.trend === 'declining' && (
                      <span className="text-sm text-orange-600 dark:text-orange-400">↘</span>
                    )}
                    {data.mental.trend === 'stable' && (
                      <span className="text-sm text-zinc-500 dark:text-zinc-400">=</span>
                    )}
                  </div>
                </div>
              </a>
            )}

            {/* Físico */}
            {data.physical && (
              <a href="/fisico" className="block">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💪</div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Físico</div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        {data.physical.daysSinceLastExercise !== null && (
                          <>
                            {data.physical.daysSinceLastExercise === 0 ? 'Hoy hiciste ejercicio' :
                             data.physical.daysSinceLastExercise === 1 ? 'Último: ayer' :
                             `Último: hace ${data.physical.daysSinceLastExercise} días`}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            )}

            {/* Money */}
            {data.money && (
              <a href="/money" className="block">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">💰</div>
                    <div>
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Money</div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">
                        Balance: {formatAmount(data.money.balance)}
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            )}
          </div>
        </Card>
      )
    },
    alertas: {
      title: '⚠️ Insights',
      description: 'Alertas tempranas',
      render: () => {
        if (alerts.length === 0) return null

        const displayAlerts = showAllAlerts ? alerts : alerts.slice(0, 3)
        const hasMore = alerts.length > 3

        return (
          <div className="space-y-2">
            {displayAlerts.map((alert, i) => {
              const alertId = `${alert.type}-${i}`
              const isExpanded = expandedAlertId === alertId
              const explanation = getAlertExplanation(alert)
              const actions = getAlertActions(alert)

              return (
                <Card
                  key={i}
                  className={`p-3 cursor-pointer transition-all ${
                    alert.severity === 'high'
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                      : alert.severity === 'medium'
                      ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                      : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                  }`}
                  onClick={() => setExpandedAlertId(isExpanded ? null : alertId)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {alert.title}
                      </div>
                      {alert.message && (
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {alert.message}
                        </div>
                      )}

                      {/* Expanded content */}
                      {isExpanded && explanation && (
                        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                          <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                            {explanation}
                          </div>

                          {/* Actions */}
                          {actions.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {actions.map((action, idx) => (
                                <a
                                  key={idx}
                                  href={action.href}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (action.prefill && typeof window !== 'undefined') {
                                      localStorage.setItem('chat_prefill', action.prefill)
                                    }
                                  }}
                                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
                                >
                                  {action.label}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Expand indicator */}
                    <div className="text-zinc-400 dark:text-zinc-500 text-xs ml-2">
                      {isExpanded ? '−' : '+'}
                    </div>
                  </div>
                </Card>
              )
            })}

            {hasMore && !showAllAlerts && (
              <button
                onClick={() => setShowAllAlerts(true)}
                className="w-full text-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 py-2 transition-colors"
              >
                Ver {alerts.length - 3} más →
              </button>
            )}

            {showAllAlerts && hasMore && (
              <button
                onClick={() => setShowAllAlerts(false)}
                className="w-full text-center text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 py-2 transition-colors"
              >
                Ver menos ←
              </button>
            )}
          </div>
        )
      }
    },
    objetivos: {
      title: '🎯 Objetivos',
      description: 'Progreso general',
      render: () => data?.goals && data.goals.total > 0 && (
        <a href="/objetivos">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs text-zinc-600 dark:text-zinc-400">🎯 Objetivos</div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {data.goals.total}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Progreso promedio</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
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

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Resumen General" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Links rápidos */}
        <div className="grid grid-cols-3 gap-2">
          <a href="/hoy">
            <Card className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
              <div className="flex flex-col gap-1">
                <span className="text-2xl">📅</span>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Hoy</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Todo lo registrado</div>
              </div>
            </Card>
          </a>

          <a href="/semana">
            <Card className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
              <div className="flex flex-col gap-1">
                <span className="text-2xl">📆</span>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Semana</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Resumen semanal</div>
              </div>
            </Card>
          </a>

          <a href="/mes">
            <Card className="p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
              <div className="flex flex-col gap-1">
                <span className="text-2xl">🗓️</span>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Mes</div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Resumen mensual</div>
              </div>
            </Card>
          </a>
        </div>

        {/* Estado General */}
        {allCards.estadoGeneral.render()}

        {/* Insights / Alertas (Bloque Principal) */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
              Insights / Alertas tempranas
            </h3>
            {allCards.alertas.render()}
          </div>
        )}

        {/* Objetivos */}
        {data?.goals && data.goals.total > 0 && allCards.objetivos.render()}

        {/* Links a secciones adicionales */}
        <div className="grid grid-cols-2 gap-2">
          <a href="/historia">
            <Card className="p-4 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
              <div className="text-2xl mb-1">📖</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Historia</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Evolución y score
              </div>
            </Card>
          </a>

          <a href="/insights">
            <Card className="p-4 text-center hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
              <div className="text-2xl mb-1">📊</div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Insights</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Análisis cruzados
              </div>
            </Card>
          </a>
        </div>
      </div>
    </div>
  )
}
