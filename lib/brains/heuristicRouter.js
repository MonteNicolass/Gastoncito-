// lib/brains/heuristicRouter.js
// Fallback determinístico para routing sin OpenAI

const MONEY_VERBS = [
  'gasté', 'gaste', 'pagué', 'pague', 'compré', 'compre',
  'cobré', 'cobre', 'ingresé', 'ingrese', 'transferí', 'transferi',
  'pago', 'gasto', 'compra', 'cobro', 'ingreso', 'transferencia'
]

const MONEY_MERCHANTS = [
  'uber', 'cabify', 'rappi', 'pedidosya', 'mercado', 'mp', 'galicia',
  'netflix', 'spotify', 'amazon', 'disney', 'hbo', 'flow',
  'carrefour', 'coto', 'dia', 'walmart', 'farmacity', 'farmacity',
  'shell', 'ypf', 'axion', 'café', 'cafe', 'restaurant', 'bar'
]

const SUBSCRIPTIONS = [
  'netflix', 'spotify', 'amazon', 'disney', 'hbo', 'flow',
  'youtube', 'crunchyroll', 'apple music', 'deezer', 'tidal'
]

const MENTAL_KEYWORDS = [
  'me siento', 'siento', 'ansioso', 'ansiosa', 'ansiedad',
  'triste', 'tristeza', 'deprimido', 'depresión', 'estrés',
  'estresado', 'feliz', 'contento', 'alegre', 'enojado',
  'frustrado', 'preocupado', 'cansado mentalmente', 'agobiado'
]

const PHYSICAL_KEYWORDS = [
  'entrené', 'entrene', 'gym', 'gimnasio', 'corrí', 'corri',
  'caminé', 'camine', 'pesas', 'yoga', 'pilates', 'natación',
  'bicicleta', 'bici', 'ejercicio', 'deportes', 'cardio',
  'dolor', 'peso', 'kg', 'dormi', 'dormí', 'sueño', 'horas de sueño'
]

// Normalizar merchants comunes
const MERCHANT_NORMALIZATION = {
  'mp': 'mercado pago',
  'mercado': 'mercado pago',
  'lemon': 'lemon cash',
  'uala': 'ualá'
}

// Extraer monto del texto
function extractAmount(text) {
  // Formato "k" para miles: 50k = 50000
  const kMatch = text.match(/\b(\d+(?:[.,]\d+)?)\s*k\b/i)
  if (kMatch) {
    const num = kMatch[1].replace(',', '.')
    const amount = parseFloat(num) * 1000
    if (!isNaN(amount) && amount > 0) return amount
  }

  // Formato argentino con puntos de miles: 50.000, 1.500.000
  // Debe tener al menos un punto seguido de exactamente 3 dígitos
  const dotThousandsMatch = text.match(/\b(\d{1,3}(?:\.\d{3})+)\b/)
  if (dotThousandsMatch) {
    // Quitar todos los puntos y parsear como entero
    const cleaned = dotThousandsMatch[1].replace(/\./g, '')
    const amount = parseInt(cleaned, 10)
    if (!isNaN(amount) && amount > 0) return amount
  }

  // Números simples sin formato: 50000, 5000, 500
  const plainNumMatch = text.match(/\b(\d+)\b/)
  if (plainNumMatch) {
    const amount = parseInt(plainNumMatch[1], 10)
    if (!isNaN(amount) && amount > 0) return amount
  }

  return null
}

// Detectar merchant en el texto
function extractMerchant(text) {
  const lowerText = text.toLowerCase()

  for (const merchant of MONEY_MERCHANTS) {
    if (lowerText.includes(merchant)) {
      return MERCHANT_NORMALIZATION[merchant] || merchant
    }
  }

  return null
}

// Detectar si es suscripción
function isSubscription(text) {
  const lowerText = text.toLowerCase()
  return SUBSCRIPTIONS.some(sub => lowerText.includes(sub))
}

// Detectar verbo de dinero
function hasMoneyVerb(text) {
  const lowerText = text.toLowerCase()
  return MONEY_VERBS.some(verb => lowerText.includes(verb))
}

// Detectar ajuste de billetera (ej: "tengo 5000 en mp", "hay 3000 en efectivo")
function isBalanceAdjustment(text) {
  const lowerText = text.toLowerCase()
  return /\b(tengo|hay|saldo)\b/.test(lowerText) && /\b(en|de)\b/.test(lowerText)
}

// Detectar keywords de mental
function hasMentalKeywords(text) {
  const lowerText = text.toLowerCase()
  return MENTAL_KEYWORDS.some(kw => lowerText.includes(kw))
}

// Detectar keywords de físico
function hasPhysicalKeywords(text) {
  const lowerText = text.toLowerCase()
  return PHYSICAL_KEYWORDS.some(kw => lowerText.includes(kw))
}

export function heuristicRouter(text) {
  const trimmedText = text.trim()
  const amount = extractAmount(trimmedText)
  const merchant = extractMerchant(trimmedText)
  const isSub = isSubscription(trimmedText)
  const hasVerb = hasMoneyVerb(trimmedText)
  const isAdjustment = isBalanceAdjustment(trimmedText)

  // Balance adjustment detection (priority over expense)
  if (amount !== null && isAdjustment) {
    return {
      brain: 'money',
      intent: 'adjust_balance',
      confidence: 0.90,
      money: {
        amount,
        currency: 'ARS',
        merchant: merchant || undefined,
        description: trimmedText
      }
    }
  }

  // Money detection
  if (amount !== null) {
    // Tiene monto
    if (hasVerb) {
      // Con verbo => alta confianza
      const intent = isSub ? 'add_subscription' : 'add_expense'
      return {
        brain: 'money',
        intent,
        confidence: 0.85,
        money: {
          amount,
          currency: 'ARS',
          merchant: merchant || undefined,
          description: trimmedText,
          is_subscription: isSub
        }
      }
    } else if (merchant || isSub) {
      // Solo merchant sin verbo (ej: "uber 500") => confianza media
      const intent = isSub ? 'add_subscription' : 'add_expense'
      return {
        brain: 'money',
        intent,
        confidence: 0.55, // Trigger confirmación
        money: {
          amount,
          currency: 'ARS',
          merchant: merchant || undefined,
          description: trimmedText,
          is_subscription: isSub
        }
      }
    } else {
      // Solo monto sin contexto => baja confianza
      return {
        brain: 'money',
        intent: 'add_expense',
        confidence: 0.35,
        money: {
          amount,
          currency: 'ARS',
          description: trimmedText
        }
      }
    }
  }

  // Mental detection
  if (hasMentalKeywords(trimmedText)) {
    return {
      brain: 'mental',
      intent: 'log_entry',
      confidence: 0.80,
      entry: {
        text: trimmedText,
        domain: 'mental',
        meta: {}
      }
    }
  }

  // Physical detection
  if (hasPhysicalKeywords(trimmedText)) {
    return {
      brain: 'physical',
      intent: 'log_entry',
      confidence: 0.80,
      entry: {
        text: trimmedText,
        domain: 'physical',
        meta: {}
      }
    }
  }

  // Default: general note
  return {
    brain: 'general',
    intent: 'log_entry',
    confidence: 0.60,
    entry: {
      text: trimmedText,
      domain: 'general',
      meta: {}
    }
  }
}
