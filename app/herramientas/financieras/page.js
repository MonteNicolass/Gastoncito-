'use client'

import { useRouter } from 'next/navigation'
import TopBar from '@/components/ui/TopBar'
import AssetQuotesCard from '@/components/AssetQuotesCard'
import InstallmentsVsCashCard from '@/components/InstallmentsVsCashCard'
import { ShoppingCart, BarChart3, ChevronRight } from 'lucide-react'

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
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Comparadores de precios
          </h3>

          <div className="space-y-1.5">
            <button
              onClick={() => router.push('/money/comparador')}
              className="w-full p-3 rounded-xl text-left bg-white dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
            >
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Comparador de productos
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Compará precios entre tiendas con tus datos
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>

            <button
              onClick={() => router.push('/money/carrito')}
              className="w-full p-3 rounded-xl text-left bg-white dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-3"
            >
              <ShoppingCart className="w-5 h-5 text-emerald-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Carrito de compras
                </p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Armá tu lista y optimizá dónde comprar
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
