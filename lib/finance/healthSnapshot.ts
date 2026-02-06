// ── Types ────────────────────────────────────────────────

const INCOME_KEY = 'gaston_estimated_income'

export interface CategoryBreakdown {
  name: string
  amount: number
  percent: number
  vsAvg: number
  vsAvgPercent: number
  isCritical: boolean
}

export interface HealthSnapshot {
  estimatedIncome: number
  totalExpenses: number
  subscriptionsTotal: number
  expenseRatio: number
  subscriptionRatio: number
  remainingRatio: number
  topCategories: CategoryBreakdown[]
  criticalCategories: CategoryBreakdown[]
  level: 'saludable' | 'moderado' | 'ajustado' | 'critico'
  summary: string
  hasIncome: boolean
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
}

// ── Income Management ────────────────────────────────────

export function getEstimatedIncome(): number {
  if (typeof window === 'undefined') return 0
  try {
    const data = localStorage.getItem(INCOME_KEY)
    return data ? JSON.parse(data).amount : 0
  } catch {
    return 0
  }
}

export function setEstimatedIncome(amount: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(INCOME_KEY, JSON.stringify({
    amount,
    updatedAt: new Date().toISOString(),
  }))
}

// ── Health Calculation ───────────────────────────────────

export function calculateHealthSnapshot(
  movimientos: Movimiento[],
  subscriptions: Subscription[],
  estimatedIncome?: number,
): HealthSnapshot {
  const income = estimatedIncome ?? getEstimatedIncome()
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // Current month expenses
  const currentMonthGastos = movimientos.filter(m => {
    if (m.tipo !== 'gasto') return false
    const d = new Date(m.fecha)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const totalExpenses = currentMonthGastos.reduce((s, m) => s + m.monto, 0)

  // Active subscriptions total
  const subscriptionsTotal = subscriptions
    .filter(s => s.active)
    .reduce((s, sub) => s + sub.amount, 0)

  // Ratios
  const expenseRatio = income > 0 ? Math.round((totalExpenses / income) * 100) : 0
  const subscriptionRatio = income > 0 ? Math.round((subscriptionsTotal / income) * 100) : 0
  const remainingRatio = income > 0 ? Math.max(0, 100 - expenseRatio) : 0

  // Category breakdown with historical comparison
  const categoryMap = new Map<string, number>()
  for (const m of currentMonthGastos) {
    const cat = m.categoria || 'sin categoría'
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + m.monto)
  }

  // Historical monthly averages by category (last 3 months)
  const historicalCatAvg = new Map<string, number>()
  for (let i = 1; i <= 3; i++) {
    const targetDate = new Date(currentYear, currentMonth - i, 1)
    const targetMonth = targetDate.getMonth()
    const targetYear = targetDate.getFullYear()

    const monthGastos = movimientos.filter(m => {
      if (m.tipo !== 'gasto') return false
      const d = new Date(m.fecha)
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear
    })

    for (const m of monthGastos) {
      const cat = m.categoria || 'sin categoría'
      historicalCatAvg.set(cat, (historicalCatAvg.get(cat) || 0) + m.monto)
    }
  }

  // Average over 3 months
  for (const [cat, total] of historicalCatAvg) {
    historicalCatAvg.set(cat, Math.round(total / 3))
  }

  // Build sorted categories
  const topCategories: CategoryBreakdown[] = Array.from(categoryMap.entries())
    .map(([name, amount]) => {
      const percent = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0
      const histAvg = historicalCatAvg.get(name) || 0
      const vsAvg = amount - histAvg
      const vsAvgPercent = histAvg > 0 ? Math.round(((amount - histAvg) / histAvg) * 100) : 0
      const isCritical = vsAvgPercent > 30 && amount > totalExpenses * 0.1
      return { name, amount, percent, vsAvg, vsAvgPercent, isCritical }
    })
    .sort((a, b) => b.amount - a.amount)

  const criticalCategories = topCategories.filter(c => c.isCritical)

  // Health level
  let level: HealthSnapshot['level'] = 'saludable'
  if (income > 0) {
    if (expenseRatio >= 100) level = 'critico'
    else if (expenseRatio >= 80) level = 'ajustado'
    else if (expenseRatio >= 60) level = 'moderado'
  }

  // Summary text
  let summary = ''
  if (!income) {
    summary = 'Configurá tu ingreso estimado para ver tu salud financiera'
  } else if (level === 'critico') {
    summary = `Gastos al ${expenseRatio}% del ingreso`
  } else if (level === 'ajustado') {
    summary = `Gastos al ${expenseRatio}% del ingreso. Margen reducido`
  } else if (level === 'moderado') {
    summary = `Gastos al ${expenseRatio}% del ingreso`
  } else {
    summary = `Gastos al ${expenseRatio}% del ingreso. Margen disponible: ${remainingRatio}%`
  }

  return {
    estimatedIncome: income,
    totalExpenses,
    subscriptionsTotal,
    expenseRatio,
    subscriptionRatio,
    remainingRatio,
    topCategories,
    criticalCategories,
    level,
    summary,
    hasIncome: income > 0,
  }
}
