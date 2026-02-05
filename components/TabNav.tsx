'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function TabNav() {
  const pathname = usePathname(); // Removed SSR check as this is a client component

  function isMainActive(tab: { path: string; subs?: { path: string }[] }) {
    if (!pathname) return false; // Ensure pathname is defined
    if (pathname === tab.path) return true;
    if (tab.subs) return tab.subs.some((s) => pathname === s.path || pathname.startsWith(s.path));
    return false;
  }

  const tabs = [
    { name: 'Chat', path: '/chat', icon: '💬', subs: [] },
    {
      name: 'Money',
      path: '/money',
      icon: '💰',
      subs: [
        { name: 'Movimientos', path: '/money/movimientos', icon: '📊' },
        { name: 'Billeteras', path: '/money/billeteras', icon: '💳' },
        { name: 'Presupuestos', path: '/money/presupuestos', icon: '🎯' },
        { name: 'Suscripciones', path: '/money/suscripciones', icon: '🔄' },
        { name: 'Insights', path: '/money/insights', icon: '💡' },
      ],
    },
    {
      name: 'Mental',
      path: '/mental',
      icon: '🧠',
      subs: [
        { name: 'Estado', path: '/mental/estado', icon: '📊' },
        { name: 'Diario', path: '/mental/diario', icon: '📔' },
        { name: 'Objetivos', path: '/mental/objetivos', icon: '🎯' },
        { name: 'Insights', path: '/mental/insights', icon: '💡' },
      ],
    },
    {
      name: 'Físico',
      path: '/fisico',
      icon: '💪',
      subs: [
        { name: 'Hábitos', path: '/fisico/habitos', icon: '✅' },
        { name: 'Salud', path: '/fisico/salud', icon: '❤️' },
        { name: 'Entrenos', path: '/fisico/entrenos', icon: '🏋️' },
      ],
    },
    {
      name: 'Más',
      path: '/mas',
      icon: '⋯',
      subs: [],
    },
  ];

  const activeMain = tabs.find(isMainActive) || null; // Ensure activeMain is always defined

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-800 safe-area-bottom">
      {/* sublinks when a main tab with subs is active */}
      {activeMain && activeMain.subs && activeMain.subs.length > 0 && (
        <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-gray-100 dark:border-gray-900">
          {activeMain.subs.map((s) => (
            <Link
              key={s.path}
              href={s.path}
              className={`flex items-center gap-2 shrink-0 px-3 py-1 text-sm font-medium transition-colors ${
                pathname === s.path
                  ? 'bg-black text-white dark:bg-white dark:text-black'
                  : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              <span className="text-base">{s.icon}</span>
              <span>{s.name}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            href={tab.path}
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2 px-1 text-xs font-medium transition-colors ${
              isMainActive(tab)
                ? 'text-black dark:text-white border-t-2 border-black dark:border-white'
                : 'text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white'
            }`}
          >
            <span className="text-lg mb-0.5">{tab.icon}</span>
            <span className="truncate w-full text-center">{tab.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
