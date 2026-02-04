// lib/anti-prompter.js
// Filtro anti-prompter: rechaza inputs técnicos o no-personales antes de llegar a IA

const BANNED_KEYWORDS = [
  'prompt',
  'programar',
  'programación',
  'programacion',
  'código',
  'codigo',
  'nextjs',
  'react',
  'javascript',
  'typescript',
  'app',
  'aplicación',
  'aplicacion',
  'explicame',
  'explícame',
  'haceme',
  'escribime',
  'generame',
  'genera me',
  'creame',
  'crea me',
  'desarrolla',
  'implementa',
  'programa',
  'función',
  'funcion',
  'componente',
  'clase'
]

const REJECTION_MESSAGE =
  "Esto no parece algo de tu vida personal. Acá podés registrar gastos, emociones, hábitos o notas."

export function isOutOfScope(text) {
  if (!text || typeof text !== 'string') return false

  const normalized = text.toLowerCase().trim()

  return BANNED_KEYWORDS.some(keyword => normalized.includes(keyword))
}

export function getRejectionMessage() {
  return REJECTION_MESSAGE
}
