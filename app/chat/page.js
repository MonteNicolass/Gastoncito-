'use client'

import { useState, useEffect, useRef } from 'react'
import { initDB, addMovimiento, updateSaldo, addNote, addLifeEntry, deleteMovimiento, deleteLifeEntry, deleteNote } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Button from '@/components/ui/Button'
import {
  MessageCircle,
  Wallet,
  Brain,
  Dumbbell,
  StickyNote,
  Send,
  Check,
  ChevronRight,
  Undo2
} from 'lucide-react'

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const [showUndo, setShowUndo] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const undoTimerRef = useRef(null)

  useEffect(() => {
    initDB()

    // Check for prefill from insight actions
    if (typeof window !== 'undefined') {
      const prefill = localStorage.getItem('chat_prefill')
      if (prefill) {
        setInput(prefill)
        localStorage.removeItem('chat_prefill')
      }
    }

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

    if (brain === 'money' && intent === 'adjust_balance') {
      if (!money?.amount) {
        setMessages(prev => [...prev, { from: 'gaston', text: 'No pude identificar el monto' }])
        return
      }

      const walletName = money.merchant || 'efectivo'

      // Update balance directly (set, not add/subtract)
      await updateSaldo(walletName, money.amount, true)

      setMessages(prev => [...prev, {
        from: 'gaston',
        text: `Saldo actualizado: ${walletName}`,
        hint: 'Ajuste de billetera'
      }])

    } else if (brain === 'money' && (intent === 'add_expense' || intent === 'add_income' || intent === 'add_subscription')) {
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

      const result = await addMovimiento(movimiento)
      await updateSaldo(movimiento.metodo, movimiento.tipo === 'gasto' ? -movimiento.monto : movimiento.monto)

      // Save for undo
      setLastAction({
        type: 'movimiento',
        id: result.id || result,
        data: movimiento
      })
      showUndoToast()

      const typeLabel = movimiento.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'
      const hint = 'Afecta Money hoy'
      setMessages(prev => [...prev, {
        from: 'gaston',
        text: `${typeLabel} guardado`,
        hint
      }])

    } else if (intent === 'log_entry' && entry) {
      const result = await addLifeEntry({
        text: entry.text || originalText,
        domain: entry.domain,
        meta: entry.meta || {}
      })

      // Save for undo
      setLastAction({
        type: 'life_entry',
        id: result.id || result,
        data: { text: entry.text || originalText, domain: entry.domain, meta: entry.meta || {} }
      })
      showUndoToast()

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
      const result = await addLifeEntry({
        text: originalText,
        domain: 'general',
        meta: {}
      })

      // Save for undo
      setLastAction({
        type: 'life_entry',
        id: result.id || result,
        data: { text: originalText, domain: 'general', meta: {} }
      })
      showUndoToast()

      setMessages(prev => [...prev, { from: 'gaston', text: 'Guardado como nota' }])
    }
  }

  function showUndoToast() {
    setShowUndo(true)

    // Clear existing timer
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
    }

    // Auto-hide after 8 seconds
    undoTimerRef.current = setTimeout(() => {
      setShowUndo(false)
      setLastAction(null)
    }, 8000)
  }

  async function handleUndo() {
    if (!lastAction) return

    try {
      if (lastAction.type === 'movimiento') {
        await deleteMovimiento(lastAction.id)
        // Revert saldo
        const movimiento = lastAction.data
        await updateSaldo(movimiento.metodo, movimiento.tipo === 'gasto' ? movimiento.monto : -movimiento.monto)
      } else if (lastAction.type === 'life_entry') {
        await deleteLifeEntry(lastAction.id)
      } else if (lastAction.type === 'note') {
        await deleteNote(lastAction.id)
      }

      setMessages(prev => [...prev, { from: 'gaston', text: 'Deshecho' }])
    } catch (error) {
      console.error('Undo error:', error)
      setMessages(prev => [...prev, { from: 'gaston', text: 'Error al deshacer' }])
    } finally {
      setShowUndo(false)
      setLastAction(null)
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current)
      }
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
    <div className="flex flex-col h-screen pb-20">
      <TopBar title="Chat" />

      {/* Hero Input Section */}
      <div className="px-4 pt-6 pb-4">
        <div className="max-w-lg mx-auto">
          <div className="relative">
            <input
              ref={inputRef}
              className="w-full px-5 py-4 pr-14 bg-white dark:bg-zinc-900 border-2 border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-all text-base shadow-sm"
              placeholder="¿Qué querés registrar?"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSend()
              }}
              data-testid="chat-input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all"
              data-testid="chat-send-btn"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>

          {/* Pills de acciones rápidas */}
          <div className="flex items-center gap-2 mt-3 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setInput('Gasté ')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:scale-95 transition-all whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Gasto</span>
            </button>

            <button
              onClick={() => setInput('Hoy me sentí ')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium hover:bg-purple-100 dark:hover:bg-purple-900/50 active:scale-95 transition-all whitespace-nowrap"
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Estado</span>
            </button>

            <button
              onClick={() => setInput('Fui al ')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium hover:bg-orange-100 dark:hover:bg-orange-900/50 active:scale-95 transition-all whitespace-nowrap"
            >
              <Dumbbell className="w-3.5 h-3.5" />
              <span>Hábito</span>
            </button>

            <button
              onClick={() => setInput('Nota: ')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 active:scale-95 transition-all whitespace-nowrap"
            >
              <StickyNote className="w-3.5 h-3.5" />
              <span>Nota</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
            <MessageCircle className="w-10 h-10 text-zinc-400 dark:text-zinc-500" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center px-8">
              Escribí arriba y presioná Enter para guardar
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i}>
            <div className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[300px] px-4 py-3 rounded-2xl ${
                  m.from === 'user'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-br-md'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
                }`}
              >
                <p className="text-sm leading-relaxed">{m.text}</p>
                {m.hint && (
                  <p className={`text-xs mt-1.5 ${
                    m.from === 'user'
                      ? 'text-zinc-400 dark:text-zinc-500'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}>
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

      {/* Link rápido a Hoy */}
      <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
        <a href="/hoy" className="block">
          <div className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center justify-center gap-1">
            <span>Ver todo lo de hoy</span>
            <ChevronRight className="w-3 h-3" />
          </div>
        </a>
      </div>

      {/* Undo Toast */}
      {showUndo && (
        <div className="fixed bottom-28 left-4 right-4 z-[70] animate-slide-up">
          <div className="bg-zinc-900 dark:bg-zinc-800 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between max-w-md mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-sm font-semibold">Guardado</span>
            </div>
            <button
              onClick={handleUndo}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-semibold transition-colors active:scale-95 flex items-center gap-2"
            >
              <Undo2 className="w-4 h-4" />
              <span>Deshacer</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
