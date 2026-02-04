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
      name: 'Economía',
      path: '/movimientos',
      icon: '💰',
      subs: [
        { name: 'Movs', path: '/movimientos', icon: '📊' },
        { name: 'Money', path: '/money', icon: '💰' },
        { name: 'Objetivos', path: '/objetivos', icon: '🎯' },
        { name: 'Comportamiento', path: '/comportamiento', icon: '📈' },
        { name: 'Budgets', path: '/budgets', icon: '💳' },
        { name: 'Crypto', path: '/crypto', icon: '₿' },
      ],
    },
    {
      name: 'Más',
      path: '/mas',
      icon: '⋯',
      subs: [
        { name: 'Reglas', path: '/reglas', icon: '⚙️' },
      ],
    },
  ];

  const activeMain = tabs.find(isMainActive) || null; // Ensure activeMain is always defined

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-stone-200 safe-area-bottom">
      {/* sublinks when a main tab with subs is active */}
      {activeMain && activeMain.subs && activeMain.subs.length > 0 && (
        <div className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-stone-100">
          {activeMain.subs.map((s) => (
            <Link
              key={s.path}
              href={s.path}
              className={`flex items-center gap-2 shrink-0 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                pathname === s.path
                  ? 'bg-stone-100 text-stone-900'
                  : 'text-stone-600 hover:bg-stone-50'
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
            className={`flex-1 min-w-0 flex flex-col items-center justify-center py-2 px-1 text-xs font-semibold transition-all ${
              isMainActive(tab)
                ? 'text-stone-900 bg-gradient-to-t from-stone-100 to-transparent'
                : 'text-stone-500 hover:text-stone-700'
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