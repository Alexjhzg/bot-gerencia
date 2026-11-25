# Política de Seguridad y Endurecimiento — `telegram-sheets-bot`

## 1. Controles de Seguridad Actuales

| Área | Control Implementado | Evidencia en Código |
| :--- | :--- | :--- |
| **Aislamiento de Contenedor** | Imagen multi-etapa `node:20-alpine` ejecutada con usuario sin privilegios (`USER node`) | `Dockerfile` |
| **Gestión de Secretos** | Variables críticas cargadas vía `.env` / entorno y excluidas de Git (`.env`, `acividades-d87dfb92891b.json`) | `.gitignore`, `src/config.ts` |
| **Validación Fail-Fast** | El servicio aborta el arranque si faltan `TELEGRAM_BOT_TOKEN`, `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` o `GOOGLE_PRIVATE_KEY` | `src/config.ts` (`getEnvOrThrow`) |
| **Prevención de Inyección HTML** | Escape de `&`, `<`, `>` en texto dinámico enviado con `parse_mode: 'HTML'` | `src/utils/report.ts` (`escapeHtml`) |
| **Integridad de Datos** | Validación atómica de departamentos y cuotas máximas de caracteres antes de escribir en Google Sheets | `src/handlers/report.ts`, `src/utils/limits.ts` |
| **Control de Acceso (Allowlist)** | Middleware opcional de lista blanca por `chat_id`/`user_id` activado al definir `ALLOWED_CHAT_IDS` (incluye automáticamente `MANAGER_CHAT_ID` y `ACTING_MANAGER_CHAT_ID`) | `src/config.ts`, `src/bot.ts` |

---

## 2. Brechas y Riesgos Identificados (Auditoría)

1. **Ausencia de Autenticación / RBAC en Telegram (Alto):** Cualquier usuario que encuentre el bot puede ejecutar `/reporte`, `/estatus`, `/unidades` o enviar reportes a la matriz si no se restringe por `chat_id` o `user_id`.
2. **Archivo de Credenciales JSON en Workspace Local (Alto):** Existe `acividades-d87dfb92891b.json` en la raíz local. Aunque está listado en `.gitignore`, mantener claves privadas JSON en el árbol del repositorio aumenta el riesgo de filtración accidental.
3. **Permiso Amplio de Service Account (Medio):** El scope `https://www.googleapis.com/auth/spreadsheets` otorga acceso de lectura/escritura a cualquier hoja compartida con la cuenta de servicio.
4. **Sin Rate Limiting por Usuario (Medio):** Un usuario podría enviar ráfagas de mensajes que consuman la cuota de la API de Google Sheets.
5. **Logs con PII Parcial (Bajo):** Los logs de consola registran nombre completo, `@username` y `user.id` de Telegram (`getUserString`).

---

## 3. Plan de Endurecimiento para Producción

- **RBAC / Allowlist en `grammY`:** Incorporar un middleware en `src/bot.ts` que valide `ctx.chat.id` / `ctx.from.id` contra listas blancas configurables por entorno (`ALLOWED_CHAT_IDS`, `ADMIN_CHAT_IDS`).
- **Rotación y Retiro de Claves Locales:** Eliminar `acividades-d87dfb92891b.json` del disco local, rotar la clave de la cuenta de servicio en Google Cloud Console e inyectar `GOOGLE_PRIVATE_KEY` exclusivamente mediante el gestor de secretos de la plataforma (Render/Koyeb/Docker Secrets).
- **Rate Limiting:** Añadir middleware de limitación de tasa (ej. `@grammyjs/ratelimiter`) para proteger las cuotas de Google Sheets API.
- **Mínimo Privilegio en Sheets:** Compartir con la Service Account únicamente la hoja de cálculo `GOOGLE_SHEET_ID` de producción.
- **Auditoría de Dependencias:** Ejecutar `npm audit` periódicamente y fijar versiones en `package-lock.json`.

---

## 4. Reporte de Vulnerabilidades

Si detectas una vulnerabilidad de seguridad o exposición de credenciales:
1. **No** publiques el detalle en issues públicos ni en chats grupales.
2. Rota inmediatamente el `TELEGRAM_BOT_TOKEN` (vía `@BotFather`) y/o la clave de la Service Account en Google Cloud Console.
3. Notifica al responsable técnico del proyecto con los pasos mínimos para reproducir el incidente.

