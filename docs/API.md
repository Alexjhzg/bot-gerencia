# Documentación de API e Interfaces — `telegram-sheets-bot`

Este sistema expone dos superficies de interfaz:
1. **Endpoints HTTP** (health check del servicio en `src/index.ts`).
2. **Interfaz de Comandos y Triggers de Telegram** (en `src/bot.ts`).

---

## 1. Endpoints HTTP (`src/index.ts`)

Servidor nativo `node:http` escuchando en `process.env.PORT || 8080`.

| Método | Ruta | Código | Content-Type | Respuesta | Uso |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `GET` | `/` | `200` | `text/plain` | `OK` | Health check / keep-alive |
| `GET` | `/health` | `200` | `text/plain` | `OK` | Health check para Render, Koyeb o UptimeRobot |
| `*` | Cualquier otra ruta | `404` | — | *(vacío)* | Ruta no encontrada |

---

## 2. Comandos de Telegram (`src/bot.ts`)

| Comando | Alias | Parámetros | Handler | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `/start` | — | Ninguno | Inline en `src/bot.ts` | Muestra mensaje de bienvenida y plantilla de reporte diario. |
| `/reporte` | `/reportes` | `[turno]` (`1`, `12`, `m`, `2`, `5`, `6`, `pm`) y/o `[fecha]` (`DD/MM/YYYY` o `DD/M/YY`) | `consolidationHandler` (`src/handlers/consolidation.ts`) | Genera y envía el consolidado de actividades del turno activo o especificado. |
| `/unidades` | — | Ninguno | `unidadesHandler` (`src/handlers/unidades.ts`) | Lista las unidades autorizadas en `Reportes_unificados!A3:A50` junto a su límite de caracteres. |
| `/estatus` | — | Ninguno | `estatusHandler` (`src/handlers/estatus.ts`) | Muestra qué unidades han enviado reporte y cuáles están pendientes en el turno activo. |
| `/id` | `/myid` | Ninguno | Inline en `src/bot.ts` | Devuelve el `chat.id` de Telegram del usuario o grupo actual. |

---

## 3. Trigger de Mensajes de Reporte (`bot.hears`)

- **Patrón:** `/^(reporte diario|📌|\+)/im` (`src/bot.ts`)
- **Handler:** `reportHandler` (`src/handlers/report.ts`)
- **Precondición (Modo silencioso):** El mensaje debe contener `"reporte diario"` (insensible a mayúsculas) o al menos una línea iniciada por viñeta (`-`, `*`, `•`, `▪️`, `▪`, `▫`).
- **Respuestas:**
  - **Éxito:** Reacción `👍` + mensaje `MarkdownV2` con fecha y estado por unidad (`Guardado ✅` o `Corregido 🔄`).
  - **Exceso de caracteres:** Reacción `👎` + mensaje `HTML` con desglose de caracteres actuales, límite y exceso.
  - **Error de horario / unidad / API:** Reacción `👎` + mensaje `Markdown` con detalle del error.

---

## 4. Integraciones Externas Consumidas

| Servicio Externo | Cliente / SDK | Scope / Autenticación | Operaciones Usadas |
| :--- | :--- | :--- | :--- |
| **Telegram Bot API** | `grammy` (`^1.23.0`) | `TELEGRAM_BOT_TOKEN` | Long polling, `reply`, `replyWithChatAction`, `react`, `api.sendMessage` |
| **Google Sheets API v4** | `googleapis` (`^140.0.1`) | JWT Service Account (`https://www.googleapis.com/auth/spreadsheets`) | `spreadsheets.get`, `spreadsheets.batchUpdate`, `spreadsheets.values.get`, `spreadsheets.values.update`, `spreadsheets.values.append` |

