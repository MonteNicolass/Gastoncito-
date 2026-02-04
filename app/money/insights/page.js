'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getSubscriptions } from '@/lib/storage'
import {
  getWeeklyDelta,
  getTopCategories,
  getTopMerchants,
  getDeliveryRatio,
  getSubscriptionsInsights
} from '@/lib/insights/moneyInsights'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function MoneyInsightsPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState({
    weeklyDelta: null,
    topCategories7d: [],
    topCategories30d: [],
    topMerchants: [],
    deliveryRatio: null,
    subscriptions: null
  })

  useEffect(() => {
    loadInsights()
  }, [])

  async function loadInsights() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const subscriptions = await getSubscriptions()

      const weeklyDelta = getWeeklyDelta(movimientos)
      const topCategories7d = getTopCategories(movimientos, 7)
      const topCategories30d = getTopCategories(movimientos, 30)
      const topMerchants = getTopMerchants(movimientos, 30)
      const deliveryRatio = getDeliveryRatio(movimientos, 7)
      const subscriptionsData = getSubscriptionsInsights(subscriptions)

      setInsights({
        weeklyDelta,
        topCategories7d,
        topCategories30d,
        topMerchants,
        deliveryRatio,
        subscriptions: subscriptionsData
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
        <TopBar title="Insights" backHref="/money" />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <Card className="p-4 animate-pulse">
            <div className="h-24 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </Card>
          <Card className="p-4 animate-pulse">
            <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Insights" backHref="/money" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Delta Semanal */}
        {insights.weeklyDelta && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Delta semanal
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Últimos 7 días</span>
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  ${insights.weeklyDelta.current.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">7 días anteriores</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  ${insights.weeklyDelta.previous.toLocaleString()}
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Diferencia</span>
                <span
                  className={`text-sm font-medium ${
                    insights.weeklyDelta.delta > 0
                      ? 'text-red-600 dark:text-red-400'
                      : insights.weeklyDelta.delta < 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  {insights.weeklyDelta.delta > 0 ? '+' : ''}
                  ${insights.weeklyDelta.delta.toLocaleString()} ({insights.weeklyDelta.deltaPercent > 0 ? '+' : ''}
                  {insights.weeklyDelta.deltaPercent}%)
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Top Categorías 7d */}
        {insights.topCategories7d.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Top categorías (7 días)
            </h3>
            <div className="space-y-2">
              {insights.topCategories7d.map((cat, i) => (
                <div key={i} className="flex justify-between items-baseline">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{cat.name}</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    ${cat.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Top Categorías 30d */}
        {insights.topCategories30d.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Top categorías (30 días)
            </h3>
            <div className="space-y-2">
              {insights.topCategories30d.map((cat, i) => (
                <div key={i} className="flex justify-between items-baseline">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{cat.name}</span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    ${cat.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Top Merchants */}
        {insights.topMerchants.length > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Top métodos de pago (30 días)
            </h3>
            <div className="space-y-2">
              {insights.topMerchants.map((merchant, i) => (
                <div key={i} className="flex justify-between items-baseline">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300 capitalize">
                    {merchant.name}
                  </span>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    ${merchant.total.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Delivery Ratio */}
        {insights.deliveryRatio && insights.deliveryRatio.totalGastos > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Ratio de delivery (7 días)
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Gasto en delivery</span>
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  ${insights.deliveryRatio.deliveryTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Total gastos</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  ${insights.deliveryRatio.totalGastos.toLocaleString()}
                </span>
              </div>
              <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Porcentaje</span>
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {insights.deliveryRatio.ratio}%
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Suscripciones */}
        {insights.subscriptions && insights.subscriptions.monthlyTotal > 0 && (
          <Card className="p-4">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
              Suscripciones
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Costo mensual total</span>
                <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  ${insights.subscriptions.monthlyTotal.toLocaleString()}
                </span>
              </div>

              {insights.subscriptions.top3.length > 0 && (
                <>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800" />
                  <div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Top 3</div>
                    <div className="space-y-2">
                      {insights.subscriptions.top3.map((sub, i) => (
                        <div key={i} className="flex justify-between items-baseline">
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {sub.name}
                          </span>
                          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            ${sub.monthlyCost.toLocaleString()}/mes
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        )}

        {/* Sin datos */}
        {!insights.weeklyDelta &&
          insights.topCategories7d.length === 0 &&
          insights.topCategories30d.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No hay suficientes datos para mostrar insights.
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2">
                Registra algunos gastos para ver análisis.
              </p>
            </Card>
          )}
      </div>
    </div>
  )
}
