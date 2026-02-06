'use client'

import Card from '@/components/ui/Card'
import { MapPin, Trophy, ChevronDown, Store } from 'lucide-react'

interface StoreRanking {
  store: string
  estimatedCost: number
  coverage: number
  badge: 'cheapest' | 'normal' | 'expensive'
  difference?: number
  percentMore?: number
}

interface Props {
  stores: StoreRanking[]
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

const BADGE_CONFIG = {
  cheapest: {
    label: 'Más barato',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/50',
    ring: 'ring-emerald-500/20',
  },
  normal: {
    label: 'Normal',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    text: 'text-zinc-600 dark:text-zinc-400',
    border: 'border-zinc-200 dark:border-zinc-700',
    ring: '',
  },
  expensive: {
    label: 'Caro',
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-200 dark:border-red-800/50',
    ring: '',
  },
}

export default function DecisionCard({ stores }: Props) {
  if (!stores || stores.length === 0) return null

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <MapPin className="w-4 h-4 text-emerald-500" />
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Dónde conviene comprar hoy
        </h3>
      </div>

      <div className="space-y-2">
        {stores.map((store, i) => {
          const badge = BADGE_CONFIG[store.badge]
          const isFirst = i === 0

          return (
            <Card
              key={store.store}
              className={`p-4 transition-all ${
                isFirst
                  ? `ring-1 ${badge.ring} border-emerald-200/60 dark:border-emerald-800/40`
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${
                  isFirst
                    ? 'bg-emerald-500 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                }`}>
                  {i === 0 ? <Trophy className="w-4 h-4" /> : `${i + 1}`}
                </div>

                {/* Store info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {capitalize(store.store)}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {store.coverage}% de tu lista
                    </span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className={`text-base font-bold font-mono ${
                    isFirst ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {formatARS(store.estimatedCost)}
                  </div>
                  {store.difference && store.difference > 0 && (
                    <span className="text-[10px] text-red-500 dark:text-red-400">
                      +{formatARS(store.difference)}
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
