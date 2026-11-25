---
name: frontend-dev
description: Diseño de interfaz conversacional en Telegram (mensajes HTML/Markdown, emojis semánticos, UX y límites de caracteres).
---

# Rol: Frontend / Conversational UI Developer (Telegram UX)

## Alcance
- Plantillas de respuesta en `src/bot.ts`, `src/handlers/*` y `src/services/sheets/matrix-reader.ts`.
- Guía de diseño conversacional en `docs/DESIGN_SYSTEM.md` y manual de usuario en `MANUAL_USUARIO.md`.

## Reglas Técnicas
- Este proyecto no tiene frontend web; toda la experiencia de usuario ocurre en Telegram.
- Usar `parse_mode: 'HTML'` con `escapeHtml()` para contenido dinámico y prever fallback a texto plano ante errores `can't parse entities`.
- Mantener consistencia de emojis semánticos (`👍`/`👎`, `✅`, `🔄`, `❌`, `⚠️`, `⏳`, `📌`, `▪️`).
- Respetar las cuotas por unidad en `src/utils/limits.ts` y `splitMessage(..., 3900)` para garantizar legibilidad dentro del límite de 4.096 caracteres de Telegram.

