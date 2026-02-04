'use client'

import { useState, useEffect } from 'react'
import { initDB, getSubscriptions, addSubscription, deleteSubscription } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

export default function SuscripcionesPage() {
  const [subscriptions, setSubscriptions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    cadence: '1', // Default to monthly
  })

  useEffect(() => {
    initDB().then(loadSubscriptions)
  }, [])

  const loadSubscriptions = async () => {
    const data = await getSubscriptions()
    setSubscriptions(data)
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
    setFormData({
      name: '',
      amount: '',
      cadence: '1',
    })
  }

  const handleCloseModal = () => {
    setShowModal(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.amount) return

    const nextChargeDate = calculateNextChargeDate(formData.cadence)

    await addSubscription({
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      cadence_months: parseInt(formData.cadence),
      next_charge_date: nextChargeDate,
    })

    setShowModal(false)
    await loadSubscriptions()
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`¿Eliminar la suscripción "${name}"?`)) return
    await deleteSubscription(id)
    await loadSubscriptions()
  }

  const totalMonthly = subscriptions.reduce((sum, sub) => {
    const monthlyAmount = sub.amount / sub.cadence_months
    return sum + monthlyAmount
  }, 0)

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
            subscriptions.map((sub) => (
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
                    <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                      {formatAmount(sub.amount)}
                    </div>
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
                    </div>
                  </div>
                  <Button
                    onClick={() => handleDelete(sub.id, sub.name)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 flex-shrink-0"
                  >
                    Eliminar
                  </Button>
                </div>
              </Card>
            ))
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
                  Nueva suscripción
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
              <Input
                label="Nombre"
                type="text"
                placeholder="Netflix, Spotify, etc."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="sub-name-input"
                required
              />
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

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  data-testid="sub-submit-btn"
                >
                  Agregar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
