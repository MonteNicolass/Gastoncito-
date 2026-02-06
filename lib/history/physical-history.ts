/**
 * Physical History V1
 * Comparativa 7d / 30d para el pilar físico.
 */

import type { PhysicalRecord } from '@/lib/physical-engine'

// ── Types ────────────────────────────────────────────────────

export interface PhysicalHistory {
  last7: number
  last30: number
  trend: 'up' | 'down' | 'stable'
  text: string
}

// ── Constants ────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000

// ── Helpers ──────────────────────────────────────────────────

function uniqueDays(records: PhysicalRecord[]): number {
  return new Set(records.map(r => r.date)).size
}

// ── Main ─────────────────────────────────────────────────────

export function getPhysicalHistory(records: PhysicalRecord[]): PhysicalHistory {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  const d7 = new Date(now.getTime() - 7 * MS_PER_DAY)
  const d30 = new Date(now.getTime() - 30 * MS_PER_DAY)

  const r7 = records.filter(r => new Date(r.date) >= d7)
  const r30 = records.filter(r => new Date(r.date) >= d30)

  const last7 = uniqueDays(r7)
  const last30 = uniqueDays(r30)

  const weeklyRate30 = last30 / 4.3
  const weeklyRate7 = last7

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (weeklyRate30 > 0) {
    const ratio = weeklyRate7 / weeklyRate30
    if (ratio > 1.3) trend = 'up'
    else if (ratio < 0.7) trend = 'down'
  } else if (last7 > 0) {
    trend = 'up'
  }

  let text: string
  if (last30 === 0) {
    text = 'Sin actividad registrada'
  } else if (trend === 'down') {
    text = 'Menos actividad que tu promedio mensual'
  } else if (trend === 'up') {
    text = 'Actividad por encima del promedio'
  } else {
    text = 'Ritmo de actividad habitual'
  }

  return { last7, last30, trend, text }
}
