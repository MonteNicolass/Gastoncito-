import { getMovimientos, getSaldos, getGoals, getBehavioralGoals, getSettings } from './storage'

export async function buildSnapshot() {
  const movimientos = await getMovimientos()
  const saldos = await getSaldos()
  const goals = await getGoals()
  const behavioralGoals = await getBehavioralGoals()
  const settings = await getSettings()

  const budgets = []
  try {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('gaston_budgets')
      if (stored) {
        budgets.push(...JSON.parse(stored))
      }
    }
  } catch (e) {
    console.error('Error loading budgets:', e)
  }

  const now = new Date()
  const last60Days = new Date(now)
  last60Days.setDate(last60Days.getDate() - 60)
  const last60DaysStr = last60Days.toISOString().split('T')[0]

  const movements_last_60 = movimientos.filter((m) => m.fecha >= last60DaysStr)

  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthMovs = movimientos.filter((m) => m.fecha && m.fecha.startsWith(thisMonth))

  const last7Days = new Date(now)
  last7Days.setDate(last7Days.getDate() - 7)
  const last7DaysStr = last7Days.toISOString().split('T')[0]
  const last7DaysMovs = movimientos.filter((m) => m.fecha >= last7DaysStr)

  const aggregates = {
    thisMonth: calculateAggregates(thisMonthMovs),
    last7Days: calculateAggregates(last7DaysMovs),
  }

  return {
    balances: saldos,
    budgets,
    goals,
    behavioral_goals: behavioralGoals,
    movements_last_60,
    aggregates,
    timestamp: now.toISOString(),
  }
}

function calculateAggregates(movs) {
  const gastos = movs.filter((m) => m.tipo === 'gasto').reduce((sum, m) => sum + m.monto, 0)
  const ingresos = movs.filter((m) => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
  const balance = ingresos - gastos

  const categoryTotals = {}
  movs
    .filter((m) => m.tipo === 'gasto')
    .forEach((m) => {
      if (m.categoria) {
        categoryTotals[m.categoria] = (categoryTotals[m.categoria] || 0) + m.monto
      }
    })

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]

  return {
    gastos,
    ingresos,
    balance,
    topCategory: topCategory ? topCategory[0] : null,
  }
}

export async function analyzeSnapshot(snapshot) {
  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ snapshot }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Error en el análisis')
    }

    const data = await response.json()
    return data.text || 'Sin respuesta'
  } catch (error) {
    console.error('Error analyzing snapshot:', error)
    throw error
  }
}