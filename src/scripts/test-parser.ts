import { parseReportMessage } from '../utils/report';
import { DEFAULT_DEPARTMENTS } from '../services/sheets';

function normalizeText(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function validateDept(dept: string): string {
  const normalizedUserDept = normalizeText(dept);
  const officialDeptMatch = DEFAULT_DEPARTMENTS.find(
    (authDept) => normalizeText(authDept) === normalizedUserDept
  );
  if (!officialDeptMatch) {
    throw new Error(`El departamento "${dept}" no está registrado.`);
  }
  return officialDeptMatch;
}

function runTests() {
  console.log('--- STARTING MULTI-REPORT PARSER & VALIDATION TESTS ---');

  // Test Case 1: Multiple units with new emoji headers and bullets
  const multiReportMessage = `📌Unidad: Productos estadisticos 
▪️  Actividad 1
▪️  Actividad 2

📌Unidad: Capacitacion 
▪️  Actividad A
▪️  Actividad B

📌Unidad: Prensa
▪️  Actividad X`;

  try {
    console.log('\nTest Case 1 (Multiple Emojis Format):');
    const results = parseReportMessage(multiReportMessage);
    console.log(`✅ Extraction Succeeded! Extracted ${results.length} reports.`);
    results.forEach((r, idx) => {
      console.log(`Report #${idx + 1}:`);
      console.log(`  Dept: ${JSON.stringify(r.department)}`);
      console.log(`  Activities:\n${r.activities.split('\n').map(a => `    - ${a}`).join('\n')}`);
    });
  } catch (error: any) {
    console.error('❌ Test Case 1 Failed:', error.message);
  }

  // Test Case 2: Classic format (single department with plus and hyphens)
  const classicMessage = `Reporte diario
+ Gerencia
- Coordinar reunión mensual
- Revisar informe financiero`;

  try {
    console.log('\nTest Case 2 (Classic Format Compatibility):');
    const results = parseReportMessage(classicMessage);
    console.log(`✅ Extraction Succeeded! Extracted ${results.length} reports.`);
    results.forEach((r, idx) => {
      console.log(`Report #${idx + 1}:`);
      console.log(`  Dept: ${JSON.stringify(r.department)}`);
      console.log(`  Activities:\n${r.activities.split('\n').map(a => `    - ${a}`).join('\n')}`);
    });
  } catch (error: any) {
    console.error('❌ Test Case 2 Failed:', error.message);
  }

  // Test Case 3: Mixed headers and bullets in one message
  const mixedMessage = `📌Unidad: Prensa
- Actividad de prensa 1
▪️ Actividad de prensa 2

+ Gerencia
* Actividad de gerencia con asterisco`;

  try {
    console.log('\nTest Case 3 (Mixed Headers and Bullets):');
    const results = parseReportMessage(mixedMessage);
    console.log(`✅ Extraction Succeeded! Extracted ${results.length} reports.`);
    results.forEach((r, idx) => {
      console.log(`Report #${idx + 1}:`);
      console.log(`  Dept: ${JSON.stringify(r.department)}`);
      console.log(`  Activities:\n${r.activities.split('\n').map(a => `    - ${a}`).join('\n')}`);
    });
  } catch (error: any) {
    console.error('❌ Test Case 3 Failed:', error.message);
  }

  // Test Case 4: Invalid input (no headers)
  const invalidMessage = `Reporte diario sin encabezados válidos
Actividad 1
Actividad 2`;

  try {
    console.log('\nTest Case 4 (No headers):');
    parseReportMessage(invalidMessage);
    console.error('❌ Test Case 4 Failed: Expected an error but parsing succeeded.');
  } catch (error: any) {
    console.log('✅ Test Case 4 Succeeded with expected error:', error.message);
  }

  // Test Case 5: Validation of department matching
  console.log('\nTest Case 5 (Fuzzy Department Matching against Defaults):');
  const deptsToTest = ['productos estadisticos', 'capacitacion', 'soporte y desarrollo tecnologico', 'prensa'];
  deptsToTest.forEach((dept) => {
    try {
      const match = validateDept(dept);
      console.log(`  Input: "${dept}" -> Matched: "${match}"`);
    } catch (err: any) {
      console.error(`  ❌ Failed to match "${dept}":`, err.message);
    }
  });

  console.log('\n--- TESTS COMPLETED ---');
}

runTests();
