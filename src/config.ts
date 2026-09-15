import dotenv from 'dotenv';
import path from 'path';

// Load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

// Fallback to Venezuela timezone if TZ is not defined in the environment
process.env.TZ = process.env.TZ || 'America/Caracas';

export interface Config {
  telegramToken: string;
  sheetId: string;
  sheetRange: string;
  googleEmail: string;
  googlePrivateKey: string;
  shift1Limit: string; // e.g. "12:30"
  shift2Limit: string; // e.g. "17:00"
  managerChatIds: string[];
}

function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`CRITICAL CONFIG ERROR: Environment variable "${key}" is required but not set.`);
  }
  return value.trim();
}

// Extract and format the private key to handle linebreaks properly
function getPrivateKey(): string {
  const rawKey = getEnvOrThrow('GOOGLE_PRIVATE_KEY');
  return rawKey.replace(/\\n/g, '\n');
}

function parseChatIds(envVal?: string): string[] {
  if (!envVal) return [];
  return envVal.split(',').map((id) => id.trim()).filter(Boolean);
}

export const config: Config = {
  telegramToken: getEnvOrThrow('TELEGRAM_BOT_TOKEN'),
  sheetId: getEnvOrThrow('GOOGLE_SHEET_ID'),
  sheetRange: process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:D',
  googleEmail: getEnvOrThrow('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
  googlePrivateKey: getPrivateKey(),
  shift1Limit: process.env.SHIFT_1_LIMIT || '12:30',
  shift2Limit: process.env.SHIFT_2_LIMIT || '17:30',
  managerChatIds: Array.from(
    new Set([
      ...parseChatIds(process.env.MANAGER_CHAT_ID),
      ...parseChatIds(process.env.ACTING_MANAGER_CHAT_ID),
    ])
  ),
};

