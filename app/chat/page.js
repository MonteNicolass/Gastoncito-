'use client'

import { useState, useEffect } from 'react'
import { initDB, addMovimiento, updateSaldo, addNote } from '@/lib/storage'

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

  useEffect(() => {
    initDB()
  }, [])

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
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>

      <div style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              maxWidth: 420,
              marginBottom: 8,
              padding: 10,
              borderRadius: 12,
              background: m.from === 'user' ? '#222' : '#eee',
              color: m.from === 'user' ? '#fff' : '#000'
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: 8,
        padding: 10,
        borderTop: '1px solid #ddd'
      }}>
        <input
          style={{ flex: 1, padding: 12, fontSize: 16 }}
          placeholder="Escribí acá..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSend()
          }}
          data-testid="chat-input"
        />
        <button onClick={handleSend} data-testid="chat-send-btn">Enviar</button>
      </div>

    </div>
  )
}