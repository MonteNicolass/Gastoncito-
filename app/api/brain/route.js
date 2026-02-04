// app/api/brain/route.js
import { NextResponse } from 'next/server'
import { heuristicRouter } from '@/lib/brains/heuristicRouter'

const BANNED_KEYWORDS = [
  'prompt', 'programar', 'código', 'codigo',
  'nextjs', 'react', 'javascript', 'typescript',
  'app', 'aplicación', 'aplicacion',
  'explicame', 'explícame', 'haceme', 'escribime',
  'generame', 'genera me', 'creame', 'crea me',
  'desarrolla', 'implementa', 'programa',
  'función', 'funcion', 'componente', 'clase'
]

function isOutOfScope(text) {
  if (!text || typeof text !== 'string') return false
  const normalized = text.toLowerCase().trim()
  return BANNED_KEYWORDS.some(keyword => normalized.includes(keyword))
}

const SYSTEM_PROMPT = `Sos un router/extractor de vida personal, NO un asistente conversacional.

SCOPE CERRADO:
- SOLO ruteas mensajes sobre vida personal: gastos, ingresos, suscripciones, hábitos físicos, estados mentales, notas.
- NUNCA generes consejos largos, prompts, código o explicaciones técnicas.
- Si el mensaje NO es un registro personal => intent: "unknown", confidence: 0.

REGLAS DE ROUTING:
1. MONEY:
   - Detectar gastos: "gasté X en Y", "pagué X", "compré X"
   - Detectar ingresos: "cobré X", "ingresé X"
   - Detectar suscripciones: "netflix", "spotify", etc.
   - Normalizar merchants: "mp" / "mercado" => "mercado pago", "lemon" => "lemon cash"
   - intent: "add_expense" | "add_income" | "add_subscription"
   - Extraer amount (number), merchant, description
   - is_subscription: true si es suscripción reconocida

2. MENTAL:
   - Detectar estados emocionales: "me siento ansioso", "estoy triste", "feliz"
   - intent: "log_entry", domain: "mental"

3. PHYSICAL:
   - Detectar hábitos físicos: "entrené", "fui al gym", "corrí 5km"
   - intent: "log_entry", domain: "physical"

4. GENERAL:
   - Notas generales, recordatorios, ideas
   - intent: "log_entry", domain: "general"

CONFIDENCE:
- Alta (0.8-1.0): Claro y con datos suficientes
- Media (0.5-0.7): Ambiguo o falta contexto
- Baja (<0.5): No relevante o fuera de scope

RESPONDE SIEMPRE CON JSON VÁLIDO, sin texto adicional.`

const JSON_SCHEMA = {
  type: "object",
  properties: {
    brain: {
      type: "string",
      enum: ["money", "physical", "mental", "general"]
    },
    intent: {
      type: "string",
      enum: ["add_expense", "add_income", "add_subscription", "log_entry", "unknown"]
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1
    },
    money: {
      type: "object",
      properties: {
        amount: { type: "number" },
        currency: { type: "string", enum: ["ARS"] },
        merchant: { type: "string" },
        description: { type: "string" },
        is_subscription: { type: "boolean" }
      },
      additionalProperties: false
    },
    entry: {
      type: "object",
      properties: {
        text: { type: "string" },
        domain: {
          type: "string",
          enum: ["general", "physical", "mental", "money"]
        },
        meta: { type: "object" }
      },
      required: ["text", "domain"],
      additionalProperties: false
    }
  },
  required: ["brain", "intent", "confidence"],
  additionalProperties: false
}

async function callOpenAI(text) {
  const apiKey = process.env.OPENAI_API_KEY
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

  if (!apiKey) {
    throw new Error('No API key')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10s timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'brain_router',
            strict: true,
            schema: JSON_SCHEMA
          }
        },
        max_tokens: 200,
        temperature: 0.3
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No content from OpenAI')
    }

    return JSON.parse(content)
  } catch (error) {
    clearTimeout(timeout)
    throw error
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid text input' },
        { status: 400 }
      )
    }

    // 1. Anti-prompter check
    if (isOutOfScope(text)) {
      return NextResponse.json({
        brain: 'general',
        intent: 'unknown',
        confidence: 0,
        entry: {
          text,
          domain: 'general'
        },
        out_of_scope: true
      })
    }

    // 2. Try OpenAI (only if not CI and has key)
    const hasKey = !!process.env.OPENAI_API_KEY
    const isCI = !!process.env.CI

    if (hasKey && !isCI) {
      try {
        const result = await callOpenAI(text)
        return NextResponse.json(result)
      } catch (error) {
        console.error('OpenAI fallback to heuristic:', error.message)
        // Fall through to heuristic
      }
    }

    // 3. Fallback to heuristic router
    const result = heuristicRouter(text)
    return NextResponse.json(result)

  } catch (error) {
    console.error('Brain API error:', error)

    // Emergency fallback
    return NextResponse.json({
      brain: 'general',
      intent: 'unknown',
      confidence: 0.3,
      entry: {
        text: 'Error processing request',
        domain: 'general'
      }
    })
  }
}
