'use client'

import { useState } from 'react'
import { Shield, MessageSquare, ChevronRight, Smartphone } from 'lucide-react'

interface Props {
  onDone: () => void
}

const STEPS = [
  {
    icon: Smartphone,
    title: 'Tu asistente personal',
    text: 'Gastoncito te ayuda a ver cómo estás en lo económico, mental y físico. Todo en un solo lugar.',
  },
  {
    icon: Shield,
    title: 'Tus datos son tuyos',
    text: 'Todo se guarda en tu dispositivo. Sin servidores, sin cuentas, sin compartir datos con nadie.',
  },
  {
    icon: MessageSquare,
    title: 'Empezá por el chat',
    text: 'Escribí lo que hiciste: un gasto, cómo te sentís, o si hiciste ejercicio. Gastoncito lo registra.',
  },
] as const

export default function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0)

  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  function handleNext() {
    if (isLast) {
      localStorage.setItem('gaston_onboarding_done', '1')
      onDone()
    } else {
      setStep(s => s + 1)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-[340px] w-full text-center space-y-8">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
          <Icon className="w-8 h-8 text-white dark:text-zinc-900" />
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {current.title}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {current.text}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === step
                  ? 'bg-zinc-900 dark:bg-zinc-100'
                  : 'bg-zinc-300 dark:bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm transition-all active:scale-[0.97] flex items-center justify-center gap-2"
        >
          {isLast ? 'Empezar' : 'Siguiente'}
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Skip */}
        {!isLast && (
          <button
            onClick={() => {
              localStorage.setItem('gaston_onboarding_done', '1')
              onDone()
            }}
            className="text-xs text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Saltar
          </button>
        )}
      </div>
    </div>
  )
}
