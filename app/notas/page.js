'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { initDB, getNotes, addNote, deleteNote } from '@/lib/storage'
import { getPresets, savePreset } from '@/lib/quick-presets'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Toast from '@/components/ui/Toast'
import { StickyNote, Trash2 } from 'lucide-react'

export default function NotasPage() {
  const [notes, setNotes] = useState([])
  const [text, setText] = useState('')
  const [type, setType] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    initDB().then(() => {
      loadNotes()
      // Cargar último tipo usado
      const presets = getPresets()
      if (presets.lastNoteType) {
        setType(presets.lastNoteType)
      }
    })
  }, [])

  const loadNotes = useCallback(async () => {
    const data = await getNotes()
    setNotes(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }, [])

  const handleSave = useCallback(async () => {
    if (!text.trim()) return
    await addNote({ text: text.trim(), type: type || null })

    // Guardar preset
    if (type) savePreset('lastNoteType', type)

    setText('')
    await loadNotes()
    setToast({ message: 'Guardado', type: 'success' })
  }, [text, type, loadNotes])

  const handleDelete = useCallback(async (id) => {
    if (!confirm('¿Eliminar esta nota?')) return
    await deleteNote(id)
    await loadNotes()
  }, [loadNotes])

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }, [])

  // Memoize filtered notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n =>
      filterType === 'all' ||
      (filterType === 'null' ? !n.type : n.type === filterType)
    )
  }, [notes, filterType])

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Notas" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Formulario de nueva nota */}
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-3">
            Nueva nota
          </h2>
          <div className="space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribí tu nota acá..."
              className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-terra-500/50 focus:border-terra-500 transition-all resize-none"
              rows={4}
            />
            <Select
              label="Tipo (opcional)"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="">Sin tipo</option>
              <option value="general">General</option>
              <option value="mental">Mental</option>
              <option value="money">Money</option>
              <option value="idea">Idea</option>
              <option value="video">Video</option>
              <option value="negocio">Negocio</option>
              <option value="salud">Salud</option>
              <option value="personal">Personal</option>
            </Select>
            <Button
              onClick={handleSave}
              disabled={!text.trim()}
              variant="primary"
              className="w-full"
            >
              Guardar nota
            </Button>
          </div>
        </Card>

        {/* Filtro */}
        <div className="px-1">
          <Select
            label="Filtrar por tipo"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm"
          >
            <option value="all">Todas</option>
            <option value="general">General</option>
            <option value="mental">Mental</option>
            <option value="money">Money</option>
            <option value="idea">Idea</option>
            <option value="video">Video</option>
            <option value="negocio">Negocio</option>
            <option value="salud">Salud</option>
            <option value="personal">Personal</option>
            <option value="null">Sin tipo</option>
          </Select>
        </div>

        {/* Lista de notas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Mis notas
            </h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {filteredNotes.length} notas
            </span>
          </div>
          {filteredNotes.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                <StickyNote className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                {filterType === 'all' ? 'Sin notas aún' : 'Sin notas con este filtro'}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {filterType === 'all' ? 'Guardá tu primera nota arriba' : 'Probá con otro filtro'}
              </p>
            </Card>
          ) : (
            filteredNotes.map((note) => (
              <Card key={note.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {note.type && (
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-lg bg-terra-100 dark:bg-terra-900/30 text-terra-700 dark:text-terra-300 capitalize">
                          {note.type}
                        </span>
                      </div>
                    )}
                    <div className="text-base text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap mb-2">
                      {note.text}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(note.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="p-2 text-red-500 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

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
