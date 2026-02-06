'use client'

import { useState, useEffect, useCallback } from 'react'
import { initDB } from '@/lib/storage'
import { updateAllInvestments, getAssetLastUpdated, hasCachedPrice } from '@/lib/services/asset-prices'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  TrendingUp,
  TrendingDown,
  Bitcoin,
  LineChart,
  Briefcase,
  Globe,
  Coins,
  RefreshCw,
  WifiOff,
  Clock
} from 'lucide-react'

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
  const [updatingPrices, setUpdatingPrices] = useState(false)
  const [lastPriceUpdate, setLastPriceUpdate] = useState(null)
  const [isOffline, setIsOffline] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    type: 'cripto',
    amount: '',
    initialValue: ''
  })

  // Fetch live prices for investments
  const updatePrices = useCallback(async (currentInvestments) => {
    if (currentInvestments.length === 0) return currentInvestments

    setUpdatingPrices(true)
    try {
      const updated = await updateAllInvestments(currentInvestments)
      setLastPriceUpdate(Date.now())
      setIsOffline(false)
      return updated
    } catch (error) {
      console.warn('Price update failed:', error)
      setIsOffline(true)
      return currentInvestments
    } finally {
      setUpdatingPrices(false)
    }
  }, [])

  useEffect(() => {
    loadInvestments()
  }, [])

  async function loadInvestments() {
    try {
      await initDB()
      const savedInvestments = getInvestments()
      setInvestments(savedInvestments)

      // Fetch live prices
      if (savedInvestments.length > 0) {
        const withPrices = await updatePrices(savedInvestments)
        setInvestments(withPrices)
        saveInvestments(withPrices)
      }
    } catch (error) {
      console.error('Error loading investments:', error)
    } finally {
      setLoading(false)
    }
  }

  // Manual refresh
  async function handleRefreshPrices() {
    const withPrices = await updatePrices(investments)
    setInvestments(withPrices)
    saveInvestments(withPrices)
  }

  function handleAddInvestment() {
    const investment = {
      id: Date.now().toString(),
      name: newInvestment.name.toUpperCase(),
      type: newInvestment.type,
      amount: parseFloat(newInvestment.amount) || 0,
      initialValue: parseFloat(newInvestment.initialValue) || 0,
      currentValue: parseFloat(newInvestment.initialValue) || 0,
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

    // Fetch price for the new investment
    updatePrices(updated).then(withPrices => {
      setInvestments(withPrices)
      saveInvestments(withPrices)
    })
  }

  function handleDeleteInvestment(id) {
    if (!confirm('¿Eliminar esta inversión?')) return
    const updated = investments.filter(inv => inv.id !== id)
    saveInvestments(updated)
    setInvestments(updated)
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatUsd = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const calculateTotalValue = () => {
    return investments.reduce((sum, inv) => sum + (inv.currentValue || inv.initialValue), 0)
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

  const getTypeIcon = (type) => {
    const icons = {
      cripto: Bitcoin,
      acciones: LineChart,
      bonos: TrendingUp,
      fci: Briefcase,
      cedears: Globe,
      otro: Coins
    }
    return icons[type] || Coins
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <TopBar title="Inversiones" backHref="/money" />
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-2xl border border-green-200 dark:border-green-800">
            <Skeleton className="w-32 h-4 mb-3" />
            <Skeleton className="w-40 h-8 mb-2" />
            <Skeleton className="w-24 h-5" />
          </div>
          <Skeleton className="w-full h-12 rounded-xl" />
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="flex-1">
                  <Skeleton className="w-24 h-4 mb-2" />
                  <Skeleton className="w-32 h-6" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const totalValue = calculateTotalValue()
  const totalInvested = calculateTotalInvested()
  const returnPercent = calculateReturn()

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Inversiones" backHref="/money" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Portfolio Summary */}
        {investments.length > 0 && (
          <Card className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cartera</h3>
              </div>
              <button
                onClick={handleRefreshPrices}
                disabled={updatingPrices}
                className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                title="Actualizar precios"
              >
                <RefreshCw className={`w-4 h-4 text-green-600 dark:text-green-400 ${updatingPrices ? 'animate-spin' : ''}`} />
              </button>
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

            {/* Last updated indicator */}
            <div className="mt-3 pt-2 border-t border-green-200/50 dark:border-green-800/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {isOffline ? (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Datos en cache</span>
                  </>
                ) : lastPriceUpdate ? (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>Act. {new Date(lastPriceUpdate).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </>
                ) : null}
              </div>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                Precios estimados
              </span>
            </div>
          </Card>
        )}

        {/* Add Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-sm transition-colors active:scale-[0.98]"
        >
          + Agregar inversión
        </button>

        {/* Investments List */}
        {investments.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Sin inversiones
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Registrá tus activos para ver su valor actual
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
              Mis activos
            </h3>
            {investments.map((inv) => {
              const gainLoss = (inv.currentValue || inv.initialValue) - inv.initialValue
              const gainLossPercent = inv.initialValue > 0 ? ((gainLoss / inv.initialValue) * 100) : 0
              const TypeIcon = getTypeIcon(inv.type)
              const lastUpdated = getAssetLastUpdated(inv.name)
              const hasCached = hasCachedPrice(inv.name)

              return (
                <Card key={inv.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      inv.type === 'cripto'
                        ? 'bg-orange-100 dark:bg-orange-900/30'
                        : 'bg-zinc-100 dark:bg-zinc-800'
                    }`}>
                      <TypeIcon className={`w-5 h-5 ${
                        inv.type === 'cripto'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-terra-600 dark:text-terra-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {inv.name}
                        </h4>
                        <button
                          onClick={() => handleDeleteInvestment(inv.id)}
                          className="text-xs text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          Eliminar
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="capitalize">{inv.type}</span>
                        <span>·</span>
                        <span>{inv.amount} unidades</span>
                      </div>

                      <div className="mt-3 flex items-end justify-between">
                        <div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Valor actual</div>
                          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                            {formatAmount(inv.currentValue || inv.initialValue)}
                          </div>
                          {inv.priceUsd && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formatUsd(inv.priceUsd)}/u
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center gap-1 text-sm font-semibold ${gainLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {gainLossPercent >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%
                          </div>
                          <div className={`text-xs ${gainLossPercent >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {gainLoss >= 0 ? '+' : ''}{formatAmount(gainLoss)}
                          </div>
                          {inv.change24h !== undefined && (
                            <div className={`text-xs mt-1 ${inv.change24h >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                              24h: {inv.change24h >= 0 ? '+' : ''}{inv.change24h.toFixed(1)}%
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Last updated */}
                      {(lastUpdated || hasCached) && (
                        <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-1.5 text-xs text-zinc-400">
                          <Clock className="w-3 h-3" />
                          <span>{lastUpdated || 'Cache disponible'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Info note */}
        <p className="text-xs text-center text-zinc-400 dark:text-zinc-500 px-4 italic">
          Los precios son estimaciones de mercado y pueden variar. Fuente: CoinGecko, DolarApi.
        </p>
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
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Símbolo / Nombre
                </label>
                <input
                  type="text"
                  value={newInvestment.name}
                  onChange={(e) => setNewInvestment({ ...newInvestment, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none transition-colors"
                  placeholder="Ej: BTC, ETH, AAPL"
                />
                <p className="text-xs text-zinc-500 mt-1">Para cripto, usá el símbolo (BTC, ETH, SOL...)</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Tipo</label>
                <select
                  value={newInvestment.type}
                  onChange={(e) => setNewInvestment({ ...newInvestment, type: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none transition-colors"
                >
                  <option value="cripto">Cripto (precios en tiempo real)</option>
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
                  step="0.00000001"
                  value={newInvestment.amount}
                  onChange={(e) => setNewInvestment({ ...newInvestment, amount: e.target.value })}
                  className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none transition-colors"
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
                  className="w-full px-3 py-2.5 bg-zinc-100 dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none transition-colors"
                  placeholder="Cuánto pagaste en total"
                />
              </div>

              <button
                onClick={handleAddInvestment}
                disabled={!newInvestment.name.trim() || !newInvestment.amount || !newInvestment.initialValue}
                className="w-full py-3 px-4 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-300 dark:disabled:bg-zinc-700 disabled:cursor-not-allowed text-white dark:text-zinc-900 font-semibold text-sm transition-colors"
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
