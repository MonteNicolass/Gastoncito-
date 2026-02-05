'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
      icon: '💸',
      label: 'Movimiento',
      href: '/money/movimientos',
      color: 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700'
    },
    {
      id: 'estado',
      icon: '🧠',
      label: 'Estado mental',
      href: '/mental/estado',
      color: 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700'
    },
    {
      id: 'habito',
      icon: '💪',
      label: 'Hábito',
      href: '/fisico/habitos',
      color: 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700'
    },
    {
      id: 'nota',
      icon: '📝',
      label: 'Nota',
      href: '/notas',
      color: 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700'
    },
    {
      id: 'objetivo',
      icon: '🎯',
      label: 'Objetivo',
      href: '/objetivos',
      color: 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700'
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
        className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-black dark:bg-white text-white dark:text-black rounded-full flex items-center justify-center hover:bg-gray-800 dark:hover:bg-gray-200 transition-all hover:scale-110 active:scale-95"
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
        className="fixed inset-0 z-[60] bg-black/40 animate-fade-in"
        onClick={() => setShowMenu(false)}
      />

      {/* Menu */}
      <div className="fixed inset-x-0 bottom-0 z-[61] flex items-end justify-center">
        <div className="w-full max-w-[420px] bg-white dark:bg-black pb-safe">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-black dark:text-white">
                Acciones rápidas
              </h3>
              <button
                onClick={() => setShowMenu(false)}
                className="text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white"
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
                <Card className={`p-4 ${action.color} hover:bg-gray-200 dark:hover:bg-gray-800 transition-all active:scale-98`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{action.icon}</div>
                    <div className="text-left">
                      <div className="text-sm font-semibold text-black dark:text-white">
                        {action.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
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
