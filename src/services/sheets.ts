import { getSheetsClient } from './sheets/client';
import { ensureUnidadesSheet, getAuthorizedDepartments } from './sheets/unidades';
import { writeMatrixReport } from './sheets/matrix-writer';
import { getMatrixDepartments, getConsolidatedReport, getReportsStatus } from './sheets/matrix-reader';
import { MATRIX_SHEET_NAME, DEFAULT_DEPARTMENTS } from './sheets/utils';
import { config } from '../config';

export interface ReportRow {
  date: string;
  user: string;
  department: string;
  activities: string;
}

export { MATRIX_SHEET_NAME, DEFAULT_DEPARTMENTS };

/**
 * Facade class for Google Sheets integration.
 * Delegates specialized operations to dedicated sub-modules under `src/services/sheets/`.
 */
export class SheetsService {
  private static instance: SheetsService;

  private constructor() {}

  /**
   * Singleton pattern to prevent re-initializing authentication on every request.
   */
  public static getInstance(): SheetsService {
    if (!SheetsService.instance) {
      SheetsService.instance = new SheetsService();
    }
    return SheetsService.instance;
  }

  public async ensureUnidadesSheet(sheets?: any): Promise<void> {
    return ensureUnidadesSheet(sheets);
  }

  public async getAuthorizedDepartments(): Promise<string[]> {
    return getAuthorizedDepartments();
  }

  public async getMatrixDepartments(): Promise<{ name: string; rowIndex: number }[]> {
    return getMatrixDepartments();
  }

  public async writeMatrixReport(
    departmentRowIndex: number,
    isShift1: boolean,
    activities: string
  ): Promise<{ isOverwrite: boolean }> {
    return writeMatrixReport(departmentRowIndex, isShift1, activities);
  }

  public async getConsolidatedReport(isShift1: boolean, customDateStr?: string): Promise<string> {
    return getConsolidatedReport(isShift1, customDateStr);
  }

  public async getReportsStatus(isShift1: boolean): Promise<{ submitted: string[]; pending: string[] }> {
    return getReportsStatus(isShift1);
  }

  // Backwards compatibility stubs (optional but preserved)
  public async appendReport(row: ReportRow): Promise<void> {
    const sheets = getSheetsClient();
    const rangeParts = config.sheetRange.split('!');
    const sheetName = rangeParts[0] || 'Sheet1';
    const values = [[row.date, row.user, row.department, row.activities]];
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.sheetId,
      range: `${sheetName}!A:D`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values },
    });
  }

  public async findReportRowByDept(department: string, dateStr: string, isShift1: boolean): Promise<number> {
    return -1;
  }

  public async updateReportRow(rowNumber: number, row: ReportRow): Promise<void> {
    // No-op for compatibility
  }
}
