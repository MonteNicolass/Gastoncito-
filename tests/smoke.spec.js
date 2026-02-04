// tests/smoke.spec.js
import { test, expect } from '@playwright/test'

test.describe('Smoke Tests - Gastoncito Super-App', () => {
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

  test('1. IndexedDB gaston_db está en versión 11', async ({ page }) => {
    await page.goto('/money')

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

    expect(dbVersion).toBe(11)
  })

  test('2. Existen stores requeridos (movimientos, categorias, life_entries, subscriptions)', async ({ page }) => {
    await page.goto('/money')

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

    expect(stores).toContain('movimientos')
    expect(stores).toContain('categorias')
    expect(stores).toContain('life_entries')
    expect(stores).toContain('subscriptions')
  })

  test('3. Existen categorías predefinidas incluyendo transporte', async ({ page }) => {
    await page.goto('/money')
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

    expect(categorias.length).toBeGreaterThan(0)
    const nombres = categorias.map(c => c.nombre)
    expect(nombres).toContain('transporte')
  })

  test('4. Money manual: crear movimiento desde /money/movimientos', async ({ page }) => {
    await page.goto('/money/movimientos')

    // Esperar a que las categorías estén seeded (botón habilitado)
    await page.waitForSelector('[data-testid="add-movimiento-btn"]:not([disabled])')

    // Abrir modal de agregar movimiento
    await page.click('[data-testid="add-movimiento-btn"]')

    // Llenar formulario
    await page.fill('[data-testid="manual-monto-input"]', '500')
    await page.fill('[data-testid="manual-motivo-input"]', 'Taxi al centro')
    await page.selectOption('[data-testid="manual-tipo-select"]', 'gasto')
    await page.selectOption('[data-testid="manual-metodo-select"]', 'efectivo')

    // Enviar
    await page.click('[data-testid="manual-submit-btn"]')

    // Esperar señal de completado (determinista, sin timeout arbitrario)
    await expect(page.getByTestId('movement-created-signal')).toBeVisible()

    // Verificar que aparece en la lista
    const movimientos = await page.locator('[data-testid="movimiento-item"]').count()
    expect(movimientos).toBeGreaterThan(0)

    const movimientoText = await page.locator('[data-testid="movimiento-item"]').first().textContent()
    expect(movimientoText).toContain('500')
    expect(movimientoText).toContain('Taxi al centro')
  })

  test('5. Suscripciones: crear suscripción desde /money/suscripciones', async ({ page }) => {
    await page.goto('/money/suscripciones')
    await page.waitForTimeout(500)

    // Abrir modal
    await page.click('[data-testid="add-subscription-btn"]')
    await page.waitForTimeout(300)

    // Llenar formulario
    await page.fill('[data-testid="sub-name-input"]', 'Netflix')
    await page.fill('[data-testid="sub-amount-input"]', '1500')
    await page.selectOption('[data-testid="sub-cadence-select"]', '1')

    // Enviar
    await page.click('[data-testid="sub-submit-btn"]')
    await page.waitForTimeout(500)

    // Verificar que aparece en la lista
    const subText = await page.locator('[data-testid="subscription-item"]').first().textContent()
    expect(subText).toContain('Netflix')
    expect(subText).toMatch(/1[.,s]?500/)  // Acepta "1500", "1.500", "1,500"
  })

  test('6. Mental: registrar check-in y ver en diario', async ({ page }) => {
    await page.goto('/mental/estado')
    await page.waitForTimeout(500)

    // Seleccionar mood 4
    await page.click('[data-testid="mood-btn-4"]')
    await page.fill('[data-testid="mood-note-input"]', 'Buen día de testing')
    await page.click('[data-testid="mood-submit-btn"]')

    // Debe redirigir a diario
    await page.waitForURL('/mental/diario')
    await page.waitForTimeout(500)

    // Verificar que aparece la entrada
    const entries = await page.locator('[data-testid="entry-item"]').count()
    expect(entries).toBeGreaterThan(0)

    const entryText = await page.locator('[data-testid="entry-item"]').first().textContent()
    expect(entryText).toContain('4')
  })

  test('7. Anti-prompter: rechaza prompts técnicos', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(500)

    await page.fill('[data-testid="chat-input"]', 'explicame como programar una funcion en react')
    await page.click('[data-testid="chat-send-btn"]')
    await page.waitForTimeout(500)

    // Verificar mensaje de rechazo
    const messages = await page.locator('.max-w-\\[280px\\]').allTextContents()
    const rejectionFound = messages.some(msg =>
      msg.toLowerCase().includes('no parece algo de tu vida personal')
    )
    expect(rejectionFound).toBe(true)
  })

  test('8. Físico: registrar hábito desde /fisico/habitos', async ({ page }) => {
    await page.goto('/fisico/habitos')
    await page.waitForTimeout(500)

    // Abrir modal
    await page.click('[data-testid="add-habit-btn"]')
    await page.waitForTimeout(300)

    // Llenar formulario
    await page.fill('[data-testid="habit-text-input"]', 'Corrí 5km')
    await page.click('[data-testid="habit-submit-btn"]')
    await page.waitForTimeout(500)

    // Verificar que aparece en la lista
    const habits = await page.locator('[data-testid="habit-item"]').count()
    expect(habits).toBeGreaterThan(0)

    const habitText = await page.locator('[data-testid="habit-item"]').first().textContent()
    expect(habitText).toContain('Corrí 5km')
  })

  test('9. Chat: confirmación con confianza media (uber 500)', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(500)

    // Enviar mensaje que dispara confirmación (sin verbo, confianza media ~0.55)
    await page.fill('[data-testid="chat-input"]', 'uber 500')
    await page.click('[data-testid="chat-send-btn"]')
    await page.waitForTimeout(2000) // Esperar más tiempo para el API call

    // Debug: capturar todos los mensajes
    const messages = await page.locator('.max-w-\\[280px\\]').allTextContents()
    console.log('Messages:', messages)

    // Verificar que aparece UI de confirmación
    const confirmBtn = page.locator('[data-testid="chat-confirm-btn"]')
    await expect(confirmBtn).toBeVisible({ timeout: 10000 })

    // Click en confirmar
    await confirmBtn.click()
    await page.waitForTimeout(1000)

    // Verificar que hay respuesta de "Registrado"
    const finalMessages = await page.locator('.max-w-\\[280px\\]').allTextContents()
    const hasRegistrado = finalMessages.some(msg => msg.toLowerCase().includes('registrado'))
    expect(hasRegistrado).toBe(true)
  })
})
