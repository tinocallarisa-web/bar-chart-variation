# Plan de Versiones — Bar Chart with Variation % (TCViz)

> Basado en el review externo publicado el 8 de julio de 2026.  
> Versión actual: **1.0.0.0**

---

## v1.1 — Tooltips + Selección de puntos
**Prioridad:** Alta | **Impacto en score:** Features (2.2 → ~5+)

El gap más crítico señalado en el review. Sin tooltips, el visual pierde profundidad analítica en el momento más natural de exploración. Actualmente `visual.ts` no implementa ningún `ITooltipService`.

### Tareas técnicas
- Registrar `host.tooltipService` en el constructor
- Crear `TooltipDataItem[]` por barra: valor actual, valor anterior, delta absoluto, delta %
- Adjuntar `.on("mouseover")` / `.on("mousemove")` / `.on("mouseout")` en los rects SVG
- Habilitar selección directa de puntos individuales (actualmente solo hay contexto de right-click)
- Añadir `"supportsHighlight": true` si no está ya en `capabilities.json`

### Resultado esperado
El usuario puede hover sobre cualquier barra y ver: valor actual, período anterior, variación absoluta y variación %.

---

## v1.2 — Conditional Formatting en barras
**Prioridad:** Alta | **Impacto en adopción enterprise**

Sin esto, las organizaciones con governance estricto no pueden aplicar reglas de umbral (ej: rojo si margen < 10%). El review lo señala como "notable weakness in enterprise reporting".

### Tareas técnicas
- Añadir `"fillRule"` binding en `capabilities.json` dentro del dataRole de `measure`
- Exponer la propiedad `conditionalFormatting` en el objeto `barSettings` de capabilities
- Leer reglas de color desde `dataView.categorical.values[].objects` en `visual.ts`
- Aplicar color calculado en render de rects, con fallback al color por defecto

### Resultado esperado
Report authors pueden definir reglas de color basadas en valor (ej: barra naranja si variación < 0%, roja si < -10%).

---

## v1.3 — Leyenda + Accesibilidad
**Prioridad:** Media

El review menciona dos puntos relacionados: falta de leyenda que explique semántica de colores, y dependencia de rojo/verde para comunicar dirección.

### Tareas técnicas
- Añadir objeto `legend` en `capabilities.json`
- Renderizar leyenda compacta (positivo / negativo) configurable en posición y visibilidad
- Añadir soporte de `aria-label` en cada barra con: panel, período, valor, variación
- Añadir opción de patrón/textura como alternativa al color para accesibilidad daltonismo

### Resultado esperado
El visual es usable sin dependencia de color, y tiene una leyenda que auto-describe los encodings.

---

## v1.4 — Drilldown
**Prioridad:** Media-Baja | **Complejidad:** Alta

El review reconoce que el visual tiene un scope definido, pero señala que la falta de drilldown lo limita a usuarios ejecutivos. Año → Trimestre → Mes es el caso de uso natural.

### Tareas técnicas
- Añadir `"allowInteactions": true` y `"drilling": true` en `capabilities.json`
- Implementar lógica de jerarquía en `dataView` — leer `DataViewHierarchyLevel`
- Renderizar controles de drill (up/down) en el panel header
- Resetear selección al cambiar nivel de drill

### Resultado esperado
El usuario puede hacer drill de Year → Quarter → Month dentro del mismo visual.

---

## v2.0 — Documentación y soporte completo
**Prioridad:** Media | **Impacto en confianza organizacional**

El review dedica una sección entera a documentación y la evalúa como "functional rather than comprehensive". Esto afecta adopción en empresas con governance.

### Tareas
- Crear sitio de documentación completo (GitHub Pages ya existe en `/github-pages`)
  - Getting Started con datos de ejemplo
  - Referencia de todos los parámetros de formato
  - Casos de uso con screenshots (finanzas, ventas, operaciones)
  - FAQ: panels vacíos, valores negativos, sparse data, límites free tier
- Publicar CHANGELOG visible públicamente con historial de versiones
- Añadir sección "Known limitations" explícita
- Considerar video walkthrough (< 3 min)

### Resultado esperado
Un usuario enterprise puede evaluar el visual sin contactar soporte.

---

## Resumen de prioridades

| Versión | Feature | Impacto | Esfuerzo |
|---------|---------|---------|----------|
| v1.1 | Tooltips + selección de puntos | Crítico | Medio |
| v1.2 | Conditional formatting | Crítico (enterprise) | Medio |
| v1.3 | Leyenda + accesibilidad | Medio | Bajo |
| v1.4 | Drilldown | Medio | Alto |
| v2.0 | Documentación completa | Medio | Bajo-Medio |

---

*Generado: agosto 2026 — a partir del review de AI Assistant (julio 2026)*

---

## v1.5 — Analytical Lines
**Prioridad:** Media | **Diferenciador vs competencia**

El Lipstick Column Chart de la competencia lo tiene como feature destacada. Añadir líneas analíticas (promedio, máximo, mínimo, mediana, percentil, referencia constante) amplía el uso del visual más allá del reporting ejecutivo hacia análisis comparativo.

### Tareas técnicas
- Añadir objeto `analyticalLines` en `capabilities.json` con:
  - `showAverage` (bool), `showMax` (bool), `showMin` (bool), `showMedian` (bool)
  - `referenceValue` (numeric) — línea de referencia constante
  - `lineColor` (fill), `lineStyle` (enum: solid/dashed), `fontSize` (numeric)
  - `showLabel` (bool)
- En `visual.ts`, calcular avg/max/min/median sobre todos los valores del panel
- Renderizar líneas horizontales en el chart area con etiqueta opcional
- La línea de referencia constante aplica igual a todos los paneles

### Resultado esperado
El usuario puede superponer una línea de promedio, máximo o referencia custom sobre las barras, con etiqueta y estilo configurable. La línea se comparte o se calcula por panel (configurable).

---

## Resumen actualizado

| Versión | Feature | Impacto | Esfuerzo |
|---------|---------|---------|----------|
| v1.1 | Tooltips + selección de puntos | Crítico | Medio |
| v1.2 | Conditional formatting | Crítico (enterprise) | Medio |
| v1.3 | Leyenda + accesibilidad | Medio | Bajo ✅ implementado |
| v1.4 | Drilldown | Medio | Alto |
| v1.5 | Analytical lines (avg, max, min, median, ref) | Medio | Bajo-Medio |
| v2.0 | Documentación completa | Medio | Bajo-Medio |

---

*Actualizado: agosto 2026 — v1.5 añadido a partir de análisis competitivo (Lipstick Column Chart)*

---

## Actualización v1.5 — Analytical Lines + Bands
**Ampliado a partir del análisis competitivo (Clustered Stacked Column Chart Pro)**

v1.5 pasa de "líneas analíticas" a "líneas y bandas analíticas". Las bandas añaden rangos de tolerancia, límites de control y zonas objetivo — mucho más útiles para monitoring operativo.

### Cambios adicionales vs plan original
- Añadir `referenceband` en `capabilities.json`:
  - `showBand` (bool), `bandMin` (numeric), `bandMax` (numeric)
  - `bandColor` (fill), `bandOpacity` (numeric)
- Renderizar `<rect>` entre `bandMin` y `bandMax` con color + opacidad configurable
- La banda aplica globalmente a todos los paneles (misma escala compartida)

### Casos de uso habilitados
- Rango de tolerancia de calidad (límite inferior / superior)
- Zona objetivo de ventas (mínimo aceptable / máximo esperado)
- Rango de control operativo (±σ alrededor de la media)

---

## v1.6 — Scrollbar + Minimum panel width
**Prioridad:** Media | **Impacto en usabilidad Pro**

Cuando el usuario Pro tiene muchos small multiples, los paneles se comprimen hasta ser ilegibles. Un ancho mínimo de panel + scroll automático resuelve el problema sin forzar al usuario a filtrar datos.

### Tareas técnicas
- Añadir objeto `panelLayout` en `capabilities.json`:
  - `minPanelWidth` (numeric, default: 120px)
  - `enableScroll` (bool, default: true)
- En `render()`, calcular si `cellW < minPanelWidth`:
  - Si sí: ajustar `ncols` para que los paneles respeten el mínimo, y añadir un wrapper `<div>` con `overflow-x: auto` alrededor del SVG
  - Alternativamente: recalcular el ancho total del SVG y dejar que el contenedor haga scroll
- Opción de scroll vertical también (para layouts de muchas filas)

### Casos de uso
- Dashboard Pro con 12+ países: scroll horizontal entre grupos de paneles
- Informe de producto con 20+ SKUs: paneles legibles sin comprimir etiquetas
- Reporte mensual con 24 meses de historia: navegar sin perder la escala compartida

### Rounded corners configurable (añadido en este release)
- Exponer `barBorderRadius` (numeric, 0–10) en `barSettings`
- Reemplazar el `rx: 2` hardcoded actual con el valor del setting
- Default: 2 (comportamiento actual sin cambio visible)

---

## Resumen final del roadmap

| Versión | Feature | Impacto | Esfuerzo | Estado |
|---------|---------|---------|----------|--------|
| v1.1 | Tooltips + selección directa | Crítico | Medio | ✅ implementado |
| v1.2 | Conditional formatting | Crítico (enterprise) | Medio | pendiente |
| v1.3 | Leyenda + accesibilidad | Medio | Bajo | ✅ implementado |
| v1.4 | Drilldown | Medio | Alto | pendiente |
| v1.5 | Analytical lines + bands | Medio | Bajo-Medio | pendiente |
| v1.6 | Scroll + min panel width + rounded corners | Medio | Bajo | pendiente |
| v2.0 | Documentación completa | Medio | Bajo-Medio | pendiente |

---

*Actualizado: agosto 2026 — v1.5 ampliado con bands, v1.6 añadido a partir de análisis competitivo (bta-column-chart + Clustered Stacked Column Chart Pro)*
