'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  getEconomicAlerts,
  type EconomicAlert,
  type Movimiento,
  type Subscription,
  type PriceRecord,
} from '@/lib/economic-alerts-engine'
import { initDB, getMovimientos, getLifeEntries, getGoals, getSubscriptions } from '@/lib/storage'
import { getStoredPrices } from '@/lib/ratoneando/price-storage'
import Card from '@/components/ui/Card'
import TopBar from '@/components/ui/TopBar'
import { SkeletonHero, SkeletonCard } from '@/components/ui/Skeleton'
import {
  Brain,
  Dumbbell,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Flame,
  BarChart3,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

interface LifeEntry {
  id: number
  domain: string
  text: string
  meta?: { mood_score?: number }
  created_at: string
}

interface Goal {
  id: number
  title: string
  status: string
  progress: number
  target: number
}

interface DayState {
  label: string
  subtitle: string
  score: number
}

interface PillarSnapshot {
  money: { total: number; delta: number; trend: 'up' | 'down' | 'stable' }
  mental: { avg: number | null; trend: 'up' | 'down' | 'stable'; entries: number }
  physical: { days: number; streak: number }
}

interface WeeklyProgression {
  label: string
  count: number
  target: number
}

// ── Helpers ──────────────────────────────────────────────────

function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

// ── Component ────────────────────────────────────────────────

export default function ResumenGeneral() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [alerts, setAlerts] = useState<EconomicAlert[]>([])
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null)
  const [dayState, setDayState] = useState<DayState | null>(null)
  const [pillar, setPillar] = useState<PillarSnapshot | null>(null)
  const [progression, setProgression] = useState<WeeklyProgression | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      await initDB()

      const movimientos: Movimiento[] = await getMovimientos()
      const lifeEntries: LifeEntry[] = await getLifeEntries()
      const goals: Goal[] = await getGoals()
      const subscriptions: Subscription[] = await getSubscriptions()
      const priceHistory: PriceRecord[] = (getStoredPrices() || []).map((p: any) => ({
        product_name: p.product_name,
        price: p.price,
        fetched_at: p.fetched_at,
      }))

      // ── Compute alerts ──
      const economicAlerts = getEconomicAlerts({
        movimientos,
        subscriptions,
        priceHistory,
      })
      setAlerts(economicAlerts)

      // ── Compute day state ──
      const now = new Date()
      const todayStart = new Date(now)
      todayStart.setHours(0, 0, 0, 0)

      const gastos = movimientos.filter(m => m.tipo === 'gasto')
      const todayGastos = gastos.filter(m => new Date(m.fecha) >= todayStart)
      const todayTotal = todayGastos.reduce((s, m) => s + m.monto, 0)

      const todayMental = lifeEntries.filter(
        e => e.domain === 'mental' && e.meta?.mood_score && new Date(e.created_at) >= todayStart
      )
      const todayMood = todayMental.length > 0
        ? todayMental.reduce((s, e) => s + (e.meta?.mood_score || 0), 0) / todayMental.length
        : null

      const todayPhysical = lifeEntries.some(
        e => e.domain === 'physical' && new Date(e.created_at) >= todayStart
      )

      // Simple day score: average of available signals
      let score = 50
      let factors = 0
      if (todayMood !== null) { score += (todayMood - 5) * 10; factors++ }
      if (todayPhysical) { score += 15; factors++ }
      if (todayTotal > 0) {
        const thirtyAgo = new Date(now.getTime() - 30 * MS_PER_DAY)
        const last30 = gastos.filter(g => new Date(g.fecha) >= thirtyAgo)
        const avgDaily = last30.length > 0
          ? last30.reduce((s, g) => s + g.monto, 0) / 30
          : 0
        if (avgDaily > 0 && todayTotal > avgDaily * 1.25) score -= 10
        else if (avgDaily > 0 && todayTotal < avgDaily * 0.8) score += 5
        factors++
      }
      score = Math.max(0, Math.min(100, Math.round(score)))

      const label = score >= 70 ? 'Buen día' : score >= 45 ? 'Día normal' : 'Día complicado'
      const parts: string[] = []
      if (todayMood !== null) parts.push(`Ánimo ${(Math.round(todayMood * 10) / 10)}/10`)
      if (todayPhysical) parts.push('Ejercicio hecho')
      if (todayTotal > 0) parts.push(`Gastaste ${formatARS(todayTotal)}`)
      const subtitle = parts.length > 0 ? parts.join(' · ') : 'Sin registros hoy'

      setDayState({ label, subtitle, score })

      // ── Compute pillar snapshots ──
      const weekAgo = new Date(now.getTime() - 7 * MS_PER_DAY)
      const twoWeeksAgo = new Date(now.getTime() - 14 * MS_PER_DAY)

      // Money
      const weekGastos = gastos.filter(g => new Date(g.fecha) >= weekAgo)
      const prevWeekGastos = gastos.filter(g => {
        const d = new Date(g.fecha)
        return d >= twoWeeksAgo && d < weekAgo
      })
      const weekTotal = weekGastos.reduce((s, g) => s + g.monto, 0)
      const prevWeekTotal = prevWeekGastos.reduce((s, g) => s + g.monto, 0)
      const moneyDelta = prevWeekTotal > 0
        ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100)
        : 0
      const moneyTrend: 'up' | 'down' | 'stable' =
        moneyDelta > 10 ? 'up' : moneyDelta < -10 ? 'down' : 'stable'

      // Mental
      const weekMental = lifeEntries.filter(
        e => e.domain === 'mental' && e.meta?.mood_score && new Date(e.created_at) >= weekAgo
      )
      const prevWeekMental = lifeEntries.filter(e => {
        const d = new Date(e.created_at)
        return e.domain === 'mental' && e.meta?.mood_score && d >= twoWeeksAgo && d < weekAgo
      })
      const mentalAvg = weekMental.length > 0
        ? weekMental.reduce((s, e) => s + (e.meta?.mood_score || 0), 0) / weekMental.length
        : null
      const prevMentalAvg = prevWeekMental.length > 0
        ? prevWeekMental.reduce((s, e) => s + (e.meta?.mood_score || 0), 0) / prevWeekMental.length
        : null
      let mentalTrend: 'up' | 'down' | 'stable' = 'stable'
      if (mentalAvg !== null && prevMentalAvg !== null) {
        if (mentalAvg > prevMentalAvg + 0.5) mentalTrend = 'up'
        else if (mentalAvg < prevMentalAvg - 0.5) mentalTrend = 'down'
      }

      // Physical
      const weekPhysical = lifeEntries.filter(
        e => e.domain === 'physical' && new Date(e.created_at) >= weekAgo
      )
      const physicalDays = new Set(
        weekPhysical.map(e => new Date(e.created_at).toDateString())
      ).size

      let streak = 0
      const checkDay = new Date(todayStart)
      for (let i = 0; i < 30; i++) {
        const dayStr = checkDay.toDateString()
        const hasEntry = lifeEntries.some(
          e => e.domain === 'physical' && new Date(e.created_at).toDateString() === dayStr
        )
        if (hasEntry) {
          streak++
        } else if (i > 0) {
          break
        }
        checkDay.setDate(checkDay.getDate() - 1)
      }

      setPillar({
        money: { total: weekTotal, delta: moneyDelta, trend: moneyTrend },
        mental: { avg: mentalAvg, trend: mentalTrend, entries: weekMental.length },
        physical: { days: physicalDays, streak },
      })

      // ── Weekly progression (total records this week) ──
      const weekEntries = lifeEntries.filter(e => new Date(e.created_at) >= weekAgo)
      const weekMovimientos = movimientos.filter(m => new Date(m.fecha) >= weekAgo)
      const totalRecords = weekEntries.length + weekMovimientos.length

      setProgression({
        label: 'Registros esta semana',
        count: totalRecords,
        target: 14, // ~2 per day target
      })
    } catch (error) {
      console.error('Error loading resumen:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAlertAction = (alert: EconomicAlert) => {
    if (alert.cta.action === 'navigate' && alert.cta.href) {
      router.push(alert.cta.href)
    } else if (alert.cta.action === 'chat_prefill' && alert.cta.text) {
      localStorage.setItem('chat_prefill', alert.cta.text)
      router.push('/chat')
    }
  }

  const getScoreGradient = (score: number) => {
    if (score >= 70) return 'from-emerald-600 via-emerald-500 to-teal-500'
    if (score >= 45) return 'from-blue-600 via-blue-500 to-indigo-500'
    return 'from-orange-600 via-orange-500 to-amber-500'
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Resumen" action={null} backHref={null} />
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <SkeletonHero />
          <div className="grid grid-cols-3 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Resumen" action={null} backHref={null} />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">

        {/* ── 1. Estado general del día ── */}
        {dayState && (
          <div className={`relative rounded-2xl p-5 overflow-hidden bg-gradient-to-br ${getScoreGradient(dayState.score)}`}>
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative">
              <div className="flex items-baseline justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  {dayState.label}
                </h2>
                <span className="text-lg font-bold text-white/80">
                  {dayState.score}
                </span>
              </div>
              <p className="text-sm text-white/75 mt-1">
                {dayState.subtitle}
              </p>
            </div>
          </div>
        )}

        {/* ── 2. Alertas activas (max 3, hidden if empty) ── */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Alertas
            </h3>
            {alerts.map((alert) => {
              const isExpanded = expandedAlertId === alert.id
              const SeverityIcon = alert.severity === 'high' ? AlertTriangle
                : alert.severity === 'medium' ? AlertCircle
                : Info
              const severityColor = alert.severity === 'high'
                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                : alert.severity === 'medium'
                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
              const iconColor = alert.severity === 'high' ? 'text-red-500'
                : alert.severity === 'medium' ? 'text-amber-500'
                : 'text-blue-500'

              return (
                <div
                  key={alert.id}
                  className={`rounded-xl border transition-all ${severityColor}`}
                >
                  <button
                    onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                    className="w-full p-3 text-left flex items-center gap-3"
                  >
                    <SeverityIcon className={`w-5 h-5 flex-shrink-0 ${iconColor}`} />
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 flex-1 leading-snug">
                      {alert.text}
                    </p>
                    <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pl-11">
                      <button
                        onClick={() => handleAlertAction(alert)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-all active:scale-95"
                      >
                        {alert.cta.label}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── 3. Snapshot por pilar ── */}
        {pillar && (
          <div className="grid grid-cols-3 gap-3">
            {/* Money */}
            <button onClick={() => router.push('/money')} className="text-left">
              <Card className="p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Wallet className="w-4 h-4 text-emerald-500" />
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Money</span>
                </div>
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100 font-mono leading-tight">
                  {formatARS(pillar.money.total)}
                </p>
                <div className="flex items-center gap-1 mt-1.5">
                  {pillar.money.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-red-500" />
                  ) : pillar.money.trend === 'down' ? (
                    <TrendingDown className="w-3 h-3 text-emerald-500" />
                  ) : null}
                  <span className={`text-[10px] font-medium ${
                    pillar.money.delta > 0 ? 'text-red-500' : pillar.money.delta < 0 ? 'text-emerald-500' : 'text-zinc-400'
                  }`}>
                    {pillar.money.delta !== 0 ? `${pillar.money.delta > 0 ? '+' : ''}${pillar.money.delta}% sem` : 'Estable'}
                  </span>
                </div>
              </Card>
            </button>

            {/* Mental */}
            <button onClick={() => router.push('/mental')} className="text-left">
              <Card className="p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Mental</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-base font-bold text-purple-600 dark:text-purple-400">
                    {pillar.mental.avg !== null ? (Math.round(pillar.mental.avg * 10) / 10) : '–'}
                  </span>
                  <span className="text-[10px] text-purple-400">/10</span>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  {pillar.mental.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500" />}
                  {pillar.mental.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-500" />}
                  <span className="text-[10px] text-zinc-400">
                    {pillar.mental.entries > 0 ? `${pillar.mental.entries} registros` : 'Sin datos'}
                  </span>
                </div>
              </Card>
            </button>

            {/* Physical */}
            <button onClick={() => router.push('/fisico')} className="text-left">
              <Card className="p-3.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <Dumbbell className="w-4 h-4 text-orange-500" />
                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">Físico</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-base font-bold text-orange-600 dark:text-orange-400">
                    {pillar.physical.days}
                  </span>
                  <span className="text-[10px] text-orange-400">días</span>
                </div>
                {pillar.physical.streak > 0 && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="text-[10px] text-orange-500 font-medium">
                      {pillar.physical.streak}d racha
                    </span>
                  </div>
                )}
                {pillar.physical.streak === 0 && (
                  <span className="text-[10px] text-zinc-400 mt-1.5 block">
                    {pillar.physical.days > 0 ? 'Sin racha' : 'Sin actividad'}
                  </span>
                )}
              </Card>
            </button>
          </div>
        )}

        {/* ── 4. Progresión semanal ── */}
        {progression && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {progression.label}
                </span>
              </div>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {progression.count}
                <span className="text-zinc-400 font-normal">/{progression.target}</span>
              </span>
            </div>
            <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  progression.count >= progression.target
                    ? 'bg-emerald-500'
                    : progression.count >= progression.target * 0.5
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, (progression.count / progression.target) * 100)}%` }}
              />
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              {progression.count >= progression.target
                ? 'Objetivo semanal alcanzado'
                : `${progression.target - progression.count} registros para llegar al objetivo`}
            </p>
          </Card>
        )}

        {/* ── Quick links ── */}
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
