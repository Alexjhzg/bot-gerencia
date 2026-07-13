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
  const spreadsheet = await sheets.spreadsheets.get({
    spreadsheetId: config.sheetId,
  });

  const list = spreadsheet.data.sheets || [];
  console.log('Sheets in Google Spreadsheet:', list.map(s => s.properties?.title));
}

main().catch(console.error);
