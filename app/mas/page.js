'use client'

import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { useRouter } from 'next/navigation'
import {
  Dumbbell,
  StickyNote,
  Target,
  Wrench,
  Search,
  TrendingUp,
  CalendarDays,
  History,
  Calendar,
  CalendarRange,
  CalendarClock,
  Settings,
  ListChecks,
  Tags,
  Database,
  ChevronRight
} from 'lucide-react'

function NavRow({ icon: Icon, label, href, iconColor = 'text-zinc-500 dark:text-zinc-400' }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(href)}
      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
    >
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <span className="flex-1 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</span>
      <ChevronRight className="w-4 h-4 text-zinc-400" />
    </button>
  )
}

export default function MasPage() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Más" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Áreas principales */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Áreas
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <NavRow icon={Dumbbell} label="Físico" href="/fisico" iconColor="text-orange-500 dark:text-orange-400" />
            <NavRow icon={StickyNote} label="Notas" href="/notas" iconColor="text-terra-500 dark:text-terra-400" />
            <NavRow icon={Target} label="Objetivos" href="/objetivos" iconColor="text-zinc-500 dark:text-zinc-400" />
            <NavRow icon={Wrench} label="Herramientas" href="/herramientas" iconColor="text-zinc-500 dark:text-zinc-400" />
          </Card>
        </div>

        {/* Análisis */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Análisis
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <NavRow icon={Search} label="Comportamiento" href="/comportamiento" />
            <NavRow icon={TrendingUp} label="Insights cruzados" href="/insights" />
            <NavRow icon={CalendarDays} label="Eventos" href="/eventos" />
            <NavRow icon={History} label="Historia" href="/historia" />
          </Card>
        </div>

        {/* Temporal */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Vistas temporales
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <NavRow icon={Calendar} label="Hoy" href="/hoy" />
            <NavRow icon={CalendarRange} label="Semana" href="/semana" />
            <NavRow icon={CalendarClock} label="Mes" href="/mes" />
          </Card>
        </div>

        {/* Configuración */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Configuración
          </h3>
          <Card className="overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
            <NavRow icon={Settings} label="Configuración" href="/mas/settings" />
            <NavRow icon={ListChecks} label="Reglas" href="/mas/reglas" />
            <NavRow icon={Tags} label="Categorías" href="/mas/categorias" />
            <NavRow icon={Database} label="Backup & Datos" href="/mas/backup" />
            <NavRow icon={Search} label="Búsqueda" href="/busqueda" />
          </Card>
        </div>
      </div>
    </div>
  )
}
