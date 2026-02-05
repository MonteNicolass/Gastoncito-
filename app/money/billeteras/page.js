'use client'

import { useState, useEffect } from 'react'
import { initDB, getWallets, addWallet, updateWallet, deleteWallet } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

// Opciones de billeteras (nombre = proveedor)
const WALLET_OPTIONS = [
  { value: 'Efectivo', label: 'Efectivo' },
  { value: 'Mercado Pago', label: 'Mercado Pago' },
  { value: 'Banco Nación', label: 'Banco Nación' },
  { value: 'Banco Galicia', label: 'Banco Galicia' },
  { value: 'BBVA', label: 'BBVA' },
  { value: 'Santander', label: 'Santander' },
  { value: 'Brubank', label: 'Brubank' },
  { value: 'Ualá', label: 'Ualá' },
  { value: 'Lemon', label: 'Lemon' },
  { value: 'Binance', label: 'Binance' },
  { value: 'Otro', label: 'Otro' }
]

export default function BilleterasPage() {
  const [wallets, setWallets] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingWallet, setEditingWallet] = useState(null)
  const [formData, setFormData] = useState({
    proveedor: '',
    saldo: '',
    isPrimary: false,
    isHidden: false
  })

  useEffect(() => {
    initDB().then(loadWallets)
  }, [])

  const loadWallets = async () => {
    const data = await getWallets()
    // Ordenar: principal primero, luego por nombre
    const sorted = data.sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      return (a.wallet || '').localeCompare(b.wallet || '')
    })
    setWallets(sorted)
  }

  const handleOpenModal = (wallet = null) => {
    if (wallet) {
      setEditingWallet(wallet)
      setFormData({
        proveedor: wallet.wallet,
        saldo: wallet.saldo.toString(),
        isPrimary: wallet.is_primary || false,
        isHidden: wallet.is_hidden || false
      })
    } else {
      setEditingWallet(null)
      setFormData({
        proveedor: '',
        saldo: '',
        isPrimary: false,
        isHidden: false
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingWallet(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.proveedor || formData.saldo === '') return

    const walletData = {
      wallet: formData.proveedor,
      saldo: parseFloat(formData.saldo),
      proveedor: formData.proveedor,
      is_primary: formData.isPrimary,
      is_hidden: formData.isHidden
    }

    await addWallet(walletData.wallet, walletData.saldo, walletData)
    setShowModal(false)
    await loadWallets()
  }

  const handleDelete = async (wallet) => {
    if (!confirm(`¿Eliminar ${wallet}?`)) return
    await deleteWallet(wallet)
    await loadWallets()
  }

  const handleTogglePrimary = async (wallet) => {
    // Primero quitar el flag de todos
    for (const w of wallets) {
      if (w.wallet === wallet && !w.is_primary) {
        await addWallet(wallet, w.saldo, { ...w, is_primary: true })
      } else if (w.wallet !== wallet && w.is_primary) {
        await addWallet(w.wallet, w.saldo, { ...w, is_primary: false })
      }
    }
    await loadWallets()
  }

  const handleToggleHidden = async (wallet) => {
    const w = wallets.find(x => x.wallet === wallet)
    if (w) {
      await addWallet(wallet, w.saldo, { ...w, is_hidden: !w.is_hidden })
      await loadWallets()
    }
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const visibleWallets = wallets.filter(w => !w.is_hidden)
  const hiddenWallets = wallets.filter(w => w.is_hidden)

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Billeteras" backHref="/money" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Botón agregar */}
        <Button
          onClick={() => handleOpenModal()}
          variant="primary"
          className="w-full"
        >
          Nueva billetera
        </Button>

        {/* Lista de billeteras visibles */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis billeteras
          </h2>
          {visibleWallets.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Sin billeteras aún
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Creá tu primera billetera arriba
              </p>
            </Card>
          ) : (
            visibleWallets.map((w) => (
              <Card
                key={w.wallet}
                className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {w.wallet}
                      </div>
                      {w.is_primary && (
                        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          Principal
                        </span>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {formatAmount(w.saldo)}
                    </div>
                  </div>
                  {/* Menú contextual */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() => handleOpenModal(w)}
                      className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                      aria-label="Opciones"
                    >
                      <svg className="w-5 h-5 text-zinc-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Billeteras ocultas */}
        {hiddenWallets.length > 0 && (
          <details className="space-y-2">
            <summary className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1 cursor-pointer">
              Ocultas ({hiddenWallets.length})
            </summary>
            <div className="space-y-2 mt-2">
              {hiddenWallets.map((w) => (
                <Card
                  key={w.wallet}
                  className="p-3 opacity-60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {w.wallet}
                      </div>
                      <div className="text-lg font-bold text-zinc-600 dark:text-zinc-400">
                        {formatAmount(w.saldo)}
                      </div>
                    </div>
                    <Button
                      onClick={() => handleToggleHidden(w.wallet)}
                      variant="ghost"
                      size="sm"
                    >
                      Mostrar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </details>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-xl animate-slide-up">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {editingWallet ? 'Editar billetera' : 'Nueva billetera'}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <Select
                label="Proveedor"
                value={formData.proveedor}
                onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                required
              >
                <option value="">Seleccionar...</option>
                {WALLET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <Input
                label="Saldo inicial"
                type="number"
                placeholder="0"
                value={formData.saldo}
                onChange={(e) => setFormData({ ...formData, saldo: e.target.value })}
                required
              />

              <div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                <input
                  type="checkbox"
                  id="isPrimary"
                  checked={formData.isPrimary}
                  onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
                  className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPrimary" className="text-sm text-zinc-700 dark:text-zinc-300">
                  Marcar como principal
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                {editingWallet && (
                  <>
                    <Button
                      type="button"
                      onClick={() => {
                        handleToggleHidden(editingWallet.wallet)
                        handleCloseModal()
                      }}
                      variant="ghost"
                      className="flex-1"
                    >
                      {editingWallet.is_hidden ? 'Mostrar' : 'Ocultar'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        handleDelete(editingWallet.wallet)
                        handleCloseModal()
                      }}
                      variant="danger"
                      className="flex-1"
                    >
                      Eliminar
                    </Button>
                  </>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                >
                  {editingWallet ? 'Guardar' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
