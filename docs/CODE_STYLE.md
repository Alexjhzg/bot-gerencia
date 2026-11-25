# Guía de Estilo de Código — `telegram-sheets-bot`

## 1. Stack y Herramientas

- **Lenguaje:** TypeScript `^5.5.2` (`strict: true` en `tsconfig.json`, target `ES2022`, `CommonJS`).
- **Runtime:** Node.js `>=20.0.0`.
- **Linter:** ESLint v9 (Flat Config en [eslint.config.mjs](../eslint.config.mjs)) con `typescript-eslint` y `eslint-config-prettier`.
- **Formateador:** Prettier ([.prettierrc](../.prettierrc)) + [.editorconfig](../.editorconfig).

---

## 2. Comandos Estándar

```bash
npm run lint          # Analiza src/**/*.ts con ESLint
npm run format        # Formatea src/**/*.ts con Prettier
npm run format:check  # Verifica formato sin modificar archivos
npm run typecheck     # Verifica tipos con tsc --noEmit
npm run build         # Compila TypeScript a dist/
```

---

## 3. Convenciones de Código

- **Indentación y formato:** 2 espacios, comillas simples `'...'`, punto y coma obligatorio (`;`), ancho máximo de línea `100`, saltos de línea `LF`.
- **Tipado estricto:** Evitar `any` en código nuevo (`@typescript-eslint/no-explicit-any: warn` para preservar compatibilidad con el código legado). Preferir `unknown` en bloques `catch` y acotar tipos con `instanceof Error`.
- **Variables no usadas:** Prefijar parámetros intencionalmente no usados con `_` (ej. `_req`).
- **Estructura de módulos:**
  - `src/handlers/`: solo orquestación de comandos/mensajes de Telegram.
  - `src/services/`: integraciones externas (`sheets/`, `scheduler.ts`).
  - `src/utils/`: funciones puras de negocio (parser, turnos, límites, escape HTML).
  - `src/types/`: tipos compartidos (`BotContext`).
- **Logs:** Usar prefijos estructurados por módulo (`[Bot]`, `[SheetsService]`, `[Scheduler]`, `[HTTP Server]`).

