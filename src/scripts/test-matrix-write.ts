import { google } from 'googleapis';
import { config } from '../config';

async function main() {
  console.log('--- TESTING MATRIX WRITE LOGIC LOCAL DEBUGER ---');
  
  const auth = new google.auth.JWT(
    config.googleEmail,
    undefined,
    config.googlePrivateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = config.sheetId;

  // 1. Fetch current header
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'Reportes!A1:ZZ2',
  });
  const rows = response.data.values || [];
  const dates = rows[0] || [];
  const shifts = rows[1] || [];

  console.log(`Current Row 1 (Dates) length: ${dates.length}`);
  console.log(`Current Row 2 (Shifts) length: ${shifts.length}`);

  // Let's format today's date using the two formats
  const formatMatrixDate = (d: Date, useZeroMonth: boolean): string => {
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
    const dayName = days[d.getDay()];
    const pad = (n: number) => n.toString().padStart(2, '0');
    const day = pad(d.getDate());
    const month = useZeroMonth ? pad(d.getMonth() + 1) : (d.getMonth() + 1).toString();
    const year = d.getFullYear().toString().substring(2); // 2-digit year
    return `${dayName} ${day}/${month}/${year}`;
  };

  const todayStrZero = formatMatrixDate(new Date(), true);
  const todayStrNoZero = formatMatrixDate(new Date(), false);

  console.log(`Formatted todayStr (with leading zero): "${todayStrZero}"`);
  console.log(`Formatted todayStr (without leading zero): "${todayStrNoZero}"`);

  // Let's see if we match either in the sheet
  let matchedColZero = -1;
  let matchedColNoZero = -1;

  for (let c = 1; c < shifts.length; c++) {
    let colDate = '';
    for (let idx = c; idx >= 1; idx--) {
      if (dates[idx]) {
        colDate = dates[idx].toString().trim();
        break;
      }
    }
    if (colDate.toUpperCase() === todayStrZero.toUpperCase()) {
      matchedColZero = c;
    }
    if (colDate.toUpperCase() === todayStrNoZero.toUpperCase()) {
      matchedColNoZero = c;
    }
  }

  console.log(`Match with zero month: col index ${matchedColZero}`);
  console.log(`Match without zero month: col index ${matchedColNoZero}`);
}

main().catch(console.error);
