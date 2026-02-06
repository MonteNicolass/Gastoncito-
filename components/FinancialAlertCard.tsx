'use client'

import { useRouter } from 'next/navigation'
import Card from '@/components/ui/Card'
import { AlertTriangle, TrendingUp, Tag, ShoppingCart, Receipt, ChevronRight } from 'lucide-react'
import type { FinancialAlert } from '@/lib/finance/alerts'

interface Props {
  alerts: FinancialAlert[]
}

const TYPE_CONFIG: Record<FinancialAlert['type'], { Icon: any; color: string }> = {
  subscription_weight: { Icon: Receipt, color: 'text-purple-500' },
  category_spike: { Icon: TrendingUp, color: 'text-red-500' },
  monthly_outlier: { Icon: AlertTriangle, color: 'text-amber-500' },
  price_above_avg: { Icon: Tag, color: 'text-orange-500' },
  savings_opportunity: { Icon: ShoppingCart, color: 'text-emerald-500' },
}

const SEVERITY_STYLES: Record<FinancialAlert['severity'], string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-blue-400',
}

export default function FinancialAlertCard({ alerts }: Props) {
  const router = useRouter()

  if (alerts.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Alertas financieras
        </h3>
      </div>

      <div className="space-y-1.5">
        {alerts.map((alert) => {
          const cfg = TYPE_CONFIG[alert.type]
          const AlertIcon = cfg.Icon

          return (
            <button
              key={alert.id}
              onClick={() => alert.action && router.push(alert.action.href)}
              disabled={!alert.action}
              className={`w-full text-left border-l-[3px] ${SEVERITY_STYLES[alert.severity]}`}
            >
              <Card className="p-3 hover:shadow-md transition-shadow active:scale-[0.99]">
                <div className="flex items-start gap-3">
                  <AlertIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {alert.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {alert.detail}
                    </p>
                  </div>
                  {alert.action && (
                    <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}
