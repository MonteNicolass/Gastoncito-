'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function BottomTabs() {
  const pathname = usePathname()

  const tabs = [
    { name: 'Resumen', href: '/vision', emoji: '🏠' },
    { name: 'Chat', href: '/chat', emoji: '💬' },
    { name: 'Hoy', href: '/hoy', emoji: '📅' },
    { name: 'Mental', href: '/mental', emoji: '🧠' },
    { name: 'Físico', href: '/fisico', emoji: '💪' },
    { name: 'Money', href: '/money', emoji: '💰' },
    { name: 'Objetivos', href: '/objetivos', emoji: '🎯' },
    { name: 'Notas', href: '/notas', emoji: '📝' },
    { name: 'Insights', href: '/insights', emoji: '📊' },
    { name: 'Backup', href: '/mas/backup', emoji: '💾' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-zinc-50/80 dark:bg-zinc-950/80 border-t border-zinc-200/50 dark:border-zinc-800/50">
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-1 px-2 pb-safe min-w-max">
          {tabs.map((tab) => {
            const baseSection = tab.href.split('/')[1]
            const currentSection = pathname.split('/')[1]
            const isActive = currentSection === baseSection || pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
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
