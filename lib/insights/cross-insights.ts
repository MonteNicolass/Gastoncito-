/**
 * Cross Insights V1 (TypeScript)
 * Patrones cruzados entre pilares.
 * Max 2 insights activos.
 *
 * Funciones puras. Sin IA. Sin moralización.
 */

import type { Movimiento } from '@/lib/economic-alerts-engine'
import type { MentalRecord } from '@/lib/mental-engine'
import type { PhysicalRecord } from '@/lib/physical-engine'

// ── Types ────────────────────────────────────────────────────

export type CrossInsightType = 'economy_mental' | 'mental_physical' | 'economy_physical'

export interface CrossInsight {
  id: string
  type: CrossInsightType
  text: string
  severity: 'notable' | 'neutral'
}

export interface CrossInsightsInput {
  movimientos: Movimiento[]
  mentalRecords: MentalRecord[]
  physicalRecords: PhysicalRecord[]
}

// ── Constants ────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000
const LOOKBACK_DAYS = 30
const MAX_INSIGHTS = 2
const MIN_DAYS_FOR_COMPARISON = 3

const FOOD_CATEGORIES = ['delivery', 'comida', 'restaurante', 'comida rápida', 'pedidos ya', 'rappi']

// ── Helpers ──────────────────────────────────────────────────

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return new Date(d.getTime() - n * MS_PER_DAY)
}

function inRange(dateString: string, from: Date): boolean {
  return new Date(dateString) >= from
}

// ── A) Economy x Mental ──────────────────────────────────────

function checkEconomyMental(
  movimientos: Movimiento[],
  mentalRecords: MentalRecord[]
): CrossInsight | null {
  const cutoff = daysAgo(LOOKBACK_DAYS)

  const moodByDate = new Map<string, number>()
  for (const r of mentalRecords) {
    if (inRange(r.date, cutoff)) {
      moodByDate.set(r.date, r.moodLevel)
    }
  }

  const spendByDate = new Map<string, number>()
  for (const m of movimientos) {
    if (m.tipo === 'gasto' && inRange(m.fecha, cutoff)) {
      spendByDate.set(m.fecha, (spendByDate.get(m.fecha) || 0) + m.monto)
    }
  }

  let lowMoodSpend = 0
  let lowMoodDays = 0
  let normalSpend = 0
  let normalDays = 0

  for (const [date, mood] of moodByDate) {
    const spend = spendByDate.get(date) || 0
    if (mood <= 2) {
      lowMoodSpend += spend
      lowMoodDays++
    } else {
      normalSpend += spend
      normalDays++
    }
  }

  if (lowMoodDays < MIN_DAYS_FOR_COMPARISON || normalDays < MIN_DAYS_FOR_COMPARISON) {
    return null
  }

  const avgLow = lowMoodSpend / lowMoodDays
  const avgNormal = normalSpend / normalDays

  if (avgNormal > 0 && avgLow > avgNormal * 1.2) {
    return {
      id: 'cross_econ_mental',
      type: 'economy_mental',
      text: 'En d\u00edas de estado bajo, el gasto promedio fue mayor.',
      severity: 'notable',
    }
  }

  return null
}

// ── B) Mental x Physical ─────────────────────────────────────

function checkMentalPhysical(
  mentalRecords: MentalRecord[],
  physicalRecords: PhysicalRecord[]
): CrossInsight | null {
  const cutoff = daysAgo(LOOKBACK_DAYS)

  const activeDates = new Set<string>()
  for (const r of physicalRecords) {
    if (inRange(r.date, cutoff)) {
      activeDates.add(r.date)
    }
  }

  const moodWithActivity: number[] = []
  const moodWithout: number[] = []

  for (const r of mentalRecords) {
    if (inRange(r.date, cutoff)) {
      if (activeDates.has(r.date)) {
        moodWithActivity.push(r.moodLevel)
      } else {
        moodWithout.push(r.moodLevel)
      }
    }
  }

  if (moodWithActivity.length < MIN_DAYS_FOR_COMPARISON || moodWithout.length < MIN_DAYS_FOR_COMPARISON) {
    return null
  }

  const avgWith = moodWithActivity.reduce((a, b) => a + b, 0) / moodWithActivity.length
  const avgWithout = moodWithout.reduce((a, b) => a + b, 0) / moodWithout.length

  if (avgWithout < avgWith * 0.85) {
    return {
      id: 'cross_mental_phys',
      type: 'mental_physical',
      text: 'Los d\u00edas sin actividad coinciden con estados m\u00e1s bajos.',
      severity: 'notable',
    }
  }

  return null
}

// ── C) Economy x Physical ────────────────────────────────────

function checkEconomyPhysical(
  movimientos: Movimiento[],
  physicalRecords: PhysicalRecord[]
): CrossInsight | null {
  const cutoff = daysAgo(LOOKBACK_DAYS)

  const activeDates = new Set<string>()
  for (const r of physicalRecords) {
    if (inRange(r.date, cutoff)) {
      activeDates.add(r.date)
    }
  }

  let foodSpendActive = 0
  let foodDaysActive = 0
  let foodSpendInactive = 0
  let foodDaysInactive = 0

  const foodByDate = new Map<string, number>()

  for (const m of movimientos) {
    if (m.tipo !== 'gasto' || !inRange(m.fecha, cutoff)) continue

    const cat = (m.categoria || '').toLowerCase()
    const motivo = (m.motivo || '').toLowerCase()
    const isFood = FOOD_CATEGORIES.some(fc => cat.includes(fc) || motivo.includes(fc))

    if (isFood) {
      foodByDate.set(m.fecha, (foodByDate.get(m.fecha) || 0) + m.monto)
    }
  }

  for (const [date, amount] of foodByDate) {
    if (activeDates.has(date)) {
      foodSpendActive += amount
      foodDaysActive++
    } else {
      foodSpendInactive += amount
      foodDaysInactive++
    }
  }

  if (foodDaysActive < 2 || foodDaysInactive < MIN_DAYS_FOR_COMPARISON) {
    return null
  }

  const avgActive = foodSpendActive / foodDaysActive
  const avgInactive = foodSpendInactive / foodDaysInactive

  if (avgInactive > avgActive * 1.25) {
    return {
      id: 'cross_econ_phys',
      type: 'economy_physical',
      text: 'Menos actividad f\u00edsica coincidi\u00f3 con mayor gasto en comida.',
      severity: 'notable',
    }
  }

  return null
}

// ── Main ─────────────────────────────────────────────────────

export function getCrossInsights(input: CrossInsightsInput): CrossInsight[] {
  const results: CrossInsight[] = []

  const econMental = checkEconomyMental(input.movimientos, input.mentalRecords)
  if (econMental) results.push(econMental)

  const mentalPhys = checkMentalPhysical(input.mentalRecords, input.physicalRecords)
  if (mentalPhys) results.push(mentalPhys)

  const econPhys = checkEconomyPhysical(input.movimientos, input.physicalRecords)
  if (econPhys) results.push(econPhys)

  return results.slice(0, MAX_INSIGHTS)
}
