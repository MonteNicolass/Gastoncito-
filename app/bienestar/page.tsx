'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntries, getMovimientos } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import MentalInsightHighlight from '@/components/MentalInsightHighlight'
import { getAverageMood, getMoodTrend, getMoodStreaks, getMoodVariability } from '@/lib/insights/mentalInsights'
import { getSpendingByMood, getMoodByExercise } from '@/lib/insights/crossInsights'
import {
  Brain,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Flame,
  ChevronRight,
  BarChart3,
  BookOpen,
  LineChart,
  Activity,
  Apple,
  Pill,
  Plus,
  Calendar,
  Meh
} from 'lucide-react'

type Tab = 'mental' | 'fisico'

export default function BienestarPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('mental')
  const [loading, setLoading] = useState(true)
  const [mentalStats, setMentalStats] = useState<any>(null)
  const [fisicoStats, setFisicoStats] = useState<any>(null)
  const [crossInsights, setCrossInsights] = useState<any[]>([])

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    try {
      await initDB()
      const entries = await getLifeEntries()

      // Mental
      const mentalEntries = entries.filter((e: any) => e.domain === 'mental' && e.meta?.mood_score)
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const weekEntries = mentalEntries.filter((e: any) => new Date(e.created_at) >= weekAgo)

      const weekAvg = weekEntries.length > 0
        ? weekEntries.reduce((sum: number, e: any) => sum + e.meta.mood_score, 0) / weekEntries.length
        : null

      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const prevWeekEntries = mentalEntries.filter((e: any) => {
        const d = new Date(e.created_at)
        return d >= twoWeeksAgo && d < weekAgo
      })
      const prevWeekAvg = prevWeekEntries.length > 0
        ? prevWeekEntries.reduce((sum: number, e: any) => sum + e.meta.mood_score, 0) / prevWeekEntries.length
        : null

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      let mentalStreak = 0
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dayStart = new Date(checkDate)
        const dayEnd = new Date(checkDate)
        dayEnd.setHours(23, 59, 59, 999)
        const hasEntry = mentalEntries.some((e: any) => {
          const d = new Date(e.created_at)
          return d >= dayStart && d <= dayEnd
        })
        if (hasEntry) mentalStreak++
        else if (i > 0) break
      }

      const daysThisWeek = new Set(
        weekEntries.map((e: any) => new Date(e.created_at).toDateString())
      ).size

      let mentalTrend: 'up' | 'down' | 'stable' = 'stable'
      if (weekAvg !== null && prevWeekAvg !== null) {
        if (weekAvg > prevWeekAvg + 0.5) mentalTrend = 'up'
        else if (weekAvg < prevWeekAvg - 0.5) mentalTrend = 'down'
      }

      let variability: number | null = null
      if (weekEntries.length >= 3) {
        const scores = weekEntries.map((e: any) => e.meta.mood_score)
        const mean = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
        const variance = scores.reduce((sum: number, s: number) => sum + Math.pow(s - mean, 2), 0) / scores.length
        variability = Math.sqrt(variance)
      }

      setMentalStats({ weekAvg, streak: mentalStreak, daysThisWeek, trend: mentalTrend, variability })

      // Físico
      const physicalEntries = entries.filter((e: any) => e.domain === 'physical')
      const physWeekEntries = physicalEntries.filter((e: any) => new Date(e.created_at) >= weekAgo)
      const activeDays = new Set(physWeekEntries.map((e: any) => new Date(e.created_at).toDateString())).size

      const prevPhysEntries = physicalEntries.filter((e: any) => {
        const d = new Date(e.created_at)
        return d >= twoWeeksAgo && d < weekAgo
      })
      const prevActiveDays = new Set(prevPhysEntries.map((e: any) => new Date(e.created_at).toDateString())).size

      let physStreak = 0
      const physActiveDateSet = new Set(
        physicalEntries.filter((e: any) => new Date(e.created_at) >= twoWeeksAgo)
          .map((e: any) => new Date(e.created_at).toDateString())
      )
      for (let i = 0; i < 30; i++) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        if (physActiveDateSet.has(d.toDateString())) physStreak++
        else if (i > 0) break
      }

      let daysSinceLast: number | null = null
      if (physicalEntries.length > 0) {
        const sorted = [...physicalEntries].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        daysSinceLast = Math.floor((now.getTime() - new Date(sorted[0].created_at).getTime()) / (1000 * 60 * 60 * 24))
      }

      let physTrend: 'up' | 'down' | 'stable' = 'stable'
      if (activeDays > prevActiveDays + 1) physTrend = 'up'
      else if (activeDays < prevActiveDays - 1) physTrend = 'down'

      setFisicoStats({ activeDays, streak: physStreak, daysSinceLast, weekActivities: physWeekEntries.length, trend: physTrend })

      // Cross insights
      try {
        const movimientos = await getMovimientos()
        const insights: any[] = []
        const spendMood = getSpendingByMood(movimientos, entries, 30)
        if (spendMood && spendMood.deltaPercent > 15) {
          insights.push({
            text: `En días con peor estado mental, gastaste ${Math.round(spendMood.deltaPercent)}% más.`,
            type: 'spending_mood',
          })
        }
        const moodExercise = getMoodByExercise(entries, 30)
        if (moodExercise && moodExercise.delta > 0.5) {
          insights.push({
            text: `Los días sin ejercicio coinciden con estados ${(Math.round(moodExercise.delta * 10) / 10).toFixed(1)} puntos más bajos.`,
            type: 'exercise_mood',
          })
        }
        setCrossInsights(insights)
      } catch { /* silent */ }
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Bienestar" action={null} backHref={null} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-20 h-20 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24 bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Bienestar" action={null} backHref={null} />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* Segmented control */}
        <div className="flex bg-zinc-200/60 dark:bg-zinc-800/60 rounded-xl p-1 gap-1">
          <button
            onClick={() => setTab('mental')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'mental'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Brain className="w-4 h-4" strokeWidth={1.75} />
            Mental
          </button>
          <button
            onClick={() => setTab('fisico')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              tab === 'fisico'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            <Dumbbell className="w-4 h-4" strokeWidth={1.75} />
            Físico
          </button>
        </div>

        {/* ── MENTAL TAB ── */}
        {tab === 'mental' && (
          <>
            {/* Hero */}
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Esta semana
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {mentalStats?.weekAvg ? (Math.round(mentalStats.weekAvg * 10) / 10) : '–'}
                  </span>
                  <span className="text-xl text-zinc-300 dark:text-zinc-600 font-display">/10</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {mentalStats?.daysThisWeek || 0}/7 días
                  </span>
                  {mentalStats?.trend && mentalStats.trend !== 'stable' && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      mentalStats.trend === 'up'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {mentalStats.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {mentalStats.trend === 'up' ? 'Mejorando' : 'Bajando'}
                    </span>
                  )}
                </div>
              </div>

              {/* Weekly dots */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex gap-1.5 mb-2">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full transition-colors ${
                        i < (mentalStats?.daysThisWeek || 0)
                          ? 'bg-zinc-500'
                          : 'bg-zinc-200 dark:bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                {mentalStats?.streak > 0 && (
                  <div className="flex items-center gap-2">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {mentalStats.streak} días de racha
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick action */}
            <button
              onClick={() => router.push('/chat')}
              className="w-full p-4 rounded-2xl bg-zinc-900 dark:bg-zinc-100 transition-all active:scale-[0.98] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-white dark:text-zinc-900" />
                <div className="text-left">
                  <p className="text-white dark:text-zinc-900 font-semibold text-sm">¿Cómo te sentís?</p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-[10px]">Registrar estado</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/60 dark:text-zinc-900/60" />
            </button>

            {/* Navigation */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
                Explorar
              </h3>
              <div className="space-y-1.5">
                {[
                  { icon: BarChart3, label: 'Resumen mensual', href: '/mental/resumen' },
                  { icon: BookOpen, label: 'Mi diario', href: '/mental/diario' },
                  { icon: LineChart, label: 'Insights', href: '/mental/insights' }
                ].map(({ icon: Icon, label, href }) => (
                  <button
                    key={href}
                    onClick={() => router.push(href)}
                    className="w-full p-3.5 rounded-2xl text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] flex items-center gap-3"
                  >
                    <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" strokeWidth={1.75} />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{label}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                  </button>
                ))}
              </div>
            </div>

            {/* Variability insight */}
            {mentalStats?.variability !== null && mentalStats?.variability > 2 && (
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Meh className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Semana variable</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      Tu estado mental fluctuó bastante esta semana.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── FÍSICO TAB ── */}
        {tab === 'fisico' && (
          <>
            {/* Hero */}
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                  Esta semana
                </p>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {fisicoStats?.activeDays || 0}
                  </span>
                  <span className="text-xl text-zinc-300 dark:text-zinc-600 font-display">días</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-zinc-400 dark:text-zinc-500">
                    {fisicoStats?.weekActivities || 0} actividades
                  </span>
                  {fisicoStats?.trend && fisicoStats.trend !== 'stable' && (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      fisicoStats.trend === 'up'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    }`}>
                      {fisicoStats.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {fisicoStats.trend === 'up' ? 'Más activo' : 'Menos activo'}
                    </span>
                  )}
                </div>
              </div>

              {/* Weekly dots */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex gap-1.5 mb-2">
                  {[...Array(7)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded-full transition-colors ${
                        i < (fisicoStats?.activeDays || 0)
                          ? 'bg-amber-500'
                          : 'bg-zinc-200 dark:bg-zinc-700'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  {fisicoStats?.streak > 0 ? (
                    <div className="flex items-center gap-2">
                      <Flame className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                        {fisicoStats.streak} días de racha
                      </span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      {fisicoStats?.daysSinceLast === 0 ? 'Activo hoy' :
                       fisicoStats?.daysSinceLast === 1 ? 'Último: ayer' :
                       fisicoStats?.daysSinceLast ? `Hace ${fisicoStats.daysSinceLast} días` : 'Sin registros'}
                    </span>
                  )}
                </div>
              </div>
            </Card>

            {/* Quick action */}
            <button
              onClick={() => router.push('/chat')}
              className="w-full p-4 rounded-2xl bg-amber-500 dark:bg-amber-600 transition-all active:scale-[0.98] flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-white" />
                <div className="text-left">
                  <p className="text-white font-semibold text-sm">¿Hiciste ejercicio?</p>
                  <p className="text-amber-100 text-[10px]">Registrar actividad</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-white/60" />
            </button>

            {/* Navigation */}
            <div className="space-y-2">
              <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
                Explorar
              </h3>
              <div className="space-y-1.5">
                {[
                  { icon: BarChart3, label: 'Resumen mensual', href: '/fisico/resumen' },
                  { icon: Activity, label: 'Hábitos', href: '/fisico/habitos' },
                  { icon: Apple, label: 'Comida', href: '/fisico/comida' },
                  { icon: Pill, label: 'Salud', href: '/fisico/salud' },
                  { icon: Dumbbell, label: 'Entrenos', href: '/fisico/entrenos' }
                ].map(({ icon: Icon, label, href }) => (
                  <button
                    key={href}
                    onClick={() => router.push(href)}
                    className="w-full p-3.5 rounded-2xl text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] flex items-center gap-3"
                  >
                    <Icon className="w-4 h-4 text-amber-500 dark:text-amber-400" strokeWidth={1.75} />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{label}</span>
                    <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
                  </button>
                ))}
              </div>
            </div>

            {/* Inactivity warning */}
            {fisicoStats?.daysSinceLast !== null && fisicoStats.daysSinceLast >= 3 && (
              <Card className="p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Retomá el movimiento</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      Hace {fisicoStats.daysSinceLast} días que no registrás actividad.
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* Cross insights (shared) */}
        {crossInsights.length > 0 && (
          <MentalInsightHighlight insights={crossInsights} />
        )}
      </div>
    </div>
  )
}
