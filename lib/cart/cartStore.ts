import { normalizeProductName } from '@/lib/ratoneando/price-storage'

const CART_KEY = 'gaston_cart'

export interface CartItem {
  productId: string
  productName: string
  quantity: number
  addedAt: string
}

interface Cart {
  items: CartItem[]
  updatedAt: string
}

function readCart(): Cart {
  if (typeof window === 'undefined') return { items: [], updatedAt: '' }
  try {
    const data = localStorage.getItem(CART_KEY)
    return data ? JSON.parse(data) : { items: [], updatedAt: '' }
  } catch {
    return { items: [], updatedAt: '' }
  }
}

function saveCart(cart: Cart): Cart {
  if (typeof window === 'undefined') return cart
  cart.updatedAt = new Date().toISOString()
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  return cart
}

export function getCart(): CartItem[] {
  return readCart().items
}

export function addToCart(productName: string, quantity: number = 1): CartItem[] {
  const cart = readCart()
  const id = normalizeProductName(productName)

  const existing = cart.items.find(item => item.productId === id)
  if (existing) {
    existing.quantity += quantity
  } else {
    cart.items.push({
      productId: id,
      productName,
      quantity,
      addedAt: new Date().toISOString(),
    })
  }

  return saveCart(cart).items
}

export function removeFromCart(productId: string): CartItem[] {
  const cart = readCart()
  cart.items = cart.items.filter(item => item.productId !== productId)
  return saveCart(cart).items
}

export function updateQuantity(productId: string, quantity: number): CartItem[] {
  const cart = readCart()
  if (quantity <= 0) {
    cart.items = cart.items.filter(item => item.productId !== productId)
  } else {
    const item = cart.items.find(i => i.productId === productId)
    if (item) item.quantity = quantity
  }
  return saveCart(cart).items
}

export function clearCart(): CartItem[] {
  return saveCart({ items: [], updatedAt: '' }).items
}

export function getCartItemCount(): number {
  return readCart().items.length
}
