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
  const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === 'Reportes');
  console.log('Sheet title:', sheet?.properties?.title);
  console.log('GridProperties:', sheet?.properties?.gridProperties);
}

main().catch(console.error);
