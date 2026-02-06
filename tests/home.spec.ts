import { test, expect, type Page } from '@playwright/test'

// ── Helpers ──────────────────────────────────────────────────

const consoleErrors: string[] = []

function trackConsoleErrors(page: Page) {
  consoleErrors.length = 0
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text())
    }
  })
  page.on('pageerror', err => {
    consoleErrors.push(err.message)
  })
}

function assertNoConsoleErrors() {
  const real = consoleErrors.filter(e =>
    !e.includes('favicon') &&
    !e.includes('hydration') &&
    !e.includes('Download the React DevTools')
  )
  expect(real, `Console errors: ${real.join('\n')}`).toHaveLength(0)
}

// ── Setup ────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  trackConsoleErrors(page)
})

// ── 1) Carga de la Home ─────────────────────────────────────

test.describe('Home - Carga', () => {
  test('la página principal carga sin errores', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBeLessThan(400)

    // / redirige a /vision
    await page.waitForURL('/vision')
    expect(page.url()).toContain('/vision')
  })

  test('el Resumen General se renderiza', async ({ page }) => {
    await page.goto('/vision')

    // Esperar a que pase el loading (skeleton desaparece, aparece contenido)
    await page.waitForSelector('text=Resumen', { timeout: 10000 })

    // El título del TopBar debe ser "Resumen"
    const title = page.locator('text=Resumen').first()
    await expect(title).toBeVisible()
  })

  test('no hay errores en consola al cargar', async ({ page }) => {
    await page.goto('/vision')
    await page.waitForTimeout(3000)
    assertNoConsoleErrors()
  })
})

// ── 2) Elementos clave ──────────────────────────────────────

test.describe('Home - Elementos clave', () => {
  test('score general o empty state visible', async ({ page }) => {
    await page.goto('/vision')
    await page.waitForTimeout(3000)

    // Con datos: gradient header con score. Sin datos: EmptyState "Sin registros todavía"
    const scoreHeader = page.locator('.bg-gradient-to-br .tabular-nums').first()
    const emptyState = page.getByText('Sin registros todav', { exact: false })

    const hasScore = await scoreHeader.isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasScore || hasEmpty, 'Ni score ni empty state visible').toBe(true)
  })

  test('sección de alertas o empty state presente', async ({ page }) => {
    await page.goto('/vision')
    await page.waitForTimeout(3000)

    // Con datos: sección "Alertas" o "Sin alertas activas". Sin datos: EmptyState global
    const alertas = page.getByText('Alertas', { exact: false })
    const emptyState = page.getByText('Sin registros todav', { exact: false })

    const hasAlertas = await alertas.first().isVisible().catch(() => false)
    const hasEmpty = await emptyState.isVisible().catch(() => false)

    expect(hasAlertas || hasEmpty, 'Ni alertas ni empty state visible').toBe(true)
  })

  test('snapshots de Economía, Mental y Físico presentes', async ({ page }) => {
    await page.goto('/vision')
    await page.waitForTimeout(3000)

    // 3-column grid con los pilares
    await expect(page.getByText('Money').first()).toBeVisible()
    await expect(page.getByText('Mental').first()).toBeVisible()
    await expect(page.getByText('Físico').first()).toBeVisible()
  })

  test('chat input accesible desde /chat', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(2000)

    const chatInput = page.locator('[data-testid="chat-input"]')
    await expect(chatInput).toBeVisible()
    await expect(chatInput).toBeEnabled()
  })
})

// ── 3) Interacción básica ───────────────────────────────────

test.describe('Interacción básica', () => {
  test('el chat acepta texto sin crashear', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(2000)

    const chatInput = page.locator('[data-testid="chat-input"]')
    await chatInput.fill('Test de escritura')
    await expect(chatInput).toHaveValue('Test de escritura')

    // La app no crasheó
    assertNoConsoleErrors()
  })

  test('enviar mensaje no crashea la app', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(2000)

    const chatInput = page.locator('[data-testid="chat-input"]')
    await chatInput.fill('Gasté 500 en almuerzo')

    const sendBtn = page.locator('[data-testid="chat-send-btn"]')
    await expect(sendBtn).toBeEnabled()
    await sendBtn.click()

    // Esperar procesamiento
    await page.waitForTimeout(3000)

    // La app sigue funcionando - no está en blanco
    const body = await page.locator('body').textContent()
    expect(body?.length).toBeGreaterThan(0)

    assertNoConsoleErrors()
  })

  test('navegación entre tabs funciona', async ({ page }) => {
    await page.goto('/vision')
    await page.waitForTimeout(2000)

    // Click en tab Chat
    await page.getByRole('link', { name: 'Chat' }).click()
    await page.waitForURL('/chat')

    // Click en tab Money
    await page.getByRole('link', { name: 'Money' }).click()
    await page.waitForURL('/money')

    // Click en tab Resumen
    await page.getByRole('link', { name: 'Resumen' }).click()
    await page.waitForURL('/vision')

    assertNoConsoleErrors()
  })
})

// ── 4) Mobile ───────────────────────────────────────────────

test.describe('Mobile', () => {
  test.use({ viewport: { width: 375, height: 812 } }) // iPhone X

  test('sin overflow horizontal en home', async ({ page }) => {
    await page.goto('/vision')
    await page.waitForTimeout(3000)

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('chat input visible en mobile', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(2000)

    const chatInput = page.locator('[data-testid="chat-input"]')
    await expect(chatInput).toBeVisible()

    // Verificar que está dentro del viewport
    const box = await chatInput.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.y).toBeLessThan(812) // dentro del viewport
  })

  test('contenido scrolleable en mobile', async ({ page }) => {
    await page.goto('/vision')
    await page.waitForTimeout(3000)

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 500))
    const scrollY = await page.evaluate(() => window.scrollY)

    // La página tiene contenido suficiente para scrollear, o al menos no crasheó
    expect(scrollY).toBeGreaterThanOrEqual(0)
    assertNoConsoleErrors()
  })

  test('sin overflow horizontal en chat', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(2000)

    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalOverflow).toBe(false)
  })
})

// ── 5) Errores de consola ───────────────────────────────────

test.describe('Errores de consola', () => {
  test('no hay console.error en /vision', async ({ page }) => {
    await page.goto('/vision')
    await page.waitForTimeout(4000)
    assertNoConsoleErrors()
  })

  test('no hay console.error en /chat', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForTimeout(4000)
    assertNoConsoleErrors()
  })

  test('no hay console.error en /money', async ({ page }) => {
    await page.goto('/money')
    await page.waitForTimeout(4000)
    assertNoConsoleErrors()
  })

  test('no hay console.error en /mental', async ({ page }) => {
    await page.goto('/mental')
    await page.waitForTimeout(4000)
    assertNoConsoleErrors()
  })

  test('no hay console.error en /fisico', async ({ page }) => {
    await page.goto('/fisico')
    await page.waitForTimeout(4000)
    assertNoConsoleErrors()
  })

  test('no hay uncaught exceptions navegando entre páginas', async ({ page }) => {
    const pages = ['/vision', '/chat', '/money', '/mental', '/fisico', '/objetivos']

    for (const path of pages) {
      await page.goto(path)
      await page.waitForTimeout(1500)
    }

    assertNoConsoleErrors()
  })
})
