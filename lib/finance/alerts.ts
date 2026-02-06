import { calculateHealthSnapshot, getEstimatedIncome } from './healthSnapshot'
import { getMonthlySpendingSummary } from './monthlySpending'
import { getComparatorSummary } from '@/lib/prices/priceComparator'
import { getPriceHistoryOverview } from '@/lib/prices/priceHistory'

// ── Types ────────────────────────────────────────────────

export interface FinancialAlert {
  id: string
  type: 'subscription_weight' | 'category_spike' | 'monthly_outlier' | 'price_above_avg' | 'savings_opportunity'
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
  action: { label: string; href: string } | null
}

interface Movimiento {
  tipo: string
  monto: number
  fecha: string
  categoria?: string
}

interface Subscription {
  amount: number
  active: boolean
  name?: string
}

// ── Alert Generator ──────────────────────────────────────

export function generateFinancialAlerts(
  movimientos: Movimiento[],
  subscriptions: Subscription[],
): FinancialAlert[] {
  const alerts: FinancialAlert[] = []

  const income = getEstimatedIncome()
  const health = calculateHealthSnapshot(movimientos, subscriptions, income)
  const spending = getMonthlySpendingSummary(movimientos)

  // 1. Subscription weight alert
  if (health.hasIncome && health.subscriptionRatio > 12) {
    alerts.push({
      id: 'fin_sub_weight',
      type: 'subscription_weight',
      severity: health.subscriptionRatio > 20 ? 'high' : 'medium',
      title: `Suscripciones representan el ${health.subscriptionRatio}% de tu ingreso`,
      detail: `${formatARS(health.subscriptionsTotal)}/mes en suscripciones`,
      action: { label: 'Ver suscripciones', href: '/money/suscripciones' },
    })
  } else if (health.totalExpenses > 0 && health.subscriptionsTotal > 0) {
    const subVsExpense = Math.round((health.subscriptionsTotal / health.totalExpenses) * 100)
    if (subVsExpense > 18) {
      alerts.push({
        id: 'fin_sub_weight_expense',
        type: 'subscription_weight',
        severity: subVsExpense > 25 ? 'high' : 'medium',
        title: `Suscripciones representan el ${subVsExpense}% de tu gasto`,
        detail: `${formatARS(health.subscriptionsTotal)}/mes en suscripciones`,
        action: { label: 'Ver suscripciones', href: '/money/suscripciones' },
      })
    }
  }

  // 2. Category spike alerts
  for (const cat of health.criticalCategories.slice(0, 2)) {
    alerts.push({
      id: `fin_cat_spike_${cat.name}`,
      type: 'category_spike',
      severity: cat.vsAvgPercent > 50 ? 'high' : 'medium',
      title: `${capitalize(cat.name)} supera tu promedio histórico`,
      detail: `+${cat.vsAvgPercent}% vs meses anteriores (${formatARS(cat.amount)})`,
      action: { label: 'Ver movimientos', href: '/money/movimientos' },
    })
  }

  // 3. Monthly outlier
  if (spending.hasEnoughData && spending.projectedDeltaPercent > 15) {
    alerts.push({
      id: 'fin_monthly_outlier',
      type: 'monthly_outlier',
      severity: spending.projectedDeltaPercent > 30 ? 'high' : 'medium',
      title: 'Gasto mensual fuera de rango',
      detail: `Proyección: ${formatARS(spending.projectedTotal)} (+${spending.projectedDeltaPercent}% vs promedio)`,
      action: { label: 'Ver resumen', href: '/money/resumen' },
    })
  }

  // 4. Price above average alerts
  try {
    const priceOverview = getPriceHistoryOverview()
    const aboveAvg = priceOverview.products.filter(p => p.deltaVsAvgPercent > 15).slice(0, 2)
    for (const p of aboveAvg) {
      alerts.push({
        id: `fin_price_above_${p.productId}`,
        type: 'price_above_avg',
        severity: p.deltaVsAvgPercent > 30 ? 'medium' : 'low',
        title: `${p.productName}: +${p.deltaVsAvgPercent}% vs tu promedio`,
        detail: p.summary,
        action: null,
      })
    }
  } catch { /* silent */ }

  // 5. Savings opportunity
  try {
    const comparator = getComparatorSummary()
    const bigSavers = comparator.products.filter(p => p.maxSaving > 200 && p.maxSavingPercent > 10).slice(0, 2)
    for (const p of bigSavers) {
      alerts.push({
        id: `fin_savings_${p.productId}`,
        type: 'savings_opportunity',
        severity: 'low',
        title: `Comprando ${p.productName} en ${capitalize(p.cheapestStore || 'otra tienda')} ahorrás ${formatARS(p.maxSaving)}`,
        detail: `${p.maxSavingPercent}% menos que en ${capitalize(p.mostExpensiveStore || 'la más cara')}`,
        action: { label: 'Comparar precios', href: '/cart' },
      })
    }
  } catch { /* silent */ }

  // Sort by severity
  const severityOrder = { high: 0, medium: 1, low: 2 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return alerts.slice(0, 5)
}

// ── Helpers ──────────────────────────────────────────────

function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
