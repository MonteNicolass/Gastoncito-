// lib/seed-categories.js
// Seed de categorías predefinidas en IndexedDB

import { getCategorias, addCategoria } from './storage'

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

export async function seedPredefinedCategories() {
  const existing = await getCategorias()

  if (existing.length > 0) {
    // Ya hay categorías, no hacer nada
    return
  }

  // Mapear BASE_CATEGORIES a formato nuevo
  const categoriesToSeed = [
    { nombre: 'comida', keywords: BASE_CATEGORIES.comida, prioridad: 10, color: '#78716c' },
    { nombre: 'transporte', keywords: BASE_CATEGORIES.transporte, prioridad: 10, color: '#57534e' },
    { nombre: 'ocio', keywords: BASE_CATEGORIES.ocio, prioridad: 10, color: '#44403c' },
    { nombre: 'suscripciones', keywords: BASE_CATEGORIES.suscripciones, prioridad: 15, color: '#292524' },
    { nombre: 'compras', keywords: BASE_CATEGORIES.compras, prioridad: 10, color: '#1c1917' },
    { nombre: 'servicios', keywords: BASE_CATEGORIES.servicios, prioridad: 10, color: '#a8a29e' },
    { nombre: 'salud', keywords: BASE_CATEGORIES.salud, prioridad: 10, color: '#d6d3d1' },
    { nombre: 'educacion', keywords: BASE_CATEGORIES.educacion, prioridad: 10, color: '#e7e5e4' },
    { nombre: 'alquiler', keywords: BASE_CATEGORIES.alquiler, prioridad: 20, color: '#0c0a09' },
  ]

  for (const cat of categoriesToSeed) {
    await addCategoria(cat.nombre, cat.keywords, cat.prioridad, cat.color, true)
  }

  console.log('✅ Categorías predefinidas cargadas')
}
