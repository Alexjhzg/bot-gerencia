import { getSheetsClient } from '../services/sheets/client';
import { MATRIX_SHEET_NAME } from '../services/sheets/utils';
import { config } from '../config';

async function analyze() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.sheetId,
    range: `${MATRIX_SHEET_NAME}!A1:ZZ50`,
  });

  const rows = res.data.values || [];
  if (rows.length === 0) {
    console.log('No data');
    return;
  }

  const dates = rows[0] || [];
  const shifts = rows[1] || [];
  const numCols = Math.max(...rows.map((r: any) => r.length));

  console.log('Total columns in sheet:', numCols);

  // Departments from Row 3 (index 2) onwards
  const depts: { name: string; rowIndex: number }[] = [];
  for (let r = 2; r < rows.length; r++) {
    const name = rows[r][0]?.toString().trim();
    if (name) {
      depts.push({ name, rowIndex: r });
    }
  }

  console.log('Departments found (' + depts.length + '):', depts.map(d => d.name));

  // Exclude clima and novedades from department quotas, but track them as overhead
  const specialDepts = ['SITUACIÓN CLIMÁTICA', 'SITUACION CLIMATICA', 'NOVEDADES'];
  const regularDepts = depts.filter(d => 
    !d.name.toUpperCase().includes('CLIMATICA') && 
    !d.name.toUpperCase().includes('CLIMÁTICA') && 
    !d.name.toUpperCase().includes('NOVEDADES')
  );

  const overheadDepts = depts.filter(d => 
    d.name.toUpperCase().includes('CLIMATICA') || 
    d.name.toUpperCase().includes('CLIMÁTICA') || 
    d.name.toUpperCase().includes('NOVEDADES')
  );

  const deptData: { [key: string]: number[] } = {};
  depts.forEach(d => { deptData[d.name] = []; });

  interface ColumnReport {
    colIndex: number;
    date: string;
    shift: string;
    deptLengths: { [dept: string]: number };
    totalChars: number;
    overheadChars: number;
  }

  const shiftReports: ColumnReport[] = [];

  for (let c = 1; c < numCols; c++) {
    let colDate = '';
    for (let idx = c; idx >= 1; idx--) {
      if (dates[idx]) {
        colDate = dates[idx].toString().trim();
        break;
      }
    }
    const shiftLabel = shifts[c]?.toString().trim() || '';
    if (!colDate && !shiftLabel) continue;

    let colTotalChars = 0;
    let colOverheadChars = 0;
    const deptLengths: { [dept: string]: number } = {};
    let hasAnyData = false;

    for (const d of depts) {
      const cellVal = rows[d.rowIndex]?.[c]?.toString().trim() || '';
      if (cellVal) {
        hasAnyData = true;
        const len = cellVal.length;
        deptData[d.name].push(len);
        deptLengths[d.name] = len;
        colTotalChars += len;
        if (d.name.toUpperCase().includes('CLIMATICA') || d.name.toUpperCase().includes('NOVEDADES')) {
          colOverheadChars += len;
        }
      }
    }

    if (hasAnyData) {
      shiftReports.push({
        colIndex: c,
        date: colDate,
        shift: shiftLabel,
        deptLengths,
        totalChars: colTotalChars,
        overheadChars: colOverheadChars,
      });
    }
  }

  console.log('\nTotal active shifts with data:', shiftReports.length);

  let grandTotalRegularChars = 0;
  regularDepts.forEach(d => {
    grandTotalRegularChars += deptData[d.name].reduce((acc, v) => acc + v, 0);
  });

  interface DeptStats {
    name: string;
    submissions: number;
    totalChars: number;
    minChars: number;
    maxChars: number;
    avgChars: number;
    p90Chars: number;
    percentOfTotal: number;
  }

  const statsList: DeptStats[] = regularDepts.map(d => {
    const arr = deptData[d.name];
    const sum = arr.reduce((acc, v) => acc + v, 0);
    const count = arr.length;
    arr.sort((a, b) => a - b);
    const p90 = count > 0 ? arr[Math.floor(count * 0.9)] : 0;
    return {
      name: d.name,
      submissions: count,
      totalChars: sum,
      minChars: count > 0 ? arr[0] : 0,
      maxChars: count > 0 ? arr[arr.length - 1] : 0,
      avgChars: count > 0 ? Math.round(sum / count) : 0,
      p90Chars: p90,
      percentOfTotal: grandTotalRegularChars > 0 ? (sum / grandTotalRegularChars) * 100 : 0,
    };
  });

  // Sort by total characters descending
  statsList.sort((a, b) => b.totalChars - a.totalChars);

  console.log('\n======================================================');
  console.log('ESTUDIO HISTÓRICO DE CONSUMO DE CARACTERES POR UNIDAD');
  console.log('======================================================');
  console.log('Gran total de caracteres escritos por unidades:', grandTotalRegularChars);

  statsList.forEach((s, idx) => {
    console.log(`\n#${idx + 1} ${s.name}`);
    console.log(`   - Entregas registradas: ${s.submissions} / ${shiftReports.length} turnos (${((s.submissions / shiftReports.length) * 100).toFixed(1)}% frecuencia)`);
    console.log(`   - Volumen acumulado: ${s.totalChars} caracteres`);
    console.log(`   - Participación del volumen total: ${s.percentOfTotal.toFixed(2)}%`);
    console.log(`   - Promedio por reporte: ${s.avgChars} caracteres`);
    console.log(`   - Percentil 90 (P90): ${s.p90Chars} caracteres`);
    console.log(`   - Rango: min ${s.minChars} | max ${s.maxChars} caracteres`);
  });

  // Overhead analysis (Clima, Novedades, Plantilla base)
  console.log('\n======================================================');
  console.log('ANÁLISIS DE OVERHEAD (Encabezados fijos, Clima y Novedades)');
  console.log('======================================================');
  overheadDepts.forEach(d => {
    const arr = deptData[d.name];
    const sum = arr.reduce((acc, v) => acc + v, 0);
    const avg = arr.length > 0 ? Math.round(sum / arr.length) : 0;
    const max = arr.length > 0 ? Math.max(...arr) : 0;
    console.log(`${d.name}: Promedio ${avg} chars, Máximo ${max} chars (${arr.length} registros)`);
  });

  // Top 5 shifts with highest volume
  shiftReports.sort((a, b) => b.totalChars - a.totalChars);
  console.log('\n======================================================');
  console.log('TOP 5 TURNOS CON MAYOR VOLUMEN TOTAL HISTÓRICO');
  console.log('======================================================');
  shiftReports.slice(0, 5).forEach((sr, i) => {
    console.log(`\n#${i + 1} [${sr.date} - ${sr.shift}] Total: ${sr.totalChars} caracteres`);
    Object.entries(sr.deptLengths).forEach(([dept, len]) => {
      console.log(`   - ${dept}: ${len} chars (${((len / sr.totalChars) * 100).toFixed(1)}%)`);
    });
  });

  // Target budget calculation
  // Total safe budget in Telegram single message: ~3800 chars
  // Fixed overhead: ~150 chars (headers + emojis + clima/novedades)
  // Available budget for units: ~3650 chars
  const SAFE_TOTAL_BUDGET = 3650;
  console.log('\n======================================================');
  console.log(`PROPUESTA DE LÍMITES POR UNIDAD (Presupuesto total disponible: ${SAFE_TOTAL_BUDGET} chars)`);
  console.log('======================================================');
  
  statsList.forEach(s => {
    const allocated = Math.round((s.percentOfTotal / 100) * SAFE_TOTAL_BUDGET);
    console.log(`${s.name}:`);
    console.log(`   - Porcentaje asignado: ${s.percentOfTotal.toFixed(1)}%`);
    console.log(`   - Límite recomendado: ~${allocated} caracteres`);
    console.log(`   - Comparación con su promedio histórico (${s.avgChars} chars): ${allocated >= s.avgChars ? 'Cubre promedio holgadamente ✅' : 'Requiere síntesis ⚠️'}`);
    console.log(`   - Comparación con su P90 (${s.p90Chars} chars): ${allocated >= s.p90Chars ? 'Cubre el 90% de sus reportes pasados ✅' : 'Ajustado respecto a p90'}`);
  });
}

analyze().catch(console.error);
