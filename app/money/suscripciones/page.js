'use client'

import { useState, useEffect, useMemo } from 'react'
import { initDB, getSubscriptions, addSubscription, deleteSubscription, updateSubscription, getWallets } from '@/lib/storage'
import { comparePrice, getSubscriptionPriceLastUpdated, checkForPriceChanges } from '@/lib/services/subscription-prices'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { TrendingUp, TrendingDown, Info, AlertTriangle } from 'lucide-react'

const SUBSCRIPTION_PRESETS = [
  { value: 'Netflix', label: 'Netflix' },
  { value: 'Spotify', label: 'Spotify' },
  { value: 'YouTube Premium', label: 'YouTube Premium' },
  { value: 'iCloud', label: 'iCloud' },
  { value: 'Google Drive', label: 'Google Drive' },
  { value: 'Amazon Prime', label: 'Amazon Prime' },
  { value: 'Disney+', label: 'Disney+' },
  { value: 'HBO Max', label: 'HBO Max' },
  { value: 'ChatGPT Plus', label: 'ChatGPT Plus' },
  { value: 'otro', label: 'Otro (personalizado)' },
]

export default function SuscripcionesPage() {
  const [subscriptions, setSubscriptions] = useState([])
  const [wallets, setWallets] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    customName: '',
    amount: '',
    cadence: '1',
    wallet: '',
  })

  useEffect(() => {
    initDB().then(() => {
      loadSubscriptions()
      loadWallets()
    })
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openMenuId && !e.target.closest('[data-menu-container]')) {
        setOpenMenuId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuId])

  const loadSubscriptions = async () => {
    const data = await getSubscriptions()
    setSubscriptions(data)
  }

  const loadWallets = async () => {
    const data = await getWallets()
    setWallets(data)
  }

  const calculateNextChargeDate = (cadenceMonths) => {
    const today = new Date()
    const nextDate = new Date(today)
    nextDate.setMonth(nextDate.getMonth() + parseInt(cadenceMonths))
    return nextDate.toISOString().split('T')[0]
  }

  const formatCadence = (cadenceMonths) => {
    switch (parseInt(cadenceMonths)) {
      case 1:
        return 'Mensual'
      case 3:
        return 'Trimestral'
      case 12:
        return 'Anual'
      default:
        return `Cada ${cadenceMonths} meses`
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleOpenModal = () => {
    setShowModal(true)
    setEditingId(null)
    setFormData({
      name: '',
      customName: '',
      amount: '',
      cadence: '1',
      wallet: '',
    })
  }

  const handleEditSubscription = (sub) => {
    setEditingId(sub.id)
    const isPreset = SUBSCRIPTION_PRESETS.some(p => p.value === sub.name)
    setFormData({
      name: isPreset ? sub.name : 'otro',
      customName: isPreset ? '' : sub.name,
      amount: sub.amount.toString(),
      cadence: sub.cadence_months.toString(),
      wallet: sub.wallet || '',
    })
    setShowModal(true)
    setOpenMenuId(null)
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const finalName = formData.name === 'otro'
      ? formData.customName.trim()
      : formData.name

    if (!finalName || !formData.amount) return

    const subscriptionData = {
      name: finalName,
      amount: parseFloat(formData.amount),
      cadence_months: parseInt(formData.cadence),
      next_charge_date: editingId
        ? subscriptions.find(s => s.id === editingId).next_charge_date
        : calculateNextChargeDate(formData.cadence),
      wallet: formData.wallet || undefined,
    }

    if (editingId) {
      await updateSubscription(editingId, subscriptionData)
    } else {
      await addSubscription(subscriptionData)
    }

    setShowModal(false)
    setEditingId(null)
    await loadSubscriptions()
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar la suscripción "${name}"?`)) return
    await deleteSubscription(id)
    setOpenMenuId(null)
    if (editingId === id) {
      setShowModal(false)
      setEditingId(null)
    }
    await loadSubscriptions()
  }

  const handleDeleteFromModal = async () => {
    if (!editingId) return
    const sub = subscriptions.find(s => s.id === editingId)
    if (!confirm(`¿Eliminar la suscripción "${sub.name}"?`)) return
    await deleteSubscription(editingId)
    setShowModal(false)
    setEditingId(null)
    await loadSubscriptions()
  }

  const totalMonthly = subscriptions.reduce((sum, sub) => {
    const monthlyAmount = sub.amount / sub.cadence_months
    return sum + monthlyAmount
  }, 0)

  // Price comparisons (memoized)
  const priceComparisons = useMemo(() => {
    const comparisons = {}
    for (const sub of subscriptions) {
      const comparison = comparePrice(sub.name, sub.amount)
      if (comparison) {
        comparisons[sub.id] = comparison
      }
    }
    return comparisons
  }, [subscriptions])

  // Check for potential price increases
  const priceAlerts = useMemo(() => {
    return checkForPriceChanges(subscriptions)
  }, [subscriptions])

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Suscripciones" backHref="/money" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Summary Card */}
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">
            Gasto mensual promedio
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {formatAmount(totalMonthly)}
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            {subscriptions.length} {subscriptions.length === 1 ? 'suscripción' : 'suscripciones'} activas
          </div>
        </Card>

        {/* Price Alerts */}
        {priceAlerts.length > 0 && (
          <Card className="p-4 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                  Posibles aumentos detectados
                </p>
                <div className="space-y-1">
                  {priceAlerts.slice(0, 3).map((alert, i) => (
                    <p key={i} className="text-xs text-amber-700 dark:text-amber-300">
                      {alert.name}: precio de referencia {formatAmount(alert.referencePrice)} (+{alert.percentIncrease}%)
                    </p>
                  ))}
                </div>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 italic">
                  Precios estimados, pueden variar
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Add Button */}
        <Button
          onClick={handleOpenModal}
          variant="primary"
          className="w-full"
          data-testid="add-subscription-btn"
        >
          Agregar suscripción
        </Button>

        {/* Subscriptions List */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis suscripciones
          </h2>
          {subscriptions.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No hay suscripciones registradas.
              </p>
            </Card>
          ) : (
            subscriptions.map((sub) => {
              const comparison = priceComparisons[sub.id]
              const lastUpdated = getSubscriptionPriceLastUpdated(sub.name)

              return (
              <Card
                key={sub.id}
                className="p-4"
                data-testid="subscription-item"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {sub.name}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatAmount(sub.amount)}
                      </span>
                      {comparison && comparison.status !== 'same' && (
                        <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                          comparison.status === 'higher'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {comparison.status === 'higher' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {comparison.percentDiff > 0 ? '+' : ''}{comparison.percentDiff}%
                        </span>
                      )}
                    </div>
                    {/* Reference price line */}
                    {comparison && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Info className="w-3 h-3 text-zinc-400" />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Ref: {formatAmount(comparison.referencePrice)}
                          {lastUpdated && ` · ${lastUpdated}`}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatCadence(sub.cadence_months)}
                      </span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        •
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        Próximo: {formatDate(sub.next_charge_date)}
                      </span>
                      {sub.wallet && (
                        <>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            •
                          </span>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            {sub.wallet}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="relative flex-shrink-0" data-menu-container>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === sub.id ? null : sub.id)}
                      className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                    {openMenuId === sub.id && (
                      <div className="absolute right-0 mt-1 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 py-1 z-10 min-w-[140px]">
                        <button
                          onClick={() => handleEditSubscription(sub)}
                          className="w-full px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(sub.id, sub.name)}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )})
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-xl animate-slide-up">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {editingId ? 'Editar suscripción' : 'Nueva suscripción'}
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
                label="Nombre"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="sub-name-select"
                required
              >
                <option value="">Seleccionar...</option>
                {SUBSCRIPTION_PRESETS.map(preset => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </Select>

              {formData.name === 'otro' && (
                <Input
                  label="Nombre personalizado"
                  type="text"
                  placeholder="Ingresa el nombre"
                  value={formData.customName}
                  onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
                  data-testid="sub-custom-name-input"
                  required
                />
              )}

              <Input
                label="Monto"
                type="number"
                placeholder="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                data-testid="sub-amount-input"
                required
              />

              <Select
                label="Frecuencia"
                value={formData.cadence}
                onChange={(e) => setFormData({ ...formData, cadence: e.target.value })}
                data-testid="sub-cadence-select"
                required
              >
                <option value="1">Mensual</option>
                <option value="3">Trimestral</option>
                <option value="12">Anual</option>
              </Select>

              <Select
                label="Billetera asociada (opcional)"
                value={formData.wallet}
                onChange={(e) => setFormData({ ...formData, wallet: e.target.value })}
                data-testid="sub-wallet-select"
              >
                <option value="">Ninguna</option>
                {wallets.map(wallet => (
                  <option key={wallet.wallet} value={wallet.wallet}>
                    {wallet.wallet}
                  </option>
                ))}
              </Select>

              <div className="pt-2 flex gap-2">
                {editingId && (
                  <Button
                    type="button"
                    onClick={handleDeleteFromModal}
                    variant="ghost"
                    className="flex-1 text-red-600 hover:text-red-700 dark:text-red-400"
                    data-testid="sub-delete-btn"
                  >
                    Eliminar
                  </Button>
                )}
                <Button
                  type="submit"
                  variant="primary"
                  className={editingId ? 'flex-1' : 'w-full'}
                  data-testid="sub-submit-btn"
                >
                  {editingId ? 'Guardar' : 'Agregar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
