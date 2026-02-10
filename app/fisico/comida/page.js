'use client'

import { useState, useEffect } from 'react'
import {
  Sunrise, Sun, Coffee, Moon, Apple, UtensilsCrossed, Sandwich,
  Plus, X, Pencil, Trash2, MoreVertical
} from 'lucide-react'
import { formatDateTime } from '@/lib/format-utils'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

const MEALS_KEY = 'gaston_meals'

function getMeals() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(MEALS_KEY)
  return data ? JSON.parse(data) : []
}

function saveMeals(meals) {
  if (typeof window === 'undefined') return
  localStorage.setItem(MEALS_KEY, JSON.stringify(meals))
}

const MEAL_TYPES = [
  { value: 'desayuno', label: 'Desayuno', icon: Sunrise },
  { value: 'almuerzo', label: 'Almuerzo', icon: Sun },
  { value: 'merienda', label: 'Merienda', icon: Coffee },
  { value: 'cena', label: 'Cena', icon: Moon },
  { value: 'snack', label: 'Snack', icon: Apple }
]

const MEAL_COLORS = {
  desayuno: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
  almuerzo: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
  merienda: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  cena: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800',
  snack: 'text-green-500 bg-green-100 dark:bg-green-900/30'
}

export default function ComidaPage() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingMeal, setEditingMeal] = useState(null)
  const [contextMenuId, setContextMenuId] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'desayuno', notes: '' })

  useEffect(() => {
    const saved = getMeals()
    setMeals(saved.sort((a, b) => new Date(b.date) - new Date(a.date)))
    setLoading(false)
  }, [])

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuId) setContextMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenuId])

  const resetForm = () => setForm({ name: '', type: 'desayuno', notes: '' })

  const handleOpenCreate = () => {
    setEditingMeal(null)
    resetForm()
    setShowModal(true)
  }

  const handleOpenEdit = (meal) => {
    setEditingMeal(meal)
    setForm({ name: meal.name, type: meal.type, notes: meal.notes || '' })
    setShowModal(true)
    setContextMenuId(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingMeal(null)
    resetForm()
  }

  function handleSave() {
    if (!form.name.trim()) return

    let updated
    if (editingMeal) {
      updated = meals.map(m =>
        m.id === editingMeal.id
          ? { ...m, name: form.name.trim(), type: form.type, notes: form.notes.trim() }
          : m
      )
    } else {
      const meal = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: form.name.trim(),
        type: form.type,
        notes: form.notes.trim(),
        date: new Date().toISOString()
      }
      updated = [meal, ...meals]
    }

    saveMeals(updated)
    setMeals(updated)
    handleCloseModal()
  }

  function handleDelete(id) {
    if (!confirm('¿Eliminar esta comida?')) return
    const updated = meals.filter(m => m.id !== id)
    saveMeals(updated)
    setMeals(updated)
    setContextMenuId(null)
  }

  const MealIcon = ({ type, className = 'w-5 h-5' }) => {
    const found = MEAL_TYPES.find(t => t.value === type)
    const Icon = found ? found.icon : UtensilsCrossed
    return <Icon className={className} />
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Comida" backHref="/fisico" />
        <div className="flex-1 px-4 py-4 space-y-4">
          <div className="h-20 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 animate-pulse" />
          <div className="h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Comida" backHref="/fisico" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Info */}
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 border-amber-200/60 dark:border-amber-800/50">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-200 dark:bg-amber-900/40 flex items-center justify-center">
              <Sandwich className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Registro de comidas</h3>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Llevá un registro simple de lo que comés durante el día.
          </p>
        </Card>

        {/* Add Button */}
        <button
          onClick={handleOpenCreate}
          className="w-full p-3.5 rounded-2xl bg-amber-500 dark:bg-amber-600 text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-[0_2px_8px_rgba(245,158,11,0.2)] flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Registrar comida
        </button>

        {/* Meals List */}
        {meals.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <UtensilsCrossed className="w-7 h-7 text-amber-500" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin comidas registradas
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Empezá a registrar tus comidas para llevar un seguimiento
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {meals.map((meal) => (
              <Card key={meal.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${MEAL_COLORS[meal.type] || 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'}`}>
                    <MealIcon type={meal.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {meal.name}
                    </h4>
                    <span className="inline-block text-xs text-zinc-600 dark:text-zinc-400 capitalize">
                      {meal.type}
                    </span>
                    {meal.notes && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {meal.notes}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                      {formatDateTime(meal.date)}
                    </p>
                  </div>

                  {/* Context menu */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setContextMenuId(contextMenuId === meal.id ? null : meal.id)
                      }}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                    </button>
                    {contextMenuId === meal.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 z-10 overflow-hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEdit(meal)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(meal.id)
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
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end justify-center" onClick={handleCloseModal}>
          <div
            className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {editingMeal ? 'Editar comida' : 'Registrar comida'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all duration-200"
                  placeholder="Ej: Ensalada con pollo"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all duration-200"
                >
                  {MEAL_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Notas <span className="text-zinc-400 dark:text-zinc-500 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all duration-200"
                  rows={2}
                  placeholder="Notas adicionales..."
                />
              </div>

              <button
                onClick={handleSave}
                disabled={!form.name.trim()}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all active:scale-[0.98] shadow-[0_2px_8px_rgba(245,158,11,0.2)]"
              >
                {editingMeal ? 'Guardar cambios' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
