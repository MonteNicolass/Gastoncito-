/**
 * Asset Prices Service
 * Fetches real-time prices for crypto and other assets
 * Uses free public APIs, works offline with cache fallback
 */

import { getCachedPrice, setCachedPrice, getCacheEntry, formatLastUpdated } from './price-cache'

// Common crypto symbols mapping for CoinGecko API
const CRYPTO_IDS = {
  'bitcoin': 'bitcoin',
  'btc': 'bitcoin',
  'ethereum': 'ethereum',
  'eth': 'ethereum',
  'usdt': 'tether',
  'tether': 'tether',
  'usdc': 'usd-coin',
  'bnb': 'binancecoin',
  'xrp': 'ripple',
  'ripple': 'ripple',
  'sol': 'solana',
  'solana': 'solana',
  'ada': 'cardano',
  'cardano': 'cardano',
  'doge': 'dogecoin',
  'dogecoin': 'dogecoin',
  'dot': 'polkadot',
  'polkadot': 'polkadot',
  'matic': 'matic-network',
  'polygon': 'matic-network',
  'link': 'chainlink',
  'chainlink': 'chainlink',
  'avax': 'avalanche-2',
  'avalanche': 'avalanche-2',
  'ltc': 'litecoin',
  'litecoin': 'litecoin',
}

// USD to ARS approximate rate (cached separately)
const USD_ARS_CACHE_KEY = 'usd_ars_rate'

/**
 * Get USD to ARS exchange rate
 * Uses DolarApi.com for Argentina blue dollar rate
 */
export async function getUsdArsRate() {
  const cacheKey = USD_ARS_CACHE_KEY
  const cached = getCachedPrice(cacheKey, 1) // 1 hour TTL

  if (cached) return cached

  try {
    // Using dolarapi.com (free, no auth needed)
    const response = await fetch('https://dolarapi.com/v1/dolares/blue', {
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) throw new Error('API error')

    const data = await response.json()
    const rate = data.venta || data.compra || 1200 // Fallback rate

    setCachedPrice(cacheKey, rate)
    return rate
  } catch (error) {
    console.warn('Failed to fetch USD/ARS rate:', error)
    // Return cached value even if expired, or fallback
    const entry = getCacheEntry(cacheKey)
    return entry?.data || 1200 // Fallback rate
  }
}

/**
 * Get crypto price in USD from CoinGecko
 */
export async function getCryptoPrice(symbol) {
  const normalizedSymbol = symbol.toLowerCase().trim()
  const coinId = CRYPTO_IDS[normalizedSymbol] || normalizedSymbol

  const cacheKey = `crypto_${coinId}`
  const cached = getCachedPrice(cacheKey, 0.5) // 30 min TTL

  if (cached) return cached

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(5000) }
    )

    if (!response.ok) throw new Error('API error')

    const data = await response.json()
    const coinData = data[coinId]

    if (!coinData) throw new Error('Coin not found')

    const result = {
      priceUsd: coinData.usd,
      change24h: coinData.usd_24h_change || 0,
      symbol: symbol.toUpperCase(),
      coinId,
      source: 'coingecko'
    }

    setCachedPrice(cacheKey, result)
    return result
  } catch (error) {
    console.warn(`Failed to fetch ${symbol} price:`, error)
    // Return cached even if expired
    const entry = getCacheEntry(cacheKey)
    return entry?.data || null
  }
}

/**
 * Get price in ARS for a crypto asset
 */
export async function getCryptoPriceArs(symbol) {
  const [cryptoPrice, usdRate] = await Promise.all([
    getCryptoPrice(symbol),
    getUsdArsRate()
  ])

  if (!cryptoPrice) return null

  return {
    ...cryptoPrice,
    priceArs: cryptoPrice.priceUsd * usdRate,
    usdRate
  }
}

/**
 * Update investment with current prices
 * Returns investment with currentValue updated
 */
export async function updateInvestmentValue(investment) {
  if (investment.type !== 'cripto') {
    // For non-crypto, just return as-is
    return investment
  }

  try {
    const price = await getCryptoPriceArs(investment.name)

    if (!price) return investment

    const currentValue = investment.amount * price.priceArs
    const variation = currentValue - investment.initialValue
    const variationPercent = investment.initialValue > 0
      ? ((currentValue - investment.initialValue) / investment.initialValue) * 100
      : 0

    return {
      ...investment,
      currentValue,
      pricePerUnit: price.priceArs,
      priceUsd: price.priceUsd,
      change24h: price.change24h,
      variation,
      variationPercent,
      lastUpdated: Date.now()
    }
  } catch (error) {
    console.warn('Failed to update investment value:', error)
    return investment
  }
}

/**
 * Update all investments with current prices
 * Non-blocking, returns partial results on error
 */
export async function updateAllInvestments(investments) {
  const results = await Promise.allSettled(
    investments.map(inv => updateInvestmentValue(inv))
  )

  return results.map((result, index) =>
    result.status === 'fulfilled' ? result.value : investments[index]
  )
}

/**
 * Get last updated info for an asset
 */
export function getAssetLastUpdated(symbol) {
  const normalizedSymbol = symbol.toLowerCase().trim()
  const coinId = CRYPTO_IDS[normalizedSymbol] || normalizedSymbol
  const cacheKey = `crypto_${coinId}`
  const entry = getCacheEntry(cacheKey)

  return entry?.timestamp ? formatLastUpdated(entry.timestamp) : null
}

/**
 * Check if we have any cached price (for offline indicator)
 */
export function hasCachedPrice(symbol) {
  const normalizedSymbol = symbol.toLowerCase().trim()
  const coinId = CRYPTO_IDS[normalizedSymbol] || normalizedSymbol
  const cacheKey = `crypto_${coinId}`
  const entry = getCacheEntry(cacheKey)

  return !!entry
}
