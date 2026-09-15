# Lógica de Negocio: Bot de Reportes Diarios (Telegram & Google Sheets)

Este documento detalla las reglas de negocio, el flujo de procesamiento de datos y las funcionalidades implementadas en el bot de gestión de actividades. Este archivo debe mantenerse actualizado con cada nuevo requerimiento implementado.

---

## 1. Propósito General del Bot
El bot sirve para que los integrantes del equipo envíen sus reportes diarios de actividades a un chat (privado o grupal) de Telegram y que estos se registren en tiempo real en la pestaña **`Reportes_unificados`** en Google Sheets. 

El diseño se estructura como una **matriz de doble entrada** en lugar de una bitácora lineal. Las actividades se registran directamente en la celda de intersección correspondiente al departamento (fila) y el turno/fecha del día (columna).

---

## 2. Reglas del Analizador de Mensajes (Parser)

El bot procesa mensajes bajo las siguientes reglas de lectura de texto:

1. **Gatillador (Trigger):** El mensaje debe contener al inicio de cualquiera de sus líneas la frase `"Reporte diario"`, el emoji `"📌"` o el signo `"+"` (insensible a mayúsculas o espacios). Esto permite iniciar el reporte directamente o incluir líneas informativas previas.
2. **Extracción de Departamento:**
   - Se ubica en la cabecera de la sección, precedido por el signo de suma (`+`) (ej: `+ Prensa`) o por el emoji de alfiler (`📌`) (ej: `📌 Prensa` o `📌: Prensa`).
   - El bot limpia caracteres adicionales (como los dos puntos `:` y espacios sobrantes).
3. **Extracción de Actividades:**
   - Todas las líneas posteriores a la unidad que inicien con un guion (`-`), asterisco (`*`), punto (`•`) o cuadro (`▪️`) se consideran actividades del departamento.
   - Se preservan las viñetas originales del mensaje y se concatenan todas las actividades del departamento en una única celda con saltos de línea.
4. **Validación de Errores (Atómica):**
   - El mensaje puede contener uno o más bloques de departamentos.
   - El bot valida **todos** los departamentos del mensaje. Si uno de ellos es inválido, rechaza el lote completo y responde con un mensaje explicativo detallando las unidades incorrectas.

---

## 3. Mapeo y Estructura en Google Sheets (Formato Matriz)

El destino principal de escritura es la pestaña **`Reportes_unificados`**, la cual sigue una cuadrícula bidimensional estructurada:

* **Fila 1:** Encabezados con las fechas combinadas de dos en dos, bajo el formato `DÍA DD/M/YY` (ej. `JUEVES 09/7/26`, sin ceros a la izquierda en el mes).
* **Fila 2:** Columnas de Turnos: `12:00M` y `5:00 PM` (soporta `6:00 PM` en registros históricos).
* **Columna A (Filas 3 a 8):** Nombres de los departamentos oficiales en orden.
* **Intersección (Celdas):** Texto concatenado con las actividades de la unidad correspondiente para ese turno del día.

---

## 4. Funcionalidades Especiales Implementadas

### A. Detección y Expansión Dinámica de Columnas
* **Regla:** Al recibir un reporte, el bot busca si ya existe el bloque de columnas correspondiente al día de hoy (`DD/M/YY`) y al turno activo.
* **Acción:** Si es un día nuevo o no se localiza la columna, el bot **crea automáticamente 2 nuevas columnas** al final de la hoja (para `12:00M` y `5:00 PM`), escribe las cabeceras correspondientes, combina el bloque de la Fila 1 y, en caso de superar el límite de cuadrícula de Sheets (ej. 51 columnas), **redimensiona dinámicamente el número de columnas de la hoja** de forma transparente.

### B. Reacción con Emojis
* **Regla (Éxito):** Al guardar/actualizar la celda, el bot añade una reacción de **pulgar arriba (👍)** sobre el mensaje del reporte.
* **Regla (Fallo):** Si ocurre un error de validación o fallo de API, el bot añade una reacción de **pulgar abajo (👎)** e informa del error en el chat.

### C. Modo Silencioso (Filtro de Chats)
* El bot ignora cualquier mensaje que no cumpla con la estructura de un reporte diario para evitar interferir en la dinámica común de chats grupales.

---

## 5. Departamentos Autorizados (Fila Mapeada en la Matriz)

El bot lee de manera dinámica la columna A (`A3:A50`) de la pestaña `Reportes_unificados` para conocer los departamentos válidos y su índice de fila exacto en Google Sheets. Soporta coincidencias flexibles (insensibles a acentos o mayúsculas):

1. Fila 3: **GERENCIA**
2. Fila 4: **ENLACE DE RRHH Y ADMINISTRACIÓN**
3. Fila 5: **COORDINACIÓN DE PROGRAMAS**
4. Fila 6: **COORDINACIÓN SEEM**
5. Fila 7: **SITUACIÓN CLIMÁTICA** *(Tratamiento especial en reportes)*
6. Fila 8: **NOVEDADES** *(Tratamiento especial en reportes)*

---

## 6. Lógica de Turnos y Sobrescritura de Reportes

El bot administra las celdas basadas en ventanas horarias y permite correcciones instantáneas:

### A. Turnos y Horarios Oficiales (Configurables)
* **Turno 1 (Mediodía):** Desde las **00:00 AM hasta las 12:30 PM**. Mapea a la columna del turno `12:00M`.
* **Turno 2 (Tarde):** Desde las **12:31 PM hasta las 5:30 PM (17:30)**. Mapea a la columna del turno `5:30 PM`.
* **Fuera de Horario:** Reportes enviados a partir de las 17:31 son automáticamente rechazados.

### B. Sobrescritura de Celda (Correcciones)
* Al ser celdas de intersección fijas por día y turno, el bot siempre realiza una sobrescritura de celda.
* Si la celda anteriormente contenía texto, el bot lo reemplaza e informa al usuario con la etiqueta `Corregido 🔄`. Si estaba vacía, emite la etiqueta `Guardado ✅`.

---

## 7. Comando de Consolidado `/reporte`

El bot incluye un comando para generar resúmenes de actividades listos para ser copiados:

* **Gatillador:** `/reporte` (enviado en el chat del bot).
* **Parámetros Opcionales:**
  - `/reporte 1` o `/reporte 12` fuerza la consolidación del Turno 1 (`12:00M`).
  - `/reporte 2`, `/reporte 5` o `/reporte 6` fuerza la consolidación del Turno 2 (`5:00 PM`).
  - Si se envía sin parámetros, el bot detecta el turno activo actual de manera inteligente.
* **Flujo de Consolidado:**
  - Ubica la columna del día de hoy y el turno requerido en la pestaña `Reportes`.
  - Recopila todas las actividades registradas en la columna de cada departamento.
  - Excluye departamentos sin actividades cargadas para evitar ruido.
  - Da un tratamiento y formato especial a la `SITUACIÓN CLIMÁTICA` y `NOVEDADES`, ubicándolas con etiquetas personalizadas al final del consolidado.
