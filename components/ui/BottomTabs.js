'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { initDB, getMovimientos, getLifeEntries, getGoals } from '@/lib/storage'
import { getMentalOverview, getPhysicalOverview } from '@/lib/overview-insights'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function BottomTabs() {
  const pathname = usePathname()
  const [priorities, setPriorities] = useState({})

  useEffect(() => {
    calculatePriorities()
  }, [])

  async function calculatePriorities() {
    try {
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const goals = await getGoals()
      const budgets = getBudgetsFromLocalStorage()

      const alerts = {}

      // Mental: estado bajo sostenido o tendencia negativa
      const mentalOverview = getMentalOverview(lifeEntries)
      if (mentalOverview.trend === 'declining' || (mentalOverview.average7d > 0 && mentalOverview.average7d <= 4)) {
        alerts.mental = true
      }

      // Físico: muchos días sin actividad
      const physicalOverview = getPhysicalOverview(lifeEntries)
      if (physicalOverview.daysSinceLastExercise !== null && physicalOverview.daysSinceLastExercise > 3) {
        alerts.fisico = true
      }

      // Money: presupuesto en riesgo o gasto alto reciente
      const now = new Date()
      const currentMonth = now.toISOString().slice(0, 7)
      const thisMonthMovimientos = movimientos.filter(m => m.fecha.startsWith(currentMonth))
      const totalGastos = thisMonthMovimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)

      // Check budgets at risk
      let budgetAtRisk = false
      budgets.forEach(budget => {
        if (budget.type === 'category') {
          const categoryGastos = thisMonthMovimientos
            .filter(m => m.tipo === 'gasto' && m.categoria === budget.target_id)
            .reduce((sum, m) => sum + m.monto, 0)
          if (categoryGastos >= budget.limit * 0.9) budgetAtRisk = true
        } else if (budget.type === 'wallet') {
          const walletGastos = thisMonthMovimientos
            .filter(m => m.tipo === 'gasto' && m.metodo === budget.target_id)
            .reduce((sum, m) => sum + m.monto, 0)
          if (walletGastos >= budget.limit * 0.9) budgetAtRisk = true
        }
      })

      if (budgetAtRisk || totalGastos > 0) {
        alerts.money = budgetAtRisk
      }

      // Objetivos: objetivos en riesgo
      const activeGoals = goals.filter(g => g.status === 'active')
      const atRisk = activeGoals.filter(g => {
        const progress = g.progress || 0
        return progress < 30
      })
      if (atRisk.length > 0) {
        alerts.objetivos = true
      }

      // Hoy: hay registros cargados hoy
      const today = new Date().toISOString().slice(0, 10)
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const todayMovimientos = movimientos.filter(m => m.fecha === today)
      const todayEntries = lifeEntries.filter(e => new Date(e.created_at) >= todayStart)

      if (todayMovimientos.length > 0 || todayEntries.length > 0) {
        alerts.hoy = true
      }

      setPriorities(alerts)
    } catch (error) {
      console.error('Error calculating priorities:', error)
    }
  }

  const tabs = [
    { name: 'Resumen', href: '/vision', emoji: '🏠', key: 'vision' },
    { name: 'Chat', href: '/chat', emoji: '💬', key: 'chat' },
    { name: 'Hoy', href: '/hoy', emoji: '📅', key: 'hoy' },
    { name: 'Mental', href: '/mental', emoji: '🧠', key: 'mental' },
    { name: 'Físico', href: '/fisico', emoji: '💪', key: 'fisico' },
    { name: 'Money', href: '/money', emoji: '💰', key: 'money' },
    { name: 'Objetivos', href: '/objetivos', emoji: '🎯', key: 'objetivos' },
    { name: 'Notas', href: '/notas', emoji: '📝', key: 'notas' },
    { name: 'Insights', href: '/insights', emoji: '📊', key: 'insights' },
    { name: 'Backup', href: '/mas/backup', emoji: '💾', key: 'backup' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-zinc-50/80 dark:bg-zinc-950/80 border-t border-zinc-200/50 dark:border-zinc-800/50">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 px-2 pb-safe min-w-max">
          {tabs.map((tab) => {
            const baseSection = tab.href.split('/')[1]
            const currentSection = pathname.split('/')[1]
            const isActive = currentSection === baseSection || pathname === tab.href
            const hasPriority = priorities[tab.key]

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {hasPriority && !isActive && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 dark:bg-orange-400 rounded-full" />
                )}
                <span className="text-xl">{tab.emoji}</span>
                <span className="text-[10px] font-medium whitespace-nowrap">{tab.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
