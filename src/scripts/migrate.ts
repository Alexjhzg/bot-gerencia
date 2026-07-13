import { google } from 'googleapis';
import * as XLSX from 'xlsx';
import { config } from '../config';

async function main() {
  console.log('[Migration] Loading Excel file: "REPORTES DIARIO INE.xlsx"...');
  
  // 1. Load the Excel file and get the first sheet
  const workbook = XLSX.readFile('REPORTES DIARIO INE.xlsx');
  const excelSheetName = workbook.SheetNames[0]; // 'Reportes'
  console.log(`[Migration] Found sheet: "${excelSheetName}"`);
  
  const sheet = workbook.Sheets[excelSheetName];
  const merges = sheet['!merges'] || [];
  
  // Convert sheet to 2D array, replacing nulls with empty strings to keep column alignments
  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
  console.log(`[Migration] Parsed ${rawData.length} rows and ${merges.length} merged ranges.`);

  // 2. Auth with Google API
  const auth = new google.auth.JWT(
    config.googleEmail,
    undefined,
    config.googlePrivateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = config.sheetId;

  // 3. Ensure 'Reportes' sheet exists in Google Spreadsheet
  console.log('[Migration] Querying Google Spreadsheet metadata...');
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Reportes');
  
  let destinationSheetId: number;
  if (!existingSheet) {
    console.log('[Migration] "Reportes" sheet not found in Google Sheets. Creating it...');
    const addSheetRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: 'Reportes',
              },
            },
          },
        ],
      },
    });
    destinationSheetId = addSheetRes.data.replies?.[0]?.addSheet?.properties?.sheetId!;
  } else {
    destinationSheetId = existingSheet.properties?.sheetId!;
    console.log('[Migration] "Reportes" sheet exists. Clearing previous data & merges...');
    
    // Clear old values
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Reportes!A1:ZZ1000',
    });
    
    // Unmerge all old ranges
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            unmergeCells: {
              range: {
                sheetId: destinationSheetId,
                startRowIndex: 0,
                endRowIndex: 1000,
                startColumnIndex: 0,
                endColumnIndex: 100,
              },
            },
          },
        ],
      },
    });
  }

  // 4. Write data values to the sheet
  console.log('[Migration] Uploading values...');
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Reportes!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: rawData,
    },
  });
  console.log('[Migration] Values uploaded successfully.');

  // 5. Apply cell merges
  if (merges.length > 0) {
    console.log(`[Migration] Applying ${merges.length} merges...`);
    const mergeRequests = merges.map((m) => ({
      mergeCells: {
        range: {
          sheetId: destinationSheetId,
          startRowIndex: m.s.r,
          endRowIndex: m.e.r + 1,
          startColumnIndex: m.s.c,
          endColumnIndex: m.e.c + 1,
        },
        mergeType: 'MERGE_ALL',
      },
    }));

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: mergeRequests,
      },
    });
    console.log('[Migration] Merges applied successfully.');
  }

  console.log('[Migration] Replicating sheet completed successfully! 🎉');
}

main().catch((error) => {
  console.error('[Migration] Critical failure during migration:', error);
  process.exit(1);
});
