import { google } from 'googleapis';
import { config } from '../config';

export interface ReportRow {
  date: string;
  user: string;
  department: string;
  activities: string;
}

export const DEFAULT_DEPARTMENTS = [
  'Gerencia',
  'Administración',
  'Coordinación SEEM',
  'Coodinación de Programas Estadísticos',
  'Control y Seguimiento',
  'SEGEN',
  'Económica',
  'Sociales',
  'Demográfica',
  'Cartografía',
  'Soporte y Desarrollo Tecnológico',
  'Capacitación',
  'Productos Estadísticos',
  'Prensa',
  'Enlace de RRHH'
];

export class SheetsService {
  private static instance: SheetsService;
  private authClient: any;

  private constructor() {
    this.initAuth();
  }

  /**
   * Singleton pattern to prevent re-initializing authentication on every request.
   */
  public static getInstance(): SheetsService {
    if (!SheetsService.instance) {
      SheetsService.instance = new SheetsService();
    }
    return SheetsService.instance;
  }

  /**
   * Initializes JWT authentication client with Google Sheets scope.
   */
  private initAuth() {
    try {
      this.authClient = new google.auth.JWT(
        config.googleEmail,
        undefined,
        config.googlePrivateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
    } catch (error) {
      console.error('Failed to initialize Google Auth JWT client:', error);
      throw error;
    }
  }

  /**
   * Ensures that the 'Unidades' configuration sheet exists.
   * If it doesn't exist, it creates it and loads the default units list.
   */
  public async ensureUnidadesSheet(sheets: any): Promise<void> {
    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: config.sheetId,
      });
      const sheetsList = spreadsheet.data.sheets || [];
      const hasDeptSheet = sheetsList.some((s: any) => s.properties?.title === 'Unidades');

      if (!hasDeptSheet) {
        console.log('[SheetsService] "Unidades" sheet not found. Creating it...');
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: config.sheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: 'Unidades',
                  },
                },
              },
            ],
          },
        });

        // Write header and default departments
        const defaultValues = [
          ['Unidades Autorizadas'],
          ...DEFAULT_DEPARTMENTS.map((dept) => [dept]),
        ];

        await sheets.spreadsheets.values.update({
          spreadsheetId: config.sheetId,
          range: 'Unidades!A1:A100',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: defaultValues,
          },
        });
        console.log('[SheetsService] Created "Unidades" sheet and loaded defaults.');
      } else {
        // If sheet exists, check if A2 is populated. If empty, load defaults.
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: config.sheetId,
          range: 'Unidades!A2:A2',
        });
        if (!response.data.values || response.data.values.length === 0) {
          console.log('[SheetsService] "Unidades" sheet is empty. Loading defaults...');
          const defaultValues = DEFAULT_DEPARTMENTS.map((dept) => [dept]);
          await sheets.spreadsheets.values.update({
            spreadsheetId: config.sheetId,
            range: 'Unidades!A2:A100',
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: defaultValues,
            },
          });
        }
      }
    } catch (error) {
      console.error('[SheetsService] Error ensuring "Unidades" sheet:', error);
    }
  }

  /**
   * Fetches the list of authorized departments from Google Sheets.
   */
  public async getAuthorizedDepartments(): Promise<string[]> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.authClient });
      await this.ensureUnidadesSheet(sheets);

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.sheetId,
        range: 'Unidades!A2:A200',
      });

      if (response.data.values && response.data.values.length > 0) {
        return response.data.values
          .map((row: any) => row[0]?.toString().trim())
          .filter(Boolean);
      }
      return DEFAULT_DEPARTMENTS;
    } catch (error) {
      console.error('[SheetsService] Error getting authorized departments:', error);
      return DEFAULT_DEPARTMENTS;
    }
  }

  /**
   * Fetches the departments listed in Column A of the 'Reportes' matrix sheet, along with their row indices.
   */
  public async getMatrixDepartments(): Promise<{ name: string; rowIndex: number }[]> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.authClient });
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: config.sheetId,
        range: 'Reportes!A3:A50',
      });
      const rows = response.data.values || [];
      return rows
        .map((r, index) => ({
          name: r[0]?.toString().trim() || '',
          rowIndex: index + 3, // A3 corresponds to Row 3 (1-indexed)
        }))
        .filter(item => item.name !== '');
    } catch (error) {
      console.error('[SheetsService] Error fetching matrix departments:', error);
      return [];
    }
  }

  /**
   * Writes activities to the matrix sheet 'Reportes' at the intersection of the department row and the current shift column.
   * If today's column block doesn't exist, it automatically creates it (both 12:00M and 6:00PM columns) and merges the date header.
   */
  public async writeMatrixReport(
    departmentRowIndex: number,
    isShift1: boolean,
    activities: string
  ): Promise<{ isOverwrite: boolean }> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.authClient });
      const spreadsheetId = config.sheetId;

      // 1. Fetch current header (Rows 1 & 2) to locate today's date column
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Reportes!A1:ZZ2',
      });
      const rows = response.data.values || [];
      const dates = rows[0] || [];
      const shifts = rows[1] || [];

      const todayStr = this.formatMatrixDate(new Date());

      // Helper to convert index to letter (e.g. 0 -> A, 1 -> B, etc.)
      const getColLetter = (index: number) => {
        let letter = '';
        let temp = index;
        while (temp >= 0) {
          letter = String.fromCharCode((temp % 26) + 65) + letter;
          temp = Math.floor(temp / 26) - 1;
        }
        return letter;
      };

      let targetColIndex = -1;
      // Scan existing columns starting from index 1 (Column B)
      for (let c = 1; c < shifts.length; c++) {
        let colDate = '';
        for (let idx = c; idx >= 1; idx--) {
          if (dates[idx]) {
            colDate = dates[idx].toString().trim();
            break;
          }
        }

        if (colDate.toUpperCase() === todayStr.toUpperCase()) {
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

      // 2. If column not found, append a new date column block (2 columns: 12:00M & 6:00PM)
      if (targetColIndex === -1) {
        console.log(`[SheetsService] Creating new date column block for: ${todayStr}`);
        const lastColIndex = shifts.length; // Next available column index
        const col1Letter = getColLetter(lastColIndex);
        const col2Letter = getColLetter(lastColIndex + 1);

        // Get the sheetId and current columnCount of 'Reportes'
        const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
        const targetSheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === 'Reportes');
        const sheetId = targetSheet?.properties?.sheetId!;
        const currentColumnCount = targetSheet?.properties?.gridProperties?.columnCount || 26;

        // Check if we need to resize the sheet columns count to avoid grid limits error
        if (lastColIndex + 2 > currentColumnCount) {
          const newColumnCount = lastColIndex + 2;
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [
                {
                  updateSheetProperties: {
                    properties: {
                      sheetId,
                      gridProperties: {
                        columnCount: newColumnCount
                      }
                    },
                    fields: 'gridProperties.columnCount'
                  }
                }
              ]
            }
          });
          console.log(`[SheetsService] Dynamically expanded grid limit to ${newColumnCount} columns.`);
        }

        // Write the header values: Today's Date in Row 1, Shifts in Row 2
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `Reportes!${col1Letter}1:${col2Letter}2`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [
              [todayStr, ''],
              ['12:00M', '5:00PM']
            ]
          }
        });

        // Merge the date cell in Row 1
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                mergeCells: {
                  range: {
                    sheetId,
                    startRowIndex: 0,
                    endRowIndex: 1,
                    startColumnIndex: lastColIndex,
                    endColumnIndex: lastColIndex + 2
                  },
                  mergeType: 'MERGE_ALL'
                }
              }
            ]
          }
        });

        targetColIndex = isShift1 ? lastColIndex : lastColIndex + 1;
      }

      // 3. Write activities to the target cell (intersection)
      const targetColLetter = getColLetter(targetColIndex);
      const targetCell = `Reportes!${targetColLetter}${departmentRowIndex}`;

      // Check if the cell already contains data (to determine if it's an overwrite)
      let isOverwrite = false;
      try {
        const cellData = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: targetCell,
        });
        const cellVal = cellData.data.values?.[0]?.[0];
        isOverwrite = !!(cellVal && cellVal.toString().trim() !== '');
      } catch (err) {
        console.warn('[SheetsService] Could not read target cell value, assuming new write:', err);
      }

      // Update the cell
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: targetCell,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[activities]]
        }
      });

      return { isOverwrite };
    } catch (error: any) {
      console.error('[SheetsService] Error writing matrix report:', error);
      throw new Error(`Google Sheets API Matrix Error: ${error.message || error}`);
    }
  }

  /**
   * Helper to format a Date object as: "WEEKDAY DD/M/YY" (no leading zero on month)
   */
  private formatMatrixDate(d: Date): string {
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const dayName = days[d.getDay()];
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(d.getDate());
    const month = (d.getMonth() + 1).toString(); // No leading zero
    const year = d.getFullYear().toString().substring(2); // 2-digit year
    return `${dayName} ${day}/${month}/${year}`;
  }

  /**
   * Generates a formatted consolidation string for all activities of the given shift.
   * If customDateStr is provided, queries the sheet using that date string (e.g. 'MARTES 30/6/26').
   */
  public async getConsolidatedReport(isShift1: boolean, customDateStr?: string): Promise<string> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.authClient });
      const spreadsheetId = config.sheetId;

      // 1. Fetch current header to locate today's date column
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Reportes!A1:ZZ2',
      });
      const headerRows = headerResponse.data.values || [];
      const dates = headerRows[0] || [];
      const shifts = headerRows[1] || [];

      // Determine search date string
      const searchDateStr = customDateStr ? customDateStr : this.formatMatrixDate(new Date());

      // Helper to convert index to letter
      const getColLetter = (index: number) => {
        let letter = '';
        let temp = index;
        while (temp >= 0) {
          letter = String.fromCharCode((temp % 26) + 65) + letter;
          temp = Math.floor(temp / 26) - 1;
        }
        return letter;
      };

      let targetColIndex = -1;
      // Scan existing columns to find match
      for (let c = 1; c < shifts.length; c++) {
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
        range: `Reportes!A3:${targetColLetter}20`,
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

      const spanishDateStr = this.formatSpanishDateFromMatrix(actualDateHeader || searchDateStr);
      const shiftHeader = isShift1 ? '1ER REPORTE 12:00M' : '2DO REPORTE 5:00PM';

      let reportLines: string[] = [
        'MONAGAS',
        '',
        spanishDateStr,
        '',
        shiftHeader,
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
            // Strip leading bullet point for clean representation
            climaText = activities.replace(/^•\s*/gm, '');
          }
          continue;
        }
        if (deptName.toUpperCase().includes('NOVEDADES')) {
          if (activities) {
            // Strip leading bullet point for clean representation
            novedadesText = activities.replace(/^•\s*/gm, '');
          }
          continue;
        }

        // Standard departments
        if (activities) {
          // Format department title to match user format
          const formattedDeptName = deptName
            .toLowerCase()
            .split(' ')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          reportLines.push(`📌 ${formattedDeptName}`);
          reportLines.push(activities);
          reportLines.push(''); // spacing line
        }
      }

      // Always append climate section
      reportLines.push(`SITUACIÓN CLIMÁTICA: ${climaText || 'Sin reporte'}`);
      reportLines.push('');

      if (novedadesText) {
        reportLines.push(`NOVEDADES: ${novedadesText}`);
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
   * Helper to format Date as "Weekday DD/MM/YYYY" from matrix header string (e.g. MARTES 30/6/26)
   */
  private formatSpanishDateFromMatrix(matrixDate: string): string {
    const parts = matrixDate.split(' ');
    if (parts.length < 2) return matrixDate;
    const dayName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
    const dateParts = parts[1].split('/');
    if (dateParts.length !== 3) return matrixDate;
    const day = dateParts[0].padStart(2, '0');
    const month = dateParts[1].padStart(2, '0');
    const year = '20' + dateParts[2];
    return `${dayName} ${day}/${month}/${year}`;
  }

  // Backwards compatibility stub (optional but preserved)
  public async appendReport(row: ReportRow): Promise<void> {
    const sheets = google.sheets({ version: 'v4', auth: this.authClient });
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

  // Backwards compatibility stub (optional but preserved)
  public async findReportRowByDept(department: string, dateStr: string, isShift1: boolean): Promise<number> {
    return -1;
  }

  // Backwards compatibility stub (optional but preserved)
  public async updateReportRow(rowNumber: number, row: ReportRow): Promise<void> {
    // No-op for compatibility
  }

  /**
   * Returns which units have submitted reports and which are pending for a given shift.
   */
  public async getReportsStatus(isShift1: boolean): Promise<{ submitted: string[]; pending: string[] }> {
    try {
      const sheets = google.sheets({ version: 'v4', auth: this.authClient });
      const spreadsheetId = config.sheetId;

      // 1. Fetch current header to locate today's date column
      const headerResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Reportes!A1:ZZ2',
      });
      const headerRows = headerResponse.data.values || [];
      const dates = headerRows[0] || [];
      const shifts = headerRows[1] || [];

      const searchDateStr = this.formatMatrixDate(new Date());

      const getColLetter = (index: number) => {
        let letter = '';
        let temp = index;
        while (temp >= 0) {
          letter = String.fromCharCode((temp % 26) + 65) + letter;
          temp = Math.floor(temp / 26) - 1;
        }
        return letter;
      };

      let targetColIndex = -1;
      for (let c = 1; c < shifts.length; c++) {
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
        const matrixDepts = await this.getMatrixDepartments();
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
        range: `Reportes!A3:${targetColLetter}50`,
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
}
