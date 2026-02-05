/**
 * Subscription Prices Service
 * Reference prices for common subscriptions (Argentina market)
 * Now includes real ARS calculation with taxes for USD services
 *
 * Note: These are reference prices and may not be exact.
 * The app works offline - these are just for comparison.
 */

import { getCachedPrice, setCachedPrice, getCacheEntry, formatLastUpdated } from './price-cache'
import { getCachedRates } from './market-rates'
import { calculateSubscriptionPrice, detectPaymentMethod, formatTaxBreakdown } from './arg-taxes'

// Reference prices - base prices before taxes
// currency: 'ARS' = local price, 'USD' = needs conversion
const REFERENCE_PRICES = {
  'Netflix': {
    price: 6999,
    currency: 'ARS',
    plans: {
      basic: 4299,
      standard: 6999,
      premium: 9999
    },
    lastKnown: '2024-12'
  },
  'Spotify': {
    price: 2899,
    currency: 'ARS',
    plans: {
      individual: 2899,
      duo: 3799,
      familiar: 4499
    },
    lastKnown: '2024-12'
  },
  'YouTube Premium': {
    price: 2899,
    currency: 'ARS',
    plans: {
      individual: 2899,
      familiar: 5499
    },
    lastKnown: '2024-12'
  },
  'iCloud': {
    price: 1299,
    currency: 'ARS',
    plans: {
      '50gb': 1299,
      '200gb': 3999,
      '2tb': 12999
    },
    lastKnown: '2024-12'
  },
  'Google Drive': {
    price: 399,
    currency: 'ARS',
    plans: {
      '100gb': 399,
      '200gb': 549,
      '2tb': 3199
    },
    lastKnown: '2024-12'
  },
  'Amazon Prime': {
    price: 1999,
    currency: 'ARS',
    lastKnown: '2024-12'
  },
  'Disney+': {
    price: 4499,
    currency: 'ARS',
    plans: {
      standard: 4499,
      premium: 6999
    },
    lastKnown: '2024-12'
  },
  'HBO Max': {
    price: 4299,
    currency: 'ARS',
    plans: {
      standard: 4299,
      mobile: 1999
    },
    lastKnown: '2024-12'
  },
  'ChatGPT Plus': {
    price: 20,
    currency: 'USD',
    lastKnown: '2024-12'
  },
  'Crunchyroll': {
    price: 1799,
    currency: 'ARS',
    lastKnown: '2024-12'
  },
  'Apple Music': {
    price: 2899,
    currency: 'ARS',
    plans: {
      individual: 2899,
      familiar: 4499
    },
    lastKnown: '2024-12'
  },
  'Paramount+': {
    price: 2999,
    currency: 'ARS',
    lastKnown: '2024-12'
  },
  'Star+': {
    price: 3999,
    currency: 'ARS',
    lastKnown: '2024-12'
  },
  // USD-based services (need conversion)
  'Claude Pro': {
    price: 20,
    currency: 'USD',
    paymentMethod: 'cripto',
    lastKnown: '2024-12'
  },
  'GitHub Copilot': {
    price: 10,
    currency: 'USD',
    paymentMethod: 'card',
    lastKnown: '2024-12'
  },
  'Notion': {
    price: 10,
    currency: 'USD',
    paymentMethod: 'card',
    plans: {
      plus: 10,
      business: 18
    },
    lastKnown: '2024-12'
  },
  'Midjourney': {
    price: 10,
    currency: 'USD',
    paymentMethod: 'cripto',
    plans: {
      basic: 10,
      standard: 30,
      pro: 60
    },
    lastKnown: '2024-12'
  },
  'Vercel Pro': {
    price: 20,
    currency: 'USD',
    paymentMethod: 'card',
    lastKnown: '2024-12'
  },
  'Adobe Creative Cloud': {
    price: 55,
    currency: 'USD',
    paymentMethod: 'card',
    lastKnown: '2024-12'
  },
  'Microsoft 365': {
    price: 7,
    currency: 'USD',
    paymentMethod: 'card',
    plans: {
      personal: 7,
      family: 10
    },
    lastKnown: '2024-12'
  },
  'Canva Pro': {
    price: 13,
    currency: 'USD',
    paymentMethod: 'card',
    lastKnown: '2024-12'
  }
}

/**
 * Get reference price for a subscription provider
 * Returns cached or static reference data
 */
export function getSubscriptionPrice(provider) {
  const cacheKey = `sub_${provider.toLowerCase().replace(/\s+/g, '_')}`

  // Try cache first
  const cached = getCachedPrice(cacheKey, 24) // 24 hour TTL for subscriptions
  if (cached) return cached

  // Fallback to static reference
  const reference = REFERENCE_PRICES[provider]
  if (reference) {
    setCachedPrice(cacheKey, reference)
    return reference
  }

  return null
}

/**
 * Get all available subscription prices
 */
export function getAllSubscriptionPrices() {
  return REFERENCE_PRICES
}

/**
 * Compare user's price with reference
 * Returns difference info
 */
export function comparePrice(provider, userPrice) {
  const reference = getSubscriptionPrice(provider)
  if (!reference || !userPrice) return null

  const refPrice = reference.price
  const diff = userPrice - refPrice
  const percentDiff = Math.round((diff / refPrice) * 100)

  return {
    referencePrice: refPrice,
    userPrice,
    difference: diff,
    percentDiff,
    currency: reference.currency,
    status: diff > 0 ? 'higher' : diff < 0 ? 'lower' : 'same',
    plans: reference.plans || null,
    lastKnown: reference.lastKnown
  }
}

/**
 * Get last updated info for subscription prices
 */
export function getSubscriptionPriceLastUpdated(provider) {
  const cacheKey = `sub_${provider.toLowerCase().replace(/\s+/g, '_')}`
  const entry = getCacheEntry(cacheKey)

  if (entry?.timestamp) {
    return formatLastUpdated(entry.timestamp)
  }

  const reference = REFERENCE_PRICES[provider]
  return reference?.lastKnown ? `Ref. ${reference.lastKnown}` : null
}

/**
 * Check for price increases across all user subscriptions
 */
export function checkForPriceChanges(userSubscriptions) {
  const changes = []

  for (const sub of userSubscriptions) {
    const comparison = comparePrice(sub.name, sub.amount)
    if (comparison && comparison.status === 'lower') {
      // User pays less than reference - price may have increased
      changes.push({
        name: sub.name,
        currentUserPrice: sub.amount,
        referencePrice: comparison.referencePrice,
        potentialIncrease: comparison.difference * -1,
        percentIncrease: comparison.percentDiff * -1
      })
    }
  }

  return changes
}

/**
 * Calculate real ARS price for a subscription
 * Handles both ARS and USD subscriptions with taxes
 */
export function calculateRealArsPrice(provider, userAmount = null) {
  const reference = REFERENCE_PRICES[provider]
  if (!reference) return null

  // If it's already in ARS, just return it
  if (reference.currency === 'ARS') {
    return {
      arsPrice: userAmount || reference.price,
      usdPrice: null,
      currency: 'ARS',
      method: 'local',
      taxBreakdown: null,
      isEstimate: false
    }
  }

  // USD subscription - needs conversion
  const rates = getCachedRates()
  if (!rates) {
    // Offline fallback
    return {
      arsPrice: userAmount || (reference.price * 1500), // Rough estimate
      usdPrice: reference.price,
      currency: 'USD',
      method: 'offline_estimate',
      taxBreakdown: null,
      isEstimate: true
    }
  }

  const paymentMethod = reference.paymentMethod || detectPaymentMethod(provider)
  const calculation = calculateSubscriptionPrice(reference.price, paymentMethod, rates)

  return {
    arsPrice: calculation.arsPrice,
    usdPrice: reference.price,
    currency: 'USD',
    method: calculation.method,
    usdRate: calculation.usdRate,
    taxBreakdown: formatTaxBreakdown(calculation),
    taxesApplied: calculation.taxesApplied,
    isEstimate: true
  }
}

/**
 * Get subscription with real ARS cost
 * Enriches subscription data with current pricing
 */
export function enrichSubscriptionWithRealPrice(subscription) {
  const realPrice = calculateRealArsPrice(subscription.name, subscription.amount)

  if (!realPrice) {
    return {
      ...subscription,
      realArsPrice: subscription.amount,
      isUsd: false,
      priceInfo: null
    }
  }

  return {
    ...subscription,
    realArsPrice: realPrice.arsPrice,
    isUsd: realPrice.currency === 'USD',
    usdPrice: realPrice.usdPrice,
    priceInfo: realPrice.isEstimate ? {
      method: realPrice.method,
      rate: realPrice.usdRate,
      taxes: realPrice.taxBreakdown
    } : null
  }
}

/**
 * Calculate total monthly cost in real ARS
 * Includes USD subscriptions converted at current rates
 */
export function calculateTotalMonthlyReal(subscriptions) {
  const rates = getCachedRates()
  let totalArs = 0
  let totalUsdEquiv = 0
  const breakdown = {
    local: 0,
    usdCard: 0,
    usdCripto: 0
  }

  for (const sub of subscriptions) {
    const monthlyAmount = sub.amount / (sub.cadence_months || 1)
    const reference = REFERENCE_PRICES[sub.name]

    if (reference?.currency === 'USD' && rates) {
      const paymentMethod = reference.paymentMethod || detectPaymentMethod(sub.name)
      const calculation = calculateSubscriptionPrice(reference.price, paymentMethod, rates)
      const realMonthly = calculation.arsPrice / (sub.cadence_months || 1)

      totalArs += realMonthly
      totalUsdEquiv += reference.price / (sub.cadence_months || 1)

      if (paymentMethod === 'card' || paymentMethod === 'tarjeta') {
        breakdown.usdCard += realMonthly
      } else {
        breakdown.usdCripto += realMonthly
      }
    } else {
      totalArs += monthlyAmount
      breakdown.local += monthlyAmount

      if (rates?.blue?.sell) {
        totalUsdEquiv += monthlyAmount / rates.blue.sell
      }
    }
  }

  return {
    totalArs,
    totalUsdEquiv,
    breakdown,
    hasUsdSubs: breakdown.usdCard > 0 || breakdown.usdCripto > 0
  }
}

/**
 * Get pricing method label for display
 */
export function getPricingMethodLabel(method) {
  const labels = {
    'local': 'Precio local',
    'tarjeta': 'Dólar tarjeta',
    'card': 'Dólar tarjeta',
    'blue': 'Dólar blue',
    'cripto': 'Dólar cripto',
    'offline_estimate': 'Estimado'
  }
  return labels[method] || method
}
