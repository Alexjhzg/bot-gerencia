import { BotContext } from '../types/context';
import { SheetsService } from '../services/sheets';
import { getShiftStatus } from '../utils/shifts';
import { getUserString, escapeHtml } from '../utils/report';

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

    let responseMessage = `📊 <b>Estatus de Reportes - Turno: ${escapeHtml(shiftName)}</b>\n\n`;
    
    responseMessage += `✅ <b>Enviados (${submitted.length}/${total}):</b>\n`;
    if (submitted.length > 0) {
      responseMessage += submitted.map(name => `• ${escapeHtml(name)}`).join('\n') + '\n\n';
    } else {
      responseMessage += `<i>Ninguna unidad ha reportado aún.</i>\n\n`;
    }

    responseMessage += `⏳ <b>Pendientes (${pending.length}/${total}):</b>\n`;
    if (pending.length > 0) {
      responseMessage += pending.map(name => `• ${escapeHtml(name)}`).join('\n') + '\n\n';
    } else {
      responseMessage += `<i>¡Todas las unidades han reportado! 🎉</i>\n\n`;
    }

    try {
      await ctx.reply(responseMessage, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply(responseMessage.replace(/<[^>]*>/g, ''));
    }
    console.log(`[Bot] [Command] Estatus enviado con éxito a ${user} (Enviados: ${submitted.length}, Pendientes: ${pending.length})`);
  } catch (error: any) {
    console.error(`[Bot] [Command] [Error] al obtener estatus para ${user}:`, error.message || error);
    try {
      await ctx.reply(`❌ <b>Error al obtener el estatus:</b> ${escapeHtml(error.message || String(error))}`, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply(`❌ Error al obtener el estatus: ${error.message || error}`);
    }
  }
}
