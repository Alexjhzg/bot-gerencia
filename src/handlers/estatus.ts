import { BotContext } from '../types/context';
import { SheetsService } from '../services/sheets';
import { getShiftStatus } from '../utils/shifts';
import { getUserString } from '../utils/report';

/**
 * Handler triggered by the "/estatus" command.
 * Shows which units have submitted reports and which are pending for the current shift.
 */
export async function estatusHandler(ctx: BotContext) {
  const user = getUserString(ctx);
  console.log(`[Bot] [Command] ${user} solicitó el estatus de reportes.`);

  // Let the user know the bot is processing
  await ctx.replyWithChatAction('typing');

  try {
    const sheetsService = SheetsService.getInstance();
    
    // Evaluate active shift
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const { isShift1 } = getShiftStatus(timeStr);

    const shiftName = isShift1 ? 'Mañana (12:00 M)' : 'Tarde (5:30 PM)';
    const { submitted, pending } = await sheetsService.getReportsStatus(isShift1);

    const total = submitted.length + pending.length;

    let responseMessage = `📊 *Estatus de Reportes - Turno: ${shiftName}*\n\n`;
    
    responseMessage += `✅ *Enviados (${submitted.length}/${total}):*\n`;
    if (submitted.length > 0) {
      responseMessage += submitted.map(name => `• ${name}`).join('\n') + '\n\n';
    } else {
      responseMessage += `_Ninguna unidad ha reportado aún._\n\n`;
    }

    responseMessage += `⏳ *Pendientes (${pending.length}/${total}):*\n`;
    if (pending.length > 0) {
      responseMessage += pending.map(name => `• ${name}`).join('\n') + '\n\n';
    } else {
      responseMessage += `_¡Todas las unidades han reportado! 🎉_\n\n`;
    }

    await ctx.reply(responseMessage, { parse_mode: 'Markdown' });
    console.log(`[Bot] [Command] Estatus enviado con éxito a ${user} (Enviados: ${submitted.length}, Pendientes: ${pending.length})`);
  } catch (error: any) {
    console.error(`[Bot] [Command] [Error] al obtener estatus para ${user}:`, error.message || error);
    await ctx.reply(`❌ *Error al obtener el estatus:* ${error.message || error}`);
  }
}
