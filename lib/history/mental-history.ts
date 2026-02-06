/**
 * Mental History V1
 * Comparativa 7d / 30d para el pilar mental.
 */

import type { MentalRecord } from '@/lib/mental-engine'

// ── Types ────────────────────────────────────────────────────

export interface MentalHistory {
  last7: number | null
  last30: number | null
  trend: 'up' | 'down' | 'stable'
  text: string
}

// ── Constants ────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000

// ── Helpers ──────────────────────────────────────────────────

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

// ── Main ─────────────────────────────────────────────────────

export function getMentalHistory(records: MentalRecord[]): MentalHistory {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  const d7 = new Date(now.getTime() - 7 * MS_PER_DAY)
  const d30 = new Date(now.getTime() - 30 * MS_PER_DAY)

  const r7 = records.filter(r => new Date(r.date) >= d7)
  const r30 = records.filter(r => new Date(r.date) >= d30)

  const avg7 = avg(r7.map(r => r.moodLevel))
  const avg30 = avg(r30.map(r => r.moodLevel))

  const last7 = avg7 !== null ? Math.round(avg7 * 10) / 10 : null
  const last30 = avg30 !== null ? Math.round(avg30 * 10) / 10 : null

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (avg7 !== null && avg30 !== null && r7.length >= 2 && r30.length >= 5) {
    if (avg7 > avg30 * 1.1) trend = 'up'
    else if (avg7 < avg30 * 0.9) trend = 'down'
  }

  let text: string
  if (last7 === null) {
    text = 'Sin registros recientes'
  } else if (trend === 'down') {
    text = 'Estado promedio menor que tu mes anterior'
  } else if (trend === 'up') {
    text = 'Estado promedio mejor que tu mes anterior'
  } else {
    text = 'Estado dentro de tu rango habitual'
  }

  return { last7, last30, trend, text }
}
