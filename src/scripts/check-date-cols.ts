import { google } from 'googleapis';
import { config } from '../config';

async function main() {
  console.log('--- CHECKING SPECIFIC DATE COLUMNS (23/06/2026) ---');
  const auth = new google.auth.JWT(
    config.googleEmail,
    undefined,
    config.googlePrivateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = config.sheetId;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Reportes!A1:ZZ25',
  });
  const rows = res.data.values || [];
  if (rows.length === 0) {
    console.log('No data.');
    return;
  }

  const dates = rows[0];
  const shifts = rows[1];

  console.log('Dates row length:', dates.length);
  console.log('Shifts row length:', shifts.length);

  // Find columns matching MARTES 23/6/26
  const targetDate = 'MARTES 23/6/26';
  const matchingCols: number[] = [];

  for (let c = 1; c < shifts.length; c++) {
    let colDate = '';
    for (let idx = c; idx >= 1; idx--) {
      if (dates[idx]) {
        colDate = dates[idx].toString().trim();
        break;
      }
    }
    if (colDate.toUpperCase() === targetDate.toUpperCase()) {
      matchingCols.push(c);
    }
  }

  console.log(`Matching columns for "${targetDate}":`, matchingCols);

  // For each matching column, print its values
  for (const colIndex of matchingCols) {
    console.log(`\n--- Values for Column Index ${colIndex} (${shifts[colIndex]}) ---`);
    for (let r = 2; r < rows.length; r++) {
      const dept = rows[r][0] || '';
      const cellVal = rows[r][colIndex] || '';
      if (cellVal) {
        console.log(`Row ${r+1} (${dept}): "${cellVal.substring(0, 100)}..."`);
      }
    }
  }
}

main().catch(console.error);
