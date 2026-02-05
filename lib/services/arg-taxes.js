/**
 * Argentina Taxes Service
 * Calculates real prices for USD purchases with taxes
 *
 * Current taxes (as of Dec 2024):
 * - PAIS: 30% (for digital services, Netflix, etc.)
 * - RG 4815: 35% (ganancias/bienes personales perception)
 * - IVA Digital: 21% (some services)
 *
 * Note: Tax rates change frequently in Argentina
 * These are stored in localStorage so they can be updated
 */

const TAXES_CONFIG_KEY = 'gaston_arg_taxes'

// Default tax rates (can be updated via settings)
const DEFAULT_TAXES = {
  pais: 0.30,           // Impuesto PAIS - 30%
  ganancias: 0.35,      // RG 4815 / Percepción Ganancias - 35%
  iva_digital: 0.21,    // IVA servicios digitales - 21%
  updated_at: '2024-12'
}

/**
 * Get current tax configuration
 */
export function getTaxConfig() {
  if (typeof window === 'undefined') return DEFAULT_TAXES

  try {
    const stored = localStorage.getItem(TAXES_CONFIG_KEY)
    return stored ? { ...DEFAULT_TAXES, ...JSON.parse(stored) } : DEFAULT_TAXES
  } catch {
    return DEFAULT_TAXES
  }
}

/**
 * Update tax configuration (for when rates change)
 */
export function updateTaxConfig(updates) {
  if (typeof window === 'undefined') return

  const current = getTaxConfig()
  const updated = {
    ...current,
    ...updates,
    updated_at: new Date().toISOString().slice(0, 7)
  }

  localStorage.setItem(TAXES_CONFIG_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Calculate "dólar tarjeta" from oficial rate
 * This is the rate you pay when using credit card for USD purchases
 */
export function calculateDolarTarjeta(oficialRate) {
  const taxes = getTaxConfig()
  // Tarjeta = Oficial × (1 + PAIS + Ganancias)
  return oficialRate * (1 + taxes.pais + taxes.ganancias)
}

/**
 * Calculate total taxes percentage for credit card purchases
 */
export function getTotalCardTaxPercent() {
  const taxes = getTaxConfig()
  return (taxes.pais + taxes.ganancias) * 100
}

/**
 * Calculate real ARS price for a USD subscription
 * @param {number} usdPrice - Base price in USD
 * @param {string} paymentMethod - 'card' | 'blue' | 'cripto'
 * @param {number} rates - Current exchange rates
 * @returns {object} { arsPrice, breakdown, method }
 */
export function calculateSubscriptionPrice(usdPrice, paymentMethod, rates) {
  const taxes = getTaxConfig()

  if (paymentMethod === 'blue') {
    // Blue dollar - no taxes, just market rate
    const rate = rates.blue?.sell || 1200
    return {
      arsPrice: usdPrice * rate,
      usdRate: rate,
      breakdown: {
        base: usdPrice,
        taxes: 0,
        total: usdPrice
      },
      method: 'blue',
      taxesApplied: []
    }
  }

  if (paymentMethod === 'cripto') {
    // Crypto/USDT - no taxes
    const rate = rates.cripto?.sell || rates.blue?.sell || 1200
    return {
      arsPrice: usdPrice * rate,
      usdRate: rate,
      breakdown: {
        base: usdPrice,
        taxes: 0,
        total: usdPrice
      },
      method: 'cripto',
      taxesApplied: []
    }
  }

  // Default: card (tarjeta)
  const oficialRate = rates.oficial?.sell || 1000
  const paisAmount = usdPrice * taxes.pais
  const gananciasAmount = usdPrice * taxes.ganancias
  const totalUsd = usdPrice + paisAmount + gananciasAmount
  const tarjetaRate = rates.tarjeta?.sell || calculateDolarTarjeta(oficialRate)

  return {
    arsPrice: usdPrice * tarjetaRate,
    usdRate: tarjetaRate,
    breakdown: {
      base: usdPrice,
      pais: paisAmount,
      ganancias: gananciasAmount,
      total: totalUsd
    },
    method: 'tarjeta',
    taxesApplied: [
      { name: 'PAIS', percent: taxes.pais * 100, amount: paisAmount },
      { name: 'Ganancias', percent: taxes.ganancias * 100, amount: gananciasAmount }
    ]
  }
}

/**
 * Determine likely payment method for a subscription
 * Based on subscription name heuristics
 */
export function detectPaymentMethod(subscriptionName) {
  const name = subscriptionName.toLowerCase()

  // Services commonly paid with card
  const cardServices = [
    'netflix', 'spotify', 'disney', 'hbo', 'amazon', 'prime',
    'youtube', 'apple', 'icloud', 'google', 'microsoft', 'office',
    'adobe', 'canva', 'notion', 'slack', 'zoom', 'dropbox'
  ]

  // Services commonly paid with crypto/USD
  const cryptoServices = [
    'chatgpt', 'openai', 'claude', 'anthropic', 'midjourney',
    'github', 'copilot', 'vercel', 'netlify', 'railway'
  ]

  if (cardServices.some(s => name.includes(s))) {
    return 'card'
  }

  if (cryptoServices.some(s => name.includes(s))) {
    return 'cripto'
  }

  return 'card' // Default assumption
}

/**
 * Format tax breakdown for display
 */
export function formatTaxBreakdown(calculation) {
  if (!calculation.taxesApplied || calculation.taxesApplied.length === 0) {
    return null
  }

  return calculation.taxesApplied
    .map(t => `${t.name} ${t.percent}%`)
    .join(' + ')
}
