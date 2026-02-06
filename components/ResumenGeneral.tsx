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
import { getRecentNotes, type NotePreview } from '@/lib/notes-engine'
import { getEconomyHistory, type EconomyHistory } from '@/lib/history/economy-history'
import type { Movimiento } from '@/lib/economic-alerts-engine'
import type { MentalRecord } from '@/lib/mental-engine'
import type { PhysicalRecord } from '@/lib/physical-engine'
import { runRatoneandoEngine } from '@/lib/ratoneando'
import { getCartItemCount } from '@/lib/cart/cartStore'
import { getMonthComparisonData, getTopCategoriesData } from '@/lib/gasti'
import AlertCard from '@/components/AlertCard'
import GoalsProgress from '@/components/GoalsProgress'
import NotesPreview from '@/components/NotesPreview'
import EmptyState from '@/components/EmptyState'
import SavingsCard from '@/components/SavingsCard'
import MonthlySpendSnapshot from '@/components/MonthlySpendSnapshot'
import FinancialHealthCard from '@/components/FinancialHealthCard'
import FinancialAlertCard from '@/components/FinancialAlertCard'
import { generateFinancialAlerts, type FinancialAlert } from '@/lib/finance/alerts'
import MentalStatusCard from '@/components/MentalStatusCard'
import PhysicalStatusCard from '@/components/PhysicalStatusCard'
import MentalInsightHighlight from '@/components/MentalInsightHighlight'
import { getAverageMood, getMoodTrend, getMoodStreaks } from '@/lib/insights/mentalInsights'
import { getSpendingByMood, getMoodByExercise } from '@/lib/insights/crossInsights'
import Card from '@/components/ui/Card'
import TopBar from '@/components/ui/TopBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  AlertTriangle,
  ChevronRight,
  Activity,
  Layers,
  Target,
  CheckCircle,
  ShoppingCart,
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

// ── Status Config ────────────────────────────────────────────

const STATUS_CONFIG = {
  alerta: {
    gradient: 'from-red-600 via-red-500 to-orange-500',
    icon: AlertTriangle,
  },
  atencion: {
    gradient: 'from-amber-600 via-amber-500 to-yellow-500',
    icon: Activity,
  },
  estable: {
    gradient: 'from-emerald-600 via-emerald-500 to-teal-500',
    icon: Activity,
  },
} as const

// ── Skeleton Loaders ─────────────────────────────────────────

function SkeletonState() {
  return (
    <div className="rounded-2xl p-5 bg-zinc-200 dark:bg-zinc-800 animate-pulse">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <div className="flex-1 space-y-2">
          <Skeleton className="w-full h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <Skeleton className="w-full h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <Skeleton className="w-full h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  )
}

function SkeletonAlerts() {
  return (
    <div className="space-y-2">
      <Skeleton className="w-16 h-3 rounded-lg" />
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-5 h-5 rounded-lg" />
          <Skeleton className="flex-1 h-4 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function SkeletonSnapshots() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[0, 1, 2].map(i => (
        <Card key={i} className="p-3.5">
          <div className="flex items-center gap-1.5 mb-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-10 h-3 rounded" />
          </div>
          <Skeleton className="w-16 h-5 rounded mb-1.5" />
          <Skeleton className="w-12 h-3 rounded" />
        </Card>
      ))}
    </div>
  )
}

function SkeletonGoals() {
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="w-32 h-4 rounded" />
        <Skeleton className="w-8 h-3 rounded" />
      </div>
      <Skeleton className="w-full h-1.5 rounded-full" />
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
  goalsOverview: GoalsOverview
  recentNotes: NotePreview[]
  econHistory: EconomyHistory
  hasAnyData: boolean
  savingsAmount: number
  savingsSubtitle: string | null
  savingsItems: { message: string; amount: number }[]
  monthlyIncome: number
  monthlyExpenses: number
  topCategories: { name: string; amount: number; percent: number; color: string }[]
  subscriptionsTotal: number
  monthComparison: { label: string; amount: number; percent: number; isCurrent: boolean }[]
  mentalAvg: number | null
  mentalCount: number
  mentalTrend: 'Mejorando' | 'Bajando' | 'Estable' | null
  mentalDelta: number | null
  mentalLowStreak: number | null
  physDaysSinceLast: number | null
  physActivities14: number
  physTrend: 'up' | 'down' | 'stable'
  physStreak: number
  physConsistency: boolean[]
  crossInsights: { text: string; type: 'spending_mood' | 'exercise_mood' }[]
  cartItemCount: number
  financialAlerts: FinancialAlert[]
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

      const [movimientos, lifeEntries, subscriptions, goals, notes] = await Promise.all([
        getMovimientos() as Promise<Movimiento[]>,
        getLifeEntries() as Promise<LifeEntry[]>,
        getSubscriptions(),
        getGoals() as Promise<any[]>,
        getNotes() as Promise<any[]>,
      ])

      const priceHistory = (getStoredPrices() || []).map((p: any) => ({
        product_name: p.product_name,
        price: p.price,
        fetched_at: p.fetched_at,
      }))

      const mentalRecords = toMentalRecords(lifeEntries)
      const physicalRecords = toPhysicalRecords(lifeEntries)

      const engineInput = {
        movimientos,
        subscriptions,
        priceHistory,
        mentalRecords,
        physicalRecords,
      }

      const alerts = getGeneralAlerts(engineInput)
      const state = getGeneralState(engineInput)
      const econSnap = getEconomySnapshot(movimientos)
      const mentalSnap = getMentalSnapshot(mentalRecords)
      const physSnap = getPhysicalSnapshot(physicalRecords)

      const score = getGeneralScore({ alerts, econSnap, mentalSnap, physSnap })
      const goalsOverview = getGoalsSnapshot(goals)
      const recentNotes = getRecentNotes(notes, 3)
      const econHistory = getEconomyHistory(movimientos)

      const hasAnyData = movimientos.length > 0 || lifeEntries.length > 0

      let savingsAmount = 0
      let savingsSubtitle: string | null = null
      let savingsItems: { message: string; amount: number }[] = []
      try {
        const rat = await runRatoneandoEngine(movimientos)
        if (rat?.hasData) {
          savingsAmount = rat.totalPotentialSavings || 0
          savingsSubtitle = rat.recommendations?.[0]?.message || null
          savingsItems = (rat.recommendations || []).slice(0, 2).map((r: any) => ({
            message: r.message,
            amount: r.monthlySavings || 0,
          }))
        }
      } catch { /* silent */ }

      // Monthly comparison + top categories for financial health
      const monthCompRaw = getMonthComparisonData(movimientos as any[])
      const monthComparison = (monthCompRaw || []).map((m: any, i: number) => ({
        label: m.month,
        amount: m.total,
        percent: m.percentage,
        isCurrent: i === (monthCompRaw || []).length - 1,
      }))

      const topCatsRaw = getTopCategoriesData(movimientos as any[], 3)
      const topCategories = (topCatsRaw || []).map((c: any) => ({
        name: c.name,
        amount: c.amount,
        percent: c.percentage,
        color: c.color || 'zinc',
      }))

      const now0 = new Date()
      const currentMonthStr = now0.toISOString().slice(0, 7)
      const thisMonthMov = movimientos.filter((m: Movimiento) => m.fecha.startsWith(currentMonthStr))
      const monthlyIncome = thisMonthMov.filter((m: Movimiento) => m.tipo === 'ingreso').reduce((s: number, m: Movimiento) => s + m.monto, 0)
      const monthlyExpenses = thisMonthMov.filter((m: Movimiento) => m.tipo === 'gasto').reduce((s: number, m: Movimiento) => s + m.monto, 0)

      const activeSubs = (subscriptions || []).filter((s: any) => s.active !== false)
      const subscriptionsTotal = activeSubs.reduce((s: number, sub: any) => s + (sub.monto || sub.amount || 0), 0)

      // Mental status
      const avg7 = getAverageMood(lifeEntries, 7)
      const moodTrend = getMoodTrend(lifeEntries)
      const streaks = getMoodStreaks(lifeEntries, 30)

      // Physical status
      const physEntries = lifeEntries.filter((e: LifeEntry) => e.domain === 'physical')
      const now = new Date()
      const today14 = new Date(now)
      today14.setHours(0, 0, 0, 0)
      const twoWeeksAgo = new Date(today14.getTime() - 14 * 24 * 60 * 60 * 1000)
      const weekAgo = new Date(today14.getTime() - 7 * 24 * 60 * 60 * 1000)

      const last14Phys = physEntries.filter((e: LifeEntry) => new Date(e.created_at) >= twoWeeksAgo)
      const activeDateSet = new Set(last14Phys.map((e: LifeEntry) => new Date(e.created_at).toDateString()))
      const physActivities14 = activeDateSet.size

      const thisWeekPhys = new Set(
        physEntries.filter((e: LifeEntry) => new Date(e.created_at) >= weekAgo).map((e: LifeEntry) => new Date(e.created_at).toDateString())
      ).size
      const prevWeekPhys = new Set(
        physEntries.filter((e: LifeEntry) => {
          const d = new Date(e.created_at)
          return d >= twoWeeksAgo && d < weekAgo
        }).map((e: LifeEntry) => new Date(e.created_at).toDateString())
      ).size

      let physTrend: 'up' | 'down' | 'stable' = 'stable'
      if (thisWeekPhys > prevWeekPhys + 1) physTrend = 'up'
      else if (thisWeekPhys < prevWeekPhys - 1) physTrend = 'down'

      let physDaysSinceLast: number | null = null
      let physStreak = 0
      if (physEntries.length > 0) {
        const sorted = [...physEntries].sort((a: LifeEntry, b: LifeEntry) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        physDaysSinceLast = Math.floor((now.getTime() - new Date(sorted[0].created_at).getTime()) / (1000 * 60 * 60 * 24))

        for (let i = 0; i < 30; i++) {
          const d = new Date(today14)
          d.setDate(d.getDate() - i)
          if (activeDateSet.has(d.toDateString())) {
            physStreak++
          } else if (i > 0) {
            break
          }
        }
      }

      const physConsistency: boolean[] = []
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today14)
        d.setDate(d.getDate() - i)
        physConsistency.push(activeDateSet.has(d.toDateString()))
      }

      // Cross insights
      const crossInsights: { text: string; type: 'spending_mood' | 'exercise_mood' }[] = []
      try {
        const spendMood = getSpendingByMood(movimientos, lifeEntries, 30)
        if (spendMood && spendMood.deltaPercent > 15) {
          crossInsights.push({
            text: `En días con peor estado mental, gastaste ${Math.round(spendMood.deltaPercent)}% más.`,
            type: 'spending_mood',
          })
        }
        const moodExercise = getMoodByExercise(lifeEntries, 30)
        if (moodExercise && moodExercise.delta > 0.5) {
          crossInsights.push({
            text: `Los días sin ejercicio coinciden con estados ${(Math.round(moodExercise.delta * 10) / 10).toFixed(1)} puntos más bajos.`,
            type: 'exercise_mood',
          })
        }
      } catch { /* silent */ }

      setData({
        alerts,
        state,
        econSnap,
        mentalSnap,
        physSnap,
        score,
        goalsOverview,
        recentNotes,
        econHistory,
        hasAnyData,
        savingsAmount,
        savingsSubtitle,
        savingsItems,
        monthlyIncome,
        monthlyExpenses,
        topCategories,
        subscriptionsTotal,
        monthComparison,
        mentalAvg: avg7?.average ?? null,
        mentalCount: avg7?.count ?? 0,
        mentalTrend: (moodTrend?.trend as 'Mejorando' | 'Bajando' | 'Estable') ?? null,
        mentalDelta: moodTrend?.delta ?? null,
        mentalLowStreak: streaks?.lowStreak ?? null,
        physDaysSinceLast,
        physActivities14,
        physTrend,
        physStreak,
        physConsistency,
        crossInsights,
        cartItemCount: getCartItemCount(),
        financialAlerts: (() => {
          try {
            const activeSubs = subscriptions.filter((s: any) => s.active !== false)
            return generateFinancialAlerts(movimientos as any[], activeSubs)
          } catch { return [] }
        })(),
      })
    } catch (error) {
      console.error('Error loading resumen:', error)
    } finally {
      setLoading(false)
    }
  }

  // Memoize derived values
  const statusCfg = useMemo(() => {
    if (!data) return STATUS_CONFIG.estable
    return STATUS_CONFIG[data.state.status]
  }, [data])

  const StatusIcon = statusCfg.icon

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
          <SkeletonAlerts />
          <SkeletonSnapshots />
          <SkeletonGoals />
        </div>
      </div>
    )
  }

  // ── Empty State (no data at all) ──
  if (!data.hasAnyData) {
    return (
      <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Resumen" action={null} backHref={null} />
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          <EmptyState
            icon={Layers}
            title="Sin registros todav\u00eda"
            subtitle="Us\u00e1 el chat para registrar gastos, estado o actividad."
            ctaLabel="Registrar"
            ctaHref="/chat"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Resumen" action={null} backHref={null} />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">

        {/* ── 1. Score + Estado General ── */}
        <div className={`relative rounded-2xl p-5 overflow-hidden bg-gradient-to-br ${statusCfg.gradient} transition-all duration-300`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <StatusIcon className="w-5 h-5 text-white/90" />
              <h2 className="text-lg font-bold text-white tracking-tight capitalize">
                {data.state.status === 'estable' ? 'Estable' : data.state.status === 'atencion' ? 'Atenci\u00f3n' : 'Alerta'}
              </h2>
              <span className="ml-auto text-2xl font-bold text-white tabular-nums">
                {data.score.score}
              </span>
            </div>
            {/* Mini breakdown */}
            <div className="flex gap-3">
              {(['economy', 'mental', 'physical'] as const).map(pillar => {
                const value = data.score.breakdown[pillar]
                const label = pillar === 'economy' ? 'Money' : pillar === 'mental' ? 'Mental' : 'F\u00edsico'
                return (
                  <div key={pillar} className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-white/60">{label}</span>
                      <span className="text-[10px] text-white/80 tabular-nums">{value}</span>
                    </div>
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white/80 rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${value}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-white/60 mt-3">
              {data.state.subtitle}
            </p>
          </div>
        </div>

        {/* ── 2. Alertas (max 3) ── */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" />
            Alertas
          </h3>
          {data.alerts.length > 0 ? (
            data.alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          ) : (
            <Card className="px-4 py-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Sin alertas activas</span>
              </div>
            </Card>
          )}
        </div>

        {/* ── 2b. Ahorro potencial ── */}
        {data.savingsAmount >= 500 && (
          <SavingsCard
            totalSavings={data.savingsAmount}
            items={data.savingsItems}
            subtitle="Sin cambiar tus hábitos"
          />
        )}

        {/* ── 2c. Cart CTA ── */}
        {data.cartItemCount > 0 && (
          <button
            onClick={() => navigateTo('/cart')}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-blue-500/20"
          >
            <ShoppingCart className="w-4 h-4" />
            Comparar carrito · {data.cartItemCount} productos
          </button>
        )}

        {/* ── 2d. Financial Alerts ── */}
        {data.financialAlerts.length > 0 && (
          <FinancialAlertCard alerts={data.financialAlerts.slice(0, 3)} />
        )}

        {/* ── 3. Pilares – bloques grandes tappables ── */}

        {/* Economy - Monthly Spend Snapshot */}
        <button
          onClick={() => navigateTo('/money')}
          className="w-full text-left transition-transform active:scale-[0.98]"
        >
          <MonthlySpendSnapshot
            currentSpend={data.econSnap.monthlySpend}
            average={data.monthComparison.length > 0
              ? data.monthComparison.reduce((s, m) => s + m.amount, 0) / data.monthComparison.length
              : data.econSnap.monthlySpend
            }
            deltaPercent={data.econSnap.deltaVsAvgPercent}
            trend={data.econSnap.deltaVsAvgPercent > 10 ? 'up' : data.econSnap.deltaVsAvgPercent < -10 ? 'down' : 'stable'}
            months={data.monthComparison}
          />
        </button>

        {/* Financial Health */}
        {(data.monthlyIncome > 0 || data.topCategories.length > 0) && (
          <button
            onClick={() => navigateTo('/money')}
            className="w-full text-left transition-transform active:scale-[0.98]"
          >
            <FinancialHealthCard
              income={data.monthlyIncome}
              expenses={data.monthlyExpenses}
              topCategories={data.topCategories}
              subscriptionsTotal={data.subscriptionsTotal}
              healthScore={data.score.breakdown.economy}
            />
          </button>
        )}

        {/* Mental */}
        <button
          onClick={() => navigateTo('/mental')}
          className="w-full text-left transition-transform active:scale-[0.98]"
        >
          <MentalStatusCard
            average={data.mentalAvg}
            count={data.mentalCount}
            trend={data.mentalTrend}
            delta={data.mentalDelta}
            lowStreak={data.mentalLowStreak}
            variability={null}
          />
        </button>

        {/* Physical */}
        <button
          onClick={() => navigateTo('/fisico')}
          className="w-full text-left transition-transform active:scale-[0.98]"
        >
          <PhysicalStatusCard
            daysSinceLast={data.physDaysSinceLast}
            activitiesLast14={data.physActivities14}
            trend={data.physTrend}
            streak={data.physStreak}
          />
        </button>

        {/* Cross insight (max 1 in resumen) */}
        {data.crossInsights.length > 0 && (
          <MentalInsightHighlight insights={data.crossInsights.slice(0, 1)} />
        )}

        {/* ── 4. Objetivos ── */}
        {data.goalsOverview.activeCount > 0 ? (
          <GoalsProgress overview={data.goalsOverview} />
        ) : (
          <EmptyState
            icon={Target}
            title="Sin objetivos activos"
            ctaLabel="Crear objetivo"
            ctaHref="/objetivos"
            compact
          />
        )}

        {/* ── 5. Notas ── */}
        {data.recentNotes.length > 0 && (
          <NotesPreview notes={data.recentNotes} />
        )}

        {/* ── 6. Quick links ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigateTo('/chat')}
            className="p-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          >
            Registrar
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigateTo('/historia')}
            className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          >
            Historial
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
