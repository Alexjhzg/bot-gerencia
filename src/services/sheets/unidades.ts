import { getSheetsClient } from './client';
import { DEFAULT_DEPARTMENTS } from './utils';
import { config } from '../../config';

/**
 * Ensures that the 'Unidades' configuration sheet exists.
 * If it doesn't exist, it creates it and loads the default units list.
 */
export async function ensureUnidadesSheet(sheets?: any): Promise<void> {
  const sheetsClient = sheets || getSheetsClient();
  try {
    const spreadsheet = await sheetsClient.spreadsheets.get({
      spreadsheetId: config.sheetId,
    });
    const sheetsList = spreadsheet.data.sheets || [];
    const hasDeptSheet = sheetsList.some((s: any) => s.properties?.title === 'Unidades');

    if (!hasDeptSheet) {
      console.log('[SheetsService] "Unidades" sheet not found. Creating it...');
      await sheetsClient.spreadsheets.batchUpdate({
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

      await sheetsClient.spreadsheets.values.update({
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
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: config.sheetId,
        range: 'Unidades!A2:A2',
      });
      if (!response.data.values || response.data.values.length === 0) {
        console.log('[SheetsService] "Unidades" sheet is empty. Loading defaults...');
        const defaultValues = DEFAULT_DEPARTMENTS.map((dept) => [dept]);
        await sheetsClient.spreadsheets.values.update({
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
export async function getAuthorizedDepartments(): Promise<string[]> {
  try {
    const sheetsClient = getSheetsClient();
    await ensureUnidadesSheet(sheetsClient);

    const response = await sheetsClient.spreadsheets.values.get({
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
