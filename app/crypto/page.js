'use client'

import { useState, useEffect } from 'react'
import { initDB, getCrypto, setCrypto, deleteCrypto } from '@/lib/storage'

export default function CryptoPage() {
  const [holdings, setHoldings] = useState([])
  const [symbol, setSymbol] = useState('')
  const [amount, setAmount] = useState('')
  const [exchange, setExchange] = useState('')

  useEffect(() => {
    const load = async () => {
      await initDB()
      const cryptoData = await getCrypto()
      setHoldings(cryptoData)
    }
    load()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!symbol.trim() || !amount) return

    await setCrypto(symbol.trim().toUpperCase(), parseFloat(amount), exchange.trim() || null)
    setSymbol('')
    setAmount('')
    setExchange('')

    const cryptoData = await getCrypto()
    setHoldings(cryptoData)
  }

  const handleDelete = async (sym) => {
    if (!confirm('¿Eliminar esta tenencia?')) return
    await deleteCrypto(sym)
    const cryptoData = await getCrypto()
    setHoldings(cryptoData)
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="border-b border-stone-200 bg-white px-4 py-3 sticky top-0">
        <h1 className="text-sm font-bold">Crypto</h1>
        <p className="text-xs text-stone-500">Registro de tenencias</p>
      </header>

      <div className="p-4 space-y-4">
        <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
          <div>
            <label className="text-xs text-stone-600 block mb-1">Símbolo (ej: BTC, ETH)</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="BTC"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Cantidad</label>
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.5"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <div>
            <label className="text-xs text-stone-600 block mb-1">Exchange (opcional)</label>
            <input
              type="text"
              value={exchange}
              onChange={(e) => setExchange(e.target.value)}
              placeholder="Binance"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
          >
            Guardar
          </button>
        </form>

        {holdings.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-4 text-center text-sm text-stone-500">
            No hay tenencias registradas.
          </div>
        ) : (
          <div className="space-y-2">
            {holdings.map((holding) => (
              <div
                key={holding.symbol}
                className="rounded-lg border border-stone-200 bg-white p-3 flex justify-between items-center"
              >
                <div>
                  <div className="text-sm font-semibold">{holding.symbol}</div>
                  <div className="text-xs text-stone-500">
                    {holding.cantidad} {holding.exchange && `• ${holding.exchange}`}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(holding.symbol)}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}