# Arquitectura del Sistema — `telegram-sheets-bot`

## 1. Visión General (C4 — Contexto)

El sistema es un servicio monolítico modular en **Node.js (>=20) + TypeScript** que integra la API de **Telegram** (vía *long polling* con `grammY`) y **Google Sheets API v4** (`googleapis`), acompañado de un planificador `node-cron` y un servidor HTTP ligero para *health checks*.

```mermaid
C4Context
    title Diagrama de Contexto (C4 Nivel 1)
    Person(user, "Responsable de Unidad", "Envía reportes diarios y consulta /estatus o /unidades")
    Person(manager, "Gerente / Encargado", "Recibe consolidados automáticos y consulta /reporte")
    System(bot, "Telegram Sheets Bot", "Procesa reportes, valida reglas y consolida actividades")
    System_Ext(telegram, "Telegram Bot API", "Mensajería, reacciones y comandos")
    System_Ext(sheets, "Google Sheets API v4", "Hoja de cálculo matriz Reportes_unificados")
    System_Ext(monitor, "Render / Koyeb / UptimeRobot", "Monitoreo HTTP /health")

    Rel(user, telegram, "Envía reportes y comandos")
    Rel(manager, telegram, "Recibe consolidados")
    Rel(bot, telegram, "Long polling y respuestas", "HTTPS")
    Rel(bot, sheets, "Lee/escribe matriz y expande columnas", "HTTPS / JWT")
    Rel(monitor, bot, "GET /health", "HTTP")
```

---

## 2. Contenedores y Módulos Internos (C4 — Componentes)

```mermaid
flowchart TD
    IDX["src/index.ts\nBootstrap, HTTP /health y Graceful Shutdown"] --> BOT["src/bot.ts\nInstancia grammY, middleware y rutas"]
    IDX --> SCH["src/services/scheduler.ts\nCron 12:31 y 17:30 (America/Caracas)"]

    BOT --> H_REP["src/handlers/report.ts\nIngesta y validación atómica"]
    BOT --> H_CON["src/handlers/consolidation.ts\nComando /reporte"]
    BOT --> H_UNI["src/handlers/unidades.ts\nComando /unidades"]
    BOT --> H_EST["src/handlers/estatus.ts\nComando /estatus"]

    H_REP --> U_SHF["src/utils/shifts.ts\nVentanas horarias"]
    H_REP --> U_REP["src/utils/report.ts\nParser, fuzzy match, escapeHtml"]
    H_REP --> U_LIM["src/utils/limits.ts\nCuotas de caracteres"]

    H_REP --> SVC["src/services/sheets.ts\nFachada Singleton SheetsService"]
    H_CON --> SVC
    H_UNI --> SVC
    H_EST --> SVC
    SCH --> SVC

    SVC --> S_CLI["src/services/sheets/client.ts\nAuth JWT Google"]
    SVC --> S_WR["src/services/sheets/matrix-writer.ts\nEscritura y expansión de columnas"]
    SVC --> S_RD["src/services/sheets/matrix-reader.ts\nConsolidado y estatus"]
    SVC --> S_UNI["src/services/sheets/unidades.ts\nHoja auxiliar Unidades"]
```

---

## 3. Flujos Clave

### 3.1 Ingesta de Reporte Diario (`reportHandler`)

```mermaid
sequenceDiagram
    actor U as Usuario Telegram
    participant B as bot.ts / report.ts
    participant L as utils (shifts, report, limits)
    participant G as Google Sheets API

    U->>B: Mensaje con "+ Unidad" / "📌 Unidad" y viñetas
    B->>B: Filtro silencioso (hasReportDiario || hasBullets)
    B->>L: getShiftStatus(timeStr)
    alt Fuera de horario
        B-->>U: Reacción 👎 + Error de horario
    end
    B->>L: parseReportMessage(text)
    B->>G: getMatrixDepartments() [Reportes_unificados!A3:A50]
    B->>L: matchDepartment() (Validación atómica)
    B->>L: checkReportLimits()
    alt Unidad inválida o exceso de caracteres
        B-->>U: Reacción 👎 + Detalle del error
    end
    loop Por cada unidad válida
        B->>G: writeMatrixReport(rowIndex, isShift1, bulletedActivities)
    end
    B-->>U: Reacción 👍 + Resumen (Guardado ✅ / Corregido 🔄)
```

### 3.2 Consolidación Automática (`scheduler.ts`)

- **12:31 PM (`31 12 * * *`):** Consolida Turno 1 (`12:00M`) y envía a `config.managerChatIds`.
- **05:30 PM (`30 17 * * *`):** Consolida Turno 2 (`5:30 PM`) y envía a `config.managerChatIds`.
- Incluye lógica de reintentos (`3` intentos, `3000ms` de espera) y degradación a texto plano ante errores de parseo HTML.

---

## 4. Topología de Despliegue

- **Contenedor:** `Dockerfile` multi-etapa basado en `node:20-alpine`.
  - Etapa `builder`: `npm ci` + `npm run build` (`tsc`).
  - Etapa `runner`: `npm ci --only=production`, copia `dist/`, ejecuta bajo `USER node` (`CMD ["node", "dist/index.js"]`).
- **Orquestación local/servidor:** `docker-compose.yml` (`container_name: telegram_sheets_bot`, `restart: unless-stopped`, montaje read-only de `/etc/localtime` y `/etc/timezone`).
- **Plataformas PaaS:** Compatible con Render / Koyeb mediante `PORT` (default `8080`) y endpoints `/` y `/health`.

---

## 5. Registro de Decisiones de Arquitectura (ADRs)

| ADR | Decisión | Justificación |
| :--- | :--- | :--- |
| **ADR-01** | Usar **Google Sheets** en formato matriz (`Reportes_unificados`) como almacenamiento único | Permite a la gerencia inspeccionar y editar el histórico directamente sin infraestructura de BD adicional. |
| **ADR-02** | Usar **Long Polling** de `grammY` + servidor HTTP mínimo de healthcheck | Simplifica el despliegue detrás de NAT/firewalls o PaaS gratuitos sin requerir certificados ni configuración de webhooks. |
| **ADR-03** | **Validación atómica** en reportes multi-unidad | Evita estados parciales en la matriz cuando un coordinador comete un error tipográfico en una de las unidades. |
| **ADR-04** | **Expansión dinámica de cuadrícula** en `matrix-writer.ts` | Evita fallos de la API de Google Sheets al superar las columnas iniciales (por defecto 26 o 51) conforme avanzan los días. |
| **ADR-05** | **Cuotas de caracteres por unidad** en `src/utils/limits.ts` | Garantiza que el consolidado institucional quepa en un solo mensaje de Telegram (≤ 4.096 caracteres). |

