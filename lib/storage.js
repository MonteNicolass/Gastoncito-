// lib/storage.js
// Storage unificado y simple para Gastoncito (IndexedDB)

const DB_NAME = 'gaston_db'
const DB_VERSION = 10

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

      const enrichedMov = {
        ...mov,
        merchant_norm: normalizeText(mov.motivo || ''),
        category_id: matchCategory(mov.motivo || '', reglas, categorias),
        created_at: mov.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
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

export async function addWallet(wallet, saldo) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('saldos', 'readwrite')
    const store = tx.objectStore('saldos')
    const req = store.put({ wallet, saldo })

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

export async function updateSaldo(wallet, delta) {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction('saldos', 'readwrite')
    const store = tx.objectStore('saldos')
    const getReq = store.get(wallet)

    getReq.onsuccess = () => {
      let data = getReq.result
      if (!data) data = { wallet, saldo: 0 }

      data.saldo += delta

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
  return []
}

export async function addGoal() {
  return
}

export async function deleteGoal() {
  return
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
  const stores = ['movimientos', 'saldos', 'notes', 'word_history', 'categorias', 'reglas']

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
