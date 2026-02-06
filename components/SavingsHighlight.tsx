'use client'

import Card from '@/components/ui/Card'
import { PiggyBank, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  amount: number
  subtitle?: string
  href?: string
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function SavingsHighlight({ amount, subtitle, href }: Props) {
  const router = useRouter()

  if (!amount || amount < 500) return null

  const handleClick = href ? () => router.push(href) : undefined

  return (
    <button
      onClick={handleClick}
      disabled={!href}
      className="w-full text-left"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />

        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <PiggyBank className="w-6 h-6 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm text-emerald-100 mb-0.5">
              Ahorro potencial este mes
            </p>
            <p className="text-2xl font-bold text-white font-mono tracking-tight">
              {formatARS(amount)}
            </p>
            {subtitle && (
              <p className="text-xs text-emerald-200 mt-1 line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>

          {href && (
            <ChevronRight className="w-5 h-5 text-white/60 flex-shrink-0" />
          )}
        </div>
      </div>
    </button>
  )
}
