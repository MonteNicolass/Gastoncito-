'use client'

import { useState, useEffect } from 'react'
import { initDB, getGoals, addGoal, deleteGoal, updateGoal, getMovimientos } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import {
  Target,
  Plus,
  CheckCircle,
  XCircle,
  ArrowRight,
  Wallet,
  Dumbbell,
  Brain,
  MoreVertical,
  X,
  Sparkles
} from 'lucide-react'

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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <CheckCircle className="w-3 h-3" /> Cumplido
        </span>
      )
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          <XCircle className="w-3 h-3" /> Fallido
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
        <ArrowRight className="w-3 h-3" /> Activo
      </span>
    )
  }

  const getTypeBadge = (type) => {
    if (type === 'money') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          <Wallet className="w-3 h-3" /> Económico
        </span>
      )
    }
    if (type === 'physical') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
          <Dumbbell className="w-3 h-3" /> Físico
        </span>
      )
    }
    if (type === 'mental') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          <Brain className="w-3 h-3" /> Mental
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

  // Calcular estadísticas
  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')
  const avgProgress = activeGoals.length > 0
    ? Math.round(activeGoals.reduce((sum, g) => sum + getProgressPercent(g), 0) / activeGoals.length)
    : 0

  const getOverallStatus = () => {
    if (completedGoals.length > 0 && activeGoals.length === 0) {
      return { text: 'Todos cumplidos', Icon: Sparkles, color: 'text-green-600 dark:text-green-400' }
    }
    if (avgProgress >= 75) {
      return { text: 'Casi listo', Icon: Target, color: 'text-green-600 dark:text-green-400' }
    }
    if (avgProgress >= 50) {
      return { text: 'Buen avance', Icon: CheckCircle, color: 'text-blue-600 dark:text-blue-400' }
    }
    if (activeGoals.length > 0) {
      return { text: 'En progreso', Icon: ArrowRight, color: 'text-zinc-500 dark:text-zinc-400' }
    }
    return null
  }

  const overallStatus = getOverallStatus()

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Tus metas" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Resumen de objetivos */}
        {goals.length > 0 && (
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                  Progreso general
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                    {avgProgress}%
                  </span>
                  <span className="text-lg text-zinc-400 dark:text-zinc-500">promedio</span>
                </div>
              </div>
              {overallStatus && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 dark:bg-zinc-800/60 ${overallStatus.color}`}>
                  <overallStatus.Icon className="w-4 h-4" />
                  <span className="text-xs font-semibold">{overallStatus.text}</span>
                </div>
              )}
            </div>

            {/* Stats rápidos */}
            <div className="flex gap-4 pt-4 border-t border-blue-200/50 dark:border-blue-700/50">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-bold">{activeGoals.length}</span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">activos</span>
              </div>
              {completedGoals.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-green-600 dark:text-green-400 font-bold">{completedGoals.length}</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">cumplidos</span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Acción principal - estilo crecimiento */}
        <button
          onClick={handleOpenCreate}
          className="w-full p-4 bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
        >
          <div className="flex items-center justify-center gap-2 text-white">
            <Plus className="w-5 h-5" />
            <span className="font-semibold">Nueva meta</span>
          </div>
        </button>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Mis metas
          </h3>
          {goals.length === 0 ? (
            <Card className="p-8 text-center bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border-indigo-200/50 dark:border-indigo-800/50">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <Target className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Definí tus metas
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Creá objetivos para ver tu progreso
              </p>
            </Card>
          ) : (
            goals.map((goal) => {
              const percent = getProgressPercent(goal)
              const isAlmostDone = percent >= 80 && goal.status === 'active'

              return (
              <Card key={goal.id} className={`p-5 transition-all ${
                goal.status === 'completed'
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/50'
                  : goal.status === 'failed'
                  ? 'bg-zinc-50 dark:bg-zinc-800/30'
                  : 'hover:shadow-md'
              }`}>
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeBadge(goal.type)}
                        {isAlmostDone && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            Casi listo <Sparkles className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                        {goal.name}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(goal.status)}
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
                        <MoreVertical className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
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
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-zinc-600 dark:text-zinc-400">
                        {goal.progress} de {goal.target}
                      </span>
                      <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {percent}%
                      </span>
                    </div>
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all rounded-full ${
                          goal.status === 'completed'
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : goal.status === 'failed'
                            ? 'bg-zinc-400 dark:bg-zinc-600'
                            : percent >= 80
                            ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                            : percent >= 50
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-500'
                            : 'bg-gradient-to-r from-blue-400 to-blue-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick update for active goals */}
                  {goal.status === 'active' && (
                    <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <Input
                        type="number"
                        placeholder="Actualizar progreso..."
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

                  {/* Payoff para completados */}
                  {goal.status === 'completed' && (
                    <div className="flex items-center gap-2 pt-2 border-t border-green-200/50 dark:border-green-700/50">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Objetivo cumplido
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            )})
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
                  <X className="w-6 h-6" />
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
