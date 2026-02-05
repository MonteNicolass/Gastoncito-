/**
 * Chat Autocomplete V1
 * Matching por keywords para categorización rápida.
 *
 * Sin NLP. Sin IA. Editable por el usuario.
 */

// ── Types ────────────────────────────────────────────────────

export type SuggestionDomain = 'money' | 'mental' | 'physical' | 'note'

export interface AutocompleteSuggestion {
  label: string
  prefix: string
  domain: SuggestionDomain
}

interface KeywordRule {
  keywords: string[]
  suggestion: AutocompleteSuggestion
}

// ── Keyword Rules ────────────────────────────────────────────

const RULES: KeywordRule[] = [
  // Money — transporte
  {
    keywords: ['uber', 'taxi', 'cabify', 'didi', 'sube', 'bondi', 'tren', 'subte', 'peaje'],
    suggestion: { label: 'Transporte', prefix: 'Gast\u00e9 ', domain: 'money' },
  },
  // Money — comida
  {
    keywords: ['pizza', 'hamburguesa', 'sushi', 'empanada', 'almuerzo', 'cena', 'desayuno', 'merienda', 'café', 'cafe', 'rappi', 'pedidosya', 'mcdonalds', 'burger'],
    suggestion: { label: 'Comida', prefix: 'Gast\u00e9 ', domain: 'money' },
  },
  // Money — supermercado
  {
    keywords: ['super', 'mercado', 'carrefour', 'coto', 'dia', 'jumbo', 'changui', 'chango', 'compras'],
    suggestion: { label: 'Supermercado', prefix: 'Gast\u00e9 ', domain: 'money' },
  },
  // Money — servicios
  {
    keywords: ['luz', 'gas', 'internet', 'wifi', 'celular', 'abono', 'alquiler', 'expensas', 'seguro'],
    suggestion: { label: 'Servicios', prefix: 'Gast\u00e9 ', domain: 'money' },
  },
  // Money — suscripciones
  {
    keywords: ['netflix', 'spotify', 'youtube', 'chatgpt', 'hbo', 'disney', 'amazon', 'steam', 'xbox', 'playstation'],
    suggestion: { label: 'Suscripci\u00f3n', prefix: 'Gast\u00e9 ', domain: 'money' },
  },
  // Money — salud
  {
    keywords: ['farmacia', 'm\u00e9dico', 'medico', 'dentista', 'psic\u00f3logo', 'psicologo', 'turno', 'consulta', 'receta', 'remedio'],
    suggestion: { label: 'Salud', prefix: 'Gast\u00e9 ', domain: 'money' },
  },
  // Physical — ejercicio
  {
    keywords: ['gym', 'gimnasio', 'corr\u00ed', 'corri', 'camin\u00e9', 'camine', 'pesas', 'yoga', 'pilates', 'nataci\u00f3n', 'bici', 'bicicleta', 'cardio', 'entrené', 'entrene', 'futbol', 'f\u00fatbol', 'tenis', 'paddle'],
    suggestion: { label: 'Actividad f\u00edsica', prefix: 'Hice ', domain: 'physical' },
  },
  // Mental — estado
  {
    keywords: ['ansioso', 'ansiedad', 'triste', 'bien', 'mal', 'cansado', 'estresado', 'estr\u00e9s', 'feliz', 'motivado', 'desmotivado', 'tranquilo', 'angustia', 'enojado'],
    suggestion: { label: 'Estado mental', prefix: 'Me siento ', domain: 'mental' },
  },
  // Note
  {
    keywords: ['idea', 'recordar', 'acordarme', 'pensar', 'nota', 'anotar', 'pendiente', 'todo'],
    suggestion: { label: 'Nota', prefix: 'Nota: ', domain: 'note' },
  },
]

// ── Main ─────────────────────────────────────────────────────

/**
 * Returns matching suggestions for the current input.
 * Max 2 suggestions. Returns empty if input is too short.
 */
export function getAutocompleteSuggestions(input: string): AutocompleteSuggestion[] {
  const trimmed = input.trim().toLowerCase()

  if (trimmed.length < 2) return []

  const words = trimmed.split(/\s+/)
  const seen = new Set<string>()
  const results: AutocompleteSuggestion[] = []

  for (const rule of RULES) {
    for (const keyword of rule.keywords) {
      const matched = words.some(word =>
        keyword.startsWith(word) || word.startsWith(keyword)
      )

      if (matched && !seen.has(rule.suggestion.label)) {
        seen.add(rule.suggestion.label)
        results.push(rule.suggestion)
        break
      }
    }

    if (results.length >= 2) break
  }

  return results
}

/**
 * Returns all available category labels for a domain.
 */
export function getCategoriesForDomain(domain: SuggestionDomain): string[] {
  return RULES
    .filter(r => r.suggestion.domain === domain)
    .map(r => r.suggestion.label)
}
