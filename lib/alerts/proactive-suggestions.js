/**
 * Proactive Suggestions System
 * Gastón doesn't wait, Gastón suggests
 *
 * Rules:
 * - 1 simple CTA per suggestion
 * - No long modals
 * - Max 2 simultaneous suggestions
 */

/**
 * Generate proactive suggestions based on alerts and context
 * @param {Array} activeAlerts - Current active alerts
 * @param {Object} context - User context (last entry times, etc)
 */
export function getProactiveSuggestions(activeAlerts, context = {}) {
  const suggestions = []

  // Process alerts into actionable suggestions
  for (const alert of activeAlerts) {
    const suggestion = alertToSuggestion(alert, context)
    if (suggestion) {
      suggestions.push(suggestion)
    }
  }

  // Add context-based suggestions (not alert-driven)
  const contextSuggestions = getContextualSuggestions(context)
  suggestions.push(...contextSuggestions)

  // Sort by priority and limit to 2
  return suggestions
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))
    .slice(0, 2)
}

/**
 * Convert an alert to a proactive suggestion
 */
function alertToSuggestion(alert, context) {
  const { type, subtype, action, title, message } = alert

  // Economic suggestions
  if (type === 'economic') {
    switch (subtype) {
      case 'category_anomaly':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'question',
          domain: 'money',
          text: '¿Querés ajustar el presupuesto de ' + alert.category?.toLowerCase() + '?',
          subtext: message,
          priority: alert.severity === 'high' ? 3 : 2,
          actions: [
            {
              label: 'Ajustar',
              type: 'navigate',
              href: '/money/presupuestos',
              prefill: { category: alert.category }
            },
            {
              label: 'Ver gastos',
              type: 'navigate',
              href: '/money/movimientos',
              filter: { category: alert.category }
            }
          ]
        }

      case 'budget_risk':
      case 'budget_exceeded':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'warning',
          domain: 'money',
          text: subtype === 'budget_exceeded'
            ? '¿Querés aumentar el límite del presupuesto?'
            : '¿Querés revisar el presupuesto?',
          subtext: message,
          priority: alert.severity === 'high' ? 3 : 2,
          actions: [
            {
              label: 'Ajustar límite',
              type: 'navigate',
              href: '/money/presupuestos'
            }
          ]
        }

      case 'spending_streak':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'insight',
          domain: 'money',
          text: 'Últimos días con gasto alto',
          subtext: '¿Todo bien o querés revisar?',
          priority: 2,
          actions: [
            {
              label: 'Ver movimientos',
              type: 'navigate',
              href: '/money/movimientos'
            }
          ]
        }
    }
  }

  // Wellness suggestions
  if (type === 'wellness') {
    switch (subtype) {
      case 'mental_pattern':
      case 'low_mood_avg':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'caring',
          domain: 'mental',
          text: '¿Querés registrar cómo te sentís hoy?',
          subtext: message,
          priority: alert.severity === 'high' ? 3 : 2,
          actions: [
            {
              label: 'Registrar estado',
              type: 'chat_prefill',
              text: 'Me siento '
            },
            {
              label: 'Fijar objetivo',
              type: 'navigate',
              href: '/objetivos'
            }
          ]
        }

      case 'physical_inactivity':
      case 'no_physical_data':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'encouraging',
          domain: 'physical',
          text: '¿Arrancamos con algo corto hoy?',
          subtext: 'Caminar 10 min también cuenta',
          priority: alert.severity === 'high' ? 2 : 1,
          actions: [
            {
              label: 'Registrar actividad',
              type: 'chat_prefill',
              text: 'Hice '
            }
          ]
        }

      case 'fatigue_pattern':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'caring',
          domain: 'physical',
          text: 'Parece que venís con mucho cansancio',
          subtext: 'Un paseo corto puede ayudar',
          priority: 2,
          actions: [
            {
              label: 'Registrar actividad',
              type: 'chat_prefill',
              text: 'Caminé '
            }
          ]
        }
    }
  }

  // Macro suggestions
  if (type === 'macro') {
    switch (subtype) {
      case 'spending_above_inflation':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'insight',
          domain: 'money',
          text: '¿Querés ver qué categorías subieron más?',
          subtext: message,
          priority: 2,
          actions: [
            {
              label: 'Ver análisis',
              type: 'navigate',
              href: '/money/insights'
            }
          ]
        }

      case 'usd_impact_subs':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'warning',
          domain: 'money',
          text: '¿Revisamos las suscripciones en dólares?',
          subtext: message,
          priority: 2,
          actions: [
            {
              label: 'Ver suscripciones',
              type: 'navigate',
              href: '/money/suscripciones'
            }
          ]
        }
    }
  }

  // Ratoneando suggestions (smart savings)
  if (type === 'ratoneando') {
    switch (subtype) {
      case 'ahorro_potencial':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'insight',
          domain: 'money',
          text: message,
          subtext: alert.detail || 'Sin cambiar tus hábitos de compra',
          priority: alert.severity === 'high' ? 4 : 3, // High priority for savings
          actions: [
            {
              label: 'Ver cómo',
              type: 'navigate',
              href: '/money/insights'
            }
          ]
        }

      case 'supermercado_no_optimo':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'insight',
          domain: 'money',
          text: message,
          subtext: alert.detail,
          priority: alert.severity === 'high' ? 3 : 2,
          actions: [
            {
              label: 'Entendido',
              type: 'dismiss',
              alertId: alert.id
            }
          ]
        }

      case 'precio_alto_vs_historico':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'warning',
          domain: 'money',
          text: `${alert.title}: ${message}`,
          subtext: alert.detail || 'Conviene esperar',
          priority: 2,
          actions: [
            {
              label: 'Ignorar',
              type: 'dismiss',
              alertId: alert.id
            }
          ]
        }

      case 'gasto_por_precios':
        return {
          id: `suggest_${alert.id}`,
          alertId: alert.id,
          type: 'insight',
          domain: 'money',
          text: message,
          subtext: alert.detail,
          priority: 1, // Informational, low priority
          actions: null
        }
    }
  }

  return null
}

/**
 * Get contextual suggestions not driven by alerts
 * Based on time of day, day of week, last entries, etc
 */
function getContextualSuggestions(context) {
  const suggestions = []
  const now = new Date()
  const hour = now.getHours()
  const dayOfWeek = now.getDay() // 0 = Sunday

  // Morning mood check (8-11am)
  if (hour >= 8 && hour <= 11 && !context.hasMoodToday) {
    suggestions.push({
      id: 'context_morning_mood',
      type: 'gentle',
      domain: 'mental',
      text: '¿Cómo arrancás el día?',
      subtext: 'Un registro rápido ayuda a trackear patrones',
      priority: 1,
      actions: [
        {
          label: 'Registrar',
          type: 'chat_prefill',
          text: 'Hoy me siento '
        }
      ]
    })
  }

  // Evening reflection (8-10pm)
  if (hour >= 20 && hour <= 22 && !context.hasMoodToday) {
    suggestions.push({
      id: 'context_evening_mood',
      type: 'gentle',
      domain: 'mental',
      text: '¿Cómo terminás el día?',
      subtext: null,
      priority: 1,
      actions: [
        {
          label: 'Registrar',
          type: 'chat_prefill',
          text: 'Hoy terminé '
        }
      ]
    })
  }

  // End of month budget check (last 3 days of month)
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()

  if (daysInMonth - dayOfMonth <= 3 && !context.checkedBudgetThisWeek) {
    suggestions.push({
      id: 'context_month_end_budget',
      type: 'reminder',
      domain: 'money',
      text: 'Fin de mes cerca',
      subtext: '¿Revisamos cómo viene el presupuesto?',
      priority: 1,
      actions: [
        {
          label: 'Ver resumen',
          type: 'navigate',
          href: '/money/resumen'
        }
      ]
    })
  }

  // Weekly goal check (Sunday)
  if (dayOfWeek === 0 && !context.checkedGoalsThisWeek) {
    suggestions.push({
      id: 'context_weekly_goals',
      type: 'gentle',
      domain: 'general',
      text: '¿Cómo venís con tus objetivos?',
      subtext: 'Un buen momento para revisar',
      priority: 1,
      actions: [
        {
          label: 'Ver objetivos',
          type: 'navigate',
          href: '/objetivos'
        }
      ]
    })
  }

  return suggestions
}

/**
 * Get the primary CTA for an alert/suggestion
 * Used in compact views
 */
export function getPrimaryCta(suggestion) {
  if (!suggestion.actions || suggestion.actions.length === 0) {
    return null
  }
  return suggestion.actions[0]
}

/**
 * Format suggestion for chat context
 */
export function formatSuggestionForChat(suggestion) {
  return {
    text: suggestion.text,
    subtext: suggestion.subtext,
    type: suggestion.type,
    domain: suggestion.domain,
    action: getPrimaryCta(suggestion)
  }
}

/**
 * Get icon name for suggestion type
 */
export function getSuggestionIcon(type) {
  const icons = {
    'question': 'HelpCircle',
    'warning': 'AlertTriangle',
    'insight': 'Lightbulb',
    'caring': 'Heart',
    'encouraging': 'Zap',
    'gentle': 'MessageCircle',
    'reminder': 'Bell'
  }
  return icons[type] || 'Info'
}

/**
 * Get color scheme for suggestion domain
 */
export function getSuggestionColors(domain) {
  const colors = {
    'money': {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-500'
    },
    'mental': {
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-700 dark:text-purple-300',
      icon: 'text-purple-500'
    },
    'physical': {
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      border: 'border-orange-200 dark:border-orange-800',
      text: 'text-orange-700 dark:text-orange-300',
      icon: 'text-orange-500'
    },
    'general': {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-500'
    }
  }
  return colors[domain] || colors.general
}
