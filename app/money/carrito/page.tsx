'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import CartItem from '@/components/CartItem'
import CartSummary from '@/components/CartSummary'
import {
  getCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
} from '@/lib/cart/cartStore'
import { analyzeCart } from '@/lib/cart/cartOptimizer'
import { getTrackedProducts, getCheapestOption } from '@/lib/ratoneando/price-storage'
import {
  ShoppingCart,
  Plus,
  Search,
  BarChart3,
  X,
  Package,
} from 'lucide-react'

interface TrackedProduct {
  product_name: string
  supermarket: string
  price: number
}

function formatARS(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function CarritoPage() {
  const router = useRouter()
  const [items, setItems] = useState(getCart())
  const [showAddModal, setShowAddModal] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const trackedProducts: TrackedProduct[] = useMemo(() => getTrackedProducts(), [])

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return trackedProducts
    const q = searchQuery.toLowerCase()
    return trackedProducts.filter((p) => p.product_name.toLowerCase().includes(q))
  }, [trackedProducts, searchQuery])

  const cheapestMap = useMemo(() => {
    const map = new Map<string, { price: number; supermarket: string }>()
    for (const item of items) {
      const cheapest = getCheapestOption(item.productName)
      if (cheapest) {
        map.set(item.productId, { price: cheapest.price, supermarket: cheapest.supermarket })
      }
    }
    return map
  }, [items])

  const estimatedTotal = useMemo(() => {
    let total = 0
    for (const item of items) {
      const cheapest = cheapestMap.get(item.productId)
      if (cheapest) total += cheapest.price * item.quantity
    }
    return total
  }, [items, cheapestMap])

  const analysis = useMemo(() => {
    if (!showResults || items.length === 0) return null
    return analyzeCart(items)
  }, [showResults, items])

  function handleAddProduct(productName: string) {
    const updated = addToCart(productName)
    setItems(updated)
    setShowAddModal(false)
    setSearchQuery('')
  }

  function handleQuantityChange(productId: string, quantity: number) {
    const updated = updateQuantity(productId, quantity)
    setItems(updated)
    setShowResults(false)
  }

  function handleRemove(productId: string) {
    const updated = removeFromCart(productId)
    setItems(updated)
    setShowResults(false)
  }

  function handleClear() {
    const updated = clearCart()
    setItems(updated)
    setShowResults(false)
  }

  const cartProductIds = new Set(items.map(i => i.productId))

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-24">
      <TopBar
        title="Carrito"
        backHref="/herramientas/financieras"
        action={
          items.length > 0 ? (
            <button
              onClick={handleClear}
              className="text-xs text-red-500 hover:text-red-600 font-medium active:scale-95 transition-all"
            >
              Vaciar
            </button>
          ) : null
        }
      />

      <div className="px-4 pt-4 space-y-4">
        {/* Empty state */}
        {items.length === 0 && !showAddModal && (
          <Card className="p-8 text-center">
            <ShoppingCart className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Tu carrito está vacío
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              Agregá productos para comparar precios entre supermercados
            </p>
            {trackedProducts.length > 0 ? (
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold active:scale-95 transition-transform"
                >
                  <Plus className="w-4 h-4" />
                  Agregar productos
                </button>
                <button
                  onClick={() => router.push('/money/comparador')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold active:scale-95 transition-transform"
                >
                  Comparador
                </button>
              </div>
            ) : (
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Registrá compras en el chat para tener productos disponibles
              </p>
            )}
          </Card>
        )}

        {/* Cart items list */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-zinc-500" />
                <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Productos · {items.length}
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1 text-xs font-medium text-blue-500 active:scale-95 transition-transform"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </div>

            <div className="space-y-1.5">
              {items.map((item) => {
                const cheapest = cheapestMap.get(item.productId)
                return (
                  <CartItem
                    key={item.productId}
                    productId={item.productId}
                    productName={item.productName}
                    quantity={item.quantity}
                    cheapestPrice={cheapest?.price ?? null}
                    cheapestStore={cheapest?.supermarket ?? null}
                    onQuantityChange={handleQuantityChange}
                    onRemove={handleRemove}
                  />
                )
              })}
            </div>

            {estimatedTotal > 0 && (
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Estimado (mejor precio c/u)
                </span>
                <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 tabular-nums">
                  {formatARS(estimatedTotal)}
                </span>
              </div>
            )}

            {!showResults && (
              <button
                onClick={() => setShowResults(true)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-emerald-500/20"
              >
                <BarChart3 className="w-4 h-4" />
                Comparar precios
              </button>
            )}
          </div>
        )}

        {/* Analysis results */}
        {showResults && analysis && (
          <div className="space-y-4">
            {analysis.hasEnoughData ? (
              <CartSummary analysis={analysis} cartItemCount={items.length} />
            ) : (
              <Card className="p-6 text-center">
                <BarChart3 className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No hay suficientes datos de precios para comparar.
                </p>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setShowAddModal(false); setSearchQuery('') }}
          />
          <div className="relative w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl animate-slide-up max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Agregar producto
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setSearchQuery('') }}
                className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-zinc-500" />
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none focus:ring-2 ring-blue-500/30"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-1">
              {filteredProducts.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-6">
                  {trackedProducts.length === 0
                    ? 'No hay productos registrados aún'
                    : 'No se encontraron productos'}
                </p>
              ) : (
                filteredProducts.map((p) => {
                  const id = p.product_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '_')
                  const inCart = cartProductIds.has(id)
                  return (
                    <button
                      key={p.product_name}
                      onClick={() => handleAddProduct(p.product_name)}
                      disabled={inCart}
                      className={`w-full p-3 rounded-xl text-left flex items-center justify-between transition-all active:scale-[0.98] ${
                        inCart
                          ? 'bg-zinc-50 dark:bg-zinc-800/30 opacity-50'
                          : 'bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {p.product_name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatARS(p.price)} en {p.supermarket}
                        </p>
                      </div>
                      {inCart ? (
                        <span className="text-[10px] text-zinc-400 font-medium">En carrito</span>
                      ) : (
                        <Plus className="w-4 h-4 text-blue-500" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
