'use client'

import { useState } from 'react'
import Button from './Button'

/**
 * Componente para gestionar orden y visibilidad de cards
 */
export default function CardManager({ section, cards, preferences, onUpdate }) {
  const [showModal, setShowModal] = useState(false)

  const handleToggleVisibility = (cardId) => {
    const visible = preferences.visibleCards
    const newVisible = visible.includes(cardId)
      ? visible.filter(id => id !== cardId)
      : [...visible, cardId]

    onUpdate({ visibleCards: newVisible })
  }

  const handleMoveUp = (cardId) => {
    const order = [...preferences.cardOrder]
    const index = order.indexOf(cardId)

    if (index <= 0) return

    const [movedCard] = order.splice(index, 1)
    order.splice(index - 1, 0, movedCard)

    onUpdate({ cardOrder: order })
  }

  const handleMoveDown = (cardId) => {
    const order = [...preferences.cardOrder]
    const index = order.indexOf(cardId)

    if (index === -1 || index >= order.length - 1) return

    const [movedCard] = order.splice(index, 1)
    order.splice(index + 1, 0, movedCard)

    onUpdate({ cardOrder: order })
  }

  if (!showModal) {
    return (
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 bg-blue-600 dark:bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
        aria-label="Personalizar"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-xl animate-slide-up max-h-[80vh] overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Personalizar cards
            </h3>
            <button
              onClick={() => setShowModal(false)}
              className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {preferences.cardOrder.map((cardId, index) => {
            const card = cards[cardId]
            if (!card) return null

            const isVisible = preferences.visibleCards.includes(cardId)
            const isFirst = index === 0
            const isLast = index === preferences.cardOrder.length - 1

            return (
              <div
                key={cardId}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  isVisible
                    ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                    : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-300 dark:border-zinc-600 opacity-50'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleMoveUp(cardId)}
                    disabled={isFirst}
                    className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleMoveDown(cardId)}
                    disabled={isLast}
                    className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {card.title}
                  </div>
                  {card.description && (
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {card.description}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleToggleVisibility(cardId)}
                  className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors ${
                    isVisible
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : 'bg-zinc-300 dark:bg-zinc-600'
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full transition-transform ${
                      isVisible ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            )
          })}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <Button
            onClick={() => setShowModal(false)}
            variant="primary"
            className="w-full"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
