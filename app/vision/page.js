'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals } from '@/lib/storage'
import { getAllSilentAlerts } from '@/lib/silent-alerts'
import { getSpendingByMood, getMoodByExercise, getImpulsiveSpendingByExercise } from '@/lib/insights/crossInsights'
import { detectAllAnomalies } from '@/lib/anomaly-detection'
import { evaluateUserRules } from '@/lib/user-rules'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ProgressRing from '@/components/ui/ProgressRing'
import Avatar from '@/components/ui/Avatar'
import { SkeletonHero, SkeletonCard } from '@/components/ui/Skeleton'
import {
  Brain,
  Dumbbell,
  Wallet,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Lightbulb,
  ChevronRight,
  BarChart3,
  Settings,
  Flame,
  Calendar
} from 'lucide-react'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function ResumenPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('hoy')
  const [data, setData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [crossInsights, setCrossInsights] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [widgetConfig, setWidgetConfig] = useState(() => {
    if (typeof window === 'undefined') return { money: true, mental: true, fisico: true, insights: true, alertas: true, historial: true }
    const saved = localStorage.getItem('resumen_widgets')
    return saved ? JSON.parse(saved) : { money: true, mental: true, fisico: true, insights: true, alertas: true, historial: true }
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('resumen_widgets', JSON.stringify(widgetConfig))
    }
  }, [widgetConfig])

  useEffect(() => {
    loadData()
  }, [period])

  async function loadData() {
    try {
      setLoading(true)
      await initDB()
      const movimientos = await getMovimientos()
      const lifeEntries = await getLifeEntries()
      const categorias = await getCategorias()
      const goals = await getGoals()
      const budgets = getBudgetsFromLocalStorage()

      const now = new Date()
      let startDate, previousStartDate, previousEndDate

      if (period === 'hoy') {
        startDate = new Date()
        startDate.setHours(0, 0, 0, 0)
        previousStartDate = new Date(startDate)
        previousStartDate.setDate(previousStartDate.getDate() - 1)
        previousEndDate = new Date(startDate)
      } else if (period === 'semana') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000)
        previousEndDate = new Date(startDate)
      } else if (period === 'mes') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0)
      }

      const filteredMovimientos = movimientos.filter(m => new Date(m.fecha) >= startDate)
      const filteredEntries = lifeEntries.filter(e => new Date(e.created_at) >= startDate)

      const previousMovimientos = movimientos.filter(m => {
        const fecha = new Date(m.fecha)
        return fecha >= previousStartDate && fecha < previousEndDate
      })
      const previousEntries = lifeEntries.filter(e => {
        const fecha = new Date(e.created_at)
        return fecha >= previousStartDate && fecha < previousEndDate
      })

      const gastoTotal = filteredMovimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
      const ingresoTotal = filteredMovimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
      const gastoPrevio = previousMovimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
      const gastoDiff = gastoPrevio > 0 ? ((gastoTotal - gastoPrevio) / gastoPrevio) * 100 : 0

      const mentalEntries = filteredEntries.filter(e => e.domain === 'mental' && e.meta?.mood_score)
      const mentalAvg = mentalEntries.length > 0
        ? mentalEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / mentalEntries.length
        : null

      const prevMentalEntries = previousEntries.filter(e => e.domain === 'mental' && e.meta?.mood_score)
      const prevMentalAvg = prevMentalEntries.length > 0
        ? prevMentalEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / prevMentalEntries.length
        : null

      let mentalTrend = 'stable'
      if (mentalAvg !== null && prevMentalAvg !== null) {
        if (mentalAvg > prevMentalAvg + 0.5) mentalTrend = 'up'
        else if (mentalAvg < prevMentalAvg - 0.5) mentalTrend = 'down'
      }

      const physicalDays = new Set(
        filteredEntries
          .filter(e => e.domain === 'physical')
          .map(e => {
            const d = new Date(e.created_at)
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
          })
      ).size

      let physicalStreak = 0
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today)
        checkDate.setDate(checkDate.getDate() - i)
        const dayStart = new Date(checkDate)
        const dayEnd = new Date(checkDate)
        dayEnd.setHours(23, 59, 59, 999)

        const hasActivityToday = lifeEntries.some(e => {
          if (e.domain !== 'physical') return false
          const entryDate = new Date(e.created_at)
          return entryDate >= dayStart && entryDate <= dayEnd
        })

        if (hasActivityToday) {
          physicalStreak++
        } else if (i > 0) {
          break
        }
      }

      const anomalies = detectAllAnomalies(movimientos, lifeEntries, categorias, goals)
      const userRuleAlerts = evaluateUserRules(movimientos, lifeEntries, budgets)
      const silentAlerts = getAllSilentAlerts(movimientos, lifeEntries, budgets, categorias)
      const allAlerts = [...anomalies, ...userRuleAlerts, ...silentAlerts].slice(0, 3)

      const spendingByMood = getSpendingByMood(movimientos, lifeEntries, 30)
      const moodByExercise = getMoodByExercise(lifeEntries, 30)
      const impulsiveByExercise = getImpulsiveSpendingByExercise(movimientos, lifeEntries, 30)

      const activeGoals = goals.filter(g => g.status === 'active')
      const completedGoals = goals.filter(g => g.status === 'completed')
      const goalsProgress = activeGoals.length > 0
        ? Math.round(activeGoals.reduce((sum, g) => sum + Math.min(100, (g.progress / g.target) * 100), 0) / activeGoals.length)
        : null

      // Money health score
      let moneyHealth = 100
      if (gastoPrevio > 0) {
        if (gastoDiff > 50) moneyHealth -= 40
        else if (gastoDiff > 20) moneyHealth -= 20
        else if (gastoDiff > 0) moneyHealth -= 10
        else moneyHealth += 10
      }
      moneyHealth = Math.min(100, Math.max(0, moneyHealth))

      setData({
        gastoTotal,
        gastoDiff,
        ingresoTotal,
        mentalAvg,
        mentalTrend,
        physicalDays,
        physicalStreak,
        activeGoals: activeGoals.length,
        completedGoals: completedGoals.length,
        goalsProgress,
        moneyHealth
      })
      setAlerts(allAlerts)
      setCrossInsights({ spendingByMood, moodByExercise, impulsiveByExercise })
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short'
    })
  }

  const globalScore = useMemo(() => {
    if (!data) return 0
    let score = 0
    let factors = 0

    if (data.mentalAvg !== null) {
      score += data.mentalAvg * 10
      factors++
    }

    const physicalScore = Math.min(100, (data.physicalDays / 3) * 100)
    score += physicalScore
    factors++

    if (data.gastoDiff !== 0 || data.gastoTotal > 0) {
      const moneyScore = data.gastoDiff <= 0 ? 100 : data.gastoDiff <= 20 ? 70 : data.gastoDiff <= 50 ? 40 : 20
      score += moneyScore
      factors++
    }

    if (data.goalsProgress !== null) {
      score += data.goalsProgress
      factors++
    }

    return factors > 0 ? Math.round(score / factors) : 0
  }, [data])

  const getScoreColor = (score) => {
    if (score >= 70) return 'green'
    if (score >= 50) return 'blue'
    if (score >= 30) return 'orange'
    return 'zinc'
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Resumen" />
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          <SkeletonHero />
          <div className="grid grid-cols-2 gap-4">
            <SkeletonCard />
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
      <TopBar
        title="Resumen"
        action={
          <button
            onClick={() => setShowConfigModal(true)}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors active:scale-95"
            aria-label="Configurar"
          >
            <Settings className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Hero Section with Avatar */}
        <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-800 dark:via-zinc-900 dark:to-black rounded-3xl p-6 overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl ${
              globalScore >= 70 ? 'bg-emerald-500' :
              globalScore >= 50 ? 'bg-blue-500' :
              globalScore >= 30 ? 'bg-orange-500' :
              'bg-zinc-500'
            }`} />
          </div>

          <div className="relative flex items-center gap-6">
            {/* Score Principal */}
            <div className="flex-1">
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                Tu día
              </p>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-bold text-white tracking-tight">{globalScore}</span>
                <span className="text-xl text-zinc-500 font-medium">/ 100</span>
              </div>
              <p className="text-sm text-zinc-400">
                {globalScore >= 70 ? 'Excelente balance' :
                 globalScore >= 50 ? 'Vas bien' :
                 globalScore >= 30 ? 'Podés mejorar' :
                 'Necesita atención'}
              </p>
            </div>

            {/* Avatar */}
            <Avatar
              mentalScore={data?.mentalAvg || 5}
              physicalDays={data?.physicalDays || 0}
              moneyHealth={data?.moneyHealth || 50}
              size="md"
            />
          </div>

          {/* Quick stats row */}
          <div className="mt-5 pt-4 border-t border-zinc-700/50 grid grid-cols-4 gap-2">
            <div className="text-center">
              <Brain className="w-4 h-4 mx-auto mb-1 text-purple-400" />
              <p className="text-sm font-semibold text-white">
                {data?.mentalAvg ? (Math.round(data.mentalAvg * 10) / 10) : '–'}
              </p>
              <p className="text-[10px] text-zinc-500">Mental</p>
            </div>
            <div className="text-center">
              <Dumbbell className="w-4 h-4 mx-auto mb-1 text-orange-400" />
              <p className="text-sm font-semibold text-white">{data?.physicalDays || 0}d</p>
              <p className="text-[10px] text-zinc-500">Activo</p>
            </div>
            <div className="text-center">
              <Wallet className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
              <p className="text-sm font-semibold text-white">
                {data?.gastoDiff !== 0 ? (data?.gastoDiff > 0 ? '+' : '') + data?.gastoDiff?.toFixed(0) + '%' : '–'}
              </p>
              <p className="text-[10px] text-zinc-500">Gasto</p>
            </div>
            <div className="text-center">
              <Target className="w-4 h-4 mx-auto mb-1 text-indigo-400" />
              <p className="text-sm font-semibold text-white">{data?.goalsProgress || 0}%</p>
              <p className="text-[10px] text-zinc-500">Objetivos</p>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl">
          {['hoy', 'semana', 'mes'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                period === p
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400'
              }`}
            >
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Alertas
            </h3>
            {alerts.map((alert, i) => {
              const alertHref = alert.domain === 'money' ? '/money' :
                               alert.domain === 'mental' ? '/mental' :
                               alert.domain === 'physical' ? '/fisico' :
                               '/comportamiento'

              return (
                <button
                  key={i}
                  onClick={() => router.push(alertHref)}
                  className={`w-full p-3 rounded-xl text-left transition-all active:scale-[0.98] flex items-center gap-3 ${
                    alert.severity === 'high'
                      ? 'bg-red-500/10 dark:bg-red-500/20 border border-red-200/50 dark:border-red-500/30'
                      : alert.severity === 'medium'
                      ? 'bg-orange-500/10 dark:bg-orange-500/20 border border-orange-200/50 dark:border-orange-500/30'
                      : 'bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-200/50 dark:border-yellow-500/30'
                  }`}
                >
                  {alert.severity === 'high' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  ) : alert.severity === 'medium' ? (
                    <Zap className="w-5 h-5 text-orange-500 flex-shrink-0" />
                  ) : (
                    <Lightbulb className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {alert.title}
                    </p>
                    {alert.message && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {alert.message}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                </button>
              )
            })}
          </div>
        )}

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Mental Card */}
          {widgetConfig.mental && (
            <button onClick={() => router.push('/mental')} className="text-left">
              <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10 border-purple-200/50 dark:border-purple-500/20 hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Mental</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {data?.mentalAvg !== null ? (Math.round(data.mentalAvg * 10) / 10) : '–'}
                  </span>
                  <span className="text-sm text-purple-400">/10</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {data?.mentalTrend === 'up' ? (
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                  ) : data?.mentalTrend === 'down' ? (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  ) : null}
                  <span className="text-xs text-zinc-500">
                    {data?.mentalTrend === 'up' ? 'Mejorando' : data?.mentalTrend === 'down' ? 'Bajando' : 'Estable'}
                  </span>
                </div>
              </Card>
            </button>
          )}

          {/* Physical Card */}
          {widgetConfig.fisico && (
            <button onClick={() => router.push('/fisico')} className="text-left">
              <Card className="p-4 bg-gradient-to-br from-orange-500/5 to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/10 border-orange-200/50 dark:border-orange-500/20 hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Físico</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {data?.physicalDays || 0}
                  </span>
                  <span className="text-sm text-orange-400">días</span>
                </div>
                {data?.physicalStreak > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    <span className="text-xs text-zinc-500">{data.physicalStreak}d racha</span>
                  </div>
                )}
              </Card>
            </button>
          )}

          {/* Money Card */}
          {widgetConfig.money && (
            <button onClick={() => router.push('/money')} className="text-left">
              <Card className="p-4 bg-gradient-to-br from-zinc-800 to-zinc-900 dark:from-zinc-700 dark:to-zinc-800 border-zinc-700 hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-zinc-400">Money</span>
                </div>
                <div className="text-xl font-bold text-white font-mono">
                  {formatAmount(data?.gastoTotal || 0)}
                </div>
                {data?.gastoDiff !== 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {data?.gastoDiff > 0 ? (
                      <TrendingUp className="w-3 h-3 text-red-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-emerald-400" />
                    )}
                    <span className={`text-xs ${data?.gastoDiff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {data?.gastoDiff > 0 ? '+' : ''}{data?.gastoDiff?.toFixed(0)}%
                    </span>
                  </div>
                )}
              </Card>
            </button>
          )}

          {/* Goals Card */}
          {data?.activeGoals > 0 && (
            <button onClick={() => router.push('/objetivos')} className="text-left">
              <Card className="p-4 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 dark:from-indigo-500/10 dark:to-violet-500/10 border-indigo-200/50 dark:border-indigo-500/20 hover:shadow-lg transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Objetivos</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {data?.activeGoals}
                  </span>
                  <span className="text-sm text-indigo-400">activos</span>
                </div>
                {data?.goalsProgress !== null && (
                  <div className="mt-2">
                    <div className="h-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${data.goalsProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </button>
          )}
        </div>

        {/* Cross Insights */}
        {widgetConfig.insights && crossInsights && (crossInsights.spendingByMood?.insight || crossInsights.moodByExercise?.insight) && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1 flex items-center gap-2">
              <Lightbulb className="w-3 h-3" />
              Insights
            </h3>

            {crossInsights.spendingByMood?.insight && (
              <button
                onClick={() => router.push('/insights')}
                className="w-full p-3 rounded-xl text-left bg-blue-500/5 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">
                  {crossInsights.spendingByMood.insight}
                </p>
                <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              </button>
            )}

            {crossInsights.moodByExercise?.insight && (
              <button
                onClick={() => router.push('/insights')}
                className="w-full p-3 rounded-xl text-left bg-purple-500/5 dark:bg-purple-500/10 border border-purple-200/50 dark:border-purple-500/20 hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-4 h-4 text-purple-500" />
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">
                  {crossInsights.moodByExercise.insight}
                </p>
                <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              </button>
            )}
          </div>
        )}

        {/* History Link */}
        {widgetConfig.historial && (
          <button
            onClick={() => router.push('/historia')}
            className="w-full p-4 rounded-xl text-left bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-lg transition-all active:scale-[0.98] flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Historial</p>
              <p className="text-xs text-zinc-500">Ver resúmenes y exportar</p>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-400" />
          </button>
        )}
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end" onClick={() => setShowConfigModal(false)}>
          <div
            className="w-full max-w-[420px] mx-auto bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Configurar</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              {[
                { key: 'mental', icon: Brain, label: 'Mental' },
                { key: 'fisico', icon: Dumbbell, label: 'Físico' },
                { key: 'money', icon: Wallet, label: 'Money' },
                { key: 'insights', icon: Lightbulb, label: 'Insights' },
                { key: 'alertas', icon: AlertTriangle, label: 'Alertas' },
                { key: 'historial', icon: Calendar, label: 'Historial' }
              ].map(({ key, icon: Icon, label }) => (
                <label key={key} className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <input
                    type="checkbox"
                    checked={widgetConfig[key]}
                    onChange={(e) => setWidgetConfig({ ...widgetConfig, [key]: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-600 text-zinc-900 focus:ring-zinc-500"
                  />
                  <Icon className="w-5 h-5 text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
                </label>
              ))}

              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm transition-colors mt-5 active:scale-[0.98]"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
