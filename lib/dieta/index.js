/**
 * Dieta - Diet-Aware Recommendation System
 *
 * Uses user's diet to filter and improve shopping recommendations
 *
 * Rules:
 * - Diet is optional (works without it)
 * - Never suggest new foods
 * - Focus on where/when, not what
 * - Max 1-2 visible recommendations
 * - 14-day cooldown for dismissed suggestions
 */

// Re-export all modules
export * from './diet-model'
export * from './diet-inference'
export * from './diet-recommendations'
export * from './diet-savings'
export * from './diet-alerts'

import { getUserDiet, hasDietData, getDietConfidence } from './diet-model'
import { inferDietFromPatterns, calculateDietCoverage } from './diet-inference'
import { filterByDiet, prioritizeByDiet, getIdealPurchaseToday, getDietPriceAlerts, getDietContextMessage } from './diet-recommendations'
import { calculateMonthlySavingsProjection, getDietSavingsInsight } from './diet-savings'
import { generateDietAlerts, getDietChatAlert } from './diet-alerts'

/**
 * Initialize diet system
 * Call on app load to ensure diet data is available
 * @param {Object} patterns - Purchase patterns
 */
export async function initDietSystem(patterns) {
  // Check if we have diet data
  if (hasDietData()) {
    return getUserDiet()
  }

  // Try to infer from patterns
  if (patterns && patterns.dataPoints >= 10) {
    const inferred = inferDietFromPatterns(patterns)
    return inferred ? getUserDiet() : null
  }

  return null
}

/**
 * Get all diet-aware insights for Vision/Resumen
 * @param {Object} patterns - Purchase patterns
 */
export function getDietInsights(patterns) {
  const diet = getUserDiet(patterns)

  if (!diet || !diet.items || diet.items.length === 0) {
    return {
      hasDiet: false,
      insights: [],
      alerts: [],
      idealPurchase: null,
      savingsProjection: null
    }
  }

  const confidence = getDietConfidence(diet)

  // Don't show insights for low confidence
  if (confidence === 'none' || confidence === 'low') {
    return {
      hasDiet: true,
      confidence,
      insights: [],
      alerts: [],
      idealPurchase: null,
      savingsProjection: null,
      message: 'Necesito más datos para darte recomendaciones de dieta'
    }
  }

  // Get all diet insights
  const alerts = generateDietAlerts(diet, patterns)
  const priceAlerts = getDietPriceAlerts(diet, patterns)
  const idealPurchase = getIdealPurchaseToday(diet, patterns)
  const savingsProjection = calculateMonthlySavingsProjection(diet, patterns)
  const savingsInsight = getDietSavingsInsight(diet, patterns)

  // Combine insights (max 2)
  const insights = []

  // Priority: savings > ideal purchase > price alerts
  if (savingsInsight) {
    insights.push({
      id: 'diet_savings_insight',
      type: 'savings',
      priority: 3,
      ...savingsInsight
    })
  }

  if (idealPurchase && idealPurchase.isGoodDay) {
    insights.push({
      id: 'diet_ideal_today',
      type: 'ideal_purchase',
      priority: 2,
      message: idealPurchase.message,
      detail: idealPurchase.detail,
      data: idealPurchase
    })
  }

  priceAlerts.forEach(alert => {
    if (insights.length < 2) {
      insights.push({
        id: alert.id,
        type: 'price_alert',
        priority: 1,
        message: alert.message,
        detail: alert.detail,
        data: alert
      })
    }
  })

  return {
    hasDiet: true,
    confidence,
    contextMessage: getDietContextMessage(diet),
    insights: insights.slice(0, 2),
    alerts,
    idealPurchase,
    savingsProjection,
    coverage: calculateDietCoverage(diet.items, patterns)
  }
}

/**
 * Enhance existing recommendations with diet awareness
 * @param {Array} recommendations - Existing recommendations
 * @param {Object} patterns - Purchase patterns
 */
export function enhanceRecommendationsWithDiet(recommendations, patterns) {
  const diet = getUserDiet(patterns)

  if (!diet || !diet.items || diet.items.length === 0) {
    return recommendations
  }

  // Filter to diet-relevant
  const filtered = filterByDiet(recommendations, diet)

  // Prioritize diet items
  const prioritized = prioritizeByDiet(filtered, diet)

  // Add context message
  return prioritized.map(reco => ({
    ...reco,
    dietContext: getDietContextMessage(diet)
  }))
}

/**
 * Get diet alert for Chat context
 * Returns single, non-intrusive suggestion
 * @param {Object} patterns - Purchase patterns
 */
export function getDietSuggestionForChat(patterns) {
  const diet = getUserDiet(patterns)

  if (!diet) return null

  return getDietChatAlert(diet, patterns)
}

/**
 * Generate alerts for unified alert engine
 * @param {Object} patterns - Purchase patterns
 */
export function generateDietAlertsForEngine(patterns) {
  const diet = getUserDiet(patterns)

  if (!diet) return []

  return generateDietAlerts(diet, patterns)
}

/**
 * Get quick diet status for UI badges
 */
export function getDietStatus() {
  const diet = getUserDiet()

  if (!diet) {
    return {
      active: false,
      itemCount: 0,
      confidence: 'none'
    }
  }

  return {
    active: true,
    itemCount: diet.items?.length || 0,
    confidence: getDietConfidence(diet),
    source: diet.source
  }
}

/**
 * Check if we should show diet features
 * Based on data availability and confidence
 */
export function shouldShowDietFeatures() {
  const diet = getUserDiet()

  if (!diet) return false

  const confidence = getDietConfidence(diet)

  return confidence === 'high' || confidence === 'medium'
}
