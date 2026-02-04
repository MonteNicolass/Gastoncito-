const BASE_CATEGORIES = {
  comida: ['supermercado', 'verdulería', 'carnicería', 'panadería', 'almacén', 'delivery', 'restaurant', 'café', 'comida', 'desayuno', 'almuerzo', 'cena', 'merienda'],
  transporte: ['uber', 'cabify', 'colectivo', 'subte', 'tren', 'taxi', 'nafta', 'combustible', 'estacionamiento', 'peaje', 'transporte'],
  ocio: ['cine', 'teatro', 'bar', 'boliche', 'entretenimiento', 'juego', 'salida', 'streaming', 'spotify', 'netflix'],
  suscripciones: ['netflix', 'spotify', 'amazon', 'disney', 'hbo', 'suscripción', 'membresía', 'premium'],
  compras: ['ropa', 'zapatillas', 'zapatos', 'remera', 'pantalón', 'campera', 'tienda', 'shopping'],
  servicios: ['internet', 'celular', 'teléfono', 'luz', 'gas', 'agua', 'expensas', 'servicio'],
  salud: ['farmacia', 'médico', 'doctor', 'dentista', 'kinesiología', 'terapia', 'medicamento', 'análisis'],
  educacion: ['curso', 'libro', 'universidad', 'facultad', 'colegio', 'educación', 'capacitación'],
  alquiler: ['alquiler', 'renta', 'departamento', 'casa'],
}

export function categorize(text) {
  if (!text) return null
  
  const normalized = text.toLowerCase().trim()
  
  for (const [category, keywords] of Object.entries(BASE_CATEGORIES)) {
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        return category
      }
    }
  }
  
  return null
}