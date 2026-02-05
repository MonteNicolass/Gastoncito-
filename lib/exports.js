// lib/exports.js
// Sistema de exportación CSV

/**
 * Convierte array de objetos a CSV
 */
function arrayToCSV(data, headers) {
  if (data.length === 0) return ''

  const csvHeaders = headers.join(',')
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header] || ''
      // Escapar comillas y comas
      return typeof value === 'string' && (value.includes(',') || value.includes('"'))
        ? `"${value.replace(/"/g, '""')}"`
        : value
    }).join(',')
  })

  return [csvHeaders, ...csvRows].join('\n')
}

/**
 * Descarga un archivo CSV
 */
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Filtra movimientos por rango de fecha
 */
function filterByDateRange(movimientos, rangeType, customStart, customEnd) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  if (rangeType === 'month') {
    return movimientos.filter(m => {
      const fecha = new Date(m.fecha)
      return fecha.getMonth() === currentMonth && fecha.getFullYear() === currentYear
    })
  } else if (rangeType === 'custom' && customStart && customEnd) {
    const start = new Date(customStart)
    const end = new Date(customEnd)
    return movimientos.filter(m => {
      const fecha = new Date(m.fecha)
      return fecha >= start && fecha <= end
    })
  } else if (rangeType === 'all') {
    return movimientos
  }

  return movimientos
}

/**
 * Exporta movimientos a CSV
 */
export function exportMovimientosCSV(movimientos, rangeType = 'all', customStart = null, customEnd = null) {
  const filtered = filterByDateRange(movimientos, rangeType, customStart, customEnd)

  const data = filtered.map(m => ({
    fecha: m.fecha,
    tipo: m.tipo,
    monto: m.monto,
    categoria: m.categoria || '',
    metodo: m.metodo || '',
    motivo: m.motivo || '',
    recurrent: m.recurrent ? 'Sí' : 'No'
  }))

  const headers = ['fecha', 'tipo', 'monto', 'categoria', 'metodo', 'motivo', 'recurrent']
  const csv = arrayToCSV(data, headers)

  const filename = `gastoncito_movimientos_${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(csv, filename)
}

/**
 * Exporta billeteras a CSV
 */
export function exportBilleterasCSV(wallets) {
  const data = wallets.map(w => ({
    nombre: w.wallet,
    tipo: w.tipo || '',
    saldo: w.saldo,
    proveedor: w.proveedor || '',
    principal: w.is_primary ? 'Sí' : 'No',
    oculta: w.is_hidden ? 'Sí' : 'No'
  }))

  const headers = ['nombre', 'tipo', 'saldo', 'proveedor', 'principal', 'oculta']
  const csv = arrayToCSV(data, headers)

  const filename = `gastoncito_billeteras_${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(csv, filename)
}

/**
 * Exporta presupuestos a CSV
 */
export function exportPresupuestosCSV(budgets) {
  const data = budgets.map(b => ({
    nombre: b.name,
    tipo: b.type,
    objetivo: b.target_id,
    monto: b.amount,
    periodo: b.period
  }))

  const headers = ['nombre', 'tipo', 'objetivo', 'monto', 'periodo']
  const csv = arrayToCSV(data, headers)

  const filename = `gastoncito_presupuestos_${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(csv, filename)
}

/**
 * Exporta objetivos a CSV
 */
export function exportObjetivosCSV(goals) {
  const data = goals.map(g => ({
    nombre: g.name,
    tipo: g.type || 'general',
    objetivo: g.target,
    progreso: g.progress,
    estado: g.status,
    creado: g.created_at
  }))

  const headers = ['nombre', 'tipo', 'objetivo', 'progreso', 'estado', 'creado']
  const csv = arrayToCSV(data, headers)

  const filename = `gastoncito_objetivos_${new Date().toISOString().split('T')[0]}.csv`
  downloadCSV(csv, filename)
}
