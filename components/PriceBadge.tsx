'use client'

import type { PriceLabel } from '@/lib/classify-price'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'

interface Props {
  label: PriceLabel
  deltaPercent?: number
  size?: 'sm' | 'md'
}

const CONFIG: Record<PriceLabel, {
  text: string
  bg: string
  textColor: string
  icon: typeof TrendingDown
}> = {
  barato: {
    text: 'Barato',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    icon: TrendingDown,
  },
  normal: {
    text: 'En tu promedio',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    textColor: 'text-zinc-600 dark:text-zinc-400',
    icon: Minus,
  },
  caro: {
    text: 'Caro',
    bg: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-300',
    icon: TrendingUp,
  },
}

export default function PriceBadge({ label, deltaPercent, size = 'sm' }: Props) {
  const cfg = CONFIG[label]
  const Icon = cfg.icon

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-[10px] gap-1'
    : 'px-2.5 py-1 text-xs gap-1.5'

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'

  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${cfg.bg} ${cfg.textColor} ${sizeClasses}`}>
      <Icon className={iconSize} />
      {cfg.text}
      {deltaPercent !== undefined && deltaPercent !== 0 && (
        <span className="opacity-70">
          {deltaPercent > 0 ? '+' : ''}{deltaPercent}%
        </span>
      )}
    </span>
  )
}
