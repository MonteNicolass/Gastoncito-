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
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'

export default function ReglasPage() {
  const [rules, setRules] = useState([])
  const [categorias, setCategorias] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [isRecategorizing, setIsRecategorizing] = useState(false)
  const [contextMenuId, setContextMenuId] = useState(null)

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

  // Cerrar menú contextual al hacer click fuera
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenuId) setContextMenuId(null)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [contextMenuId])

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
    setContextMenuId(null)
  }

  const handleToggleEnabled = async (rule) => {
    await updateRule(rule.id, { ...rule, enabled: !rule.enabled })
    await loadData()
    setContextMenuId(null)
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
    <div className="flex flex-col min-h-screen">
      <TopBar title="Reglas" backHref="/mas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Botón de re-categorización */}
        <Button
          onClick={handleRecategorize}
          disabled={isRecategorizing}
          data-testid="recategorize-btn"
          variant="secondary"
          size="lg"
          className="w-full"
        >
          {isRecategorizing ? '⏳ Re-categorizando...' : '🔄 Re-categorizar todos'}
        </Button>

        {/* Formulario */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            {editingId ? 'Editar regla' : 'Nueva regla'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              label="Nombre de la regla"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="ej: Uber → Transporte"
              data-testid="rule-name-input"
            />

            <Select
              label="Tipo de match"
              value={form.match_type}
              onChange={(e) => setForm({ ...form, match_type: e.target.value })}
              data-testid="rule-match-type-select"
            >
              <option value="includes">Contiene</option>
              <option value="startsWith">Empieza con</option>
              <option value="regex">Expresión regular</option>
            </Select>

            <Input
              label="Patrón"
              value={form.pattern}
              onChange={(e) => setForm({ ...form, pattern: e.target.value })}
              placeholder="ej: uber"
              data-testid="rule-pattern-input"
            />

            <Select
              label="Categoría"
              value={form.category_id || ''}
              onChange={(e) => setForm({ ...form, category_id: parseInt(e.target.value) })}
              data-testid="rule-category-select"
            >
              <option value="">Seleccionar...</option>
              {categorias.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nombre}
                </option>
              ))}
            </Select>

            <div>
              <Input
                label="Prioridad"
                type="number"
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 50 })}
                placeholder="50"
                data-testid="rule-priority-input"
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">Mayor número = mayor prioridad</p>
            </div>

            <div className="flex items-center justify-between py-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Regla activa</label>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                data-testid="rule-enabled-checkbox"
                className="w-5 h-5 rounded text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              {editingId && (
                <Button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    resetForm()
                  }}
                  variant="ghost"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              )}
              <Button
                type="submit"
                data-testid="rule-submit-btn"
                variant="primary"
                className="flex-1"
              >
                {editingId ? 'Actualizar' : 'Agregar'} regla
              </Button>
            </div>
          </form>
        </Card>

        {/* Lista de reglas */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Reglas configuradas
          </h2>
          {rules.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Sin reglas
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Crea tu primera regla para categorizar automáticamente tus movimientos
              </p>
            </Card>
          ) : (
            rules.map((rule) => (
              <Card
                key={rule.id}
                className={`p-4 ${!rule.enabled ? 'opacity-60' : ''} hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors`}
              >
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                        {rule.nombre}
                      </div>
                      {rule.enabled ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                          Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          Pausada
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {rule.match_type}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">→</span>
                      <span className="text-xs font-mono text-zinc-700 dark:text-zinc-300">
                        {rule.pattern}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">→</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {getCategoryName(rule.category_id)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>Prioridad: {rule.priority}</span>
                    </div>
                  </div>

                  {/* Menú contextual */}
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setContextMenuId(contextMenuId === rule.id ? null : rule.id)
                      }}
                      className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-colors"
                    >
                      <svg className="w-5 h-5 text-zinc-600 dark:text-zinc-400" fill="currentColor" viewBox="0 0 16 16">
                        <circle cx="8" cy="3" r="1.5"/>
                        <circle cx="8" cy="8" r="1.5"/>
                        <circle cx="8" cy="13" r="1.5"/>
                      </svg>
                    </button>
                    {contextMenuId === rule.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-700 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEdit(rule)
                            setContextMenuId(null)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-t-lg"
                        >
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleEnabled(rule)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        >
                          {rule.enabled ? 'Pausar' : 'Activar'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(rule.id)
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
