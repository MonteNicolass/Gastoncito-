/**
 * Actionable CTAs - Concrete actions for insights
 *
 * Every insight should have 1 clear action
 * No decoration, only decision-helping
 */

const CTA_DISMISSED_KEY = 'gaston_cta_dismissed'
const DISMISS_COOLDOWN_DAYS = 14

/**
 * CTA types and their handlers
 */
export const CTA_TYPES = {
  NAVIGATE: 'navigate',
  CREATE_RULE: 'create_rule',
  ADJUST_BUDGET: 'adjust_budget',
  MARK_RECURRING: 'mark_recurring',
  VIEW_ALTERNATIVE: 'view_alternative',
  DISMISS: 'dismiss'
}

/**
 * Generate appropriate CTA for an insight
 * @param {Object} insight - The insight object
 * @returns {Object} - CTA definition
 */
export function generateCTA(insight) {
  switch (insight.type) {
    case 'comparison':
      if (insight.value > 0) {
        return {
          type: CTA_TYPES.NAVIGATE,
          label: 'Ver qué cambió',
          href: '/money/insights',
          icon: 'ArrowRight'
        }
      }
      return null // Positive comparison doesn't need action

    case 'pattern':
      return {
        type: CTA_TYPES.CREATE_RULE,
        label: 'Crear regla',
        data: insight.data,
        icon: 'Plus'
      }

    case 'anomaly':
      return {
        type: CTA_TYPES.ADJUST_BUDGET,
        label: 'Ajustar presupuesto',
        href: '/money/presupuestos',
        icon: 'Settings'
      }

    case 'budget':
      return {
        type: CTA_TYPES.ADJUST_BUDGET,
        label: 'Ajustar límite',
        href: '/money/presupuestos',
        icon: 'Settings'
      }

    case 'category':
      return {
        type: CTA_TYPES.NAVIGATE,
        label: 'Ver movimientos',
        href: '/money/movimientos',
        icon: 'List'
      }

    case 'causal':
      return {
        type: CTA_TYPES.NAVIGATE,
        label: 'Ver detalle',
        href: '/money/insights',
        icon: 'BarChart2'
      }

    case 'repeated':
      return {
        type: CTA_TYPES.MARK_RECURRING,
        label: 'Marcar recurrente',
        icon: 'Repeat'
      }

    case 'savings':
      return {
        type: CTA_TYPES.VIEW_ALTERNATIVE,
        label: 'Ver alternativa',
        href: '/money/insights',
        icon: 'PiggyBank'
      }

    default:
      return {
        type: CTA_TYPES.DISMISS,
        label: 'Ignorar 14 días',
        icon: 'X'
      }
  }
}

/**
 * Execute CTA action
 * @param {Object} cta - The CTA to execute
 * @param {Object} context - Execution context (router, callbacks)
 */
export async function executeCTA(cta, context = {}) {
  const { router, onCreateRule, onMarkRecurring, onDismiss, insightId } = context

  switch (cta.type) {
    case CTA_TYPES.NAVIGATE:
      if (router && cta.href) {
        router.push(cta.href)
      }
      break

    case CTA_TYPES.CREATE_RULE:
      if (onCreateRule && cta.data) {
        await onCreateRule(cta.data)
      }
      break

    case CTA_TYPES.ADJUST_BUDGET:
      if (router && cta.href) {
        router.push(cta.href)
      }
      break

    case CTA_TYPES.MARK_RECURRING:
      if (onMarkRecurring && cta.data) {
        await onMarkRecurring(cta.data)
      }
      break

    case CTA_TYPES.VIEW_ALTERNATIVE:
      if (router && cta.href) {
        router.push(cta.href)
      }
      break

    case CTA_TYPES.DISMISS:
      if (insightId) {
        dismissCTA(insightId)
        if (onDismiss) {
          onDismiss(insightId)
        }
      }
      break
  }
}

/**
 * Dismiss a CTA for cooldown period
 */
export function dismissCTA(insightId) {
  if (typeof window === 'undefined') return

  try {
    const data = localStorage.getItem(CTA_DISMISSED_KEY)
    const dismissed = data ? JSON.parse(data) : {}

    dismissed[insightId] = {
      dismissedAt: Date.now()
    }

    // Clean old entries
    const cleaned = {}
    Object.entries(dismissed).forEach(([id, entry]) => {
      const daysSince = (Date.now() - entry.dismissedAt) / (24 * 60 * 60 * 1000)
      if (daysSince < DISMISS_COOLDOWN_DAYS * 2) {
        cleaned[id] = entry
      }
    })

    localStorage.setItem(CTA_DISMISSED_KEY, JSON.stringify(cleaned))
  } catch {
    // Ignore
  }
}

/**
 * Check if insight was dismissed
 */
export function isInsightDismissed(insightId) {
  if (typeof window === 'undefined') return false

  try {
    const data = localStorage.getItem(CTA_DISMISSED_KEY)
    const dismissed = data ? JSON.parse(data) : {}

    const entry = dismissed[insightId]
    if (!entry) return false

    const daysSince = (Date.now() - entry.dismissedAt) / (24 * 60 * 60 * 1000)
    return daysSince < DISMISS_COOLDOWN_DAYS
  } catch {
    return false
  }
}

/**
 * Filter insights by dismissed status
 */
export function filterDismissed(insights) {
  return insights.filter(i => !isInsightDismissed(i.id))
}

/**
 * Get CTA button style classes
 */
export function getCTAStyles(cta) {
  const baseStyles = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95'

  switch (cta.type) {
    case CTA_TYPES.CREATE_RULE:
    case CTA_TYPES.MARK_RECURRING:
      return `${baseStyles} bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600`

    case CTA_TYPES.ADJUST_BUDGET:
      return `${baseStyles} bg-amber-600 dark:bg-amber-500 text-white hover:bg-amber-700 dark:hover:bg-amber-600`

    case CTA_TYPES.VIEW_ALTERNATIVE:
      return `${baseStyles} bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700 dark:hover:bg-emerald-600`

    case CTA_TYPES.DISMISS:
      return `${baseStyles} bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-zinc-600`

    default:
      return `${baseStyles} bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200`
  }
}

/**
 * Get CTA priority for sorting
 */
export function getCTAPriority(cta) {
  const priorities = {
    [CTA_TYPES.CREATE_RULE]: 5,
    [CTA_TYPES.MARK_RECURRING]: 4,
    [CTA_TYPES.ADJUST_BUDGET]: 3,
    [CTA_TYPES.VIEW_ALTERNATIVE]: 2,
    [CTA_TYPES.NAVIGATE]: 1,
    [CTA_TYPES.DISMISS]: 0
  }
  return priorities[cta.type] || 0
}

/**
 * Create quick rule from insight
 */
export function createRuleFromInsight(insight) {
  if (!insight.data?.motivo) return null

  return {
    pattern: insight.data.motivo.toLowerCase(),
    match_type: 'includes',
    category_id: insight.data.category_id || 'otros',
    priority: 100,
    enabled: true,
    created_at: new Date().toISOString(),
    source: 'insight_suggestion'
  }
}

/**
 * Mark gasto as recurring
 */
export function markAsRecurring(gasto) {
  return {
    ...gasto,
    is_recurring: true,
    recurring_pattern: detectRecurringPattern(gasto)
  }
}

/**
 * Detect recurring pattern from gasto data
 */
function detectRecurringPattern(gasto) {
  // Simple heuristic based on amount consistency
  // Could be enhanced with actual frequency analysis
  const amount = gasto.monto

  if (amount >= 1000 && amount <= 2000) return 'weekly'
  if (amount >= 5000 && amount <= 20000) return 'monthly'
  if (amount >= 50000) return 'quarterly'

  return 'monthly' // Default
}
