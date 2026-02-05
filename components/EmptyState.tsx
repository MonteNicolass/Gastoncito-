'use client'

import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import type { LucideIcon } from 'lucide-react'

// ── Component ────────────────────────────────────────────────

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  ctaLabel?: string
  ctaHref?: string
  ctaPrefill?: string
  compact?: boolean
}

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  ctaPrefill,
  compact = false,
}: EmptyStateProps) {
  const router = useRouter()

  const handleCta = () => {
    if (ctaPrefill) {
      localStorage.setItem('chat_prefill', ctaPrefill)
      router.push('/chat')
    } else if (ctaHref) {
      router.push(ctaHref)
    }
  }

  return (
    <Card className={compact ? 'p-4 text-center' : 'p-6 text-center'}>
      <div className={`flex justify-center ${compact ? 'mb-2' : 'mb-3'}`}>
        <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          <Icon className="w-5 h-5 text-zinc-400" />
        </div>
      </div>

      <p className={`font-medium text-zinc-700 dark:text-zinc-300 ${compact ? 'text-xs' : 'text-sm'}`}>
        {title}
      </p>

      {subtitle && (
        <p className="text-[11px] text-zinc-400 mt-1">
          {subtitle}
        </p>
      )}

      {ctaLabel && (ctaHref || ctaPrefill) && (
        <button
          onClick={handleCta}
          className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-all active:scale-95"
        >
          {ctaLabel}
        </button>
      )}
    </Card>
  )
}
