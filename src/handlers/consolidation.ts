import { BotContext } from '../types/context';
import { SheetsService } from '../services/sheets';
import { getShiftStatus } from '../utils/shifts';
import {
  getUserString,
  splitMessage,
} from '../utils/report';

/**
 * Helper to parse a user query date of the form DD/MM/YYYY or DD/M/YYYY
 * and convert it to the Google Sheets matrix header format: "WEEKDAY DD/M/YY"
 */
function parseUserQueryDate(dateStr: string): string {
  const parts = dateStr.trim().split('/');
  if (parts.length !== 3) {
    throw new Error('El formato debe ser DD/MM/YYYY (ej. 30/06/2026).');
  }

  let day = parseInt(parts[0], 10);
  let month = parseInt(parts[1], 10);
  let year = parseInt(parts[2], 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    throw new Error('Los valores de la fecha deben ser numéricos.');
  }

  if (year < 100) {
    year += 2000;
  }

  const d = new Date(year, month - 1, day);
  if (d.getDate() !== day || d.getMonth() !== month - 1 || d.getFullYear() !== year) {
    throw new Error('La fecha proporcionada no es una fecha válida en el calendario.');
  }

  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const dayName = days[d.getDay()];
  const pad = (n: number) => n.toString().padStart(2, '0');

  const formattedDay = pad(day);
  const formattedMonth = month.toString(); // no leading zero
  const formattedYear = year.toString().substring(2);

  return `${dayName} ${formattedDay}/${formattedMonth}/${formattedYear}`;
}

/**
 * Handler triggered by the "/reporte" or "/reportes" command.
 * Fetches and returns the consolidated activities for all units.
 */
export async function consolidationHandler(ctx: BotContext) {
  const user = getUserString(ctx);
  console.log(`[Bot] [Command] ${user} solicitó reporte consolidado.`);

  // Let the user know the bot is processing
  await ctx.replyWithChatAction('typing');

  try {
    const sheetsService = SheetsService.getInstance();
    
    let isShift1 = true;
    let shiftOverridden = false;
    let customDateStr: string | undefined = undefined;

    const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
    for (const arg of args) {
      const trimmed = arg.trim();
      if (trimmed.includes('/')) {
        try {
          customDateStr = parseUserQueryDate(trimmed);
        } catch (e: any) {
          throw new Error(`Fecha inválida "${trimmed}": ${e.message}`);
        }
      } else if (trimmed === '1' || trimmed.toLowerCase().includes('12') || trimmed.toLowerCase().includes('m')) {
        isShift1 = true;
        shiftOverridden = true;
      } else if (trimmed === '2' || trimmed.toLowerCase().includes('6') || trimmed.toLowerCase().includes('pm')) {
        isShift1 = false;
        shiftOverridden = true;
      }
    }

    if (!shiftOverridden) {
      // Evaluate active shift by default
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      const defaultShift = getShiftStatus(timeStr);
      isShift1 = defaultShift.isShift1;
    }

    console.log(`[Bot] [Command] Generando consolidado para Turno ${isShift1 ? '1 (Mañana)' : '2 (Tarde)'}${customDateStr ? ` de la fecha ${customDateStr}` : ''}`);

    const reportText = await sheetsService.getConsolidatedReport(isShift1, customDateStr);
    
    // Split the report into multiple messages if it exceeds Telegram's limit
    const chunks = splitMessage(reportText, 4000);
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
    console.log(`[Bot] [Command] Consolidado enviado con éxito a ${user}`);
  } catch (error: any) {
    console.error(`[Bot] [Command] [Error] al generar consolidado para ${user}:`, error.message || error);
    await ctx.reply(`❌ *Error al generar el consolidado:*\n${error.message || error}`, { parse_mode: 'Markdown' });
  }
}
