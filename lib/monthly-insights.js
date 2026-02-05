// lib/monthly-insights.js
// Cálculos para resumen mensual y predicciones

/**
 * Obtiene el mes actual y el anterior
 */
function getCurrentAndPreviousMonth() {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear

  return {
    current: { month: currentMonth, year: currentYear },
    previous: { month: prevMonth, year: prevYear },
    today: now
  }
}

/**
 * Filtra movimientos por mes y año
 */
function filterByMonth(movimientos, month, year) {
  return movimientos.filter(mov => {
    const movDate = new Date(mov.fecha)
    return movDate.getMonth() === month && movDate.getFullYear() === year
  })
}

/**
 * Calcula el resumen mensual del mes actual
 */
export function getCurrentMonthSummary(movimientos) {
  const { current } = getCurrentAndPreviousMonth()
  const currentMovs = filterByMonth(movimientos, current.month, current.year)

  const gastos = currentMovs.filter(m => m.tipo === 'gasto')
  const ingresos = currentMovs.filter(m => m.tipo === 'ingreso')

  const totalGastos = gastos.reduce((sum, m) => sum + m.monto, 0)
  const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0)
  const balance = totalIngresos - totalGastos

  return {
    totalGastos,
    totalIngresos,
    balance,
    cantidadMovimientos: currentMovs.length
  }
}

/**
 * Calcula el resumen del mes anterior
 */
export function getPreviousMonthSummary(movimientos) {
  const { previous } = getCurrentAndPreviousMonth()
  const prevMovs = filterByMonth(movimientos, previous.month, previous.year)

  const gastos = prevMovs.filter(m => m.tipo === 'gasto')
  const ingresos = prevMovs.filter(m => m.tipo === 'ingreso')

  const totalGastos = gastos.reduce((sum, m) => sum + m.monto, 0)
  const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0)
  const balance = totalIngresos - totalGastos

  return {
    totalGastos,
    totalIngresos,
    balance,
    cantidadMovimientos: prevMovs.length
  }
}

/**
 * Compara mes actual vs anterior
 */
export function compareWithPreviousMonth(movimientos) {
  const currentSummary = getCurrentMonthSummary(movimientos)
  const previousSummary = getPreviousMonthSummary(movimientos)

  const deltaGastos = currentSummary.totalGastos - previousSummary.totalGastos
  const deltaPercentGastos = previousSummary.totalGastos > 0
    ? ((deltaGastos / previousSummary.totalGastos) * 100).toFixed(1)
    : 0

  const deltaIngresos = currentSummary.totalIngresos - previousSummary.totalIngresos
  const deltaPercentIngresos = previousSummary.totalIngresos > 0
    ? ((deltaIngresos / previousSummary.totalIngresos) * 100).toFixed(1)
    : 0

  return {
    current: currentSummary,
    previous: previousSummary,
    deltaGastos,
    deltaPercentGastos,
    deltaIngresos,
    deltaPercentIngresos,
    isSpendingUp: deltaGastos > 0
  }
}

/**
 * Obtiene top 5 categorías del mes actual
 */
export function getTopCategoriesThisMonth(movimientos, categorias) {
  const { current } = getCurrentAndPreviousMonth()
  const currentMovs = filterByMonth(movimientos, current.month, current.year)
  const gastos = currentMovs.filter(m => m.tipo === 'gasto')

  // Agrupar por categoría
  const categoryMap = {}

  gastos.forEach(mov => {
    // Buscar nombre de categoría por ID o usar el campo categoria
    let categoryName = mov.categoria || 'Sin categoría'

    if (mov.category_id && categorias) {
      const cat = categorias.find(c => c.id === mov.category_id)
      if (cat) categoryName = cat.nombre
    }

    if (!categoryMap[categoryName]) {
      categoryMap[categoryName] = 0
    }
    categoryMap[categoryName] += mov.monto
  })

  // Convertir a array y ordenar
  const categories = Object.entries(categoryMap)
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)

  return categories
}

/**
 * Obtiene el día con mayor gasto del mes actual
 */
export function getHighestSpendingDay(movimientos) {
  const { current } = getCurrentAndPreviousMonth()
  const currentMovs = filterByMonth(movimientos, current.month, current.year)
  const gastos = currentMovs.filter(m => m.tipo === 'gasto')

  if (gastos.length === 0) return null

  // Agrupar por día
  const dayMap = {}

  gastos.forEach(mov => {
    const day = mov.fecha.split('T')[0] // YYYY-MM-DD
    if (!dayMap[day]) {
      dayMap[day] = 0
    }
    dayMap[day] += mov.monto
  })

  // Encontrar el día con mayor gasto
  const days = Object.entries(dayMap).map(([date, total]) => ({ date, total }))
  const highestDay = days.sort((a, b) => b.total - a.total)[0]

  return highestDay
}

/**
 * Predicción simple de fin de mes basada en promedio diario
 */
export function getEndOfMonthPrediction(movimientos) {
  const { current, today } = getCurrentAndPreviousMonth()
  const currentMovs = filterByMonth(movimientos, current.month, current.year)
  const gastos = currentMovs.filter(m => m.tipo === 'gasto')

  if (gastos.length === 0) return null

  const totalGastosActual = gastos.reduce((sum, m) => sum + m.monto, 0)

  // Calcular día del mes actual (1-31)
  const currentDay = today.getDate()

  // Calcular días totales del mes
  const lastDayOfMonth = new Date(current.year, current.month + 1, 0).getDate()

  // Promedio diario hasta hoy
  const dailyAverage = totalGastosActual / currentDay

  // Proyección para fin de mes
  const projectedTotal = dailyAverage * lastDayOfMonth

  // Días restantes
  const remainingDays = lastDayOfMonth - currentDay

  // Gasto proyectado en días restantes
  const projectedRemaining = dailyAverage * remainingDays

  return {
    currentSpent: totalGastosActual,
    dailyAverage,
    projectedTotal,
    projectedRemaining,
    currentDay,
    totalDays: lastDayOfMonth,
    remainingDays
  }
}

/**
 * Detecta alertas visuales
 */
export function getMonthlyAlerts(movimientos, budgets = []) {
  const alerts = []

  // Comparar con mes anterior
  const comparison = compareWithPreviousMonth(movimientos)
  if (comparison.isSpendingUp && Math.abs(comparison.deltaPercentGastos) > 20) {
    alerts.push({
      type: 'spending_up',
      severity: 'warning',
      message: `Gastaste ${comparison.deltaPercentGastos}% más que el mes anterior`,
      delta: comparison.deltaPercentGastos
    })
  }

  // Predicción vs presupuestos
  const prediction = getEndOfMonthPrediction(movimientos)
  if (prediction && budgets.length > 0) {
    // Calcular presupuesto total mensual
    const totalBudget = budgets.reduce((sum, b) => sum + (b.amount || 0), 0)

    if (totalBudget > 0 && prediction.projectedTotal > totalBudget) {
      const overBudget = ((prediction.projectedTotal - totalBudget) / totalBudget) * 100
      alerts.push({
        type: 'budget_risk',
        severity: 'high',
        message: `A este ritmo, superarás el presupuesto en ${overBudget.toFixed(0)}%`,
        projected: prediction.projectedTotal,
        budget: totalBudget
      })
    }
  }

  return alerts
}

/**
 * Obtiene todos los insights mensuales
 */
export function getAllMonthlyInsights(movimientos, categorias, budgets = []) {
  const summary = getCurrentMonthSummary(movimientos)
  const comparison = compareWithPreviousMonth(movimientos)
  const topCategories = getTopCategoriesThisMonth(movimientos, categorias)
  const highestDay = getHighestSpendingDay(movimientos)
  const prediction = getEndOfMonthPrediction(movimientos)
  const alerts = getMonthlyAlerts(movimientos, budgets)

  return {
    summary,
    comparison,
    topCategories,
    highestDay,
    prediction,
    alerts
  }
}
