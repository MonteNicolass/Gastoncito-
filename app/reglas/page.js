'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ReglasRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/mas/reglas')
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-zinc-500 dark:text-zinc-400">Redirigiendo...</p>
    </div>
  )
}
