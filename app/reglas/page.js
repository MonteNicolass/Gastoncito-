'use client'

import { useState, useEffect } from 'react'
import {
  initDB,
  getRules,
  addRule,
  deleteRule,
  updateRule,
  getCategorias,
  recategorizeAllMovimientos
} from '@/lib/storage'
import { seedPredefinedCategories } from '@/lib/seed-categories'

export default function ReglasPage() {
  const [rules, setRules] = useState([])
  const [categorias, setCategorias] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [isRecategorizing, setIsRecategorizing] = useState(false)

  const [form, setForm] = useState({
    nombre: '',
    match_type: 'includes',
    pattern: '',
    category_id: null,
    priority: 50,
    enabled: true
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await initDB()
    await seedPredefinedCategories()

    const rulesData = await getRules()
    const categoriasData = await getCategorias()

    setRules(rulesData.sort((a, b) => b.priority - a.priority))
    setCategorias(categoriasData)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.nombre || !form.pattern || !form.category_id) {
      alert('Completá todos los campos')
      return
    }

    if (editingId) {
      await updateRule(editingId, form)
      setEditingId(null)
    } else {
      await addRule(
        form.nombre,
        form.match_type,
        form.pattern,
        form.category_id,
        form.priority,
        form.enabled
      )
    }

    resetForm()
    await loadData()
  }

  const handleEdit = (rule) => {
    setEditingId(rule.id)
    setForm({
      nombre: rule.nombre,
      match_type: rule.match_type,
      pattern: rule.pattern,
      category_id: rule.category_id,
      priority: rule.priority,
      enabled: rule.enabled
    })
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta regla?')) return
    await deleteRule(id)
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

  const resetForm = () => {
    setForm({
      nombre: '',
      match_type: 'includes',
      pattern: '',
      category_id: null,
      priority: 50,
      enabled: true
    })
  }

  const getCategoryName = (catId) => {
    const cat = categorias.find(c => c.id === catId)
    return cat ? cat.nombre : 'desconocida'
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="border-b border-stone-200 bg-white px-4 py-3 sticky top-0">
        <h1 className="text-sm font-bold">Reglas de Categorización</h1>
        <p className="text-xs text-stone-500">Configuración avanzada de matching</p>
      </header>

      <div className="p-4 space-y-4">
        {/* Botón de re-categorización */}
        <button
          onClick={handleRecategorize}
          disabled={isRecategorizing}
          data-testid="recategorize-btn"
          className="w-full rounded-lg bg-stone-800 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {isRecategorizing ? '⏳ Re-categorizando...' : '🔄 Re-categorizar todos los movimientos'}
        </button>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
          <div>
            <label className="text-xs text-stone-600 block mb-1">Nombre de la regla</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="ej: Uber → Transporte"
              data-testid="rule-name-input"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1">Tipo de match</label>
            <select
              value={form.match_type}
              onChange={(e) => setForm({ ...form, match_type: e.target.value })}
              data-testid="rule-match-type-select"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            >
              <option value="includes">Contiene</option>
              <option value="startsWith">Empieza con</option>
              <option value="regex">Expresión regular</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1">Patrón</label>
            <input
              type="text"
              value={form.pattern}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              placeholder="ej: uber"
              data-testid="rule-pattern-input"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1">Categoría</label>
            <select
              value={form.category_id || ''}
              onChange={(e) => setForm({ ...form, category_id: parseInt(e.target.value) })}
              data-testid="rule-category-select"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            >
              <option value="">Seleccionar...</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-stone-600 block mb-1">Prioridad</label>
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 50 })}
              placeholder="50"
              data-testid="rule-priority-input"
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
            />
            <p className="text-xs text-stone-400 mt-1">Mayor número = mayor prioridad</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              data-testid="rule-enabled-checkbox"
              className="rounded"
            />
            <label className="text-xs text-stone-600">Regla activa</label>
          </div>

          <div className="flex gap-2">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null)
                  resetForm()
                }}
                className="flex-1 rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-900 hover:bg-stone-50"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              data-testid="rule-submit-btn"
              className="flex-1 rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
            >
              {editingId ? 'Actualizar' : 'Agregar'} regla
            </button>
          </div>
        </form>

        {/* Lista de reglas */}
        {rules.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-4 text-center text-sm text-stone-500">
            No hay reglas configuradas.
          </div>
        ) : (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`rounded-lg border ${rule.enabled ? 'border-stone-200' : 'border-stone-100 bg-stone-50'} bg-white p-3`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{rule.nombre}</div>
                    <div className="text-xs text-stone-500 mt-1">
                      <span className="font-mono bg-stone-100 px-1 rounded">{rule.match_type}</span>
                      {' → '}
                      <span className="font-mono">{rule.pattern}</span>
                      {' → '}
                      <span className="font-semibold">{getCategoryName(rule.category_id)}</span>
                    </div>
                    <div className="text-xs text-stone-400 mt-1">
                      Prioridad: {rule.priority} • {rule.enabled ? '✅ Activa' : '❌ Inactiva'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(rule)}
                      className="text-xs text-stone-600 hover:text-stone-800 font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
