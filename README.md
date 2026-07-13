# Telegram Google Sheets Report Bot

Bot modular escrito en **TypeScript** con el framework **grammY** y la API oficial de **Google Sheets (`googleapis`)**, preparado para ser empaquetado en contenedores de **Docker**.

## Funcionalidad del Bot

El bot escucha mensajes que comiencen con `"Reporte diario"` y procesa la información de la siguiente manera:
1. Extrae el nombre del departamento de la segunda línea (`+ Nombre`).
2. Agrupa todas las actividades subsecuentes que inicien con un guion (`-`).
3. Agrega una nueva fila en Google Sheets en la hoja y rango configurados con las columnas: `Fecha | Usuario | Departamento | Actividades`.

---

## Requisitos Previos

### 1. Bot de Telegram
1. Habla con [@BotFather](https://t.me/BotFather) en Telegram y envía el comando `/newbot`.
2. Sigue los pasos y copia el token de acceso (HTTP API Token). Este valor va en `TELEGRAM_BOT_TOKEN`.

### 2. Cuenta de Servicio de Google (Google Service Account)
Para que el bot pueda escribir datos en una hoja de Google Sheets sin requerir intervención humana (OAuth manual), usaremos una Cuenta de Servicio:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/).
2. Crea un proyecto (o usa uno existente).
3. Habilita la **Google Sheets API**:
   - En el buscador superior escribe "Google Sheets API".
   - Haz clic en ella y presiona **Habilitar**.
4. Crea una Cuenta de Servicio (Service Account):
   - Ve a **API y servicios** > **Credenciales**.
   - Haz clic en **Crear credenciales** > **Cuenta de servicio**.
   - Asigna un nombre (ej: `telegram-sheets-bot`) y haz clic en **Crear y continuar** y luego **Listo**.
5. Genera la Clave Privada (JSON Key):
   - Haz clic sobre la cuenta de servicio recién creada en la sección "Cuentas de servicio".
   - Ve a la pestaña **Claves** (Keys).
   - Haz clic en **Agregar clave** > **Crear clave nueva**. Selecciona el formato **JSON** y descárgala.
6. Guarda los siguientes valores de ese archivo descargado:
   - `client_email`: Este valor va en `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
   - `private_key`: Este valor va en `GOOGLE_PRIVATE_KEY` (copia la clave completa incluyendo las cabeceras `-----BEGIN PRIVATE KEY-----` y `-----END PRIVATE KEY-----`). En tu archivo `.env`, reemplaza los saltos de línea reales de la clave con caracteres literales `\n` y rodea la clave con comillas.
7. **IMPORTANTE: Comparte tu Google Sheet:**
   - Abre la hoja de cálculo de Google Sheets que vas a usar.
   - Haz clic en el botón azul **Compartir** (esquina superior derecha).
   - Añade el correo de tu cuenta de servicio (`client_email`) con permisos de **Editor**. De lo contrario, el bot recibirá un error 403 (Permission Denied).

---

## Configuración del Entorno Local

1. Copia la plantilla de entorno:
   ```bash
   cp .env.example .env
   ```
2. Completa los valores de tu `.env` con las credenciales que obtuviste en los pasos anteriores.
3. Copia el ID de tu hoja de Google Sheets (se encuentra en la URL: `https://docs.google.com/spreadsheets/d/TU_ID_DE_HOJA/edit`) y asígnalo en `GOOGLE_SHEET_ID`.

---

## Desarrollo Local sin Docker

1. Instalar dependencias locales:
   ```bash
   npm install
   ```
2. Ejecutar las pruebas del parser local:
   ```bash
   npm run test-parse
   ```
3. Iniciar el bot en modo desarrollo (recarga automática con nodemon):
   ```bash
   npm run dev
   ```

---

## Despliegue con Docker (Recomendado)

El proyecto incluye un `Dockerfile` multi-etapa optimizado que no ejecuta como `root` y un archivo `docker-compose.yml`.

1. Levantar y compilar el contenedor en segundo plano:
   ```bash
   docker compose up -d --build
   ```
2. Ver logs de la aplicación:
   ```bash
   docker compose logs -f
   ```
3. Detener la aplicación:
   ```bash
   docker compose down
   ```
