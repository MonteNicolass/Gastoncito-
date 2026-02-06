'use client'

import { useState, useEffect } from 'react'
import { initDB, addLifeEntry, getLifeEntries } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { BookOpen, GraduationCap } from 'lucide-react'

export default function AprendizajePage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSession, setNewSession] = useState({
    topic: '',
    hours: '',
    notes: ''
  })

  useEffect(() => {
    loadSessions()
  }, [])

  async function loadSessions() {
    try {
      await initDB()
      const lifeEntries = await getLifeEntries()
      const studySessions = lifeEntries
        .filter(e => e.domain === 'study')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setSessions(studySessions)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSession() {
    try {
      const hours = parseFloat(newSession.hours) || 0

      await addLifeEntry({
        text: `Estudié ${newSession.topic} por ${hours}h`,
        domain: 'study',
        meta: {
          topic: newSession.topic,
          hours,
          notes: newSession.notes || ''
        }
      })

      setShowAddModal(false)
      setNewSession({ topic: '', hours: '', notes: '' })
      await loadSessions()
    } catch (error) {
      console.error('Error adding session:', error)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate stats
  const totalHours = sessions.reduce((sum, s) => sum + (s.meta?.hours || 0), 0)
  const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const sessionsLast7Days = sessions.filter(s => new Date(s.created_at) >= last7Days)
  const hoursLast7Days = sessionsLast7Days.reduce((sum, s) => sum + (s.meta?.hours || 0), 0)

  // Calculate streak
  let currentStreak = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 30; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(checkDate.getDate() - i)
    const dayStart = new Date(checkDate)
    const dayEnd = new Date(checkDate)
    dayEnd.setHours(23, 59, 59, 999)

    const hasSessionToday = sessions.some(s => {
      const sessionDate = new Date(s.created_at)
      return sessionDate >= dayStart && sessionDate <= dayEnd
    })

    if (hasSessionToday) {
      currentStreak++
    } else if (i > 0) {
      break
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Aprendizaje" backHref="/herramientas" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Aprendizaje" backHref="/herramientas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Stats Card */}
        {sessions.length > 0 && (
          <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Resumen</h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Total</div>
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {totalHours.toFixed(1)}h
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Esta semana</div>
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {hoursLast7Days.toFixed(1)}h
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">Racha</div>
                <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {currentStreak} días
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Info Card */}
        <Card className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-2">
            <GraduationCap className="w-5 h-5 text-terra-600 dark:text-terra-400" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Seguimiento de Estudio</h3>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Registrá tus sesiones de estudio. Las horas impactan en tu estado Mental.
          </p>
        </Card>

        {/* Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-sm transition-colors"
        >
          + Registrar sesión
        </button>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-zinc-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin sesiones registradas
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Empezá a trackear tu tiempo de estudio
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Card key={session.id} className="p-3">
                <div className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-zinc-500 dark:text-zinc-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {session.meta?.topic || 'Sin tema'}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      <span>{session.meta?.hours || 0}h</span>
                      <span>•</span>
                      <span>{formatDate(session.created_at)}</span>
                    </div>
                    {session.meta?.notes && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                        {session.meta.notes}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end" onClick={() => setShowAddModal(false)}>
          <div
            className="w-full max-w-[420px] mx-auto bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Registrar sesión</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Tema</label>
                <input
                  type="text"
                  value={newSession.topic}
                  onChange={(e) => setNewSession({ ...newSession, topic: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  placeholder="Ej: JavaScript, React, etc."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Horas</label>
                <input
                  type="number"
                  step="0.5"
                  value={newSession.hours}
                  onChange={(e) => setNewSession({ ...newSession, hours: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  placeholder="Ej: 2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Notas (opcional)</label>
                <textarea
                  value={newSession.notes}
                  onChange={(e) => setNewSession({ ...newSession, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  rows={2}
                  placeholder="Qué aprendiste..."
                />
              </div>

              <button
                onClick={handleAddSession}
                disabled={!newSession.topic.trim() || !newSession.hours}
                className="w-full py-3 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white dark:text-zinc-900 font-semibold text-sm transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
