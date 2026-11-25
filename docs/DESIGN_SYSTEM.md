# Design System — Interfaz Conversacional de Telegram

> Este proyecto **no posee un frontend web** (HTML/CSS/React/Vue). Su superficie de usuario es una **interfaz conversacional en Telegram** construida con `grammY`. Este documento estandariza los tokens conversacionales, semántica visual, formatos de marcado y reglas UX implementadas en el bot.

---

## 1. Principios de Diseño Conversacional (UX)

1. **Cero Ruido en Grupos (Modo Silencioso):** El bot ignora cualquier mensaje que no cumpla la estructura de reporte (`reporte diario` o viñetas válidas) para no interrumpir conversaciones grupales.
2. **Feedback Inmediato y Multimodal:**
   - Indicador de actividad `typing` (`ctx.replyWithChatAction('typing')`) antes de operaciones de red con Google Sheets.
   - Reacciones nativas sobre el mensaje original: `👍` (éxito) y `👎` (error de validación, límite o API).
3. **Validación Atómica con Recuperación Guiada:** Ante un error (unidad inválida, fuera de horario o exceso de caracteres), el bot rechaza el lote completo y muestra exactamente qué corregir (lista de unidades válidas, horarios permitidos o exceso exacto de caracteres).
4. **Resiliencia de Renderizado:** Todos los mensajes HTML escapan caracteres reservados (`escapeHtml` en `src/utils/report.ts`) y cuentan con fallback a texto plano ante errores `can't parse entities`.

---

## 2. Tokens Semánticos (Emojis y Estados)

| Token / Emoji | Significado Semántico | Uso en el Código |
| :--- | :--- | :--- |
| `👍` / `👎` | Reacción de confirmación / rechazo | `src/handlers/report.ts` (`ctx.react`) |
| `✅` | Éxito / Guardado nuevo / Enviado | `src/handlers/report.ts`, `src/handlers/estatus.ts` |
| `🔄` | Sobrescritura / Corrección de celda | `src/handlers/report.ts` (`Corregido 🔄`) |
| `❌` | Error de validación o sistema | Todos los handlers en `src/handlers/` |
| `⚠️` | Alerta / Límite de caracteres excedido | `src/handlers/report.ts` |
| `⏳` | Unidad pendiente por reportar | `src/handlers/estatus.ts` |
| `📌` | Cabecera de departamento / unidad | `src/utils/report.ts`, `src/services/sheets/matrix-reader.ts` |
| `▪️` | Viñeta normalizada de actividad | `src/handlers/report.ts`, `src/services/sheets/matrix-reader.ts` |
| `📊` / `📋` | Encabezado de estatus / catálogo | `src/handlers/estatus.ts`, `src/handlers/unidades.ts` |
| `💡` | Consejo o nota explicativa | `src/bot.ts`, `src/handlers/report.ts`, `src/handlers/unidades.ts` |
| `🆔` / `⏰` | Identificador / Hora del servidor | `src/bot.ts`, `src/handlers/report.ts` |

---

## 3. Reglas de Marcado (Parse Modes)

El bot utiliza tres modos de parseo de Telegram según el handler (se recomienda converger progresivamente a `HTML` por mayor estabilidad con caracteres especiales):

- **`HTML` (Estándar recomendado):** Usado en `/reporte`, `/unidades`, `/estatus`, alertas de límite de caracteres y scheduler (`<b>`, `<i>`). Requiere siempre `escapeHtml()`.
- **`MarkdownV2`:** Usado en la confirmación de guardado de `src/handlers/report.ts` (requiere escape de caracteres reservados `[_*[\]()~`>#+-=|{}.!]`).
- **`Markdown`:** Usado en `/start`, `/id` y errores genéricos de `src/handlers/report.ts`.

---

## 4. Plantilla Estándar del Consolidado Institucional

Generada por `getConsolidatedReport()` en `src/services/sheets/matrix-reader.ts`:

```html
<b>MONAGAS</b>

<b>Jueves 09/07/2026</b>

<b>1ER REPORTE 12:00M</b>

📌 <b>GERENCIA</b>
▪️ Actividad 1
▪️ Actividad 2

<b>SITUACIÓN CLIMÁTICA:</b> Sin reporte

<b>NOVEDADES:</b> Texto de novedades (solo si existe)
```

---

## 5. Presupuesto de Caracteres (Layout de 1 Mensaje)

Telegram impone un límite estricto de **4.096 caracteres por mensaje**. Para garantizar que el consolidado viaje íntegro en un solo bloque (`splitMessage` divide en `3900` como salvaguarda), `src/utils/limits.ts` aplica cuotas por unidad:

| Unidad | Límite Máximo (`maxChars`) |
| :--- | :---: |
| `COORDINACIÓN DE PROGRAMAS` | 2.100 |
| `COORDINACIÓN SEEM` | 850 |
| `ENLACE DE RRHH Y ADMINISTRACIÓN` | 550 |
| `GERENCIA` | 300 |
| *Otras unidades (default)* | 800 |

