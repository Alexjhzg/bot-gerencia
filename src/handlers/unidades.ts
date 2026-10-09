import { BotContext } from '../types/context';
import { SheetsService } from '../services/sheets';
import { getUserString, escapeHtml } from '../utils/report';
import { getUnitLimit } from '../utils/limits';

/**
 * Handler triggered by the "/unidades" command.
 * Fetches and lists all authorized units from the Google Sheets matrix along with their character limits.
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

    const listStr = filteredDepts.map((d) => {
      const cfg = getUnitLimit(d.name);
      return `• <b>${escapeHtml(d.name)}</b> <i>(Máx. ${cfg.maxChars.toLocaleString()} car.)</i>`;
    }).join('\n');

    const responseMessage = 
      `📋 <b>Unidades autorizadas y límites de caracteres:</b>\n\n` +
      `${listStr}\n\n` +
      `💡 <i>Estos límites garantizan que el reporte consolidado viaje íntegro en un solo mensaje de Telegram.</i>`;

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
