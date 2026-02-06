/**
 * Safe Math Helpers
 * Centralized guards against NaN, Infinity, division-by-zero.
 */

export function safeDiv(a: number, b: number, fallback = 0): number {
  if (b === 0 || !isFinite(a) || !isFinite(b)) return fallback
  const result = a / b
  return isFinite(result) ? result : fallback
}

export function safeAvg(values: number[], fallback: number | null = null): number | null {
  const valid = values.filter(v => isFinite(v))
  if (valid.length === 0) return fallback
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

export function safePct(part: number, total: number, fallback = 0): number {
  return safeDiv(part, total, fallback) * 100
}

export function safeDelta(current: number, previous: number, fallback = 0): number {
  if (previous === 0) return current > 0 ? 100 : fallback
  return safeDiv((current - previous), previous, fallback) * 100
}

export function safeRound(value: number, decimals = 0, fallback = 0): number {
  if (!isFinite(value)) return fallback
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

export function safeSum(values: number[]): number {
  return values.reduce((acc, v) => acc + (isFinite(v) ? v : 0), 0)
}

export function clamp(value: number, min: number, max: number): number {
  if (!isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}
