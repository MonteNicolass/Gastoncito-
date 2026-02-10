# Gastoncito - Ecosistema Físico: Análisis Completo y Plan MVP

---

## 1. ESTADO ACTUAL - Radiografía completa

### Páginas existentes

| Página | Estado | Funcionalidad |
|--------|--------|---------------|
| `/fisico` (hub) | Funcional | Stats semanales, racha, tendencia, navegación a subs |
| `/fisico/habitos` | Funcional | CRUD completo con modal, context menu, suggestions |
| `/fisico/resumen` | Funcional | Resumen mensual: días activos, racha, consistencia, top hábitos |
| `/fisico/comida` | Funcional básico | CRUD en localStorage, tipos de comida, modal |
| `/fisico/entrenos` | Placeholder | Solo muestra "Próximamente" |
| `/fisico/salud` | Placeholder | Solo muestra "Próximamente" |

### Datos usados
- **IndexedDB**: `life_entries` con `domain: 'physical'` (hábitos/actividad)
- **localStorage**: `gaston_meals` (comidas)
- No hay modelo de datos para entrenos ni salud

---

## 2. PROBLEMAS Y OPTIMIZACIONES DETECTADAS

### 2.1 Arquitectura y Performance

| # | Problema | Impacto | Archivo |
|---|---------|---------|---------|
| 1 | `page.js` llama `getLifeEntries()` (TODAS las entries) y filtra en cliente. Con muchos datos es ineficiente | Medio | `fisico/page.js:34` |
| 2 | `resumen/page.js` también llama `getLifeEntries()` completo en vez de `getLifeEntriesByDomain('physical')` | Medio | `fisico/resumen/page.js:16` |
| 3 | Cálculo de racha en `page.js` itera 30 días y hace `.some()` por cada día sobre TODOS los entries. O(30*n) innecesario | Bajo | `fisico/page.js:58-75` |
| 4 | `comida/page.js` llama `initDB()` sin usar IndexedDB (usa localStorage). initDB es innecesario ahí | Bajo | `fisico/comida/page.js:38` |
| 5 | No hay `useMemo` ni `useCallback` en `page.js` ni `habitos/page.js`. Cada re-render recalcula todo | Bajo | Varios |

### 2.2 UX / UI

| # | Problema | Impacto |
|---|---------|---------|
| 6 | Hub (`page.js`) muestra 5 links de navegación pero 2 son placeholders muertos (Entrenos, Salud). Confunde al usuario | Alto |
| 7 | Los progress dots en el hub NO mapean a días reales de la semana (Lun-Dom), solo llenan de izquierda a derecha | Medio |
| 8 | No hay feedback visual al registrar una actividad. El botón "¿Hiciste ejercicio?" redirige a `/chat` sin contexto visible de que se guardó algo | Alto |
| 9 | Comida no tiene context menu (editar/eliminar), inconsistente con hábitos | Medio |
| 10 | Comida no tiene botón de eliminar individual | Medio |
| 11 | No hay vista de "hoy" en el hub - no se ve qué se hizo hoy específicamente | Medio |
| 12 | El hub repite el botón "Registrar actividad" que solo redirige a Chat. No hay registro inline | Bajo |

### 2.3 Datos y Modelo

| # | Problema | Impacto |
|---|---------|---------|
| 13 | Las entries físicas solo guardan `text` y `domain`. No hay estructura: tipo de ejercicio, duración, intensidad, etc. | Alto |
| 14 | Comida y Hábitos usan stores distintos (localStorage vs IndexedDB) sin justificación clara | Medio |
| 15 | No hay relación entre comida y actividad física (ej: calorías in/out, timing) | Bajo (futuro) |
| 16 | `meta` de life_entries siempre se guarda vacío `{}`. No se aprovecha para datos estructurados | Alto |

### 2.4 Código duplicado

| # | Problema | Archivos |
|---|---------|----------|
| 17 | `formatDate()` se define 2 veces (habitos y comida) en vez de usar el helper compartido | `habitos/page.js:40`, `comida/page.js:63` |
| 18 | Loading states tienen 3 patterns distintos: pulse circle, pulse card, texto "Cargando..." | `page.js:98`, `resumen/page.js:106`, `comida/page.js:95` |
| 19 | SVG icons inline (edit, delete, close) se repiten en vez de usar lucide-react que ya está instalado | `habitos/page.js:181-194` |

### 2.5 Bugs potenciales

| # | Problema | Archivo |
|---|---------|---------|
| 20 | Racha cuenta "hoy" solo si hay actividad, pero si no hay actividad hoy y sí ayer, la racha se rompe en `i > 0` (correcto pero contra-intuitivo para el usuario) | `page.js:72` |
| 21 | `comida/page.js` usa `Date.now().toString()` como ID. Dos comidas en el mismo milisegundo colisionan | `comida/page.js:51` |
| 22 | En `resumen/page.js` el cálculo de consistencia usa `daysInMonth` completo incluso si estamos a mitad de mes, haciendo que siempre parezca bajo | `resumen/page.js:56` |

---

## 3. PLAN MVP - Sistema de pasos priorizado

### Filosofía MVP
> Entregar valor real al usuario con el menor esfuerzo. Cortar features que no sean core. Pulir lo que existe antes de agregar.

---

### FASE 1: Limpieza y Fix (1-2 horas)
*Objetivo: que lo que existe funcione bien*

**Paso 1.1** - Eliminar links muertos
- Sacar "Entrenos" y "Salud" del hub navigation
- Eliminar los archivos placeholder (`entrenos/page.js`, `salud/page.js`)
- Resultado: Hub limpio, sin promesas rotas

**Paso 1.2** - Fix del cálculo de consistencia
- En `resumen/page.js`, usar `Math.min(dayOfMonth, daysInMonth)` como denominador
- Si estamos el día 10, consistencia = activeDays / 10, no / 28

**Paso 1.3** - Optimizar queries
- `page.js`: cambiar `getLifeEntries()` por `getLifeEntriesByDomain('physical')`
- `resumen/page.js`: idem
- `comida/page.js`: quitar `initDB()` innecesario

**Paso 1.4** - Unificar formatDate
- Usar el helper compartido o crear uno en `lib/format-utils.js`
- Reemplazar en `habitos/page.js` y `comida/page.js`

**Paso 1.5** - Unificar loading states
- Definir 1 pattern: pulse con skeleton card (como resumen)
- Aplicar a hub, habitos y comida

---

### FASE 2: Mejorar el core (2-3 horas)
*Objetivo: la actividad física tenga datos útiles*

**Paso 2.1** - Enriquecer el modelo de actividad
- Usar `meta` de life_entries para campos opcionales:
```javascript
meta: {
  activity_type: 'cardio' | 'fuerza' | 'flexibilidad' | 'otro',
  duration_min: 30,        // opcional
  intensity: 'baja' | 'media' | 'alta'  // opcional
}
```
- Actualizar modal de habitos para incluir estos campos como opcionales
- Dropdown de tipo + input de duración + selector de intensidad

**Paso 2.2** - Mejorar el hub con "Hoy"
- Agregar sección "Hoy" en el hub mostrando actividades registradas hoy
- Si no hay actividades hoy, mostrar el CTA actual
- Si hay, mostrar lista compacta + botón "Agregar otra"

**Paso 2.3** - Progress dots reales
- Mapear los 7 dots a Lun-Mar-Mie-Jue-Vie-Sab-Dom
- Marcar en amber los días con actividad real
- Agregar labels debajo (L M M J V S D)

**Paso 2.4** - Context menu en Comida
- Agregar editar/eliminar consistente con habitos
- Reutilizar el pattern establecido

---

### FASE 3: Resumen útil (1-2 horas)
*Objetivo: que el resumen mensual aporte valor real*

**Paso 3.1** - Resumen con comparación vs mes anterior
- Calcular delta de días activos vs mes anterior
- Calcular delta de consistencia
- Mostrar badges "Más activo" / "Menos activo"

**Paso 3.2** - Calendario visual del mes
- Grid 7 columnas (Lun-Dom)
- Cada día: dot verde si hubo actividad, gris si no
- Visual simple y poderoso para ver patrones

**Paso 3.3** - Top actividades del texto
- Parsear `text` de entries para detectar tipos frecuentes
- Mostrar ranking: "Gym 8x, Correr 5x, Yoga 3x"

---

### FASE 4: Integración con Chat (1 hora)
*Objetivo: que el flujo de registro sea seamless*

**Paso 4.1** - Prefill mejorado desde hub
- Botón "¿Hiciste ejercicio?" → Chat con prefill "💪 "
- localStorage: `chat_prefill = "💪 "`
- Chat lo detecta y abre en modo actividad

**Paso 4.2** - Registro rápido inline (opcional)
- Modal directo en el hub para registro rápido
- Sin navegar a Chat
- Mismas quick suggestions que en habitos

---

### FASE 5: Polish final (1 hora)
*Objetivo: consistencia visual y sensación pulida*

**Paso 5.1** - Iconos consistentes
- Reemplazar SVGs inline por lucide-react (Pencil, Trash2, X)
- Aplicar en todo el ecosistema físico

**Paso 5.2** - Animaciones
- Confirmar `animate-slide-up` funciona en todos los modales
- Agregar transición suave en expand/collapse de secciones

**Paso 5.3** - Empty states consistentes
- Revisar que todos sigan el pattern: emoji/icon + título + helper text
- Mismo spacing y colores

---

## 4. RESUMEN EJECUTIVO

### Lo que hay que CORTAR para el MVP
- Entrenos (placeholder sin funcionalidad)
- Salud (placeholder sin funcionalidad)
- Cualquier feature de calorías o nutrición
- Comparación comida vs ejercicio

### Lo que hay que ARREGLAR ya
- Consistencia que muestra % falsamente bajo
- Queries ineficientes (getLifeEntries → getLifeEntriesByDomain)
- Links muertos en navegación

### Lo que hay que AGREGAR para MVP
- Campos opcionales en actividad (tipo, duración, intensidad)
- Vista "Hoy" en el hub
- Dots reales por día de la semana
- Context menu en Comida
- Comparación mes vs mes anterior en resumen

### Estimación total MVP
| Fase | Tiempo estimado | Prioridad |
|------|----------------|-----------|
| Fase 1: Limpieza | 1-2h | CRÍTICA |
| Fase 2: Core | 2-3h | ALTA |
| Fase 3: Resumen | 1-2h | MEDIA |
| Fase 4: Chat | 1h | MEDIA |
| Fase 5: Polish | 1h | BAJA |
| **Total** | **6-9h** | - |

---

## 5. DECISIONES ARQUITECTÓNICAS RECOMENDADAS

1. **Mantener comida en localStorage** - No vale la pena migrar a IndexedDB para MVP
2. **Usar `meta` para datos estructurados** - Backward compatible, no rompe nada
3. **No crear nuevos stores** - Reusar `life_entries` con domain filters
4. **No implementar Entrenos como sección separada** - Integrar como tipo de actividad en hábitos
5. **Resumen mensual > dashboard complejo** - Un card con métricas clave es suficiente

---

*Documento generado el 10/02/2026*
*Gastoncito - Ecosistema Físico v1*
