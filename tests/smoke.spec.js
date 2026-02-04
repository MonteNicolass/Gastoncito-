// tests/smoke.spec.js
import { test, expect } from '@playwright/test'

test.describe('Smoke Tests - Sistema de Categorización', () => {
  test.beforeEach(async ({ page }) => {
    // Limpiar IndexedDB antes de cada test
    await page.goto('/')
    await page.evaluate(() => {
      return new Promise((resolve, reject) => {
        const req = indexedDB.deleteDatabase('gaston_db')
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    })
    // Recargar para inicializar la DB limpia
    await page.reload()
  })

  test('1. IndexedDB gaston_db está en versión 10', async ({ page }) => {
    await page.goto('/reglas')

    const dbVersion = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('gaston_db')
        req.onsuccess = () => {
          const db = req.result
          resolve(db.version)
          db.close()
        }
      })
    })

    expect(dbVersion).toBe(10)
  })

  test('2. Existen stores categorias, reglas y movimientos', async ({ page }) => {
    await page.goto('/reglas')

    const stores = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('gaston_db')
        req.onsuccess = () => {
          const db = req.result
          const storeNames = Array.from(db.objectStoreNames)
          resolve(storeNames)
          db.close()
        }
      })
    })

    expect(stores).toContain('categorias')
    expect(stores).toContain('reglas')
    expect(stores).toContain('movimientos')
  })

  test('3. Hay 9 categorías predefinidas en categorias', async ({ page }) => {
    await page.goto('/reglas')

    // Esperar a que se carguen las categorías
    await page.waitForTimeout(1000)

    const categorias = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('gaston_db')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('categorias', 'readonly')
          const store = tx.objectStore('categorias')
          const getAllReq = store.getAll()

          getAllReq.onsuccess = () => {
            resolve(getAllReq.result)
            db.close()
          }
        }
      })
    })

    expect(categorias.length).toBe(9)

    const nombres = categorias.map(c => c.nombre)
    expect(nombres).toContain('comida')
    expect(nombres).toContain('transporte')
    expect(nombres).toContain('ocio')
    expect(nombres).toContain('suscripciones')
    expect(nombres).toContain('compras')
    expect(nombres).toContain('servicios')
    expect(nombres).toContain('salud')
    expect(nombres).toContain('educacion')
    expect(nombres).toContain('alquiler')
  })

  test('4. Crear regla: uber -> transporte, priority 100', async ({ page }) => {
    await page.goto('/reglas')

    // Esperar a que carguen las categorías
    await page.waitForTimeout(1000)

    // Llenar formulario de regla
    await page.fill('[data-testid="rule-name-input"]', 'Uber → Transporte')
    await page.selectOption('[data-testid="rule-match-type-select"]', 'includes')
    await page.fill('[data-testid="rule-pattern-input"]', 'uber')

    // Seleccionar categoría "transporte"
    const categorias = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('gaston_db')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('categorias', 'readonly')
          const store = tx.objectStore('categorias')
          const getAllReq = store.getAll()

          getAllReq.onsuccess = () => {
            resolve(getAllReq.result)
            db.close()
          }
        }
      })
    })

    const transporteId = categorias.find(c => c.nombre === 'transporte')?.id
    await page.selectOption('[data-testid="rule-category-select"]', String(transporteId))

    await page.fill('[data-testid="rule-priority-input"]', '100')

    // Enviar formulario
    await page.click('[data-testid="rule-submit-btn"]')

    // Esperar a que se guarde
    await page.waitForTimeout(500)

    // Verificar que la regla se creó en IndexedDB
    const reglas = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('gaston_db')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('reglas', 'readonly')
          const store = tx.objectStore('reglas')
          const getAllReq = store.getAll()

          getAllReq.onsuccess = () => {
            resolve(getAllReq.result)
            db.close()
          }
        }
      })
    })

    expect(reglas.length).toBe(1)
    expect(reglas[0].pattern).toBe('uber')
    expect(reglas[0].priority).toBe(100)
    expect(reglas[0].enabled).toBe(true)
  })

  test('5-6. Agregar movimiento "gasté 500 en uber" y verificar categoría transporte', async ({ page }) => {
    // Primero crear la regla
    await page.goto('/reglas')
    await page.waitForTimeout(1000)

    const categorias = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('gaston_db')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('categorias', 'readonly')
          const store = tx.objectStore('categorias')
          const getAllReq = store.getAll()

          getAllReq.onsuccess = () => {
            resolve(getAllReq.result)
            db.close()
          }
        }
      })
    })

    const transporteId = categorias.find(c => c.nombre === 'transporte')?.id

    // Crear regla
    await page.fill('[data-testid="rule-name-input"]', 'Uber → Transporte')
    await page.selectOption('[data-testid="rule-match-type-select"]', 'includes')
    await page.fill('[data-testid="rule-pattern-input"]', 'uber')
    await page.selectOption('[data-testid="rule-category-select"]', String(transporteId))
    await page.fill('[data-testid="rule-priority-input"]', '100')
    await page.click('[data-testid="rule-submit-btn"]')
    await page.waitForTimeout(500)

    // Ir a chat y agregar movimiento
    await page.goto('/chat')
    await page.fill('[data-testid="chat-input"]', 'gasté 500 en uber')
    await page.click('[data-testid="chat-send-btn"]')

    // Esperar a que se procese
    await page.waitForTimeout(1000)

    // Verificar en movimientos
    await page.goto('/movimientos')
    await page.waitForTimeout(500)

    // Verificar que el movimiento aparece con categoría transporte
    const movimientoText = await page.locator('[data-testid="movimiento-item"]').first().textContent()
    expect(movimientoText).toContain('transporte')

    // Verificar en IndexedDB
    const movimientos = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('gaston_db')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('movimientos', 'readonly')
          const store = tx.objectStore('movimientos')
          const getAllReq = store.getAll()

          getAllReq.onsuccess = () => {
            resolve(getAllReq.result)
            db.close()
          }
        }
      })
    })

    expect(movimientos.length).toBeGreaterThan(0)
    const movimiento = movimientos[0]
    expect(movimiento.category_id).toBe(transporteId)
    expect(movimiento.monto).toBe(500)
  })

  test('7. Test de normalización: gasté 1000 en mp → merchant_norm: mercado pago', async ({ page }) => {
    await page.goto('/chat')

    await page.fill('[data-testid="chat-input"]', 'gasté 1000 en mp')
    await page.click('[data-testid="chat-send-btn"]')

    // Esperar a que se procese
    await page.waitForTimeout(1000)

    // Verificar en IndexedDB que merchant_norm es "mercado pago"
    const movimientos = await page.evaluate(() => {
      return new Promise((resolve) => {
        const req = indexedDB.open('gaston_db')
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('movimientos', 'readonly')
          const store = tx.objectStore('movimientos')
          const getAllReq = store.getAll()

          getAllReq.onsuccess = () => {
            resolve(getAllReq.result)
            db.close()
          }
        }
      })
    })

    expect(movimientos.length).toBeGreaterThan(0)

    const movimiento = movimientos.find(m => m.monto === 1000)
    expect(movimiento).toBeDefined()
    expect(movimiento.merchant_norm).toContain('mercado pago')
  })
})
