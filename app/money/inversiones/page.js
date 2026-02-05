'use client'

import { useState, useEffect } from 'react'
import { initDB } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'

// localStorage key for investments
const INVESTMENTS_KEY = 'gaston_investments'

function getInvestments() {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(INVESTMENTS_KEY)
  return data ? JSON.parse(data) : []
}

function saveInvestments(investments) {
  if (typeof window === 'undefined') return
  localStorage.setItem(INVESTMENTS_KEY, JSON.stringify(investments))
}

export default function InversionesPage() {
  const [investments, setInvestments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    type: 'cripto',
    amount: '',
    initialValue: ''
  })

  useEffect(() => {
    loadInvestments()
  }, [])

  async function loadInvestments() {
    try {
      await initDB()
      const savedInvestments = getInvestments()
      setInvestments(savedInvestments)
    } catch (error) {
      console.error('Error loading investments:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleAddInvestment() {
    const investment = {
      id: Date.now().toString(),
      name: newInvestment.name,
      type: newInvestment.type,
      amount: parseFloat(newInvestment.amount) || 0,
      initialValue: parseFloat(newInvestment.initialValue) || 0,
      currentValue: parseFloat(newInvestment.initialValue) || 0, // Initially same as initial
      date: new Date().toISOString(),
      history: [{
        date: new Date().toISOString(),
        value: parseFloat(newInvestment.initialValue) || 0
      }]
    }

    const updated = [...investments, investment]
    saveInvestments(updated)
    setInvestments(updated)
    setShowAddModal(false)
    setNewInvestment({ name: '', type: 'cripto', amount: '', initialValue: '' })
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const calculateTotalValue = () => {
    return investments.reduce((sum, inv) => sum + inv.currentValue, 0)
  }

  const calculateTotalInvested = () => {
    return investments.reduce((sum, inv) => sum + inv.initialValue, 0)
  }

  const calculateReturn = () => {
    const total = calculateTotalValue()
    const invested = calculateTotalInvested()
    if (invested === 0) return 0
    return ((total - invested) / invested) * 100
  }

  const getTypeEmoji = (type) => {
    const emojis = {
      cripto: '₿',
      acciones: '📈',
      bonos: '📊',
      fci: '💼',
      cedears: '🌎',
      otro: '💰'
    }
    return emojis[type] || '💰'
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Inversiones" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Cargando...</p>
        </div>
      </div>
    )
  }

  const totalValue = calculateTotalValue()
  const totalInvested = calculateTotalInvested()
  const returnPercent = calculateReturn()

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Inversiones" backHref="/money" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Portfolio Summary */}
        {investments.length > 0 && (
          <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📈</span>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Resumen de Cartera</h3>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Valor actual</span>
                <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  {formatAmount(totalValue)}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Invertido</span>
                <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                  {formatAmount(totalInvested)}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-2 border-t border-green-200 dark:border-green-800">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Rentabilidad</span>
                <span className={`text-lg font-bold ${returnPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {returnPercent >= 0 ? '+' : ''}{returnPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Info Card */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">💼</span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Seguimiento Simple</h3>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Registrá tus inversiones, seguí su variación y analizá la volatilidad. Sin recomendaciones, solo datos descriptivos.
          </p>
        </Card>

        {/* Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition-colors"
        >
          + Agregar inversión
        </button>

        {/* Investments List */}
        {investments.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-4xl mb-4">💼</div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin inversiones registradas
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Empezá a registrar tus inversiones para hacer seguimiento
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {investments.map((inv) => {
              const gainLoss = inv.currentValue - inv.initialValue
              const gainLossPercent = inv.initialValue > 0 ? ((gainLoss / inv.initialValue) * 100) : 0

              return (
                <Card key={inv.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{getTypeEmoji(inv.type)}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {inv.name}
                      </h4>
                      <span className="inline-block text-xs text-zinc-600 dark:text-zinc-400 capitalize">
                        {inv.type} · {inv.amount} unidades
                      </span>

                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">Valor actual</div>
                          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {formatAmount(inv.currentValue)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${gainLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%
                          </div>
                          <div className={`text-xs ${gainLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {gainLoss >= 0 ? '+' : ''}{formatAmount(gainLoss)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-end" onClick={() => setShowAddModal(false)}>
          <div
            className="w-full max-w-[420px] mx-auto bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Agregar inversión</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-6 h-6 text-zinc-600 dark:text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={newInvestment.name}
                  onChange={(e) => setNewInvestment({ ...newInvestment, name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  placeholder="Ej: Bitcoin, AAPL, etc."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Tipo</label>
                <select
                  value={newInvestment.type}
                  onChange={(e) => setNewInvestment({ ...newInvestment, type: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                >
                  <option value="cripto">Cripto</option>
                  <option value="acciones">Acciones</option>
                  <option value="bonos">Bonos</option>
                  <option value="fci">FCI</option>
                  <option value="cedears">CEDEARs</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Cantidad</label>
                <input
                  type="number"
                  step="0.01"
                  value={newInvestment.amount}
                  onChange={(e) => setNewInvestment({ ...newInvestment, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  placeholder="Ej: 0.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Valor inicial (ARS)</label>
                <input
                  type="number"
                  step="1"
                  value={newInvestment.initialValue}
                  onChange={(e) => setNewInvestment({ ...newInvestment, initialValue: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                  placeholder="Ej: 50000"
                />
              </div>

              <button
                onClick={handleAddInvestment}
                disabled={!newInvestment.name.trim() || !newInvestment.amount || !newInvestment.initialValue}
                className="w-full py-3 px-4 rounded-xl bg-green-600 hover:bg-green-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
