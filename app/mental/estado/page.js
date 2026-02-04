'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/ui/TopBar'
import Button from '@/components/ui/Button'
import { addLifeEntry } from '@/lib/storage'

export default function EstadoPage() {
  const router = useRouter()
  const [mood, setMood] = useState(null)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!mood) return

    setIsSubmitting(true)
    try {
      await addLifeEntry({
        text: note || `Estado: ${mood}/5`,
        domain: 'mental',
        meta: { mood_score: mood }
      })
      router.push('/mental/diario')
    } catch (error) {
      console.error('Error saving mood entry:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Estado" backHref="/mental" />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-8">
          {/* Mood Score Selection */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 text-center">
              ¿Cómo te sientes hoy?
            </h2>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  data-testid={`mood-btn-${score}`}
                  onClick={() => setMood(score)}
                  className={`
                    w-16 h-16 rounded-2xl font-bold text-xl transition-all
                    ${mood === score
                      ? 'bg-blue-600 text-white scale-110 shadow-lg'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }
                  `}
                >
                  {score}
                </button>
              ))}
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">
              1 = Muy mal · 5 = Excelente
            </p>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Notas (opcional)
            </label>
            <textarea
              data-testid="mood-note-input"
              placeholder="¿Qué te hizo sentir así?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button
            data-testid="mood-submit-btn"
            onClick={handleSubmit}
            disabled={!mood || isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
