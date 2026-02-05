// lib/storage.js
// Storage unificado y simple para Gastoncito (IndexedDB)

const DB_NAME = 'gaston_db'
const DB_VERSION = 12

let dbInstance = null

// =======================
// INIT
// =======================

export async function initDB() {
  if (dbInstance) return dbInstance

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)

    request.onsuccess = () => {
      dbInstance = request.result
      resolve(dbInstance)
    }

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains('movimientos')) {
        db.createObjectStore('movimientos', {
          keyPath: 'id',
          autoIncrement: true
        })
      }

      if (!db.objectStoreNames.contains('saldos')) {
        db.createObjectStore('saldos', {
          keyPath: 'wallet'
        })
      }

      if (!db.objectStoreNames.contains('notes')) {
        db.createObjectStore('notes', {
          keyPath: 'id',
          autoIncrement: true
        })
      }

      if (!db.objectStoreNames.contains('word_history')) {
        db.createObjectStore('word_history', {
          keyPath: 'word'
        })
      }

      if (!db.objectStoreNames.contains('categorias')) {
        db.createObjectStore('categorias', {
          keyPath: 'id',
          autoIncrement: true
        })
      }

      if (!db.objectStoreNames.contains('reglas')) {
        db.createObjectStore('reglas', {
          keyPath: 'id',
          autoIncrement: true
        })
      }

      if (!db.objectStoreNames.contains('life_entries')) {
        db.createObjectStore('life_entries', {
          keyPath: 'id',
          autoIncrement: true
        })
      }

      if (!db.objectStoreNames.contains('subscriptions')) {
        db.createObjectStore('subscriptions', {
          keyPath: 'id',
          autoIncrement: true
        })
      }

      if (!db.objectStoreNames.contains('goals')) {
        db.createObjectStore('goals', {
          keyPath: 'id',
          autoIncrement: true
        })
      }
    }
  })
}

// =======================
// MOVIMIENTOS
// =======================

export async function addMovimiento(mov) {
  const db = await initDB()

  return new Promise(async (resolve, reject) => {
    try {
      const { normalizeText, matchCategory } = await import('./categorization-engine.js')

      const reglas = await getRules()
      const categorias = await getCategorias()

      // Base enrichment
      let enrichedMov = {
        ...mov,
        merchant_norm: normalizeText(mov.motivo || ''),
        category_id: matchCategory(mov.motivo || '', reglas, categorias),
        created_at: mov.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Auto-calculate USD equivalent (invisible, contextual)
      try {
        const { enrichWithUsdEquivalent } = await import('./services/currency-conversion.js')
        enrichedMov = enrichWithUsdEquivalent(enrichedMov)
      } catch {
        // Silent fail - USD conversion is optional
      }

      const tx = db.transaction('movimientos', 'readwrite')
      const store = tx.objectStore('movimientos')
      const req = store.add(enrichedMov)

      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    } catch (error) {
      reject(error)
    }
  })
}

export async function getMovimientos() {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('movimientos', 'readonly')
    const store = tx.objectStore('movimientos')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// =======================
// SALDOS / BILLETERAS
// =======================

export async function getWallets() {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('saldos', 'readonly')
    const store = tx.objectStore('saldos')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getSaldos() {
  return getWallets()
}

export async function addWallet(wallet, saldo, additionalData = {}) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('saldos', 'readwrite')
    const store = tx.objectStore('saldos')
    const data = {
      wallet,
      saldo,
      ...additionalData
    }
    const req = store.put(data)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function updateWallet(wallet, saldo) {
  return addWallet(wallet, saldo)
}

export async function deleteWallet(wallet) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('saldos', 'readwrite')
    const store = tx.objectStore('saldos')
    const req = store.delete(wallet)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function updateSaldo(wallet, delta, isAbsolute = false) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('saldos', 'readwrite')
    const store = tx.objectStore('saldos')
    const getReq = store.get(wallet)

    getReq.onsuccess = () => {
      let data = getReq.result
      if (!data) data = { wallet, saldo: 0 }

      if (isAbsolute) {
        data.saldo = delta
      } else {
        data.saldo += delta
      }

      const putReq = store.put(data)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// =======================
// NOTES
// =======================

export async function getNotes() {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readonly')
    const store = tx.objectStore('notes')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addNote(note) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite')
    const store = tx.objectStore('notes')

    const payload = {
      text: note.text,
      type: note.type || null,
      created_at: new Date().toISOString()
    }

    const req = store.add(payload)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function deleteNote(id) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('notes', 'readwrite')
    const store = tx.objectStore('notes')
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// =======================
// WORD HISTORY
// =======================

export async function getWordHistory() {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('word_history', 'readonly')
    const store = tx.objectStore('word_history')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addWordToHistory(word) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('word_history', 'readwrite')
    const store = tx.objectStore('word_history')
    const req = store.put({ word })

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// =======================
// MOVIMIENTOS - CRUD ADICIONAL
// =======================

export async function deleteMovimiento(id) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('movimientos', 'readwrite')
    const store = tx.objectStore('movimientos')
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function updateMovimiento(id, updates) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('movimientos', 'readwrite')
    const store = tx.objectStore('movimientos')

    const getReq = store.get(id)
    getReq.onsuccess = async () => {
      const mov = getReq.result
      if (!mov) {
        reject(new Error('Movimiento no encontrado'))
        return
      }

      const updated = {
        ...mov,
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Si cambió la descripción, re-categorizar
      if (updates.motivo && updates.motivo !== mov.motivo) {
        try {
          const { normalizeText, matchCategory } = await import('./categorization-engine.js')
          const reglas = await getRules()
          const categorias = await getCategorias()

          updated.merchant_norm = normalizeText(updates.motivo)
          updated.category_id = matchCategory(updates.motivo, reglas, categorias)
        } catch (error) {
          console.error('Error re-categorizando:', error)
        }
      }

      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// =======================
// CATEGORIAS
// =======================

export async function getCategorias() {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('categorias', 'readonly')
    const store = tx.objectStore('categorias')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addCategoria(nombre, keywords, prioridad, color = null, esPredefinida = false) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('categorias', 'readwrite')
    const store = tx.objectStore('categorias')

    const categoria = {
      nombre: nombre.toLowerCase().trim(),
      keywords: keywords.map(k => k.toLowerCase().trim()),
      es_predefinida: esPredefinida,
      prioridad: prioridad || 10,
      color: color,
      created_at: new Date().toISOString()
    }

    const req = store.add(categoria)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteCategoria(id) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('categorias', 'readwrite')
    const store = tx.objectStore('categorias')
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function updateCategoria(id, updates) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('categorias', 'readwrite')
    const store = tx.objectStore('categorias')

    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const cat = getReq.result
      if (!cat) {
        reject(new Error('Categoría no encontrada'))
        return
      }

      const updated = { ...cat, ...updates }
      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// =======================
// REGLAS
// =======================

export async function getRules() {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('reglas', 'readonly')
    const store = tx.objectStore('reglas')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function addRule(nombre, matchType, pattern, categoryId, priority, enabled = true) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('reglas', 'readwrite')
    const store = tx.objectStore('reglas')

    const rule = {
      nombre: nombre.trim(),
      match_type: matchType,
      pattern: pattern.toLowerCase().trim(),
      category_id: categoryId,
      priority: priority || 50,
      enabled: enabled,
      created_at: new Date().toISOString()
    }

    const req = store.add(rule)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteRule(id) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('reglas', 'readwrite')
    const store = tx.objectStore('reglas')
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function updateRule(id, updates) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('reglas', 'readwrite')
    const store = tx.objectStore('reglas')

    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const rule = getReq.result
      if (!rule) {
        reject(new Error('Regla no encontrada'))
        return
      }

      const updated = { ...rule, ...updates }
      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

// =======================
// RECATEGORIZACION MASIVA
// =======================

export async function recategorizeAllMovimientos() {
  const db = await initDB()

  return new Promise(async (resolve, reject) => {
    try {
      const { normalizeText, matchCategory } = await import('./categorization-engine.js')

      const movimientos = await getMovimientos()
      const reglas = await getRules()
      const categorias = await getCategorias()

      const tx = db.transaction('movimientos', 'readwrite')
      const store = tx.objectStore('movimientos')

      let processed = 0

      for (const mov of movimientos) {
        const merchant_norm = normalizeText(mov.motivo || '')
        const category_id = matchCategory(mov.motivo || '', reglas, categorias)

        const updated = {
          ...mov,
          merchant_norm,
          category_id,
          updated_at: new Date().toISOString()
        }

        store.put(updated)
        processed++
      }

      tx.oncomplete = () => resolve({ processed })
      tx.onerror = () => reject(tx.error)
    } catch (error) {
      reject(error)
    }
  })
}

// =======================
// STUBS - FUNCIONES PENDIENTES
// =======================

export async function getBehavioralGoals() {
  return []
}

export async function addBehavioralGoal() {
  return
}

export async function deleteBehavioralGoal() {
  return
}

export async function getGoals() {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('goals', 'readonly')
    const store = tx.objectStore('goals')
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result || [])
    req.onerror = () => reject(req.error)
  })
}

export async function addGoal(goal) {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('goals', 'readwrite')
    const store = tx.objectStore('goals')
    const req = store.add(goal)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function updateGoal(id, updates) {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('goals', 'readwrite')
    const store = tx.objectStore('goals')
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const goal = getReq.result
      if (!goal) {
        reject(new Error('Goal not found'))
        return
      }

      const updated = { ...goal, ...updates }
      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve(updated)
      putReq.onerror = () => reject(putReq.error)
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

export async function deleteGoal(id) {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('goals', 'readwrite')
    const store = tx.objectStore('goals')
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getAlerts() {
  return []
}

export async function markAlertAsRead() {
  return
}

export async function getSettings() {
  return {}
}

export async function setSetting() {
  return
}

export async function exportMovimientosJSON() {
  const movs = await getMovimientos()
  return JSON.stringify(movs, null, 2)
}

export async function exportMovimientosCSV() {
  const movs = await getMovimientos()
  const headers = 'id,tipo,monto,metodo,categoria,motivo,fecha\n'
  const rows = movs.map(m => `${m.id},${m.tipo},${m.monto},${m.metodo},${m.categoria || ''},${m.motivo},${m.fecha}`).join('\n')
  return headers + rows
}

export async function exportBackupJSON() {
  const movs = await getMovimientos()
  const saldos = await getWallets()
  const notes = await getNotes()
  return JSON.stringify({ movimientos: movs, saldos, notes }, null, 2)
}

export async function importBackupJSON() {
  return
}

export async function clearAll() {
  const db = await initDB()
  const stores = ['movimientos', 'saldos', 'notes', 'word_history', 'categorias', 'reglas', 'life_entries', 'subscriptions']

  for (const storeName of stores) {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.clear()
  }
}

export async function getCrypto() {
  return []
}

export async function setCrypto() {
  return
}

export async function deleteCrypto() {
  return
}

// =======================
// LIFE ENTRIES
// =======================

export async function addLifeEntry(entry) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('life_entries', 'readwrite')
    const store = tx.objectStore('life_entries')

    const payload = {
      text: entry.text,
      domain: entry.domain || 'general',
      meta: entry.meta || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const req = store.add(payload)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getLifeEntries() {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('life_entries', 'readonly')
    const store = tx.objectStore('life_entries')
    const req = store.getAll()

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getLifeEntriesByDomain(domain) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('life_entries', 'readonly')
    const store = tx.objectStore('life_entries')
    const req = store.getAll()

    req.onsuccess = () => {
      const filtered = req.result.filter(entry => entry.domain === domain)
      resolve(filtered)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function updateLifeEntry(id, updates) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('life_entries', 'readwrite')
    const store = tx.objectStore('life_entries')

    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const entry = getReq.result
      if (!entry) {
        reject(new Error('Entry no encontrada'))
        return
      }

      const updated = {
        ...entry,
        ...updates,
        updated_at: new Date().toISOString()
      }

      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

export async function deleteLifeEntry(id) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('life_entries', 'readwrite')
    const store = tx.objectStore('life_entries')
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// =======================
// SUBSCRIPTIONS
// =======================

export async function addSubscription(sub) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('subscriptions', 'readwrite')
    const store = tx.objectStore('subscriptions')

    const payload = {
      name: sub.name,
      amount: sub.amount,
      cadence_months: sub.cadence_months || 1,
      next_charge_date: sub.next_charge_date,
      active: sub.active !== undefined ? sub.active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const req = store.add(payload)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function getSubscriptions() {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('subscriptions', 'readonly')
    const store = tx.objectStore('subscriptions')
    const req = store.getAll()

    req.onsuccess = () => {
      const sorted = req.result.sort((a, b) =>
        new Date(a.next_charge_date) - new Date(b.next_charge_date)
      )
      resolve(sorted)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function updateSubscription(id, updates) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('subscriptions', 'readwrite')
    const store = tx.objectStore('subscriptions')

    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const sub = getReq.result
      if (!sub) {
        reject(new Error('Suscripción no encontrada'))
        return
      }

      const updated = {
        ...sub,
        ...updates,
        updated_at: new Date().toISOString()
      }

      const putReq = store.put(updated)
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }

    getReq.onerror = () => reject(getReq.error)
  })
}

export async function deleteSubscription(id) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('subscriptions', 'readwrite')
    const store = tx.objectStore('subscriptions')
    const req = store.delete(id)

    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

export async function getActiveSubscriptions() {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('subscriptions', 'readonly')
    const store = tx.objectStore('subscriptions')
    const req = store.getAll()

    req.onsuccess = () => {
      const filtered = req.result.filter(sub => sub.active)
      const sorted = filtered.sort((a, b) =>
        new Date(a.next_charge_date) - new Date(b.next_charge_date)
      )
      resolve(sorted)
    }
    req.onerror = () => reject(req.error)
  })
}
