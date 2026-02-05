'use client'

import { useState, useEffect, useRef } from 'react'
import { initDB, addMovimiento, updateSaldo, addNote, addLifeEntry } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    initDB()
    // Autofocus on input
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return

    const text = input
    setInput('')
    setMessages(prev => [...prev, { from: 'user', text }])

    // 1. Pre-filtro anti-prompter (client-side)
    const { isOutOfScope, getRejectionMessage } = await import('@/lib/anti-prompter')
    if (isOutOfScope(text)) {
      setMessages(prev => [...prev, { from: 'gaston', text: getRejectionMessage() }])
      return
    }

    // 2. Legacy note syntax (backwards compat)
    const lowerText = text.toLowerCase()

    if (lowerText.startsWith('nota:') ||
        lowerText.startsWith('idea:') ||
        lowerText.startsWith('nota video:') ||
        lowerText.startsWith('nota negocio:') ||
        lowerText.startsWith('nota salud:') ||
        lowerText.startsWith('nota personal:')) {

      let noteText = ''
      let noteType = null

      if (lowerText.startsWith('nota video:')) {
        noteText = text.slice('nota video:'.length).trim()
        noteType = 'video'
      } else if (lowerText.startsWith('nota negocio:')) {
        noteText = text.slice('nota negocio:'.length).trim()
        noteType = 'negocio'
      } else if (lowerText.startsWith('nota salud:')) {
        noteText = text.slice('nota salud:'.length).trim()
        noteType = 'salud'
      } else if (lowerText.startsWith('nota personal:')) {
        noteText = text.slice('nota personal:'.length).trim()
        noteType = 'personal'
      } else if (lowerText.startsWith('idea:')) {
        noteText = text.slice('idea:'.length).trim()
        noteType = 'idea'
      } else if (lowerText.startsWith('nota:')) {
        noteText = text.slice('nota:'.length).trim()
        noteType = null
      }

      if (noteText) {
        await addNote({ text: noteText, type: noteType })
        setMessages(prev => [...prev, { from: 'gaston', text: 'Nota guardada.' }])
      } else {
        setMessages(prev => [...prev, { from: 'gaston', text: 'La nota está vacía.' }])
      }

      return
    }

    // 3. Call Brain API
    try {
      const response = await fetch('/api/brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })

      if (!response.ok) {
        throw new Error('Brain API error')
      }

      const routing = await response.json()

      // Handle out-of-scope from server
      if (routing.out_of_scope) {
        setMessages(prev => [...prev, { from: 'gaston', text: 'Esto no parece algo de tu vida personal. Acá podés registrar gastos, emociones, hábitos o notas.' }])
        return
      }

      // 4. Execute based on confidence
      const confidence = routing.confidence || 0

      if (confidence >= 0.50) {
        // Auto-execute (media confidence o mayor)
        await executeAction(routing, text)
      } else {
        // Low confidence => save as general note
        await addLifeEntry({
          text,
          domain: 'general',
          meta: {}
        })
        setMessages(prev => [...prev, { from: 'gaston', text: 'Guardado como nota' }])
      }

    } catch (error) {
      console.error('Chat error:', error)
      setMessages(prev => [...prev, { from: 'gaston', text: 'Ocurrió un error. Probá de nuevo.' }])
    }
  }

  async function executeAction(routing, originalText) {
    const { brain, intent, money, entry } = routing

    if (brain === 'money' && (intent === 'add_expense' || intent === 'add_income' || intent === 'add_subscription')) {
      if (!money?.amount) {
        setMessages(prev => [...prev, { from: 'gaston', text: 'No pude identificar el monto' }])
        return
      }

      const movimiento = {
        fecha: new Date().toISOString().slice(0, 10),
        tipo: intent === 'add_income' ? 'ingreso' : 'gasto',
        monto: money.amount,
        metodo: money.merchant || 'efectivo',
        motivo: money.description || originalText,
        is_subscription: money.is_subscription || false
      }

      await addMovimiento(movimiento)
      await updateSaldo(movimiento.metodo, movimiento.tipo === 'gasto' ? -movimiento.monto : movimiento.monto)

      const typeLabel = movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'
      const hint = 'Afecta Money hoy'
      setMessages(prev => [...prev, {
        from: 'gaston',
        text: `${typeLabel} guardado`,
        hint
      }])

    } else if (intent === 'log_entry' && entry) {
      await addLifeEntry({
        text: entry.text || originalText,
        domain: entry.domain,
        meta: entry.meta || {}
      })

      const labels = {
        general: 'Nota guardada',
        physical: 'Hábito registrado',
        mental: 'Estado mental registrado',
        money: 'Money registrado'
      }

      const hints = {
        general: null,
        physical: 'Impacta en Físico',
        mental: 'Impacta en Mental',
        money: 'Afecta Money hoy'
      }

      const scoreText = entry.meta?.mood_score ? `: ${entry.meta.mood_score}/10` : ''

      setMessages(prev => [...prev, {
        from: 'gaston',
        text: `${labels[entry.domain]}${scoreText}`,
        hint: hints[entry.domain]
      }])

    } else {
      // Unknown or unhandled
      await addLifeEntry({
        text: originalText,
        domain: 'general',
        meta: {}
      })
      setMessages(prev => [...prev, { from: 'gaston', text: 'Guardado como nota' }])
    }
  }


  async function handleConfirm() {
    if (!pendingAction) return

    await executeAction(pendingAction.routing, pendingAction.originalText)
    setPendingAction(null)
  }

  async function handleCancel() {
    if (!pendingAction) return

    // Save as general note instead
    await addLifeEntry({
      text: pendingAction.originalText,
      domain: 'general',
      meta: {}
    })

    setMessages(prev => [...prev, { from: 'gaston', text: 'Guardado como nota' }])
    setPendingAction(null)
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Chat" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center px-8">
              Escribí algo que quieras registrar…
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[280px] px-4 py-2.5 rounded-2xl ${
                  m.from === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm leading-relaxed">{m.text}</p>
                {m.hint && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {m.hint}
                  </p>
                )}
              </div>
            </div>

            {/* Confirmation UI */}
            {m.needsConfirmation && pendingAction && i === messages.length - 1 && (
              <div className="flex justify-start mt-2">
                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirm}
                    variant="primary"
                    size="sm"
                    data-testid="chat-confirm-btn"
                  >
                    Confirmar
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="ghost"
                    size="sm"
                    data-testid="chat-cancel-btn"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Acciones rápidas */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-4 justify-center">
          <button
            onClick={() => setInput('Gasté ')}
            className="flex flex-col items-center gap-1 group"
            title="Registrar gasto"
          >
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
              <span className="text-2xl">💸</span>
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Gasto</span>
          </button>

          <button
            onClick={() => setInput('Hoy me sentí ')}
            className="flex flex-col items-center gap-1 group"
            title="Registrar estado mental"
          >
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
              <span className="text-2xl">🧠</span>
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Estado</span>
          </button>

          <button
            onClick={() => setInput('Fui al ')}
            className="flex flex-col items-center gap-1 group"
            title="Registrar hábito"
          >
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
              <span className="text-2xl">💪</span>
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Hábito</span>
          </button>

          <button
            onClick={() => setInput('Nota: ')}
            className="flex flex-col items-center gap-1 group"
            title="Guardar nota"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <span className="text-2xl">📝</span>
            </div>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">Nota</span>
          </button>
        </div>
      </div>

      <div className="sticky bottom-0 backdrop-blur-xl bg-zinc-50/80 dark:bg-zinc-950/80 border-t border-zinc-200/50 dark:border-zinc-800/50 px-4 py-3">
        <div className="flex gap-2 items-end">
          <input
            ref={inputRef}
            className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            placeholder="Escribí algo que quieras registrar…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSend()
            }}
            data-testid="chat-input"
          />
          <Button
            onClick={handleSend}
            variant="primary"
            size="md"
            className="rounded-full px-5"
            data-testid="chat-send-btn"
          >
            Enviar
          </Button>
        </div>
      </div>
    </div>
  )
}
