/**
 * Physical Engine V1
 * Insights · Alertas · Snapshot
 *
 * Determinístico, sin IA. Basado en registros del usuario.
 */

// ── Types ────────────────────────────────────────────────────

export interface PhysicalRecord {
  date: string                                                    // YYYY-MM-DD
  activityType: 'caminar' | 'gym' | 'correr' | 'deporte' | 'otro'
  durationMin: number
}

export type PhysicalInsightType = 'inactivity' | 'drop' | 'irregularity'

export interface PhysicalInsight {
  id: string
  text: string
  type: PhysicalInsightType
}

export type PhysicalAlertType = 'critical-inactivity' | 'abandonment-risk'

export interface PhysicalAlert {
  id: string
  type: PhysicalAlertType
  text: string
  priority: number
  severity: 'high' | 'medium' | 'low'
  cta: { label: string; action: 'chat_prefill' | 'navigate'; href?: string; text?: string }
}

export interface PhysicalSnapshot {
  lastActivityDaysAgo: number | null
  activitiesLast14: number
  trend: 'up' | 'down' | 'stable'
}

// ── Constants ────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MAX_INSIGHTS = 3

// ── Helpers ──────────────────────────────────────────────────

function today(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function daysAgo(n: number): Date {
  return new Date(today().getTime() - n * MS_PER_DAY)
}

function toDate(s: string): Date {
  const d = new Date(s)
  d.setHours(0, 0, 0, 0)
  return d
}

function daysSince(dateStr: string): number {
  return Math.floor((today().getTime() - toDate(dateStr).getTime()) / MS_PER_DAY)
}

function inWindow(r: PhysicalRecord, from: Date, to: Date): boolean {
  const d = toDate(r.date)
  return d >= from && d <= to
}

function uniqueDays(records: PhysicalRecord[]): number {
  return new Set(records.map(r => r.date)).size
}

// ── 1) Insights Físicos ─────────────────────────────────────

export function getPhysicalInsights(records: PhysicalRecord[]): PhysicalInsight[] {
  const now = today()
  const insights: PhysicalInsight[] = []

  const sorted = [...records].sort(
    (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()
  )

  // A) Inactividad prolongada — ≥10 días sin actividad
  if (sorted.length === 0) {
    insights.push({
      id: 'phys_no_data',
      text: 'Sin registros de actividad física.',
      type: 'inactivity',
    })
  } else {
    const gap = daysSince(sorted[0].date)
    if (gap >= 10) {
      insights.push({
        id: 'phys_inactivity',
        text: `${gap} días sin registrar actividad física.`,
        type: 'inactivity',
      })
    }
  }

  // B) Caída de constancia — últimos 14d < previos 14d × 0.6
  const last14 = records.filter(r => inWindow(r, daysAgo(14), now))
  const prev14 = records.filter(r => inWindow(r, daysAgo(28), daysAgo(14)))

  const countLast = uniqueDays(last14)
  const countPrev = uniqueDays(prev14)

  if (countPrev >= 3 && countLast < countPrev * 0.6) {
    insights.push({
      id: 'phys_drop',
      text: 'Menos actividad física en las últimas semanas.',
      type: 'drop',
    })
  }

  // C) Actividad irregular — ≥3 gaps de ≥5 días en últimos 30d
  const last30 = records
    .filter(r => inWindow(r, daysAgo(30), now))
    .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())

  if (last30.length >= 3) {
    const dates = [...new Set(last30.map(r => r.date))].sort()
    let bigGaps = 0

    for (let i = 1; i < dates.length; i++) {
      const gap = (toDate(dates[i]).getTime() - toDate(dates[i - 1]).getTime()) / MS_PER_DAY
      if (gap >= 5) bigGaps++
    }

    // Also check gap from last record to today
    const lastRecordGap = daysSince(dates[dates.length - 1])
    if (lastRecordGap >= 5) bigGaps++

    if (bigGaps >= 3) {
      insights.push({
        id: 'phys_irregular',
        text: 'Patrón irregular de actividad física.',
        type: 'irregularity',
      })
    }
  }

  return insights.slice(0, MAX_INSIGHTS)
}

// ── 2) Alertas Físicas ──────────────────────────────────────

export function getPhysicalAlerts(records: PhysicalRecord[]): PhysicalAlert[] {
  const alerts: PhysicalAlert[] = []

  const sorted = [...records].sort(
    (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()
  )

  if (sorted.length === 0) {
    // No data at all — treat as critical inactivity
    alerts.push({
      id: 'phys_alert_critical',
      type: 'critical-inactivity',
      text: 'Sin registros de actividad física.',
      priority: 1,
      severity: 'medium',
      cta: {
        label: 'Registrar actividad',
        action: 'chat_prefill',
        text: '💪 ',
      },
    })
    return alerts.slice(0, 1)
  }

  const gap = daysSince(sorted[0].date)

  // 1) Inactividad crítica — ≥14 días
  if (gap >= 14) {
    alerts.push({
      id: 'phys_alert_critical',
      type: 'critical-inactivity',
      text: `${gap} días sin registrar actividad física.`,
      priority: 1,
      severity: gap >= 21 ? 'high' : 'medium',
      cta: {
        label: 'Registrar actividad',
        action: 'chat_prefill',
        text: '💪 ',
      },
    })
  }

  // 2) Riesgo de abandono — ≥10 días y antes era regular (≥2/semana)
  if (gap >= 10 && gap < 14) {
    // Check if previous 28 days had regular activity (≥2 per week)
    const prev28 = records.filter(r =>
      inWindow(r, daysAgo(10 + 28), daysAgo(10))
    )
    const prevWeeks = 4
    const prevPerWeek = uniqueDays(prev28) / prevWeeks

    if (prevPerWeek >= 2) {
      alerts.push({
        id: 'phys_alert_abandonment',
        type: 'abandonment-risk',
        text: 'Se cortó una rutina que venía siendo constante.',
        priority: 2,
        severity: 'medium',
        cta: {
          label: 'Registrar actividad',
          action: 'chat_prefill',
          text: '💪 ',
        },
      })
    }
  }

  alerts.sort((a, b) => a.priority - b.priority)
  return alerts.slice(0, 1)
}

// ── 3) Snapshot Físico ──────────────────────────────────────

export function getPhysicalSnapshot(records: PhysicalRecord[]): PhysicalSnapshot {
  const now = today()

  const sorted = [...records].sort(
    (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime()
  )

  const lastActivityDaysAgo = sorted.length > 0 ? daysSince(sorted[0].date) : null

  const last14 = records.filter(r => inWindow(r, daysAgo(14), now))
  const activitiesLast14 = uniqueDays(last14)

  // Trend: compare last 7d vs previous 7d
  const last7 = records.filter(r => inWindow(r, daysAgo(7), now))
  const prev7 = records.filter(r => inWindow(r, daysAgo(14), daysAgo(7)))

  const countLast7 = uniqueDays(last7)
  const countPrev7 = uniqueDays(prev7)

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (countLast7 > countPrev7) trend = 'up'
  else if (countLast7 < countPrev7) trend = 'down'

  return {
    lastActivityDaysAgo,
    activitiesLast14,
    trend,
  }
}
