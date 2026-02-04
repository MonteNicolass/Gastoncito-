'use client'

import { useState, useEffect } from 'react'
import { initDB, getNotes, addNote, deleteNote } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'

export default function NotasPage() {
  const [notes, setNotes] = useState([])
  const [text, setText] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    initDB().then(loadNotes)
  }, [])

  const loadNotes = async () => {
    const data = await getNotes()
    setNotes(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
  }

  const handleSave = async () => {
    if (!text.trim()) return
    await addNote({ text: text.trim(), type: type || null })
    setText('')
    setType('')
    await loadNotes()
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta nota?')) return
    await deleteNote(id)
    await loadNotes()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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

        {/* Lista de notas */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis notas
          </h2>
          {notes.length === 0 ? (
            <Card className="p-6 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No hay notas guardadas.
              </p>
            </Card>
          ) : (
            notes.map((note) => (
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
