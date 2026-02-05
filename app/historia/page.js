'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals, getNotes } from '@/lib/storage'
import { getAllHistorySummaries } from '@/lib/historia-insights'
import { calculateGlobalScore, getScoreLabel, getScoreColor } from '@/lib/global-score'
import { detectAllEvents } from '@/lib/events-detection'
import { exportWeekJSON, exportMonthJSON, exportAllJSON, exportWeekCSV, exportMonthCSV, exportAllCSV } from '@/lib/export-utils'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function HistoriaPage() {
  const [loading, setLoading] = useState(true)
  const [historySummaries, setHistorySummaries] = useState(null)
  const [globalScore, setGlobalScore] = useState(null)
  const [events, setEvents] = useState([])
  const [allData, setAllData] = useState({})

  useEffect(() => {
    loadHistoria()
  }, [])

  async function loadHistoria() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const categorias = await getCategorias()
      const goals = await getGoals()
      const notes = await getNotes()
      const budgets = getBudgetsFromLocalStorage()

      const summaries = getAllHistorySummaries(movimientos, lifeEntries, categorias)
      const score = calculateGlobalScore(movimientos, lifeEntries, goals, budgets)
      const detectedEvents = detectAllEvents(movimientos, lifeEntries, goals)

      setHistorySummaries(summaries)
      setGlobalScore(score)
      setEvents(detectedEvents)
      setAllData({ movimientos, lifeEntries, goals, notes })
    } catch (error) {
      console.error('Error loading historia:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleExport(type, format) {
    const { movimientos, lifeEntries, goals, notes } = allData

    if (format === 'json') {
      if (type === 'week') exportWeekJSON(movimientos, lifeEntries, goals)
      else if (type === 'month') exportMonthJSON(movimientos, lifeEntries, goals)
      else if (type === 'all') exportAllJSON(movimientos, lifeEntries, goals, notes)
    } else if (format === 'csv') {
      if (type === 'week') exportWeekCSV(movimientos)
      else if (type === 'month') exportMonthCSV(movimientos)
      else if (type === 'all') exportAllCSV(movimientos)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Historia" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Historia" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Score Global */}
        {globalScore && (
          <Card className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Estado General</h3>
              <span className="text-xs text-zinc-600 dark:text-zinc-400">Score Global</span>
            </div>

            <div className="flex items-end gap-4">
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                {globalScore.global}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  {getScoreLabel(globalScore.global)}
                </div>
                <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full bg-${getScoreColor(globalScore.global)}-500`}
                    style={{ width: `${globalScore.global}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Breakdown */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-indigo-200 dark:border-indigo-800">
              <div className="text-center">
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Mental</div>
                <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                  {globalScore.breakdown.mental}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Físico</div>
                <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                  {globalScore.breakdown.physical}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Money</div>
                <div className="text-sm font-bold text-green-600 dark:text-green-400">
                  {globalScore.breakdown.money}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Objetivos</div>
                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                  {globalScore.breakdown.goals}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Eventos Importantes */}
        {events.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
              Hitos Recientes
            </h3>
            {events.map((event, i) => (
              <Card key={i} className="p-3 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-2">
                  <div className="text-2xl">🏆</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {event.title}
                    </div>
                    <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                      {event.description}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Resúmenes por período */}
        {historySummaries && (
          <>
            {/* 7 días */}
            {historySummaries.week && historySummaries.week.insights.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
                  Últimos 7 días
                </h3>
                <Card className="p-3">
                  <div className="space-y-2">
                    {historySummaries.week.insights.map((insight, i) => (
                      <div key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                        • {insight}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* 30 días */}
            {historySummaries.month && historySummaries.month.insights.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
                  Últimos 30 días
                </h3>
                <Card className="p-3">
                  <div className="space-y-2">
                    {historySummaries.month.insights.map((insight, i) => (
                      <div key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                        • {insight}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* 90 días */}
            {historySummaries.quarter && historySummaries.quarter.insights.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
                  Últimos 90 días
                </h3>
                <Card className="p-3">
                  <div className="space-y-2">
                    {historySummaries.quarter.insights.map((insight, i) => (
                      <div key={i} className="text-sm text-zinc-700 dark:text-zinc-300">
                        • {insight}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </>
        )}

        {/* Exportar */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Exportar Datos
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleExport('week', 'json')}
              className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
            >
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Semana (JSON)</div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">Últimos 7 días</div>
            </button>

            <button
              onClick={() => handleExport('month', 'json')}
              className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
            >
              <div className="text-sm font-medium text-green-900 dark:text-green-100">Mes (JSON)</div>
              <div className="text-xs text-green-700 dark:text-green-300 mt-0.5">Mes actual</div>
            </button>

            <button
              onClick={() => handleExport('week', 'csv')}
              className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-950/30 transition-colors"
            >
              <div className="text-sm font-medium text-purple-900 dark:text-purple-100">Semana (CSV)</div>
              <div className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">Solo movimientos</div>
            </button>

            <button
              onClick={() => handleExport('month', 'csv')}
              className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-950/30 transition-colors"
            >
              <div className="text-sm font-medium text-orange-900 dark:text-orange-100">Mes (CSV)</div>
              <div className="text-xs text-orange-700 dark:text-orange-300 mt-0.5">Solo movimientos</div>
            </button>
          </div>

          <button
            onClick={() => handleExport('all', 'json')}
            className="w-full p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Exportar Todo (JSON)</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Todos los datos completos</div>
          </button>
        </div>
      </div>
    </div>
  )
}
