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
    <Card className={compact ? 'p-5 text-center' : 'p-8 text-center'}>
      <div className={`flex justify-center ${compact ? 'mb-3' : 'mb-4'}`}>
        <Icon className="w-6 h-6 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
      </div>

      <p className={`font-display font-medium text-zinc-700 dark:text-zinc-300 ${compact ? 'text-xs' : 'text-sm'}`}>
        {title}
      </p>

      {subtitle && (
        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1.5 leading-relaxed">
          {subtitle}
        </p>
      )}

      {ctaLabel && (ctaHref || ctaPrefill) && (
        <button
          onClick={handleCta}
          className="mt-4 px-5 py-2 rounded-xl text-[10px] font-semibold bg-terra-500 dark:bg-terra-600 text-white transition-all active:scale-95 uppercase tracking-wider"
        >
          {ctaLabel}
        </button>
      )}
    </Card>
  )
}
