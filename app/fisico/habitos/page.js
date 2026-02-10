'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, PersonStanding, Pencil, Trash2, X, MoreVertical, Timer } from 'lucide-react'
import { initDB, getLifeEntriesByDomain, addLifeEntry, deleteLifeEntry, updateLifeEntry } from '@/lib/storage'
import { formatDate } from '@/lib/format-utils'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'

const ACTIVITY_TYPES = [
  { value: '', label: 'Sin especificar' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'fuerza', label: 'Fuerza' },
  { value: 'flexibilidad', label: 'Flexibilidad' },
  { value: 'otro', label: 'Otro' }
]

const INTENSITIES = [
  { value: '', label: 'Sin especificar' },
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' }
]

const INTENSITY_COLORS = {
  baja: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
  media: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  alta: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
}

const TYPE_LABELS = { cardio: 'Cardio', fuerza: 'Fuerza', flexibilidad: 'Flex', otro: 'Otro' }

export default function HabitosPage() {
  const [habits, setHabits] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingHabit, setEditingHabit] = useState(null)
  const [contextMenuId, setContextMenuId] = useState(null)
  const [habitText, setHabitText] = useState('')
  const [activityType, setActivityType] = useState('')
  const [durationMin, setDurationMin] = useState('')
  const [intensity, setIntensity] = useState('')

  useEffect(() => {
    initDB().then(loadHabits)
  }, [])

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuId) setContextMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenuId])

  const loadHabits = async () => {
    const data = await getLifeEntriesByDomain('physical')
    const sorted = data.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )
    setHabits(sorted)
  }

  const resetForm = () => {
    setHabitText('')
    setActivityType('')
    setDurationMin('')
    setIntensity('')
  }

  const handleOpenCreate = () => {
    setEditingHabit(null)
    resetForm()
    setShowModal(true)
  }

  const handleOpenEdit = (habit) => {
    setEditingHabit(habit)
    setHabitText(habit.text)
    setActivityType(habit.meta?.activity_type || '')
    setDurationMin(habit.meta?.duration_min?.toString() || '')
    setIntensity(habit.meta?.intensity || '')
    setShowModal(true)
    setContextMenuId(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingHabit(null)
    resetForm()
  }

  const buildMeta = (existing) => {
    const meta = { ...(existing || {}) }
    if (activityType) meta.activity_type = activityType
    else delete meta.activity_type
    if (durationMin && parseInt(durationMin) > 0) meta.duration_min = parseInt(durationMin)
    else delete meta.duration_min
    if (intensity) meta.intensity = intensity
    else delete meta.intensity
    return meta
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!habitText.trim()) return

    if (editingHabit) {
      await updateLifeEntry(editingHabit.id, {
        text: habitText.trim(),
        domain: 'physical',
        meta: buildMeta(editingHabit.meta)
      })
    } else {
      await addLifeEntry({
        text: habitText.trim(),
        domain: 'physical',
        meta: buildMeta()
      })
    }

    handleCloseModal()
    await loadHabits()
  }

  const handleDelete = async (id, text) => {
    if (!confirm(`¿Eliminar "${text}"?`)) return
    await deleteLifeEntry(id)
    await loadHabits()
    setContextMenuId(null)
  }

  const quickSuggestions = ['Corrí', 'Caminé', 'Gym', 'Yoga', 'Bici', 'Natación']

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Actividad física" backHref="/fisico" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* CTA */}
        <button
          onClick={handleOpenCreate}
          className="w-full p-4 rounded-2xl bg-amber-500 dark:bg-amber-600 transition-all active:scale-[0.98] shadow-[0_2px_8px_rgba(245,158,11,0.2)]"
        >
          <div className="flex items-center justify-center gap-2 text-white">
            <Dumbbell className="w-5 h-5" strokeWidth={1.75} />
            <span className="font-semibold text-sm">Registrar actividad</span>
          </div>
        </button>

        {/* List */}
        <div className="space-y-3">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 px-1">
            Mi actividad física
          </h2>
          {habits.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <PersonStanding className="w-7 h-7 text-amber-500" />
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
              <Card key={habit.id} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Dumbbell className="w-5 h-5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-0.5">
                      {habit.text}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatDate(habit.created_at)}
                      </span>
                      {habit.meta?.activity_type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {TYPE_LABELS[habit.meta.activity_type] || habit.meta.activity_type}
                        </span>
                      )}
                      {habit.meta?.duration_min && (
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 flex items-center gap-0.5">
                          <Timer className="w-2.5 h-2.5" />
                          {habit.meta.duration_min} min
                        </span>
                      )}
                      {habit.meta?.intensity && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${INTENSITY_COLORS[habit.meta.intensity] || ''}`}>
                          {habit.meta.intensity.charAt(0).toUpperCase() + habit.meta.intensity.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Context menu */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setContextMenuId(contextMenuId === habit.id ? null : habit.id)
                      }}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
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
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(habit.id, habit.text)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
                  <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Quick suggestions */}
              {!editingHabit && (
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setHabitText(suggestion)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        habitText === suggestion
                          ? 'bg-amber-500 text-white'
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
                required
              />

              {/* Activity type */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Tipo <span className="text-zinc-400 dark:text-zinc-500 font-normal">(opcional)</span>
                </label>
                <select
                  value={activityType}
                  onChange={(e) => setActivityType(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all duration-200"
                >
                  {ACTIVITY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Duration + Intensity row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Duración <span className="text-zinc-400 dark:text-zinc-500 font-normal text-xs">(min)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    placeholder="30"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all duration-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Intensidad
                  </label>
                  <select
                    value={intensity}
                    onChange={(e) => setIntensity(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all duration-200"
                  >
                    {INTENSITIES.map(i => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-[0_2px_8px_rgba(245,158,11,0.2)]"
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
