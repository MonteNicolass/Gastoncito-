/**
 * General Score V1
 * Score sintético 0–100 del estado global.
 *
 * Ponderación:
 * - Economía: 40%
 * - Mental: 30%
 * - Físico: 30%
 *
 * Funciones puras. Sin IA. Sin motivación.
 */

import type { GeneralAlert } from '@/lib/general-engine'
import type { EconomySnapshot } from '@/lib/general-engine'
import type { MentalSnapshot } from '@/lib/mental-engine'
import type { PhysicalSnapshot } from '@/lib/physical-engine'

// ── Types ────────────────────────────────────────────────────

export type ScoreLabel = 'bien' | 'atencion' | 'alerta'

export interface GeneralScore {
  score: number
  label: ScoreLabel
  breakdown: {
    economy: number
    mental: number
    physical: number
  }
}

export interface ScoreInput {
  alerts: GeneralAlert[]
  econSnap: EconomySnapshot
  mentalSnap: MentalSnapshot
  physSnap: PhysicalSnapshot
}

// ── Constants ────────────────────────────────────────────────

const WEIGHTS = {
  economy: 0.4,
  mental: 0.3,
  physical: 0.3,
} as const

// ── Score Calculators ────────────────────────────────────────

function getEconomyScore(alerts: GeneralAlert[], econSnap: EconomySnapshot): number {
  let score = 80

  // Penalize active economic alerts
  const econAlerts = alerts.filter(a => a.pillar === 'economy')
  for (const alert of econAlerts) {
    if (alert.severity === 'high') score -= 25
    else if (alert.severity === 'medium') score -= 15
    else score -= 5
  }

  // Penalize spending out of range (projected vs 3m average)
  const delta = Math.abs(econSnap.deltaVsAvgPercent)
  if (delta > 30) score -= 20
  else if (delta > 20) score -= 10
  else if (delta > 10) score -= 5

  // Bonus for stable spending
  if (delta <= 5 && econAlerts.length === 0) score = Math.max(score, 85)

  return clamp(score, 0, 100)
}

function getMentalScore(alerts: GeneralAlert[], mentalSnap: MentalSnapshot): number {
  let score = 75

  // Penalize mental alerts
  const mentalAlerts = alerts.filter(a => a.pillar === 'mental')
  for (const alert of mentalAlerts) {
    if (alert.severity === 'high') score -= 30
    else if (alert.severity === 'medium') score -= 15
    else score -= 5
  }

  // Penalize low mood
  if (mentalSnap.avgMoodLast14 !== null) {
    if (mentalSnap.avgMoodLast14 >= 4) score += 15
    else if (mentalSnap.avgMoodLast14 >= 3) score += 5
    else if (mentalSnap.avgMoodLast14 < 2) score -= 20
  }

  // Penalize lack of records
  if (mentalSnap.daysTrackedLast14 === 0) {
    score -= 20
  } else if (mentalSnap.daysTrackedLast14 < 3) {
    score -= 10
  }

  // Penalize negative trend
  if (mentalSnap.trend === 'down') score -= 10

  return clamp(score, 0, 100)
}

function getPhysicalScore(alerts: GeneralAlert[], physSnap: PhysicalSnapshot): number {
  let score = 70

  // Penalize physical alerts
  const physAlerts = alerts.filter(a => a.pillar === 'physical')
  for (const alert of physAlerts) {
    if (alert.severity === 'high') score -= 30
    else if (alert.severity === 'medium') score -= 15
    else score -= 5
  }

  // Score based on activity frequency
  if (physSnap.activitiesLast14 >= 10) score += 20
  else if (physSnap.activitiesLast14 >= 6) score += 10
  else if (physSnap.activitiesLast14 >= 3) score += 0
  else if (physSnap.activitiesLast14 > 0) score -= 10
  else score -= 25

  // Penalize prolonged inactivity
  if (physSnap.lastActivityDaysAgo !== null) {
    if (physSnap.lastActivityDaysAgo >= 14) score -= 20
    else if (physSnap.lastActivityDaysAgo >= 7) score -= 10
  }

  // Penalize negative trend
  if (physSnap.trend === 'down') score -= 10

  return clamp(score, 0, 100)
}

// ── Main ─────────────────────────────────────────────────────

export function getGeneralScore(input: ScoreInput): GeneralScore {
  const economy = getEconomyScore(input.alerts, input.econSnap)
  const mental = getMentalScore(input.alerts, input.mentalSnap)
  const physical = getPhysicalScore(input.alerts, input.physSnap)

  const score = Math.round(
    economy * WEIGHTS.economy +
    mental * WEIGHTS.mental +
    physical * WEIGHTS.physical
  )

  const clampedScore = clamp(score, 0, 100)

  let label: ScoreLabel
  if (clampedScore >= 65) label = 'bien'
  else if (clampedScore >= 40) label = 'atencion'
  else label = 'alerta'

  return {
    score: clampedScore,
    label,
    breakdown: { economy, mental, physical },
  }
}

// ── Helpers ──────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
