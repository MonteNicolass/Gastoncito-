'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, Wallet, Tag, Check, ArrowRight, Repeat } from 'lucide-react'

/**
 * QuickAddModal - Ultra-fast expense registration
 *
 * Goals:
 * - 1 step add
 * - Smart autocomplete
 * - Pattern detection
 * - No confirmations
 */
export default function QuickAddModal({
  isOpen,
  onClose,
  onAdd,
  suggestions = null,
  shortcuts = [],
  wallets = []
}) {
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState(null)
  const [showShortcuts, setShowShortcuts] = useState(true)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      setInput('')
      setPreview(null)
      setShowShortcuts(true)
    }
  }, [isOpen])

  useEffect(() => {
    if (!input) {
      setPreview(null)
      setShowShortcuts(true)
      return
    }

    setShowShortcuts(false)

    // Parse input for preview
    const parts = input.trim().split(/\s+/)
    let amount = null
    let description = []

    for (const part of parts) {
      if (/^\d+([.,]\d+)?$/.test(part)) {
        if (!amount) amount = parseFloat(part.replace(',', '.'))
      } else {
        description.push(part)
      }
    }

    if (amount || description.length > 0) {
      setPreview({
        monto: amount || suggestions?.amount || 0,
        motivo: description.length > 0 ? description.join(' ') : suggestions?.merchant || '',
        metodo: suggestions?.wallet || wallets.find(w => w.is_primary)?.nombre || 'efectivo'
      })
    }
  }, [input, suggestions, wallets])

  const handleSubmit = (e) => {
    e?.preventDefault()

    if (!preview || !preview.monto) return

    onAdd({
      ...preview,
      tipo: 'gasto',
      fecha: new Date().toISOString().slice(0, 10)
    })

    onClose()
  }

  const handleShortcutClick = (shortcut) => {
    onAdd({
      monto: shortcut.suggestedAmount,
      motivo: shortcut.motivo,
      metodo: shortcut.metodo || 'efectivo',
      tipo: 'gasto',
      fecha: new Date().toISOString().slice(0, 10),
      category_id: shortcut.category_id
    })

    onClose()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-3xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Nuevo gasto
          </h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="px-5 py-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: 1500 almuerzo"
              className="w-full px-4 py-3.5 pr-12 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all text-lg"
            />
            <button
              onClick={handleSubmit}
              disabled={!preview?.monto}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-white rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-600 active:scale-95 transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          {/* Preview */}
          {preview && preview.monto > 0 && (
            <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    ${preview.monto.toLocaleString('es-AR')}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {preview.motivo || 'Sin descripción'}
                  </p>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg">
                  <Wallet className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    {preview.metodo}
                  </span>
                </div>
              </div>

              {suggestions?.category && (
                <div className="flex items-center gap-1 mt-3">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Categoría sugerida: {suggestions.category}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Shortcuts */}
          {showShortcuts && shortcuts.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                Gastos frecuentes
              </p>
              <div className="space-y-2">
                {shortcuts.slice(0, 4).map((shortcut, i) => (
                  <button
                    key={i}
                    onClick={() => handleShortcutClick(shortcut)}
                    className="w-full flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                        <Repeat className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {shortcut.motivo}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          ~${shortcut.suggestedAmount.toLocaleString('es-AR')} / {shortcut.count}x
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Help text */}
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4 text-center">
            Tip: escribí monto + descripción. Ej: "800 uber" o "nafta 5000 mp"
          </p>
        </div>

        {/* Footer spacer for mobile */}
        <div className="h-6 sm:hidden" />
      </div>
    </div>
  )
}
