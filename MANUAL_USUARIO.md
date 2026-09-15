# Guía del Usuario: Registro de Actividades con el Bot de Telegram

Esta guía explica paso a paso cómo utilizar el Bot de Telegram para reportar las actividades diarias de tu unidad. Toda la información enviada al bot se registrará de forma automática y en tiempo real en la matriz de **Google Sheets**.

---

## 📌 1. Reglas Generales de Formato

Para que el bot reconozca tu reporte, el mensaje debe cumplir con tres elementos sencillos: el **Gatillador**, el **Nombre de la Unidad** y las **Actividades**.

### A. El Gatillador (Trigger)
El bot procesará mensajes que contengan la frase **`Reporte diario`**, el emoji **`📌`** o el signo **`+`** al inicio de cualquiera de sus líneas. 
* *Nota:* Esto permite iniciar tu reporte directamente con la unidad o incluir saludos y fechas antes de la primera unidad.

### B. Encabezado de la Unidad
Debes indicar a qué unidad corresponde el reporte usando uno de estos dos formatos:
* **Formato con signo más (`+`):** `+ NOMBRE DE LA UNIDAD` (ej: `+ Prensa`)
* **Formato con emoji (`📌`):** `📌 NOMBRE DE LA UNIDAD` o `📌: NOMBRE DE LA UNIDAD` (ej: `📌 Prensa`)

> ⚠️ **Importante:** El nombre de la unidad debe escribirse correctamente (tal cual está registrado en el sistema). Si tienes dudas sobre cómo se escribe tu unidad, puedes usar el comando `/unidades` en el bot. Escribe el nombre de la unidad directamente al lado del signo `+` o del emoji `📌`.

### C. Lista de Actividades
Cada actividad debe escribirse en una línea nueva y comenzar con alguna de las siguientes viñetas permitidas:
* Guion: `-`
* Asterisco: `*`
* Punto: `•`
* Cuadro negro: `▪️`

---

## 📝 2. Ejemplos de Envío

### Opción A: Reportar una sola unidad
Si solo vas a reportar las actividades de una unidad, puedes usar cualquiera de estos dos formatos:

**Ejemplo 1 (Formato clásico):**
```text
Reporte diario - 10/07/2026
+ PRENSA
- Redacción de nota de prensa institucional sobre el nuevo operativo.
- Monitoreo de medios y redes sociales para clipping diario.
```

**Ejemplo 2 (Formato con emojis):**
```text
📌 CAPACITACIÓN
▪️ Elaboración del cronograma para el próximo taller de cartografía.
▪️ Inducción técnica a nuevos encuestadores del proyecto.
```

---

### Opción B: Reportar múltiples unidades a la vez
Si estás a cargo de coordinar varias áreas, puedes enviar las actividades de todas tus unidades en un **único mensaje**:

```text
Reporte diario del 10/07/2026

📌 COORDINACIÓN SEEM
- Monitoreo en tiempo real del progreso de recolección de los equipos.
- Supervisión logística de las rutas y distribución de materiales.

📌 SOPORTE Y DESARROLLO TECNOLÓGICO
▪️ Mantenimiento preventivo al servidor local de base de datos.
▪️ Soporte a usuarios sobre problemas de conectividad de red.
```

---

## ⏰ 3. Horarios Límite y Turnos

El bot organiza la información en dos turnos diarios de acuerdo a la hora en que envías el mensaje (hora de Venezuela):

1. **Turno de la Mañana (1er Reporte - `12:00M`):**
   * **Horario de envío:** Desde las **12:00 AM** hasta las **12:30 PM**.
2. **Turno de la Tarde (2do Reporte - `5:30 PM`):**
   * **Horario de envío:** Desde las **12:31 PM** hasta las **5:30 PM** (17:30).

> 🚫 **Fuera de Horario:** Cualquier reporte enviado a partir de las **5:31 PM** será rechazado automáticamente por el bot.

---

## 🔄 4. ¿Cómo corregir un reporte ya enviado?

Si enviaste tu reporte y te diste cuenta de que olvidaste algo o cometiste un error, corregirlo es muy sencillo:

1. Modifica el mensaje original o redacta uno nuevo con el formato correcto.
2. Envía el mensaje corregido al bot dentro de la misma ventana de tiempo del turno.
3. El bot detectará que ya existía información para tu unidad y la **sobrescribirá por completo**, respondiendo con la etiqueta **`Corregido 🔄`** en lugar de *Guardado*.

---

## 🔍 5. Validación de Errores

El bot cuenta con un sistema de **validación atómica**. Esto significa que si envías un mensaje con varias unidades y cometes un error ortográfico en el nombre de alguna de ellas (por ejemplo, escribir `Administracionn` con doble 'n'):
* El bot **rechazará todo el mensaje** (no guardará nada de ninguna unidad).
* Responderá con un mensaje de alerta indicando el error.
* Te mostrará la lista de nombres válidos para que puedas corregirlo y reenviarlo.

---

## 🤖 6. Comandos Útiles del Bot

Puedes escribir estos comandos directamente en tu chat con el bot para obtener información útil:

* **`/start`**: Muestra las instrucciones iniciales y el formato de reporte.
* **`/unidades`**: Muestra la lista de todas las unidades válidas configuradas oficialmente para que verifiques su ortografía exacta.
* **`/estatus`**: Te muestra en tiempo real qué unidades ya enviaron su reporte del turno y cuáles faltan por entregar.
