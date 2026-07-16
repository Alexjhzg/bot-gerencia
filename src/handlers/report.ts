import { BotContext } from '../types/context';
import { SheetsService } from '../services/sheets';
import { config } from '../config';
import { getShiftStatus } from '../utils/shifts';
import {
  parseReportMessage,
  getUserString,
  getFormattedDate,
  normalizeText,
} from '../utils/report';

/**
 * Handler triggered when a message matches the "Reporte diario" or "📌Unidad:" regex.
 * Directs the ingestion to the matrix sheet grid of 'Reportes'.
 */
export async function reportHandler(ctx: BotContext) {
  const text = ctx.message?.text;
  if (!text) return;

  // Silent Filter (Group chat protection):
  // Ignore messages starting with + or 📌 that do not contain "reporte diario" and have no lines starting with bullet points.
  const hasReportDiario = /reporte diario/i.test(text);
  const hasBullets = /^[-*•▪️▪▫\u25AA\uFE0F\u25FC\u25FD\u25FE\u25FF\u2B1B\u2B1C\u2B1D\u2B1E]/mu.test(text);

  if (!hasReportDiario && !hasBullets) {
    return;
  }

  const user = getUserString(ctx);
  console.log(`[Bot] [Report] Inicia procesamiento de reporte enviado por ${user}`);

  // Let the user know the bot is processing
  await ctx.replyWithChatAction('typing');

  try {
    // 1. Evaluate current time against shifts
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

    const { isShift1, isValid } = getShiftStatus(timeStr);

    if (!isValid) {
      console.log(`[Bot] [Report] [Rechazado] Envío fuera de horario por ${user}. Hora servidor: ${timeStr}`);
      throw new Error(
        `El horario límite para enviar reportes ha expirado.\n\n` +
        `*Horarios permitidos de envío:*\n` +
        `• *Reporte del Mediodía (Turno 1):* desde las 00:00 AM hasta las ${config.shift1Limit} PM.\n` +
        `• *Reporte de la Tarde (Turno 2):* desde las ${config.shift1Limit} PM hasta las ${config.shift2Limit} PM.\n\n` +
        `⏰ Hora actual del servidor: *${timeStr}*`
      );
    }

    // 2. Parse report message into one or more unit reports
    const parsedReports = parseReportMessage(text);
    const date = getFormattedDate();

    // 3. Load authorized departments and validate ALL departments against Matrix Sheet (Atomic Validation)
    const sheetsService = SheetsService.getInstance();
    const matrixDepts = await sheetsService.getMatrixDepartments();

    if (matrixDepts.length === 0) {
      throw new Error('No se encontraron departamentos configurados en la pestaña "Reportes" (A3:A50).');
    }

    const validatedReports = parsedReports.map((r) => {
      const normalizedUserDept = normalizeText(r.department);
      
      // Perform fuzzy and normalized matching
      const officialMatch = matrixDepts.find((d) => {
        const normMatrixDept = normalizeText(d.name);
        return (
          normMatrixDept === normalizedUserDept ||
          normMatrixDept.replace(/\s/g, '') === normalizedUserDept.replace(/\s/g, '') ||
          normMatrixDept.includes(normalizedUserDept) ||
          normalizedUserDept.includes(normMatrixDept)
        );
      });

      return {
        originalDeptName: r.department,
        officialDeptMatch: officialMatch?.name || null,
        officialRowIndex: officialMatch?.rowIndex || -1,
        activities: r.activities,
      };
    });

    const invalidReports = validatedReports.filter((r) => r.officialRowIndex === -1);
    if (invalidReports.length > 0) {
      const invalidListStr = invalidReports.map((d) => `• *"${d.originalDeptName}"*`).join('\n');
      console.log(`[Bot] [Report] [Rechazado] Departamentos inválidos por ${user}: ${invalidReports.map(r => r.originalDeptName).join(', ')}`);
      const allowedList = matrixDepts
        .filter((d) => 
          !d.name.toUpperCase().includes('CLIMATICA') && 
          !d.name.toUpperCase().includes('CLIMÁTICA') && 
          !d.name.toUpperCase().includes('NOVEDADES')
        )
        .map((d) => `• ${d.name}`)
        .join('\n');
      throw new Error(
        `Las siguientes unidades no están registradas en la matriz de Reportes:\n${invalidListStr}\n\n` +
        `*Unidades autorizadas en la matriz:*\n${allowedList}\n\n` +
        `⚠️ _Por favor, corrige la ortografía después de 📌 o del signo +._`
      );
    }

    // 4. Write each valid report directly to its corresponding matrix cell
    const resultsSummary: string[] = [];

    console.log(`[Bot] [Report] Procesando ${validatedReports.length} reporte(s) para el Turno ${isShift1 ? '1 (Mañana)' : '2 (Tarde)'} de: ${user}`);

    for (const item of validatedReports) {
      const departmentName = item.officialDeptMatch!;
      const rowIndex = item.officialRowIndex;
      const activities = item.activities;

      // Format activity with bullet points and metadata if required (we write raw activities directly to the cell)
      const bulletedActivities = activities
        .split('\n')
        .map(line => `• ${line}`)
        .join('\n');

      console.log(`[Bot] [Report] Guardando reporte en Google Sheets: Departamento "${departmentName}" (Fila ${rowIndex})`);

      const { isOverwrite } = await sheetsService.writeMatrixReport(
        rowIndex,
        isShift1,
        bulletedActivities
      );

      const actionLabel = isOverwrite ? 'Corregido 🔄' : 'Guardado ✅';
      console.log(`[Bot] [Report] Google Sheets: "${departmentName}" -> ${actionLabel}`);
      const escapedDept = departmentName.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&');
      resultsSummary.push(`• *${escapedDept}*: ${actionLabel}`);
    }

    // React with a thumbs up emoji (👍) to the user's message
    try {
      await ctx.react("👍");
    } catch (reactError) {
      console.error('Failed to react to message:', reactError);
    }

    // 5. Respond with confirmation summary
    const successMessage = 
      `✅ *¡Reportes de la matriz procesados con éxito\\!*\n\n` +
      `*Fecha:* ${date.replace(/-/g, '\\-').replace(/:/g, '\\:')}\n\n` +
      `*Resumen por unidad:*\n` +
      resultsSummary.join('\n');

    await ctx.reply(successMessage, { parse_mode: 'MarkdownV2' });
    console.log(`[Bot] [Report] Finalizado con éxito para ${user}`);

  } catch (error: any) {
    // Validation or API error
    console.error(`[Bot] [Report] [Error] al procesar reporte de ${user}:`, error.message || error);
    
    // React with a thumbs down emoji (👎) to the user's message
    try {
      await ctx.react("👎");
    } catch (reactError) {
      console.error('Failed to react to message:', reactError);
    }

    const errorMessage = 
      `❌ *Error al procesar el reporte en la matriz*\n\n` +
      `${error.message || 'Ocurrió un error inesperado al guardar los datos.'}`;

    await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
  }
}


