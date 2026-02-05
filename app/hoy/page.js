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

  // Calculate daily completeness (how many areas have data)
  const getCompleteness = () => {
    let completed = 0
    if (todayData.movimientos.length > 0) completed++
    if (todayData.mentalEntries.length > 0) completed++
    if (todayData.physicalEntries.length > 0) completed++
    if (todayData.notes.length > 0) completed++
    return { completed, total: 4 }
  }

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

  const { completed, total } = getCompleteness()
  const completenessPercent = Math.round((completed / total) * 100)

  const getDayMessage = () => {
    if (completed === 0) return null
    if (completed === 4) return 'Día completo'
    if (completed >= 2) return 'Buen ritmo'
    return 'Empezando el día'
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

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 space-y-4">
        {!hasData ? (
          <Card className="p-8 text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50">
            <div className="text-5xl mb-4">🌅</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Tu día empieza acá
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
              Registrá lo que pase hoy y todo aparece acá
            </p>
            <a
              href="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all active:scale-95"
            >
              Empezar a registrar
            </a>
          </Card>
        ) : (
          <>
            {/* Daily Progress Indicator */}
            <div className="flex items-center gap-3 px-1">
              <div className="flex gap-1">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-colors ${
                      i < completed
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  />
                ))}
              </div>
              {getDayMessage() && (
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  {getDayMessage()}
                </span>
              )}
            </div>

            {/* Money */}
            {todayData.movimientos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Money
                  </h3>
                  <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full font-mono">
                    {todayData.movimientos.length}
                  </span>
                </div>

                <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 border-zinc-700">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">Gastos de hoy</div>
                      <div className="text-2xl font-bold text-white font-mono tracking-tight">
                        {formatAmount(totalGastos)}
                      </div>
                    </div>
                    {totalIngresos > 0 && (
                      <div className="text-right">
                        <div className="text-xs text-zinc-400 mb-1">Ingresos</div>
                        <div className="text-lg font-bold text-emerald-400 font-mono tracking-tight">
                          +{formatAmount(totalIngresos)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-zinc-700 pt-3">
                    {todayData.movimientos.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <div className="text-zinc-200 truncate">
                            {m.motivo || m.metodo}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {formatTime(m.fecha)} · {m.metodo}
                          </div>
                        </div>
                        <div className={`font-semibold font-mono ${m.tipo === 'gasto' ? 'text-zinc-300' : 'text-emerald-400'}`}>
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
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Mental
                  </h3>
                  {mentalAvg && (
                    <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                      {mentalAvg}/10
                    </span>
                  )}
                </div>

                <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50 space-y-3">
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
                        <div className="text-3xl font-bold bg-gradient-to-br from-purple-600 to-pink-600 bg-clip-text text-transparent ml-3">
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
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Físico
                  </h3>
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                    {todayData.physicalEntries.length} {todayData.physicalEntries.length === 1 ? 'actividad' : 'actividades'}
                  </span>
                </div>

                <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-800/50 space-y-3">
                  {todayData.physicalEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">💪</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
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
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Notas
                  </h3>
                  <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    {todayData.notes.length}
                  </span>
                </div>

                <Card className="p-4 space-y-4">
                  {todayData.notes.map((note, idx) => (
                    <div key={note.id} className={idx > 0 ? 'pt-3 border-t border-zinc-100 dark:border-zinc-800' : ''}>
                      {note.type && (
                        <div className="mb-2">
                          <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
                            {note.type}
                          </span>
                        </div>
                      )}
                      <div className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap leading-relaxed">
                        {note.text}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
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
