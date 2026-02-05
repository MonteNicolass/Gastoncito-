'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { useRouter } from 'next/navigation'

export default function HerramientasPage() {
  const router = useRouter()

  const tools = [
    {
      emoji: '🍔',
      title: 'Comida',
      description: 'Registro de comidas y análisis',
      href: '/fisico/comida',
      available: true
    },
    {
      emoji: '📈',
      title: 'Inversiones',
      description: 'Seguimiento de cartera y volatilidad',
      href: '/money/inversiones',
      available: true
    },
    {
      emoji: '📊',
      title: 'Reportes',
      description: 'Exportación y análisis',
      href: '/historia',
      available: true
    },
    {
      emoji: '⚙️',
      title: 'Ajustes',
      description: 'Configuración general',
      href: '/mas',
      available: true
    }
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Herramientas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {tools.map((tool, i) => (
          <Card
            key={i}
            className={`p-4 ${tool.available ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50' : 'opacity-50'} transition-colors`}
            onClick={() => tool.available && router.push(tool.href)}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl">{tool.emoji}</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {tool.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {tool.description}
                </p>
              </div>
              {tool.available && (
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
