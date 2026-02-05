/**
 * Currency Conversion Service
 * Invisible ARS to USD conversion for expenses
 * All conversions are automatic and contextual
 */

import { getCachedRates, getUsdBlue } from './market-rates'

/**
 * Convert ARS amount to USD equivalents
 * Returns multiple reference values for context
 * @param {number} arsAmount - Amount in ARS
 * @returns {object} { usdBlue, usdOficial, usdCripto, rate }
 */
export function convertArsToUsd(arsAmount) {
  const rates = getCachedRates()

  if (!rates) {
    return null
  }

  const blueRate = rates.blue?.sell || 1200
  const oficialRate = rates.oficial?.sell || 1000
  const criptoRate = rates.cripto?.sell || blueRate

  return {
    usdBlue: arsAmount / blueRate,
    usdOficial: arsAmount / oficialRate,
    usdCripto: arsAmount / criptoRate,
    rates: {
      blue: blueRate,
      oficial: oficialRate,
      cripto: criptoRate
    },
    convertedAt: Date.now()
  }
}

/**
 * Convert ARS to USD Blue (primary reference)
 * @param {number} arsAmount
 * @returns {number|null}
 */
export function arsToUsdBlue(arsAmount) {
  const rates = getCachedRates()
  if (!rates?.blue?.sell) return null
  return arsAmount / rates.blue.sell
}

/**
 * Convert USD to ARS Blue
 * @param {number} usdAmount
 * @returns {number|null}
 */
export function usdBlueToArs(usdAmount) {
  const rates = getCachedRates()
  if (!rates?.blue?.sell) return null
  return usdAmount * rates.blue.sell
}

/**
 * Format USD amount for display
 * @param {number} amount
 * @param {boolean} compact - Use compact notation for large amounts
 */
export function formatUsd(amount, compact = false) {
  if (amount === null || amount === undefined) return null

  if (compact && Math.abs(amount) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(amount)
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount)
}

/**
 * Format ARS amount for display
 */
export function formatArs(amount) {
  if (amount === null || amount === undefined) return null

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Get contextual USD reference for an expense
 * Used in movimientos display
 */
export function getUsdContext(arsAmount) {
  const conversion = convertArsToUsd(arsAmount)
  if (!conversion) return null

  return {
    usd: conversion.usdBlue,
    formatted: formatUsd(conversion.usdBlue),
    rate: conversion.rates.blue,
    hint: `≈ ${formatUsd(conversion.usdBlue)} USD`
  }
}

/**
 * Enrich a movimiento with USD equivalents
 * This is called automatically when saving
 */
export function enrichWithUsdEquivalent(movimiento) {
  if (!movimiento.monto) return movimiento

  const conversion = convertArsToUsd(movimiento.monto)
  if (!conversion) return movimiento

  return {
    ...movimiento,
    usd_blue_equiv: Number(conversion.usdBlue.toFixed(2)),
    usd_rate_at_save: conversion.rates.blue,
    converted_at: conversion.convertedAt
  }
}

/**
 * Calculate spending power comparison
 * "Con esto podrías comprar X USD"
 */
export function getSpendingPowerContext(arsAmount) {
  const conversion = convertArsToUsd(arsAmount)
  if (!conversion) return null

  const usd = conversion.usdBlue

  // Contextual comparisons
  if (usd >= 100) {
    return `Equivale a ${formatUsd(usd)}`
  } else if (usd >= 10) {
    return `≈ ${formatUsd(usd)}`
  } else {
    return `≈ ${formatUsd(usd)}`
  }
}

/**
 * Compare two ARS amounts in USD terms
 * Useful for showing real comparison across time
 */
export function compareInUsd(amount1, rate1, amount2, rate2) {
  const usd1 = amount1 / rate1
  const usd2 = amount2 / rate2

  const diff = usd1 - usd2
  const percentChange = ((usd1 - usd2) / usd2) * 100

  return {
    amount1Usd: usd1,
    amount2Usd: usd2,
    diffUsd: diff,
    percentChange
  }
}

/**
 * Get current exchange rate summary
 * For display in UI
 */
export function getRateSummary() {
  const rates = getCachedRates()
  if (!rates) return null

  return {
    blue: rates.blue?.sell,
    oficial: rates.oficial?.sell,
    tarjeta: rates.tarjeta?.sell,
    spread: rates.blue?.sell && rates.oficial?.sell
      ? ((rates.blue.sell - rates.oficial.sell) / rates.oficial.sell * 100).toFixed(1)
      : null
  }
}
