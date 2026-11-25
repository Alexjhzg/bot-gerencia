# Reglas de Ingeniería para Agentes — `telegram-sheets-bot`

Este documento define las normas obligatorias para cualquier agente o colaborador que modifique este repositorio.

## 1. Principios de Calidad y Veracidad
- **Veracidad estricta:** Documenta y referencia únicamente archivos, símbolos, comandos y rangos de Google Sheets que existan realmente en el proyecto.
- **Separación de responsabilidades:**
  - `src/handlers/`: solo manejo de actualizaciones de Telegram (`BotContext`), validación de entrada y respuestas al usuario.
  - `src/services/`: integración con APIs externas (`src/services/sheets/`, `src/services/scheduler.ts`).
  - `src/utils/`: lógica pura determinística (`report.ts`, `shifts.ts`, `limits.ts`) sin efectos secundarios de red.
- **Preservación de lógica de negocio:** No alterar reglas de turnos (`SHIFT_1_LIMIT`, `SHIFT_2_LIMIT`), validación atómica de unidades ni cuotas de caracteres sin solicitud explícita y actualización de `LOGICA_NEGOCIO.md` y `docs/PRD.md`.

## 2. Tipado Estricto y Estilo de Código
- TypeScript `strict: true` (`tsconfig.json`).
- En código nuevo, prohibido introducir `any` explícito; usar tipos de `googleapis`, `grammy` o `unknown` con *type guards*.
- Respetar [.editorconfig](../.editorconfig), [.prettierrc](../.prettierrc) y [eslint.config.mjs](../eslint.config.mjs).

## 3. Estándares UI/UX Conversacional (Telegram)
- Mantener el **modo silencioso** en chats grupales (`src/handlers/report.ts`).
- Preferir `parse_mode: 'HTML'` con `escapeHtml()` y fallback a texto plano ante errores `can't parse entities`.
- Respetar el presupuesto de caracteres (`src/utils/limits.ts`) y `splitMessage(..., 3900)` para no exceder los 4.096 caracteres de Telegram.
- Usar reacciones `👍` / `👎` y `replyWithChatAction('typing')` en flujos de escritura/lectura.

## 4. Seguridad
- Nunca commitear `.env` ni archivos JSON de credenciales de Google Service Account.
- Nunca exponer `TELEGRAM_BOT_TOKEN` ni `GOOGLE_PRIVATE_KEY` en logs o mensajes de Telegram.
- Seguir [SECURITY.md](../SECURITY.md) ante cualquier cambio de permisos o endpoints.

## 5. Verificación Obligatoria en Runtime
Antes de dar por terminada cualquier tarea de código, ejecutar:
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm run test-parse` (y scripts de verificación relevantes en `src/scripts/`).

## 6. Skills por Rol Disponibles
- [tech-lead](./skills/tech-lead/SKILL.md)
- [backend-dev](./skills/backend-dev/SKILL.md)
- [frontend-dev](./skills/frontend-dev/SKILL.md)
- [dba-data-engineer](./skills/dba-data-engineer/SKILL.md)
- [qa-engineer](./skills/qa-engineer/SKILL.md)

