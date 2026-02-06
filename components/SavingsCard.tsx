'use client'

import { PiggyBank, ArrowDownRight, Lightbulb } from 'lucide-react'

interface SavingsItem {
  message: string
  amount: number
}

interface Props {
  totalSavings: number
  items: SavingsItem[]
  subtitle?: string
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function SavingsCard({ totalSavings, items, subtitle }: Props) {
  if (!totalSavings || totalSavings < 500) return null

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-5">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8" />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <PiggyBank className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-emerald-100 font-medium uppercase tracking-wider">
              Ahorro potencial / mes
            </p>
            <p className="text-3xl font-bold text-white font-mono tracking-tight mt-0.5">
              {formatARS(totalSavings)}
            </p>
          </div>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm text-emerald-100">
            {subtitle}
          </p>
        )}

        {/* Recommendations */}
        {items.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-white/20">
            {items.slice(0, 2).map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {i === 0 ? (
                    <ArrowDownRight className="w-3 h-3 text-white" />
                  ) : (
                    <Lightbulb className="w-3 h-3 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/90 leading-relaxed line-clamp-2">
                    {item.message}
                  </p>
                  {item.amount > 0 && (
                    <p className="text-[11px] text-emerald-200 font-mono font-medium mt-0.5">
                      ~{formatARS(item.amount)}/mes
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
