/**
 * Priority System V1
 * Centralizes alert priority and ordering rules.
 *
 * Order: Economic critical > Mental > Physical > Economic other > No-records
 * Severity: high > medium > low
 * Alerts always before insights. Insights never displace alerts.
 */

// ── Types ────────────────────────────────────────────────────

export type Pillar = 'economy' | 'mental' | 'physical'
export type Severity = 'high' | 'medium' | 'low'

export interface Prioritized {
  pillar: Pillar
  priority: number
  severity: Severity
}

// ── Priority Bands ──────────────────────────────────────────

/**
 * Global priority bands (lower = higher urgency):
 * 1 — Economic critical (daily anomaly, monthly overspend)
 * 2 — Mental critical (sustained low, sharp drop)
 * 3 — Physical critical (critical inactivity, abandonment)
 * 4 — Economic secondary (category overflow, heavy subs, expensive price)
 * 5 — No-records (any pillar)
 */
export const PRIORITY_BANDS = {
  ECONOMIC_CRITICAL: 1,
  MENTAL_CRITICAL: 2,
  PHYSICAL_CRITICAL: 3,
  ECONOMIC_SECONDARY: 4,
  NO_RECORDS: 5,
} as const

// ── Severity Weight ─────────────────────────────────────────

const SEVERITY_WEIGHT: Record<Severity, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

// ── Sorting ─────────────────────────────────────────────────

/**
 * Sorts items by priority (ascending), then by severity (high first).
 * Use for alerts, insights, or any prioritized list.
 */
export function sortByPriority<T extends Prioritized>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority
    return SEVERITY_WEIGHT[a.severity] - SEVERITY_WEIGHT[b.severity]
  })
}

// ── Constants ───────────────────────────────────────────────

export const MAX_ALERTS = 3
export const MAX_INSIGHTS = 2
