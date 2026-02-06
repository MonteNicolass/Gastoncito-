'use client'

import Card from '@/components/ui/Card'
import { Store, Trophy, Medal, ChevronRight } from 'lucide-react'

interface StoreInfo {
  name: string
  totalSpent: number
  visits: number
  avgBasket: number
}

interface Props {
  stores: StoreInfo[]
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const RANK_STYLES = [
  { bg: 'bg-amber-500', text: 'text-white', Icon: Trophy },
  { bg: 'bg-zinc-400 dark:bg-zinc-500', text: 'text-white', Icon: Medal },
  { bg: 'bg-orange-700 dark:bg-orange-800', text: 'text-white', Icon: Medal },
]

export default function BestStoreCard({ stores }: Props) {
  if (!stores || stores.length === 0) return null

  const cheapest = stores.reduce((min, s) => (s.avgBasket < min.avgBasket ? s : min), stores[0])

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 px-1">
        <Store className="w-4 h-4 text-amber-500" />
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
          Dónde comprás
        </h3>
      </div>

      <div className="space-y-2">
        {stores.slice(0, 3).map((store, i) => {
          const isCheapest = store.name === cheapest.name
          const rankStyle = RANK_STYLES[i] || RANK_STYLES[2]
          const RankIcon = rankStyle.Icon

          return (
            <Card
              key={store.name}
              className={`p-4 transition-all ${
                isCheapest ? 'ring-1 ring-emerald-500/20 border-emerald-200/60 dark:border-emerald-800/40' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${rankStyle.bg}`}>
                  <RankIcon className={`w-4 h-4 ${rankStyle.text}`} />
                </div>

                {/* Store info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {capitalize(store.name)}
                    </span>
                    {isCheapest && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        Más barato
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {store.visits} visitas
                    </span>
                    <span className="text-[11px] text-zinc-400">·</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Ticket prom: {formatARS(store.avgBasket)}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="text-right">
                  <span className={`text-base font-bold font-mono ${
                    isCheapest ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'
                  }`}>
                    {formatARS(store.totalSpent)}
                  </span>
                  <p className="text-[10px] text-zinc-400">total</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
