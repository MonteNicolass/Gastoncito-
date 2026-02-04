'use client'

import { useState, useEffect } from 'react'
import { initDB, getGoals, addGoal, deleteGoal, getMovimientos } from '@/lib/storage'

export default function ObjetivosPage() {
  const [goals, setGoals] = useState([])
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [savings, setSavings] = useState(0)

  useEffect(() => {
    const load = async () => {
      await initDB()
      const goalsData = await getGoals()
      setGoals(goalsData)

      const movs = await getMovimientos()
      const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
      const gastos = movs.filter((m) => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
      setSavings(ingresos - gastos)
    }
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !target) return

    await addGoal(name.trim(), parseFloat(target))
    setName('')
    setTarget('')

    const goalsData = await getGoals()
    setGoals(goalsData)
  }

  const handleDelete = async (goalName) => {
    if (!confirm('¿Eliminar este objetivo?')) return
    await deleteGoal(goalName)
    const goalsData = await getGoals()
    setGoals(goalsData)
  }

  const formatAmount = (n) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(n)
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="border-b border-stone-200 bg-white px-4 py-3 sticky top-0">
        <h1 className="text-sm font-bold">Objetivos de Ahorro</h1>
        <p className="text-xs text-stone-500">Ahorro actual: {formatAmount(savings)}</p>
      </header>

      <div className="p-4 space-y-4">
        <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
          <div>
            <label className="text-xs text-stone-600 block mb-1">Nombre del objetivo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Vacaciones"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Monto objetivo</label>
            <input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="ej: 500000"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
          >
            Agregar objetivo
          </button>
        </form>

        {goals.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-4 text-center text-sm text-stone-500">
            No hay objetivos configurados.
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const percent = (savings / goal.target) * 100
              return (
                <div key={goal.name} className="rounded-lg border border-stone-200 bg-white p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-sm font-semibold">{goal.name}</h3>
                      <p className="text-xs text-stone-500 mt-1">
                        {formatAmount(savings)} / {formatAmount(goal.target)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(goal.name)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-stone-800 transition-all"
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-stone-600 mt-1 text-right">
                    {percent.toFixed(0)}%
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}