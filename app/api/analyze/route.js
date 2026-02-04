export async function POST(request) {
  try {
    const { snapshot } = await request.json()

    const LLM_API_URL = process.env.LLM_API_URL
    const LLM_API_KEY = process.env.LLM_API_KEY
    const LLM_MODEL = process.env.LLM_MODEL || 'gpt-4'

    if (!LLM_API_URL || !LLM_API_KEY) {
      return Response.json(
        {
          error: 'Configuración de IA no disponible. Configurá LLM_API_URL y LLM_API_KEY en las variables de entorno.',
        },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(snapshot)

    const response = await fetch(LLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: 'system',
            content:
              'Sos un asistente financiero. Respondé en español de manera directa y concisa. Tu rol es observar y sugerir, nunca modificar datos.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error('Error llamando a la API del LLM')
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || data.content || data.text || 'Sin respuesta'

    return Response.json({ text })
  } catch (error) {
    console.error('Error in analyze route:', error)
    return Response.json({ error: 'Error al analizar los datos' }, { status: 500 })
  }
}

function buildPrompt(snapshot) {
  const { balances, budgets, goals, behavioral_goals, movements_last_60, aggregates, timestamp } = snapshot

  const formatAmount = (n) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(n)
  }

  let prompt = `Analizá esta información financiera y respondé en español de forma concisa:\n\n`

  prompt += `RESUMEN ÚLTIMO MES:\n`
  prompt += `- Gastos: ${formatAmount(aggregates.thisMonth.gastos)}\n`
  prompt += `- Ingresos: ${formatAmount(aggregates.thisMonth.ingresos)}\n`
  prompt += `- Balance: ${formatAmount(aggregates.thisMonth.balance)}\n`
  if (aggregates.thisMonth.topCategory) {
    prompt += `- Categoría principal: ${aggregates.thisMonth.topCategory}\n`
  }
  prompt += `\n`

  prompt += `RESUMEN ÚLTIMOS 7 DÍAS:\n`
  prompt += `- Gastos: ${formatAmount(aggregates.last7Days.gastos)}\n`
  prompt += `- Ingresos: ${formatAmount(aggregates.last7Days.ingresos)}\n`
  prompt += `- Balance: ${formatAmount(aggregates.last7Days.balance)}\n`
  if (aggregates.last7Days.topCategory) {
    prompt += `- Categoría principal: ${aggregates.last7Days.topCategory}\n`
  }
  prompt += `\n`

  if (balances.length > 0) {
    prompt += `BILLETERAS:\n`
    balances.forEach((b) => {
      prompt += `- ${b.wallet}: ${formatAmount(b.saldo)}\n`
    })
    prompt += `\n`
  }

  if (budgets.length > 0) {
    prompt += `PRESUPUESTOS CONFIGURADOS:\n`
    budgets.forEach((b) => {
      prompt += `- ${b.category}: ${formatAmount(b.amount)}/mes\n`
    })
    prompt += `\n`
  }

  if (goals.length > 0) {
    prompt += `OBJETIVOS DE AHORRO:\n`
    goals.forEach((g) => {
      prompt += `- ${g.name}: objetivo ${formatAmount(g.target)}\n`
    })
    prompt += `\n`
  }

  if (behavioral_goals.length > 0) {
    prompt += `OBJETIVOS DE COMPORTAMIENTO:\n`
    behavioral_goals.forEach((bg) => {
      prompt += `- ${bg.name}: ${bg.type === 'category' ? 'límite' : 'usos máximos'} ${bg.limit} por ${bg.period === 'month' ? 'mes' : 'semana'} en ${bg.target}\n`
    })
    prompt += `\n`
  }

  if (movements_last_60.length > 0) {
    prompt += `ÚLTIMOS MOVIMIENTOS (${movements_last_60.length} registros):\n`
    const first10 = movements_last_60.slice(0, 10)
    first10.forEach((m) => {
      prompt += `- ${m.tipo}: ${formatAmount(m.monto)} en ${m.motivo || 'sin descripción'}`
      if (m.categoria) prompt += ` (${m.categoria})`
      prompt += `\n`
    })
    if (movements_last_60.length > 10) {
      prompt += `... y ${movements_last_60.length - 10} movimientos más.\n`
    }
    prompt += `\n`
  }

  prompt += `Respondé con:\n`
  prompt += `1. OBSERVACIONES (máximo 3 bullets)\n`
  prompt += `2. RIESGOS (máximo 2 bullets)\n`
  prompt += `3. SUGERENCIAS (máximo 3 acciones concretas)\n`
  prompt += `4. PREGUNTAS (máximo 2, solo si falta info crítica)\n`

  return prompt
}