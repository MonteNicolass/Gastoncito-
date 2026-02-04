'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { initDB, getLifeEntriesByDomain, deleteLifeEntry } from '@/lib/storage'
import TopBar from '@/components/ui/TopBar'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'

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

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title="Diario Mental" backHref="/mental" />

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Nueva entrada button */}
        <Button
          onClick={() => router.push('/mental/estado')}
          variant="primary"
          className="w-full"
          data-testid="new-entry-btn"
        >
          Nueva entrada
        </Button>

        {/* Entries List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 px-1">
            Mis entradas
          </h2>
          {entries.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-3xl mb-3">📝</div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Sin entradas aún
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Registrá tu primer estado para empezar
              </p>
            </Card>
          ) : (
            entries.map((entry) => (
              <Card
                key={entry.id}
                className="p-4"
                data-testid="entry-item"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Mood badge if exists */}
                    {getMoodBadge(entry) && (
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {getMoodBadge(entry)}
                        </span>
                      </div>
                    )}

                    {/* Entry text */}
                    <div className="text-base text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap mb-2">
                      {entry.text}
                    </div>

                    {/* Date */}
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatDate(entry.created_at)}
                    </div>
                  </div>

                  {/* Delete button */}
                  <Button
                    onClick={() => handleDelete(entry.id)}
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
