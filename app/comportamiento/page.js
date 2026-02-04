'use client'

import { useState, useEffect } from 'react'
import { initDB, getBehavioralGoals, addBehavioralGoal, deleteBehavioralGoal, getMovimientos } from '@/lib/storage'

export default function ComportamientoPage() {
  const [goals, setGoals] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [name, setName] = useState('')
  const [type, setType] = useState('category')
  const [target, setTarget] = useState('')
  const [limit, setLimit] = useState('')
  const [period, setPeriod] = useState('month')

  useEffect(() => {
    const load = async () => {
      await initDB()
      const goalsData = await getBehavioralGoals()
      const movs = await getMovimientos()
      setGoals(goalsData)
      setMovimientos(movs)
    }
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !target.trim() || !limit) return

    await addBehavioralGoal({
      name: name.trim(),
      type,
      target: target.trim(),
      limit: parseFloat(limit),
      period,
    })

    setName('')
    setTarget('')
    setLimit('')

    const goalsData = await getBehavioralGoals()
    setGoals(goalsData)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este objetivo?')) return
    await deleteBehavioralGoal(id)
    const goalsData = await getBehavioralGoals()
    setGoals(goalsData)
  }

  const evaluateGoal = (goal) => {
    const now = new Date()
    let startDate

    if (goal.period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    } else {
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      startDate = new Date(now)
      startDate.setDate(now.getDate() - diff)
      startDate.setHours(0, 0, 0, 0)
    }

    const startDateStr = startDate.toISOString().split('T')[0]

    if (goal.type === 'category') {
      const filtered = movimientos.filter(
        (m) => m.tipo === 'gasto' && m.categoria === goal.target && m.fecha >= startDateStr
      )
      const total = filtered.reduce((sum, m) => sum + m.monto, 0)
      return { current: total, limit: goal.limit, exceeded: total > goal.limit }
    } else {
      const filtered = movimientos.filter(
        (m) =>
          m.fecha >= startDateStr &&
          (m.metodo === goal.target || m.origen === goal.target || m.destino === goal.target)
      )
      const count = filtered.length
      return { current: count, limit: goal.limit, exceeded: count > goal.limit }
    }
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
        <h1 className="text-sm font-bold">Objetivos de Comportamiento</h1>
        <p className="text-xs text-stone-500">Límites de gasto o uso</p>
      </header>

      <div className="p-4 space-y-4">
        <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
          <div>
            <label className="text-xs text-stone-600 block mb-1">Nombre del objetivo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ej: Menos delivery"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            >
              <option value="category">Categoría</option>
              <option value="wallet">Billetera</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">
              {type === 'category' ? 'Categoría' : 'Billetera'}
            </label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={type === 'category' ? 'ej: comida' : 'ej: mercado pago'}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">
              {type === 'category' ? 'Límite de gasto' : 'Límite de usos'}
            </label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder={type === 'category' ? 'ej: 50000' : 'ej: 5'}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Período</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            >
              <option value="month">Mes</option>
              <option value="week">Semana</option>
            </select>
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
              const evaluation = evaluateGoal(goal)
              return (
                <div key={goal.id} className="rounded-lg border border-stone-200 bg-white p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-sm font-semibold">{goal.name}</h3>
                      <p className="text-xs text-stone-500 mt-1">
                        {goal.type === 'category' ? 'Categoría' : 'Billetera'}: {goal.target}
                      </p>
                      <p className="text-xs text-stone-500">
                        Período: {goal.period === 'month' ? 'Mensual' : 'Semanal'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(goal.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-stone-600">
                      {goal.type === 'category'
                        ? `${formatAmount(evaluation.current)} / ${formatAmount(evaluation.limit)}`
                        : `${evaluation.current} usos / ${evaluation.limit} usos`}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded font-semibold ${
                        evaluation.exceeded ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {evaluation.exceeded ? 'EXCEDIDO' : 'OK'}
                    </span>
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