'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { initDB, getMovimientos, deleteMovimiento, updateMovimiento, getCategorias, addMovimiento, updateSaldo, getWallets } from '@/lib/storage'
import { seedPredefinedCategories } from '@/lib/seed-categories'
import { getPresets, savePresets } from '@/lib/quick-presets'
import { fetchAllRates, getCachedRates } from '@/lib/services/market-rates'
import { getUsdContext, formatUsd } from '@/lib/services/currency-conversion'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Toast from '@/components/ui/Toast'
import { Receipt, Filter, ArrowDownUp, ShoppingCart } from 'lucide-react'
import PriceBadge from '@/components/PriceBadge'
import { classifyPrice } from '@/lib/classify-price'
import { getPriceHistory } from '@/lib/ratoneando/price-storage'

// Umbral para mostrar equivalente USD (gastos significativos)
const USD_DISPLAY_THRESHOLD = 10000

const vibrate = (pattern) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

// Sugerencias de descripción por categoría
const CATEGORY_SUGGESTIONS = {
  'Comida': ['Almuerzo', 'Cena', 'Desayuno', 'Snack', 'Café', 'Delivery'],
  'Transporte': ['Taxi', 'Uber', 'Colectivo', 'Subte', 'Nafta', 'Estacionamiento'],
  'Suscripciones': ['Netflix', 'Spotify', 'YouTube Premium', 'iCloud', 'Google Drive'],
  'Ocio': ['Cine', 'Teatro', 'Bar', 'Boliche', 'Concierto', 'Juegos'],
  'Servicios': ['Luz', 'Gas', 'Agua', 'Internet', 'Cable', 'Telefonía'],
  'Compras': ['Ropa', 'Zapatillas', 'Electrónica', 'Muebles', 'Deco'],
  'Salud': ['Médico', 'Dentista', 'Farmacia', 'Gimnasio', 'Terapia'],
  'Educación': ['Curso', 'Libro', 'Universidad', 'Colegio', 'Taller'],
  'Otro': []
}

// Keywords para detección automática de categoría
const CATEGORY_KEYWORDS = {
  'Comida': ['almuerzo', 'cena', 'desayuno', 'snack', 'café', 'delivery', 'rappi', 'pedidosya', 'comida', 'restaurant', 'resto', 'mcdonald', 'burger', 'pizza', 'empanadas'],
  'Transporte': ['taxi', 'uber', 'cabify', 'colectivo', 'subte', 'nafta', 'estacionamiento', 'peaje', 'tren', 'bondi'],
  'Suscripciones': ['netflix', 'spotify', 'youtube', 'icloud', 'google drive', 'amazon prime', 'disney', 'hbo', 'chatgpt', 'premium'],
  'Ocio': ['cine', 'teatro', 'bar', 'boliche', 'concierto', 'juegos', 'steam', 'playstation', 'xbox', 'entretenimiento'],
  'Servicios': ['luz', 'gas', 'agua', 'internet', 'cable', 'telefonía', 'edesur', 'metrogas', 'telecom', 'movistar'],
  'Compras': ['ropa', 'zapatillas', 'electrónica', 'muebles', 'deco', 'mercadolibre', 'amazon', 'tienda'],
  'Salud': ['médico', 'dentista', 'farmacia', 'gimnasio', 'terapia', 'doctor', 'consulta', 'medicamento'],
  'Educación': ['curso', 'libro', 'universidad', 'colegio', 'taller', 'clase', 'educación', 'capacitación']
}

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([])
  const [wallets, setWallets] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterWallet, setFilterWallet] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({
    monto: '',
    metodo: '',
    motivo: '',
    categoria: '',
    fecha: '',
    recurrent: false,
  })
  const [contextMenuId, setContextMenuId] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({
    monto: '',
    motivo: '',
    tipo: 'gasto',
    metodo: 'Efectivo',
    categoria: '',
    fecha: new Date().toISOString().slice(0, 10),
    recurrent: false,
  })
  const [categorias, setCategorias] = useState([])
  const [isCategoriesSeeded, setIsCategoriesSeeded] = useState(false)
  const [lastActionSignal, setLastActionSignal] = useState(null)
  const [toast, setToast] = useState(null)
  const [rates, setRates] = useState(null)

  const loadMovimientos = useCallback(async () => {
    const data = await getMovimientos()
    const cats = await getCategorias()
    const walletsData = await getWallets()
    setMovimientos(data.sort((a, b) => b.id - a.id))
    setCategorias(cats)
    setWallets(walletsData)
  }, [])

  useEffect(() => {
    const init = async () => {
      await initDB()
      await seedPredefinedCategories()
      setIsCategoriesSeeded(true)
      await loadMovimientos()
      // Load rates for USD context (silent, non-blocking)
      try {
        const fetchedRates = await fetchAllRates()
        setRates(fetchedRates)
      } catch {
        setRates(getCachedRates())
      }
    }
    init()
  }, [])

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuId) setContextMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenuId])

  const walletNames = useMemo(() => {
    const set = new Set()
    movimientos.forEach((m) => {
      if (m.metodo) set.add(m.metodo)
      if (m.origen) set.add(m.origen)
      if (m.destino) set.add(m.destino)
    })
    // Agregar billeteras del sistema
    wallets.forEach(w => set.add(w.wallet))
    return Array.from(set).sort()
  }, [movimientos, wallets])

  // Calcular billetera más frecuente (últimos 30 días)
  const mostFrequentWallet = useMemo(() => {
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const recentMovs = movimientos.filter(m => {
      const fecha = new Date(m.fecha)
      return fecha >= last30Days
    })

    const walletCount = {}
    recentMovs.forEach(m => {
      if (m.metodo) walletCount[m.metodo] = (walletCount[m.metodo] || 0) + 1
    })

    const sorted = Object.entries(walletCount).sort((a, b) => b[1] - a[1])
    return sorted.length > 0 ? sorted[0][0] : null
  }, [movimientos])

  // Calcular promedio por categoría para detectar gastos atípicos
  const categoryAverages = useMemo(() => {
    const categoryTotals = {}
    const categoryCounts = {}

    movimientos.filter(m => m.tipo === 'gasto' && m.categoria).forEach(m => {
      const cat = m.categoria
      categoryTotals[cat] = (categoryTotals[cat] || 0) + m.monto
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })

    const averages = {}
    Object.keys(categoryTotals).forEach(cat => {
      averages[cat] = categoryTotals[cat] / categoryCounts[cat]
    })

    return averages
  }, [movimientos])

  // Detectar categoría automáticamente basada en descripción
  const detectCategoryFromDescription = (description) => {
    if (!description) return null

    const normalizedDesc = description.toLowerCase().trim()

    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const keyword of keywords) {
        if (normalizedDesc.includes(keyword)) {
          return category
        }
      }
    }

    return null
  }

  // Verificar si un movimiento es gasto atípico (>2x promedio)
  const isAtypicalSpending = (mov) => {
    if (mov.tipo !== 'gasto' || !mov.categoria) return false
    const avg = categoryAverages[mov.categoria]
    if (!avg) return false
    return mov.monto > avg * 2
  }

  const categories = useMemo(() => {
    const set = new Set()
    movimientos.forEach((m) => {
      if (m.categoria) set.add(m.categoria)
    })
    return Array.from(set).sort()
  }, [movimientos])

  const filtered = useMemo(() => {
    return movimientos.filter((m) => {
      if (filterType !== 'all' && m.tipo !== filterType) return false

      if (filterWallet !== 'all') {
        const matchWallet =
          m.metodo === filterWallet ||
          m.origen === filterWallet ||
          m.destino === filterWallet
        if (!matchWallet) return false
      }

      if (filterCategory !== 'all' && m.categoria !== filterCategory) return false

      return true
    })
  }, [movimientos, filterType, filterWallet, filterCategory])

  const clearFilters = useCallback(() => {
    setFilterType('all')
    setFilterWallet('all')
    setFilterCategory('all')
  }, [])

  const handleDelete = useCallback(async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    vibrate(50)
    await deleteMovimiento(id)
    await loadMovimientos()
  }, [loadMovimientos])

  const handleEdit = useCallback((mov) => {
    setEditModal(mov)
    setEditForm({
      monto: mov.monto || '',
      metodo: mov.metodo || '',
      motivo: mov.motivo || '',
      categoria: mov.categoria || '',
      fecha: mov.fecha || new Date().toISOString().slice(0, 10),
      recurrent: mov.recurrent || false,
    })
  }, [])

  const handleSaveEdit = useCallback(async () => {
    if (!editModal) return

    const updates = {
      monto: parseFloat(editForm.monto) || editModal.monto,
      metodo: editForm.metodo || editModal.metodo,
      motivo: editForm.motivo || editModal.motivo,
    }

    if (editForm.categoria) updates.categoria = editForm.categoria
    if (editForm.fecha) updates.fecha = editForm.fecha
    if (editForm.recurrent !== undefined) updates.recurrent = editForm.recurrent

    await updateMovimiento(editModal.id, updates)

    setEditModal(null)
    await loadMovimientos()
  }, [editModal, editForm, loadMovimientos])

  const handleDuplicate = useCallback(async (mov) => {
    const duplicate = {
      fecha: new Date().toISOString().slice(0, 10),
      tipo: mov.tipo,
      monto: mov.monto,
      metodo: mov.metodo || '',
      motivo: mov.motivo || '',
      categoria: mov.categoria || '',
      recurrent: mov.recurrent || false,
    }

    await addMovimiento(duplicate)
    if (mov.tipo !== 'movimiento') {
      await updateSaldo(duplicate.metodo, duplicate.tipo === 'gasto' ? -duplicate.monto : duplicate.monto)
    }
    await loadMovimientos()
    setEditModal(null)
  }, [loadMovimientos])

  const handleCloseModal = useCallback(() => {
    setEditModal(null)
  }, [])

  const handleOpenAddModal = useCallback(() => {
    setShowAddModal(true)
    const presets = getPresets()

    // Preseleccionar: 1) Primary wallet, 2) Preset guardado, 3) Wallet más frecuente, 4) Efectivo
    const suggestedWallet = wallets.find(w => w.is_primary)?.wallet || presets.lastWallet || mostFrequentWallet || 'Efectivo'
    const suggestedCategory = presets.lastCategory || ''

    setAddForm({
      monto: '',
      motivo: '',
      tipo: 'gasto',
      metodo: suggestedWallet,
      categoria: suggestedCategory,
      fecha: new Date().toISOString().slice(0, 10),
      recurrent: false,
    })
  }, [wallets, mostFrequentWallet])

  // Detectar categoría automáticamente al escribir descripción
  const handleDescriptionChange = useCallback((value) => {
    setAddForm(prev => {
      const newForm = { ...prev, motivo: value }

      // Si no hay categoría seleccionada, detectar automáticamente
      if (!prev.categoria && value.length >= 3) {
        const detectedCategory = detectCategoryFromDescription(value)
        if (detectedCategory) {
          newForm.categoria = detectedCategory
        }
      }

      return newForm
    })
  }, [])

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false)
  }, [])

  const handleAddSubmit = useCallback(async () => {
    if (!addForm.monto) return

    setLastActionSignal(null)

    const movimiento = {
      fecha: addForm.fecha || new Date().toISOString().slice(0, 10),
      tipo: addForm.tipo,
      monto: parseFloat(addForm.monto),
      metodo: addForm.metodo,
      motivo: addForm.motivo || '',
    }

    if (addForm.categoria) movimiento.categoria = addForm.categoria
    if (addForm.recurrent !== undefined) movimiento.recurrent = addForm.recurrent

    await addMovimiento(movimiento)
    if (movimiento.tipo !== 'movimiento') {
      await updateSaldo(movimiento.metodo, movimiento.tipo === 'gasto' ? -movimiento.monto : movimiento.monto)
    }

    // Guardar presets para próxima vez
    savePresets({
      lastWallet: movimiento.metodo,
      lastCategory: movimiento.categoria || null
    })

    setShowAddModal(false)
    await loadMovimientos()

    setLastActionSignal('movement_created')
    setToast({ message: 'Guardado', type: 'success' })
  }, [addForm, loadMovimientos])

  // Autocompletar descripción cuando cambia categoría
  const handleCategoryChange = (categoria, isAddForm = true) => {
    if (isAddForm) {
      setAddForm({ ...addForm, categoria })
      // Si no hay motivo aún, sugerir uno
      if (!addForm.motivo && CATEGORY_SUGGESTIONS[categoria] && CATEGORY_SUGGESTIONS[categoria].length > 0) {
        setAddForm({ ...addForm, categoria, motivo: CATEGORY_SUGGESTIONS[categoria][0] })
      } else {
        setAddForm({ ...addForm, categoria })
      }
    } else {
      setEditForm({ ...editForm, categoria })
    }
  }

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getCategoryName = (catId) => {
    if (!catId) return null
    const cat = categorias.find(c => c.id === catId)
    return cat ? cat.nombre : 'Sin categoría'
  }

  const hasActiveFilters = filterType !== 'all' || filterWallet !== 'all' || filterCategory !== 'all'

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar
        title="Movimientos"
        backHref="/money"
        action={
          <div className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-lg">
            {filtered.length}/{movimientos.length}
          </div>
        }
      />

      {/* Acción principal - estilo billetera */}
      <div className="px-4 pt-4 space-y-3">
        <button
          onClick={handleOpenAddModal}
          disabled={!isCategoriesSeeded}
          data-testid="add-movimiento-btn"
          className="w-full p-4 bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 rounded-2xl border border-zinc-700 hover:border-zinc-600 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <ArrowDownUp className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">
                  {isCategoriesSeeded ? 'Nuevo movimiento' : 'Inicializando...'}
                </p>
                <p className="text-zinc-400 text-xs">Gasto, ingreso o transferencia</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </button>

        <a
          href="https://www.ratoneando.com.ar"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full"
        >
          <Card className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
              <ShoppingCart className="w-4 h-4" />
              <span>Comparar precios</span>
            </div>
          </Card>
        </a>
      </div>

      {/* Filtros */}
      <div className="px-4 py-3 space-y-2 border-b border-zinc-200/50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-950/50">
        <div className="grid grid-cols-3 gap-2">
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs py-2"
          >
            <option value="all">Todos</option>
            <option value="gasto">Gastos</option>
            <option value="ingreso">Ingresos</option>
            <option value="movimiento">Movimientos</option>
          </Select>

          <Select
            value={filterWallet}
            onChange={(e) => setFilterWallet(e.target.value)}
            className="text-xs py-2"
          >
            <option value="all">Billeteras</option>
            {walletNames.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </Select>

          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs py-2"
          >
            <option value="all">Categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-terra-600 dark:text-terra-400 font-medium"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
              {movimientos.length === 0 ? (
                <Receipt className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
              ) : (
                <Filter className="w-7 h-7 text-zinc-400 dark:text-zinc-500" />
              )}
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              {movimientos.length === 0 ? 'Sin movimientos' : 'Sin resultados'}
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {movimientos.length === 0
                ? 'Acá van a aparecer tus gastos e ingresos'
                : 'Probá ajustando los filtros'}
            </p>
          </Card>
        ) : (
          filtered.map((mov) => (
            <Card
              key={mov.id}
              className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors relative"
              data-testid="movimiento-item"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleEdit(mov)}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 tracking-tight">
                      {formatAmount(mov.monto)}
                    </span>
                    {/* USD context for significant amounts */}
                    {rates && mov.monto >= USD_DISPLAY_THRESHOLD && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
                        {getUsdContext(mov.monto)?.hint}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">
                    {mov.motivo || '—'}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {mov.tipo === 'movimiento'
                        ? `${mov.origen} → ${mov.destino}`
                        : mov.metodo}
                    </span>
                    {(getCategoryName(mov.category_id) || mov.categoria) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {getCategoryName(mov.category_id) || mov.categoria}
                      </span>
                    )}
                    {mov.recurrent && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        Recurrente
                      </span>
                    )}
                    {isAtypicalSpending(mov) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                        Gasto alto
                      </span>
                    )}
                    {mov.tipo === 'gasto' && mov.motivo && (() => {
                      const history = getPriceHistory(mov.motivo)
                      const classification = classifyPrice(mov.monto, history)
                      if (!classification || classification.label === 'normal') return null
                      return <PriceBadge label={classification.label} deltaPercent={classification.deltaPercent} />
                    })()}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                  <div className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {mov.tipo}
                  </div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500">
                    {mov.fecha}
                  </div>
                  {/* Menú contextual */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setContextMenuId(contextMenuId === mov.id ? null : mov.id)
                      }}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                    >
                      <svg className="w-4 h-4 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 16 16">
                        <circle cx="8" cy="3" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="8" cy="13" r="1.5"/>
                      </svg>
                    </button>
                    {contextMenuId === mov.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(mov)
                            setContextMenuId(null)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-t-lg"
                        >
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDuplicate(mov)
                            setContextMenuId(null)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        >
                          Duplicar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(mov.id)
                            setContextMenuId(null)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de edición */}
      {editModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-xl animate-slide-up">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Editar</h3>
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

            <div className="p-4 space-y-3">
              <Input
                label="Monto"
                type="number"
                value={editForm.monto}
                onChange={(e) => setEditForm({ ...editForm, monto: e.target.value })}
              />
              <Select
                label="Billetera"
                value={editForm.metodo}
                onChange={(e) => setEditForm({ ...editForm, metodo: e.target.value })}
              >
                {walletNames.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </Select>
              <Select
                label="Categoría"
                value={editForm.categoria}
                onChange={(e) => handleCategoryChange(e.target.value, false)}
              >
                <option value="">Sin categoría</option>
                <option value="Comida">Comida</option>
                <option value="Transporte">Transporte</option>
                <option value="Suscripciones">Suscripciones</option>
                <option value="Ocio">Ocio</option>
                <option value="Servicios">Servicios</option>
                <option value="Compras">Compras</option>
                <option value="Salud">Salud</option>
                <option value="Educación">Educación</option>
                <option value="Otro">Otro</option>
              </Select>
              <Input
                label="Fecha"
                type="date"
                value={editForm.fecha}
                onChange={(e) => setEditForm({ ...editForm, fecha: e.target.value })}
              />
              <Input
                label="Descripción"
                value={editForm.motivo}
                onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.recurrent}
                  onChange={(e) => setEditForm({ ...editForm, recurrent: e.target.checked })}
                  className="w-4 h-4 text-terra-600 bg-zinc-100 border-zinc-300 rounded focus:ring-terra-500 dark:focus:ring-terra-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Marcar como recurrente</span>
              </label>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => {
                    handleDelete(editModal.id)
                    handleCloseModal()
                  }}
                  variant="danger"
                  className="flex-1"
                >
                  Eliminar
                </Button>
                <Button
                  onClick={() => handleDuplicate(editModal)}
                  variant="secondary"
                  className="flex-1"
                >
                  Duplicar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  variant="primary"
                  className="flex-1"
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de agregar */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 rounded-t-3xl shadow-xl animate-slide-up">
            <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Nuevo movimiento</h3>
                <button
                  onClick={handleCloseAddModal}
                  className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <Input
                label="Monto"
                type="number"
                placeholder="0"
                value={addForm.monto}
                onChange={(e) => setAddForm({ ...addForm, monto: e.target.value })}
                data-testid="manual-monto-input"
                required
              />
              <Select
                label="Tipo"
                value={addForm.tipo}
                onChange={(e) => setAddForm({ ...addForm, tipo: e.target.value })}
                data-testid="manual-tipo-select"
              >
                <option value="gasto">Gasto</option>
                <option value="ingreso">Ingreso</option>
                <option value="movimiento">Movimiento</option>
              </Select>
              <Select
                label="Billetera"
                value={addForm.metodo}
                onChange={(e) => setAddForm({ ...addForm, metodo: e.target.value })}
                data-testid="manual-metodo-select"
              >
                {walletNames.length > 0 ? (
                  walletNames.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))
                ) : (
                  <>
                    <option value="Efectivo">Efectivo</option>
                    <option value="Débito">Débito</option>
                    <option value="Crédito">Crédito</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Virtual">Virtual</option>
                  </>
                )}
              </Select>
              <div>
                <Select
                  label="Categoría"
                  value={addForm.categoria}
                  onChange={(e) => handleCategoryChange(e.target.value, true)}
                >
                  <option value="">Sin categoría</option>
                  <option value="Comida">Comida</option>
                  <option value="Transporte">Transporte</option>
                  <option value="Suscripciones">Suscripciones</option>
                  <option value="Ocio">Ocio</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Compras">Compras</option>
                  <option value="Salud">Salud</option>
                  <option value="Educación">Educación</option>
                  <option value="Otro">Otro</option>
                </Select>
                {addForm.categoria && addForm.motivo && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Detectada automaticamente
                  </p>
                )}
              </div>
              <Input
                label="Fecha"
                type="date"
                value={addForm.fecha}
                onChange={(e) => setAddForm({ ...addForm, fecha: e.target.value })}
              />
              <div>
                <Input
                  label="Descripción"
                  placeholder={addForm.categoria && CATEGORY_SUGGESTIONS[addForm.categoria]?.length > 0
                    ? `Ej: ${CATEGORY_SUGGESTIONS[addForm.categoria].join(', ')}`
                    : "Ej: Café, taxi, uber..."}
                  value={addForm.motivo}
                  onChange={(e) => handleDescriptionChange(e.target.value)}
                  data-testid="manual-motivo-input"
                />
                {!addForm.categoria && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Escribi y detectare la categoria automaticamente
                  </p>
                )}
              </div>
              {addForm.categoria && CATEGORY_SUGGESTIONS[addForm.categoria]?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {CATEGORY_SUGGESTIONS[addForm.categoria].slice(0, 4).map(suggestion => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setAddForm({ ...addForm, motivo: suggestion })}
                      className="text-xs px-2 py-1 rounded-full bg-terra-100 dark:bg-terra-900/30 text-terra-700 dark:text-terra-300 hover:bg-terra-200 dark:hover:bg-terra-900/50 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addForm.recurrent}
                  onChange={(e) => setAddForm({ ...addForm, recurrent: e.target.checked })}
                  className="w-4 h-4 text-terra-600 bg-zinc-100 border-zinc-300 rounded focus:ring-terra-500 dark:focus:ring-terra-600 dark:ring-offset-zinc-800 focus:ring-2 dark:bg-zinc-700 dark:border-zinc-600"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-300">Marcar como recurrente</span>
              </label>

              <div className="pt-2">
                <Button
                  onClick={handleAddSubmit}
                  variant="primary"
                  className="w-full"
                  data-testid="manual-submit-btn"
                >
                  Agregar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signal for test automation */}
      {lastActionSignal === 'movement_created' && (
        <div
          data-testid="movement-created-signal"
          className="sr-only"
          aria-live="polite"
        >
          Movimiento creado
        </div>
      )}

      {/* Toast feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
