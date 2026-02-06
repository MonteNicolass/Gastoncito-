/**
 * App Boot Sequence
 * Manages initialization state: loading → ready | error
 */

export type AppStatus = 'loading' | 'ready' | 'error'

export interface BootState {
  status: AppStatus
  error: string | null
}

const DB_NAME = 'gaston_db'

function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

async function checkDBHealth(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME)

      req.onerror = () => {
        reject(new Error('No se pudo abrir la base de datos'))
      }

      req.onsuccess = () => {
        const db = req.result
        const storeNames = Array.from(db.objectStoreNames)
        db.close()

        const required = ['movimientos', 'life_entries', 'subscriptions', 'goals', 'notes']
        const missing = required.filter(s => !storeNames.includes(s))

        if (missing.length > 0) {
          reject(new Error(`Stores faltantes: ${missing.join(', ')}`))
          return
        }

        resolve()
      }

      req.onblocked = () => {
        reject(new Error('Base de datos bloqueada por otra pestaña'))
      }
    } catch (e) {
      reject(e)
    }
  })
}

export async function bootApp(): Promise<BootState> {
  if (typeof window === 'undefined') {
    return { status: 'loading', error: null }
  }

  if (!isIndexedDBAvailable()) {
    return {
      status: 'error',
      error: 'IndexedDB no disponible. Usá un navegador compatible.',
    }
  }

  try {
    const { initDB } = await import('@/lib/storage')
    await initDB()
    await checkDBHealth()
    return { status: 'ready', error: null }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido al iniciar'
    return { status: 'error', error: msg }
  }
}
