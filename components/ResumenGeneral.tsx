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
import { getMentalHistory, type MentalHistory } from '@/lib/history/mental-history'
import { getPhysicalHistory, type PhysicalHistory } from '@/lib/history/physical-history'
import type { Movimiento } from '@/lib/economic-alerts-engine'
import type { MentalRecord } from '@/lib/mental-engine'
import type { PhysicalRecord } from '@/lib/physical-engine'
import { runRatoneandoEngine } from '@/lib/ratoneando'
import AlertCard from '@/components/AlertCard'
import GoalsProgress from '@/components/GoalsProgress'
import NotesPreview from '@/components/NotesPreview'
import EmptyState from '@/components/EmptyState'
import SavingsHighlight from '@/components/SavingsHighlight'
import Card from '@/components/ui/Card'
import TopBar from '@/components/ui/TopBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Brain,
  Dumbbell,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  Flame,
  Activity,
  Layers,
  StickyNote,
  Target,
  CheckCircle,
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
  mentalHistory: MentalHistory
  physHistory: PhysicalHistory
  hasAnyData: boolean
  savingsAmount: number
  savingsSubtitle: string | null
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
      const mentalHistory = getMentalHistory(mentalRecords)
      const physHistory = getPhysicalHistory(physicalRecords)

      const hasAnyData = movimientos.length > 0 || lifeEntries.length > 0

      let savingsAmount = 0
      let savingsSubtitle: string | null = null
      try {
        const rat = await runRatoneandoEngine(movimientos)
        if (rat?.hasData) {
          savingsAmount = rat.totalPotentialSavings || 0
          savingsSubtitle = rat.recommendations?.[0]?.message || null
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
        mentalHistory,
        physHistory,
        hasAnyData,
        savingsAmount,
        savingsSubtitle,
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
          <SavingsHighlight
            amount={data.savingsAmount}
            subtitle={data.savingsSubtitle || undefined}
            href="/money/insights"
          />
        )}

        {/* ── 3. Snapshots por pilar ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Economy */}
          <button
            onClick={() => navigateTo('/money')}
            className="text-left transition-transform active:scale-[0.97]"
          >
            <Card className="p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-1.5 mb-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Money</span>
              </div>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono leading-tight">
                {formatARS(data.econSnap.monthlySpend)}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                {data.econSnap.deltaVsAvgPercent > 10 && <TrendingUp className="w-3 h-3 text-red-500" />}
                {data.econSnap.deltaVsAvgPercent < -10 && <TrendingDown className="w-3 h-3 text-emerald-500" />}
                <span className={`text-[10px] font-medium ${
                  data.econSnap.deltaVsAvgPercent > 10 ? 'text-red-500' :
                  data.econSnap.deltaVsAvgPercent < -10 ? 'text-emerald-500' :
                  'text-zinc-400'
                }`}>
                  {data.econSnap.deltaVsAvgPercent !== 0
                    ? `${data.econSnap.deltaVsAvgPercent > 0 ? '+' : ''}${data.econSnap.deltaVsAvgPercent}% vs 3m`
                    : 'Estable'}
                </span>
              </div>
              {data.econHistory.trend !== 'stable' && (
                <p className="text-[9px] text-zinc-400 mt-1 leading-tight">
                  {data.econHistory.text}
                </p>
              )}
            </Card>
          </button>

          {/* Mental */}
          <button
            onClick={() => navigateTo('/mental')}
            className="text-left transition-transform active:scale-[0.97]"
          >
            <Card className="p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Mental</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                  {data.mentalSnap.avgMoodLast14 !== null ? data.mentalSnap.avgMoodLast14 : '\u2013'}
                </span>
                <span className="text-[10px] text-purple-400">/5</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {data.mentalSnap.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                {data.mentalSnap.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                <span className="text-[10px] text-zinc-400">
                  {data.mentalSnap.daysTrackedLast14 > 0
                    ? `${data.mentalSnap.daysTrackedLast14}d registrados`
                    : 'Sin datos'}
                </span>
              </div>
              {data.mentalHistory.trend !== 'stable' && data.mentalHistory.last7 !== null && (
                <p className="text-[9px] text-zinc-400 mt-1 leading-tight">
                  {data.mentalHistory.text}
                </p>
              )}
            </Card>
          </button>

          {/* Physical */}
          <button
            onClick={() => navigateTo('/fisico')}
            className="text-left transition-transform active:scale-[0.97]"
          >
            <Card className="p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-1.5 mb-2">
                <Dumbbell className="w-4 h-4 text-orange-500" />
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">F\u00edsico</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {data.physSnap.activitiesLast14 ?? 0}
                </span>
                <span className="text-[10px] text-orange-400">d\u00edas</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {data.physSnap.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                {data.physSnap.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                {data.physSnap.lastActivityDaysAgo !== null ? (
                  data.physSnap.lastActivityDaysAgo === 0 ? (
                    <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5">
                      <Flame className="w-3 h-3" /> Hoy
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400">
                      Hace {data.physSnap.lastActivityDaysAgo}d
                    </span>
                  )
                ) : (
                  <span className="text-[10px] text-zinc-400">Sin actividad</span>
                )}
              </div>
              {data.physHistory.trend !== 'stable' && data.physHistory.last30 > 0 && (
                <p className="text-[9px] text-zinc-400 mt-1 leading-tight">
                  {data.physHistory.text}
                </p>
              )}
            </Card>
          </button>
        </div>

        {/* ── 4. Objetivos ── */}
        {data.goalsOverview.activeCount > 0 ? (
          <GoalsProgress overview={data.goalsOverview} />
        ) : (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-2">
              <Target className="w-3 h-3" />
              Objetivos
            </h3>
            <Card className="px-4 py-3">
              <div className="flex items-center gap-2.5">
                <Target className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Sin objetivos activos</span>
              </div>
            </Card>
          </div>
        )}

        {/* ── 5. Notas ── */}
        {data.recentNotes.length > 0 ? (
          <NotesPreview notes={data.recentNotes} />
        ) : (
          <EmptyState
            icon={StickyNote}
            title="Sin notas recientes"
            ctaLabel="Agregar nota"
            ctaPrefill="Nota: "
            compact
          />
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
