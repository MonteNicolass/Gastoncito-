'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getMovimientos, getWallets, getSubscriptions, addMovimiento, updateSaldo } from '@/lib/storage'
import { seedPredefinedCategories } from '@/lib/seed-categories'
import { getSpendingAwareness, getRecentShortcuts, getMonthComparisonData, getTopCategoriesData } from '@/lib/gasti'
import { runRatoneandoEngine } from '@/lib/ratoneando'
import { getTrackedProducts, getPricesForProduct, getAveragePrice } from '@/lib/ratoneando/price-storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import ProgressRing from '@/components/ui/ProgressRing'
import QuickAddModal from '@/components/ui/QuickAddModal'
import PriceComparisonTable from '@/components/PriceComparisonTable'
import BestStoreCard from '@/components/BestStoreCard'
import SavingsCard from '@/components/SavingsCard'
import CartOptimizationCompare from '@/components/CartOptimizationCompare'
import MonthlySpendSnapshot from '@/components/MonthlySpendSnapshot'
import FinancialHealthCard from '@/components/FinancialHealthCard'
import ProductPriceComparison from '@/components/ProductPriceComparison'
import PriceHistorySummary from '@/components/PriceHistorySummary'
import MonthlySpendingOverview from '@/components/MonthlySpendingOverview'
import FinancialHealthSnapshot from '@/components/FinancialHealthSnapshot'
import FinancialAlertCard from '@/components/FinancialAlertCard'
import { getComparatorSummary } from '@/lib/prices/priceComparator'
import { getPriceHistoryOverview } from '@/lib/prices/priceHistory'
import { calculateHealthSnapshot } from '@/lib/finance/healthSnapshot'
import { getMonthlySpendingSummary } from '@/lib/finance/monthlySpending'
import { generateFinancialAlerts } from '@/lib/finance/alerts'
import {
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  Bell,
  BarChart3,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  LineChart,
  ArrowRightLeft,
  Plus,
  Repeat,
  Zap,
  ShoppingCart
} from 'lucide-react'

function getBudgetsFromLocalStorage() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem('gaston_budgets')
  return data ? JSON.parse(data) : []
}

export default function MoneyPage() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [wallets, setWallets] = useState([])
  const [shortcuts, setShortcuts] = useState([])
  const [spendingAwareness, setSpendingAwareness] = useState(null)
  const [monthComparison, setMonthComparison] = useState(null)
  const [topCategories, setTopCategories] = useState(null)
  const [ratoneando, setRatoneando] = useState(null)
  const [priceRows, setPriceRows] = useState([])
  const [subscriptionsTotal, setSubscriptionsTotal] = useState(0)
  const [comparatorSummary, setComparatorSummary] = useState(null)
  const [priceHistoryOverview, setPriceHistoryOverview] = useState(null)
  const [healthSnapshot, setHealthSnapshot] = useState(null)
  const [spendingSummary, setSpendingSummary] = useState(null)
  const [financialAlerts, setFinancialAlerts] = useState([])

  useEffect(() => {
    initDB().then(() => {
      seedPredefinedCategories()
      loadStats()
    })
  }, [])

  async function loadStats() {
    try {
      const movimientos = await getMovimientos()
      const budgets = getBudgetsFromLocalStorage()
      const walletsData = await getWallets()
      setWallets(walletsData)

      // Load gasti data
      const shortcutsData = getRecentShortcuts(movimientos, 4)
      setShortcuts(shortcutsData)

      const awarenessData = getSpendingAwareness(movimientos)
      setSpendingAwareness(awarenessData)

      const comparisonData = getMonthComparisonData(movimientos)
      setMonthComparison(comparisonData)

      const categoriesData = getTopCategoriesData(movimientos, 5)
      setTopCategories(categoriesData)

      // Ratoneando engine
      try {
        const ratoneandoResult = await runRatoneandoEngine(movimientos)
        setRatoneando(ratoneandoResult)
      } catch { /* silent */ }

      // Price comparison table
      try {
        const tracked = getTrackedProducts()
        const rows = tracked.slice(0, 8).map(p => {
          const entries = getPricesForProduct(p.product_name).map(e => ({
            store: e.supermarket,
            price: e.price,
          }))
          const avg = getAveragePrice(p.product_name) || 0
          const cheapest = entries.length > 0
            ? entries.reduce((min, e) => e.price < min.price ? e : min, entries[0]).store
            : ''
          return { product: p.product_name, entries, cheapestStore: cheapest, avgPrice: avg }
        }).filter(r => r.entries.length > 0)
        setPriceRows(rows)
      } catch { /* silent */ }

      // Subscriptions total
      let activeSubs = []
      try {
        const subs = await getSubscriptions()
        activeSubs = subs.filter(s => s.active !== false)
        const total = activeSubs.reduce((sum, s) => sum + (s.monto || s.amount || 0), 0)
        setSubscriptionsTotal(total)
      } catch { /* silent */ }

      // Price comparator + history
      try {
        setComparatorSummary(getComparatorSummary())
        setPriceHistoryOverview(getPriceHistoryOverview())
      } catch { /* silent */ }

      // Monthly spending summary
      try {
        setSpendingSummary(getMonthlySpendingSummary(movimientos))
      } catch { /* silent */ }

      // Health snapshot
      try {
        setHealthSnapshot(calculateHealthSnapshot(movimientos, activeSubs))
      } catch { /* silent */ }

      // Financial alerts
      try {
        setFinancialAlerts(generateFinancialAlerts(movimientos, activeSubs))
      } catch { /* silent */ }

      const now = new Date()
      const currentMonth = now.toISOString().slice(0, 7)
      const thisMonthMov = movimientos.filter(m => m.fecha.startsWith(currentMonth))

      const gastosMes = thisMonthMov.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
      const ingresosMes = thisMonthMov.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
      const balance = ingresosMes - gastosMes

      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevMonthStr = prevMonth.toISOString().slice(0, 7)
      const prevMonthMov = movimientos.filter(m => m.fecha.startsWith(prevMonthStr))
      const gastosPrevMes = prevMonthMov.filter(m => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)

      let controlStreak = 0
      const avgDaily = gastosMes / now.getDate()

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(now)
        checkDate.setDate(checkDate.getDate() - i)
        const dateStr = checkDate.toISOString().slice(0, 10)

        const dayGastos = movimientos
          .filter(m => m.fecha === dateStr && m.tipo === 'gasto')
          .reduce((sum, m) => sum + m.monto, 0)

        if (dayGastos <= avgDaily * 1.5 || dayGastos === 0) {
          controlStreak++
        } else if (i > 0) {
          break
        }
      }

      let budgetUsage = null
      let budgetHealth = 100
      if (budgets.length > 0) {
        const budgetStats = budgets.map(budget => {
          let spent = 0
          if (budget.type === 'category') {
            spent = thisMonthMov
              .filter(m => m.tipo === 'gasto' && m.categoria === budget.target_id)
              .reduce((sum, m) => sum + m.monto, 0)
          } else if (budget.type === 'wallet') {
            spent = thisMonthMov
              .filter(m => m.tipo === 'gasto' && m.metodo === budget.target_id)
              .reduce((sum, m) => sum + m.monto, 0)
          }
          return { ...budget, spent, percent: Math.round((spent / budget.limit) * 100) }
        })
        budgetUsage = budgetStats.sort((a, b) => b.percent - a.percent)[0]
        const avgOverBudget = budgetStats.reduce((sum, b) => sum + Math.max(0, b.percent - 100), 0) / budgetStats.length
        budgetHealth = Math.max(0, 100 - avgOverBudget)
      }

      let healthScore = 100
      if (gastosPrevMes > 0) {
        const diff = ((gastosMes - gastosPrevMes) / gastosPrevMes) * 100
        if (diff > 50) healthScore -= 40
        else if (diff > 20) healthScore -= 20
        else if (diff > 0) healthScore -= 10
        else healthScore += 10
      }
      if (budgetUsage?.percent > 100) healthScore -= 20
      else if (budgetUsage?.percent > 80) healthScore -= 10
      healthScore = Math.min(100, Math.max(0, healthScore * (budgetHealth / 100)))

      setStats({
        gastosMes,
        ingresosMes,
        balance,
        controlStreak,
        budgetUsage,
        healthScore: Math.round(healthScore),
        gastosPrevMes,
        gastoDiff: gastosPrevMes > 0 ? ((gastosMes - gastosPrevMes) / gastosPrevMes) * 100 : 0
      })
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

  const getScoreColor = (score) => {
    if (score >= 70) return 'green'
    if (score >= 50) return 'blue'
    if (score >= 30) return 'orange'
    return 'zinc'
  }

  async function handleQuickAdd(gasto) {
    try {
      await addMovimiento({
        fecha: gasto.fecha,
        tipo: gasto.tipo,
        monto: gasto.monto,
        motivo: gasto.motivo,
        metodo: gasto.metodo,
        category_id: gasto.category_id
      })
      await updateSaldo(gasto.metodo, -gasto.monto)
      loadStats()
    } catch (error) {
      console.error('Error adding quick expense:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <TopBar title="Money" />
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
      <TopBar title="Money" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* Hero Section - Editorial */}
        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-terra-500" strokeWidth={1.75} />
            <p className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              Este mes
            </p>
          </div>

          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                {formatAmount(stats?.gastosMes || 0)}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400">Balance:</span>
                  <span className={`text-xs font-semibold font-mono ${
                    stats?.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatAmount(stats?.balance || 0)}
                  </span>
                </div>
                {stats?.gastoDiff !== 0 && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    stats?.gastoDiff > 0
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  }`}>
                    {stats?.gastoDiff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stats?.gastoDiff > 0 ? '+' : ''}{stats?.gastoDiff?.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>

            <ProgressRing
              progress={stats?.healthScore || 0}
              size={80}
              strokeWidth={6}
              color={getScoreColor(stats?.healthScore || 0)}
              label={stats?.healthScore || 0}
              sublabel="salud"
            />
          </div>

          {/* Bottom indicators */}
          {(stats?.controlStreak > 0 || stats?.budgetUsage) && (
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              {stats?.controlStreak > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {stats.controlStreak}d bajo control
                  </span>
                </div>
              )}
              {stats?.budgetUsage && (
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    stats.budgetUsage.percent >= 100 ? 'bg-red-500' :
                    stats.budgetUsage.percent >= 80 ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`} />
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {stats.budgetUsage.name}: {stats.budgetUsage.percent}%
                  </span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Quick action */}
        <button
          onClick={() => setShowQuickAdd(true)}
          className="w-full p-4 rounded-2xl bg-terra-500 dark:bg-terra-600 transition-all active:scale-[0.98] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-white" />
            <div className="text-left">
              <p className="text-white font-semibold text-sm">Gasto rápido</p>
              <p className="text-white/70 text-[10px]">1 paso, sin confirmación</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/60" />
        </button>

        {/* ── Savings Card (Ahorro potencial) ── */}
        {ratoneando?.hasData && ratoneando.totalPotentialSavings >= 500 && (
          <SavingsCard
            totalSavings={ratoneando.totalPotentialSavings}
            items={(ratoneando.recommendations || []).slice(0, 2).map(r => ({
              message: r.message,
              amount: r.monthlySavings || 0,
            }))}
            subtitle="Sin cambiar tus hábitos"
          />
        )}

        {/* ── Best Store Card (Dónde comprás) ── */}
        {ratoneando?.hasData && ratoneando.patterns?.preferredSupermarkets?.length > 0 && (
          <BestStoreCard
            stores={ratoneando.patterns.preferredSupermarkets.slice(0, 3).map(s => ({
              name: s.name || s.normalized,
              totalSpent: s.totalSpent,
              visits: s.count,
              avgBasket: s.avgSpend,
            }))}
          />
        )}

        {/* ── Cart Optimization Compare ── */}
        {ratoneando?.hasData && ratoneando.cartOptimization?.alternative && (
          <CartOptimizationCompare
            single={{
              store: ratoneando.cartOptimization.alternative.store,
              cost: ratoneando.cartOptimization.alternative.estimatedCost,
              items: ratoneando.cartOptimization.basketSize,
              coverage: 80,
            }}
            optimized={{
              store: ratoneando.cartOptimization.recommendation.store,
              cost: ratoneando.cartOptimization.recommendation.estimatedCost,
              items: ratoneando.cartOptimization.recommendation.itemsFound || ratoneando.cartOptimization.basketSize,
              coverage: ratoneando.cartOptimization.recommendation.coverage,
            }}
            basketSize={ratoneando.cartOptimization.basketSize}
          />
        )}

        {/* ── Price Comparison Table ── */}
        {priceRows.length > 0 && (
          <PriceComparisonTable rows={priceRows} />
        )}

        {/* ── Global Price Comparator (MiráPrecios) ── */}
        {comparatorSummary?.hasData && (
          <ProductPriceComparison summary={comparatorSummary} />
        )}

        {/* ── Price History (MiráPrecios) ── */}
        {priceHistoryOverview?.hasData && (
          <PriceHistorySummary overview={priceHistoryOverview} />
        )}

        {/* ── Financial Alerts ── */}
        {financialAlerts.length > 0 && (
          <FinancialAlertCard alerts={financialAlerts} />
        )}

        {/* Spending Awareness */}
        {spendingAwareness && spendingAwareness.recentCount > 0 && (
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-terra-500" strokeWidth={1.75} />
              <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                Últimos 30 días
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">
                  {spendingAwareness.recentCount}
                </p>
                <p className="text-[10px] text-zinc-400">gastos</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-display font-bold text-zinc-900 dark:text-zinc-100">
                  {formatAmount(spendingAwareness.dailyAvg)}
                </p>
                <p className="text-[10px] text-zinc-400">prom/día</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-100">
                  {spendingAwareness.peakDayName}
                </p>
                <p className="text-[10px] text-zinc-400">día pico</p>
              </div>
            </div>
            {/* Mini bar chart by day of week */}
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-end gap-1 h-8">
              {spendingAwareness.byDayOfWeek.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm transition-all ${d.isMax ? 'bg-terra-500' : 'bg-zinc-200 dark:bg-zinc-700'}`}
                    style={{ height: `${Math.max(4, (d.count / Math.max(...spendingAwareness.byDayOfWeek.map(x => x.count))) * 32)}px` }}
                  />
                  <span className="text-[9px] font-mono text-zinc-400">{d.day}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Monthly Spending Overview (Gasti mode) ── */}
        {spendingSummary && spendingSummary.currentSpend > 0 && (
          <MonthlySpendingOverview
            summary={spendingSummary}
            onCategoryClick={(cat) => router.push('/money/movimientos')}
          />
        )}

        {/* ── Financial Health Snapshot (FinanzasArgy) ── */}
        {healthSnapshot && (
          <FinancialHealthSnapshot
            snapshot={healthSnapshot}
            onIncomeUpdated={() => loadStats()}
          />
        )}

        {/* Navigation - Gestión */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
            Gestión
          </h3>
          <div className="space-y-1.5">
            {[
              { icon: BarChart3, label: 'Resumen mensual', href: '/money/resumen' },
              { icon: ArrowRightLeft, label: 'Movimientos', href: '/money/movimientos' },
              { icon: CreditCard, label: 'Billeteras', href: '/money/billeteras' },
              { icon: PiggyBank, label: 'Presupuestos', href: '/money/presupuestos' },
              { icon: ShoppingCart, label: 'Carrito de compras', href: '/cart' }
            ].map(({ icon: Icon, label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="w-full p-3.5 rounded-2xl text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.75} />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{label}</span>
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
              </button>
            ))}
          </div>
        </div>

        {/* Navigation - Análisis */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
            Análisis
          </h3>
          <div className="space-y-1.5">
            {[
              { icon: Bell, label: 'Suscripciones', href: '/money/suscripciones' },
              { icon: AlertTriangle, label: 'Alertas', href: '/money/alertas' },
              { icon: LineChart, label: 'Insights', href: '/money/insights' },
              { icon: Receipt, label: 'Inversiones', href: '/money/inversiones' }
            ].map(({ icon: Icon, label, href }) => (
              <button
                key={href}
                onClick={() => router.push(href)}
                className="w-full p-3.5 rounded-2xl text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.75} />
                <span className="text-sm text-zinc-700 dark:text-zinc-300 flex-1">{label}</span>
                <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAdd={handleQuickAdd}
        shortcuts={shortcuts}
        wallets={wallets}
      />
    </div>
  )
}
