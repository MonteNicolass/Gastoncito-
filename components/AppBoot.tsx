'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { bootApp, type AppStatus } from '@/lib/db/init'
import ErrorBoundary from '@/components/ErrorBoundary'
import Onboarding from '@/components/Onboarding'
import { Loader2, AlertTriangle, RefreshCw, WifiOff } from 'lucide-react'

interface Props {
  children: ReactNode
}

function BootError({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-[320px] w-full text-center space-y-5">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <WifiOff className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No se pudo iniciar
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {message}
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    </div>
  )
}

function BootLoading() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin mx-auto" />
        <p className="text-sm text-zinc-400">Cargando...</p>
      </div>
    </div>
  )
}

export default function AppBoot({ children }: Props) {
  const [status, setStatus] = useState<AppStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const timeout = new Promise<{ status: 'error'; error: string }>(resolve =>
        setTimeout(() => resolve({ status: 'error', error: 'La carga tardó demasiado. Reiniciá la app.' }), 10000)
      )
      const result = await Promise.race([bootApp(), timeout])

      if (cancelled) return

      if (result.status === 'error') {
        setStatus('error')
        setError(result.error)
        return
      }

      setStatus('ready')

      const onboardingDone = localStorage.getItem('gaston_onboarding_done')
      if (!onboardingDone) {
        setShowOnboarding(true)
      } else {
        setReady(true)
      }
    }

    init()

    return () => { cancelled = true }
  }, [])

  if (status === 'loading') return <BootLoading />
  if (status === 'error') return <BootError message={error || 'Error desconocido'} />

  if (showOnboarding) {
    return (
      <Onboarding
        onDone={() => {
          setShowOnboarding(false)
          setReady(true)
        }}
      />
    )
  }

  if (!ready) return <BootLoading />

  return <ErrorBoundary>{children}</ErrorBoundary>
}
