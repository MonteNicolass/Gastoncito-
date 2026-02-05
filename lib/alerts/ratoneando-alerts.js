/**
 * Ratoneando Alerts Generator
 * Converts smart savings insights into predictive alerts
 *
 * Alert types:
 * - ahorro_potencial: Significant monthly savings opportunity
 * - precio_alto_vs_historico: Product price spike detected
 * - supermercado_no_optimo: Shopping at more expensive store
 *
 * Uses existing alert storage - no parallel system
 */

import { generateAlertId, hasTriggeredRecently, isAlertDismissed } from './alert-storage'

// Cooldown for ratoneando alerts (14 days if ignored)
const RATONEANDO_COOLDOWN_DAYS = 14

/**
 * Generate ratoneando alerts from analysis result
 * @param {Object} ratoneandoResult - Result from runRatoneandoEngine
 * @param {Object} patterns - Purchase patterns
 */
export function generateRatoneandoAlerts(ratoneandoResult, patterns) {
  if (!ratoneandoResult?.hasData) {
    return []
  }

  const alerts = []

  // 1. Monthly savings opportunity (highest priority)
  const savingsAlert = generateSavingsAlert(ratoneandoResult)
  if (savingsAlert) alerts.push(savingsAlert)

  // 2. Supermarket optimization
  const superAlert = generateSupermarketAlert(ratoneandoResult, patterns)
  if (superAlert) alerts.push(superAlert)

  // 3. Price spike alerts (product-level)
  const priceAlerts = generatePriceAlerts(ratoneandoResult)
  alerts.push(...priceAlerts)

  // 4. Spending context (prices vs consumption)
  const contextAlert = generateSpendingContextAlert(ratoneandoResult, patterns)
  if (contextAlert) alerts.push(contextAlert)

  // Filter dismissed and recently triggered (14 day cooldown)
  return alerts.filter(a => {
    const dismissed = isAlertDismissed(a.id)
    const recentlyTriggered = hasTriggeredRecently(a.id, RATONEANDO_COOLDOWN_DAYS)
    return !dismissed && !recentlyTriggered
  })
}

/**
 * Generate monthly savings potential alert
 */
function generateSavingsAlert(result) {
  const { totalPotentialSavings, recommendations } = result

  // Minimum threshold: $2,000/month to generate alert
  if (!totalPotentialSavings || totalPotentialSavings < 2000) {
    return null
  }

  // Determine severity based on savings amount
  let severity = 'low'
  if (totalPotentialSavings >= 5000) severity = 'high'
  else if (totalPotentialSavings >= 3000) severity = 'medium'

  const alertId = generateAlertId('ratoneando', 'ahorro_potencial')

  // Get main recommendation source
  const mainReco = recommendations?.[0]
  let detail = 'Sin cambiar tus hábitos de compra'

  if (mainReco?.type === 'supermarket_switch') {
    detail = 'Cambiando dónde comprás, no qué comprás'
  } else if (mainReco?.type === 'substitution') {
    detail = 'Con pequeños ajustes en marcas o productos'
  }

  return {
    id: alertId,
    type: 'ratoneando',
    subtype: 'ahorro_potencial',
    severity,
    title: 'Ahorro posible',
    message: `Podrías ahorrar ~$${totalPotentialSavings.toLocaleString('es-AR')}/mes`,
    detail,
    monthlySavings: totalPotentialSavings,
    source: mainReco?.type || 'analysis',
    action: {
      type: 'view_recommendation',
      label: 'Ver cómo'
    },
    first_detected_at: Date.now()
  }
}

/**
 * Generate supermarket optimization alert
 */
function generateSupermarketAlert(result, patterns) {
  const { cartOptimization } = result

  if (!cartOptimization?.alternative) return null

  const { recommendation, alternative } = cartOptimization
  const difference = alternative.difference
  const percentMore = alternative.percentMore

  // Only alert if significant difference (>$1,500 and >8%)
  if (difference < 1500 || percentMore < 8) return null

  // Check if user is shopping at the expensive option
  const primarySuper = patterns?.preferredSupermarkets?.[0]
  if (!primarySuper) return null

  const userShopsAtBest = primarySuper.normalized === recommendation.store.toLowerCase()
  if (userShopsAtBest) return null // Already optimized

  // Estimate monthly impact
  const monthlyPurchases = patterns?.purchaseFrequency?.purchasesPerMonth || 4
  const monthlySavings = Math.round(difference * monthlyPurchases)

  if (monthlySavings < 2000) return null

  let severity = 'medium'
  if (monthlySavings >= 4000) severity = 'high'

  const alertId = generateAlertId('ratoneando', 'supermercado_no_optimo')

  return {
    id: alertId,
    type: 'ratoneando',
    subtype: 'supermercado_no_optimo',
    severity,
    title: 'Supermercado',
    message: `Tu compra sale más barata en ${capitalize(recommendation.store)}`,
    detail: `Ahorro estimado: ~$${monthlySavings.toLocaleString('es-AR')}/mes`,
    currentStore: primarySuper.name,
    suggestedStore: recommendation.store,
    monthlySavings,
    action: {
      type: 'acknowledge',
      label: 'Entendido'
    },
    first_detected_at: Date.now()
  }
}

/**
 * Generate price spike alerts for frequent products
 */
function generatePriceAlerts(result) {
  const alerts = []
  const { priceAlerts: rawAlerts } = result

  if (!rawAlerts || rawAlerts.length === 0) return alerts

  // Only include spike alerts (product is expensive vs history)
  const spikes = rawAlerts.filter(a => a.type === 'spike')

  // Limit to top 2 spikes
  spikes.slice(0, 2).forEach(spike => {
    const alertId = generateAlertId('ratoneando', 'precio_alto', spike.product)

    alerts.push({
      id: alertId,
      type: 'ratoneando',
      subtype: 'precio_alto_vs_historico',
      severity: spike.spike >= 30 ? 'medium' : 'low',
      title: capitalize(spike.product),
      message: `Subió ${spike.spike}% respecto a tu promedio`,
      detail: 'Conviene esperar o buscar alternativa',
      product: spike.product,
      currentPrice: spike.currentPrice,
      avgPrice: spike.avgPrice,
      percentIncrease: spike.spike,
      action: {
        type: 'dismiss',
        label: 'Ignorar'
      },
      first_detected_at: Date.now()
    })
  })

  return alerts
}

/**
 * Generate spending context alert (prices vs consumption)
 */
function generateSpendingContextAlert(result, patterns) {
  if (!patterns?.monthlySpend) return null

  const { last30, avg, trend } = patterns.monthlySpend
  const { priceAlerts } = result

  // Only generate if spending went up
  if (trend !== 'up' || !avg || last30 <= avg) return null

  const increase = ((last30 - avg) / avg) * 100
  if (increase < 15) return null // Less than 15% increase, not significant

  // Check if it's price-driven (multiple spike alerts)
  const spikes = priceAlerts?.filter(a => a.type === 'spike') || []

  if (spikes.length >= 2) {
    const alertId = generateAlertId('ratoneando', 'gasto_por_precios')

    return {
      id: alertId,
      type: 'ratoneando',
      subtype: 'gasto_por_precios',
      severity: 'low',
      title: 'Contexto de gasto',
      message: 'Tus gastos subieron por precios, no por consumo',
      detail: `${spikes.length} productos con aumentos detectados`,
      priceIncrease: Math.round(increase),
      affectedProducts: spikes.length,
      action: null, // Informational only
      first_detected_at: Date.now()
    }
  }

  return null
}

/**
 * Get ratoneando alert for chat context
 * Prioritizes high-savings opportunities
 */
export function getRatoneandoAlertForChat(ratoneandoResult) {
  if (!ratoneandoResult?.hasData) return null

  const { totalPotentialSavings, recommendations } = ratoneandoResult

  if (totalPotentialSavings >= 3000) {
    return {
      type: 'ratoneando_savings',
      title: 'Hay una forma de ahorrar este mes',
      message: `~$${totalPotentialSavings.toLocaleString('es-AR')} sin cambiar hábitos`,
      action: {
        type: 'show_recommendation',
        label: 'Ver cómo'
      }
    }
  }

  // Check for store switch opportunity
  if (recommendations?.some(r => r.type === 'supermarket_switch')) {
    const storeReco = recommendations.find(r => r.type === 'supermarket_switch')
    return {
      type: 'ratoneando_store',
      title: 'Optimización de compras',
      message: storeReco.message,
      action: {
        type: 'acknowledge',
        label: 'Entendido'
      }
    }
  }

  return null
}

/**
 * Format ratoneando alert for display
 */
export function formatRatoneandoAlert(alert) {
  // Use green/emerald for savings, amber for warnings
  const colorsBySubtype = {
    'ahorro_potencial': {
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-500'
    },
    'supermercado_no_optimo': {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-500'
    },
    'precio_alto_vs_historico': {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      icon: 'text-amber-500'
    },
    'gasto_por_precios': {
      bg: 'bg-zinc-50 dark:bg-zinc-800/50',
      border: 'border-zinc-200 dark:border-zinc-700',
      text: 'text-zinc-700 dark:text-zinc-300',
      icon: 'text-zinc-500'
    }
  }

  return {
    ...alert,
    colors: colorsBySubtype[alert.subtype] || colorsBySubtype['gasto_por_precios'],
    iconName: alert.subtype === 'ahorro_potencial' ? 'PiggyBank' :
              alert.subtype === 'supermercado_no_optimo' ? 'ShoppingCart' :
              alert.subtype === 'precio_alto_vs_historico' ? 'TrendingUp' :
              'Info'
  }
}

/**
 * Capitalize first letter
 */
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
