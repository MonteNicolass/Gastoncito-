'use client'

import { useState, useEffect, useRef } from 'react'
import { initDB, addMovimiento, updateSaldo, addNote } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

function simpleParse(text) {
  text = text.toLowerCase()

  const montoMatch = text.match(/(\d+)/)
  if (!montoMatch) return null
  const monto = Number(montoMatch[1])

  let tipo = null

  if (text.includes('gaste') || text.includes('gasté') || text.includes('pague') || text.includes('pagué')) tipo = 'gasto'
  if (text.includes('cobre') || text.includes('cobré') || text.includes('ingreso')) tipo = 'ingreso'
  if (text.includes('pase') || text.includes('pasé') || text.includes('transferi')) tipo = 'transferencia'

  if (!tipo) return null

  const metodo =
    text.includes('mercado') || text.includes('mp')
      ? 'mercado pago'
      : 'efectivo'

  let destino = null
  if (tipo === 'transferencia') {
    destino = text.includes('mp')
      ? 'mercado pago'
      : 'efectivo'
  }

  let categoria = 'otros'
  if (text.includes('cafe')) categoria = 'cafe'
  if (text.includes('comida')) categoria = 'comida'
  if (text.includes('uber')) categoria = 'transporte'

  return {
    tipo,
    monto,
    metodo,
    destino,
    categoria
  }
}

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { from: 'gaston', text: 'Hola. Decime qué movimiento querés registrar.' }
  ])

  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    initDB()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!input.trim()) return

    const text = input
    setInput('')
    setMessages(prev => [...prev, { from: 'user', text }])

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
        setMessages(prev => [
          ...prev,
          { from: 'gaston', text: 'Nota guardada.' }
        ])
      } else {
        setMessages(prev => [
          ...prev,
          { from: 'gaston', text: 'La nota está vacía.' }
        ])
      }

      return
    }

    const parsed = simpleParse(text)

    if (!parsed) {
      setMessages(prev => [
        ...prev,
        { from: 'gaston', text: 'Ejemplo: gaste 1200 efectivo en cafe' }
      ])
      return
    }

    if (parsed.tipo === 'transferencia') {
      await updateSaldo(parsed.metodo, -parsed.monto)
      await updateSaldo(parsed.destino, parsed.monto)

      setMessages(prev => [
        ...prev,
        {
          from: 'gaston',
          text: `Transferido $${parsed.monto} de ${parsed.metodo} a ${parsed.destino}`
        }
      ])
      return
    }

    const movimiento = {
      fecha: new Date().toISOString().slice(0, 10),
      tipo: parsed.tipo,
      monto: parsed.monto,
      metodo: parsed.metodo,
      categoria: parsed.categoria,
      motivo: text
    }

    await addMovimiento(movimiento)

    const delta =
      parsed.tipo === 'gasto'
        ? -parsed.monto
        : parsed.monto

    await updateSaldo(parsed.metodo, delta)

    setMessages(prev => [
      ...prev,
      {
        from: 'gaston',
        text: `Registrado: ${parsed.tipo} $${parsed.monto} (${parsed.categoria})`
      }
    ])
  }

  return (
    <div className="flex flex-col h-screen">
      <TopBar title="Chat" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[280px] px-4 py-2.5 rounded-2xl ${
                m.from === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md'
              }`}
            >
              <p className="text-sm leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="sticky bottom-0 backdrop-blur-xl bg-zinc-50/80 dark:bg-zinc-950/80 border-t border-zinc-200/50 dark:border-zinc-800/50 px-4 py-3">
        <div className="flex gap-2 items-end">
          <input
            className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
            placeholder="Escribí acá..."
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
