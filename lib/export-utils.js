/**
 * Export Inteligente - JSON y CSV
 */

/**
 * Exporta datos de la semana en JSON
 */
export function exportWeekJSON(movimientos, lifeEntries, goals) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const weekMovimientos = movimientos.filter(m => new Date(m.fecha) >= last7Days)
  const weekLifeEntries = lifeEntries.filter(e => new Date(e.created_at) >= last7Days)
  const activeGoals = goals.filter(g => g.status === 'active')

  const data = {
    period: 'week',
    exported_at: new Date().toISOString(),
    movimientos: weekMovimientos,
    life_entries: weekLifeEntries,
    goals: activeGoals
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gastoncito-semana-${now.toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Exporta datos del mes en JSON
 */
export function exportMonthJSON(movimientos, lifeEntries, goals) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthMovimientos = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear
  })

  const monthStart = new Date(currentYear, currentMonth, 1)
  const monthLifeEntries = lifeEntries.filter(e => new Date(e.created_at) >= monthStart)
  const activeGoals = goals.filter(g => g.status === 'active')

  const data = {
    period: 'month',
    exported_at: new Date().toISOString(),
    movimientos: monthMovimientos,
    life_entries: monthLifeEntries,
    goals: activeGoals
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gastoncito-mes-${now.toISOString().slice(0, 7)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Exporta todos los datos en JSON
 */
export function exportAllJSON(movimientos, lifeEntries, goals, notes) {
  const data = {
    period: 'all',
    exported_at: new Date().toISOString(),
    movimientos,
    life_entries: lifeEntries,
    goals,
    notes: notes || []
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gastoncito-completo-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Convierte array a CSV
 */
function arrayToCSV(headers, rows) {
  const csvRows = []
  csvRows.push(headers.join(','))

  rows.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || ''
      // Escapar comillas y comas
      const escaped = String(value).replace(/"/g, '""')
      return `"${escaped}"`
    })
    csvRows.push(values.join(','))
  })

  return csvRows.join('\n')
}

/**
 * Exporta movimientos de la semana en CSV
 */
export function exportWeekCSV(movimientos) {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const weekMovimientos = movimientos.filter(m => new Date(m.fecha) >= last7Days)

  const headers = ['fecha', 'tipo', 'monto', 'metodo', 'categoria', 'motivo']
  const csv = arrayToCSV(headers, weekMovimientos)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gastoncito-movimientos-semana-${now.toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Exporta movimientos del mes en CSV
 */
export function exportMonthCSV(movimientos) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthMovimientos = movimientos.filter(m => {
    const fecha = new Date(m.fecha)
    return fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear
  })

  const headers = ['fecha', 'tipo', 'monto', 'metodo', 'categoria', 'motivo']
  const csv = arrayToCSV(headers, monthMovimientos)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gastoncito-movimientos-mes-${now.toISOString().slice(0, 7)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Exporta todos los movimientos en CSV
 */
export function exportAllCSV(movimientos) {
  const headers = ['fecha', 'tipo', 'monto', 'metodo', 'categoria', 'motivo']
  const csv = arrayToCSV(headers, movimientos)

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gastoncito-movimientos-completo-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
