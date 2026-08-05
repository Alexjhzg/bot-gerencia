import { getSheetsClient } from './client';
import { MATRIX_SHEET_NAME, formatMatrixDate, getColLetter } from './utils';
import { config } from '../../config';

/**
 * Writes activities to the matrix sheet 'Reportes_unificados' at the intersection of the department row and the current shift column.
 * If today's column block doesn't exist, it automatically creates it (both 12:00M and 5:00PM columns) and merges the date header.
 */
export async function writeMatrixReport(
  departmentRowIndex: number,
  isShift1: boolean,
  activities: string
): Promise<{ isOverwrite: boolean }> {
  try {
    const sheets = getSheetsClient();
    const spreadsheetId = config.sheetId;

    // 1. Fetch current header (Rows 1 & 2) to locate today's date column
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${MATRIX_SHEET_NAME}!A1:ZZ2`,
    });
    const rows = response.data.values || [];
    const dates = rows[0] || [];
    const shifts = rows[1] || [];

    const todayStr = formatMatrixDate(new Date());

    let targetColIndex = -1;
    const maxHeaderLen = Math.max(dates.length, shifts.length);
    // Scan existing columns starting from index 1 (Column B)
    for (let c = 1; c < maxHeaderLen; c++) {
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

    // 2. If column not found, append a new date column block (2 columns: 12:00M & 5:00PM)
    if (targetColIndex === -1) {
      console.log(`[SheetsService] Creating new date column block for: ${todayStr}`);
      const lastColIndex = Math.max(dates.length, shifts.length, 1); // Next available column index (at least index 1 / Column B)
      const col1Letter = getColLetter(lastColIndex);
      const col2Letter = getColLetter(lastColIndex + 1);

      // Get the sheetId and current columnCount of matrix sheet
      const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
      const targetSheet = sheetMetadata.data.sheets?.find((s: any) => s.properties?.title === MATRIX_SHEET_NAME);
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
        range: `${MATRIX_SHEET_NAME}!${col1Letter}1:${col2Letter}2`,
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
    const targetCell = `${MATRIX_SHEET_NAME}!${targetColLetter}${departmentRowIndex}`;

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
