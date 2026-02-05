'use client'

import { useRouter } from 'next/navigation'

export default function TopBar({ title, action, backHref }) {
  const router = useRouter()

  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-50/90 dark:bg-zinc-950/90 border-b border-zinc-200/30 dark:border-zinc-800/30">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {backHref && (
              <button
                onClick={() => router.push(backHref)}
                className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors active:scale-95 -ml-1 p-1"
                aria-label="Volver"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
          </div>
          {action && <div>{action}</div>}
        </div>
      </div>
    </header>
  )
}
