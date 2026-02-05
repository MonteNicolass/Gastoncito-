// lib/backup.js
// Sistema de backup y restore completo

/**
 * Obtiene todos los datos de IndexedDB
 */
export async function getAllStores(db) {
  const stores = {
    movimientos: [],
    saldos: [],
    notes: [],
    categorias: [],
    reglas: [],
    life_entries: [],
    subscriptions: [],
    goals: []
  }

  const storeNames = Object.keys(stores)

  for (const storeName of storeNames) {
    try {
      const transaction = db.transaction(storeName, 'readonly')
      const objectStore = transaction.objectStore(storeName)
      const request = objectStore.getAll()

      stores[storeName] = await new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.warn(`Store ${storeName} not found or error:`, error)
    }
  }

  return stores
}

/**
 * Restaura todos los datos a IndexedDB
 */
export async function restoreAllStores(db, data) {
  const storeNames = Object.keys(data)

  for (const storeName of storeNames) {
    if (!data[storeName] || data[storeName].length === 0) continue

    try {
      const transaction = db.transaction(storeName, 'readwrite')
      const objectStore = transaction.objectStore(storeName)

      // Limpiar store
      await new Promise((resolve, reject) => {
        const clearRequest = objectStore.clear()
        clearRequest.onsuccess = () => resolve()
        clearRequest.onerror = () => reject(clearRequest.error)
      })

      // Agregar todos los registros
      for (const item of data[storeName]) {
        await new Promise((resolve, reject) => {
          const addRequest = objectStore.add(item)
          addRequest.onsuccess = () => resolve()
          addRequest.onerror = () => reject(addRequest.error)
        })
      }
    } catch (error) {
      console.error(`Error restoring ${storeName}:`, error)
    }
  }
}

/**
 * Crea un backup completo
 */
export async function createBackup(db) {
  const indexedDBData = await getAllStores(db)

  // Agregar localStorage
  const localStorageData = {
    gaston_budgets: typeof window !== 'undefined' ? localStorage.getItem('gaston_budgets') : null
  }

  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    indexedDB: indexedDBData,
    localStorage: localStorageData
  }

  return backup
}

/**
 * Descarga backup como JSON
 */
export function downloadBackup(backup) {
  const jsonString = JSON.stringify(backup, null, 2)
  const blob = new Blob([jsonString], { type: 'application/json' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
  const filename = `gastoncito_backup_${timestamp}.json`

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Restaura desde un backup JSON
 */
export async function restoreBackup(db, backupData) {
  // Validar formato
  if (!backupData.indexedDB || !backupData.timestamp) {
    throw new Error('Formato de backup inválido')
  }

  // Restaurar IndexedDB
  await restoreAllStores(db, backupData.indexedDB)

  // Restaurar localStorage
  if (backupData.localStorage) {
    Object.keys(backupData.localStorage).forEach(key => {
      const value = backupData.localStorage[key]
      if (value) {
        localStorage.setItem(key, value)
      }
    })
  }

  return true
}

/**
 * Lee un archivo de backup
 */
export function readBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result)
        resolve(backup)
      } catch (error) {
        reject(new Error('Error al parsear JSON'))
      }
    }

    reader.onerror = () => reject(new Error('Error al leer archivo'))
    reader.readAsText(file)
  })
}
