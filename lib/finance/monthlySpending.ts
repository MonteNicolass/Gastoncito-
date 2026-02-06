// ── Types ────────────────────────────────────────────────

export interface CategoryRank {
  name: string
  amount: number
  percent: number
  rank: number
  prevAmount: number
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
}

export interface MonthlySpendingSummary {
  currentMonth: string
  currentSpend: number
  avgMonthlySpend: number
  deltaVsAvg: number
  deltaVsAvgPercent: number
  trend: 'up' | 'down' | 'stable'
  categories: CategoryRank[]
  daysElapsed: number
  daysRemaining: number
  projectedTotal: number
  projectedDelta: number
  projectedDeltaPercent: number
  hasEnoughData: boolean
}

interface Movimiento {
  tipo: string
  monto: number
  fecha: string
  categoria?: string
}

// ── Helpers ──────────────────────────────────────────────

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// ── Main Function ────────────────────────────────────────

export function getMonthlySpendingSummary(movimientos: Movimiento[]): MonthlySpendingSummary {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const daysElapsed = now.getDate()
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysRemaining = totalDays - daysElapsed

  // Current month gastos
  const currentGastos = movimientos.filter(m => {
    if (m.tipo !== 'gasto') return false
    const d = new Date(m.fecha)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const currentSpend = currentGastos.reduce((s, m) => s + m.monto, 0)

  // Historical monthly totals (last 6 months, excluding current)
  const monthlyTotals: number[] = []
  for (let i = 1; i <= 6; i++) {
    const target = new Date(currentYear, currentMonth - i, 1)
    const tMonth = target.getMonth()
    const tYear = target.getFullYear()

    const monthGastos = movimientos.filter(m => {
      if (m.tipo !== 'gasto') return false
      const d = new Date(m.fecha)
      return d.getMonth() === tMonth && d.getFullYear() === tYear
    })

    const total = monthGastos.reduce((s, m) => s + m.monto, 0)
    if (total > 0) monthlyTotals.push(total)
  }

  const hasEnoughData = monthlyTotals.length >= 2
  const avgMonthlySpend = monthlyTotals.length > 0
    ? Math.round(monthlyTotals.reduce((s, t) => s + t, 0) / monthlyTotals.length)
    : 0

  // Projection
  const dailyAvg = daysElapsed > 0 ? currentSpend / daysElapsed : 0
  const projectedTotal = Math.round(dailyAvg * totalDays)
  const projectedDelta = projectedTotal - avgMonthlySpend
  const projectedDeltaPercent = avgMonthlySpend > 0
    ? Math.round((projectedDelta / avgMonthlySpend) * 100)
    : 0

  // Delta vs average
  const deltaVsAvg = currentSpend - avgMonthlySpend
  const deltaVsAvgPercent = avgMonthlySpend > 0
    ? Math.round(((currentSpend - avgMonthlySpend) / avgMonthlySpend) * 100)
    : 0

  const trend: 'up' | 'down' | 'stable' =
    deltaVsAvgPercent > 10 ? 'up' : deltaVsAvgPercent < -10 ? 'down' : 'stable'

  // Category ranking with previous month comparison
  const prevTarget = new Date(currentYear, currentMonth - 1, 1)
  const prevMonth = prevTarget.getMonth()
  const prevYear = prevTarget.getFullYear()

  const prevGastos = movimientos.filter(m => {
    if (m.tipo !== 'gasto') return false
    const d = new Date(m.fecha)
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear
  })

  const currentByCat = new Map<string, number>()
  for (const m of currentGastos) {
    const cat = m.categoria || 'sin categoría'
    currentByCat.set(cat, (currentByCat.get(cat) || 0) + m.monto)
  }

  const prevByCat = new Map<string, number>()
  for (const m of prevGastos) {
    const cat = m.categoria || 'sin categoría'
    prevByCat.set(cat, (prevByCat.get(cat) || 0) + m.monto)
  }

  const categories: CategoryRank[] = Array.from(currentByCat.entries())
    .map(([name, amount], _idx) => {
      const percent = currentSpend > 0 ? Math.round((amount / currentSpend) * 100) : 0
      const prevAmount = prevByCat.get(name) || 0
      const change = amount - prevAmount
      const changePercent = prevAmount > 0 ? Math.round(((amount - prevAmount) / prevAmount) * 100) : 0
      const catTrend: 'up' | 'down' | 'stable' =
        changePercent > 15 ? 'up' : changePercent < -15 ? 'down' : 'stable'
      return { name, amount, percent, rank: 0, prevAmount, change, changePercent, trend: catTrend }
    })
    .sort((a, b) => b.amount - a.amount)

  categories.forEach((c, i) => { c.rank = i + 1 })

  return {
    currentMonth: getMonthLabel(now),
    currentSpend,
    avgMonthlySpend,
    deltaVsAvg,
    deltaVsAvgPercent,
    trend,
    categories,
    daysElapsed,
    daysRemaining,
    projectedTotal,
    projectedDelta,
    projectedDeltaPercent,
    hasEnoughData,
  }
}
