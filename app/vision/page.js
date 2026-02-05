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

      setData({
        gastoTotal,
        gastoDiff,
        ingresoTotal,
        mentalAvg,
        mentalTrend,
        physicalDays,
        physicalStreak
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

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Resumen" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Resumen" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Selector de Período */}
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('hoy')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              period === 'hoy'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Hoy
          </button>
          <button
            onClick={() => setPeriod('semana')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              period === 'semana'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('mes')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              period === 'mes'
                ? 'bg-blue-600 text-white'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            Mes
          </button>
        </div>

        {/* Cards Resumidas */}
        <div className="grid grid-cols-1 gap-3">
          {/* Money Card */}
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💰</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Money</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatAmount(data.gastoTotal)}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">Gasto total</div>
            {data.gastoDiff !== 0 && (
              <div className={`text-xs font-medium ${
                data.gastoDiff > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                {data.gastoDiff > 0 ? '+' : ''}{data.gastoDiff.toFixed(0)}% vs {period === 'hoy' ? 'ayer' : period === 'semana' ? 'semana anterior' : 'mes anterior'}
              </div>
            )}
          </Card>

          {/* Mental Card */}
          {data.mentalAvg !== null && (
            <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🧠</span>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Mental</span>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(data.mentalAvg * 10) / 10}/10
                </div>
                <div className="text-xl text-purple-600 dark:text-purple-400">
                  {data.mentalTrend}
                </div>
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">Promedio estado</div>
            </Card>
          )}

          {/* Físico Card */}
          <Card className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">💪</span>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Físico</span>
            </div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {data.physicalDays} días
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">Días activos</div>
            {data.physicalStreak > 0 && (
              <div className="text-xs font-medium text-orange-600 dark:text-orange-400">
                🔥 Racha: {data.physicalStreak} {data.physicalStreak === 1 ? 'día' : 'días'}
              </div>
            )}
          </Card>
        </div>

        {/* Insights Cruzados */}
        {crossInsights && (crossInsights.spendingByMood?.insight || crossInsights.moodByExercise?.insight || crossInsights.impulsiveByExercise?.insight) && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 px-1">💡 Insights</h3>

            {crossInsights.spendingByMood?.insight && (
              <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                  {crossInsights.spendingByMood.insight}
                </p>
              </Card>
            )}

            {crossInsights.moodByExercise?.insight && (
              <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                  {crossInsights.moodByExercise.insight}
                </p>
              </Card>
            )}

            {crossInsights.impulsiveByExercise?.insight && (
              <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                  {crossInsights.impulsiveByExercise.insight}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Alertas Tempranas */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 px-1">⚠️ Alertas</h3>
            {alerts.map((alert, i) => (
              <Card
                key={i}
                className={`p-4 ${
                  alert.severity === 'high'
                    ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                    : alert.severity === 'medium'
                    ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800'
                    : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                }`}
              >
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                  {alert.title}
                </div>
                {alert.message && (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {alert.message}
                  </div>
                )}
                {alert.date_range && (
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {formatDate(alert.date_range.start)} – {formatDate(alert.date_range.end)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
