'use client'

import { useState, useEffect } from 'react'
import { initDB, getMovimientos, getLifeEntries, getCategorias, getGoals } from '@/lib/storage'
import { getAllSilentAlerts } from '@/lib/silent-alerts'
import { getSpendingByMood, getMoodByExercise, getImpulsiveSpendingByExercise } from '@/lib/insights/crossInsights'
import { detectAllAnomalies } from '@/lib/anomaly-detection'
import { evaluateUserRules } from '@/lib/user-rules'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function ResumenPage() {
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('hoy') // 'hoy', 'semana', 'mes'
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

      // Filter by period
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

  // Calcular estado global para payoff
  const getGlobalStatus = () => {
    if (!data) return null

    let score = 0
    let factors = 0

    // Mental contribuye
    if (data.mentalAvg !== null) {
      score += data.mentalAvg >= 7 ? 2 : data.mentalAvg >= 5 ? 1 : 0
      factors++
    }

    // Físico contribuye
    if (data.physicalDays > 0) {
      score += data.physicalDays >= 3 ? 2 : data.physicalDays >= 1 ? 1 : 0
      factors++
    }

    // Money contribuye (menos gasto = mejor)
    if (data.gastoDiff !== 0) {
      score += data.gastoDiff <= 0 ? 2 : data.gastoDiff <= 20 ? 1 : 0
      factors++
    }

    // Objetivos contribuyen
    if (data.goalsProgress !== null) {
      score += data.goalsProgress >= 50 ? 2 : data.goalsProgress >= 25 ? 1 : 0
      factors++
    }

    if (factors === 0) return null

    const avg = score / factors

    if (avg >= 1.5) return { text: 'Todo en orden', icon: '✨', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' }
    if (avg >= 1) return { text: 'Vas bien', icon: '✓', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' }
    if (avg >= 0.5) return { text: 'Seguí así', icon: '→', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300' }
    return { text: 'Revisá tus áreas', icon: '!', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' }
  }

  const globalStatus = getGlobalStatus()

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Inicio" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar
        title="Inicio"
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
        {/* Selector de Período */}
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-2xl">
          <button
            onClick={() => setPeriod('hoy')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              period === 'hoy'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setPeriod('semana')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              period === 'semana'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('mes')}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              period === 'mes'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
          >
            Mes
          </button>
        </div>

        {/* Payoff global - estado general */}
        {globalStatus && (
          <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl ${globalStatus.color}`}>
            <span className="text-sm">{globalStatus.icon}</span>
            <span className="text-sm font-semibold">{globalStatus.text}</span>
          </div>
        )}

        {/* Cards Resumidas */}
        <div className="space-y-3">
          {/* Money Card - Billetera Tech Style */}
          {widgetConfig.money && (
          <a href="/money" className="block">
            <Card className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 border-zinc-700 hover:shadow-lg hover:shadow-zinc-900/20 transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-700 flex items-center justify-center">
                      <span className="text-xl">💳</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-400">Money</span>
                  </div>
                  <div className="text-3xl font-bold text-white font-mono tracking-tight mb-1">
                    {formatAmount(data.gastoTotal)}
                  </div>
                  <div className="text-sm text-zinc-500">Gasto total</div>
                </div>
                {data.gastoDiff !== 0 && (
                  <div className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                    data.gastoDiff > 0
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {data.gastoDiff > 0 ? '+' : ''}{data.gastoDiff.toFixed(0)}%
                  </div>
                )}
              </div>
            </Card>
          </a>
          )}

          {/* Mental Card */}
          {widgetConfig.mental && data.mentalAvg !== null && (
            <a href="/mental" className="block">
              <Card className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                        <span className="text-xl">🧠</span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Mental</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {Math.round(data.mentalAvg * 10) / 10}
                      </div>
                      <div className="text-lg text-purple-400 dark:text-purple-500">/10</div>
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">Promedio estado</div>
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                    data.mentalTrend === '↑' ? 'bg-green-100 dark:bg-green-900/30' :
                    data.mentalTrend === '↓' ? 'bg-red-100 dark:bg-red-900/30' :
                    'bg-zinc-100 dark:bg-zinc-800'
                  }`}>
                    {data.mentalTrend}
                  </div>
                </div>
              </Card>
            </a>
          )}

          {/* Físico Card */}
          {widgetConfig.fisico && (
          <a href="/fisico" className="block">
            <Card className="p-5 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-800/50 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                      <span className="text-xl">💪</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Tu cuerpo</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                    {data.physicalDays} días
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">Días activos</div>
                </div>
                {data.physicalStreak > 0 && (
                  <div className="px-3 py-1.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold">
                    🔥 {data.physicalStreak}d racha
                  </div>
                )}
              </div>
            </Card>
          </a>
          )}

          {/* Objetivos Card */}
          {data.activeGoals > 0 && (
            <a href="/objetivos" className="block">
              <Card className="p-5 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 border-indigo-200/50 dark:border-indigo-800/50 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                        <span className="text-xl">🎯</span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Objetivos</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                        {data.activeGoals}
                      </div>
                      <div className="text-lg text-indigo-400 dark:text-indigo-500">activos</div>
                    </div>
                    {data.goalsProgress !== null && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-zinc-500 dark:text-zinc-400">Progreso promedio</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{data.goalsProgress}%</span>
                        </div>
                        <div className="h-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                            style={{ width: `${data.goalsProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {data.completedGoals > 0 && (
                    <div className="px-3 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold">
                      ✓ {data.completedGoals} cumplidos
                    </div>
                  )}
                </div>
              </Card>
            </a>
          )}
        </div>

        {/* Insights Cruzados */}
        {widgetConfig.insights && crossInsights && (crossInsights.spendingByMood?.insight || crossInsights.moodByExercise?.insight || crossInsights.impulsiveByExercise?.insight) && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">Insights</h3>

            {crossInsights.spendingByMood?.insight && (
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/50 dark:border-blue-800/50">
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
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200/50 dark:border-purple-800/50">
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
              <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200/50 dark:border-orange-800/50">
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
                  bg: 'bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/50',
                  icon: 'bg-red-100 dark:bg-red-900/40',
                  cta: 'text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300'
                },
                medium: {
                  bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-800/50',
                  icon: 'bg-orange-100 dark:bg-orange-900/40',
                  cta: 'text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300'
                },
                low: {
                  bg: 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200/50 dark:border-yellow-800/50',
                  icon: 'bg-yellow-100 dark:bg-yellow-900/40',
                  cta: 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-300'
                }
              }
              const styles = severityStyles[alert.severity] || severityStyles.low
              const alertHref = alert.domain === 'money' ? '/money' :
                               alert.domain === 'mental' ? '/mental' :
                               alert.domain === 'physical' ? '/fisico' :
                               '/comportamiento'

              return (
                <Card key={i} className={`p-4 ${styles.bg}`}>
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
          <Card className="p-4 bg-zinc-50 dark:bg-zinc-800/30 border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-md transition-all active:scale-[0.98]">
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
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Configurar Inicio</h3>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95"
              >
                <svg className="w-5 h-5 text-zinc-500 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                Seleccioná qué widgets querés ver
              </p>

              <label className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.98]">
                <input
                  type="checkbox"
                  checked={widgetConfig.money}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, money: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                    <span className="text-base">💰</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Money</span>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.98]">
                <input
                  type="checkbox"
                  checked={widgetConfig.mental}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, mental: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                    <span className="text-base">🧠</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Mental</span>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.98]">
                <input
                  type="checkbox"
                  checked={widgetConfig.fisico}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, fisico: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center">
                    <span className="text-base">💪</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Físico</span>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.98]">
                <input
                  type="checkbox"
                  checked={widgetConfig.insights}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, insights: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <span className="text-base">💡</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Insights</span>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.98]">
                <input
                  type="checkbox"
                  checked={widgetConfig.alertas}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, alertas: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                    <span className="text-base">⚠️</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Alertas</span>
                </div>
              </label>

              <label className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-[0.98]">
                <input
                  type="checkbox"
                  checked={widgetConfig.historial}
                  onChange={(e) => setWidgetConfig({ ...widgetConfig, historial: e.target.checked })}
                  className="w-5 h-5 rounded-lg border-zinc-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                    <span className="text-base">📊</span>
                  </div>
                  <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Historial</span>
                </div>
              </label>

              <button
                onClick={() => setShowConfigModal(false)}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors mt-5 active:scale-[0.98]"
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
