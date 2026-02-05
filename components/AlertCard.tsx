'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { GeneralAlert } from '@/lib/general-engine'
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  Wallet,
  Brain,
  Dumbbell,
} from 'lucide-react'

const SEVERITY_STYLES = {
  high: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800',
  medium: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800',
  low: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800',
} as const

const SEVERITY_ICON_COLOR = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-blue-500',
} as const

const PILLAR_ICON = {
  economy: Wallet,
  mental: Brain,
  physical: Dumbbell,
} as const

interface AlertCardProps {
  alert: GeneralAlert
}

export default function AlertCard({ alert }: AlertCardProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const SeverityIcon = alert.severity === 'high' ? AlertTriangle
    : alert.severity === 'medium' ? AlertCircle
    : Info

  const PillarIcon = PILLAR_ICON[alert.pillar]

  const handleCta = () => {
    if (!alert.cta) return
    if (alert.cta.action === 'navigate' && alert.cta.href) {
      router.push(alert.cta.href)
    } else if (alert.cta.action === 'chat_prefill' && alert.cta.text) {
      localStorage.setItem('chat_prefill', alert.cta.text)
      router.push('/chat')
    }
  }

  return (
    <div className={`rounded-xl border transition-all ${SEVERITY_STYLES[alert.severity]}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 text-left flex items-center gap-3"
      >
        <SeverityIcon className={`w-5 h-5 flex-shrink-0 ${SEVERITY_ICON_COLOR[alert.severity]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-snug">
            {alert.text}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <PillarIcon className="w-3.5 h-3.5 text-zinc-400" />
          <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && alert.cta && (
        <div className="px-3 pb-3 pl-11">
          <button
            onClick={handleCta}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-all active:scale-95"
          >
            {alert.cta.label}
          </button>
        </div>
      )}
    </div>
  )
}
