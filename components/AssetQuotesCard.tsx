'use client'

import { useState, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import { TrendingUp, TrendingDown, RefreshCw, WifiOff, DollarSign, Star, Minus } from 'lucide-react'
import { fetchQuotes, type Quote } from '@/lib/market/providers'
import { getCachedQuotes, saveQuotesToCache } from '@/lib/market/quotesCache'
import {
  getFavoriteAssets,
  toggleFavorite,
  saveBulkQuotesToHistory,
  getAssetVariation,
} from '@/lib/market/quoteHistory'

function formatARS(amount: number | null) {
  if (amount === null) return '-'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

const QUOTE_ORDER = ['blue', 'oficial', 'tarjeta', 'mep', 'ccl', 'cripto']

function sortQuotes(quotes: Quote[]): Quote[] {
  return [...quotes].sort((a, b) => {
    const ia = QUOTE_ORDER.indexOf(a.id)
    const ib = QUOTE_ORDER.indexOf(b.id)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })
}

const DOT_COLORS: Record<string, string> = {
  blue: 'bg-blue-500',
  oficial: 'bg-emerald-500',
  tarjeta: 'bg-purple-500',
  mep: 'bg-amber-500',
  ccl: 'bg-orange-500',
  cripto: 'bg-cyan-500',
}

export default function AssetQuotesCard() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<string[]>([])
  const [variations, setVariations] = useState<Record<string, { deltaPercent: number | null }>>({})

  const loadQuotes = useCallback(async (force = false) => {
    setLoading(true)

    // Check cache first
    if (!force) {
      const cached = getCachedQuotes()
      if (cached.quotes.length > 0 && !cached.isStale) {
        setQuotes(sortQuotes(cached.quotes))
        setLastUpdated(cached.lastUpdated)
        setIsOffline(false)
        setLoading(false)
        return
      }
    }

    // Fetch fresh
    try {
      const fresh = await fetchQuotes()
      if (fresh.length > 0) {
        saveQuotesToCache(fresh)
        setQuotes(sortQuotes(fresh))
        setLastUpdated(new Date().toLocaleString('es-AR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }))
        setIsOffline(false)

        // Save to history
        saveBulkQuotesToHistory(fresh.map(q => ({
          id: q.id,
          name: q.name,
          buy: q.buy,
          sell: q.sell,
        })))
      } else {
        // Use stale cache
        const cached = getCachedQuotes()
        setQuotes(sortQuotes(cached.quotes))
        setLastUpdated(cached.lastUpdated)
        setIsOffline(true)
      }
    } catch {
      const cached = getCachedQuotes()
      setQuotes(sortQuotes(cached.quotes))
      setLastUpdated(cached.lastUpdated)
      setIsOffline(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadQuotes()
    setFavorites(getFavoriteAssets())
  }, [loadQuotes])

  // Load variations after quotes load
  useEffect(() => {
    if (quotes.length === 0) return
    const vars: Record<string, { deltaPercent: number | null }> = {}
    for (const q of quotes) {
      const v = getAssetVariation(q.id)
      vars[q.id] = { deltaPercent: v?.deltaPercent ?? null }
    }
    setVariations(vars)
  }, [quotes])

  function handleToggleFavorite(assetId: string) {
    const updated = toggleFavorite(assetId)
    setFavorites(updated)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-blue-500" />
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            Cotizaciones
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {isOffline && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
              <WifiOff className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Offline</span>
            </div>
          )}
          <button
            onClick={() => loadQuotes(true)}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {loading && quotes.length === 0 ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between animate-pulse">
                <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
                <div className="flex gap-4">
                  <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
                  <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : quotes.length === 0 ? (
          <div className="p-6 text-center">
            <DollarSign className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No se pudieron obtener cotizaciones
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase">Tipo</span>
              <div className="flex gap-6">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase w-16 text-right">Compra</span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase w-16 text-right">Venta</span>
                <span className="text-[10px] font-semibold text-zinc-400 uppercase w-12 text-right">Var</span>
              </div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {quotes.map((q) => {
                const isFav = favorites.includes(q.id)
                const variation = variations[q.id]
                const dp = variation?.deltaPercent

                return (
                  <div key={q.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleFavorite(q.id)}
                        className="p-0.5 active:scale-90 transition-transform"
                      >
                        <Star className={`w-3.5 h-3.5 ${isFav ? 'text-amber-500 fill-amber-500' : 'text-zinc-300 dark:text-zinc-600'}`} />
                      </button>
                      <div className={`w-2 h-2 rounded-full ${DOT_COLORS[q.id] || 'bg-zinc-400'}`} />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {q.name}
                      </span>
                    </div>
                    <div className="flex gap-6 items-center">
                      <span className="text-sm font-mono font-semibold text-zinc-700 dark:text-zinc-300 w-16 text-right tabular-nums">
                        {formatARS(q.buy)}
                      </span>
                      <span className="text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 w-16 text-right tabular-nums">
                        {formatARS(q.sell)}
                      </span>
                      <span className={`text-[10px] font-mono font-medium w-12 text-right tabular-nums flex items-center justify-end gap-0.5 ${
                        dp === null ? 'text-zinc-400'
                        : dp > 0 ? 'text-red-500'
                        : dp < 0 ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-zinc-400'
                      }`}>
                        {dp === null ? (
                          <Minus className="w-3 h-3" />
                        ) : dp > 0 ? (
                          <>
                            <TrendingUp className="w-3 h-3" />
                            +{dp}%
                          </>
                        ) : dp < 0 ? (
                          <>
                            <TrendingDown className="w-3 h-3" />
                            {dp}%
                          </>
                        ) : (
                          '0%'
                        )}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            {lastUpdated && (
              <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800">
                <p className="text-[10px] text-zinc-400 text-center">
                  {quotes[0]?.source === 'cache' ? 'Última actualización' : 'Actualizado'}: {lastUpdated}
                </p>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
