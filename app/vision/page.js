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
import RecommendationCard from '@/components/ui/RecommendationCard'

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

      // Calculate Money metrics
      const gastoTotal = filteredMovimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
      const ingresoTotal = filteredMovimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
      const gastoPrevio = previousMovimientos.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
      const gastoDiff = gastoPrevio > 0 ? ((gastoTotal - gastoPrevio) / gastoPrevio) * 100 : 0

      // Calculate Mental metrics
      const mentalEntries = filteredEntries.filter(e => e.domain === 'mental' && e.meta?.mood_score)
      const mentalAvg = mentalEntries.length > 0
        ? mentalEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / mentalEntries.length
        : null

      const prevMentalEntries = previousEntries.filter(e => e.domain === 'mental' && e.meta?.mood_score)
      const prevMentalAvg = prevMentalEntries.length > 0
        ? prevMentalEntries.reduce((sum, e) => sum + e.meta.mood_score, 0) / prevMentalEntries.length
        : null

      let mentalTrend = '→'
      if (mentalAvg !== null && prevMentalAvg !== null) {
        if (mentalAvg > prevMentalAvg + 0.5) mentalTrend = '↑'
        else if (mentalAvg < prevMentalAvg - 0.5) mentalTrend = '↓'
      }

      // Calculate Físico metrics
      const physicalDays = new Set(
        filteredEntries
          .filter(e => e.domain === 'physical')
          .map(e => {
            const d = new Date(e.created_at)
            return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
          })
      ).size

      // Calculate physical streak
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

      // Detectar alertas
      const anomalies = detectAllAnomalies(movimientos, lifeEntries, categorias, goals)
      const userRuleAlerts = evaluateUserRules(movimientos, lifeEntries, budgets)
      const silentAlerts = getAllSilentAlerts(movimientos, lifeEntries, budgets, categorias)
      const allAlerts = [...anomalies, ...userRuleAlerts, ...silentAlerts].slice(0, 3)

      // Cross insights
      const spendingByMood = getSpendingByMood(movimientos, lifeEntries, 30)
      const moodByExercise = getMoodByExercise(lifeEntries, 30)
      const impulsiveByExercise = getImpulsiveSpendingByExercise(movimientos, lifeEntries, 30)

      // Calculate goals stats
      const activeGoals = goals.filter(g => g.status === 'active')
      const completedGoals = goals.filter(g => g.status === 'completed')
      const goalsProgress = activeGoals.length > 0
        ? Math.round(activeGoals.reduce((sum, g) => sum + Math.min(100, (g.progress / g.target) * 100), 0) / activeGoals.length)
        : null

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
        goalsProgress
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

  // Calculate global score (0-100)
  const globalScore = useMemo(() => {
    if (!data) return 0

    let score = 0
    let factors = 0

    // Mental contribuye (0-10 → 0-100)
    if (data.mentalAvg !== null) {
      score += data.mentalAvg * 10
      factors++
    }

    // Físico contribuye (días activos: 0 = 0%, 3+ = 100%)
    const physicalScore = Math.min(100, (data.physicalDays / 3) * 100)
    score += physicalScore
    factors++

    // Money contribuye (menos gasto diferencial = mejor)
    if (data.gastoDiff !== 0 || data.gastoTotal > 0) {
      const moneyScore = data.gastoDiff <= 0 ? 100 : data.gastoDiff <= 20 ? 70 : data.gastoDiff <= 50 ? 40 : 20
      score += moneyScore
      factors++
    }

    // Objetivos contribuyen
    if (data.goalsProgress !== null) {
      score += data.goalsProgress
      factors++
    }

    return factors > 0 ? Math.round(score / factors) : 0
  }, [data])

  // Get color based on score
  const getScoreColor = (score) => {
    if (score >= 70) return 'green'
    if (score >= 50) return 'blue'
    if (score >= 30) return 'orange'
    return 'zinc'
  }

  // Get recommendation based on data
  const getRecommendation = () => {
    if (!data) return null

    // Physical inactivity
    if (data.physicalDays === 0) {
      return {
        emoji: '💪',
        title: 'Movete un poco hoy',
        description: 'No registraste actividad física en este período. Una caminata corta puede mejorar tu energía.',
        action: () => router.push('/fisico/habitos'),
        actionLabel: 'Registrar',
        variant: 'warning'
      }
    }

    // Mental low
    if (data.mentalAvg !== null && data.mentalAvg < 5) {
      return {
        emoji: '🧠',
        title: 'Cuidá tu bienestar',
        description: 'Tu estado mental está un poco bajo. Tomate un momento para vos.',
        action: () => router.push('/mental'),
        actionLabel: 'Ver más',
        variant: 'info'
      }
    }

    // Spending high
    if (data.gastoDiff > 30) {
      return {
        emoji: '💸',
        title: 'Revisá tus gastos',
        description: `Gastaste ${data.gastoDiff.toFixed(0)}% más que el período anterior. Vale la pena revisar.`,
        action: () => router.push('/money/movimientos'),
        actionLabel: 'Ver gastos',
        variant: 'warning'
      }
    }

    // Goals stalled
    if (data.activeGoals > 0 && data.goalsProgress !== null && data.goalsProgress < 25) {
      return {
        emoji: '🎯',
        title: 'Tus objetivos esperan',
        description: 'El progreso está bajo. Un pequeño avance hoy hace la diferencia.',
        action: () => router.push('/objetivos'),
        actionLabel: 'Ver objetivos',
        variant: 'info'
      }
    }

    // All good - positive reinforcement
    if (globalScore >= 70) {
      return {
        emoji: '✨',
        title: 'Vas muy bien',
        description: 'Mantené este ritmo. Tus áreas están equilibradas.',
        variant: 'success'
      }
    }

    // Default
    return {
      emoji: '💡',
      title: 'Seguí registrando',
      description: 'Cuanto más registres, mejores insights vas a tener.',
      action: () => router.push('/chat'),
      actionLabel: 'Ir al chat',
      variant: 'default'
    }
  }

  const recommendation = getRecommendation()

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Resumen" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="w-24 h-24 rounded-full bg-zinc-200 dark:bg-zinc-800" />
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
            aria-label="Configurar widgets"
          >
            <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Estado General - Hero Section */}
        <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-800 dark:via-zinc-900 dark:to-black rounded-3xl p-6 overflow-hidden">
          {/* Glow effect */}
          <div className="absolute inset-0 opacity-30">
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full blur-3xl ${
              globalScore >= 70 ? 'bg-emerald-500' :
              globalScore >= 50 ? 'bg-blue-500' :
              globalScore >= 30 ? 'bg-orange-500' :
              'bg-zinc-500'
            }`} />
          </div>

          <div className="relative flex flex-col items-center">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Estado General
            </div>

            <ProgressRing
              progress={globalScore}
              size={140}
              strokeWidth={10}
              color={getScoreColor(globalScore)}
              label={globalScore}
              sublabel="puntos"
            />

            <div className="mt-4 text-center">
              <p className="text-lg font-semibold text-white">
                {globalScore >= 70 ? 'Excelente' :
                 globalScore >= 50 ? 'Vas bien' :
                 globalScore >= 30 ? 'Podés mejorar' :
                 'Necesita atención'}
              </p>
              <p className="text-sm text-zinc-400 mt-1">
                {period === 'hoy' ? 'Hoy' : period === 'semana' ? 'Esta semana' : 'Este mes'}
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Período */}
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl">
          {['hoy', 'semana', 'mes'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                period === p
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>

        {/* Recomendación del día */}
        {recommendation && (
          <RecommendationCard
            emoji={recommendation.emoji}
            title={recommendation.title}
            description={recommendation.description}
            action={recommendation.action}
            actionLabel={recommendation.actionLabel}
            variant={recommendation.variant}
          />
        )}

        {/* Mini Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Money Mini Card */}
          {widgetConfig.money && (
            <a href="/money" className="block">
              <Card className="p-4 bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 border-zinc-700 hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/20 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💳</span>
                  <span className="text-xs font-semibold text-zinc-400">Money</span>
                </div>
                <div className="text-xl font-bold text-white font-mono tracking-tight">
                  {formatAmount(data.gastoTotal)}
                </div>
                {data.gastoDiff !== 0 && (
                  <div className={`text-xs mt-1 font-medium ${
                    data.gastoDiff > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {data.gastoDiff > 0 ? '↑' : '↓'} {Math.abs(data.gastoDiff).toFixed(0)}%
                  </div>
                )}
              </Card>
            </a>
          )}

          {/* Mental Mini Card */}
          {widgetConfig.mental && (
            <a href="/mental" className="block">
              <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border-purple-200/50 dark:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🧠</span>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Mental</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {data.mentalAvg !== null ? (Math.round(data.mentalAvg * 10) / 10) : '–'}
                  </span>
                  <span className="text-sm text-purple-400 dark:text-purple-500">/10</span>
                </div>
                <div className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">
                  {data.mentalTrend === '↑' ? 'Mejorando' : data.mentalTrend === '↓' ? 'Bajando' : 'Estable'}
                </div>
              </Card>
            </a>
          )}

          {/* Físico Mini Card */}
          {widgetConfig.fisico && (
            <a href="/fisico" className="block">
              <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 border-orange-200/50 dark:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 dark:hover:shadow-orange-500/20 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">💪</span>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Físico</span>
                </div>
                <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                  {data.physicalDays}d
                </div>
                {data.physicalStreak > 0 && (
                  <div className="text-xs mt-1 text-orange-500 dark:text-orange-400 font-medium">
                    🔥 {data.physicalStreak}d racha
                  </div>
                )}
              </Card>
            </a>
          )}

          {/* Objetivos Mini Card */}
          {data.activeGoals > 0 && (
            <a href="/objetivos" className="block">
              <Card className="p-4 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/20 dark:to-violet-500/20 border-indigo-200/50 dark:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/20 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🎯</span>
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Objetivos</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                    {data.activeGoals}
                  </span>
                  <span className="text-sm text-indigo-400 dark:text-indigo-500">activos</span>
                </div>
                {data.goalsProgress !== null && (
                  <div className="text-xs mt-1 text-zinc-500 dark:text-zinc-400">
                    {data.goalsProgress}% promedio
                  </div>
                )}
              </Card>
            </a>
          )}
        </div>

        {/* Insights Cruzados */}
        {widgetConfig.insights && crossInsights && (crossInsights.spendingByMood?.insight || crossInsights.moodByExercise?.insight || crossInsights.impulsiveByExercise?.insight) && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">Insights</h3>

            {crossInsights.spendingByMood?.insight && (
              <Card className="p-4 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 border-blue-200/50 dark:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-base">💡</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                      {crossInsights.spendingByMood.insight}
                    </p>
                    <a href="/insights" className="inline-block mt-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                      Ver más →
                    </a>
                  </div>
                </div>
              </Card>
            )}

            {crossInsights.moodByExercise?.insight && (
              <Card className="p-4 bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10 border-purple-200/50 dark:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/10 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-base">🧠</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                      {crossInsights.moodByExercise.insight}
                    </p>
                    <a href="/insights" className="inline-block mt-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300">
                      Ver más →
                    </a>
                  </div>
                </div>
              </Card>
            )}

            {crossInsights.impulsiveByExercise?.insight && (
              <Card className="p-4 bg-gradient-to-br from-orange-500/5 to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/10 border-orange-200/50 dark:border-orange-500/30 hover:shadow-lg hover:shadow-orange-500/10 transition-all">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                    <span className="text-base">💪</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed">
                      {crossInsights.impulsiveByExercise.insight}
                    </p>
                    <a href="/insights" className="inline-block mt-2 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300">
                      Ver más →
                    </a>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Alertas Tempranas */}
        {widgetConfig.alertas && alerts.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">Alertas</h3>
            {alerts.map((alert, i) => {
              const severityStyles = {
                high: {
                  bg: 'bg-gradient-to-br from-red-500/10 to-rose-500/10 dark:from-red-500/20 dark:to-rose-500/20 border-red-200/50 dark:border-red-500/30',
                  icon: 'bg-red-100 dark:bg-red-900/40',
                  cta: 'text-red-600 dark:text-red-400'
                },
                medium: {
                  bg: 'bg-gradient-to-br from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20 border-orange-200/50 dark:border-orange-500/30',
                  icon: 'bg-orange-100 dark:bg-orange-900/40',
                  cta: 'text-orange-600 dark:text-orange-400'
                },
                low: {
                  bg: 'bg-gradient-to-br from-yellow-500/10 to-amber-500/10 dark:from-yellow-500/20 dark:to-amber-500/20 border-yellow-200/50 dark:border-yellow-500/30',
                  icon: 'bg-yellow-100 dark:bg-yellow-900/40',
                  cta: 'text-yellow-600 dark:text-yellow-400'
                }
              }
              const styles = severityStyles[alert.severity] || severityStyles.low
              const alertHref = alert.domain === 'money' ? '/money' :
                               alert.domain === 'mental' ? '/mental' :
                               alert.domain === 'physical' ? '/fisico' :
                               '/comportamiento'

              return (
                <Card key={i} className={`p-4 ${styles.bg} hover:shadow-lg transition-all`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${styles.icon} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-lg">
                        {alert.severity === 'high' ? '⚠️' : alert.severity === 'medium' ? '⚡' : '💡'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {alert.title}
                      </p>
                      {alert.message && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                          {alert.message}
                        </p>
                      )}
                      {alert.date_range && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                          {formatDate(alert.date_range.start)} – {formatDate(alert.date_range.end)}
                        </p>
                      )}
                      <a href={alertHref} className={`inline-block mt-2 text-xs font-semibold ${styles.cta}`}>
                        Ver detalle →
                      </a>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Historial */}
        {widgetConfig.historial && (
          <a href="/historia" className="block">
            <Card className="p-4 bg-zinc-100 dark:bg-zinc-800/30 border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-lg hover:shadow-zinc-500/10 transition-all active:scale-[0.98]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <span className="text-lg">📊</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Historial
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      Ver resúmenes y exportar datos
                    </div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Card>
          </a>
        )}
      </div>

      {/* Modal de Configuración */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end" onClick={() => setShowConfigModal(false)}>
          <div
            className="w-full max-w-[420px] mx-auto bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Configurar Resumen</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95"
              >
                <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                Seleccioná qué widgets querés ver
              </p>

              {[
                { key: 'money', emoji: '💰', label: 'Money', color: 'green' },
                { key: 'mental', emoji: '🧠', label: 'Mental', color: 'purple' },
                { key: 'fisico', emoji: '💪', label: 'Físico', color: 'orange' },
                { key: 'insights', emoji: '💡', label: 'Insights', color: 'blue' },
                { key: 'alertas', emoji: '⚠️', label: 'Alertas', color: 'red' },
                { key: 'historial', emoji: '📊', label: 'Historial', color: 'zinc' }
              ].map(({ key, emoji, label, color }) => (
                <label key={key} className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.98]">
                  <input
                    type="checkbox"
                    checked={widgetConfig[key]}
                    onChange={(e) => setWidgetConfig({ ...widgetConfig, [key]: e.target.checked })}
                    className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-9 h-9 rounded-xl bg-${color}-100 dark:bg-${color}-900/40 flex items-center justify-center`}>
                      <span className="text-base">{emoji}</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{label}</span>
                  </div>
                </label>
              ))}

              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold text-sm transition-colors mt-5 active:scale-[0.98] shadow-lg shadow-purple-500/20"
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
