'use client'

export default function TopBar({ title, action }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-zinc-50/80 dark:bg-zinc-950/80 border-b border-zinc-200/50 dark:border-zinc-800/50">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Gastón</div>
          {action && <div>{action}</div>}
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {title}
        </h1>
      </div>
    </header>
  )
}
