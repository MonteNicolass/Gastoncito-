'use client'

import { useState, useEffect } from 'react'
import { Sunrise, Sun, Coffee, Moon, Apple, UtensilsCrossed, Sandwich } from 'lucide-react'
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

  const MealTypeIcon = ({ type, className = "w-6 h-6" }) => {
    const iconProps = { className }
    switch (type) {
      case 'desayuno': return <Sunrise {...iconProps} />
      case 'almuerzo': return <Sun {...iconProps} />
      case 'merienda': return <Coffee {...iconProps} />
      case 'cena': return <Moon {...iconProps} />
      case 'snack': return <Apple {...iconProps} />
      default: return <UtensilsCrossed {...iconProps} />
    }
  }

  const getMealTypeColor = (type) => {
    const colors = {
      desayuno: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
      almuerzo: 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30',
      merienda: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
      cena: 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800',
      snack: 'text-green-500 bg-green-100 dark:bg-green-900/30'
    }
    return colors[type] || 'text-zinc-500 bg-zinc-100 dark:bg-zinc-800'
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
      <TopBar title="Comida" backHref="/fisico" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Info Card */}
        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-200 dark:bg-amber-900/40 flex items-center justify-center">
              <Sandwich className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
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
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <UtensilsCrossed className="w-7 h-7 text-orange-500" />
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
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getMealTypeColor(meal.type)}`}>
                    <MealTypeIcon type={meal.type} className="w-5 h-5" />
                  </div>
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
