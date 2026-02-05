// lib/subscription-detector.js
// Detector de suscripciones y movimientos recurrentes

/**
 * Normalizar nombre de comercio para comparación
 * @param {string} text - Texto a normalizar
 * @returns {string} - Texto normalizado
 */
function normalizeMerchant(text) {
  if (!text) return ''

  return text
    .toLowerCase()
    .trim()
    // Eliminar caracteres especiales comunes
    .replace(/[*\-_\.\/\\]/g, ' ')
    // Eliminar números y fechas
    .replace(/\d+/g, '')
    // Eliminar espacios múltiples
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calcular similitud entre dos strings (0-1)
 * @param {string} str1 - Primera cadena
 * @param {string} str2 - Segunda cadena
 * @returns {number} - Score de similitud
 */
function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase()
  const s2 = str2.toLowerCase()

  // Similitud exacta
  if (s1 === s2) return 1.0

  // Uno contiene al otro
  if (s1.includes(s2) || s2.includes(s1)) return 0.85

  // Palabras en común
  const words1 = s1.split(' ').filter(w => w.length > 2)
  const words2 = s2.split(' ').filter(w => w.length > 2)

  if (words1.length === 0 || words2.length === 0) return 0

  let commonWords = 0
  words1.forEach(w1 => {
    if (words2.some(w2 => w2.includes(w1) || w1.includes(w2))) {
      commonWords++
    }
  })

  return commonWords / Math.max(words1.length, words2.length)
}

/**
 * Detectar movimientos recurrentes (posibles suscripciones)
 * Busca gastos con mismo monto y comercio similar en múltiples meses
 *
 * @param {Array} movimientos - Array de movimientos
 * @param {number} minOccurrences - Número mínimo de ocurrencias (default: 3)
 * @returns {Array} - Array de suscripciones detectadas
 */
export function detectRecurringMovements(movimientos, minOccurrences = 3) {
  if (!movimientos || movimientos.length === 0) return []

  // Solo considerar gastos
  const gastos = movimientos.filter(mov => mov.tipo === 'gasto')

  if (gastos.length === 0) return []

  // Agrupar por monto similar (permitir variación de ±5%)
  const amountGroups = {}

  gastos.forEach(mov => {
    const amount = Math.round(mov.monto)
    const amountKey = Math.round(amount / 10) * 10 // Agrupar en rangos de 10

    if (!amountGroups[amountKey]) {
      amountGroups[amountKey] = []
    }
    amountGroups[amountKey].push(mov)
  })

  const potentialSubscriptions = []

  // Para cada grupo de montos similares
  Object.values(amountGroups).forEach(group => {
    if (group.length < minOccurrences) return

    // Agrupar por comercio similar
    const merchantClusters = []

    group.forEach(mov => {
      const normalizedMerchant = normalizeMerchant(mov.motivo || mov.merchant_norm || '')
      if (!normalizedMerchant) return

      // Buscar cluster existente similar
      let foundCluster = false

      for (const cluster of merchantClusters) {
        const clusterName = cluster.normalizedName
        const similarity = calculateSimilarity(normalizedMerchant, clusterName)

        if (similarity >= 0.7) {
          cluster.movements.push(mov)
          foundCluster = true
          break
        }
      }

      // Si no encontró cluster similar, crear uno nuevo
      if (!foundCluster) {
        merchantClusters.push({
          normalizedName: normalizedMerchant,
          movements: [mov]
        })
      }
    })

    // Filtrar clusters con suficientes ocurrencias
    merchantClusters.forEach(cluster => {
      if (cluster.movements.length < minOccurrences) return

      // Verificar que estén distribuidos en diferentes meses
      const monthsSet = new Set()
      cluster.movements.forEach(mov => {
        const date = new Date(mov.fecha)
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`
        monthsSet.add(monthKey)
      })

      // Si están en al menos 2 meses diferentes, es probablemente recurrente
      if (monthsSet.size >= 2) {
        // Calcular monto promedio
        const avgAmount = cluster.movements.reduce((sum, mov) => sum + mov.monto, 0) / cluster.movements.length

        // Usar el nombre más reciente como referencia
        const sortedMovs = [...cluster.movements].sort((a, b) =>
          new Date(b.fecha) - new Date(a.fecha)
        )
        const merchantName = sortedMovs[0].motivo || sortedMovs[0].merchant_norm || 'Desconocido'

        // Calcular última fecha
        const lastDate = sortedMovs[0].fecha

        // Calcular frecuencia (días promedio entre transacciones)
        const sortedDates = sortedMovs.map(m => new Date(m.fecha).getTime()).sort((a, b) => a - b)
        let totalGaps = 0
        for (let i = 1; i < sortedDates.length; i++) {
          totalGaps += sortedDates[i] - sortedDates[i - 1]
        }
        const avgGapDays = sortedDates.length > 1
          ? Math.round((totalGaps / (sortedDates.length - 1)) / (1000 * 60 * 60 * 24))
          : 30

        // Estimar cadencia en meses
        let cadenceMonths = 1
        if (avgGapDays > 80) cadenceMonths = 3 // Trimestral
        else if (avgGapDays > 45) cadenceMonths = 2 // Bimensual
        else if (avgGapDays > 330) cadenceMonths = 12 // Anual

        potentialSubscriptions.push({
          merchant: merchantName,
          amount: Math.round(avgAmount),
          occurrences: cluster.movements.length,
          lastDate: lastDate,
          movementIds: cluster.movements.map(m => m.id),
          cadenceMonths,
          avgGapDays,
          monthsSpan: monthsSet.size
        })
      }
    })
  })

  // Ordenar por número de ocurrencias (más probable primero)
  potentialSubscriptions.sort((a, b) => b.occurrences - a.occurrences)

  return potentialSubscriptions
}

/**
 * Verificar si una suscripción detectada ya existe en las suscripciones guardadas
 * @param {Object} detectedSub - Suscripción detectada
 * @param {Array} existingSubscriptions - Array de suscripciones existentes
 * @returns {boolean} - true si ya existe
 */
export function isSubscriptionAlreadyExists(detectedSub, existingSubscriptions) {
  if (!existingSubscriptions || existingSubscriptions.length === 0) return false

  return existingSubscriptions.some(sub => {
    // Comparar por nombre similar y monto similar (±10%)
    const nameSimilarity = calculateSimilarity(
      normalizeMerchant(detectedSub.merchant),
      normalizeMerchant(sub.name)
    )
    const amountDiff = Math.abs(detectedSub.amount - sub.amount) / detectedSub.amount

    return nameSimilarity >= 0.7 && amountDiff <= 0.1
  })
}

/**
 * Formatear cadencia en texto legible
 * @param {number} months - Número de meses
 * @returns {string} - Texto de cadencia
 */
export function formatCadence(months) {
  switch (months) {
    case 1: return 'Mensual'
    case 2: return 'Bimensual'
    case 3: return 'Trimestral'
    case 6: return 'Semestral'
    case 12: return 'Anual'
    default: return `Cada ${months} meses`
  }
}
