// lib/insights/moneyInsights.js
// Helpers puros para análisis de datos de Money

/**
 * Calcula el delta semanal (últimos 7 días vs 7 días anteriores)
 */
export function getWeeklyDelta(movimientos) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const last7Days = new Date(today)
  last7Days.setDate(today.getDate() - 7)

  const previous7Days = new Date(today)
  previous7Days.setDate(today.getDate() - 14)

  let currentWeekTotal = 0
  let previousWeekTotal = 0

  movimientos.forEach(m => {
    if (m.tipo !== 'gasto') return

    const fecha = new Date(m.fecha)

    if (fecha >= last7Days && fecha < today) {
      currentWeekTotal += m.monto
    } else if (fecha >= previous7Days && fecha < last7Days) {
      previousWeekTotal += m.monto
    }
  })

  const delta = currentWeekTotal - previousWeekTotal
  const deltaPercent = previousWeekTotal > 0
    ? ((delta / previousWeekTotal) * 100).toFixed(1)
    : 0

  return {
    current: currentWeekTotal,
    previous: previousWeekTotal,
    delta,
    deltaPercent: parseFloat(deltaPercent)
  }
}

/**
 * Obtiene top categorías en un período (7d o 30d)
 */
export function getTopCategories(movimientos, days = 7) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  const categoryTotals = {}

  movimientos.forEach(m => {
    if (m.tipo !== 'gasto') return

    const fecha = new Date(m.fecha)
    if (fecha >= startDate && fecha < today) {
      const cat = m.categoria || 'Sin categoría'
      categoryTotals[cat] = (categoryTotals[cat] || 0) + m.monto
    }
  })

  return Object.entries(categoryTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
}

/**
 * Obtiene top merchants (métodos de pago) en últimos 30 días
 */
export function getTopMerchants(movimientos, days = 30) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  const merchantTotals = {}

  movimientos.forEach(m => {
    if (m.tipo !== 'gasto') return

    const fecha = new Date(m.fecha)
    if (fecha >= startDate && fecha < today) {
      const merchant = m.metodo || 'efectivo'
      merchantTotals[merchant] = (merchantTotals[merchant] || 0) + m.monto
    }
  })

  return Object.entries(merchantTotals)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
}

/**
 * Calcula ratio de delivery (categorías delivery/comida vs total)
 */
export function getDeliveryRatio(movimientos, days = 7) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDate = new Date(today)
  startDate.setDate(today.getDate() - days)

  const deliveryKeywords = ['delivery', 'rappi', 'pedidosya', 'uber eats', 'comida']

  let deliveryTotal = 0
  let totalGastos = 0

  movimientos.forEach(m => {
    if (m.tipo !== 'gasto') return

    const fecha = new Date(m.fecha)
    if (fecha >= startDate && fecha < today) {
      totalGastos += m.monto

      const categoria = (m.categoria || '').toLowerCase()
      const motivo = (m.motivo || '').toLowerCase()

      const isDelivery = deliveryKeywords.some(kw =>
        categoria.includes(kw) || motivo.includes(kw)
      )

      if (isDelivery) {
        deliveryTotal += m.monto
      }
    }
  })

  const ratio = totalGastos > 0
    ? ((deliveryTotal / totalGastos) * 100).toFixed(1)
    : 0

  return {
    deliveryTotal,
    totalGastos,
    ratio: parseFloat(ratio)
  }
}

/**
 * Calcula total mensual de suscripciones y top 3
 */
export function getSubscriptionsInsights(subscriptions) {
  if (!subscriptions || subscriptions.length === 0) {
    return {
      monthlyTotal: 0,
      top3: []
    }
  }

  const active = subscriptions.filter(s => s.active)

  // Convertir a costo mensual
  const monthlyCosts = active.map(s => {
    const monthlyCost = s.cadence_months === 1
      ? s.amount
      : s.cadence_months === 3
      ? s.amount / 3
      : s.amount / 12

    return {
      name: s.name,
      amount: s.amount,
      cadence: s.cadence_months,
      monthlyCost
    }
  })

  const monthlyTotal = monthlyCosts.reduce((sum, s) => sum + s.monthlyCost, 0)

  const top3 = monthlyCosts
    .sort((a, b) => b.monthlyCost - a.monthlyCost)
    .slice(0, 3)

  return {
    monthlyTotal,
    top3
  }
}
