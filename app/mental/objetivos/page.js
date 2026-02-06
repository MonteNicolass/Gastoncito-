'use client'

import { useState, useEffect } from 'react'
import { initDB, getGoals, addGoal, deleteGoal, updateGoal } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ObjetivosPage() {
  const [goals, setGoals] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [goalTarget, setGoalTarget] = useState('')
  const [goalProgress, setGoalProgress] = useState('')

  useEffect(() => {
    initDB().then(loadGoals)
  }, [])

  const loadGoals = async () => {
    const data = await getGoals()
    const sorted = data.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })
    setGoals(sorted)
  }

  const handleOpenModal = () => {
    setShowModal(true)
    setGoalName('')
    setGoalTarget('')
    setGoalProgress('')
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setGoalName('')
    setGoalTarget('')
    setGoalProgress('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!goalName.trim() || !goalTarget) return

    await addGoal({
      name: goalName.trim(),
      target: parseInt(goalTarget),
      progress: parseInt(goalProgress) || 0,
      status: 'active',
      created_at: new Date().toISOString()
    })

    setShowModal(false)
    await loadGoals()
  }

  const handleUpdateProgress = async (id, newProgress, target) => {
    const status = newProgress >= target ? 'completed' : 'active'
    await updateGoal(id, { progress: parseInt(newProgress), status })
    await loadGoals()
  }

  const handleMarkFailed = async (id) => {
    if (!confirm('¿Marcar como fallido?')) return
    await updateGoal(id, { status: 'failed' })
    await loadGoals()
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar "${name}"?`)) return
    await deleteGoal(id)
    await loadGoals()
  }

  const getProgressPercent = (goal) => {
    return Math.min(100, Math.round((goal.progress / goal.target) * 100))
  }

  const getStatusBadge = (status) => {
    if (status === 'completed') {
      return (
        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          Cumplido
        </span>
      )
    }
    if (status === 'failed') {
      return (
        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          Fallido
        </span>
      )
    }
    return (
      <span className="inline-block px-2 py-1 text-xs font-semibold rounded-lg bg-terra-100 dark:bg-terra-900/30 text-terra-700 dark:text-terra-300">
        Activo
      </span>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Objetivos" backHref="/mental" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <Button
          onClick={handleOpenModal}
          variant="primary"
          className="w-full"
        >
          Nuevo objetivo
        </Button>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis objetivos
          </h2>
          {goals.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No hay objetivos registrados.
              </p>
            </Card>
          ) : (
            goals.map((goal) => (
              <Card key={goal.id} className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                        {goal.name}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(goal.status)}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleDelete(goal.id, goal.name)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 dark:text-red-400 flex-shrink-0"
                    >
                      Eliminar
                    </Button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Progreso: {goal.progress} / {goal.target}
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {getProgressPercent(goal)}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          goal.status === 'completed'
                            ? 'bg-green-500'
                            : goal.status === 'failed'
                            ? 'bg-red-500'
                            : 'bg-terra-500'
                        }`}
                        style={{ width: `${getProgressPercent(goal)}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions for active goals */}
                  {goal.status === 'active' && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Nuevo progreso"
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            handleUpdateProgress(goal.id, e.target.value, goal.target)
                            e.target.value = ''
                          }
                        }}
                      />
                      <Button
                        onClick={() => handleMarkFailed(goal.id)}
                        variant="ghost"
                        size="sm"
                        className="text-zinc-600 dark:text-zinc-400"
                      >
                        Falló
                      </Button>
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
                  Nuevo objetivo
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

              <Input
                label="Meta"
                type="number"
                placeholder="Ej: 100"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                required
              />

              <Input
                label="Progreso inicial"
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
                  Crear
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
