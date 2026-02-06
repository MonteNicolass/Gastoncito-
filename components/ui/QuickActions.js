'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wallet, Brain, Dumbbell, StickyNote, Target } from 'lucide-react'
import Card from './Card'

/**
 * Botón flotante global de acciones rápidas
 */
export default function QuickActions() {
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()

  const actions = [
    {
      id: 'movimiento',
      icon: Wallet,
      label: 'Movimiento',
      href: '/money/movimientos',
      color: 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800',
      iconColor: 'text-emerald-500'
    },
    {
      id: 'estado',
      icon: Brain,
      label: 'Estado mental',
      href: '/mental/estado',
      color: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800',
      iconColor: 'text-purple-500'
    },
    {
      id: 'habito',
      icon: Dumbbell,
      label: 'Hábito',
      href: '/fisico/habitos',
      color: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800',
      iconColor: 'text-orange-500'
    },
    {
      id: 'nota',
      icon: StickyNote,
      label: 'Nota',
      href: '/notas',
      color: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
      iconColor: 'text-blue-500'
    },
    {
      id: 'objetivo',
      icon: Target,
      label: 'Objetivo',
      href: '/objetivos',
      color: 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800',
      iconColor: 'text-cyan-500'
    }
  ]

  const handleAction = (href) => {
    setShowMenu(false)
    router.push(href)
  }

  if (!showMenu) {
    return (
      <button
        onClick={() => setShowMenu(true)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-xl flex items-center justify-center hover:bg-blue-700 dark:hover:bg-blue-600 transition-all hover:scale-110 active:scale-95"
        aria-label="Acciones rápidas"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={() => setShowMenu(false)}
      />

      {/* Menu */}
      <div className="fixed inset-x-0 bottom-0 z-[61] flex items-end justify-center">
        <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-xl animate-slide-up pb-safe">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Acciones rápidas
              </h3>
              <button
                onClick={() => setShowMenu(false)}
                className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-4 space-y-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action.href)}
                className="w-full"
              >
                <Card className={`p-4 ${action.color} hover:shadow-md transition-all active:scale-98`}>
                  <div className="flex items-center gap-3">
                    <action.icon className={`w-7 h-7 ${action.iconColor}`} />
                    <div className="text-left">
                      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {action.label}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        Crear nuevo
                      </div>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
