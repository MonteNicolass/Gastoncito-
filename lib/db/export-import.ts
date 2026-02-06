/**
 * Full Backup & Restore
 * Exports/imports ALL IndexedDB stores + localStorage keys.
 */

const DB_NAME = 'gaston_db'

const STORES = [
  'movimientos',
  'saldos',
  'notes',
  'word_history',
  'categorias',
  'reglas',
  'life_entries',
  'subscriptions',
  'goals',
] as const

const LS_KEYS = [
  'gaston_budgets',
  'gaston_user_rules',
  'gaston_baseline',
  'gaston_price_cache',
  'gaston_rates_history',
  'gaston_monthly_history',
  'gaston_alert_history',
  'theme',
] as const

interface BackupData {
  version: number
  exportedAt: string
  stores: Record<string, unknown[]>
  localStorage: Record<string, string>
}

// ── Export ───────────────────────────────────────────────────

function getAllFromStore(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function exportFullBackup(): Promise<string> {
  const { initDB } = await import('@/lib/storage')
  const db = await initDB() as IDBDatabase

  const stores: Record<string, unknown[]> = {}
  for (const name of STORES) {
    try {
      stores[name] = await getAllFromStore(db, name)
    } catch {
      stores[name] = []
    }
  }

  const ls: Record<string, string> = {}
  for (const key of LS_KEYS) {
    const val = localStorage.getItem(key)
    if (val !== null) ls[key] = val
  }

  const backup: BackupData = {
    version: 12,
    exportedAt: new Date().toISOString(),
    stores,
    localStorage: ls,
  }

  return JSON.stringify(backup, null, 2)
}

// ── Import ──────────────────────────────────────────────────

function putAllInStore(db: IDBDatabase, storeName: string, items: unknown[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.clear()

    let pending = items.length
    if (pending === 0) { resolve(); return }

    for (const item of items) {
      const req = store.put(item)
      req.onsuccess = () => {
        pending--
        if (pending === 0) resolve()
      }
      req.onerror = () => reject(req.error)
    }
  })
}

function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  if (typeof d.version !== 'number') return false
  if (typeof d.exportedAt !== 'string') return false
  if (!d.stores || typeof d.stores !== 'object') return false
  return true
}

export async function importFullBackup(jsonString: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = JSON.parse(jsonString)

    if (!validateBackup(data)) {
      return { ok: false, error: 'Formato de backup inválido' }
    }

    if (data.version > 12) {
      return { ok: false, error: `Versión ${data.version} no soportada (max: 12)` }
    }

    const { initDB } = await import('@/lib/storage')
    const db = await initDB() as IDBDatabase

    for (const name of STORES) {
      const items = data.stores[name]
      if (Array.isArray(items) && items.length > 0) {
        await putAllInStore(db, name, items)
      }
    }

    if (data.localStorage && typeof data.localStorage === 'object') {
      for (const [key, val] of Object.entries(data.localStorage)) {
        if (typeof val === 'string') {
          localStorage.setItem(key, val)
        }
      }
    }

    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al importar'
    return { ok: false, error: msg }
  }
}

// ── Reset ───────────────────────────────────────────────────

export async function resetApp(): Promise<void> {
  const { clearAll } = await import('@/lib/storage')
  await clearAll()

  for (const key of LS_KEYS) {
    localStorage.removeItem(key)
  }

  localStorage.removeItem('gaston_onboarding_done')
}
