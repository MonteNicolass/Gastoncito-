'use client'

import { useState, useEffect } from 'react'
import { initDB, getWallets, addWallet, updateWallet, deleteWallet } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function BilleterasPage() {
  const [wallets, setWallets] = useState([])
  const [nombre, setNombre] = useState('')
  const [saldo, setSaldo] = useState('')
  const [editingWallet, setEditingWallet] = useState(null)

  useEffect(() => {
    initDB().then(loadWallets)
  }, [])

  const loadWallets = async () => {
    const data = await getWallets()
    setWallets(data)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!nombre.trim() || !saldo) return
    await addWallet(nombre.trim(), parseFloat(saldo))
    setNombre('')
    setSaldo('')
    await loadWallets()
  }

  const handleEdit = async (wallet) => {
    const newSaldo = prompt(`Nuevo saldo para ${wallet.wallet}:`, wallet.saldo)
    if (newSaldo === null) return
    await updateWallet(wallet.wallet, parseFloat(newSaldo))
    await loadWallets()
  }

  const handleDelete = async (wallet) => {
    if (!confirm(`¿Eliminar ${wallet}?`)) return
    await deleteWallet(wallet)
    await loadWallets()
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Billeteras" backHref="/money" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Formulario para agregar */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Nueva billetera
          </h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <Input
              label="Nombre"
              type="text"
              placeholder="Efectivo, Mercado Pago, etc."
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
            <Input
              label="Saldo inicial"
              type="number"
              placeholder="0"
              value={saldo}
              onChange={(e) => setSaldo(e.target.value)}
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full"
            >
              Crear billetera
            </Button>
          </form>
        </Card>

        {/* Lista de billeteras */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis billeteras
          </h2>
          {wallets.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No hay billeteras creadas.
              </p>
            </Card>
          ) : (
            wallets.map((w) => (
              <Card
                key={w.wallet}
                className="p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {w.wallet}
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {formatAmount(w.saldo)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      onClick={() => handleEdit(w)}
                      variant="ghost"
                      size="sm"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => handleDelete(w.wallet)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
