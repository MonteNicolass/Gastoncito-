'use client'

import { useState, useEffect } from 'react'
import { initDB, getLifeEntriesByDomain, addLifeEntry, deleteLifeEntry } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function HabitosPage() {
  const [habits, setHabits] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [habitText, setHabitText] = useState('')

  useEffect(() => {
    initDB().then(loadHabits)
  }, [])

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

  const handleOpenModal = () => {
    setShowModal(true)
    setHabitText('')
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setHabitText('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!habitText.trim()) return

    await addLifeEntry({
      text: habitText.trim(),
      domain: 'physical',
      meta: {}
    })

    setShowModal(false)
    setHabitText('')
    await loadHabits()
  }

  const handleDelete = async (id, text) => {
    if (!confirm(`¿Eliminar el hábito "${text}"?`)) return
    await deleteLifeEntry(id)
    await loadHabits()
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Hábitos" backHref="/fisico" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Add Button */}
        <Button
          onClick={handleOpenModal}
          variant="primary"
          className="w-full"
          data-testid="add-habit-btn"
        >
          Registrar hábito
        </Button>

        {/* Habits List */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis hábitos
          </h2>
          {habits.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No hay hábitos registrados.
              </p>
            </Card>
          ) : (
            habits.map((habit) => (
              <Card
                key={habit.id}
                className="p-4"
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
                  <Button
                    onClick={() => handleDelete(habit.id, habit.text)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 flex-shrink-0"
                  >
                    Eliminar
                  </Button>
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
                  Nuevo hábito
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
                  Agregar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
