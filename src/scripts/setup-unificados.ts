import { google } from 'googleapis';
import { config } from '../config';
import { MATRIX_SHEET_NAME, DEFAULT_DEPARTMENTS } from '../services/sheets';

async function setupUnificados() {
  const auth = new google.auth.JWT(
    config.googleEmail,
    undefined,
    config.googlePrivateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = config.sheetId;

  console.log(`[Setup] Verificando hoja "${MATRIX_SHEET_NAME}" en Google Sheets...`);
  
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = meta.data.sheets || [];
  let targetSheet = existingSheets.find(s => s.properties?.title === MATRIX_SHEET_NAME);

  if (!targetSheet) {
    console.log(`[Setup] La hoja "${MATRIX_SHEET_NAME}" no existe. Creándola...`);
    const addSheetRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: MATRIX_SHEET_NAME,
              },
            },
          },
        ],
      },
    });
    targetSheet = addSheetRes.data.replies?.[0]?.addSheet;
    console.log(`[Setup] Hoja "${MATRIX_SHEET_NAME}" creada exitosamente.`);
  }

  const sheetIdNum = targetSheet?.properties?.sheetId!;

  console.log(`[Setup] Limpiando datos previos en "${MATRIX_SHEET_NAME}"...`);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${MATRIX_SHEET_NAME}!A1:ZZ100`,
  });

  // Merge A1:A2 for the main department header
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            mergeCells: {
              range: {
                sheetId: sheetIdNum,
                startRowIndex: 0,
                endRowIndex: 2,
                startColumnIndex: 0,
                endColumnIndex: 1,
              },
              mergeType: 'MERGE_ALL',
            },
          },
        ],
      },
    });
  } catch (mergeErr) {
    // If already merged or harmless error, log warning
    console.warn('[Setup] Merge warning:', mergeErr);
  }

  // Write main header in A1
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${MATRIX_SHEET_NAME}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['GERENCIA/COORDINACIÓN/UNIDAD']],
    },
  });

  // Define departments to populate in Column A (A3 downwards)
  const fullDeptList = [
    ...DEFAULT_DEPARTMENTS,
    'SITUACIÓN CLIMÁTICA',
    'NOVEDADES'
  ];

  console.log(`[Setup] Escribiendo unidades autorizadas en Column A (${MATRIX_SHEET_NAME}!A3:A${2 + fullDeptList.length})...`);
  
  const deptValues = fullDeptList.map(dept => [dept]);

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${MATRIX_SHEET_NAME}!A3:A${2 + fullDeptList.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: deptValues,
    },
  });

  // Sync Unidades sheet as well
  const unidadesSheet = existingSheets.find(s => s.properties?.title === 'Unidades');
  if (unidadesSheet) {
    console.log('[Setup] Actualizando pestaña "Unidades" con los nuevos departamentos...');
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Unidades!A2:A100',
    });

    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Unidades!A2:A100',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: DEFAULT_DEPARTMENTS.map(d => [d]),
      },
    });
  }

  console.log('[Setup] ¡Configuración de Reportes_unificados completada desde cero con éxito!');
}

setupUnificados().catch(console.error);
