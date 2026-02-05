'use client'

import { useState, useEffect } from 'react'
import { initDB, getGoals, addGoal, deleteGoal, updateGoal, getMovimientos } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

// Helper para obtener presupuestos de localStorage
function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function ObjetivosPage() {
  const [goals, setGoals] = useState([])
  const [budgets, setBudgets] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [contextMenuId, setContextMenuId] = useState(null)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalProgress, setGoalProgress] = useState('')
  const [goalType, setGoalType] = useState('general')
  const [goalBudgetId, setGoalBudgetId] = useState('')

  useEffect(() => {
    initDB().then(() => {
      loadGoals()
      setBudgets(getBudgetsFromLocalStorage())
    })
  }, [])

  // Cerrar menú contextual al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuId) setContextMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenuId])

  const loadGoals = async () => {
    const data = await getGoals()
    const sorted = data.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
    setGoals(sorted)
  }

  const handleOpenCreate = () => {
    setEditingGoal(null)
    setShowModal(true)
    setGoalName('')
    setGoalTarget('')
    setGoalProgress('')
    setGoalType('general')
    setGoalBudgetId('')
  }

  const handleOpenEdit = (goal) => {
    setEditingGoal(goal)
    setGoalName(goal.name)
    setGoalTarget(goal.target.toString())
    setGoalProgress(goal.progress.toString())
    setGoalType(goal.type || 'general')
    setGoalBudgetId(goal.budget_id || '')
    setShowModal(true)
    setContextMenuId(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingGoal(null)
    setGoalName('')
    setGoalTarget('')
    setGoalProgress('')
    setGoalType('general')
    setGoalBudgetId('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!goalName.trim() || !goalTarget) return

    const goalData = {
      name: goalName.trim(),
      target: parseInt(goalTarget),
      progress: parseInt(goalProgress) || 0,
      status: editingGoal ? editingGoal.status : 'active',
      type: goalType,
      budget_id: goalType === 'money' && goalBudgetId ? goalBudgetId : null
    }

    if (editingGoal) {
      await updateGoal(editingGoal.id, goalData)
    } else {
      await addGoal({
        ...goalData,
        created_at: new Date().toISOString()
      })
    }

    setShowModal(false)
    await loadGoals()
  }

  const handleUpdateProgress = async (id, newProgress, target, status) => {
    const newStatus = newProgress >= target ? 'completed' : status
    await updateGoal(id, { progress: parseInt(newProgress), status: newStatus })
    await loadGoals()
  }

  const handleMarkCompleted = async (id) => {
    await updateGoal(id, { status: 'completed' })
    await loadGoals()
    setContextMenuId(null)
  }

  const handleMarkFailed = async (id) => {
    if (!confirm('¿Marcar como fallido?')) return
    await updateGoal(id, { status: 'failed' })
    await loadGoals()
    setContextMenuId(null)
  }

  const handleReactivate = async (id) => {
    await updateGoal(id, { status: 'active' })
    await loadGoals()
    setContextMenuId(null)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    await deleteGoal(id)
    await loadGoals()
    setContextMenuId(null)
  }

  const getProgressPercent = (goal) => {
    return Math.min(100, Math.round((goal.progress / goal.target) * 100))
  }

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          ✓ Cumplido
        </span>
      )
    }
    if (status === 'failed') {
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          ✗ Fallido
        </span>
      )
    }
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
        → Activo
      </span>
    )
  }

  const getTypeBadge = (type) => {
    if (type === 'money') {
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          💰 Económico
        </span>
      )
    }
    if (type === 'physical') {
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
          💪 Físico
        </span>
      )
    }
    if (type === 'mental') {
      return (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          🧠 Mental
        </span>
      )
    }
    return null
  }

  const getBudgetName = (budgetId) => {
    if (!budgetId) return null
    const budget = budgets.find(b => b.created_at === budgetId)
    return budget ? budget.name : null
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Objetivos" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <Button
          onClick={handleOpenCreate}
          variant="primary"
          className="w-full"
        >
          Nuevo objetivo
        </Button>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis objetivos
          </h2>
          {goals.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Sin objetivos aún
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Creá tu primer objetivo para empezar a trackear tu progreso
              </p>
            </Card>
          ) : (
            goals.map((goal) => (
              <Card key={goal.id} className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1.5">
                        {goal.name}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(goal.status)}
                        {getTypeBadge(goal.type)}
                        {goal.budget_id && (
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            → {getBudgetName(goal.budget_id)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Menú contextual */}
                    <div className="relative flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setContextMenuId(contextMenuId === goal.id ? null : goal.id)
                        }}
                        className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                      >
                        <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 16 16">
                          <circle cx="8" cy="3" r="1.5"/>
                          <circle cx="8" cy="8" r="1.5"/>
                          <circle cx="8" cy="13" r="1.5"/>
                        </svg>
                      </button>
                      {contextMenuId === goal.id && (
                        <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleOpenEdit(goal)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-t-lg"
                          >
                            Editar
                          </button>
                          {goal.status === 'active' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkCompleted(goal.id)
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-green-600 dark:text-green-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              >
                                Marcar cumplido
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarkFailed(goal.id)
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-orange-600 dark:text-orange-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                              >
                                Marcar fallido
                              </button>
                            </>
                          )}
                          {(goal.status === 'completed' || goal.status === 'failed') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReactivate(goal.id)
                              }}
                              className="w-full px-3 py-2 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                            >
                              Reactivar
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(goal.id, goal.name)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        {goal.progress} / {goal.target}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {getProgressPercent(goal)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          goal.status === 'completed'
                            ? 'bg-green-500'
                            : goal.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${getProgressPercent(goal)}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick update for active goals */}
                  {goal.status === 'active' && (
                    <div className="flex gap-2 pt-1">
                      <Input
                        type="number"
                        placeholder="Nuevo progreso"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            handleUpdateProgress(goal.id, e.target.value, goal.target, goal.status)
                            e.target.value = ''
                          }
                        }}
                      />
                    </div>
                  )}
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
                  {editingGoal ? 'Editar objetivo' : 'Nuevo objetivo'}
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
                label="Nombre"
                type="text"
                placeholder="Ej: Correr 100km este mes"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                required
              />

              <Select
                label="Tipo"
                value={goalType}
                onChange={(e) => setGoalType(e.target.value)}
              >
                <option value="general">General</option>
                <option value="money">Económico</option>
                <option value="physical">Físico</option>
                <option value="mental">Mental</option>
              </Select>

              {goalType === 'money' && budgets.length > 0 && (
                <Select
                  label="Vincular con presupuesto (opcional)"
                  value={goalBudgetId}
                  onChange={(e) => setGoalBudgetId(e.target.value)}
                >
                  <option value="">Ninguno</option>
                  {budgets.map((budget) => (
                    <option key={budget.created_at} value={budget.created_at}>
                      {budget.name}
                    </option>
                  ))}
                </Select>
              )}

              <Input
                label="Meta"
                type="number"
                placeholder="Ej: 100"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                required
              />

              <Input
                label={editingGoal ? 'Progreso actual' : 'Progreso inicial'}
                type="number"
                placeholder="Ej: 0"
                value={goalProgress}
                onChange={(e) => setGoalProgress(e.target.value)}
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                >
                  {editingGoal ? 'Guardar cambios' : 'Crear objetivo'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
