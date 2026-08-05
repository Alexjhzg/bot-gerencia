import { getSheetsClient } from './client';
import {
  MATRIX_SHEET_NAME,
  formatMatrixDate,
  formatSpanishDateFromMatrix,
  getColLetter,
} from './utils';
import { config } from '../../config';

/**
 * Fetches the departments listed in Column A of the 'Reportes_unificados' matrix sheet, along with their row indices.
 */
export async function getMatrixDepartments(): Promise<{ name: string; rowIndex: number }[]> {
  try {
    const sheets = getSheetsClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.sheetId,
      range: `${MATRIX_SHEET_NAME}!A3:A50`,
    });
    const rows = response.data.values || [];
    return rows
      .map((r: any, index: number) => ({
        name: r[0]?.toString().trim() || '',
        rowIndex: index + 3, // A3 corresponds to Row 3 (1-indexed)
      }))
      .filter((item: any) => item.name !== '');
  } catch (error) {
    console.error('[SheetsService] Error fetching matrix departments:', error);
    return [];
  }
}

/**
 * Generates a formatted consolidation string for all activities of the given shift.
 * If customDateStr is provided, queries the sheet using that date string (e.g. 'MARTES 30/6/26').
 */
export async function getConsolidatedReport(isShift1: boolean, customDateStr?: string): Promise<string> {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = config.sheetId;

    // 1. Fetch current header to locate today's date column
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${MATRIX_SHEET_NAME}!A1:ZZ2`,
    });
    const headerRows = headerResponse.data.values || [];
    const dates = headerRows[0] || [];
    const shifts = headerRows[1] || [];

    // Determine search date string
    const searchDateStr = customDateStr ? customDateStr : formatMatrixDate(new Date());

    let targetColIndex = -1;
    const maxHeaderLen = Math.max(dates.length, shifts.length);
    // Scan existing columns to find match
    for (let c = 1; c < maxHeaderLen; c++) {
      let colDate = '';
      for (let idx = c; idx >= 1; idx--) {
        if (dates[idx]) {
          colDate = dates[idx].toString().trim();
          break;
        }
      }

      if (colDate.toUpperCase() === searchDateStr.toUpperCase()) {
        const colShift = (shifts[c]?.toString() || '').replace(/\s/g, '').toUpperCase();
        if (isShift1 && colShift === '12:00M') {
          targetColIndex = c;
          break;
        }
        if (!isShift1 && (colShift === '5:00PM' || colShift === '6:00PM')) {
          targetColIndex = c;
          break;
        }
      }
    }

    if (targetColIndex === -1) {
      const formattedShiftName = isShift1 ? '12:00M' : '5:00 PM';
      const displayDate = customDateStr ? customDateStr : 'de hoy';
      throw new Error(`No se han encontrado registros en la matriz para el Turno ${formattedShiftName} del día ${displayDate}.`);
    }

    // 2. Fetch all rows of departments in this range
    const targetColLetter = getColLetter(targetColIndex);
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${MATRIX_SHEET_NAME}!A3:${targetColLetter}50`,
    });

    const dataRows = dataResponse.data.values || [];
    
    // 3. Format consolidation
    let actualDateHeader = '';
    for (let idx = targetColIndex; idx >= 1; idx--) {
      if (dates[idx]) {
        actualDateHeader = dates[idx].toString().trim();
        break;
      }
    }

    const spanishDateStr = formatSpanishDateFromMatrix(actualDateHeader || searchDateStr);
    const shiftHeader = isShift1 ? '1ER REPORTE 12:00M' : '2DO REPORTE 5:00PM';

    let reportLines: string[] = [
      '*MONAGAS*',
      '',
      `*${spanishDateStr}*`,
      '',
      `*${shiftHeader}*`,
      ''
    ];

    let climaText = '';
    let novedadesText = '';

    for (const row of dataRows) {
      const deptName = row[0]?.toString().trim() || '';
      const activities = row[targetColIndex]?.toString().trim() || '';

      if (!deptName) continue;

      // Special rows handling
      if (deptName.toUpperCase().includes('CLIMATICA') || deptName.toUpperCase().includes('CLIMÁTICA')) {
        if (activities) {
          climaText = activities.replace(/^[-*•▪️▪▫]\s*/gm, '');
        }
        continue;
      }
      if (deptName.toUpperCase().includes('NOVEDADES')) {
        if (activities) {
          novedadesText = activities.replace(/^[-*•▪️▪▫]\s*/gm, '');
        }
        continue;
      }

      // Standard departments
      if (activities) {
        const formattedDeptName = deptName.toUpperCase();
        const formattedActivities = activities.replace(/^[-*•▪▫]\s*/gm, '▪️ ');

        reportLines.push(`📌 *${formattedDeptName}*`);
        reportLines.push(formattedActivities);
        reportLines.push(''); // spacing line
      }
    }

    // Always append climate section
    reportLines.push(`*SITUACIÓN CLIMÁTICA:* ${climaText || 'Sin reporte'}`);
    reportLines.push('');

    if (novedadesText) {
      reportLines.push(`*NOVEDADES:* ${novedadesText}`);
      reportLines.push('');
    }

    return reportLines.join('\n').trim();
  } catch (error: any) {
    if (error.message && error.message.includes('No se han encontrado registros')) {
      console.warn(`[SheetsService] ${error.message}`);
    } else {
      console.error('[SheetsService] Error getting consolidated report:', error);
    }
    throw error;
  }
}

/**
 * Returns which units have submitted reports and which are pending for a given shift.
 */
export async function getReportsStatus(isShift1: boolean): Promise<{ submitted: string[]; pending: string[] }> {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = config.sheetId;

    // 1. Fetch current header to locate today's date column
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${MATRIX_SHEET_NAME}!A1:ZZ2`,
    });
    const headerRows = headerResponse.data.values || [];
    const dates = headerRows[0] || [];
    const shifts = headerRows[1] || [];

    const searchDateStr = formatMatrixDate(new Date());

    let targetColIndex = -1;
    const maxHeaderLen = Math.max(dates.length, shifts.length);
    for (let c = 1; c < maxHeaderLen; c++) {
      let colDate = '';
      for (let idx = c; idx >= 1; idx--) {
        if (dates[idx]) {
          colDate = dates[idx].toString().trim();
          break;
        }
      }

      if (colDate.toUpperCase() === searchDateStr.toUpperCase()) {
        const colShift = (shifts[c]?.toString() || '').replace(/\s/g, '').toUpperCase();
        if (isShift1 && colShift === '12:00M') {
          targetColIndex = c;
          break;
        }
        if (!isShift1 && (colShift === '5:00PM' || colShift === '6:00PM')) {
          targetColIndex = c;
          break;
        }
      }
    }

    // If column not found, it means no reports have been registered for this shift at all yet
    if (targetColIndex === -1) {
      const matrixDepts = await getMatrixDepartments();
      const pending = matrixDepts
        .map(d => d.name)
        .filter(name => 
          !name.toUpperCase().includes('CLIMATICA') && 
          !name.toUpperCase().includes('CLIMÁTICA') && 
          !name.toUpperCase().includes('NOVEDADES')
        );
      return { submitted: [], pending };
    }

    // 2. Fetch rows in the range
    const targetColLetter = getColLetter(targetColIndex);
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${MATRIX_SHEET_NAME}!A3:${targetColLetter}50`,
    });

    const dataRows = dataResponse.data.values || [];
    const submitted: string[] = [];
    const pending: string[] = [];

    for (const row of dataRows) {
      const deptName = row[0]?.toString().trim() || '';
      if (!deptName) continue;

      if (
        deptName.toUpperCase().includes('CLIMATICA') ||
        deptName.toUpperCase().includes('CLIMÁTICA') ||
        deptName.toUpperCase().includes('NOVEDADES')
      ) {
        continue;
      }

      const activities = row[targetColIndex]?.toString().trim() || '';
      if (activities) {
        submitted.push(deptName);
      } else {
        pending.push(deptName);
      }
    }

    return { submitted, pending };
  } catch (error) {
    console.error('[SheetsService] Error getting reports status:', error);
    throw error;
  }
}
