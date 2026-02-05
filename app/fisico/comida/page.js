'use client'

import { useState, useEffect } from 'react'
import { initDB } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

// localStorage key for meal entries
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

export default function ComidaPage() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMeal, setNewMeal] = useState({
    name: '',
    type: 'desayuno',
    notes: ''
  })

  useEffect(() => {
    loadMeals()
  }, [])

  async function loadMeals() {
    try {
      await initDB()
      const savedMeals = getMeals()
      setMeals(savedMeals.sort((a, b) => new Date(b.date) - new Date(a.date)))
    } catch (error) {
      console.error('Error loading meals:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleAddMeal() {
    const meal = {
      id: Date.now().toString(),
      ...newMeal,
      date: new Date().toISOString()
    }

    const updated = [meal, ...meals]
    saveMeals(updated)
    setMeals(updated)
    setShowAddModal(false)
    setNewMeal({ name: '', type: 'desayuno', notes: '' })
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMealTypeEmoji = (type) => {
    const emojis = {
      desayuno: '🌅',
      almuerzo: '☀️',
      merienda: '☕',
      cena: '🌙',
      snack: '🍎'
    }
    return emojis[type] || '🍽️'
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Comida" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Comida" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Info Card */}
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🍔</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Registro Manual</h3>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Estructura preparada para futuras funcionalidades: carritos por dieta, comparación calidad-precio, valoraciones
          </p>
        </Card>

        {/* Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-colors"
        >
          + Registrar comida
        </button>

        {/* Meals List */}
        {meals.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">🍽️</div>
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
                  <span className="text-2xl">{getMealTypeEmoji(meal.type)}</span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {meal.name}
                    </h4>
                    <span className="inline-block text-xs text-zinc-600 dark:text-zinc-400 capitalize">
                      {meal.type}
                    </span>
                    {meal.notes && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                        {meal.notes}
                      </p>
                    )}
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      {formatDate(meal.date)}
                    </p>
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
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Registrar comida</h3>
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
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newMeal.name}
                  onChange={(e) => setNewMeal({ ...newMeal, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  placeholder="Ej: Ensalada con pollo"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Tipo</label>
                <select
                  value={newMeal.type}
                  onChange={(e) => setNewMeal({ ...newMeal, type: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                >
                  <option value="desayuno">Desayuno</option>
                  <option value="almuerzo">Almuerzo</option>
                  <option value="merienda">Merienda</option>
                  <option value="cena">Cena</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Notas (opcional)</label>
                <textarea
                  value={newMeal.notes}
                  onChange={(e) => setNewMeal({ ...newMeal, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  rows={2}
                  placeholder="Notas adicionales..."
                />
              </div>

              <button
                onClick={handleAddMeal}
                disabled={!newMeal.name.trim()}
                className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
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
