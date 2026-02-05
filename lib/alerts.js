// lib/alerts.js
// Sistema de detección de alertas para Gastoncito

/**
 * Detectar gasto diario alto (>1.5x promedio últimos 7 días)
 * @param {Array} movimientos - Array de movimientos
 * @param {number} threshold - Multiplicador del promedio (default: 1.5)
 * @returns {Object|null} - Objeto de alerta o null si no hay alerta
 */
export function detectHighDailySpending(movimientos, threshold = 1.5) {
  if (!movimientos || movimientos.length === 0) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Filtrar gastos de los últimos 7 días (sin contar hoy)
  const recentExpenses = movimientos.filter(mov => {
    const movDate = new Date(mov.fecha)
    const movDay = new Date(movDate.getFullYear(), movDate.getMonth(), movDate.getDate())
    return (
      mov.tipo === 'gasto' &&
      movDay >= sevenDaysAgo &&
      movDay < today
    )
  })

  // Gastos de hoy
  const todayExpenses = movimientos.filter(mov => {
    const movDate = new Date(mov.fecha)
    const movDay = new Date(movDate.getFullYear(), movDate.getMonth(), movDate.getDate())
    return mov.tipo === 'gasto' && movDay.getTime() === today.getTime()
  })

  if (recentExpenses.length === 0 || todayExpenses.length === 0) return null

  // Calcular promedio diario de los últimos 7 días
  const dailyTotals = {}
  recentExpenses.forEach(mov => {
    const movDate = new Date(mov.fecha)
    const dayKey = movDate.toISOString().split('T')[0]
    dailyTotals[dayKey] = (dailyTotals[dayKey] || 0) + mov.monto
  })

  const avgDaily = Object.values(dailyTotals).reduce((sum, val) => sum + val, 0) / Object.keys(dailyTotals).length

  // Calcular total de hoy
  const todayTotal = todayExpenses.reduce((sum, mov) => sum + mov.monto, 0)

  // Comparar con el threshold
  if (todayTotal > avgDaily * threshold) {
    const severity = todayTotal > avgDaily * 2 ? 'high' : 'medium'
    return {
      type: 'high_spending',
      severity,
      title: 'Gasto diario alto',
      message: `Hoy gastaste ${formatCurrency(todayTotal)}, ${((todayTotal / avgDaily - 1) * 100).toFixed(0)}% más que tu promedio de ${formatCurrency(avgDaily)}`,
      data: {
        todayTotal,
        avgDaily,
        threshold,
        percentage: (todayTotal / avgDaily) * 100
      }
    }
  }

  return null
}

/**
 * Detectar muchas transacciones en poco tiempo (>5 en 1 hora)
 * @param {Array} movimientos - Array de movimientos
 * @param {number} count - Número mínimo de transacciones (default: 5)
 * @param {number} hours - Ventana de tiempo en horas (default: 1)
 * @returns {Object|null} - Objeto de alerta o null si no hay alerta
 */
export function detectFrequentTransactions(movimientos, count = 5, hours = 1) {
  if (!movimientos || movimientos.length === 0) return null

  const now = new Date()
  const timeWindow = hours * 60 * 60 * 1000 // Convertir horas a milisegundos
  const cutoffTime = new Date(now.getTime() - timeWindow)

  // Filtrar transacciones en la ventana de tiempo
  const recentTransactions = movimientos.filter(mov => {
    const movDate = new Date(mov.fecha)
    return movDate >= cutoffTime
  })

  if (recentTransactions.length >= count) {
    const severity = recentTransactions.length >= count * 2 ? 'high' : 'medium'
    return {
      type: 'frequent_tx',
      severity,
      title: 'Muchas transacciones',
      message: `Registraste ${recentTransactions.length} transacciones en ${hours === 1 ? 'la última hora' : `las últimas ${hours} horas`}`,
      data: {
        count: recentTransactions.length,
        threshold: count,
        hours,
        transactions: recentTransactions
      }
    }
  }

  return null
}

/**
 * Detectar presupuestos excedidos (leer de localStorage 'gaston_budgets')
 * @returns {Array} - Array de alertas de presupuestos excedidos
 */
export function detectBudgetExceeded() {
  if (typeof window === 'undefined') return []

  try {
    const budgetsData = localStorage.getItem('gaston_budgets')
    if (!budgetsData) return []

    const budgets = JSON.parse(budgetsData)
    if (!Array.isArray(budgets) || budgets.length === 0) return []

    // Necesitamos calcular el progreso de cada presupuesto
    // Por ahora retornamos vacío ya que necesitamos los movimientos
    // Esta función se usará desde la página con los movimientos disponibles
    return []
  } catch (error) {
    console.error('Error detectando presupuestos excedidos:', error)
    return []
  }
}

/**
 * Detectar presupuestos excedidos con movimientos
 * @param {Array} movimientos - Array de movimientos
 * @param {Array} categorias - Array de categorías
 * @returns {Array} - Array de alertas de presupuestos excedidos
 */
export function detectBudgetExceededWithData(movimientos, categorias) {
  if (typeof window === 'undefined') return []

  try {
    const budgetsData = localStorage.getItem('gaston_budgets')
    if (!budgetsData) return []

    const budgets = JSON.parse(budgetsData)
    if (!Array.isArray(budgets) || budgets.length === 0) return []

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const alerts = []

    budgets.forEach(budget => {
      // Filtrar movimientos del mes actual
      const monthMovements = movimientos.filter(mov => {
        const movDate = new Date(mov.fecha)
        return (
          movDate.getMonth() === currentMonth &&
          movDate.getFullYear() === currentYear &&
          mov.tipo === 'gasto'
        )
      })

      let spent = 0

      if (budget.type === 'category') {
        // Filtrar por categoría
        spent = monthMovements
          .filter(mov => {
            const cat = categorias.find(c => c.id === mov.category_id)
            return cat?.nombre === budget.target_id || mov.categoria === budget.target_id
          })
          .reduce((sum, mov) => sum + mov.monto, 0)
      } else {
        // Filtrar por billetera
        spent = monthMovements
          .filter(mov => mov.metodo === budget.target_id)
          .reduce((sum, mov) => sum + mov.monto, 0)
      }

      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

      if (percentage >= 100) {
        alerts.push({
          type: 'budget_exceeded',
          severity: percentage >= 120 ? 'high' : 'medium',
          title: 'Presupuesto excedido',
          message: `"${budget.name}" excedió el límite: ${formatCurrency(spent)} de ${formatCurrency(budget.amount)} (${percentage.toFixed(0)}%)`,
          data: {
            budgetName: budget.name,
            spent,
            limit: budget.amount,
            percentage,
            overspent: spent - budget.amount
          }
        })
      } else if (percentage >= 90) {
        alerts.push({
          type: 'budget_exceeded',
          severity: 'low',
          title: 'Presupuesto cerca del límite',
          message: `"${budget.name}" está al ${percentage.toFixed(0)}%: ${formatCurrency(spent)} de ${formatCurrency(budget.amount)}`,
          data: {
            budgetName: budget.name,
            spent,
            limit: budget.amount,
            percentage,
            remaining: budget.amount - spent
          }
        })
      }
    })

    return alerts
  } catch (error) {
    console.error('Error detectando presupuestos excedidos:', error)
    return []
  }
}

/**
 * Función principal que retorna todas las alertas activas
 * @param {Array} movimientos - Array de movimientos
 * @param {Array} categorias - Array de categorías (opcional)
 * @returns {Array} - Array de todas las alertas activas
 */
export function getAllAlerts(movimientos, categorias = []) {
  const alerts = []

  // Detectar gasto diario alto
  const highSpending = detectHighDailySpending(movimientos)
  if (highSpending) alerts.push(highSpending)

  // Detectar transacciones frecuentes
  const frequentTx = detectFrequentTransactions(movimientos)
  if (frequentTx) alerts.push(frequentTx)

  // Detectar presupuestos excedidos
  const budgetAlerts = detectBudgetExceededWithData(movimientos, categorias)
  alerts.push(...budgetAlerts)

  // Ordenar por severidad (high > medium > low)
  const severityOrder = { high: 0, medium: 1, low: 2 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return alerts
}

/**
 * Helper para formatear moneda
 * @param {number} amount - Monto a formatear
 * @returns {string} - Monto formateado
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}
