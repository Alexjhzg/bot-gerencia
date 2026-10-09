import { BotContext } from '../types/context';
import { SheetsService } from '../services/sheets';
import { getUserString, escapeHtml } from '../utils/report';

/**
 * Handler triggered by the "/unidades" command.
 * Fetches and lists all authorized units from the Google Sheets matrix.
 */
export async function unidadesHandler(ctx: BotContext) {
  const user = getUserString(ctx);
  console.log(`[Bot] [Command] ${user} solicitó la lista de unidades.`);

  // Let the user know the bot is processing
  await ctx.replyWithChatAction('typing');

  try {
    const sheetsService = SheetsService.getInstance();
    const matrixDepts = await sheetsService.getMatrixDepartments();

    const filteredDepts = matrixDepts.filter((d) => 
      !d.name.toUpperCase().includes('CLIMATICA') && 
      !d.name.toUpperCase().includes('CLIMÁTICA') && 
      !d.name.toUpperCase().includes('NOVEDADES')
    );

    if (filteredDepts.length === 0) {
      throw new Error('No se encontraron unidades configuradas en la matriz.');
    }

    const listStr = filteredDepts.map((d) => `• <b>${escapeHtml(d.name)}</b>`).join('\n');
    const responseMessage = 
      `📋 <b>Unidades registradas en la matriz:</b>\n\n` +
      `${listStr}\n\n` +
      `💡 <i>Estas son las unidades oficiales válidas para los reportes diarios.</i>`;

    try {
      await ctx.reply(responseMessage, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply(responseMessage.replace(/<[^>]*>/g, ''));
    }
    console.log(`[Bot] [Command] Lista de unidades enviada con éxito a ${user}`);
  } catch (error: any) {
    console.error(`[Bot] [Command] [Error] al obtener lista de unidades para ${user}:`, error.message || error);
    try {
      await ctx.reply(`❌ <b>Error al obtener la lista de unidades:</b>\n${escapeHtml(error.message || String(error))}`, { parse_mode: 'HTML' });
    } catch {
      await ctx.reply(`❌ Error al obtener la lista de unidades:\n${error.message || error}`);
    }
  }
}
