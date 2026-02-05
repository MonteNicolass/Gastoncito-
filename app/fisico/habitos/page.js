'use client'

import { useState, useEffect } from 'react'
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

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Hábitos" backHref="/fisico" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Add Button */}
        <Button
          onClick={handleOpenCreate}
          variant="primary"
          className="w-full"
          data-testid="add-habit-btn"
        >
          Registrar hábito
        </Button>

        {/* Habits List */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis hábitos físicos
          </h2>
          {habits.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">💪</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Sin hábitos aún
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Registrá tu primer hábito para empezar a trackear tu actividad
              </p>
            </Card>
          ) : (
            habits.map((habit) => (
              <Card
                key={habit.id}
                className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                data-testid="habit-item"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-base text-zinc-900 dark:text-zinc-100 mb-1">
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
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                    >
                      <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 16 16">
                        <circle cx="8" cy="3" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="8" cy="13" r="1.5"/>
                      </svg>
                    </button>
                    {contextMenuId === habit.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(habit)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-t-lg"
                        >
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(habit.id, habit.text)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                        >
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
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {editingHabit ? 'Editar hábito' : 'Nuevo hábito'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <Input
                label="Descripción"
                type="text"
                placeholder="Ej: Corrí 5km, Hice yoga, etc."
                value={habitText}
                onChange={(e) => setHabitText(e.target.value)}
                data-testid="habit-text-input"
                required
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  data-testid="habit-submit-btn"
                >
                  {editingHabit ? 'Guardar cambios' : 'Agregar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
