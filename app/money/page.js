'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getMovimientos } from '@/lib/storage'
import { seedPredefinedCategories } from '@/lib/seed-categories'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ListRow from '@/components/ui/ListRow'
import ProgressRing from '@/components/ui/ProgressRing'
import RecommendationCard from '@/components/ui/RecommendationCard'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function MoneyPage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initDB().then(() => {
      seedPredefinedCategories()
      loadStats()
    })
  }, [])

  async function loadStats() {
    try {
      const movimientos = await getMovimientos()
      const budgets = getBudgetsFromLocalStorage()

      const now = new Date()
      const currentMonth = now.toISOString().slice(0, 7)
      const thisMonthMov = movimientos.filter(m => m.fecha.startsWith(currentMonth))

      const gastosMes = thisMonthMov.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
      const ingresosMes = thisMonthMov.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
      const balance = ingresosMes - gastosMes

      // Mes anterior para comparación
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthStr = prevMonth.toISOString().slice(0, 7)
      const prevMonthMov = movimientos.filter(m => m.fecha.startsWith(prevMonthStr))
      const gastosPrevMes = prevMonthMov.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)

      // Control streak
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

      // Budget usage
      let budgetUsage = null
      let budgetHealth = 100
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

        // Health = 100 - average over-budget percentage
        const avgOverBudget = budgetStats.reduce((sum, b) => sum + Math.max(0, b.percent - 100), 0) / budgetStats.length
        budgetHealth = Math.max(0, 100 - avgOverBudget)
      }

      // Health score (0-100)
      let healthScore = 100
      if (gastosPrevMes > 0) {
        const diff = ((gastosMes - gastosPrevMes) / gastosPrevMes) * 100
        if (diff > 50) healthScore -= 40
        else if (diff > 20) healthScore -= 20
        else if (diff > 0) healthScore -= 10
        else healthScore += 10
      }
      if (budgetUsage?.percent > 100) healthScore -= 20
      else if (budgetUsage?.percent > 80) healthScore -= 10
      healthScore = Math.min(100, Math.max(0, healthScore * (budgetHealth / 100)))

      setStats({
        gastosMes,
        ingresosMes,
        balance,
        controlStreak,
        budgetUsage,
        healthScore: Math.round(healthScore),
        gastosPrevMes,
        gastoDiff: gastosPrevMes > 0 ? ((gastosMes - gastosPrevMes) / gastosPrevMes) * 100 : 0
      })
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getScoreColor = (score) => {
    if (score >= 70) return 'green'
    if (score >= 50) return 'blue'
    if (score >= 30) return 'orange'
    return 'zinc'
  }

  const getRecommendation = () => {
    if (!stats) return null

    if (stats.budgetUsage?.percent > 100) {
      return {
        emoji: '⚠️',
        title: 'Presupuesto excedido',
        description: `${stats.budgetUsage.name} está al ${stats.budgetUsage.percent}%. Revisá tus gastos.`,
        action: () => router.push('/money/presupuestos'),
        actionLabel: 'Ver presupuestos',
        variant: 'warning'
      }
    }

    if (stats.gastoDiff > 30) {
      return {
        emoji: '📈',
        title: 'Gasto en aumento',
        description: `Gastaste ${stats.gastoDiff.toFixed(0)}% más que el mes pasado.`,
        action: () => router.push('/money/movimientos'),
        actionLabel: 'Ver movimientos',
        variant: 'warning'
      }
    }

    if (stats.controlStreak >= 7) {
      return {
        emoji: '✨',
        title: 'Excelente control',
        description: `${stats.controlStreak} días manteniendo el gasto bajo control.`,
        variant: 'success'
      }
    }

    if (stats.balance < 0) {
      return {
        emoji: '💸',
        title: 'Balance negativo',
        description: 'Tus gastos superan tus ingresos este mes.',
        action: () => router.push('/money/resumen'),
        actionLabel: 'Ver resumen',
        variant: 'warning'
      }
    }

    return {
      emoji: '💳',
      title: 'Seguí registrando',
      description: 'Cada gasto que registrás mejora tus insights.',
      action: () => router.push('/chat'),
      actionLabel: 'Registrar',
      variant: 'default'
    }
  }

  const recommendation = getRecommendation()

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Money" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Money" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* Hero Section - Dark wallet style */}
        <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-800 dark:via-zinc-900 dark:to-black rounded-3xl p-6 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 opacity-20">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-3xl ${
              stats?.healthScore >= 70 ? 'bg-emerald-500' :
              stats?.healthScore >= 50 ? 'bg-blue-500' :
              stats?.healthScore >= 30 ? 'bg-orange-500' :
              'bg-red-500'
            }`} />
          </div>

          <div className="relative flex items-center gap-5">
            <ProgressRing
              progress={stats?.healthScore || 0}
              size={100}
              strokeWidth={8}
              color={getScoreColor(stats?.healthScore || 0)}
              label={stats?.healthScore || 0}
              sublabel="salud"
            />

            <div className="flex-1">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">
                Este mes
              </p>
              <div className="text-3xl font-bold text-white font-mono tracking-tight mb-2">
                {formatAmount(stats?.gastosMes || 0)}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-zinc-500">Balance:</span>
                  <span className={`text-sm font-semibold font-mono ${
                    stats?.balance >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {formatAmount(stats?.balance || 0)}
                  </span>
                </div>
                {stats?.gastoDiff !== 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    stats?.gastoDiff > 0
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {stats?.gastoDiff > 0 ? '+' : ''}{stats?.gastoDiff?.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bottom indicators */}
          {(stats?.controlStreak > 0 || stats?.budgetUsage) && (
            <div className="mt-4 pt-4 border-t border-zinc-700/50 flex items-center justify-between">
              {stats?.controlStreak > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">✓</span>
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
                    'bg-emerald-500'
                  }`} />
                  <span className="text-xs text-zinc-400">
                    {stats.budgetUsage.name}: {stats.budgetUsage.percent}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recommendation */}
        {recommendation && (
          <RecommendationCard
            emoji={recommendation.emoji}
            title={recommendation.title}
            description={recommendation.description}
            action={recommendation.action}
            actionLabel={recommendation.actionLabel}
            variant={recommendation.variant}
          />
        )}

        {/* Quick action */}
        <a href="/chat" className="block">
          <Card className="p-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-xl">💸</span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Registrar gasto</p>
                  <p className="text-emerald-200 text-xs">o ingreso</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>
        </a>

        {/* Navigation */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Gestión
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 hover:shadow-lg transition-shadow">
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
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800 hover:shadow-lg transition-shadow">
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
