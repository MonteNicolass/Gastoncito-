'use client'

import { useState, useEffect } from 'react'
import { getNotes, addNote, deleteNote } from '@/lib/storage'

export default function NotasPage() {
  const [notes, setNotes] = useState([])
  const [text, setText] = useState('')
  const [type, setType] = useState('')

  useEffect(() => {
    loadNotes()
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

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="border-b border-stone-200 bg-white px-4 py-3 sticky top-0">
        <h1 className="text-sm font-bold">Notas</h1>
        <p className="text-xs text-stone-500">Ideas, recordatorios y más</p>
      </header>

      <div className="p-4 space-y-4">
        <div className="rounded-lg border border-stone-200 bg-white p-4 space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribí tu nota acá..."
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400 resize-none"
            rows={4}
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-stone-400"
          >
            <option value="">Sin tipo</option>
            <option value="idea">Idea</option>
            <option value="video">Video</option>
            <option value="negocio">Negocio</option>
            <option value="salud">Salud</option>
            <option value="personal">Personal</option>
          </select>
          <button
            onClick={handleSave}
            className="w-full rounded-lg bg-stone-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-700"
          >
            Guardar nota
          </button>
        </div>

        {notes.length === 0 ? (
          <div className="rounded-lg border border-stone-200 bg-white p-4 text-center text-sm text-stone-500">
            No hay notas guardadas.
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map((note) => (
              <div
                key={note.id}
                className="rounded-lg border border-stone-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  {note.type && (
                    <span className="text-xs bg-stone-100 text-stone-700 px-2 py-1 rounded">
                      {note.type}
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-xs text-red-600 hover:text-red-700 font-semibold ml-auto"
                  >
                    Eliminar
                  </button>
                </div>
                <p className="text-sm text-stone-800 whitespace-pre-wrap">{note.text}</p>
                <p className="text-xs text-stone-400 mt-2">
                  {new Date(note.created_at).toLocaleString('es-AR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}