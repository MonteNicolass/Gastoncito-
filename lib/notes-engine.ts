/**
 * Notes Engine V1
 * Captura rápida + contexto para Resumen General
 *
 * Funciones puras. No accede a DB directamente.
 * Sin análisis automático. Sin insights.
 */

// ── Types ────────────────────────────────────────────────────

export interface Note {
  id: number
  text: string
  type?: string | null
  tags?: string[]
  created_at: string
}

export interface NotePreview {
  id: number
  content: string
  tags: string[]
  date: string
}

// ── 1) Get Recent Notes ─────────────────────────────────────

/**
 * Returns the most recent notes, sorted newest first.
 * Default limit: 3.
 */
export function getRecentNotes(notes: Note[], limit: number = 3): NotePreview[] {
  const sorted = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return sorted.slice(0, limit).map(toPreview)
}

// ── 2) Get Notes By Tag ─────────────────────────────────────

/**
 * Filters notes that contain the given tag.
 * Checks both `tags` array and `type` field for compatibility.
 */
export function getNotesByTag(notes: Note[], tag: string): NotePreview[] {
  const normalizedTag = tag.toLowerCase().trim()

  const filtered = notes.filter(note => {
    if (note.tags?.some(t => t.toLowerCase().trim() === normalizedTag)) {
      return true
    }
    if (note.type && note.type.toLowerCase().trim() === normalizedTag) {
      return true
    }
    return false
  })

  return filtered
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(toPreview)
}

// ── 3) Build Note Payload ───────────────────────────────────

/**
 * Builds a note payload ready for storage.addNote().
 */
export function buildNotePayload(
  content: string,
  tags?: string[]
): { text: string; type: string | null; tags?: string[] } {
  return {
    text: content.trim(),
    type: tags && tags.length > 0 ? tags[0] : null,
    ...(tags && tags.length > 0 ? { tags } : {}),
  }
}

// ── Helpers ──────────────────────────────────────────────────

function toPreview(note: Note): NotePreview {
  const tags: string[] = []
  if (note.tags) tags.push(...note.tags)
  else if (note.type) tags.push(note.type)

  return {
    id: note.id,
    content: note.text,
    tags,
    date: note.created_at,
  }
}
