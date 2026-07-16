import { BotContext } from '../types/context';

export interface ParsedReport {
  department: string;
  activities: string;
}

/**
 * Parses the incoming text message to extract multiple department reports.
 * Supports headers like "+ Department" or "📌Unidad: Department".
 * Supports activities prefixed by "-", "*", "•", "▪️", "▪", "▫", etc.
 */
export function parseReportMessage(text: string): ParsedReport[] {
  const lines = text.split(/\r?\n/).map(line => line.trim());
  const reports: ParsedReport[] = [];
  
  let currentDept: string | null = null;
  let currentActivities: string[] = [];

  const saveCurrentReport = () => {
    if (currentDept && currentActivities.length > 0) {
      reports.push({
        department: currentDept,
        activities: currentActivities.join('\n')
      });
    }
  };

  for (const line of lines) {
    if (line === '') continue;

    // Detect Department Header
    let matchedDept: string | null = null;
    if (line.startsWith('+')) {
      const cleaned = line.substring(1).trim();
      if (cleaned !== '') {
        matchedDept = cleaned;
      }
    } else if (line.startsWith('📌')) {
      const cleaned = line.substring(2).replace(/^\s*:\s*/, '').trim();
      if (cleaned !== '') {
        matchedDept = cleaned;
      }
    }

    if (matchedDept !== null) {
      // Save previously compiled report
      saveCurrentReport();
      currentDept = matchedDept;
      currentActivities = [];
      continue;
    }

    // Detect Activity Bullet (supports normal bullets, stars, and various squares)
    const bulletRegex = /^[-*•▪️▪▫\u25AA\uFE0F\u25FC\u25FD\u25FE\u25FF\u2B1B\u2B1C\u2B1D\u2B1E]/u;
    if (bulletRegex.test(line)) {
      const activityText = line
        .replace(/^[-*•▪️▪▫\u25AA\uFE0F\u25FC\u25FD\u25FE\u25FF\u2B1B\u2B1C\u2B1D\u2B1E\s]+/u, '')
        .trim();
      if (currentDept && activityText) {
        currentActivities.push(activityText);
      }
    }
  }

  // Save the last report in progress
  saveCurrentReport();

  if (reports.length === 0) {
    throw new Error(
      'No se encontraron reportes válidos.\n\n' +
      'Asegúrate de indicar las unidades usando `+ Nombre` o `📌 Nombre`,\n' +
      'y las actividades correspondientes iniciadas por un guion (-) o un cuadro (▪️).'
    );
  }

  return reports;
}

/**
 * Formats user identifiers to display name and handle if available
 */
export function getUserString(ctx: BotContext): string {
  const from = ctx.from;
  if (!from) return 'Usuario Desconocido';
  
  const fullName = [from.first_name, from.last_name].filter(Boolean).join(' ');
  const username = from.username ? `@${from.username}` : '';
  const userId = `[ID: ${from.id}]`;

  return username ? `${fullName} (${username}) ${userId}` : `${fullName} ${userId}`;
}

/**
 * Gets current timestamp formatted as YYYY-MM-DD HH:mm:ss in localized string
 */
export function getFormattedDate(): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Helper to normalize strings (lowercased, trimmed, and diacritics/accents removed)
 */
export function normalizeText(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Helper to split a long message into multiple line-safe chunks
 * to avoid Telegram API 400 Bad Request error (message is too long).
 */
export function splitMessage(text: string, limit: number = 4000): string[] {
  if (text.length <= limit) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';
  const lines = text.split('\n');

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > limit) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      if (line.length > limit) {
        let tempLine = line;
        while (tempLine.length > limit) {
          chunks.push(tempLine.substring(0, limit));
          tempLine = tempLine.substring(limit);
        }
        currentChunk = tempLine;
      } else {
        currentChunk = line;
      }
    } else {
      if (currentChunk) {
        currentChunk += '\n' + line;
      } else {
        currentChunk = line;
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}
