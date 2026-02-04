'use client'

import { useState, useEffect } from 'react'
import { initDB, getCategorias, addCategoria, updateCategoria, deleteCategoria, recategorizeAllMovimientos } from '@/lib/storage'
import { seedPredefinedCategories } from '@/lib/seed-categories'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [isRecategorizing, setIsRecategorizing] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    keywords: '',
    prioridad: 10,
    color: '#78716c'
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await initDB()
    await seedPredefinedCategories()
    const data = await getCategorias()
    setCategorias(data.sort((a, b) => b.prioridad - a.prioridad))
  }

  const handleOpenModal = (categoria = null) => {
    if (categoria) {
      setEditingId(categoria.id)
      setForm({
        nombre: categoria.nombre,
        keywords: Array.isArray(categoria.keywords) ? categoria.keywords.join(', ') : '',
        prioridad: categoria.prioridad || 10,
        color: categoria.color || '#78716c'
      })
    } else {
      setEditingId(null)
      setForm({
        nombre: '',
        keywords: '',
        prioridad: 10,
        color: '#78716c'
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return

    const keywordsArray = form.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0)

    if (editingId) {
      await updateCategoria(editingId, {
        nombre: form.nombre.trim(),
        keywords: keywordsArray,
        prioridad: parseInt(form.prioridad) || 10,
        color: form.color
      })
    } else {
      await addCategoria(
        form.nombre.trim(),
        keywordsArray,
        parseInt(form.prioridad) || 10,
        form.color,
        false
      )
    }

    setShowModal(false)
    await loadData()
  }

  const handleDelete = async (id, nombre, esPredefinida) => {
    if (esPredefinida) {
      alert('No se pueden eliminar categorías predefinidas del sistema')
      return
    }
    if (!confirm(`¿Eliminar la categoría "${nombre}"?`)) return
    await deleteCategoria(id)
    await loadData()
  }

  const handleRecategorize = async () => {
    if (!confirm('¿Re-categorizar todos los movimientos? Esto puede tardar.')) return

    setIsRecategorizing(true)
    try {
      const result = await recategorizeAllMovimientos()
      alert(`✅ ${result.processed} movimientos re-categorizados`)
    } catch (error) {
      alert('Error al re-categorizar: ' + error.message)
    } finally {
      setIsRecategorizing(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Categorías" backHref="/mas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Botón re-categorizar */}
        <Button
          onClick={handleRecategorize}
          disabled={isRecategorizing}
          variant="secondary"
          className="w-full"
        >
          {isRecategorizing ? '⏳ Re-categorizando...' : '🔄 Re-categorizar todos'}
        </Button>

        {/* Botón agregar */}
        <Button
          onClick={() => handleOpenModal()}
          variant="primary"
          className="w-full"
          data-testid="add-categoria-btn"
        >
          Agregar categoría
        </Button>

        {/* Lista */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis categorías
          </h2>
          {categorias.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No hay categorías registradas.
              </p>
            </Card>
          ) : (
            categorias.map((cat) => (
              <Card
                key={cat.id}
                className="p-4"
                data-testid="categoria-item"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color || '#78716c' }}
                      />
                      <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {cat.nombre}
                      </div>
                      {cat.es_predefinida && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                          Sistema
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Keywords: {Array.isArray(cat.keywords) ? cat.keywords.join(', ') : '—'}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Prioridad: {cat.prioridad}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <Button
                      onClick={() => handleOpenModal(cat)}
                      variant="ghost"
                      size="sm"
                    >
                      Editar
                    </Button>
                    {!cat.es_predefinida && (
                      <Button
                        onClick={() => handleDelete(cat.id, cat.nombre, cat.es_predefinida)}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 dark:text-red-400"
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
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
                  {editingId ? 'Editar categoría' : 'Nueva categoría'}
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
                placeholder="ej: Transporte, Comida, etc."
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                data-testid="cat-nombre-input"
                required
              />
              <div>
                <Input
                  label="Keywords (separadas por coma)"
                  type="text"
                  placeholder="ej: uber, taxi, colectivo"
                  value={form.keywords}
                  onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  data-testid="cat-keywords-input"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
                  Palabras clave para auto-categorización
                </p>
              </div>
              <Input
                label="Prioridad"
                type="number"
                placeholder="10"
                value={form.prioridad}
                onChange={(e) => setForm({ ...form, prioridad: e.target.value })}
                data-testid="cat-prioridad-input"
              />
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Color
                </label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full h-10 rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  data-testid="cat-submit-btn"
                >
                  {editingId ? 'Actualizar' : 'Agregar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
