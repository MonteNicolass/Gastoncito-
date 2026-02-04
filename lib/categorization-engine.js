// lib/categorization-engine.js
// Motor de normalización y matching de categorías

const NORMALIZATION_MAP = {
  'mercado pago': ['mercado', 'mp', 'mercadopago'],
  'lemon cash': ['lemon'],
  'brubank': ['bb', 'bru'],
  'naranja x': ['naranja'],
  'ualá': ['uala'],
  'cuenta dni': ['dni'],
}

export function normalizeText(text) {
  if (!text) return ''

  let normalized = text.toLowerCase().trim()

  // Aplicar mapeos de normalización
  for (const [target, aliases] of Object.entries(NORMALIZATION_MAP)) {
    for (const alias of aliases) {
      const regex = new RegExp(`\\b${alias}\\b`, 'gi')
      normalized = normalized.replace(regex, target)
    }
  }

  return normalized
}

export function matchCategory(description, reglas, categorias) {
  if (!description) return null

  const normalized = normalizeText(description)

  // 1. Primero: reglas personalizadas (ordenadas por prioridad descendente)
  const enabledRules = reglas
    .filter(r => r.enabled)
    .sort((a, b) => b.priority - a.priority)

  for (const rule of enabledRules) {
    let matches = false

    switch (rule.match_type) {
      case 'includes':
        matches = normalized.includes(rule.pattern.toLowerCase())
        break
      case 'startsWith':
        matches = normalized.startsWith(rule.pattern.toLowerCase())
        break
      case 'regex':
        try {
          matches = new RegExp(rule.pattern, 'i').test(normalized)
        } catch (e) {
          console.error('Regex inválida:', rule.pattern)
        }
        break
    }

    if (matches) {
      return rule.category_id
    }
  }

  // 2. Si no hay match con reglas: categorías por keywords (ordenadas por prioridad)
  const sortedCategories = categorias.sort((a, b) => b.prioridad - a.prioridad)

  for (const categoria of sortedCategories) {
    for (const keyword of categoria.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        return categoria.id
      }
    }
  }

  // 3. Sin match: retornar null
  return null
}

export function getCategoryName(categoryId, categorias) {
  const cat = categorias.find(c => c.id === categoryId)
  return cat ? cat.nombre : null
}
