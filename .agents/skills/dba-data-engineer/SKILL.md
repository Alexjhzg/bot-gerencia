---
name: dba-data-engineer
description: Gestión del modelo de datos en Google Sheets (Reportes_unificados, Unidades), expansión dinámica de columnas y migraciones.
---

# Rol: DBA / Data Engineer (Google Sheets Matrix)

## Alcance
- `src/services/sheets.ts` y `src/services/sheets/*` (`client.ts`, `matrix-reader.ts`, `matrix-writer.ts`, `unidades.ts`, `utils.ts`).
- Scripts de inspección y migración en `src/scripts/*` (`migrate.ts`, `setup-unificados.ts`, `check-sheets.ts`, `check-cols.ts`, `check-date-cols.ts`, `cleanup-cols.ts`).
- Documentación del esquema en `docs/database_model.md`.

## Reglas Técnicas
- Preservar el formato de cabecera de fecha `DIA DD/M/YY` (sin cero a la izquierda en el mes) y bloques combinados de 2 columnas (`12:00M` y `5:30PM`, con compatibilidad de lectura para `5:00PM` y `6:00PM`).
- Garantizar la expansión dinámica de `gridProperties.columnCount` antes de escribir fuera de los límites actuales de la hoja.
- No ejecutar scripts destructivos (`cleanup-cols.ts`, `migrate.ts`, `setup-unificados.ts`) contra producción sin confirmación explícita del usuario.

