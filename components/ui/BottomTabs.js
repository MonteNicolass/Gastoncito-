'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { initDB, getMovimientos, getLifeEntries, getGoals } from '@/lib/storage'
import { getMentalOverview, getPhysicalOverview } from '@/lib/overview-insights'
import {
  LayoutDashboard,
  MessageCircle,
  Wallet,
  Heart,
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

      const mentalOverview = getMentalOverview(lifeEntries)
      if (mentalOverview.trend === 'declining' || (mentalOverview.average7d > 0 && mentalOverview.average7d <= 4)) {
        alerts.bienestar = true
      }

      const physicalOverview = getPhysicalOverview(lifeEntries)
      if (physicalOverview.daysSinceLastExercise !== null && physicalOverview.daysSinceLastExercise > 3) {
        alerts.bienestar = true
      }

      const now = new Date()
      const currentMonth = now.toISOString().slice(0, 7)
      const thisMonthMovimientos = movimientos.filter(m => m.fecha.startsWith(currentMonth))

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

      const activeGoals = goals.filter(g => g.status === 'active')
      const atRisk = activeGoals.filter(g => {
        const progress = g.progress || 0
        return progress < 30
      })
      if (atRisk.length > 0) {
        alerts.mas = true
      }

      setPriorities(alerts)
    } catch (error) {
      console.error('Error calculating priorities:', error)
    }
  }

  const tabs = [
    { name: 'Resumen', href: '/vision', icon: LayoutDashboard, key: 'vision' },
    { name: 'Chat', href: '/chat', icon: MessageCircle, key: 'chat' },
    { name: 'Money', href: '/money', icon: Wallet, key: 'money' },
    { name: 'Bienestar', href: '/bienestar', icon: Heart, key: 'bienestar' },
    { name: 'Más', href: '/mas', icon: MoreHorizontal, key: 'mas' },
  ]

  // Match /mental and /fisico routes to bienestar tab
  function isTabActive(tab) {
    const baseSection = tab.href.split('/')[1]
    const currentSection = pathname.split('/')[1]
    if (tab.key === 'bienestar') {
      return currentSection === 'bienestar' || currentSection === 'mental' || currentSection === 'fisico'
    }
    return currentSection === baseSection || pathname === tab.href
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-zinc-50/95 dark:bg-zinc-950/95 border-t border-zinc-200/50 dark:border-zinc-800/50">
      <div className="flex items-center justify-around px-2 py-1.5 pb-safe max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = isTabActive(tab)
          const hasPriority = priorities[tab.key]
          const Icon = tab.icon

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all active:scale-95 ${
                isActive
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                  : 'text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
              }`}
            >
              {hasPriority && !isActive && (
                <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 bg-terra-500 dark:bg-terra-400 rounded-full" />
              )}
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 1.75} />
              <span className={`text-[9px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
