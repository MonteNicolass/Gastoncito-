/**
 * Economy History V1
 * Comparativa 7d / 30d para el pilar económico.
 */

import type { Movimiento } from '@/lib/economic-alerts-engine'

// ── Types ────────────────────────────────────────────────────

export interface EconomyHistory {
  last7: number
  last30: number
  avg30Daily: number
  trend: 'up' | 'down' | 'stable'
  text: string
}

// ── Constants ────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000

// ── Main ─────────────────────────────────────────────────────

export function getEconomyHistory(movimientos: Movimiento[]): EconomyHistory {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  const gastos = movimientos.filter(m => m.tipo === 'gasto')

  const d7 = new Date(now.getTime() - 7 * MS_PER_DAY)
  const d30 = new Date(now.getTime() - 30 * MS_PER_DAY)

  const last7 = gastos
    .filter(g => new Date(g.fecha) >= d7)
    .reduce((s, g) => s + g.monto, 0)

  const last30 = gastos
    .filter(g => new Date(g.fecha) >= d30)
    .reduce((s, g) => s + g.monto, 0)

  const avg30Daily = last30 / 30
  const avg7Daily = last7 / 7

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (avg30Daily > 0) {
    const ratio = avg7Daily / avg30Daily
    if (!isFinite(ratio)) trend = 'stable' as const
    else if (ratio > 1.15) trend = 'up'
    else if (ratio < 0.85) trend = 'down'
  }

  let text: string
  if (trend === 'up') {
    text = 'Gasto semanal por encima del promedio'
  } else if (trend === 'down') {
    text = 'Gasto semanal por debajo del promedio'
  } else {
    text = 'Gasto dentro de tu rango habitual'
  }

  return {
    last7: isFinite(last7) ? Math.round(last7) : 0,
    last30: isFinite(last30) ? Math.round(last30) : 0,
    avg30Daily: Math.round(avg30Daily),
    trend,
    text,
  }
}
