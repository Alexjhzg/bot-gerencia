import cron from 'node-cron';
import { bot } from '../bot';
import { config } from '../config';
import { SheetsService } from './sheets';
import { splitMessage } from '../utils/report';

/**
 * Fetches the consolidated report for the specified shift and sends it to the manager.
 */
export async function sendConsolidatedToManager(isShift1: boolean) {
  const managerChatId = config.managerChatId;
  if (!managerChatId) {
    console.warn('[Scheduler] No MANAGER_CHAT_ID configured. Skipping consolidated report send.');
    return;
  }

  const shiftLabel = isShift1 ? '12:00M' : '5:00 PM';
  console.log(`[Scheduler] Generating automatic consolidated report for Shift ${shiftLabel} to send to Manager (Chat ID: ${managerChatId})...`);

  try {
    const sheetsService = SheetsService.getInstance();
    const reportText = await sheetsService.getConsolidatedReport(isShift1);

    const chunks = splitMessage(reportText, 4000);
    for (const chunk of chunks) {
      await bot.api.sendMessage(managerChatId, chunk);
    }
    console.log(`[Scheduler] Consolidated report for Shift ${shiftLabel} sent successfully to manager.`);
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

  // Shift 1: Daily at 12:01 PM (1 minute after 12:00 PM cutoff)
  cron.schedule('01 12 * * *', () => {
    sendConsolidatedToManager(true);
  });

  // Shift 2: Daily at 5:01 PM (1 minute after 5:00 PM / 17:00 cutoff)
  cron.schedule('01 17 * * *', () => {
    sendConsolidatedToManager(false);
  });

  console.log('[Scheduler] Cron jobs scheduled for 12:01 PM and 5:01 PM daily.');
}
