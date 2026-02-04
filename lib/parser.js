const WALLETS = [
  'efectivo',
  'mercado pago',
  'brubank',
  'ualá',
  'naranja x',
  'lemon cash',
  'prex',
  'binance',
  'astropay',
  'dolarapp',
  'cuenta dni',
  'tarjeta',
]

const ALIASES = {
  mp: 'mercado pago',
  mercado: 'mercado pago',
  mercadopago: 'mercado pago',
  naranja: 'naranja x',
  uala: 'ualá',
  dni: 'cuenta dni',
  lemon: 'lemon cash',
  bb: 'brubank',
  bru: 'brubank',
  'uala card': 'ualá',
  galicia: 'galicia',
}

const normalize = (text) => {
  if (!text) return null
  return text.toLowerCase().trim()
}

const resolveWallet = (txt) => {
  if (!txt) return null
  const t = normalize(txt)
  if (!t) return null
  if (/^\d+k?$/.test(t)) return null
  if (ALIASES[t]) return ALIASES[t]
  if (WALLETS.includes(t)) return t
  return null
}

const extractAmount = (txt) => {
  const kMatch = txt.match(/(\d+(?:\.\d+)?)\s*k/i)
  if (kMatch) {
    return parseFloat(kMatch[1]) * 1000
  }
  
  const dotMatch = txt.match(/(\d{1,3}(?:\.\d{3})+)/)
  if (dotMatch) {
    return parseFloat(dotMatch[1].replace(/\./g, ''))
  }
  
  const numMatch = txt.match(/(\d+(?:\.\d+)?)/)
  if (numMatch) {
    return parseFloat(numMatch[1])
  }
  
  return null
}

const extractWallet = (txt) => {
  const lower = txt.toLowerCase()
  const words = lower.split(/\s+/)

  for (const word of words) {
    const resolved = resolveWallet(word)
    if (resolved) return resolved
  }

  for (const wallet of WALLETS) {
    if (lower.includes(wallet)) return wallet
  }

  for (const [alias, walletName] of Object.entries(ALIASES)) {
    if (lower.includes(alias)) return walletName
  }

  return null
}

const extractCategoria = (txt) => {
  const lower = txt.toLowerCase()

  const patterns = [
    /(?:gast[eéó]|pagu[eéó]|compr[eéó]|cobr[eéó]|recib[ií]|ingreso)\s+(?:\d+k?\s+)?([a-záéíóúñ]+)/,
    /en\s+([a-záéíóúñ\s]+?)(?:\s+con\s+|\s+de\s+|\s+desde\s+|\s+mp\s+|\s+uala|\s+brubank|\s*$)/,
    /para\s+([a-záéíóúñ\s]+?)(?:\s+con\s+|\s+de\s+|\s+desde\s+|\s+mp\s+|\s+uala|\s+brubank|\s*$)/,
    /de\s+([a-záéíóúñ\s]+?)(?:\s+con\s+|\s+en\s+|\s+desde\s+|\s+mp\s+|\s+uala|\s+brubank|\s*$)/,
    /(\d+k?\s+)([a-záéíóúñ]+)/,
  ]

  for (const pattern of patterns) {
    const match = lower.match(pattern)
    if (match) {
      let categoria = match[match.length - 1].trim()
      
      for (const wallet of WALLETS) {
        categoria = categoria.replace(wallet, '').trim()
      }
      for (const alias in ALIASES) {
        categoria = categoria.replace(new RegExp(`\\b${alias}\\b`, 'g'), '').trim()
      }
      categoria = categoria.replace(/\d+k?/g, '').trim()
      
      const stopWords = ['gasté', 'gaste', 'gastó', 'pagué', 'pague', 'pagó', 'compré', 'compre', 'compró', 'en', 'para', 'de', 'con', 'desde', 'por', 'a', 'el', 'la', 'los', 'las', 'un', 'una']
      for (const word of stopWords) {
        categoria = categoria.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim()
      }
      
      if (categoria.length > 1) {
        return categoria
      }
    }
  }

  return null
}

const detectType = (txt) => {
  const lower = txt.toLowerCase()

  if (/cobr[eéó]|recib[iíó]|ingreso/.test(lower)) {
    return 'ingreso'
  }

  if (/pas[eéó]|mov[iíó]/.test(lower)) {
    return 'movimiento'
  }

  return 'gasto'
}

const extractFromTo = (txt) => {
  const lower = txt.toLowerCase()
  const matches = [...lower.matchAll(/(de|a)\s+([a-záéíóúñ\s]+?)(?=\s+(?:de|a)\s+|$)/g)]

  if (matches.length < 2) return { from: null, to: null }

  let from = null
  let to = null

  for (const match of matches) {
    const preposition = match[1]
    const candidate = match[2].trim()

    if (preposition === 'de' && !from) {
      from = resolveWallet(candidate)
    } else if (preposition === 'a' && !to) {
      to = resolveWallet(candidate)
    }
  }

  return { from, to }
}

export function parseInput(input) {
  try {
    const text = normalize(input)
    if (!text) {
      return {
        complete: false,
        tipo: null,
        monto: null,
        categoria: null,
        metodo: null,
        missingFields: ['todo'],
      }
    }

    if (text === 'saldo') {
      return {
        complete: true,
        command: 'saldo',
      }
    }

    if (text === 'ahorro') {
      return {
        complete: true,
        command: 'ahorro',
      }
    }

    const tipo = detectType(text)
    const monto = extractAmount(text)

    if (tipo === 'movimiento') {
      const { from, to } = extractFromTo(text)
      const missingFields = []

      if (!monto || monto <= 0) missingFields.push('monto')
      if (!from) missingFields.push('origen')
      if (!to) missingFields.push('destino')

      return {
        complete: missingFields.length === 0,
        tipo: 'movimiento',
        monto,
        origen: from,
        destino: to,
        missingFields,
      }
    }

    const metodo = extractWallet(text)
    const categoria = extractCategoria(text)
    const missingFields = []

    if (!monto || monto <= 0) missingFields.push('monto')
    if (!metodo) missingFields.push('metodo')
    if (!categoria || categoria.trim().length === 0) missingFields.push('categoria')

    return {
      complete: missingFields.length === 0,
      tipo,
      monto,
      categoria,
      metodo,
      missingFields,
    }
  } catch (error) {
    console.error('Parser error:', error)
    return {
      complete: false,
      tipo: null,
      monto: null,
      categoria: null,
      metodo: null,
      missingFields: ['error'],
    }
  }
}