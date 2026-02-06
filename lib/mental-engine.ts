/**
 * Mental Engine V1
 * Insights · Alertas · Snapshot
 *
 * Determinístico, sin IA. Basado en registros del usuario.
 * moodLevel 1–5 (muy bajo → muy alto)
 */

// ── Types ────────────────────────────────────────────────────

export interface MentalRecord {
  date: string       // YYYY-MM-DD
  moodLevel: number  // 1–5
  tags?: string[]
}

export type InsightType = 'trend' | 'variability' | 'missing-data'

export interface MentalInsight {
  id: string
  text: string
  type: InsightType
}

export type AlertType = 'sustained-low' | 'sharp-drop' | 'no-records'

export interface MentalAlert {
  id: string
  type: AlertType
  text: string
  priority: number
  severity: 'high' | 'medium' | 'low'
  cta: { label: string; action: 'chat_prefill' | 'navigate'; href?: string; text?: string }
}

export interface MentalSnapshot {
  daysTrackedLast14: number
  avgMoodLast14: number | null
  trend: 'up' | 'down' | 'stable'
}

// ── Constants ────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MAX_INSIGHTS = 3
const TREND_THRESHOLD_RATIO = 0.85
const VARIABILITY_THRESHOLD = 1.2
const SUSTAINED_LOW_LEVEL = 2
const SUSTAINED_LOW_COUNT = 3
const NO_RECORDS_DAYS = 7
const SHARP_DROP_RATIO = 0.7
const MIN_RECORDS_FOR_INSIGHTS = 4

// ── Helpers ──────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * MS_PER_DAY)
}

function inWindow(record: MentalRecord, from: Date, to: Date): boolean {
  const d = new Date(record.date)
  return d >= from && d <= to
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sq = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(sq)
}

function daysBetween(a: string, b: Date): number {
  return Math.floor(Math.abs(b.getTime() - new Date(a).getTime()) / MS_PER_DAY)
}

// ── 1) Insights Mentales ────────────────────────────────────

/**
 * Devuelve hasta 3 insights mentales basados en reglas determinísticas.
 * Retorna [] si no hay datos suficientes.
 */
export function getMentalInsights(records: MentalRecord[]): MentalInsight[] {
  const now = new Date()
  const insights: MentalInsight[] = []

  const last7 = records.filter(r => inWindow(r, daysAgo(7), now))
  const last14 = records.filter(r => inWindow(r, daysAgo(14), now))
  const last30 = records.filter(r => inWindow(r, daysAgo(30), now))

  // A) Tendencia negativa reciente
  const avg7 = avg(last7.map(r => r.moodLevel))
  const avg30 = avg(last30.map(r => r.moodLevel))

  if (
    avg7 !== null &&
    avg30 !== null &&
    last7.length >= 3 &&
    last30.length >= 5 &&
    avg7 < avg30 * TREND_THRESHOLD_RATIO
  ) {
    insights.push({
      id: 'mental_trend_negative',
      text: 'En la última semana el estado promedio fue más bajo que tu normal.',
      type: 'trend',
    })
  }

  // B) Alta variabilidad emocional
  const moods14 = last14.map(r => r.moodLevel)
  if (moods14.length >= MIN_RECORDS_FOR_INSIGHTS) {
    const sd = stdDev(moods14)
    if (sd > VARIABILITY_THRESHOLD) {
      insights.push({
        id: 'mental_high_variability',
        text: 'Variaciones marcadas en el estado mental en los últimos días.',
        type: 'variability',
      })
    }
  }

  // C) Pocos registros
  if (last14.length < MIN_RECORDS_FOR_INSIGHTS) {
    insights.push({
      id: 'mental_few_records',
      text: 'Pocos registros recientes de estado mental.',
      type: 'missing-data',
    })
  }

  return insights.slice(0, MAX_INSIGHTS)
}

// ── 2) Alertas Mentales ─────────────────────────────────────

/**
 * Devuelve como máximo 1 alerta mental, la de mayor prioridad.
 */
export function getMentalAlerts(records: MentalRecord[]): MentalAlert[] {
  const now = new Date()
  const alerts: MentalAlert[] = []

  const sorted = [...records].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // 1) Estado bajo sostenido — moodLevel <= 2 en ≥3 consecutivos
  if (sorted.length >= SUSTAINED_LOW_COUNT) {
    let consecutive = 0
    for (const r of sorted) {
      if (r.moodLevel <= SUSTAINED_LOW_LEVEL) {
        consecutive++
      } else {
        break
      }
    }

    if (consecutive >= SUSTAINED_LOW_COUNT) {
      alerts.push({
        id: 'mental_sustained_low',
        type: 'sustained-low',
        text: 'Estado bajo sostenido en los últimos días.',
        priority: 1,
        severity: consecutive >= 5 ? 'high' : 'medium',
        cta: {
          label: 'Registrar estado',
          action: 'chat_prefill',
          text: '',
        },
      })
    }
  }

  // 2) Caída brusca — último registro <= promedio_30d * 0.7
  const last30 = records.filter(r => inWindow(r, daysAgo(30), now))
  const avg30 = avg(last30.map(r => r.moodLevel))

  if (sorted.length > 0 && avg30 !== null && last30.length >= 5) {
    const lastMood = sorted[0].moodLevel
    if (lastMood <= avg30 * SHARP_DROP_RATIO) {
      alerts.push({
        id: 'mental_sharp_drop',
        type: 'sharp-drop',
        text: 'Último registro muy por debajo de tu promedio.',
        priority: 2,
        severity: 'high',
        cta: {
          label: 'Ver historial',
          action: 'navigate',
          href: '/mental',
        },
      })
    }
  }

  // 3) Días sin registrar estado — >= 7 días
  if (sorted.length === 0) {
    alerts.push({
      id: 'mental_no_records',
      type: 'no-records',
      text: 'Sin registros de estado mental.',
      priority: 3,
      severity: 'low',
      cta: {
        label: 'Registrar estado',
        action: 'chat_prefill',
        text: '',
      },
    })
  } else {
    const daysSinceLast = daysBetween(sorted[0].date, now)
    if (daysSinceLast >= NO_RECORDS_DAYS) {
      alerts.push({
        id: 'mental_no_recent_records',
        type: 'no-records',
        text: `${daysSinceLast} días sin registrar estado mental.`,
        priority: 3,
        severity: daysSinceLast >= 14 ? 'medium' : 'low',
        cta: {
          label: 'Registrar estado',
          action: 'chat_prefill',
          text: '',
        },
      })
    }
  }

  // Return only the highest priority alert
  alerts.sort((a, b) => a.priority - b.priority)
  return alerts.slice(0, 1)
}

// ── 3) Snapshot Mental ──────────────────────────────────────

/**
 * Snapshot para Resumen General.
 */
export function getMentalSnapshot(records: MentalRecord[]): MentalSnapshot {
  const now = new Date()

  const last14 = records.filter(r => inWindow(r, daysAgo(14), now))
  const last7 = records.filter(r => inWindow(r, daysAgo(7), now))
  const last30 = records.filter(r => inWindow(r, daysAgo(30), now))

  const daysTracked = new Set(last14.map(r => r.date)).size
  const avgMood14 = avg(last14.map(r => r.moodLevel))

  const avg7 = avg(last7.map(r => r.moodLevel))
  const avg30 = avg(last30.map(r => r.moodLevel))

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (avg7 !== null && avg30 !== null && last7.length >= 2 && last30.length >= 5) {
    if (avg7 > avg30) trend = 'up'
    else if (avg7 < avg30) trend = 'down'
  }

  return {
    daysTrackedLast14: daysTracked,
    avgMoodLast14: avgMood14 !== null ? Math.round(avgMood14 * 10) / 10 : null,
    trend,
  }
}
