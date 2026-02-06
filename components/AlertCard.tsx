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
  high: 'bg-red-50 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/40',
  medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40',
  low: 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200/60 dark:border-zinc-700/50',
} as const

const SEVERITY_ICON_COLOR = {
  high: 'text-red-500',
  medium: 'text-amber-500',
  low: 'text-zinc-400',
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
    <div className={`rounded-2xl border transition-all ${SEVERITY_STYLES[alert.severity]}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3.5 text-left flex items-center gap-3"
      >
        <SeverityIcon className={`w-4 h-4 flex-shrink-0 ${SEVERITY_ICON_COLOR[alert.severity]}`} strokeWidth={1.75} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
            {alert.text}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <PillarIcon className="w-3 h-3 text-zinc-400" strokeWidth={1.75} />
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {expanded && alert.cta && (
        <div className="px-3.5 pb-3.5 pl-11">
          <button
            onClick={handleCta}
            className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-all active:scale-95 uppercase tracking-wider"
          >
            {alert.cta.label}
          </button>
        </div>
      )}
    </div>
  )
}
