'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  MessageCircle,
  CreditCard,
  BarChart3,
  Wallet,
  Target,
  RefreshCw,
  Lightbulb,
  Brain,
  Activity,
  BookOpen,
  Dumbbell,
  CheckSquare,
  Apple,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'

interface SubTab {
  name: string
  path: string
  icon: LucideIcon
}

interface Tab {
  name: string
  path: string
  icon: LucideIcon
  subs: SubTab[]
}

export default function TabNav() {
  const pathname = usePathname()

  function isMainActive(tab: Tab) {
    if (!pathname) return false
    if (pathname === tab.path) return true
    if (tab.subs) return tab.subs.some((s) => pathname === s.path || pathname.startsWith(s.path))
    return false
  }

  const tabs: Tab[] = [
    { name: 'Chat', path: '/chat', icon: MessageCircle, subs: [] },
    {
      name: 'Money',
      path: '/money',
      icon: CreditCard,
      subs: [
        { name: 'Movimientos', path: '/money/movimientos', icon: BarChart3 },
        { name: 'Billeteras', path: '/money/billeteras', icon: Wallet },
        { name: 'Presupuestos', path: '/money/presupuestos', icon: Target },
        { name: 'Suscripciones', path: '/money/suscripciones', icon: RefreshCw },
        { name: 'Insights', path: '/money/insights', icon: Lightbulb },
      ],
    },
    {
      name: 'Mental',
      path: '/mental',
      icon: Brain,
      subs: [
        { name: 'Estado', path: '/mental/estado', icon: Activity },
        { name: 'Diario', path: '/mental/diario', icon: BookOpen },
        { name: 'Objetivos', path: '/mental/objetivos', icon: Target },
        { name: 'Insights', path: '/mental/insights', icon: Lightbulb },
      ],
    },
    {
      name: 'F\u00edsico',
      path: '/fisico',
      icon: Dumbbell,
      subs: [
        { name: 'H\u00e1bitos', path: '/fisico/habitos', icon: CheckSquare },
        { name: 'Comida', path: '/fisico/comida', icon: Apple },
      ],
    },
    {
      name: 'M\u00e1s',
      path: '/mas',
      icon: MoreHorizontal,
      subs: [],
    },
  ]

  const activeMain = tabs.find(isMainActive) || null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-stone-200 safe-area-bottom">
      {activeMain && activeMain.subs && activeMain.subs.length > 0 && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-stone-100">
          {activeMain.subs.map((s) => {
            const SubIcon = s.icon
            return (
              <Link
                key={s.path}
                href={s.path}
                className={`flex items-center gap-2 shrink-0 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  pathname === s.path
                    ? 'bg-stone-100 text-stone-900'
                    : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <SubIcon className="w-4 h-4" />
                <span>{s.name}</span>
              </Link>
            )
          })}
        </div>
      )}

      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => {
          const TabIcon = tab.icon
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2 px-1 text-xs font-semibold transition-all ${
                isMainActive(tab)
                  ? 'text-stone-900 bg-gradient-to-t from-stone-100 to-transparent'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <TabIcon className="w-5 h-5 mb-0.5" />
              <span className="truncate w-full text-center">{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
