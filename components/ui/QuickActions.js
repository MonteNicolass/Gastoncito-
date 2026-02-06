'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { MessageCircle, ShoppingCart } from 'lucide-react'
import { getCartItemCount } from '@/lib/cart/cartStore'

/**
 * Global FABs:
 * - Chat FAB: always visible except on /chat
 * - Cart FAB: visible only when cart has items, except on /cart
 */
export default function QuickActions() {
  const pathname = usePathname()
  const router = useRouter()
  const [cartCount, setCartCount] = useState(0)

  useEffect(() => {
    try {
      setCartCount(getCartItemCount())
    } catch { /* silent */ }
  }, [pathname])

  const isOnChat = pathname === '/chat'
  const isOnCart = pathname === '/cart'

  if (isOnChat && (isOnCart || cartCount === 0)) return null

  return (
    <>
      {/* Cart FAB — only when items exist, not on /cart */}
      {cartCount > 0 && !isOnCart && (
        <button
          onClick={() => router.push('/cart')}
          className="fixed bottom-[7.5rem] right-4 z-50 w-11 h-11 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-90"
          aria-label="Carrito"
        >
          <ShoppingCart className="w-4.5 h-4.5" strokeWidth={1.75} />
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-terra-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {cartCount}
          </span>
        </button>
      )}

      {/* Chat FAB — always visible except on /chat */}
      {!isOnChat && (
        <button
          onClick={() => router.push('/chat')}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full shadow-xl flex items-center justify-center transition-all active:scale-90 hover:shadow-2xl"
          aria-label="Registrar en chat"
        >
          <MessageCircle className="w-6 h-6" strokeWidth={2} />
        </button>
      )}
    </>
  )
}
