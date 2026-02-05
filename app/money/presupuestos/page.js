'use client'

import { useState, useEffect, useMemo } from 'react'
import { initDB, getMovimientos, getCategorias, getWallets } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

// LocalStorage helpers para presupuestos
const STORAGE_KEY = 'gaston_budgets'

const getBudgets = () => {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(STORAGE_KEY)
  return data ? JSON.parse(data) : []
}

const saveBudgets = (budgets) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets))
}

export default function PresupuestosPage() {
  const [budgets, setBudgets] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [wallets, setWallets] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [form, setForm] = useState({
    name: '',
    type: 'category',
    target_id: '',
    amount: '',
    period: 'monthly'
  })
  const [contextMenuId, setContextMenuId] = useState(null)

  // Cargar datos
  const loadData = async () => {
    await initDB()
    const [movs, cats, walls] = await Promise.all([
      getMovimientos(),
      getCategorias(),
      getWallets()
    ])
    setMovimientos(movs)
    setCategorias(cats)
    setWallets(walls)
    setBudgets(getBudgets())
  }

  useEffect(() => {
    loadData()
  }, [])

  // Cerrar menú contextual al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuId) setContextMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenuId])

  // Calcular progreso de cada presupuesto
  const budgetsWithProgress = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return budgets.map(budget => {
      // Filtrar movimientos del mes actual
      const monthMovements = movimientos.filter(mov => {
        const movDate = new Date(mov.fecha)
        return movDate.getMonth() === currentMonth &&
               movDate.getFullYear() === currentYear &&
               mov.tipo === 'gasto' // Solo contar gastos
      })

      let spent = 0

      if (budget.type === 'category') {
        // Filtrar por categoría
        spent = monthMovements
          .filter(mov => {
            // Buscar por category_id o por nombre de categoría
            const cat = categorias.find(c => c.id === mov.category_id)
            return cat?.nombre === budget.target_id || mov.categoria === budget.target_id
          })
          .reduce((sum, mov) => sum + mov.monto, 0)
      } else {
        // Filtrar por billetera (metodo)
        spent = monthMovements
          .filter(mov => mov.metodo === budget.target_id)
          .reduce((sum, mov) => sum + mov.monto, 0)
      }

      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

      let status = 'ok'
      if (percentage >= 100) status = 'exceeded'
      else if (percentage >= 75) status = 'warning'

      return {
        ...budget,
        spent,
        percentage: Math.min(percentage, 100),
        status
      }
    })
  }, [budgets, movimientos, categorias])

  // Abrir modal para crear
  const handleOpenCreate = () => {
    setEditingBudget(null)
    setForm({
      name: '',
      type: 'category',
      target_id: '',
      amount: '',
      period: 'monthly'
    })
    setShowModal(true)
  }

  // Abrir modal para editar
  const handleOpenEdit = (budget) => {
    setEditingBudget(budget)
    setForm({
      name: budget.name,
      type: budget.type,
      target_id: budget.target_id,
      amount: budget.amount.toString(),
      period: budget.period
    })
    setShowModal(true)
    setContextMenuId(null)
  }

  // Cerrar modal
  const handleCloseModal = () => {
    setShowModal(false)
    setEditingBudget(null)
  }

  // Guardar presupuesto
  const handleSave = () => {
    if (!form.name || !form.target_id || !form.amount) {
      alert('Por favor completa todos los campos')
      return
    }

    const budgetData = {
      name: form.name,
      type: form.type,
      target_id: form.target_id,
      amount: parseFloat(form.amount),
      period: form.period,
      created_at: editingBudget ? editingBudget.created_at : new Date().toISOString()
    }

    let newBudgets
    if (editingBudget) {
      // Actualizar existente
      newBudgets = budgets.map(b =>
        b.created_at === editingBudget.created_at ? budgetData : b
      )
    } else {
      // Crear nuevo
      newBudgets = [...budgets, budgetData]
    }

    saveBudgets(newBudgets)
    setBudgets(newBudgets)
    handleCloseModal()
  }

  // Eliminar presupuesto
  const handleDelete = (budget) => {
    if (!confirm('¿Eliminar este presupuesto?')) return

    const newBudgets = budgets.filter(b => b.created_at !== budget.created_at)
    saveBudgets(newBudgets)
    setBudgets(newBudgets)
    setContextMenuId(null)
  }

  // Formatear monto
  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  // Obtener opciones del dropdown según el tipo
  const targetOptions = useMemo(() => {
    if (form.type === 'category') {
      // Retornar categorías únicas
      const uniqueCategories = [...new Set(categorias.map(c => c.nombre))]
      return uniqueCategories.sort()
    } else {
      // Retornar billeteras únicas
      return wallets.map(w => w.wallet).sort()
    }
  }, [form.type, categorias, wallets])

  // Obtener el color según el estado
  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'exceeded':
        return 'bg-red-500'
      default:
        return 'bg-zinc-300'
    }
  }

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'ok':
        return 'text-green-700 dark:text-green-400'
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-400'
      case 'exceeded':
        return 'text-red-700 dark:text-red-400'
      default:
        return 'text-zinc-600 dark:text-zinc-400'
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Presupuestos" backHref="/money" />

      {/* Botón Agregar */}
      <div className="px-4 pt-4">
        <Button
          onClick={handleOpenCreate}
          variant="primary"
          className="w-full"
        >
          Crear presupuesto
        </Button>
      </div>

      {/* Lista de presupuestos */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {budgetsWithProgress.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin presupuestos
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Crea tu primer presupuesto para controlar tus gastos
            </p>
          </Card>
        ) : (
          budgetsWithProgress.map((budget) => (
            <Card
              key={budget.created_at}
              className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {budget.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {budget.type === 'category' ? 'Categoría' : 'Billetera'}:
                    </span>
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                      {budget.target_id}
                    </span>
                  </div>
                </div>

                {/* Menú contextual */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setContextMenuId(contextMenuId === budget.created_at ? null : budget.created_at)
                    }}
                    className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                  >
                    <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 16 16">
                      <circle cx="8" cy="3" r="1.5"/>
                      <circle cx="8" cy="8" r="1.5"/>
                      <circle cx="8" cy="13" r="1.5"/>
                    </svg>
                  </button>
                  {contextMenuId === budget.created_at && (
                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenEdit(budget)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-t-lg"
                      >
                        Editar
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(budget)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="mb-2">
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStatusColor(budget.status)}`}
                    style={{ width: `${budget.percentage}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-1">
                  <span className={`text-sm font-semibold ${getStatusTextColor(budget.status)}`}>
                    {formatAmount(budget.spent)}
                  </span>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    / {formatAmount(budget.amount)}
                  </span>
                </div>
                <div className={`text-sm font-bold ${getStatusTextColor(budget.status)}`}>
                  {budget.percentage.toFixed(0)}%
                </div>
              </div>

              {budget.status === 'exceeded' && (
                <div className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">
                  Presupuesto excedido por {formatAmount(budget.spent - budget.amount)}
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Modal de crear/editar */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-xl animate-slide-up">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {editingBudget ? 'Editar presupuesto' : 'Nuevo presupuesto'}
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

            <div className="p-4 space-y-3">
              <Input
                label="Nombre del presupuesto"
                placeholder="Ej: Gastos de comida"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <Select
                label="Tipo"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value, target_id: '' })}
              >
                <option value="category">Por categoría</option>
                <option value="wallet">Por billetera</option>
              </Select>

              <Select
                label={form.type === 'category' ? 'Categoría' : 'Billetera'}
                value={form.target_id}
                onChange={(e) => setForm({ ...form, target_id: e.target.value })}
              >
                <option value="">Selecciona...</option>
                {targetOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>

              <Input
                label="Monto límite mensual"
                type="number"
                placeholder="0"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />

              <div className="pt-2">
                <Button
                  onClick={handleSave}
                  variant="primary"
                  className="w-full"
                >
                  {editingBudget ? 'Guardar cambios' : 'Crear presupuesto'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
