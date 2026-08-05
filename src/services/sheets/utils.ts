export const MATRIX_SHEET_NAME = 'Reportes_unificados';

export const DEFAULT_DEPARTMENTS = [
  'GERENCIA',
  'ENLACE DE RRHH Y ADMINISTRACIÓN',
  'COORDINACIÓN DE PROGRAMAS',
  'COORDINACIÓN SEEM'
];

/**
 * Converts a 0-indexed column integer to Google Sheets column letter (0 -> A, 25 -> Z, 26 -> AA, etc.).
 */
export function getColLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Formats a Date object as: "WEEKDAY DD/M/YY" (no leading zero on month).
 */
export function formatMatrixDate(d: Date): string {
  const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];
  const dayName = days[d.getDay()];
  const pad = (n: number) => n.toString().padStart(2, '0');
  const day = pad(d.getDate());
  const month = (d.getMonth() + 1).toString(); // No leading zero
  const year = d.getFullYear().toString().substring(2); // 2-digit year
  return `${dayName} ${day}/${month}/${year}`;
}

/**
 * Formats Date as "Weekday DD/MM/YYYY" from matrix header string (e.g. MARTES 30/6/26)
 */
export function formatSpanishDateFromMatrix(matrixDate: string): string {
  const parts = matrixDate.split(' ');
  if (parts.length < 2) return matrixDate;
  const dayName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const dateParts = parts[1].split('/');
  if (dateParts.length !== 3) return matrixDate;
  const day = dateParts[0].padStart(2, '0');
  const month = dateParts[1].padStart(2, '0');
  const year = '20' + dateParts[2];
  return `${dayName} ${day}/${month}/${year}`;
}
