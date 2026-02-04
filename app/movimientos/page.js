'use client'

import { useState, useEffect, useMemo } from 'react'
import { initDB, getMovimientos, deleteMovimiento, updateMovimiento, getCategorias } from '@/lib/storage'

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
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="border-b border-stone-200 bg-white px-4 py-3 sticky top-0">
        <h1 className="text-sm font-bold">Movimientos</h1>
        <p className="text-xs text-stone-500">
          {filtered.length} de {movimientos.length} registros
        </p>
      </header>

      <div className="p-4 space-y-3">
        <div className="rounded-lg border border-stone-200 bg-white p-3">
          <div className="space-y-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            >
              <option value="all">Tipo: Todos</option>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
              <option value="movimiento">Movimiento</option>
            </select>

            <select
              value={filterWallet}
              onChange={(e) => setFilterWallet(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            >
              <option value="all">Billetera: Todas</option>
              {wallets.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            >
              <option value="all">Categoría: Todas</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="w-full rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-4 text-center text-sm text-stone-500">
            {movimientos.length === 0
              ? 'Todavía no hay movimientos.'
              : 'No hay movimientos con estos filtros.'}
          </div>
        ) : (
          filtered.map((mov) => (
            <div
              key={mov.id}
              className="rounded-lg border border-stone-200 bg-white p-3 cursor-pointer hover:bg-stone-50"
              onClick={() => handleEdit(mov)}
              data-testid="movimiento-item"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-stone-900">
                    {formatAmount(mov.monto)}
                  </div>
                  <div className="text-xs text-stone-600 mt-1">
                    {mov.motivo || '—'}
                  </div>
                  <div className="text-xs text-stone-400 mt-1">
                    {mov.tipo === 'movimiento'
                      ? `${mov.origen} → ${mov.destino}`
                      : mov.metodo}
                    {(getCategoryName(mov.category_id) || mov.categoria) && ` • ${getCategoryName(mov.category_id) || mov.categoria || 'Sin categoría'}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs px-2 py-1 rounded bg-stone-100 text-stone-600">
                    {mov.tipo}
                  </div>
                  <div className="text-xs text-stone-400 mt-1">
                    {mov.fecha}
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(mov.id)
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-4">
            <h2 className="text-sm font-bold mb-3">Editar movimiento</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-stone-600 block mb-1">Monto</label>
                <input
                  type="number"
                  value={editForm.monto}
                  onChange={(e) => setEditForm({ ...editForm, monto: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 block mb-1">Billetera</label>
                <input
                  type="text"
                  value={editForm.metodo}
                  onChange={(e) => setEditForm({ ...editForm, metodo: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
              </div>
              <div>
                <label className="text-xs text-stone-600 block mb-1">Descripción</label>
                <input
                  type="text"
                  value={editForm.motivo}
                  onChange={(e) => setEditForm({ ...editForm, motivo: e.target.value })}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}