'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { initDB, getNotes, addNote, deleteNote } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'

export default function NotasPage() {
  const [notes, setNotes] = useState([])
  const [text, setText] = useState('')
  const [type, setType] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    initDB().then(loadNotes)
  }, [])

  const loadNotes = useCallback(async () => {
    const data = await getNotes()
    setNotes(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }, [])

  const handleSave = useCallback(async () => {
    if (!text.trim()) return
    await addNote({ text: text.trim(), type: type || null })
    setText('')
    setType('')
    await loadNotes()
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
              className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 dark:placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all resize-none"
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
              <div className="text-3xl mb-3">📄</div>
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
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 capitalize">
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
                  <Button
                    onClick={() => handleDelete(note.id)}
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
    </div>
  )
}
