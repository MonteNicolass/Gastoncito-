'use client'

import { useRouter } from 'next/navigation'
import type { NotePreview } from '@/lib/notes-engine'
import Card from '@/components/ui/Card'
import { StickyNote, ChevronRight } from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays}d`
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
}

function truncate(text: string, maxLength: number = 80): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '...'
}

// ── Component ────────────────────────────────────────────────

interface NotesPreviewProps {
  notes: NotePreview[]
}

export default function NotesPreview({ notes }: NotesPreviewProps) {
  const router = useRouter()

  if (notes.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <StickyNote className="w-3 h-3" />
          Notas recientes
        </h3>
        <button
          onClick={() => router.push('/notas')}
          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors flex items-center gap-0.5"
        >
          Ver todas
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <Card className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
        {notes.map(note => (
          <div key={note.id} className="px-4 py-3 first:pt-3 last:pb-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-snug flex-1 min-w-0">
                {truncate(note.content)}
              </p>
              <span className="text-[10px] text-zinc-400 flex-shrink-0 mt-0.5">
                {formatRelativeDate(note.date)}
              </span>
            </div>
            {note.tags.length > 0 && (
              <div className="flex gap-1.5 mt-1.5">
                {note.tags.slice(0, 2).map(tag => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  )
}
