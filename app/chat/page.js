'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { initDB, addMovimiento, updateSaldo, addNote, addLifeEntry, deleteMovimiento, deleteLifeEntry, deleteNote, getMovimientos } from '@/lib/storage'
import { getPriorityAlertForChat, actOnAlert } from '@/lib/alerts'
import { runRatoneandoEngine } from '@/lib/ratoneando'
import { getRatoneandoAlertForChat } from '@/lib/alerts/ratoneando-alerts'
import { generatePayoff, calculatePayoffContext, updateMonthlyStats } from '@/lib/payoff'
import { quickPriceCheck } from '@/lib/mira-precios'
import { getDietSuggestionForChat, initDietSystem } from '@/lib/dieta'
import { getChatContextSuggestion, recordAndProcess, markAsHabitual } from '@/lib/gasti'
import { getAutocompleteSuggestions } from '@/lib/chat/autocomplete'
import TopBar from '@/components/ui/TopBar'
import Button from '@/components/ui/Button'
import {
  Wallet,
  Brain,
  Dumbbell,
  StickyNote,
  Send,
  Check,
  Undo2,
  Sparkles,
  AlertTriangle,
  Heart,
  Bell,
  PiggyBank,
  Flame,
  TrendingUp,
  Shield,
  Target,
  Trophy,
  Plus
} from 'lucide-react'

// Ejemplos clickeables para el estado inicial
const EXAMPLE_PROMPTS = [
  { text: 'Gasté 1500 en el almuerzo', icon: Wallet, color: 'emerald' },
  { text: 'Hoy me sentí con energía, 8/10', icon: Brain, color: 'zinc' },
  { text: 'Fui al gimnasio', icon: Dumbbell, color: 'orange' },
]

export default function ChatPage() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pendingAction, setPendingAction] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const [showUndo, setShowUndo] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [alertContext, setAlertContext] = useState(null)
  const [ratoneandoContext, setRatoneandoContext] = useState(null)
  const [payoffToast, setPayoffToast] = useState(null)
  const [pendingHabitual, setPendingHabitual] = useState(null)
  const messagesEndRef = useRef(null)
  const payoffTimerRef = useRef(null)
  const inputRef = useRef(null)
  const undoTimerRef = useRef(null)

  useEffect(() => {
    async function loadContext() {
      await initDB()

      // Check for prefill from insight actions
      if (typeof window !== 'undefined') {
        const prefill = localStorage.getItem('chat_prefill')
        if (prefill) {
          setInput(prefill)
          localStorage.removeItem('chat_prefill')
        }

        // Load priority alert for context
        const priorityAlert = getPriorityAlertForChat()
        if (priorityAlert) {
          setAlertContext(priorityAlert)
        }

        // Load ratoneando context for savings opportunities
        try {
          const movimientos = await getMovimientos()
          const ratoneandoResult = await runRatoneandoEngine(movimientos)
          const ratoneandoAlert = getRatoneandoAlertForChat(ratoneandoResult)
          if (ratoneandoAlert && !priorityAlert) {
            // Only show ratoneando if no higher priority alert
            setRatoneandoContext(ratoneandoAlert)
          }

          // Load diet suggestion (lower priority, only if no other context)
          if (!priorityAlert && !ratoneandoAlert) {
            await initDietSystem(ratoneandoResult?.patterns)
            const dietSuggestion = getDietSuggestionForChat(ratoneandoResult?.patterns)
            if (dietSuggestion) {
              setRatoneandoContext(dietSuggestion) // Reuse same context slot
            } else {
              // Try gasti context suggestion (spending insights)
              const budgets = localStorage.getItem('gaston_budgets')
              const parsedBudgets = budgets ? JSON.parse(budgets) : []
              const gastiSuggestion = getChatContextSuggestion(movimientos, parsedBudgets)
              if (gastiSuggestion) {
                setRatoneandoContext({
                  title: gastiSuggestion.message,
                  message: gastiSuggestion.detail,
                  action: gastiSuggestion.cta ? {
                    type: 'show_recommendation',
                    label: gastiSuggestion.cta.label || 'Ver más'
                  } : null
                })
              }
            }
          }
        } catch (e) {
          console.warn('Could not load ratoneando context:', e)
        }
      }

      // Autofocus on input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
    }

    loadContext()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return

    const text = input
    setInput('')
    setMessages(prev => [...prev, { from: 'user', text }])
    setIsTyping(true)

    // 1. Pre-filtro anti-prompter (client-side)
    const { isOutOfScope, getRejectionMessage } = await import('@/lib/anti-prompter')
    if (isOutOfScope(text)) {
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, { from: 'gaston', text: getRejectionMessage() }])
      }, 400)
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
        setTimeout(() => {
          setIsTyping(false)
          setMessages(prev => [...prev, { from: 'gaston', text: 'Listo, guardé tu nota' }])
        }, 300)
      } else {
        setTimeout(() => {
          setIsTyping(false)
          setMessages(prev => [...prev, { from: 'gaston', text: 'Mmm, la nota parece vacía' }])
        }, 300)
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
        setTimeout(() => {
          setIsTyping(false)
          setMessages(prev => [...prev, { from: 'gaston', text: 'Mmm, eso no lo puedo registrar. Probá con un gasto, cómo te sentís, o una actividad.' }])
        }, 400)
        return
      }

      // 4. Execute based on confidence
      const confidence = routing.confidence || 0

      if (confidence >= 0.50) {
        await executeAction(routing, text)
      } else {
        await addLifeEntry({
          text,
          domain: 'general',
          meta: {}
        })
        setTimeout(() => {
          setIsTyping(false)
          setMessages(prev => [...prev, { from: 'gaston', text: 'Lo guardé como nota' }])
        }, 300)
      }

    } catch (error) {
      console.error('Chat error:', error)
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, { from: 'gaston', text: 'Ups, algo falló. ¿Probamos de nuevo?' }])
      }, 300)
    }
  }

  async function executeAction(routing, originalText) {
    const { brain, intent, money, entry } = routing

    if (brain === 'money' && intent === 'adjust_balance') {
      if (!money?.amount) {
        setTimeout(() => {
          setIsTyping(false)
          setMessages(prev => [...prev, { from: 'gaston', text: 'No encontré el monto' }])
        }, 300)
        return
      }

      const walletName = money.merchant || 'efectivo'
      await updateSaldo(walletName, money.amount, true)

      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, {
          from: 'gaston',
          text: `Actualicé el saldo de ${walletName}`,
          hint: 'Ajuste de billetera'
        }])
      }, 300)

    } else if (brain === 'money' && (intent === 'add_expense' || intent === 'add_income' || intent === 'add_subscription')) {
      if (!money?.amount) {
        setTimeout(() => {
          setIsTyping(false)
          setMessages(prev => [...prev, { from: 'gaston', text: 'No encontré el monto' }])
        }, 300)
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

      setLastAction({
        type: 'movimiento',
        id: result.id || result,
        data: movimiento
      })
      showUndoToast()

      // Record for pattern detection (gasti)
      if (movimiento.tipo === 'gasto') {
        const allMovimientos = await getMovimientos()
        const processResult = await recordAndProcess(movimiento, allMovimientos)

        // Show habitual suggestion if detected
        if (processResult?.habitualSuggestion) {
          setPendingHabitual({ motivo: processResult.habitualSuggestion.motivo, monto: movimiento.monto })
          setTimeout(() => {
            setMessages(prev => [...prev, {
              from: 'gaston',
              text: processResult.habitualSuggestion.question,
              hint: processResult.habitualSuggestion.impact,
              needsHabitualConfirm: true
            }])
          }, 800)
        }
        // Show cumulative alert if significant
        else if (processResult?.cumulativeAlert?.severity === 'high') {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              from: 'gaston',
              text: processResult.cumulativeAlert.message,
              hint: 'Alerta de gasto acumulado'
            }])
          }, 800)
        }
      }

      // Show payoff for expense/income
      if (movimiento.tipo === 'gasto') {
        // Check for price insights (MiráPrecios)
        const priceCheck = quickPriceCheck(money.description || originalText, movimiento.monto)
        if (priceCheck.notable) {
          // Show price insight instead of generic payoff
          showPayoff('price_insight', {
            isHigh: priceCheck.isHigh,
            label: priceCheck.label,
            emoji: priceCheck.emoji
          })
        } else {
          showPayoff('expense_logged', { amount: movimiento.monto, category: money.category })
        }
      } else {
        showPayoff('income_logged', { amount: movimiento.monto })
      }

      const typeLabel = movimiento.tipo === 'ingreso' ? 'Ingreso registrado' : 'Gasto registrado'
      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, {
          from: 'gaston',
          text: typeLabel,
          hint: 'Impacta en Money'
        }])
      }, 300)

    } else if (intent === 'log_entry' && entry) {
      const result = await addLifeEntry({
        text: entry.text || originalText,
        domain: entry.domain,
        meta: entry.meta || {}
      })

      setLastAction({
        type: 'life_entry',
        id: result.id || result,
        data: { text: entry.text || originalText, domain: entry.domain, meta: entry.meta || {} }
      })
      showUndoToast()

      // Show payoff for mood or activity
      if (entry.domain === 'mental' && entry.meta?.mood_score) {
        showPayoff('mood_logged', { score: entry.meta.mood_score })
      } else if (entry.domain === 'physical') {
        showPayoff('activity_logged', { activityType: entry.text || originalText })
      }

      const labels = {
        general: 'Guardado',
        physical: 'Actividad registrada',
        mental: 'Estado registrado',
        money: 'Registrado'
      }

      const hints = {
        general: null,
        physical: 'Impacta en Físico',
        mental: 'Impacta en Mental',
        money: 'Impacta en Money'
      }

      const scoreText = entry.meta?.mood_score ? ` (${entry.meta.mood_score}/10)` : ''

      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, {
          from: 'gaston',
          text: `${labels[entry.domain]}${scoreText}`,
          hint: hints[entry.domain]
        }])
      }, 300)

    } else {
      const result = await addLifeEntry({
        text: originalText,
        domain: 'general',
        meta: {}
      })

      setLastAction({
        type: 'life_entry',
        id: result.id || result,
        data: { text: originalText, domain: 'general', meta: {} }
      })
      showUndoToast()

      setTimeout(() => {
        setIsTyping(false)
        setMessages(prev => [...prev, { from: 'gaston', text: 'Lo guardé como nota' }])
      }, 300)
    }
  }

  function showUndoToast() {
    setShowUndo(true)

    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current)
    }

    undoTimerRef.current = setTimeout(() => {
      setShowUndo(false)
      setLastAction(null)
    }, 8000)
  }

  function showPayoff(actionType, context) {
    const payoff = generatePayoff(actionType, context)
    if (!payoff || payoff.type === 'logged') return // Don't show generic payoffs

    setPayoffToast(payoff)

    if (payoffTimerRef.current) {
      clearTimeout(payoffTimerRef.current)
    }

    payoffTimerRef.current = setTimeout(() => {
      setPayoffToast(null)
    }, 4000)
  }

  function getPayoffIcon(iconName) {
    const icons = {
      'Check': Check,
      'PiggyBank': PiggyBank,
      'Flame': Flame,
      'TrendingUp': TrendingUp,
      'Shield': Shield,
      'Target': Target,
      'Trophy': Trophy,
      'Plus': Plus,
      'Zap': Sparkles
    }
    return icons[iconName] || Check
  }

  async function handleUndo() {
    if (!lastAction) return

    try {
      if (lastAction.type === 'movimiento') {
        await deleteMovimiento(lastAction.id)
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
      setMessages(prev => [...prev, { from: 'gaston', text: 'No pude deshacer' }])
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
    await addLifeEntry({
      text: pendingAction.originalText,
      domain: 'general',
      meta: {}
    })
    setMessages(prev => [...prev, { from: 'gaston', text: 'Guardado como nota' }])
    setPendingAction(null)
  }

  function handleExampleClick(text) {
    setInput(text)
    inputRef.current?.focus()
  }

  function handleConfirmHabitual() {
    if (!pendingHabitual) return

    markAsHabitual({
      motivo: pendingHabitual.motivo,
      monto: pendingHabitual.monto
    })

    setMessages(prev => [...prev, { from: 'gaston', text: 'Marcado como habitual' }])
    setPendingHabitual(null)
  }

  function handleDismissHabitual() {
    setPendingHabitual(null)
    setMessages(prev => [...prev, { from: 'gaston', text: 'Entendido' }])
  }

  function handleQuickAction(prefix) {
    setInput(prefix)
    inputRef.current?.focus()
  }

  const suggestions = useMemo(() => getAutocompleteSuggestions(input), [input])

  function handleSuggestionClick(suggestion) {
    setInput(suggestion.prefix)
    inputRef.current?.focus()
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-screen bg-zinc-50 dark:bg-zinc-950">
      <TopBar title="Gastoncito" />

      {/* Main Chat Container */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 py-4 pb-24">
        {/* Chat Panel */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm overflow-hidden">

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">

            {/* Welcome Message (always shown first) */}
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white dark:text-zinc-900" />
              </div>
              <div className="flex-1">
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3 inline-block max-w-[280px]">
                  <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed">
                    Hola, soy Gastoncito
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    ¿Qué querés registrar hoy?
                  </p>
                </div>
              </div>
            </div>

            {/* Alert Context Message (when there's an active alert) */}
            {alertContext && !hasMessages && (
              <div className="flex gap-3 mt-2">
                <div className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  {alertContext.severity === 'high' ? (
                    <AlertTriangle className="w-4 h-4 text-white dark:text-zinc-900" />
                  ) : alertContext.type === 'wellness' ? (
                    <Heart className="w-4 h-4 text-white dark:text-zinc-900" />
                  ) : (
                    <Bell className="w-4 h-4 text-white dark:text-zinc-900" />
                  )}
                </div>
                <div className="flex-1">
                  <div className={`rounded-2xl rounded-tl-md px-4 py-3 inline-block max-w-[280px] ${
                    alertContext.severity === 'high'
                      ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                      : alertContext.severity === 'medium'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
                      : 'bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800'
                  }`}>
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium">
                      {alertContext.title}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      {alertContext.message}
                    </p>
                    {alertContext.action && (
                      <button
                        onClick={() => {
                          if (alertContext.action.type === 'register_mood' || alertContext.action.type === 'register_activity') {
                            setInput(alertContext.type === 'wellness' && alertContext.subtype?.includes('mental') ? 'Me siento ' : 'Hice ')
                            inputRef.current?.focus()
                          }
                          actOnAlert(alertContext.id)
                          setAlertContext(null)
                        }}
                        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-all active:scale-95"
                      >
                        {alertContext.action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Ratoneando Context Message (savings opportunity) */}
            {ratoneandoContext && !alertContext && !hasMessages && (
              <div className="flex gap-3 mt-2">
                <div className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <PiggyBank className="w-4 h-4 text-white dark:text-zinc-900" />
                </div>
                <div className="flex-1">
                  <div className="rounded-2xl rounded-tl-md px-4 py-3 inline-block max-w-[280px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed font-medium">
                      {ratoneandoContext.title}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                      {ratoneandoContext.message}
                    </p>
                    {ratoneandoContext.action && (
                      <button
                        onClick={() => {
                          // Navigate to insights or dismiss
                          if (ratoneandoContext.action.type === 'show_recommendation') {
                            window.location.href = '/money/insights'
                          }
                          setRatoneandoContext(null)
                        }}
                        className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 transition-all active:scale-95"
                      >
                        {ratoneandoContext.action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Example Prompts (only when no messages) */}
            {!hasMessages && (
              <div className="pl-12 space-y-2 mt-4">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                  Probá con algo así:
                </p>
                {EXAMPLE_PROMPTS.map((example, i) => {
                  const Icon = example.icon
                  return (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(example.text)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                        example.color === 'emerald'
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                          : example.color === 'zinc'
                          ? 'bg-zinc-100 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800'
                          : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>"{example.text}"</span>
                    </button>
                  )
                })}
              </div>
            )}

            {/* User & Assistant Messages */}
            {messages.map((m, i) => (
              <div key={i}>
                {m.from === 'user' ? (
                  <div className="flex justify-end">
                    <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-3 rounded-2xl rounded-br-md max-w-[280px]">
                      <p className="text-sm leading-relaxed">{m.text}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white dark:text-zinc-900" />
                    </div>
                    <div className="flex-1">
                      <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3 inline-block max-w-[280px]">
                        <p className="text-sm text-zinc-900 dark:text-zinc-100 leading-relaxed">{m.text}</p>
                        {m.hint && (
                          <p className="text-xs text-terra-600 dark:text-terra-400 mt-1.5 font-medium">
                            {m.hint}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirmation UI */}
                {m.needsConfirmation && pendingAction && i === messages.length - 1 && (
                  <div className="flex gap-3 mt-2 pl-12">
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
                )}

                {/* Habitual Confirmation UI */}
                {m.needsHabitualConfirm && pendingHabitual && i === messages.length - 1 && (
                  <div className="flex gap-2 mt-2 pl-12">
                    <button
                      onClick={handleConfirmHabitual}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white transition-all active:scale-95"
                    >
                      Sí, marcar
                    </button>
                    <button
                      onClick={handleDismissHabitual}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-all active:scale-95"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-white dark:text-zinc-900" />
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl rounded-tl-md px-4 py-3 inline-block">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Inside the panel */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/50">
            {/* Autocomplete Suggestions */}
            {suggestions.length > 0 && input.trim().length >= 2 && (
              <div className="flex items-center gap-2 mb-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s)}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 active:scale-95 transition-all whitespace-nowrap"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {/* Quick Actions Pills */}
            <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => handleQuickAction('Gasté ')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-300 active:scale-95 transition-all whitespace-nowrap"
              >
                <Wallet className="w-3 h-3" />
                <span>Gasto</span>
              </button>

              <button
                onClick={() => handleQuickAction('Me siento ')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium hover:border-zinc-400 dark:hover:border-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 active:scale-95 transition-all whitespace-nowrap"
              >
                <Brain className="w-3 h-3" />
                <span>Estado</span>
              </button>

              <button
                onClick={() => handleQuickAction('Hice ')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-700 dark:hover:text-orange-300 active:scale-95 transition-all whitespace-nowrap"
              >
                <Dumbbell className="w-3 h-3" />
                <span>Actividad</span>
              </button>

              <button
                onClick={() => handleQuickAction('Nota: ')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full text-xs font-medium hover:border-terra-300 dark:hover:border-terra-700 hover:text-terra-700 dark:hover:text-terra-300 active:scale-95 transition-all whitespace-nowrap"
              >
                <StickyNote className="w-3 h-3" />
                <span>Nota</span>
              </button>
            </div>

            {/* Input */}
            <div className="relative">
              <input
                ref={inputRef}
                className="w-full px-4 py-3.5 pr-12 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-terra-500/30 focus:border-terra-500/50 transition-all text-[15px]"
                placeholder="Escribí lo que quieras registrar..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                data-testid="chat-input"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all"
                data-testid="chat-send-btn"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
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

      {/* Payoff Toast */}
      {payoffToast && !showUndo && (
        <div className="fixed bottom-28 left-4 right-4 z-[70] animate-slide-up">
          <div className={`px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 max-w-md mx-auto ${
            payoffToast.color === 'emerald' ? 'bg-emerald-600' :
            payoffToast.color === 'purple' ? 'bg-zinc-700' :
            payoffToast.color === 'orange' ? 'bg-orange-600' :
            payoffToast.color === 'indigo' ? 'bg-zinc-700' :
            payoffToast.color === 'blue' ? 'bg-terra-600' :
            'bg-zinc-800'
          }`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              payoffToast.color === 'emerald' ? 'bg-white/20' :
              payoffToast.color === 'purple' ? 'bg-white/20' :
              payoffToast.color === 'orange' ? 'bg-white/20' :
              payoffToast.color === 'indigo' ? 'bg-white/20' :
              payoffToast.color === 'blue' ? 'bg-white/20' :
              'bg-white/10'
            }`}>
              {(() => {
                const IconComponent = getPayoffIcon(payoffToast.icon)
                return <IconComponent className="w-5 h-5 text-white" />
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{payoffToast.message}</p>
              {payoffToast.detail && (
                <p className="text-xs text-white/80 mt-0.5">{payoffToast.detail}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
