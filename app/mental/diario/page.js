'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntriesByDomain, deleteLifeEntry } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { BookOpen, Pencil } from 'lucide-react'

export default function DiarioMentalPage() {
  const router = useRouter()
  const [entries, setEntries] = useState([])

  useEffect(() => {
    initDB().then(loadEntries)
  }, [])

  const loadEntries = async () => {
    const data = await getLifeEntriesByDomain('mental')
    // Sort by created_at DESC (newest first)
    const sorted = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    setEntries(sorted)
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta entrada?')) return
    await deleteLifeEntry(id)
    await loadEntries()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getMoodBadge = (entry) => {
    if (entry.meta && entry.meta.mood_score) {
      return `Estado: ${entry.meta.mood_score}/10`
    }
    return null
  }

  const getMoodColor = (score) => {
    if (score >= 8) return 'bg-green-500'
    if (score >= 6) return 'bg-zinc-500'
    if (score >= 4) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <TopBar title="Mi diario" backHref="/mental" />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
        {/* Nueva entrada - Acción destacada */}
        <a href="/mental/estado" className="block">
          <Card className="p-5 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 dark:bg-zinc-900/20 flex items-center justify-center">
                  <Pencil className="w-6 h-6 text-white dark:text-zinc-900" />
                </div>
                <div>
                  <p className="text-white dark:text-zinc-900 font-semibold">Nueva entrada</p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-sm">Registrar cómo te sentís</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-white/60 dark:text-zinc-900/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Card>
        </a>

        {/* Entries List */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-1">
            Entradas recientes
          </h3>
          {entries.length === 0 ? (
            <Card className="p-8 text-center bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-zinc-500 dark:text-zinc-400" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Tu diario está vacío
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Empezá registrando cómo te sentís hoy
              </p>
            </Card>
          ) : (
            entries.map((entry) => (
              <Card
                key={entry.id}
                className="p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                data-testid="entry-item"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Mood badge */}
                    {entry.meta?.mood_score && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-4 h-4 rounded-full ${getMoodColor(entry.meta.mood_score)}`} />
                        <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                          {entry.meta.mood_score}
                        </span>
                        <span className="text-sm text-zinc-400 dark:text-zinc-500">/10</span>
                      </div>
                    )}

                    {/* Entry text */}
                    {entry.text && entry.text !== `Estado: ${entry.meta?.mood_score}/10` && (
                      <div className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap mb-2 leading-relaxed">
                        {entry.text}
                      </div>
                    )}

                    {/* Date */}
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(entry.created_at)}
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors text-red-500 dark:text-red-400 flex-shrink-0"
                    aria-label="Eliminar entrada"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
