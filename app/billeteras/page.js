'use client'

import { useState, useEffect } from 'react'
import { initDB, getWallets, addWallet, updateWallet, deleteWallet } from '@/lib/storage'

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

  const handleCreate = async () => {
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

  return (
    <div style={{ padding: 20 }}>
      <h1>Billeteras</h1>

      <div style={{ marginBottom: 20, padding: 10, border: '1px solid #ccc' }}>
        <input
          type="text"
          placeholder="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          style={{ marginRight: 10, padding: 5 }}
        />
        <input
          type="number"
          placeholder="Saldo"
          value={saldo}
          onChange={(e) => setSaldo(e.target.value)}
          style={{ marginRight: 10, padding: 5 }}
        />
        <button onClick={handleCreate} style={{ padding: 5 }}>
          Crear
        </button>
      </div>

      <div>
        {wallets.length === 0 ? (
          <p>No hay billeteras.</p>
        ) : (
          wallets.map((w) => (
            <div
              key={w.wallet}
              style={{
                padding: 10,
                marginBottom: 10,
                border: '1px solid #ddd',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <strong>{w.wallet}</strong> - ${w.saldo}
              </div>
              <div>
                <button onClick={() => handleEdit(w)} style={{ marginRight: 5 }}>
                  Editar
                </button>
                <button onClick={() => handleDelete(w.wallet)}>Eliminar</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}