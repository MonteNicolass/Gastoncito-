/**
 * Human Categories - Semantic layer for expense categorization
 *
 * Goals:
 * - Simple, clear category names
 * - Internal semantic grouping (user doesn't see)
 * - Pattern detection per category
 */

/**
 * Human-readable category definitions
 * Internal semantic structure for smart grouping
 */
export const CATEGORY_DEFINITIONS = {
  comida: {
    name: 'Comida',
    icon: 'ShoppingCart',
    color: 'emerald',
    subcategories: {
      supermercado: {
        name: 'Supermercado',
        keywords: ['super', 'mercado', 'coto', 'carrefour', 'dia', 'jumbo', 'disco', 'vea', 'chino', 'almacen', 'changomas', 'maxiconsumo'],
        pattern: 'weekly'
      },
      delivery: {
        name: 'Delivery',
        keywords: ['rappi', 'pedidos ya', 'uber eats', 'delivery', 'domicilio'],
        pattern: 'impulse'
      },
      restaurant: {
        name: 'Restaurant',
        keywords: ['restaurant', 'resto', 'bar', 'cafe', 'cafeteria', 'parrilla', 'pizzeria'],
        pattern: 'occasional'
      },
      kiosco: {
        name: 'Kiosco',
        keywords: ['kiosco', 'golosinas', 'snack'],
        pattern: 'impulse'
      }
    }
  },
  transporte: {
    name: 'Transporte',
    icon: 'Car',
    color: 'blue',
    subcategories: {
      nafta: {
        name: 'Nafta',
        keywords: ['nafta', 'combustible', 'ypf', 'shell', 'axion', 'puma'],
        pattern: 'periodic'
      },
      uber: {
        name: 'Uber/Taxi',
        keywords: ['uber', 'cabify', 'taxi', 'remis', 'didi'],
        pattern: 'occasional'
      },
      transporte_publico: {
        name: 'Transporte público',
        keywords: ['sube', 'colectivo', 'subte', 'tren'],
        pattern: 'daily'
      },
      estacionamiento: {
        name: 'Estacionamiento',
        keywords: ['parking', 'estacionamiento', 'cochera'],
        pattern: 'occasional'
      }
    }
  },
  servicios: {
    name: 'Servicios',
    icon: 'Zap',
    color: 'amber',
    subcategories: {
      luz: {
        name: 'Luz',
        keywords: ['edenor', 'edesur', 'luz', 'electricidad'],
        pattern: 'monthly'
      },
      gas: {
        name: 'Gas',
        keywords: ['metrogas', 'gas natural', 'garrafa'],
        pattern: 'bimonthly'
      },
      agua: {
        name: 'Agua',
        keywords: ['aysa', 'agua'],
        pattern: 'bimonthly'
      },
      internet: {
        name: 'Internet/TV',
        keywords: ['fibertel', 'telecentro', 'movistar', 'personal', 'claro', 'internet', 'wifi'],
        pattern: 'monthly'
      },
      celular: {
        name: 'Celular',
        keywords: ['celular', 'telefono', 'linea'],
        pattern: 'monthly'
      }
    }
  },
  ocio: {
    name: 'Ocio',
    icon: 'Gamepad2',
    color: 'purple',
    subcategories: {
      streaming: {
        name: 'Streaming',
        keywords: ['netflix', 'spotify', 'disney', 'hbo', 'amazon prime', 'youtube premium', 'star+'],
        pattern: 'monthly'
      },
      salidas: {
        name: 'Salidas',
        keywords: ['cine', 'teatro', 'recital', 'boliche', 'fiesta'],
        pattern: 'occasional'
      },
      juegos: {
        name: 'Juegos',
        keywords: ['steam', 'playstation', 'xbox', 'nintendo', 'juego'],
        pattern: 'occasional'
      },
      hobbies: {
        name: 'Hobbies',
        keywords: ['libro', 'revista', 'hobby'],
        pattern: 'occasional'
      }
    }
  },
  salud: {
    name: 'Salud',
    icon: 'Heart',
    color: 'red',
    subcategories: {
      farmacia: {
        name: 'Farmacia',
        keywords: ['farmacia', 'medicamento', 'remedio'],
        pattern: 'periodic'
      },
      prepaga: {
        name: 'Prepaga',
        keywords: ['osde', 'swiss medical', 'galeno', 'medicus', 'prepaga', 'obra social'],
        pattern: 'monthly'
      },
      consulta: {
        name: 'Consulta médica',
        keywords: ['medico', 'doctor', 'consulta', 'turno'],
        pattern: 'occasional'
      },
      gym: {
        name: 'Gimnasio',
        keywords: ['gym', 'gimnasio', 'megatlon', 'sportclub'],
        pattern: 'monthly'
      }
    }
  },
  hogar: {
    name: 'Hogar',
    icon: 'Home',
    color: 'orange',
    subcategories: {
      alquiler: {
        name: 'Alquiler',
        keywords: ['alquiler', 'renta'],
        pattern: 'monthly'
      },
      expensas: {
        name: 'Expensas',
        keywords: ['expensa', 'consorcio', 'administracion'],
        pattern: 'monthly'
      },
      limpieza: {
        name: 'Limpieza',
        keywords: ['limpieza', 'lavandina', 'detergente', 'jabon'],
        pattern: 'periodic'
      },
      muebles: {
        name: 'Muebles/Deco',
        keywords: ['mueble', 'decoracion', 'ikea'],
        pattern: 'occasional'
      }
    }
  },
  ropa: {
    name: 'Ropa',
    icon: 'Shirt',
    color: 'pink',
    subcategories: {
      indumentaria: {
        name: 'Ropa',
        keywords: ['ropa', 'remera', 'pantalon', 'zapatos', 'zapatillas', 'zara', 'h&m'],
        pattern: 'occasional'
      },
      accesorios: {
        name: 'Accesorios',
        keywords: ['cartera', 'billetera', 'reloj', 'anteojos'],
        pattern: 'occasional'
      }
    }
  },
  tech: {
    name: 'Tecnología',
    icon: 'Smartphone',
    color: 'indigo',
    subcategories: {
      suscripciones: {
        name: 'Suscripciones',
        keywords: ['chatgpt', 'claude', 'icloud', 'google one', 'dropbox'],
        pattern: 'monthly'
      },
      hardware: {
        name: 'Hardware',
        keywords: ['celular', 'notebook', 'computadora', 'auriculares', 'cargador'],
        pattern: 'occasional'
      },
      apps: {
        name: 'Apps',
        keywords: ['app store', 'google play', 'aplicacion'],
        pattern: 'occasional'
      }
    }
  },
  educacion: {
    name: 'Educación',
    icon: 'GraduationCap',
    color: 'cyan',
    subcategories: {
      cursos: {
        name: 'Cursos',
        keywords: ['curso', 'platzi', 'udemy', 'coursera', 'domestika'],
        pattern: 'occasional'
      },
      universidad: {
        name: 'Universidad',
        keywords: ['universidad', 'facultad', 'cuota', 'matricula'],
        pattern: 'monthly'
      },
      materiales: {
        name: 'Materiales',
        keywords: ['libreria', 'apunte', 'libro'],
        pattern: 'occasional'
      }
    }
  },
  otros: {
    name: 'Otros',
    icon: 'MoreHorizontal',
    color: 'zinc',
    subcategories: {
      general: {
        name: 'General',
        keywords: [],
        pattern: 'occasional'
      }
    }
  }
}

/**
 * Get all human categories (flat list)
 */
export function getHumanCategories() {
  return Object.entries(CATEGORY_DEFINITIONS).map(([id, cat]) => ({
    id,
    name: cat.name,
    icon: cat.icon,
    color: cat.color
  }))
}

/**
 * Get category with full semantic info
 */
export function getCategoryWithSemantics(categoryId) {
  const cat = CATEGORY_DEFINITIONS[categoryId]
  if (!cat) return null

  return {
    id: categoryId,
    name: cat.name,
    icon: cat.icon,
    color: cat.color,
    subcategories: Object.entries(cat.subcategories).map(([subId, sub]) => ({
      id: subId,
      name: sub.name,
      pattern: sub.pattern
    }))
  }
}

/**
 * Detect subcategory from text
 */
export function detectSubcategory(text, categoryId) {
  if (!text || !categoryId) return null

  const cat = CATEGORY_DEFINITIONS[categoryId]
  if (!cat) return null

  const textLower = text.toLowerCase()

  for (const [subId, sub] of Object.entries(cat.subcategories)) {
    for (const keyword of sub.keywords) {
      if (textLower.includes(keyword)) {
        return {
          id: subId,
          name: sub.name,
          pattern: sub.pattern
        }
      }
    }
  }

  return null
}

/**
 * Get expected pattern for a category/subcategory
 */
export function getExpectedPattern(categoryId, subcategoryId = null) {
  const cat = CATEGORY_DEFINITIONS[categoryId]
  if (!cat) return 'occasional'

  if (subcategoryId && cat.subcategories[subcategoryId]) {
    return cat.subcategories[subcategoryId].pattern
  }

  // Return most common pattern in category
  const patterns = Object.values(cat.subcategories).map(s => s.pattern)
  const counts = {}
  patterns.forEach(p => { counts[p] = (counts[p] || 0) + 1 })

  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'occasional'
}

/**
 * Match text to category using semantic layer
 * @param {string} text - Description text
 * @returns {Object} - { categoryId, subcategoryId, confidence }
 */
export function matchToCategory(text) {
  if (!text) return { categoryId: 'otros', subcategoryId: 'general', confidence: 'low' }

  const textLower = text.toLowerCase()

  for (const [catId, cat] of Object.entries(CATEGORY_DEFINITIONS)) {
    for (const [subId, sub] of Object.entries(cat.subcategories)) {
      for (const keyword of sub.keywords) {
        if (textLower.includes(keyword)) {
          return {
            categoryId: catId,
            subcategoryId: subId,
            pattern: sub.pattern,
            confidence: keyword.length >= 5 ? 'high' : 'medium'
          }
        }
      }
    }
  }

  return { categoryId: 'otros', subcategoryId: 'general', confidence: 'low' }
}

/**
 * Get color classes for category
 */
export function getCategoryColors(categoryId) {
  const cat = CATEGORY_DEFINITIONS[categoryId]
  if (!cat) return { bg: 'bg-zinc-100', text: 'text-zinc-700', border: 'border-zinc-200' }

  const colorMap = {
    emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
    orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
    pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
    indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
    zinc: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300', border: 'border-zinc-200 dark:border-zinc-700' }
  }

  return colorMap[cat.color] || colorMap.zinc
}

/**
 * Enrich gasto with semantic info
 */
export function enrichWithSemantics(gasto) {
  const match = matchToCategory(gasto.motivo)

  return {
    ...gasto,
    semantic: {
      categoryId: match.categoryId,
      subcategoryId: match.subcategoryId,
      expectedPattern: match.pattern,
      confidence: match.confidence
    }
  }
}
