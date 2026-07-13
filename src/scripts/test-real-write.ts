import { SheetsService } from '../services/sheets';

async function main() {
  console.log('--- RUNNING REAL MATRIX WRITE TEST ---');
  const sheetsService = SheetsService.getInstance();
  
  // Try to write a test report for PRENSA (Row 15) in shift 2
  const activities = '• Actividad de prueba local 1\n• Actividad de prueba local 2';
  
  console.log('Calling writeMatrixReport...');
  const result = await sheetsService.writeMatrixReport(15, false, activities);
  console.log('Write matrix report result:', result);
}

main().catch(console.error);
