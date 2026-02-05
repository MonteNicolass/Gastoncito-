'use client'

import { useState } from 'react'
import { initDB, addMovimiento, updateSaldo, addLifeEntry } from '@/lib/storage'

export default function QuickActionsInline({ onActionComplete }) {
  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  async function handleQuickAction(type) {
    try {
      await initDB()

      switch (type) {
        case 'gasto':
          // Mostrar prompt para monto
          const gastoMonto = window.prompt('¿Cuánto gastaste?')
          if (!gastoMonto) return

          const monto = parseFloat(gastoMonto.replace(/[^0-9.-]+/g, ''))
          if (isNaN(monto) || monto <= 0) {
            showFeedback('Monto inválido')
            return
          }

          const movimiento = {
            fecha: new Date().toISOString().slice(0, 10),
            tipo: 'gasto',
            monto: monto,
            metodo: 'efectivo',
            motivo: 'Gasto rápido',
            is_subscription: false
          }

          await addMovimiento(movimiento)
          await updateSaldo('efectivo', -monto)
          showFeedback('Gasto guardado')
          break

        case 'estado':
          // Mostrar prompt para score
          const estadoScore = window.prompt('¿Cómo te sentís? (1-10)')
          if (!estadoScore) return

          const score = parseInt(estadoScore)
          if (isNaN(score) || score < 1 || score > 10) {
            showFeedback('Score inválido (1-10)')
            return
          }

          await addLifeEntry({
            text: `Estado: ${score}/10`,
            domain: 'mental',
            meta: { mood_score: score }
          })
          showFeedback('Estado guardado')
          break

        case 'habito':
          // Mostrar prompt para hábito
          const habito = window.prompt('¿Qué hábito registraste?')
          if (!habito) return

          await addLifeEntry({
            text: habito,
            domain: 'physical',
            meta: {}
          })
          showFeedback('Hábito guardado')
          break

        case 'nota':
          // Mostrar prompt para nota
          const nota = window.prompt('Escribe tu nota')
          if (!nota) return

          await addLifeEntry({
            text: nota,
            domain: 'general',
            meta: {}
          })
          showFeedback('Nota guardada')
          break
      }

      // Callback para refrescar datos
      if (onActionComplete) {
        onActionComplete()
      }
    } catch (error) {
      console.error('Error in quick action:', error)
      showFeedback('Error al guardar')
    }
  }

  function showFeedback(message) {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => setShowToast(false), 2000)
  }

  return (
    <>
      <div className="flex items-center gap-4 justify-center">
        <button
          onClick={() => handleQuickAction('gasto')}
          className="flex flex-col items-center gap-1 group"
          title="Registrar gasto"
        >
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
            <span className="text-2xl">💸</span>
          </div>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Gasto</span>
        </button>

        <button
          onClick={() => handleQuickAction('estado')}
          className="flex flex-col items-center gap-1 group"
          title="Registrar estado mental"
        >
          <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
            <span className="text-2xl">🧠</span>
          </div>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Estado</span>
        </button>

        <button
          onClick={() => handleQuickAction('habito')}
          className="flex flex-col items-center gap-1 group"
          title="Registrar hábito"
        >
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/50 transition-colors">
            <span className="text-2xl">💪</span>
          </div>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Hábito</span>
        </button>

        <button
          onClick={() => handleQuickAction('nota')}
          className="flex flex-col items-center gap-1 group"
          title="Guardar nota"
        >
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
            <span className="text-2xl">📝</span>
          </div>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">Nota</span>
        </button>
      </div>

      {/* Toast feedback */}
      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] animate-slide-up">
          <div className="bg-zinc-800 dark:bg-zinc-700 text-white px-4 py-2 rounded-full shadow-lg">
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  )
}
