'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getMovimientos, getLifeEntries, getSubscriptions, getGoals, getNotes } from '@/lib/storage'
import { getStoredPrices } from '@/lib/ratoneando/price-storage'
import {
  getGeneralAlerts,
  getGeneralState,
  getEconomySnapshot,
  getMentalSnapshot,
  getPhysicalSnapshot,
  getGeneralProgress,
  type GeneralAlert,
  type GeneralState,
  type EconomySnapshot,
  type MentalSnapshot,
  type PhysicalSnapshot,
  type GeneralProgress,
} from '@/lib/general-engine'
import { getGoalsSnapshot, type GoalsOverview } from '@/lib/goals-engine'
import { getRecentNotes, type NotePreview } from '@/lib/notes-engine'
import type { Movimiento } from '@/lib/economic-alerts-engine'
import type { MentalRecord } from '@/lib/mental-engine'
import type { PhysicalRecord } from '@/lib/physical-engine'
import AlertCard from '@/components/AlertCard'
import GoalsProgress from '@/components/GoalsProgress'
import NotesPreview from '@/components/NotesPreview'
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
  BarChart3,
  Activity,
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────

function formatARS(amount: number): string {
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
      <div className="flex items-center gap-3">
        <Skeleton className="w-6 h-6 rounded-lg bg-zinc-300 dark:bg-zinc-700" />
        <Skeleton className="w-24 h-6 rounded-lg bg-zinc-300 dark:bg-zinc-700" />
      </div>
      <Skeleton className="w-48 h-4 mt-3 rounded-lg bg-zinc-300 dark:bg-zinc-700" />
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
      <div className="flex items-center justify-between mb-1.5">
        <Skeleton className="w-32 h-4 rounded" />
        <Skeleton className="w-8 h-3 rounded" />
      </div>
      <Skeleton className="w-full h-1.5 rounded-full" />
    </Card>
  )
}

// ── Component ────────────────────────────────────────────────

export default function ResumenGeneral() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<GeneralAlert[]>([])
  const [state, setState] = useState<GeneralState | null>(null)
  const [econSnap, setEconSnap] = useState<EconomySnapshot | null>(null)
  const [mentalSnap, setMentalSnap] = useState<MentalSnapshot | null>(null)
  const [physSnap, setPhysSnap] = useState<PhysicalSnapshot | null>(null)
  const [progress, setProgress] = useState<GeneralProgress | null>(null)
  const [goalsOverview, setGoalsOverview] = useState<GoalsOverview | null>(null)
  const [recentNotes, setRecentNotes] = useState<NotePreview[]>([])

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      await initDB()

      const movimientos: Movimiento[] = await getMovimientos()
      const lifeEntries: LifeEntry[] = await getLifeEntries()
      const subscriptions = await getSubscriptions()
      const goals: any[] = await getGoals()
      const notes: any[] = await getNotes()
      const priceHistory = (getStoredPrices() || []).map((p: any) => ({
        product_name: p.product_name,
        price: p.price,
        fetched_at: p.fetched_at,
      }))

      const mentalRecords = toMentalRecords(lifeEntries)
      const physicalRecords = toPhysicalRecords(lifeEntries)

      const input = {
        movimientos,
        subscriptions,
        priceHistory,
        mentalRecords,
        physicalRecords,
      }

      setAlerts(getGeneralAlerts(input))
      setState(getGeneralState(input))
      setEconSnap(getEconomySnapshot(movimientos))
      setMentalSnap(getMentalSnapshot(mentalRecords))
      setPhysSnap(getPhysicalSnapshot(physicalRecords))
      setProgress(getGeneralProgress(mentalRecords, physicalRecords, movimientos))
      setGoalsOverview(getGoalsSnapshot(goals))
      setRecentNotes(getRecentNotes(notes, 3))
    } catch (error) {
      console.error('Error loading resumen:', error)
    } finally {
      setLoading(false)
    }
  }

  // ── Loading ──
  if (loading) {
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

  const statusCfg = state ? STATUS_CONFIG[state.status] : STATUS_CONFIG.estable
  const StatusIcon = statusCfg.icon

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Resumen" action={null} backHref={null} />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">

        {/* ── 1. Estado General ── */}
        {state && (
          <div className={`relative rounded-2xl p-5 overflow-hidden bg-gradient-to-br ${statusCfg.gradient} transition-all duration-300`}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative">
              <div className="flex items-center gap-3">
                <StatusIcon className="w-6 h-6 text-white/90" />
                <h2 className="text-xl font-bold text-white tracking-tight capitalize">
                  {state.status === 'estable' ? 'Estable' : state.status === 'atencion' ? 'Atenci\u00f3n' : 'Alerta'}
                </h2>
              </div>
              <p className="text-sm text-white/75 mt-2">
                {state.subtitle}
              </p>
            </div>
          </div>
        )}

        {/* ── 2. Alertas (max 3, hidden if empty) ── */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Alertas
            </h3>
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}

        {/* ── 3. Snapshots por pilar ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Economy */}
          <button
            onClick={() => router.push('/money')}
            className="text-left transition-transform active:scale-[0.97]"
          >
            <Card className="p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-1.5 mb-2">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Money</span>
              </div>
              <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono leading-tight">
                {econSnap ? formatARS(econSnap.monthlySpend) : '\u2013'}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                {econSnap && econSnap.deltaVsAvgPercent > 10 && (
                  <TrendingUp className="w-3 h-3 text-red-500" />
                )}
                {econSnap && econSnap.deltaVsAvgPercent < -10 && (
                  <TrendingDown className="w-3 h-3 text-emerald-500" />
                )}
                <span className={`text-[10px] font-medium ${
                  econSnap && econSnap.deltaVsAvgPercent > 10 ? 'text-red-500' :
                  econSnap && econSnap.deltaVsAvgPercent < -10 ? 'text-emerald-500' :
                  'text-zinc-400'
                }`}>
                  {econSnap && econSnap.deltaVsAvgPercent !== 0
                    ? `${econSnap.deltaVsAvgPercent > 0 ? '+' : ''}${econSnap.deltaVsAvgPercent}% vs 3m`
                    : 'Estable'}
                </span>
              </div>
              {econSnap?.mainCategory && (
                <p className="text-[10px] text-zinc-400 mt-1 truncate">
                  Top: {econSnap.mainCategory}
                </p>
              )}
            </Card>
          </button>

          {/* Mental */}
          <button
            onClick={() => router.push('/mental')}
            className="text-left transition-transform active:scale-[0.97]"
          >
            <Card className="p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-1.5 mb-2">
                <Brain className="w-4 h-4 text-purple-500" />
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Mental</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                  {mentalSnap?.avgMoodLast14 !== null && mentalSnap?.avgMoodLast14 !== undefined
                    ? mentalSnap.avgMoodLast14
                    : '\u2013'}
                </span>
                <span className="text-[10px] text-purple-400">/5</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {mentalSnap?.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                {mentalSnap?.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                <span className="text-[10px] text-zinc-400">
                  {mentalSnap && mentalSnap.daysTrackedLast14 > 0
                    ? `${mentalSnap.daysTrackedLast14}d registrados`
                    : 'Sin datos'}
                </span>
              </div>
            </Card>
          </button>

          {/* Physical */}
          <button
            onClick={() => router.push('/fisico')}
            className="text-left transition-transform active:scale-[0.97]"
          >
            <Card className="p-3.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-center gap-1.5 mb-2">
                <Dumbbell className="w-4 h-4 text-orange-500" />
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">F\u00edsico</span>
              </div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                  {physSnap?.activitiesLast14 ?? 0}
                </span>
                <span className="text-[10px] text-orange-400">d\u00edas</span>
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                {physSnap?.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                {physSnap?.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                {physSnap?.lastActivityDaysAgo !== null && physSnap?.lastActivityDaysAgo !== undefined ? (
                  physSnap.lastActivityDaysAgo === 0 ? (
                    <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5">
                      <Flame className="w-3 h-3" /> Hoy
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400">
                      Hace {physSnap.lastActivityDaysAgo}d
                    </span>
                  )
                ) : (
                  <span className="text-[10px] text-zinc-400">Sin actividad</span>
                )}
              </div>
            </Card>
          </button>
        </div>

        {/* ── 4. Objetivos activos ── */}
        {goalsOverview && <GoalsProgress overview={goalsOverview} />}

        {/* ── 5. Constancia de registro ── */}
        {progress && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Constancia de registro
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {progress.trackingConsistencyPercent}%
              </span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  progress.trackingConsistencyPercent >= 70
                    ? 'bg-emerald-500'
                    : progress.trackingConsistencyPercent >= 40
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${progress.trackingConsistencyPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              {progress.trackingConsistencyPercent >= 70
                ? 'Buen ritmo de registro'
                : progress.trackingConsistencyPercent >= 40
                ? 'Registrando de forma intermitente'
                : 'Pocos d\u00edas con registros'}
            </p>
          </Card>
        )}

        {/* ── 6. Notas recientes ── */}
        <NotesPreview notes={recentNotes} />

        {/* ── 7. Quick links ── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => router.push('/chat')}
            className="p-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
          >
            Registrar
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => router.push('/historia')}
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
