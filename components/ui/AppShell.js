'use client'

export default function AppShell({ children }) {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="mx-auto max-w-[420px] min-h-screen bg-white dark:bg-black">
        {children}
      </div>
    </div>
  )
}
