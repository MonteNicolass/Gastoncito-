'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { initDB, getMovimientos, getLifeEntries, getGoals } from '@/lib/storage'
import { getMentalOverview, getPhysicalOverview } from '@/lib/overview-insights'
import {
  LayoutDashboard,
  MessageCircle,
  Brain,
  Dumbbell,
  StickyNote,
  Target,
  Wallet,
  MoreHorizontal
} from 'lucide-react'

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

      if (budgetAtRisk) {
        alerts.money = true
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

      setPriorities(alerts)
    } catch (error) {
      console.error('Error calculating priorities:', error)
    }
  }

  const tabs = [
    { name: 'Resumen', href: '/vision', icon: LayoutDashboard, key: 'vision' },
    { name: 'Chat', href: '/chat', icon: MessageCircle, key: 'chat' },
    { name: 'Mental', href: '/mental', icon: Brain, key: 'mental' },
    { name: 'Físico', href: '/fisico', icon: Dumbbell, key: 'fisico' },
    { name: 'Notas', href: '/notas', icon: StickyNote, key: 'notas' },
    { name: 'Objetivos', href: '/objetivos', icon: Target, key: 'objetivos' },
    { name: 'Money', href: '/money', icon: Wallet, key: 'money' },
    { name: 'Más', href: '/mas', icon: MoreHorizontal, key: 'mas' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-zinc-50/95 dark:bg-zinc-950/95 border-t border-zinc-200/50 dark:border-zinc-800/50">
      <div className="flex items-center justify-between px-1 py-1.5 pb-safe max-w-lg mx-auto overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const baseSection = tab.href.split('/')[1]
          const currentSection = pathname.split('/')[1]
          const isActive = currentSection === baseSection || pathname === tab.href
          const hasPriority = priorities[tab.key]
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 px-2.5 rounded-xl transition-all active:scale-95 min-w-[52px] ${
                isActive
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
              }`}
            >
              {hasPriority && !isActive && (
                <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 bg-orange-500 dark:bg-orange-400 rounded-full" />
              )}
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[9px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
