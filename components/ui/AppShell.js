'use client'

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-[420px] min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {children}
      </div>
    </div>
  )
}
