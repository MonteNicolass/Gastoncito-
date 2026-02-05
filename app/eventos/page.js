'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals } from '@/lib/storage'
import { detectAllAnomalies } from '@/lib/anomaly-detection'
import { evaluateUserRules } from '@/lib/user-rules'
import { detectAllEvents } from '@/lib/events-detection'
import { getAllSilentAlerts } from '@/lib/silent-alerts'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { ClipboardList } from 'lucide-react'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function EventosPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState([])
  const [filterDomain, setFilterDomain] = useState('all')

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const categorias = await getCategorias()
      const goals = await getGoals()
      const budgets = getBudgetsFromLocalStorage()

      // Recolectar todos los eventos
      const anomalies = detectAllAnomalies(movimientos, lifeEntries, categorias, goals)
      const ruleAlerts = evaluateUserRules(movimientos, lifeEntries, budgets)
      const milestones = detectAllEvents(movimientos, lifeEntries, goals)
      const silentAlerts = getAllSilentAlerts(movimientos, lifeEntries, budgets, categorias)

      // Combinar y agregar timestamp
      const allEvents = [
        ...anomalies.map(e => ({ ...e, category: 'anomaly', timestamp: new Date() })),
        ...ruleAlerts.map(e => ({ ...e, category: 'rule', timestamp: new Date() })),
        ...milestones.map(e => ({ ...e, category: 'milestone', timestamp: e.date || new Date() })),
        ...silentAlerts.map(e => ({ ...e, category: 'alert', timestamp: new Date() }))
      ]

      // Ordenar por fecha (más reciente primero)
      const sorted = allEvents.sort((a, b) => b.timestamp - a.timestamp)

      setEvents(sorted)
    } catch (error) {
      console.error('Error loading events:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEvents = filterDomain === 'all'
    ? events
    : events.filter(e => {
        if (filterDomain === 'money') {
          return e.type?.includes('spending') || e.type?.includes('budget') || e.type?.includes('category')
        } else if (filterDomain === 'mental') {
          return e.type?.includes('mental') || e.type?.includes('mood')
        } else if (filterDomain === 'physical') {
          return e.type?.includes('physical') || e.type?.includes('exercise') || e.type?.includes('streak')
        } else if (filterDomain === 'goals') {
          return e.type?.includes('goal') || e.type?.includes('stalled')
        }
        return true
      })

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'anomaly': return { label: 'Anomalía', color: 'red' }
      case 'rule': return { label: 'Regla', color: 'blue' }
      case 'milestone': return { label: 'Hito', color: 'green' }
      case 'alert': return { label: 'Alerta', color: 'orange' }
      default: return { label: 'Evento', color: 'zinc' }
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Eventos" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Eventos" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Filtros */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setFilterDomain('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              filterDomain === 'all'
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Todos ({events.length})
          </button>
          <button
            onClick={() => setFilterDomain('money')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              filterDomain === 'money'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            }`}
          >
            💰 Money
          </button>
          <button
            onClick={() => setFilterDomain('mental')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              filterDomain === 'mental'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
            }`}
          >
            🧠 Mental
          </button>
          <button
            onClick={() => setFilterDomain('physical')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              filterDomain === 'physical'
                ? 'bg-orange-600 text-white'
                : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
            }`}
          >
            💪 Físico
          </button>
          <button
            onClick={() => setFilterDomain('goals')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              filterDomain === 'goals'
                ? 'bg-blue-600 text-white'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
            }`}
          >
            🎯 Objetivos
          </button>
        </div>

        {/* Lista de eventos */}
        {filteredEvents.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <ClipboardList className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin eventos en este filtro
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Cuando se detecten patrones o anomalías, van a aparecer acá
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event, i) => {
              const categoryInfo = getCategoryLabel(event.category)

              return (
                <Card
                  key={i}
                  className={`p-3 ${
                    event.severity === 'high'
                      ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                      : event.severity === 'medium'
                      ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                      : event.category === 'milestone'
                      ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                      : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-${categoryInfo.color}-100 dark:bg-${categoryInfo.color}-900/30 text-${categoryInfo.color}-700 dark:text-${categoryInfo.color}-300`}>
                          {categoryInfo.label}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatDate(event.timestamp)}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {event.title}
                      </div>
                      {event.message && (
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {event.message}
                        </div>
                      )}
                      {event.description && (
                        <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                          {event.description}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
