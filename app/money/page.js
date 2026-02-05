'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos } from '@/lib/storage'
import { seedPredefinedCategories } from '@/lib/seed-categories'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'

// Helper para obtener presupuestos de localStorage
function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function MoneyPage() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    initDB().then(() => {
      seedPredefinedCategories()
      loadStats()
    })
  }, [])

  async function loadStats() {
    const movimientos = await getMovimientos()
    const budgets = getBudgetsFromLocalStorage()

    // Este mes
    const now = new Date()
    const currentMonth = now.toISOString().slice(0, 7)
    const thisMonthMov = movimientos.filter(m => m.fecha.startsWith(currentMonth))

    const gastosMes = thisMonthMov.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
    const ingresosMes = thisMonthMov.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
    const balance = ingresosMes - gastosMes

    // Racha de control (días sin exceder promedio diario)
    let controlStreak = 0
    const avgDaily = gastosMes / now.getDate()

    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(now)
      checkDate.setDate(checkDate.getDate() - i)
      const dateStr = checkDate.toISOString().slice(0, 10)

      const dayGastos = movimientos
        .filter(m => m.fecha === dateStr && m.tipo === 'gasto')
        .reduce((sum, m) => sum + m.monto, 0)

      if (dayGastos <= avgDaily * 1.5 || dayGastos === 0) {
        controlStreak++
      } else if (i > 0) {
        break
      }
    }

    // Presupuesto más usado
    let budgetUsage = null
    if (budgets.length > 0) {
      const budgetStats = budgets.map(budget => {
        let spent = 0
        if (budget.type === 'category') {
          spent = thisMonthMov
            .filter(m => m.tipo === 'gasto' && m.categoria === budget.target_id)
            .reduce((sum, m) => sum + m.monto, 0)
        } else if (budget.type === 'wallet') {
          spent = thisMonthMov
            .filter(m => m.tipo === 'gasto' && m.metodo === budget.target_id)
            .reduce((sum, m) => sum + m.monto, 0)
        }
        return { ...budget, spent, percent: Math.round((spent / budget.limit) * 100) }
      })
      budgetUsage = budgetStats.sort((a, b) => b.percent - a.percent)[0]
    }

    setStats({ gastosMes, ingresosMes, balance, controlStreak, budgetUsage })
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Money" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* Balance Card - Estilo billetera */}
        <Card className="p-0 overflow-hidden bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 border-zinc-700">
          <div className="p-6">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
              Este mes
            </p>
            <div className="text-4xl font-bold text-white mb-4 font-mono tracking-tight">
              {stats ? formatAmount(stats.gastosMes) : '—'}
            </div>

            <div className="flex gap-6">
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Ingresos</p>
                <p className="text-lg font-semibold text-green-400 font-mono">
                  {stats ? formatAmount(stats.ingresosMes) : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Balance</p>
                <p className={`text-lg font-semibold font-mono ${
                  stats?.balance >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stats ? formatAmount(stats.balance) : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Indicadores de progresión */}
          <div className="px-6 py-4 bg-zinc-950/50 border-t border-zinc-700/50 flex items-center justify-between">
            {stats?.controlStreak > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-green-400 text-sm">✓</span>
                <span className="text-xs text-zinc-400">
                  {stats.controlStreak}d bajo control
                </span>
              </div>
            )}
            {stats?.budgetUsage && (
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  stats.budgetUsage.percent >= 100 ? 'bg-red-500' :
                  stats.budgetUsage.percent >= 80 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`} />
                <span className="text-xs text-zinc-400">
                  {stats.budgetUsage.name}: {stats.budgetUsage.percent}%
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Acción rápida */}
        <a href="/chat" className="block">
          <Card className="p-4 bg-green-600 hover:bg-green-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-xl">💸</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Registrar gasto</p>
                  <p className="text-green-200 text-xs">o ingreso</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>
        </a>

        {/* Navegación - Estilo limpio */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Gestión
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <ListRow label="📊 Resumen mensual" href="/money/resumen" />
            <ListRow label="💳 Movimientos" href="/money/movimientos" />
            <ListRow label="👛 Billeteras" href="/money/billeteras" />
            <ListRow label="📋 Presupuestos" href="/money/presupuestos" />
          </Card>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Análisis
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <ListRow label="🔔 Suscripciones" href="/money/suscripciones" />
            <ListRow label="⚠️ Alertas" href="/money/alertas" />
            <ListRow label="📈 Insights" href="/money/insights" />
            <ListRow label="📊 Inversiones" href="/money/inversiones" />
          </Card>
        </div>
      </div>
    </div>
  )
}
