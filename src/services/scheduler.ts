import cron from 'node-cron';
import { bot } from '../bot';
import { config } from '../config';
import { SheetsService } from './sheets';
import { splitMessage } from '../utils/report';

/**
 * Helper to send a message with automatic retry logic for transient network issues.
 */
async function sendMessageWithRetry(chatId: string, text: string, maxRetries = 3, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await bot.api.sendMessage(chatId, text, { parse_mode: 'Markdown' });
      return;
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(
        `[Scheduler] Intento ${attempt}/${maxRetries} fallido enviando reporte a ${chatId}. Reintentando en ${delayMs / 1000}s... Error: ${error.message || error}`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Fetches the consolidated report for the specified shift and sends it to the manager.
 */
export async function sendConsolidatedToManager(isShift1: boolean) {
  const managerChatIds = config.managerChatIds;
  if (!managerChatIds || managerChatIds.length === 0) {
    console.warn('[Scheduler] No MANAGER_CHAT_ID configured. Skipping consolidated report send.');
    return;
  }

  const shiftLabel = isShift1 ? '12:30M' : '5:30 PM';
  console.log(`[Scheduler] Generating automatic consolidated report for Shift ${shiftLabel} to send to Manager(s) (Chat IDs: ${managerChatIds.join(', ')})...`);

  try {
    const sheetsService = SheetsService.getInstance();
    const reportText = await sheetsService.getConsolidatedReport(isShift1);

    const chunks = splitMessage(reportText, 4000);
    for (const chatId of managerChatIds) {
      for (const chunk of chunks) {
        await sendMessageWithRetry(chatId, chunk);
      }
      console.log(`[Scheduler] Consolidated report for Shift ${shiftLabel} sent successfully to manager (${chatId}).`);
    }
  } catch (error: any) {
    if (error.message && error.message.includes('No se han encontrado registros')) {
      console.log(`[Scheduler] Shift ${shiftLabel}: No records found to consolidate. Skipping.`);
    } else {
      console.error(`[Scheduler] Failed to send consolidated report for Shift ${shiftLabel}:`, error);
    }
  }
}

/**
 * Starts the automated cron job scheduler.
 */
export function startScheduler() {
  console.log('[Scheduler] Initializing automated report scheduler...');

  // Shift 1: Daily at 12:31 PM (1 minute after 12:30 PM cutoff)
  cron.schedule('31 12 * * *', () => {
    sendConsolidatedToManager(true);
  });

  // Shift 2: Daily at 5:30 PM
  cron.schedule('30 17 * * *', () => {
    sendConsolidatedToManager(false);
  });

  console.log('[Scheduler] Cron jobs scheduled for 12:31 PM and 5:30 PM daily.');
}
