'use client'

import { useState, useEffect, useMemo } from 'react'
import { initDB, getMovimientos, deleteMovimiento, updateMovimiento, getCategorias } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

const vibrate = (pattern) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

export default function MovimientosPage() {
  const [movimientos, setMovimientos] = useState([])
  const [filterType, setFilterType] = useState('all')
  const [filterWallet, setFilterWallet] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [editModal, setEditModal] = useState(null)
  const [editForm, setEditForm] = useState({
    monto: '',
    metodo: '',
    motivo: '',
  })
  const [categorias, setCategorias] = useState([])

  const loadMovimientos = async () => {
    await initDB()
    const data = await getMovimientos()
    const cats = await getCategorias()
    setMovimientos(data.sort((a, b) => b.id - a.id))
    setCategorias(cats)
  }

  useEffect(() => {
    loadMovimientos()
  }, [])

  const wallets = useMemo(() => {
    const set = new Set()
    movimientos.forEach((m) => {
      if (m.metodo) set.add(m.metodo)
      if (m.origen) set.add(m.origen)
      if (m.destino) set.add(m.destino)
    })
    return Array.from(set).sort()
  }, [movimientos])

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

  const clearFilters = () => {
    setFilterType('all')
    setFilterWallet('all')
    setFilterCategory('all')
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este movimiento?')) return
    vibrate(50)
    await deleteMovimiento(id)
    await loadMovimientos()
  }

  const handleEdit = (mov) => {
    setEditModal(mov)
    setEditForm({
      monto: mov.monto || '',
      metodo: mov.metodo || '',
      motivo: mov.motivo || '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editModal) return

    await updateMovimiento(editModal.id, {
      monto: parseFloat(editForm.monto) || editModal.monto,
      metodo: editForm.metodo || editModal.metodo,
      motivo: editForm.motivo || editModal.motivo,
    })

    setEditModal(null)
    await loadMovimientos()
  }

  const handleCloseModal = () => {
    setEditModal(null)
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
    <div className="flex flex-col min-h-screen">
      <TopBar
        title="Movimientos"
        action={
          <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {filtered.length} de {movimientos.length}
          </div>
        }
      />

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
            {wallets.map((w) => (
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
            className="text-xs text-blue-600 dark:text-blue-400 font-medium"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {filtered.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {movimientos.length === 0
                ? 'No hay movimientos registrados.'
                : 'No hay movimientos con estos filtros.'}
            </p>
          </Card>
        ) : (
          filtered.map((mov) => (
            <Card
              key={mov.id}
              className="p-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors active:scale-[0.99]"
              onClick={() => handleEdit(mov)}
              data-testid="movimiento-item"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatAmount(mov.monto)}
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
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {getCategoryName(mov.category_id) || mov.categoria}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {mov.tipo}
                  </div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                    {mov.fecha}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Modal de edición */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
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
              <Input
                label="Billetera"
                value={editForm.metodo}
                onChange={(e) => setEditForm({ ...editForm, metodo: e.target.value })}
              />
              <Input
                label="Descripción"
                value={editForm.motivo}
                onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
              />

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
    </div>
  )
}