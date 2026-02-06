'use client'

import { useRouter } from 'next/navigation'
import TopBar from '@/components/ui/TopBar'
import AssetQuotesCard from '@/components/AssetQuotesCard'
import InstallmentsVsCashCard from '@/components/InstallmentsVsCashCard'
import { ShoppingCart, BarChart3, ChevronRight, ClipboardList } from 'lucide-react'

export default function HerramientasFinancierasPage() {
  const router = useRouter()

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <TopBar title="Herramientas Financieras" backHref="/herramientas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Cotizaciones in-app */}
        <AssetQuotesCard />

        {/* Cuotas vs Contado */}
        <InstallmentsVsCashCard />

        {/* Comparadores internos */}
        <div className="space-y-2">
          <h3 className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">
            Comparadores de precios
          </h3>

          <div className="space-y-1.5">
            <button
              onClick={() => router.push('/money/comparador')}
              className="w-full p-3.5 rounded-2xl text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] flex items-center gap-3"
            >
              <BarChart3 className="w-4 h-4 text-terra-500" strokeWidth={1.75} />
              <div className="flex-1">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Comparador de productos
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Compará precios entre tiendas con tus datos
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
            </button>

            <button
              onClick={() => router.push('/money/carrito')}
              className="w-full p-3.5 rounded-2xl text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] flex items-center gap-3"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
              <div className="flex-1">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Carrito de compras
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Armá tu lista y optimizá dónde comprar
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
            </button>

            <button
              onClick={() => router.push('/money/decisiones')}
              className="w-full p-3.5 rounded-2xl text-left bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/50 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all active:scale-[0.98] flex items-center gap-3"
            >
              <ClipboardList className="w-4 h-4 text-zinc-500" strokeWidth={1.75} />
              <div className="flex-1">
                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                  Decisiones financieras
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Historial de análisis y optimizaciones guardados
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
