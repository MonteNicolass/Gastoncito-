export interface Quote {
  id: string
  name: string
  buy: number | null
  sell: number | null
  source: 'dolarapi' | 'bluelytics' | 'cache'
  updatedAtISO: string
}

interface DolarApiItem {
  casa: string
  compra: number
  venta: number
  fechaActualizacion?: string
}

interface BluelyticsResponse {
  oficial: { value_avg: number; value_buy: number; value_sell: number }
  blue: { value_avg: number; value_buy: number; value_sell: number }
  oficial_euro: { value_avg: number; value_buy: number; value_sell: number }
  blue_euro: { value_avg: number; value_buy: number; value_sell: number }
  last_update: string
}

const DOLARAPI_URL = 'https://dolarapi.com/v1/dolares'
const BLUELYTICS_URL = 'https://api.bluelytics.com.ar/v2/latest'

const CASA_MAP: Record<string, { id: string; name: string }> = {
  blue: { id: 'blue', name: 'Dólar Blue' },
  oficial: { id: 'oficial', name: 'Dólar Oficial' },
  tarjeta: { id: 'tarjeta', name: 'Dólar Tarjeta' },
  bolsa: { id: 'mep', name: 'Dólar MEP' },
  mep: { id: 'mep', name: 'Dólar MEP' },
  contadoconliqui: { id: 'ccl', name: 'Dólar CCL' },
  ccl: { id: 'ccl', name: 'Dólar CCL' },
  cripto: { id: 'cripto', name: 'Dólar Cripto' },
}

export async function fetchFromDolarApi(): Promise<Quote[]> {
  const response = await fetch(DOLARAPI_URL, {
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`DolarAPI ${response.status}`)

  const data: DolarApiItem[] = await response.json()
  const now = new Date().toISOString()
  const quotes: Quote[] = []
  const seen = new Set<string>()

  for (const item of data) {
    const casa = item.casa?.toLowerCase()
    const mapping = CASA_MAP[casa]
    if (!mapping || seen.has(mapping.id)) continue
    seen.add(mapping.id)

    quotes.push({
      id: mapping.id,
      name: mapping.name,
      buy: item.compra ?? null,
      sell: item.venta ?? null,
      source: 'dolarapi',
      updatedAtISO: item.fechaActualizacion || now,
    })
  }

  return quotes
}

export async function fetchFromBluelytics(): Promise<Quote[]> {
  const response = await fetch(BLUELYTICS_URL, {
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`Bluelytics ${response.status}`)

  const data: BluelyticsResponse = await response.json()
  const updatedAt = data.last_update || new Date().toISOString()

  const quotes: Quote[] = []

  if (data.oficial) {
    quotes.push({
      id: 'oficial',
      name: 'Dólar Oficial',
      buy: data.oficial.value_buy,
      sell: data.oficial.value_sell,
      source: 'bluelytics',
      updatedAtISO: updatedAt,
    })
  }

  if (data.blue) {
    quotes.push({
      id: 'blue',
      name: 'Dólar Blue',
      buy: data.blue.value_buy,
      sell: data.blue.value_sell,
      source: 'bluelytics',
      updatedAtISO: updatedAt,
    })
  }

  return quotes
}

export async function fetchQuotes(): Promise<Quote[]> {
  // Try DolarAPI first (more types)
  try {
    const quotes = await fetchFromDolarApi()
    if (quotes.length > 0) return quotes
  } catch {
    // fallback
  }

  // Fallback to Bluelytics
  try {
    const quotes = await fetchFromBluelytics()
    if (quotes.length > 0) return quotes
  } catch {
    // both failed
  }

  return []
}
