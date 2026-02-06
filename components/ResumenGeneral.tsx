'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getMovimientos, getLifeEntries, getSubscriptions, getGoals, getNotes } from '@/lib/storage'
import { getStoredPrices } from '@/lib/ratoneando/price-storage'
import {
  getGeneralAlerts,
  getGeneralState,
  getEconomySnapshot,
  getMentalSnapshot,
  getPhysicalSnapshot,
  type GeneralAlert,
  type GeneralState,
  type EconomySnapshot,
  type MentalSnapshot,
  type PhysicalSnapshot,
} from '@/lib/general-engine'
import { getGeneralScore, type GeneralScore } from '@/lib/score/general-score'
import { getGoalsSnapshot, type GoalsOverview } from '@/lib/goals-engine'
import { getEconomyHistory, type EconomyHistory } from '@/lib/history/economy-history'
import type { Movimiento } from '@/lib/economic-alerts-engine'
import type { MentalRecord } from '@/lib/mental-engine'
import type { PhysicalRecord } from '@/lib/physical-engine'
import { runRatoneandoEngine } from '@/lib/ratoneando'
import { getCartItemCount } from '@/lib/cart/cartStore'
import { getMonthComparisonData } from '@/lib/gasti'
import AlertCard from '@/components/AlertCard'
import EmptyState from '@/components/EmptyState'
import Card from '@/components/ui/Card'
import TopBar from '@/components/ui/TopBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  AlertTriangle,
  ChevronRight,
  Layers,
  ShoppingCart,
  Brain,
  Dumbbell,
  Wallet,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────

function formatARS(amount: number): string {
  if (!isFinite(amount)) return '$0'
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

interface LifeEntry {
  id: number
  domain: string
  text: string
  meta?: { mood_score?: number; activity_type?: string; duration_min?: number }
  created_at: string
}

function toMentalRecords(entries: LifeEntry[]): MentalRecord[] {
  return entries
    .filter(e => e.domain === 'mental' && e.meta?.mood_score)
    .map(e => ({
      date: e.created_at.split('T')[0],
      moodLevel: Math.max(1, Math.min(5, Math.round((e.meta!.mood_score! / 10) * 5))),
      tags: [],
    }))
}

function toPhysicalRecords(entries: LifeEntry[]): PhysicalRecord[] {
  return entries
    .filter(e => e.domain === 'physical')
    .map(e => ({
      date: e.created_at.split('T')[0],
      activityType: (e.meta?.activity_type as PhysicalRecord['activityType']) || 'otro',
      durationMin: e.meta?.duration_min || 30,
    }))
}

// ── Skeleton Loaders ─────────────────────────────────────────

function SkeletonState() {
  return (
    <Card className="p-6 space-y-4">
      <Skeleton className="w-24 h-3 rounded" />
      <Skeleton className="w-20 h-10 rounded" />
      <div className="space-y-3">
        <Skeleton className="w-full h-1.5 rounded-full" />
        <Skeleton className="w-full h-1.5 rounded-full" />
        <Skeleton className="w-full h-1.5 rounded-full" />
      </div>
    </Card>
  )
}

// ── Data State ───────────────────────────────────────────────

interface ResumenData {
  alerts: GeneralAlert[]
  state: GeneralState
  econSnap: EconomySnapshot
  mentalSnap: MentalSnapshot
  physSnap: PhysicalSnapshot
  score: GeneralScore
  hasAnyData: boolean
  // Economy
  monthlySpend: number
  deltaPercent: number
  // Mental
  mentalAvg: number | null
  mentalTrend: 'up' | 'down' | 'stable'
  // Physical
  physDaysSinceLast: number | null
  physActiveDays7: number
  physTrend: 'up' | 'down' | 'stable'
  // Cart
  cartItemCount: number
  // Savings
  savingsAmount: number
}

// ── Component ────────────────────────────────────────────────

export default function ResumenGeneral() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ResumenData | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      await initDB()

      const [movimientos, lifeEntries, subscriptions] = await Promise.all([
        getMovimientos() as Promise<Movimiento[]>,
        getLifeEntries() as Promise<LifeEntry[]>,
        getSubscriptions(),
      ])

      const priceHistory = (getStoredPrices() || []).map((p: any) => ({
        product_name: p.product_name,
        price: p.price,
        fetched_at: p.fetched_at,
      }))

      const mentalRecords = toMentalRecords(lifeEntries)
      const physicalRecords = toPhysicalRecords(lifeEntries)

      const engineInput = { movimientos, subscriptions, priceHistory, mentalRecords, physicalRecords }

      const alerts = getGeneralAlerts(engineInput)
      const state = getGeneralState(engineInput)
      const econSnap = getEconomySnapshot(movimientos)
      const mentalSnap = getMentalSnapshot(mentalRecords)
      const physSnap = getPhysicalSnapshot(physicalRecords)
      const score = getGeneralScore({ alerts, econSnap, mentalSnap, physSnap })

      const hasAnyData = movimientos.length > 0 || lifeEntries.length > 0

      // Savings
      let savingsAmount = 0
      try {
        const rat = await runRatoneandoEngine(movimientos)
        if (rat?.hasData) savingsAmount = rat.totalPotentialSavings || 0
      } catch { /* silent */ }

      // Mental average (7d)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

      const mentalEntries = lifeEntries.filter(e => e.domain === 'mental' && e.meta?.mood_score)
      const mentalWeek = mentalEntries.filter(e => new Date(e.created_at) >= weekAgo)
      const mentalPrev = mentalEntries.filter(e => { const d = new Date(e.created_at); return d >= twoWeeksAgo && d < weekAgo })
      const mentalAvg = mentalWeek.length > 0 ? mentalWeek.reduce((s, e) => s + (e.meta?.mood_score || 0), 0) / mentalWeek.length : null
      const mentalPrevAvg = mentalPrev.length > 0 ? mentalPrev.reduce((s, e) => s + (e.meta?.mood_score || 0), 0) / mentalPrev.length : null
      let mentalTrend: 'up' | 'down' | 'stable' = 'stable'
      if (mentalAvg !== null && mentalPrevAvg !== null) {
        if (mentalAvg > mentalPrevAvg + 0.5) mentalTrend = 'up'
        else if (mentalAvg < mentalPrevAvg - 0.5) mentalTrend = 'down'
      }

      // Physical
      const physEntries = lifeEntries.filter(e => e.domain === 'physical')
      const physWeek = physEntries.filter(e => new Date(e.created_at) >= weekAgo)
      const physActiveDays7 = new Set(physWeek.map(e => new Date(e.created_at).toDateString())).size
      const physPrev = physEntries.filter(e => { const d = new Date(e.created_at); return d >= twoWeeksAgo && d < weekAgo })
      const prevActiveDays = new Set(physPrev.map(e => new Date(e.created_at).toDateString())).size
      let physTrend: 'up' | 'down' | 'stable' = 'stable'
      if (physActiveDays7 > prevActiveDays + 1) physTrend = 'up'
      else if (physActiveDays7 < prevActiveDays - 1) physTrend = 'down'

      let physDaysSinceLast: number | null = null
      if (physEntries.length > 0) {
        const sorted = [...physEntries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        physDaysSinceLast = Math.floor((now.getTime() - new Date(sorted[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      }

      setData({
        alerts,
        state,
        econSnap,
        mentalSnap,
        physSnap,
        score,
        hasAnyData,
        monthlySpend: econSnap.monthlySpend,
        deltaPercent: econSnap.deltaVsAvgPercent,
        mentalAvg,
        mentalTrend,
        physDaysSinceLast,
        physActiveDays7,
        physTrend,
        cartItemCount: getCartItemCount(),
        savingsAmount,
      })
    } catch (error) {
      console.error('Error loading resumen:', error)
    } finally {
      setLoading(false)
    }
  }

  const navigateTo = useCallback((path: string) => {
    router.push(path)
  }, [router])

  // ── Loading ──
  if (loading || !data) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Resumen" action={null} backHref={null} />
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          <SkeletonState />
        </div>
      </div>
    )
  }

  // ── Empty State ──
  if (!data.hasAnyData) {
    return (
      <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Resumen" action={null} backHref={null} />
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          <EmptyState
            icon={Layers}
            title="Sin registros todavía"
            subtitle="Usá el chat para registrar gastos, estado o actividad."
            ctaLabel="Registrar"
            ctaHref="/chat"
          />
        </div>
      </div>
    )
  }

  const visibleAlerts = data.alerts.slice(0, 2)
  const showEconDelta = data.deltaPercent !== 0 && Math.abs(data.deltaPercent) > 5

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Resumen" action={null} backHref={null} />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">

        {/* ── 1. Hero: Score + Pillar bars ── */}
        <Card className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                Estado general
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {data.score.score}
                </span>
                <span className="text-lg text-zinc-400 dark:text-zinc-500 font-display">/100</span>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
              data.state.status === 'estable'
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : data.state.status === 'atencion'
                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
              {data.state.status === 'estable' ? 'Estable' : data.state.status === 'atencion' ? 'Atención' : 'Alerta'}
            </div>
          </div>

          {/* Pillar bars */}
          <div className="space-y-3">
            {([
              { key: 'economy' as const, label: 'Economía', color: 'bg-terra-500' },
              { key: 'mental' as const, label: 'Mental', color: 'bg-zinc-500' },
              { key: 'physical' as const, label: 'Físico', color: 'bg-amber-500' },
            ]).map(pillar => {
              const value = data.score.breakdown[pillar.key]
              return (
                <div key={pillar.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">{pillar.label}</span>
                    <span className="text-xs font-mono font-semibold text-zinc-700 dark:text-zinc-300">{value}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${pillar.color}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {/* ── 2. Alerts (max 2, only if exist) ── */}
        {visibleAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" strokeWidth={1.75} />
              Alertas
            </h3>
            {visibleAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* ── 3. Economy snapshot (1 block) ── */}
        <button
          onClick={() => navigateTo('/money')}
          className="w-full text-left transition-transform active:scale-[0.98]"
        >
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-terra-500" strokeWidth={1.75} />
                <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Este mes
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-3xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  {formatARS(data.monthlySpend)}
                </p>
                {data.savingsAmount >= 500 && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    Ahorro potencial: {formatARS(data.savingsAmount)}/mes
                  </p>
                )}
              </div>
              {showEconDelta && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  data.deltaPercent > 0
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {data.deltaPercent > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {data.deltaPercent > 0 ? '+' : ''}{data.deltaPercent.toFixed(0)}%
                </span>
              )}
            </div>
          </Card>
        </button>

        {/* ── 4. Bienestar (Mental + Físico combined, 1 block) ── */}
        <button
          onClick={() => navigateTo('/bienestar')}
          className="w-full text-left transition-transform active:scale-[0.98]"
        >
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                Bienestar
              </span>
              <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Mental */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.75} />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Mental</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">
                    {data.mentalAvg !== null ? (Math.round(data.mentalAvg * 10) / 10).toFixed(1) : '–'}
                  </span>
                  <span className="text-xs text-zinc-400 font-display">/10</span>
                </div>
                {data.mentalTrend !== 'stable' && (
                  <div className="flex items-center gap-1">
                    {data.mentalTrend === 'up'
                      ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                      : <TrendingDown className="w-3 h-3 text-red-500" />
                    }
                    <span className={`text-[10px] font-medium ${
                      data.mentalTrend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {data.mentalTrend === 'up' ? 'Mejorando' : 'Bajando'}
                    </span>
                  </div>
                )}
              </div>
              {/* Físico */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5 text-amber-500" strokeWidth={1.75} />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">Físico</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">
                    {data.physActiveDays7}
                  </span>
                  <span className="text-xs text-zinc-400 font-display">días</span>
                </div>
                {data.physTrend !== 'stable' && (
                  <div className="flex items-center gap-1">
                    {data.physTrend === 'up'
                      ? <TrendingUp className="w-3 h-3 text-emerald-500" />
                      : <TrendingDown className="w-3 h-3 text-red-500" />
                    }
                    <span className={`text-[10px] font-medium ${
                      data.physTrend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {data.physTrend === 'up' ? 'Más activo' : 'Menos activo'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </button>

        {/* ── 5. Cart CTA (only if items) ── */}
        {data.cartItemCount > 0 && (
          <button
            onClick={() => navigateTo('/cart')}
            className="w-full py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <ShoppingCart className="w-4 h-4" />
            Comparar carrito · {data.cartItemCount} productos
          </button>
        )}

        {/* ── 6. Quick links ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigateTo('/chat')}
            className="p-3.5 rounded-2xl bg-terra-500 dark:bg-terra-600 text-white font-semibold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          >
            Registrar
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateTo('/historia')}
            className="p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          >
            Historial
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
