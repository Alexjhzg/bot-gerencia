import { google } from 'googleapis';
import { config } from '../config';

async function main() {
  console.log('--- CLEANING UP SHEET COLUMNS ---');
  const auth = new google.auth.JWT(
    config.googleEmail,
    undefined,
    config.googlePrivateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = config.sheetId;

  // Find sheet ID of 'Reportes'
  const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === 'Reportes');
  const sheetId = targetSheet?.properties?.sheetId!;

  console.log('Resetting columns limit of "Reportes" back to 51...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              gridProperties: {
                columnCount: 51
              }
            },
            fields: 'gridProperties.columnCount'
          }
        }
      ]
    }
  });

  console.log('Cleanup completed successfully!');
}

main().catch(console.error);
