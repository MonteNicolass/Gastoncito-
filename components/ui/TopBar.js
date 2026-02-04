'use client'

import { useRouter } from 'next/navigation'

export default function TopBar({ title, action, backHref }) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-50/80 dark:bg-zinc-950/80 border-b border-zinc-200/50 dark:border-zinc-800/50">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {backHref && (
              <button
                onClick={() => router.push(backHref)}
                className="text-blue-600 dark:text-blue-400 hover:opacity-70 transition-opacity"
                aria-label="Volver"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div className="text-xs text-zinc-500 dark:text-zinc-400">Gastón</div>
          </div>
          {action && <div>{action}</div>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
      </div>
    </header>
  )
}
