'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getLifeEntries, getNotes } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

export default function HoyPage() {
  const [todayData, setTodayData] = useState({
    movimientos: [],
    mentalEntries: [],
    physicalEntries: [],
    notes: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTodayData()
  }, [])

  async function loadTodayData() {
    try {
      await initDB()

      const today = new Date().toISOString().slice(0, 10)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      // Get today's movimientos
      const allMovimientos = await getMovimientos()
      const todayMovimientos = allMovimientos.filter(m => m.fecha === today)

      // Get today's life entries
      const allEntries = await getLifeEntries()
      const todayEntries = allEntries.filter(e => {
        const entryDate = new Date(e.created_at)
        return entryDate >= todayStart
      })

      // Get today's notes
      const allNotes = await getNotes()
      const todayNotes = allNotes.filter(n => {
        const noteDate = new Date(n.created_at)
        return noteDate >= todayStart
      })

      setTodayData({
        movimientos: todayMovimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)),
        mentalEntries: todayEntries.filter(e => e.domain === 'mental'),
        physicalEntries: todayEntries.filter(e => e.domain === 'physical'),
        notes: todayNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      })
    } catch (error) {
      console.error('Error loading today data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalGastos = todayData.movimientos
    .filter(m => m.tipo === 'gasto')
    .reduce((sum, m) => sum + m.monto, 0)

  const totalIngresos = todayData.movimientos
    .filter(m => m.tipo === 'ingreso')
    .reduce((sum, m) => sum + m.monto, 0)

  const mentalAvg = todayData.mentalEntries.length > 0
    ? (todayData.mentalEntries.reduce((sum, e) => sum + (e.meta?.mood_score || 0), 0) / todayData.mentalEntries.length).toFixed(1)
    : null

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Hoy" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  const hasData = todayData.movimientos.length > 0 ||
                  todayData.mentalEntries.length > 0 ||
                  todayData.physicalEntries.length > 0 ||
                  todayData.notes.length > 0

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Hoy" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {!hasData ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Nada registrado hoy aún
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Empezá registrando algo en Chat
            </p>
          </Card>
        ) : (
          <>
            {/* Money */}
            {todayData.movimientos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    💰 Money
                  </h3>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {todayData.movimientos.length} movimientos
                  </div>
                </div>

                <Card className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400">Gastos</div>
                      <div className="text-lg font-bold text-red-600 dark:text-red-400">
                        {formatAmount(totalGastos)}
                      </div>
                    </div>
                    {totalIngresos > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-zinc-600 dark:text-zinc-400">Ingresos</div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatAmount(totalIngresos)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-2">
                    {todayData.movimientos.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="text-zinc-900 dark:text-zinc-100 truncate">
                            {m.motivo || m.metodo}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatTime(m.fecha)} · {m.metodo}
                          </div>
                        </div>
                        <div className={`font-semibold ${m.tipo === 'gasto' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                          {m.tipo === 'gasto' ? '-' : '+'}{formatAmount(m.monto)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Mental */}
            {todayData.mentalEntries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    🧠 Mental
                  </h3>
                  {mentalAvg && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Promedio: {mentalAvg}/10
                    </div>
                  )}
                </div>

                <Card className="p-3 space-y-2">
                  {todayData.mentalEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {entry.text && (
                          <div className="text-sm text-zinc-900 dark:text-zinc-100 mb-1">
                            {entry.text}
                          </div>
                        )}
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatTime(entry.created_at)}
                        </div>
                      </div>
                      {entry.meta?.mood_score && (
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 ml-3">
                          {entry.meta.mood_score}
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Físico */}
            {todayData.physicalEntries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    💪 Físico
                  </h3>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {todayData.physicalEntries.length} hábitos
                  </div>
                </div>

                <Card className="p-3 space-y-2">
                  {todayData.physicalEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-zinc-900 dark:text-zinc-100">
                          {entry.text}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatTime(entry.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}

            {/* Notas */}
            {todayData.notes.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    📝 Notas
                  </h3>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {todayData.notes.length} notas
                  </div>
                </div>

                <Card className="p-3 space-y-2">
                  {todayData.notes.map((note) => (
                    <div key={note.id}>
                      {note.type && (
                        <div className="mb-1">
                          <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
                            {note.type}
                          </span>
                        </div>
                      )}
                      <div className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap">
                        {note.text}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {formatTime(note.created_at)}
                      </div>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
