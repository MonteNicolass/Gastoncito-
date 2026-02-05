/**
 * Diet-Aware Alerts
 * Contextual alerts for diet items
 *
 * Integrates with predictive_alerts system
 */

import { getUserDiet, getEssentialItems, getFrequentItems, getDietConfidence, isInDiet } from './diet-model'
import { getCheapestOption, getAveragePrice, getPriceTrend } from '../ratoneando/price-storage'
import { getPriceJudgment, JUDGMENT } from '../mira-precios/price-judgments'
import { isGoodTimeToBuy } from '../mira-precios/timing-patterns'

const DIET_ALERT_DISMISSED_KEY = 'gaston_diet_alerts_dismissed'
const DISMISS_COOLDOWN_DAYS = 14

/**
 * Generate diet-aware alerts for the alert engine
 * @param {Object} diet - User's diet
 * @param {Object} patterns - Purchase patterns
 */
export function generateDietAlerts(diet, patterns) {
  if (!diet || !diet.items || diet.items.length === 0) {
    return []
  }

  const confidence = getDietConfidence(diet)
  if (confidence === 'none' || confidence === 'low') {
    return []
  }

  const alerts = []

  // Essential item price alerts
  const essentialAlerts = generateEssentialItemAlerts(diet)
  alerts.push(...essentialAlerts)

  // Weekly timing alerts
  const timingAlerts = generateTimingAlerts(diet)
  alerts.push(...timingAlerts)

  // Best day to shop alert
  const bestDayAlert = generateBestDayAlert(diet, patterns)
  if (bestDayAlert) alerts.push(bestDayAlert)

  // Filter dismissed and limit
  const dismissed = getDismissedAlerts()
  const filtered = alerts.filter(a => !dismissed.includes(a.id))

  return filtered.slice(0, 2)
}

/**
 * Generate alerts for essential diet items
 */
function generateEssentialItemAlerts(diet) {
  const alerts = []
  const essentials = getEssentialItems(diet)

  essentials.forEach(item => {
    const cheapest = getCheapestOption(item.name)
    if (!cheapest) return

    const judgment = getPriceJudgment(item.name, cheapest.price, null, cheapest.supermarket)
    if (!judgment.hasData) return

    // Alert if essential item is expensive
    if (judgment.judgment === JUDGMENT.EXPENSIVE || judgment.judgment === JUDGMENT.VERY_EXPENSIVE) {
      alerts.push({
        id: `diet_essential_expensive_${item.name}`,
        type: 'dieta',
        subtype: 'alimento_clave_caro',
        severity: 'medium',
        title: `${capitalize(item.name)} está caro`,
        message: `Un alimento clave de tu dieta está ${Math.abs(judgment.deviation)}% arriba`,
        detail: judgment.detail,
        product: item.name,
        category: item.category,
        action: {
          type: 'wait',
          label: 'Conviene esperar'
        }
      })
    }

    // Alert if essential item is cheap (opportunity)
    if (judgment.judgment === JUDGMENT.VERY_CHEAP) {
      alerts.push({
        id: `diet_essential_cheap_${item.name}`,
        type: 'dieta',
        subtype: 'alimento_clave_barato',
        severity: 'low',
        title: `Oportunidad: ${capitalize(item.name)}`,
        message: `${Math.abs(judgment.deviation)}% menos que lo habitual`,
        detail: `En ${capitalize(cheapest.supermarket)}`,
        product: item.name,
        category: item.category,
        action: {
          type: 'buy',
          label: 'Buen momento para stockear'
        }
      })
    }
  })

  return alerts
}

/**
 * Generate timing-based alerts
 */
function generateTimingAlerts(diet) {
  const alerts = []
  const frequentItems = getFrequentItems(diet)

  // Check timing for top 5 frequent items
  frequentItems.slice(0, 5).forEach(item => {
    const timing = isGoodTimeToBuy(item.name)

    if (!timing.isGood && timing.alternative) {
      alerts.push({
        id: `diet_timing_wait_${item.name}`,
        type: 'dieta',
        subtype: 'conviene_esperar',
        severity: 'low',
        title: `Conviene esperar para ${item.name}`,
        message: timing.reason || 'No es el mejor momento',
        detail: timing.alternative,
        product: item.name,
        category: item.category
      })
    }
  })

  return alerts.slice(0, 1) // Max 1 timing alert
}

/**
 * Generate best shopping day alert
 */
function generateBestDayAlert(diet, patterns) {
  const frequentItems = getFrequentItems(diet)
  if (frequentItems.length < 3) return null

  const dayOfWeek = new Date().getDay()
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

  // Check if most items are good to buy today
  let goodToday = 0
  let totalChecked = 0

  frequentItems.slice(0, 8).forEach(item => {
    const timing = isGoodTimeToBuy(item.name)
    totalChecked++
    if (timing.isGood) goodToday++
  })

  const percentage = (goodToday / totalChecked) * 100

  if (percentage >= 60) {
    return {
      id: `diet_best_day_${dayOfWeek}`,
      type: 'dieta',
      subtype: 'buen_dia_compra',
      severity: 'low',
      title: `Hoy es buen día para comprar`,
      message: `${Math.round(percentage)}% de tu dieta tiene buen precio`,
      detail: `Los ${dayNames[dayOfWeek]} suelen tener mejores precios`,
      action: {
        type: 'shop',
        label: 'Ver recomendaciones'
      }
    }
  }

  return null
}

/**
 * Get chat context alert for diet
 * Single, non-intrusive message
 */
export function getDietChatAlert(diet, patterns) {
  if (!diet || !diet.items || diet.items.length === 0) {
    return null
  }

  const confidence = getDietConfidence(diet)
  if (confidence === 'none' || confidence === 'low') {
    return null
  }

  const alerts = generateDietAlerts(diet, patterns)
  if (alerts.length === 0) return null

  // Get highest priority alert
  const topAlert = alerts[0]

  return {
    id: 'diet_chat_context',
    type: 'diet_suggestion',
    title: 'Sugerencia de dieta',
    message: 'Puedo ayudarte a optimizar compras según tu dieta esta semana',
    detail: topAlert.message,
    action: {
      type: 'show_recommendations',
      label: 'Ver más'
    }
  }
}

/**
 * Check if product purchase triggers diet alert
 * Call after logging expense
 */
export function checkPurchaseDietAlert(productName, price, diet) {
  if (!diet || !isInDiet(productName, diet)) {
    return null
  }

  const judgment = getPriceJudgment(productName, price)
  if (!judgment.hasData) return null

  // Only alert if notably expensive
  if (judgment.judgment === JUDGMENT.VERY_EXPENSIVE) {
    return {
      type: 'post_purchase_diet',
      message: `${capitalize(productName)}: ${judgment.message}`,
      detail: 'Para la próxima, chequeá precios primero',
      severity: 'info'
    }
  }

  // Positive reinforcement for good price
  if (judgment.judgment === JUDGMENT.VERY_CHEAP) {
    return {
      type: 'post_purchase_diet_good',
      message: `Buen precio en ${productName}`,
      detail: judgment.detail,
      severity: 'positive'
    }
  }

  return null
}

/**
 * Get dismissed alert IDs
 */
function getDismissedAlerts() {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(DIET_ALERT_DISMISSED_KEY)
    const dismissed = data ? JSON.parse(data) : {}

    // Filter by cooldown
    const active = []
    Object.entries(dismissed).forEach(([id, entry]) => {
      const daysSince = (Date.now() - entry.dismissedAt) / (24 * 60 * 60 * 1000)
      if (daysSince < DISMISS_COOLDOWN_DAYS) {
        active.push(id)
      }
    })

    return active
  } catch {
    return []
  }
}

/**
 * Dismiss a diet alert
 */
export function dismissDietAlert(alertId) {
  if (typeof window === 'undefined') return

  try {
    const data = localStorage.getItem(DIET_ALERT_DISMISSED_KEY)
    const dismissed = data ? JSON.parse(data) : {}

    dismissed[alertId] = {
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

    localStorage.setItem(DIET_ALERT_DISMISSED_KEY, JSON.stringify(cleaned))
  } catch {
    // Ignore
  }
}

/**
 * Capitalize helper
 */
function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
