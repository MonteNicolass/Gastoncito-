'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, PersonStanding } from 'lucide-react'
import { initDB, getLifeEntriesByDomain, addLifeEntry, deleteLifeEntry, updateLifeEntry } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function HabitosPage() {
  const [habits, setHabits] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [contextMenuId, setContextMenuId] = useState(null)
  const [habitText, setHabitText] = useState('')

  useEffect(() => {
    initDB().then(loadHabits)
  }, [])

  // Cerrar menú contextual al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuId) setContextMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenuId])

  const loadHabits = async () => {
    const data = await getLifeEntriesByDomain('physical')
    // Sort by created_at DESC (newest first)
    const sorted = data.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )
    setHabits(sorted)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleOpenCreate = () => {
    setEditingHabit(null)
    setShowModal(true)
    setHabitText('')
  }

  const handleOpenEdit = (habit) => {
    setEditingHabit(habit)
    setHabitText(habit.text)
    setShowModal(true)
    setContextMenuId(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingHabit(null)
    setHabitText('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!habitText.trim()) return

    if (editingHabit) {
      await updateLifeEntry(editingHabit.id, {
        text: habitText.trim(),
        domain: 'physical',
        meta: editingHabit.meta || {}
      })
    } else {
      await addLifeEntry({
        text: habitText.trim(),
        domain: 'physical',
        meta: {}
      })
    }

    setShowModal(false)
    setHabitText('')
    await loadHabits()
  }

  const handleDelete = async (id, text) => {
    if (!confirm(`¿Eliminar el hábito "${text}"?`)) return
    await deleteLifeEntry(id)
    await loadHabits()
    setContextMenuId(null)
  }

  // Sugerencias rápidas
  const quickSuggestions = ['Corrí', 'Caminé', 'Gym', 'Yoga', 'Bici', 'Natación']

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Actividad física" backHref="/fisico" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* Botón principal - estilo crecimiento personal */}
        <button
          onClick={handleOpenCreate}
          className="w-full p-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
          data-testid="add-habit-btn"
        >
          <div className="flex items-center justify-center gap-2 text-white">
            <Dumbbell className="w-5 h-5" />
            <span className="font-semibold">Registrar actividad</span>
          </div>
        </button>

        {/* Lista */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 px-1">
            Mi actividad física
          </h2>
          {habits.length === 0 ? (
            <Card className="p-8 text-center bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-800/50">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <PersonStanding className="w-7 h-7 text-orange-500" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Empezá a moverte
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Registrá tu actividad física para ver tu progreso
              </p>
            </Card>
          ) : (
            habits.map((habit) => (
              <Card
                key={habit.id}
                className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                data-testid="habit-item"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-0.5">
                      {habit.text}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(habit.created_at)}
                    </div>
                  </div>

                  {/* Menú contextual */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setContextMenuId(contextMenuId === habit.id ? null : habit.id)
                      }}
                      className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                    >
                      <svg className="w-4 h-4 text-zinc-500 dark:text-zinc-400" fill="currentColor" viewBox="0 0 16 16">
                        <circle cx="8" cy="3" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="8" cy="13" r="1.5"/>
                      </svg>
                    </button>
                    {contextMenuId === habit.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 z-10 overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(habit)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(habit.id, habit.text)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-xl animate-slide-up">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {editingHabit ? 'Editar actividad' : 'Nueva actividad'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Sugerencias rápidas */}
              {!editingHabit && (
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setHabitText(suggestion)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        habitText === suggestion
                          ? 'bg-orange-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <Input
                label="Descripción"
                type="text"
                placeholder="Ej: Corrí 5km, Hice yoga, etc."
                value={habitText}
                onChange={(e) => setHabitText(e.target.value)}
                data-testid="habit-text-input"
                required
              />

              <button
                type="submit"
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-orange-500/20"
                data-testid="habit-submit-btn"
              >
                {editingHabit ? 'Guardar cambios' : 'Registrar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
