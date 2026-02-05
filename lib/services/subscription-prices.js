/**
 * Subscription Prices Service
 * Reference prices for common subscriptions (Argentina market)
 *
 * Note: These are reference prices and may not be exact.
 * The app works offline - these are just for comparison.
 */

import { getCachedPrice, setCachedPrice, getCacheEntry, formatLastUpdated } from './price-cache'

// Reference prices in ARS (updated periodically)
// These represent typical monthly prices in Argentina
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
