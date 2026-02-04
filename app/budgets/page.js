'use client'

import { useState, useEffect } from 'react'

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState([])
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('gaston_budgets')
    if (stored) {
      setBudgets(JSON.parse(stored))
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!category.trim() || !amount) return

    const newBudget = {
      category: category.trim().toLowerCase(),
      amount: parseFloat(amount),
    }

    const updated = [...budgets.filter((b) => b.category !== newBudget.category), newBudget]
    setBudgets(updated)
    localStorage.setItem('gaston_budgets', JSON.stringify(updated))

    setCategory('')
    setAmount('')
  }

  const handleDelete = (cat) => {
    if (!confirm('¿Eliminar este presupuesto?')) return
    const updated = budgets.filter((b) => b.category !== cat)
    setBudgets(updated)
    localStorage.setItem('gaston_budgets', JSON.stringify(updated))
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
        <h1 className="text-sm font-bold">Presupuestos</h1>
        <p className="text-xs text-stone-500">Límites mensuales por categoría</p>
      </header>

      <div className="p-4 space-y-4">
        <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
          <div>
            <label className="text-xs text-stone-600 block mb-1">Categoría</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="ej: comida"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Presupuesto mensual</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="ej: 50000"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
          >
            Guardar presupuesto
          </button>
        </form>

        {budgets.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-4 text-center text-sm text-stone-500">
            No hay presupuestos configurados.
          </div>
        ) : (
          <div className="space-y-2">
            {budgets.map((budget) => (
              <div
                key={budget.category}
                className="rounded-lg border border-stone-200 bg-white p-3 flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-semibold">{budget.category}</div>
                  <div className="text-xs text-stone-500">{formatAmount(budget.amount)}/mes</div>
                </div>
                <button
                  onClick={() => handleDelete(budget.category)}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}