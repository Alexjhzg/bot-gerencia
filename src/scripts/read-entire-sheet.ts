import { google } from 'googleapis';
import { config } from '../config';

async function main() {
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
    range: 'Reportes!A1:ZZ50',
  });
  const rows = res.data.values || [];
  console.log(`Grid rows loaded: ${rows.length}`);
  if (rows.length === 0) {
    console.log('No data found.');
    return;
  }

  const maxCols = Math.max(...rows.map(r => r.length));
  console.log(`Max columns loaded: ${maxCols}`);

  // Find any cell from index 45 onwards that has content
  console.log('--- Scanning Columns 45 onwards ---');
  for (let c = 45; c < maxCols; c++) {
    const colCells: string[] = [];
    for (let r = 0; r < rows.length; r++) {
      const val = rows[r][c];
      if (val !== undefined && val !== null && val.toString().trim() !== '') {
        colCells.push(`Row ${r+1}: "${val}"`);
      }
    }
    if (colCells.length > 0) {
      console.log(`Column index ${c} (${String.fromCharCode(65 + Math.floor(c/26) - 1 || 65)}${String.fromCharCode(65 + (c%26))}):`);
      colCells.forEach(cell => console.log(`  ${cell}`));
    }
  }
}

main().catch(console.error);
