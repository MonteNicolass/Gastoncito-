'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import {
  CreditCard,
  UtensilsCrossed,
  TrendingUp,
  BookOpen,
  BarChart3,
  Search,
  Lightbulb,
  Settings,
  FileText,
  Tag,
  HardDrive,
  ChevronRight,
} from 'lucide-react'

export default function HerramientasPage() {
  const router = useRouter()

  const tools = [
    {
      icon: CreditCard,
      title: 'Herramientas Financieras',
      description: 'Calculadoras, precios, comparadores',
      href: '/herramientas/financieras',
      available: true
    },
    {
      icon: UtensilsCrossed,
      title: 'Comida',
      description: 'Registro de comidas y análisis',
      href: '/fisico/comida',
      available: true
    },
    {
      icon: TrendingUp,
      title: 'Inversiones',
      description: 'Seguimiento de cartera y volatilidad',
      href: '/money/inversiones',
      available: true
    },
    {
      icon: BookOpen,
      title: 'Aprendizaje',
      description: 'Trackeo de estudio y temas',
      href: '/aprendizaje',
      available: true
    },
    {
      icon: BarChart3,
      title: 'Reportes',
      description: 'Exportación y análisis',
      href: '/historia',
      available: true
    },
    {
      icon: Search,
      title: 'Comportamiento',
      description: 'Patrones y alertas tempranas',
      href: '/comportamiento',
      available: true
    },
    {
      icon: Lightbulb,
      title: 'Insights',
      description: 'Cruces entre áreas',
      href: '/insights',
      available: true
    },
    {
      icon: Settings,
      title: 'Configuración',
      description: 'Ajustes generales',
      href: '/mas/settings',
      available: true
    },
    {
      icon: FileText,
      title: 'Reglas',
      description: 'Reglas personalizadas',
      href: '/mas/reglas',
      available: true
    },
    {
      icon: Tag,
      title: 'Categorías',
      description: 'Gestionar categorías',
      href: '/mas/categorias',
      available: true
    },
    {
      icon: HardDrive,
      title: 'Backup & Datos',
      description: 'Exportar e importar',
      href: '/mas/backup',
      available: true
    }
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Herramientas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {tools.map((tool, i) => {
          const ToolIcon = tool.icon
          return (
          <Card
            key={i}
            className={`p-4 ${tool.available ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50' : 'opacity-50'} transition-colors`}
            onClick={() => tool.available && router.push(tool.href)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <ToolIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {tool.title}
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {tool.description}
                </p>
              </div>
              {tool.available && (
                <ChevronRight className="w-5 h-5 text-zinc-400" />
              )}
            </div>
          </Card>
          )
        })}
      </div>
    </div>
  )
}
