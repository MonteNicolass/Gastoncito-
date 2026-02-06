// Financial Decisions Store (localStorage)
// Persists cuotas vs contado analyses, cart optimizations, and price comparisons

const DECISIONS_KEY = 'gaston_financial_decisions'

export type DecisionType = 'cuotas_vs_contado' | 'carrito_optimizado' | 'comparacion_producto'

export interface CuotasDecision {
  tipo: 'cuotas_vs_contado'
  inputs: {
    cuota: number
    numCuotas: number
    inflacion: number
    contado: number | null
  }
  resultado: {
    presentValue: number
    totalNominal: number
    monthlyRate: number
    label: 'cuotas_mejor' | 'contado_mejor' | 'similar' | null
    differenceVsCash: number | null
    differencePercent: number | null
  }
  fecha: string
}

export interface CarritoDecision {
  tipo: 'carrito_optimizado'
  items: { productName: string; quantity: number }[]
  total_single_store: number
  total_optimized: number
  ahorro: number
  ahorro_percent: number
  strategy: 'single_store' | 'multi_store'
  store_name: string | null
  fecha: string
}

export interface ComparacionDecision {
  tipo: 'comparacion_producto'
  producto: string
  tienda_barata: string
  precio_barato: number
  tiendas_comparadas: number
  ahorro_vs_caro: number
  fecha: string
}

export type FinancialDecision = (CuotasDecision | CarritoDecision | ComparacionDecision) & { id: string }

function readDecisions(): FinancialDecision[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(DECISIONS_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveDecisions(decisions: FinancialDecision[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(DECISIONS_KEY, JSON.stringify(decisions))
}

export function getDecisions(): FinancialDecision[] {
  return readDecisions().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
}

export function getDecisionsByType(tipo: DecisionType): FinancialDecision[] {
  return getDecisions().filter(d => d.tipo === tipo)
}

export function getLatestDecision(): FinancialDecision | null {
  const all = getDecisions()
  return all.length > 0 ? all[0] : null
}

export function getRecentDecisions(limit: number = 3): FinancialDecision[] {
  return getDecisions().slice(0, limit)
}

export function saveDecision(decision: Omit<FinancialDecision, 'id'>): FinancialDecision {
  const decisions = readDecisions()
  const saved: FinancialDecision = {
    ...decision,
    id: `dec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  } as FinancialDecision

  decisions.push(saved)

  // Keep max 50 decisions
  if (decisions.length > 50) {
    decisions.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    decisions.length = 50
  }

  saveDecisions(decisions)
  return saved
}

export function deleteDecision(id: string): void {
  const decisions = readDecisions().filter(d => d.id !== id)
  saveDecisions(decisions)
}

export function getDecisionSummary(decision: FinancialDecision): { title: string; subtitle: string; amount: string } {
  const fmt = (n: number) => new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 0,
  }).format(n)

  switch (decision.tipo) {
    case 'cuotas_vs_contado': {
      const label = decision.resultado.label === 'cuotas_mejor'
        ? 'Cuotas más baratas'
        : decision.resultado.label === 'contado_mejor'
        ? 'Contado más barato'
        : 'Similar'
      return {
        title: 'Cuotas vs Contado',
        subtitle: label,
        amount: fmt(decision.resultado.presentValue),
      }
    }
    case 'carrito_optimizado':
      return {
        title: 'Carrito optimizado',
        subtitle: `Ahorraste ${fmt(decision.ahorro)}`,
        amount: fmt(decision.total_optimized),
      }
    case 'comparacion_producto':
      return {
        title: decision.producto,
        subtitle: `Más barato en ${decision.tienda_barata}`,
        amount: fmt(decision.precio_barato),
      }
  }
}
