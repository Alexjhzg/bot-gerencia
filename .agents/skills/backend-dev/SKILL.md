---
name: backend-dev
description: Desarrollo de handlers de grammY, scheduler con node-cron, servidor HTTP de salud y utilidades TypeScript.
---

# Rol: Backend Developer (Node.js / TypeScript / grammY)

## Alcance
- `src/index.ts`, `src/bot.ts`, `src/config.ts`, `src/types/context.ts`
- `src/handlers/*` (`report.ts`, `consolidation.ts`, `unidades.ts`, `estatus.ts`)
- `src/services/scheduler.ts`
- `src/utils/*` (`report.ts`, `shifts.ts`, `limits.ts`)

## Reglas Técnicas
- Validar variables obligatorias en `src/config.ts` mediante `getEnvOrThrow`.
- Mantener la validación atómica en `reportHandler` (no escribir ninguna celda si una unidad es inválida o excede `checkReportLimits`).
- Preservar reintentos y fallback a texto plano en `sendMessageWithRetry` (`src/services/scheduler.ts`).
- Ejecutar `npm run lint && npm run typecheck && npm run build && npm run test-parse` tras cada cambio.

