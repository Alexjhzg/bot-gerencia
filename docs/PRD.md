# PRD — Bot de Reportes Diarios (Telegram & Google Sheets)

> **Estado:** Vigente (v1.0.0)  
> **Repositorio:** `telegram-sheets-bot`  
> **Documentos relacionados:** [LOGICA_NEGOCIO.md](../LOGICA_NEGOCIO.md) · [MANUAL_USUARIO.md](../MANUAL_USUARIO.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 1. Resumen Ejecutivo

El **Bot de Reportes Diarios (`telegram-sheets-bot`)** automatiza la recolección, validación, almacenamiento y consolidación de actividades diarias de las unidades administrativas/operativas (ej. *Monagas*) desde chats de **Telegram** hacia una matriz bidimensional en **Google Sheets** (`Reportes_unificados`), eliminando la consolidación manual y garantizando entregas puntuales a la gerencia.

## 2. Objetivos del Producto

- **Centralizar** los reportes de actividades en una única matriz de doble entrada (unidad × fecha/turno).
- **Garantizar la calidad de los datos** mediante validación atómica de departamentos, ventanas horarias de turno y límites de caracteres por unidad.
- **Automatizar la consolidación** bajo demanda (`/reporte`) y programada vía cron (`12:31` y `17:30`, zona horaria `America/Caracas`) hacia los chats de gerencia.
- **Minimizar la fricción operativa** permitiendo enviar reportes desde chats privados o grupales sin ruido innecesario (modo silencioso).

## 3. Usuarios y Personas

| Persona | Rol | Necesidades Principales | Interacción con el Bot |
| :--- | :--- | :--- | :--- |
| **Responsable de Unidad** | Envía reportes diarios de su área | Formato flexible (`+` o `📌`), corrección rápida por sobrescritura, feedback inmediato (`👍`/`👎`) | Mensajes de reporte, `/start`, `/unidades`, `/estatus` |
| **Coordinador Multi-unidad** | Reporta varias unidades en un solo mensaje | Envío en lote con validación atómica y consulta de pendientes | Mensajes multi-bloque, `/estatus`, `/reporte` |
| **Gerente / Gerente Encargado** | Recibe consolidado institucional | Resumen íntegro en 1 solo mensaje de Telegram al cierre de cada turno | Recepción automática vía `MANAGER_CHAT_ID` / `ACTING_MANAGER_CHAT_ID`, `/id`, `/reporte` |

## 4. Requisitos Funcionales (RF)

| ID | Requisito | Implementación Real |
| :--- | :--- | :--- |
| **RF-01** | Ingesta de reportes diarios con soporte de uno o múltiples bloques de departamentos y viñetas (`-`, `*`, `•`, `▪️`, `▪`, `▫`) | `src/bot.ts` (`bot.hears`), `src/handlers/report.ts`, `src/utils/report.ts` (`parseReportMessage`) |
| **RF-02** | Filtro silencioso en chats grupales: ignora mensajes sin `"reporte diario"` ni viñetas válidas | `src/handlers/report.ts` |
| **RF-03** | Validación de ventanas horarias de turno (Turno 1: `00:00`–`SHIFT_1_LIMIT`; Turno 2: `SHIFT_1_LIMIT`–`SHIFT_2_LIMIT`) | `src/utils/shifts.ts` (`getShiftStatus`) |
| **RF-04** | Validación atómica y coincidencia difusa (fuzzy/tokens) de departamentos contra `Reportes_unificados!A3:A50` | `src/utils/report.ts` (`matchDepartment`), `src/handlers/report.ts` |
| **RF-05** | Control de límite de caracteres por unidad para asegurar consolidados ≤ 4.096 caracteres | `src/utils/limits.ts` (`UNIT_CHARACTER_LIMITS`, `checkReportLimits`) |
| **RF-06** | Escritura en matriz con sobrescritura de correcciones y expansión dinámica de columnas/cuadrícula en Google Sheets | `src/services/sheets/matrix-writer.ts` (`writeMatrixReport`) |
| **RF-07** | Consolidado bajo demanda (`/reporte`, `/reportes`) con soporte de turno (`1`/`2`/`12`/`5`/`6`/`pm`) y fecha histórica (`DD/MM/YYYY`) | `src/handlers/consolidation.ts`, `src/services/sheets/matrix-reader.ts` |
| **RF-08** | Consulta de unidades autorizadas y sus límites (`/unidades`) | `src/handlers/unidades.ts` |
| **RF-09** | Consulta de estatus de entregas del turno activo (`/estatus`) | `src/handlers/estatus.ts`, `src/services/sheets/matrix-reader.ts` (`getReportsStatus`) |
| **RF-10** | Envío automático programado a gerencia (`12:31` y `17:30`) con reintentos y respaldo en texto plano | `src/services/scheduler.ts` (`startScheduler`, `sendConsolidatedToManager`) |
| **RF-11** | Identificación de Chat ID (`/id`, `/myid`) y ayuda inicial (`/start`) | `src/bot.ts` |
| **RF-12** | Endpoint HTTP de salud (`/`, `/health`) para monitoreo y keep-alive (Render/Koyeb/UptimeRobot) | `src/index.ts` |

## 5. Requisitos No Funcionales (RNF)

- **Disponibilidad y Keep-Alive:** Servidor HTTP nativo (`node:http`) respondiendo `200 OK` en `PORT` (default `8080`), más apagado controlado (`SIGINT`, `SIGTERM`).
- **Resiliencia:** Reintentos automáticos (`maxRetries = 3`, `delayMs = 3000`) en entregas programadas y fallback a texto plano si Telegram falla al parsear entidades HTML.
- **Límites de Plataforma:** División segura por líneas (`splitMessage`, límite `3900` caracteres) y cuotas por unidad para respetar el máximo de `4096` caracteres de Telegram.
- **Zona Horaria:** Estandarizada a `America/Caracas` por defecto (`TZ`).
- **Portabilidad:** Empaquetado en Docker multi-etapa (`node:20-alpine`) ejecutado con usuario no-root (`node`).

## 6. Fuera de Alcance (v1.0.0)

- Panel web o frontend gráfico (toda la interacción es vía Telegram y Google Sheets).
- Base de datos relacional/NoSQL tradicional (Google Sheets actúa como almacén único de verdad).
- Autenticación/autorización por roles (RBAC) en comandos de Telegram (ver plan en [SECURITY.md](../SECURITY.md)).

