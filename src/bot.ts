import { Bot } from 'grammy';
import { BotContext } from './types/context';
import { config } from './config';
import { reportHandler, consolidationHandler, unidadesHandler, estatusHandler } from './handlers';
import { getUserString } from './utils/report';

// Initialize the Bot with custom context
export const bot = new Bot<BotContext>(config.telegramToken);

// Middleware/Logger (Optional but helpful for debugging)
bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`[Bot] Update ID ${ctx.update.update_id} processed in ${ms}ms`);
});

// /start command explaining the usage of the bot
bot.command('start', async (ctx) => {
  const user = getUserString(ctx);
  console.log(`[Bot] [Command] ${user} inició el bot (/start).`);
  const instructions = 
    `👋 *¡Hola! Bienvenido al Bot de Reportes Diarios.*\n\n` +
    `Estoy listo para registrar tus actividades en Google Sheets. ` +
    `Para enviar tu reporte diario, por favor usa el siguiente formato exacto:\n\n` +
    `\`\`\`\n` +
    `Reporte diario\n` +
    `+ Nombre del Departamento\n` +
    `- Primera actividad del día\n` +
    `- Segunda actividad del día\n` +
    `- Tercera actividad del día...\n` +
    `\`\`\`\n\n` +
    `💡 *Recuerda:*\n` +
    `• La primera línea debe ser exactamente "Reporte diario" (insensible a mayúsculas).\n` +
    `• La segunda línea debe empezar con un signo de suma (+).\n` +
    `• Las actividades deben empezar con un guion (-).`;

  await ctx.reply(instructions, { parse_mode: 'Markdown' });
});

// Command to get the consolidated report for the active or specified shift
bot.command(['reporte', 'reportes'], consolidationHandler);

// Command to list all registered units in the matrix
bot.command('unidades', unidadesHandler);

// Command to check report submission status
bot.command('estatus', estatusHandler);

// Register the regex handler. Matches messages containing a line starting with "Reporte diario", "📌", or "+"
bot.hears(/^(reporte diario|📌|\+)/im, reportHandler);




// Robust centralized error handler (grammY's bot.catch)
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  const e = err.error;
  
  if (e instanceof Error) {
    console.error('Error stack:', e.stack);
  } else {
    console.error('Unknown error:', e);
  }
});
