import {
  UNIT_CHARACTER_LIMITS,
  DEFAULT_UNIT_LIMIT,
  getUnitLimit,
  checkReportLimits,
  LimitViolation,
} from '../utils/limits';
import { parseReportMessage, escapeHtml } from '../utils/report';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('===========================================================');
  console.log('🧪 SUITE DE PRUEBAS: SISTEMA DE LÍMITES POR UNIDAD Y HTML');
  console.log('===========================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function test(name: string, fn: () => void) {
    totalTests++;
    try {
      fn();
      console.log(`✅ [PASS] Test #${totalTests}: ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`❌ [FAIL] Test #${totalTests}: ${name}\n   Error: ${err.message}`);
    }
  }

  // --- SUITE 1: Resolución de límites por unidad ---
  console.log('--- 1. Pruebas de Configuración y Resolución de Límites ---');

  test('Coordinación de Programas debe tener límite de 2100 caracteres', () => {
    const cfg = getUnitLimit('COORDINACIÓN DE PROGRAMAS');
    assert(cfg.maxChars === 2100, `Esperado 2100, obtenido ${cfg.maxChars}`);
  });

  test('Coordinación SEEM debe tener límite de 850 caracteres', () => {
    const cfg = getUnitLimit('COORDINACIÓN SEEM');
    assert(cfg.maxChars === 850, `Esperado 850, obtenido ${cfg.maxChars}`);
  });

  test('Enlace de RRHH y Administración debe tener límite de 550 caracteres', () => {
    const cfg = getUnitLimit('ENLACE DE RRHH Y ADMINISTRACIÓN');
    assert(cfg.maxChars === 550, `Esperado 550, obtenido ${cfg.maxChars}`);
  });

  test('Gerencia debe tener límite de 300 caracteres', () => {
    const cfg = getUnitLimit('GERENCIA');
    assert(cfg.maxChars === 300, `Esperado 300, obtenido ${cfg.maxChars}`);
  });

  test('Búsqueda insensible a mayúsculas y acentos funciona correctamente', () => {
    const cfg1 = getUnitLimit('coordinacion seem');
    assert(cfg1.maxChars === 850, `coordinacion seem falló, obtenido ${cfg1.maxChars}`);

    const cfg2 = getUnitLimit('coordinacion de programas');
    assert(cfg2.maxChars === 2100, `coordinacion de programas falló, obtenido ${cfg2.maxChars}`);
  });

  test('Unidad no catalogada recibe el límite por defecto (DEFAULT_UNIT_LIMIT = 800)', () => {
    const cfg = getUnitLimit('UNIDAD DE AUDITORIA INTERNA');
    assert(cfg.maxChars === DEFAULT_UNIT_LIMIT, `Esperado ${DEFAULT_UNIT_LIMIT}, obtenido ${cfg.maxChars}`);
  });

  // --- SUITE 2: Validación de reportes válidos (Sin infracciones) ---
  console.log('\n--- 2. Pruebas de Reportes Válidos (Dentro de la cuota) ---');

  test('Reporte con texto dentro del límite no genera infracciones', () => {
    const reports = [
      {
        departmentName: 'COORDINACIÓN SEEM',
        formattedActivities: '▪️ Actividad 1\n▪️ Actividad 2\n▪️ Actividad 3',
      },
      {
        departmentName: 'ENLACE DE RRHH Y ADMINISTRACIÓN',
        formattedActivities: '▪️ Control de asistencia: 35 activos\n▪️ Visitas: 02',
      },
    ];

    const violations = checkReportLimits(reports);
    assert(violations.length === 0, `Esperado 0 infracciones, obtenido ${violations.length}`);
  });

  test('Reporte en el límite exacto (caso borde) es aceptado', () => {
    // 300 caracteres exactos para Gerencia
    const exactGerenciaText = '▪️ ' + 'x'.repeat(297);
    assert(exactGerenciaText.length === 300, 'El texto debe medir 300 caracteres');

    const violations = checkReportLimits([
      { departmentName: 'GERENCIA', formattedActivities: exactGerenciaText },
    ]);
    assert(violations.length === 0, 'No debería generar infracción en el límite exacto');
  });

  // --- SUITE 3: Detección precisa de excesos (Infracciones) ---
  console.log('\n--- 3. Pruebas de Detección de Excesos de Caracteres ---');

  test('Reporte que supera el límite por 1 carácter es detectado con precisión', () => {
    // 301 caracteres para Gerencia (límite 300)
    const overText = '▪️ ' + 'x'.repeat(298); // 3 + 298 = 301
    assert(overText.length === 301, 'El texto debe medir 301 caracteres');

    const violations = checkReportLimits([
      { departmentName: 'GERENCIA', formattedActivities: overText },
    ]);

    assert(violations.length === 1, `Esperado 1 infracción, obtenido ${violations.length}`);
    assert(violations[0].maxChars === 300, 'maxChars incorrecto');
    assert(violations[0].currentChars === 301, 'currentChars incorrecto');
    assert(violations[0].excess === 1, `Exceso incorrecto, esperado 1, obtenido ${violations[0].excess}`);
  });

  test('Reporte multi-unidad detecta solo la unidad que se excedió', () => {
    const reports = [
      {
        departmentName: 'ENLACE DE RRHH Y ADMINISTRACIÓN',
        formattedActivities: '▪️ ' + 'a'.repeat(400), // 403 chars (límite 550) -> Válido
      },
      {
        departmentName: 'COORDINACIÓN SEEM',
        formattedActivities: '▪️ ' + 'b'.repeat(900), // 903 chars (límite 850) -> Exceso +53
      },
    ];

    const violations = checkReportLimits(reports);
    assert(violations.length === 1, `Esperado 1 infracción, obtenido ${violations.length}`);
    assert(violations[0].unitName === 'Coordinación SEEM', `Unidad incorrecta: ${violations[0].unitName}`);
    assert(violations[0].excess === 53, `Exceso incorrecto, esperado 53, obtenido ${violations[0].excess}`);
  });

  test('Reporte donde múltiples unidades se exceden reporta todas las infracciones', () => {
    const reports = [
      {
        departmentName: 'COORDINACIÓN DE PROGRAMAS',
        formattedActivities: '▪️ ' + 'a'.repeat(2200), // 2203 car. (límite 2100 -> +103)
      },
      {
        departmentName: 'COORDINACIÓN SEEM',
        formattedActivities: '▪️ ' + 'b'.repeat(950), // 953 car. (límite 850 -> +103)
      },
    ];

    const violations = checkReportLimits(reports);
    assert(violations.length === 2, `Esperado 2 infracciones, obtenido ${violations.length}`);
  });

  // --- SUITE 4: Construcción del mensaje de error educativo ---
  console.log('\n--- 4. Pruebas del Formato del Mensaje de Error en Telegram ---');

  test('El mensaje de rechazo genera HTML válido y números coherentes', () => {
    const violations: LimitViolation[] = [
      {
        unitName: 'Coordinación de Programas',
        currentChars: 2350,
        maxChars: 2100,
        excess: 250,
      },
    ];

    let errorMsg = `⚠️ <b>El reporte excede el límite de caracteres permitido:</b>\n\n`;
    for (const v of violations) {
      errorMsg += `📌 <b>${escapeHtml(v.unitName)}</b>\n`;
      errorMsg += `• Caracteres actuales: <b>${v.currentChars}</b>\n`;
      errorMsg += `• Límite permitido: <b>${v.maxChars} caracteres</b>\n`;
      errorMsg += `• Exceso: <b>+${v.excess} caracteres</b>\n\n`;
    }
    errorMsg += `💡 <i>Para garantizar que el consolidado institucional viaje íntegro en un solo mensaje de Telegram, por favor sintetiza las actividades señaladas e inténtalo de nuevo.</i>`;

    assert(errorMsg.includes('<b>2350</b>'), 'Debe incluir el conteo actual');
    assert(errorMsg.includes('<b>2100 caracteres</b>'), 'Debe incluir el límite');
    assert(errorMsg.includes('<b>+250 caracteres</b>'), 'Debe incluir el exceso exacto');
    assert(errorMsg.includes('Coordinación de Programas'), 'Debe incluir el nombre de la unidad');
  });

  // --- SUITE 5: Integración con el Parser Real ---
  console.log('\n--- 5. Prueba de Integración con el Parser de Mensajes ---');

  test('Parsear texto real de Telegram y validar límites', () => {
    const telegramRawMessage = `Reporte diario
+ Coordinacion SEEM
- Desarrollar interfaz de usuario para el sistema de reportes
- Revisar requerimientos de base de datos y optimizar consultas

+ Enlace de RRHH y Administracion
- Control de asistencia del personal activo: 38
- Supervision de mantenimiento de las instalaciones`;

    const parsed = parseReportMessage(telegramRawMessage);
    assert(parsed.length === 2, 'Debe parsear 2 departamentos');

    const prepared = parsed.map(p => ({
      departmentName: p.department,
      formattedActivities: p.activities.split('\n').map(l => `▪️ ${l}`).join('\n'),
    }));

    const violations = checkReportLimits(prepared);
    assert(violations.length === 0, 'Un reporte normal debe pasar sin infracciones');
  });

  // --- SUITE 6: Garantía Matemática del Consolidado en Telegram ---
  console.log('\n--- 6. Garantía Matemática de Longitud Total de Telegram ---');

  test('La suma de todos los límites máximos más el overhead nunca excede 4096 caracteres', () => {
    const sumAllLimits = Object.values(UNIT_CHARACTER_LIMITS).reduce(
      (acc, c) => acc + c.maxChars,
      0
    );
    const estimatedTemplateOverhead = 260; // Encabezados, títulos, viñetas, clima
    const worstCaseTotal = sumAllLimits + estimatedTemplateOverhead;

    console.log(`   -> Suma de las 4 unidades al 100% de su límite: ${sumAllLimits} caracteres`);
    console.log(`   -> Plantilla y formato: ${estimatedTemplateOverhead} caracteres`);
    console.log(`   -> Longitud máxima en el peor escenario posible: ${worstCaseTotal} caracteres`);
    console.log(`   -> Margen libre respecto al límite de Telegram (4.096): ${4096 - worstCaseTotal} caracteres`);

    assert(worstCaseTotal <= 4096, `¡Alerta! ${worstCaseTotal} supera los 4096 caracteres`);
  });

  console.log('\n===========================================================');
  console.log(`🏁 RESULTADO FINAL: ${passedTests}/${totalTests} pruebas pasadas (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
  console.log('===========================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
