/**
 * General Engine V1
 * Unifica Economía + Mental + Físico para el Resumen General
 *
 * - getGeneralAlerts()   → max 3, prioridad global
 * - getGeneralState()    → estable | atencion | alerta
 * - getEconomySnapshot() → gasto mensual, delta, categoría top
 * - getGeneralProgress() → % días con al menos 1 registro
 */

import {
  getEconomicAlerts,
  type EconomicAlert,
  type Movimiento,
  type Subscription,
  type PriceRecord,
} from './economic-alerts-engine'

import {
  getMentalAlerts,
  getMentalSnapshot as getMentalSnapshotEngine,
  type MentalRecord,
  type MentalAlert,
  type MentalSnapshot,
} from './mental-engine'

import {
  getPhysicalAlerts,
  getPhysicalSnapshot as getPhysicalSnapshotEngine,
  type PhysicalRecord,
  type PhysicalAlert,
  type PhysicalSnapshot,
} from './physical-engine'

// ── Re-exports ───────────────────────────────────────────────

export type { MentalSnapshot, PhysicalSnapshot }
export { getMentalSnapshotEngine as getMentalSnapshot }
export { getPhysicalSnapshotEngine as getPhysicalSnapshot }

// ── Types ────────────────────────────────────────────────────

export type Pillar = 'economy' | 'mental' | 'physical'

export interface GeneralAlert {
  id: string
  pillar: Pillar
  text: string
  priority: number
  severity: 'high' | 'medium' | 'low'
  cta?: { label: string; action: 'navigate' | 'chat_prefill'; href?: string; text?: string }
}

export interface GeneralState {
  status: 'estable' | 'atencion' | 'alerta'
  subtitle: string
}

export interface EconomySnapshot {
  monthlySpend: number
  deltaVsAvgPercent: number
  mainCategory: string | null
}

export interface GeneralProgress {
  trackingConsistencyPercent: number
}

export interface GeneralEngineInput {
  movimientos: Movimiento[]
  subscriptions?: Subscription[]
  priceHistory?: PriceRecord[]
  mentalRecords: MentalRecord[]
  physicalRecords: PhysicalRecord[]
}

// ── Constants ────────────────────────────────────────────────

const MAX_ALERTS = 3
const MS_PER_DAY = 24 * 60 * 60 * 1000

// ── 1) Motor Unificado de Alertas ───────────────────────────

/**
 * Prioridad global:
 * 1. Económicas críticas (daily_anomaly, monthly_overspend)
 * 2. Mental (sustained-low)
 * 3. Físico (critical-inactivity)
 * 4. Otras económicas
 * 5. Falta de registros (mental / físico)
 */
export function getGeneralAlerts(input: GeneralEngineInput): GeneralAlert[] {
  const {
    movimientos,
    subscriptions = [],
    priceHistory = [],
    mentalRecords,
    physicalRecords,
  } = input

  const econAlerts = getEconomicAlerts({ movimientos, subscriptions, priceHistory })
  const mentalAlertList = getMentalAlerts(mentalRecords)
  const physAlertList = getPhysicalAlerts(physicalRecords)

  const unified: GeneralAlert[] = []

  // Map economic alerts with global priority
  for (const a of econAlerts) {
    const isCritical = a.type === 'daily_anomaly' || a.type === 'monthly_overspend'
    const isNoRecords = a.type === 'no_records'
    unified.push({
      id: a.id,
      pillar: 'economy',
      text: a.text,
      priority: isCritical ? 1 : isNoRecords ? 5 : 4,
      severity: a.severity,
      cta: a.cta,
    })
  }

  // Map mental alerts
  for (const a of mentalAlertList) {
    const isNoRecords = a.type === 'no-records'
    unified.push({
      id: a.id,
      pillar: 'mental',
      text: a.text,
      priority: isNoRecords ? 5 : 2,
      severity: a.severity,
      cta: a.cta,
    })
  }

  // Map physical alerts
  for (const a of physAlertList) {
    const isNoRecords = a.type === 'critical-inactivity' && a.text.includes('Sin registros')
    unified.push({
      id: a.id,
      pillar: 'physical',
      text: a.text,
      priority: isNoRecords ? 5 : 3,
      severity: a.severity,
      cta: a.cta,
    })
  }

  return unified
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_ALERTS)
}

// ── 2) Estado General ───────────────────────────────────────

export function getGeneralState(input: GeneralEngineInput): GeneralState {
  const alerts = getGeneralAlerts(input)
  const mentalSnap = getMentalSnapshotEngine(input.mentalRecords)
  const physSnap = getPhysicalSnapshotEngine(input.physicalRecords)

  const hasCritical = alerts.some(a => a.severity === 'high')
  const hasWarnings = alerts.length > 0
  const hasNegativeTrend = mentalSnap.trend === 'down' || physSnap.trend === 'down'

  // Determine status
  let status: 'estable' | 'atencion' | 'alerta'
  if (hasCritical) {
    status = 'alerta'
  } else if (hasWarnings || hasNegativeTrend) {
    status = 'atencion'
  } else {
    status = 'estable'
  }

  // Build subtitle from active signals
  const subtitle = buildSubtitle(alerts, mentalSnap, physSnap)

  return { status, subtitle }
}

function buildSubtitle(
  alerts: GeneralAlert[],
  mentalSnap: MentalSnapshot,
  physSnap: PhysicalSnapshot
): string {
  if (alerts.length === 0 && mentalSnap.trend !== 'down' && physSnap.trend !== 'down') {
    return 'Todo dentro de tu rango habitual'
  }

  const parts: string[] = []

  // Economy signal
  const econAlert = alerts.find(a => a.pillar === 'economy' && a.priority <= 4)
  if (econAlert) {
    parts.push(econAlert.severity === 'high' ? 'Gasto alto' : 'Economía irregular')
  } else {
    parts.push('Economía estable')
  }

  // Mental signal
  const mentalAlert = alerts.find(a => a.pillar === 'mental')
  if (mentalAlert || mentalSnap.trend === 'down') {
    parts.push('estado mental variable')
  }

  // Physical signal
  const physAlert = alerts.find(a => a.pillar === 'physical')
  if (physAlert || physSnap.trend === 'down') {
    parts.push('actividad física baja')
  }

  if (parts.length <= 1 && !econAlert && !mentalAlert && !physAlert) {
    return 'Todo dentro de tu rango habitual'
  }

  // Join with "y" for last element
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`
  return `${parts[0]}, ${parts[1]} y ${parts[2]}`
}

// ── 3) Economy Snapshot ─────────────────────────────────────

export function getEconomySnapshot(movimientos: Movimiento[]): EconomySnapshot {
  const now = new Date()
  const gastos = movimientos.filter(m => m.tipo === 'gasto')

  // Current month spend
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthGastos = gastos.filter(g => new Date(g.fecha) >= currentMonthStart)
  const monthlySpend = currentMonthGastos.reduce((s, g) => s + g.monto, 0)

  // Average of last 3 months
  const monthTotals: number[] = []
  for (let i = 1; i <= 3; i++) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const total = gastos
      .filter(g => { const d = new Date(g.fecha); return d >= mStart && d <= mEnd })
      .reduce((s, g) => s + g.monto, 0)
    if (total > 0) monthTotals.push(total)
  }

  const avg3m = monthTotals.length > 0
    ? monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length
    : 0

  // Project current month
  const dayOfMonth = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projected = dayOfMonth > 0 ? (monthlySpend / dayOfMonth) * daysInMonth : monthlySpend

  const deltaVsAvgPercent = avg3m > 0
    ? Math.round(((projected - avg3m) / avg3m) * 100)
    : 0

  // Main category this month
  const byCategory: Record<string, number> = {}
  for (const g of currentMonthGastos) {
    const cat = g.categoria || 'Otro'
    byCategory[cat] = (byCategory[cat] || 0) + g.monto
  }
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const mainCategory = sorted.length > 0 && sorted[0][0] !== 'Otro' ? sorted[0][0] : null

  return { monthlySpend, deltaVsAvgPercent, mainCategory }
}

// ── 4) Progresión General ───────────────────────────────────

export function getGeneralProgress(
  mentalRecords: MentalRecord[],
  physicalRecords: PhysicalRecord[],
  movimientos: Movimiento[],
  days: number = 14
): GeneralProgress {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const trackedDays = new Set<string>()

  for (const r of mentalRecords) {
    const d = new Date(r.date)
    if (d.getTime() >= now.getTime() - days * MS_PER_DAY) {
      trackedDays.add(r.date)
    }
  }

  for (const r of physicalRecords) {
    const d = new Date(r.date)
    if (d.getTime() >= now.getTime() - days * MS_PER_DAY) {
      trackedDays.add(r.date)
    }
  }

  for (const m of movimientos) {
    const d = new Date(m.fecha)
    if (d.getTime() >= now.getTime() - days * MS_PER_DAY) {
      const dateStr = d.toISOString().split('T')[0]
      trackedDays.add(dateStr)
    }
  }

  const pct = days > 0 ? Math.round((trackedDays.size / days) * 100) : 0

  return { trackingConsistencyPercent: Math.min(100, pct) }
}
