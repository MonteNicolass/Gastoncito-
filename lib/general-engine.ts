/**
 * General Engine V1
 * Unifica Economía + Mental + Físico para el Resumen General
 *
 * - getGeneralAlerts()   → max 3, prioridad global
 * - getGeneralState()    → estable | atencion | alerta
 * - getEconomySnapshot() → gasto mensual, delta, categoría top
 */

import {
  getEconomicAlerts,
  type Movimiento,
  type Subscription,
  type PriceRecord,
} from './economic-alerts-engine'

import {
  getMentalAlerts,
  getMentalSnapshot as getMentalSnapshotEngine,
  type MentalRecord,
  type MentalSnapshot,
} from './mental-engine'

import {
  getPhysicalAlerts,
  getPhysicalSnapshot as getPhysicalSnapshotEngine,
  type PhysicalRecord,
  type PhysicalSnapshot,
} from './physical-engine'

import { PRIORITY_BANDS, sortByPriority, MAX_ALERTS } from './priorities'

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

export interface GeneralEngineInput {
  movimientos: Movimiento[]
  subscriptions?: Subscription[]
  priceHistory?: PriceRecord[]
  mentalRecords: MentalRecord[]
  physicalRecords: PhysicalRecord[]
}

// ── 1) Motor Unificado de Alertas ───────────────────────────

/**
 * Prioridad global (lib/priorities.ts):
 * 1. Económicas críticas (daily_anomaly, monthly_overspend)
 * 2. Mental (sustained-low, sharp-drop)
 * 3. Físico (critical-inactivity, abandonment)
 * 4. Económicas secundarias
 * 5. Falta de registros (cualquier pilar)
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

  for (const a of econAlerts) {
    const isCritical = a.type === 'daily_anomaly' || a.type === 'monthly_overspend'
    const isNoRecords = a.type === 'no_records'
    unified.push({
      id: a.id,
      pillar: 'economy',
      text: a.text,
      priority: isCritical ? PRIORITY_BANDS.ECONOMIC_CRITICAL : isNoRecords ? PRIORITY_BANDS.NO_RECORDS : PRIORITY_BANDS.ECONOMIC_SECONDARY,
      severity: a.severity,
      cta: a.cta,
    })
  }

  for (const a of mentalAlertList) {
    const isNoRecords = a.type === 'no-records'
    unified.push({
      id: a.id,
      pillar: 'mental',
      text: a.text,
      priority: isNoRecords ? PRIORITY_BANDS.NO_RECORDS : PRIORITY_BANDS.MENTAL_CRITICAL,
      severity: a.severity,
      cta: a.cta,
    })
  }

  for (const a of physAlertList) {
    const isNoRecords = a.type === 'critical-inactivity' && a.text.includes('Sin registros')
    unified.push({
      id: a.id,
      pillar: 'physical',
      text: a.text,
      priority: isNoRecords ? PRIORITY_BANDS.NO_RECORDS : PRIORITY_BANDS.PHYSICAL_CRITICAL,
      severity: a.severity,
      cta: a.cta,
    })
  }

  return sortByPriority(unified).slice(0, MAX_ALERTS)
}

// ── 2) Estado General ───────────────────────────────────────

export function getGeneralState(input: GeneralEngineInput): GeneralState {
  const alerts = getGeneralAlerts(input)
  const mentalSnap = getMentalSnapshotEngine(input.mentalRecords)
  const physSnap = getPhysicalSnapshotEngine(input.physicalRecords)

  const hasCritical = alerts.some(a => a.severity === 'high')
  const hasWarnings = alerts.length > 0
  const hasNegativeTrend = mentalSnap.trend === 'down' || physSnap.trend === 'down'

  let status: 'estable' | 'atencion' | 'alerta'
  if (hasCritical) {
    status = 'alerta'
  } else if (hasWarnings || hasNegativeTrend) {
    status = 'atencion'
  } else {
    status = 'estable'
  }

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

  const econAlert = alerts.find(a => a.pillar === 'economy' && a.priority <= PRIORITY_BANDS.ECONOMIC_SECONDARY)
  if (econAlert) {
    parts.push(econAlert.severity === 'high' ? 'Gasto alto' : 'Gasto irregular')
  } else {
    parts.push('Gasto estable')
  }

  const mentalAlert = alerts.find(a => a.pillar === 'mental')
  if (mentalAlert || mentalSnap.trend === 'down') {
    parts.push('estado mental variable')
  }

  const physAlert = alerts.find(a => a.pillar === 'physical')
  if (physAlert || physSnap.trend === 'down') {
    parts.push('actividad f\u00edsica baja')
  }

  if (parts.length <= 1 && !econAlert && !mentalAlert && !physAlert) {
    return 'Todo dentro de tu rango habitual'
  }

  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`
  return `${parts[0]}, ${parts[1]} y ${parts[2]}`
}

// ── 3) Economy Snapshot ─────────────────────────────────────

export function getEconomySnapshot(movimientos: Movimiento[]): EconomySnapshot {
  const now = new Date()
  const gastos = movimientos.filter(m => m.tipo === 'gasto')

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const currentMonthGastos = gastos.filter(g => new Date(g.fecha) >= currentMonthStart)
  const monthlySpend = currentMonthGastos.reduce((s, g) => s + (g.monto || 0), 0)

  const monthTotals: number[] = []
  for (let i = 1; i <= 3; i++) {
    const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
    const total = gastos
      .filter(g => { const d = new Date(g.fecha); return d >= mStart && d <= mEnd })
      .reduce((s, g) => s + (g.monto || 0), 0)
    if (total > 0) monthTotals.push(total)
  }

  const avg3m = monthTotals.length > 0
    ? monthTotals.reduce((a, b) => a + b, 0) / monthTotals.length
    : 0

  const dayOfMonth = Math.max(1, now.getDate())
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const projected = (monthlySpend / dayOfMonth) * daysInMonth

  const deltaVsAvgPercent = avg3m > 0
    ? Math.round(((projected - avg3m) / avg3m) * 100)
    : 0

  const byCategory: Record<string, number> = {}
  for (const g of currentMonthGastos) {
    const cat = g.categoria || 'Otro'
    byCategory[cat] = (byCategory[cat] || 0) + (g.monto || 0)
  }
  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const mainCategory = sorted.length > 0 && sorted[0][0] !== 'Otro' ? sorted[0][0] : null

  return { monthlySpend, deltaVsAvgPercent, mainCategory }
}
