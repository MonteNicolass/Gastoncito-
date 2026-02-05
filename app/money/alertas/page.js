'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getMovimientos, getCategorias, getSubscriptions, addSubscription } from '@/lib/storage'
import { getAllAlerts } from '@/lib/alerts'
import { detectRecurringMovements, isSubscriptionAlreadyExists, formatCadence } from '@/lib/subscription-detector'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function AlertasPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState([])
  const [detectedSubscriptions, setDetectedSubscriptions] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [existingSubscriptions, setExistingSubscriptions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await initDB()

      const [movs, cats, subs] = await Promise.all([
        getMovimientos(),
        getCategorias(),
        getSubscriptions()
      ])

      setMovimientos(movs)
      setCategorias(cats)
      setExistingSubscriptions(subs)

      // Detectar alertas
      const detectedAlerts = getAllAlerts(movs, cats)
      setAlerts(detectedAlerts)

      // Detectar suscripciones
      const detected = detectRecurringMovements(movs, 3)
      // Filtrar las que ya existen
      const newDetected = detected.filter(sub => !isSubscriptionAlreadyExists(sub, subs))
      setDetectedSubscriptions(newDetected)
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubscription = async (detectedSub) => {
    try {
      // Calcular próxima fecha de cobro (aproximadamente)
      const lastDate = new Date(detectedSub.lastDate)
      const nextDate = new Date(lastDate)
      nextDate.setMonth(nextDate.getMonth() + detectedSub.cadenceMonths)

      await addSubscription({
        name: detectedSub.merchant,
        amount: detectedSub.amount,
        cadence_months: detectedSub.cadenceMonths,
        next_charge_date: nextDate.toISOString(),
        active: true
      })

      // Recargar datos
      await loadData()

      // Mostrar confirmación
      alert('Suscripción creada exitosamente')
    } catch (error) {
      console.error('Error creando suscripción:', error)
      alert('Error al crear suscripción')
    }
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getSeverityColors = (severity) => {
    switch (severity) {
      case 'high':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-900 dark:text-red-100',
          badge: 'bg-red-500'
        }
      case 'medium':
        return {
          bg: 'bg-yellow-50 dark:bg-yellow-900/20',
          border: 'border-yellow-200 dark:border-yellow-800',
          text: 'text-yellow-900 dark:text-yellow-100',
          badge: 'bg-yellow-500'
        }
      case 'low':
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-100',
          badge: 'bg-blue-500'
        }
      default:
        return {
          bg: 'bg-zinc-50 dark:bg-zinc-800',
          border: 'border-zinc-200 dark:border-zinc-700',
          text: 'text-zinc-900 dark:text-zinc-100',
          badge: 'bg-zinc-500'
        }
    }
  }

  const getAlertIcon = (type) => {
    switch (type) {
      case 'high_spending':
        return '💸'
      case 'frequent_tx':
        return '⚡'
      case 'budget_exceeded':
        return '📊'
      default:
        return '⚠️'
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Alertas" backHref="/money" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Alertas" backHref="/money" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Alertas activas */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Alertas activas
          </h2>

          {alerts.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Todo en orden
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No hay alertas activas en este momento
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => {
                const colors = getSeverityColors(alert.severity)
                return (
                  <Card
                    key={index}
                    className={`p-4 ${colors.bg} ${colors.border} border`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl flex-shrink-0">
                        {getAlertIcon(alert.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-base font-semibold ${colors.text}`}>
                            {alert.title}
                          </h3>
                          <div className={`w-2 h-2 rounded-full ${colors.badge}`} />
                        </div>
                        <p className={`text-sm ${colors.text} opacity-90`}>
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Suscripciones detectadas */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Suscripciones detectadas
            </h2>
            {detectedSubscriptions.length > 0 && (
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {detectedSubscriptions.length} encontradas
              </span>
            )}
          </div>

          {detectedSubscriptions.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Sin suscripciones nuevas
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No se detectaron movimientos recurrentes que puedan ser suscripciones
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {detectedSubscriptions.map((sub, index) => (
                <Card
                  key={index}
                  className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {sub.merchant}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {formatAmount(sub.amount)}
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            •
                          </span>
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">
                            {formatCadence(sub.cadenceMonths)}
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                          {sub.occurrences}x
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Última vez: {formatDate(sub.lastDate)}</span>
                      <span>•</span>
                      <span>{sub.monthsSpan} meses detectados</span>
                    </div>

                    <Button
                      onClick={() => handleCreateSubscription(sub)}
                      variant="primary"
                      size="sm"
                      className="w-full"
                    >
                      Crear suscripción
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Info adicional */}
        {(alerts.length > 0 || detectedSubscriptions.length > 0) && (
          <Card className="p-4 bg-zinc-50 dark:bg-zinc-800/50">
            <p className="text-xs text-zinc-600 dark:text-zinc-400 text-center">
              Las alertas se actualizan automáticamente basándose en tu actividad financiera
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
