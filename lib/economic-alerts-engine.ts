/**
 * Economic Alerts Engine V1
 * Deterministic, no AI — based purely on user's historical data
 *
 * 6 alert rules, priority-ordered:
 * 1. Gasto diario anómalo
 * 2. Gasto mensual fuera de rango
 * 3. Categoría desbordada
 * 4. Suscripciones pesadas
 * 5. Precio caro vs historial
 * 6. Días sin registrar gastos
 */

// ── Types ────────────────────────────────────────────────────

export interface EconomicAlert {
  id: string
  type: EconomicAlertType
  text: string
  priority: number // 1 = highest
  severity: 'high' | 'medium' | 'low'
  cta: AlertCTA
  data: Record<string, unknown>
}

export type EconomicAlertType =
  | 'daily_anomaly'
  | 'monthly_overspend'
  | 'category_overflow'
  | 'heavy_subscriptions'
  | 'expensive_price'
  | 'no_records'

export interface AlertCTA {
  label: string
  action: 'navigate' | 'chat_prefill'
  href?: string
  text?: string
}

export interface Movimiento {
  id: number
  tipo: 'gasto' | 'ingreso'
  monto: number
  metodo: string
  motivo: string
  fecha: string
  categoria?: string
  category_id?: number
  merchant_norm?: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: number
  name: string
  amount: number
  cadence_months: number
  next_charge_date: string
  active: boolean
}

export interface PriceRecord {
  product_name: string
  price: number
  fetched_at: string
}

// ── Constants ────────────────────────────────────────────────

const THRESHOLDS = {
  DAILY_ANOMALY_MULTIPLIER: 1.25,
  MONTHLY_OVERSPEND_MULTIPLIER: 1.15,
  CATEGORY_OVERFLOW_MULTIPLIER: 1.3,
  CATEGORY_MIN_SHARE: 0.10,
  SUBSCRIPTION_MAX_SHARE: 0.15,
  EXPENSIVE_PRICE_MULTIPLIER: 1.2,
  NO_RECORDS_DAYS: 5,
} as const

const MAX_ALERTS = 3
const MS_PER_DAY = 24 * 60 * 60 * 1000

// ── Helpers ──────────────────────────────────────────────────

function toDate(dateStr: string): Date {
  return new Date(dateStr)
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - a.getTime()) / MS_PER_DAY)
}

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function gastosOnly(movimientos: Movimiento[]): Movimiento[] {
  return movimientos.filter(m => m.tipo === 'gasto')
}

function formatARS(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

function gastosPeriod(gastos: Movimiento[], from: Date, to: Date): Movimiento[] {
  return gastos.filter(g => {
    const d = toDate(g.fecha)
    return d >= from && d <= to
  })
}

// ── Rule 1: Gasto diario anómalo ─────────────────────────────

function checkDailyAnomaly(gastos: Movimiento[]): EconomicAlert | null {
  const now = new Date()
  const today = startOfDay(now)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY)

  const last30 = gastos.filter(g => toDate(g.fecha) >= thirtyDaysAgo)
  if (last30.length < 5) return null

  const totalLast30 = last30.reduce((sum, g) => sum + g.monto, 0)
  const avgDaily = totalLast30 / 30

  const todayGastos = gastos.filter(g => toDate(g.fecha) >= today)
  const todayTotal = todayGastos.reduce((sum, g) => sum + g.monto, 0)

  if (todayTotal <= 0 || avgDaily <= 0) return null

  const threshold = avgDaily * THRESHOLDS.DAILY_ANOMALY_MULTIPLIER
  if (todayTotal <= threshold) return null

  const pct = Math.round(((todayTotal - avgDaily) / avgDaily) * 100)

  return {
    id: 'econ_daily_anomaly',
    type: 'daily_anomaly',
    text: `Gasto de hoy ${formatARS(todayTotal)} — +${pct}% vs tu promedio diario (${formatARS(avgDaily)})`,
    priority: 1,
    severity: pct >= 80 ? 'high' : 'medium',
    cta: {
      label: 'Ver movimientos',
      action: 'navigate',
      href: '/money/movimientos',
    },
    data: { todayTotal, avgDaily, pct },
  }
}

// ── Rule 2: Gasto mensual fuera de rango ─────────────────────

function checkMonthlyOverspend(gastos: Movimiento[]): EconomicAlert | null {
  const now = new Date()
  const currentMonthStart = startOfMonth(now)

  const currentMonthGastos = gastos.filter(g => toDate(g.fecha) >= currentMonthStart)
  const currentTotal = currentMonthGastos.reduce((sum, g) => sum + g.monto, 0)
  if (currentTotal <= 0) return null

  // Last 3 complete months
  const monthTotals: number[] = []
  for (let i = 1; i <= 3; i++) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const total = gastosPeriod(gastos, mStart, mEnd).reduce((sum, g) => sum + g.monto, 0)
    if (total > 0) monthTotals.push(total)
  }

  if (monthTotals.length === 0) return null

  const avg3m = monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length

  // Project current month
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projected = dayOfMonth > 0 ? (currentTotal / dayOfMonth) * daysInMonth : currentTotal

  const threshold = avg3m * THRESHOLDS.MONTHLY_OVERSPEND_MULTIPLIER
  if (projected <= threshold) return null

  const pct = Math.round(((projected - avg3m) / avg3m) * 100)

  return {
    id: 'econ_monthly_overspend',
    type: 'monthly_overspend',
    text: `Proyección mensual ${formatARS(projected)} — +${pct}% vs promedio 3 meses (${formatARS(avg3m)})`,
    priority: 2,
    severity: pct >= 40 ? 'high' : 'medium',
    cta: {
      label: 'Ver resumen',
      action: 'navigate',
      href: '/money/resumen',
    },
    data: { currentTotal, projected, avg3m, pct },
  }
}

// ── Rule 3: Categoría desbordada ─────────────────────────────

function checkCategoryOverflow(gastos: Movimiento[]): EconomicAlert | null {
  const now = new Date()
  const currentMonthStart = startOfMonth(now)

  const currentMonthGastos = gastos.filter(g => toDate(g.fecha) >= currentMonthStart)
  const totalMes = currentMonthGastos.reduce((sum, g) => sum + g.monto, 0)
  if (totalMes <= 0) return null

  // Group current month by category
  const currentByCategory: Record<string, number> = {}
  for (const g of currentMonthGastos) {
    const cat = g.categoria || 'Otro'
    currentByCategory[cat] = (currentByCategory[cat] || 0) + g.monto
  }

  // Last 3 months by category
  const historicalByCategory: Record<string, number[]> = {}
  for (let i = 1; i <= 3; i++) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const monthGastos = gastosPeriod(gastos, mStart, mEnd)
    for (const g of monthGastos) {
      const cat = g.categoria || 'Otro'
      if (!historicalByCategory[cat]) historicalByCategory[cat] = []
      historicalByCategory[cat].push(g.monto)
    }
  }

  // Calculate monthly averages per category
  const avgByCategory: Record<string, number> = {}
  for (const [cat, amounts] of Object.entries(historicalByCategory)) {
    const total = amounts.reduce((a, b) => a + b, 0)
    // Divide by number of months we have data for (max 3)
    const monthCount = Math.min(3, new Set(
      gastos
        .filter(g => (g.categoria || 'Otro') === cat && toDate(g.fecha) < currentMonthStart)
        .map(g => {
          const d = toDate(g.fecha)
          return `${d.getFullYear()}-${d.getMonth()}`
        })
    ).size) || 1
    avgByCategory[cat] = total / monthCount
  }

  // Find worst offender among categories with >10% share
  let worstAlert: EconomicAlert | null = null
  let worstPct = 0

  for (const [cat, currentTotal] of Object.entries(currentByCategory)) {
    if (cat === 'Otro' || cat === 'undefined') continue

    const share = currentTotal / totalMes
    if (share < THRESHOLDS.CATEGORY_MIN_SHARE) continue

    const avgCat = avgByCategory[cat]
    if (!avgCat || avgCat <= 0) continue

    // Project current category
    const dayOfMonth = now.getDate()
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const projectedCat = dayOfMonth > 0 ? (currentTotal / dayOfMonth) * daysInMonth : currentTotal

    const threshold = avgCat * THRESHOLDS.CATEGORY_OVERFLOW_MULTIPLIER
    if (projectedCat <= threshold) continue

    const pct = Math.round(((projectedCat - avgCat) / avgCat) * 100)

    if (pct > worstPct) {
      worstPct = pct
      worstAlert = {
        id: `econ_category_overflow_${cat}`,
        type: 'category_overflow',
        text: `${cat}: ${formatARS(currentTotal)} este mes — +${pct}% vs tu promedio`,
        priority: 3,
        severity: pct >= 60 ? 'high' : 'medium',
        cta: {
          label: `Ver ${cat.toLowerCase()}`,
          action: 'navigate',
          href: '/money/movimientos',
        },
        data: { category: cat, currentTotal, projectedCat, avgCat, pct },
      }
    }
  }

  return worstAlert
}

// ── Rule 4: Suscripciones pesadas ────────────────────────────

function checkHeavySubscriptions(
  gastos: Movimiento[],
  subscriptions: Subscription[]
): EconomicAlert | null {
  const activeSubs = subscriptions.filter(s => s.active)
  if (activeSubs.length === 0) return null

  const monthlySubsTotal = activeSubs.reduce((sum, s) => {
    return sum + (s.amount / (s.cadence_months || 1))
  }, 0)

  // Average monthly spending (last 3 months)
  const now = new Date()
  const monthTotals: number[] = []
  for (let i = 1; i <= 3; i++) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const total = gastosPeriod(gastos, mStart, mEnd).reduce((sum, g) => sum + g.monto, 0)
    if (total > 0) monthTotals.push(total)
  }

  if (monthTotals.length === 0) return null

  const avgMonthly = monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length
  if (avgMonthly <= 0) return null

  const subsShare = monthlySubsTotal / avgMonthly
  if (subsShare <= THRESHOLDS.SUBSCRIPTION_MAX_SHARE) return null

  const pct = Math.round(subsShare * 100)

  return {
    id: 'econ_heavy_subscriptions',
    type: 'heavy_subscriptions',
    text: `Tus suscripciones representan el ${pct}% de tu gasto mensual (${formatARS(monthlySubsTotal)}/mes)`,
    priority: 4,
    severity: pct >= 25 ? 'high' : 'medium',
    cta: {
      label: 'Ver suscripciones',
      action: 'navigate',
      href: '/money/suscripciones',
    },
    data: { monthlySubsTotal, avgMonthly, pct },
  }
}

// ── Rule 5: Precio caro vs historial ─────────────────────────

function checkExpensivePrice(
  gastos: Movimiento[],
  priceHistory: PriceRecord[]
): EconomicAlert | null {
  if (priceHistory.length === 0) return null

  // Group prices by product
  const byProduct: Record<string, number[]> = {}
  for (const p of priceHistory) {
    const key = p.product_name.toLowerCase().trim()
    if (!byProduct[key]) byProduct[key] = []
    byProduct[key].push(p.price)
  }

  // Find the most recent gasto that matches a tracked product
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * MS_PER_DAY)
  const recentGastos = gastos
    .filter(g => toDate(g.fecha) >= sevenDaysAgo)
    .sort((a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime())

  for (const g of recentGastos) {
    const motivo = (g.motivo || '').toLowerCase().trim()
    if (!motivo) continue

    for (const [product, prices] of Object.entries(byProduct)) {
      if (!motivo.includes(product) && !product.includes(motivo)) continue
      if (prices.length < 2) continue

      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
      const threshold = avgPrice * THRESHOLDS.EXPENSIVE_PRICE_MULTIPLIER

      if (g.monto > threshold) {
        const pct = Math.round(((g.monto - avgPrice) / avgPrice) * 100)

        return {
          id: `econ_expensive_${product}`,
          type: 'expensive_price',
          text: `"${g.motivo}" a ${formatARS(g.monto)} — +${pct}% vs tu precio habitual (${formatARS(avgPrice)})`,
          priority: 5,
          severity: 'low',
          cta: {
            label: 'Ver historial de precios',
            action: 'navigate',
            href: '/money/insights',
          },
          data: { product, currentPrice: g.monto, avgPrice, pct },
        }
      }
    }
  }

  return null
}

// ── Rule 6: Días sin registrar gastos ────────────────────────

function checkNoRecords(gastos: Movimiento[]): EconomicAlert | null {
  if (gastos.length === 0) {
    return {
      id: 'econ_no_records',
      type: 'no_records',
      text: `No hay gastos registrados. Registrá tu primer gasto para activar insights.`,
      priority: 6,
      severity: 'low',
      cta: {
        label: 'Registrar gasto',
        action: 'chat_prefill',
        text: '',
      },
      data: { daysSinceLastRecord: Infinity },
    }
  }

  const now = new Date()
  const sorted = [...gastos].sort(
    (a, b) => toDate(b.fecha).getTime() - toDate(a.fecha).getTime()
  )
  const lastDate = toDate(sorted[0].fecha)
  const days = daysBetween(lastDate, now)

  if (days < THRESHOLDS.NO_RECORDS_DAYS) return null

  return {
    id: 'econ_no_records',
    type: 'no_records',
    text: `${days} días sin registrar gastos (último: ${lastDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })})`,
    priority: 6,
    severity: days >= 10 ? 'medium' : 'low',
    cta: {
      label: 'Registrar gasto',
      action: 'chat_prefill',
      text: '',
    },
    data: { daysSinceLastRecord: days },
  }
}

// ── Main Engine ──────────────────────────────────────────────

export interface GetEconomicAlertsInput {
  movimientos: Movimiento[]
  subscriptions?: Subscription[]
  priceHistory?: PriceRecord[]
}

/**
 * Main entry point — returns up to 3 alerts, sorted by priority (1 = most urgent)
 */
export function getEconomicAlerts(input: GetEconomicAlertsInput): EconomicAlert[] {
  const {
    movimientos,
    subscriptions = [],
    priceHistory = [],
  } = input

  const gastos = gastosOnly(movimientos)

  const alerts: EconomicAlert[] = []

  // Run all checks in priority order
  const dailyAnomaly = checkDailyAnomaly(gastos)
  if (dailyAnomaly) alerts.push(dailyAnomaly)

  const monthlyOverspend = checkMonthlyOverspend(gastos)
  if (monthlyOverspend) alerts.push(monthlyOverspend)

  const categoryOverflow = checkCategoryOverflow(gastos)
  if (categoryOverflow) alerts.push(categoryOverflow)

  const heavySubs = checkHeavySubscriptions(gastos, subscriptions)
  if (heavySubs) alerts.push(heavySubs)

  const expensivePrice = checkExpensivePrice(gastos, priceHistory)
  if (expensivePrice) alerts.push(expensivePrice)

  const noRecords = checkNoRecords(gastos)
  if (noRecords) alerts.push(noRecords)

  // Sort by priority (lower = higher urgency) and take max 3
  return alerts
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_ALERTS)
}
