/**
 * Goals Engine V1
 * Objetivos por pilar para Resumen General
 *
 * Funciones puras. No accede a DB directamente.
 * Max 1 objetivo activo por pilar.
 */

// ── Types ────────────────────────────────────────────────────

export type GoalPillar = 'economy' | 'mental' | 'physical'

export interface Goal {
  id: number
  name: string
  target: number
  progress: number
  status: 'active' | 'completed' | 'failed'
  type: 'general' | 'money' | 'physical' | 'mental'
  budget_id?: string | null
  created_at: string
}

export interface GoalSnapshot {
  pillar: GoalPillar
  title: string
  progressPercent: number
  status: 'on-track' | 'off-track'
}

export interface GoalsOverview {
  activeCount: number
  goals: GoalSnapshot[]
}

// ── Constants ────────────────────────────────────────────────

const TYPE_TO_PILLAR: Record<string, GoalPillar | null> = {
  money: 'economy',
  mental: 'mental',
  physical: 'physical',
  general: null,
}

// ── Helpers ──────────────────────────────────────────────────

function toPillar(type: string): GoalPillar | null {
  return TYPE_TO_PILLAR[type] ?? null
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getExpectedProgress(): number {
  const now = new Date()
  const day = now.getDate()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return Math.round((day / daysInMonth) * 100)
}

// ── 1) Get Active Goals ─────────────────────────────────────

/**
 * Returns active goals mapped to pillars.
 * Max 1 per pillar. Ignores 'general' type goals.
 * If multiple active goals per pillar, picks the most recent.
 */
export function getActiveGoals(goals: Goal[]): Goal[] {
  const active = goals.filter(g => g.status === 'active' && toPillar(g.type) !== null)

  const byPillar = new Map<GoalPillar, Goal>()

  const sorted = [...active].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  for (const goal of sorted) {
    const pillar = toPillar(goal.type)!
    if (!byPillar.has(pillar)) {
      byPillar.set(pillar, goal)
    }
  }

  return Array.from(byPillar.values())
}

// ── 2) Update Goal Progress ─────────────────────────────────

/**
 * Returns a new goal object with updated progress.
 * Caller is responsible for persisting via updateGoal().
 */
export function updateGoalProgress(goal: Goal, delta: number): Partial<Goal> & { id: number } {
  const newProgress = clamp(goal.progress + delta, 0, 100)

  const updates: Partial<Goal> & { id: number } = {
    id: goal.id,
    progress: newProgress,
  }

  if (newProgress >= 100 && goal.status === 'active') {
    updates.status = 'completed'
  }

  return updates
}

// ── 3) Goals Snapshot ───────────────────────────────────────

/**
 * Returns snapshot of active goals for Resumen General.
 * on-track: progress >= expected progress for day of month
 * off-track: progress < expected progress
 */
export function getGoalsSnapshot(goals: Goal[]): GoalsOverview {
  const active = getActiveGoals(goals)
  const expected = getExpectedProgress()

  const snapshots: GoalSnapshot[] = active.map(goal => {
    const progressPercent = clamp(Math.round(goal.progress), 0, 100)

    return {
      pillar: toPillar(goal.type)!,
      title: goal.name,
      progressPercent,
      status: progressPercent >= expected * 0.8 ? 'on-track' : 'off-track',
    }
  })

  return {
    activeCount: snapshots.length,
    goals: snapshots,
  }
}
