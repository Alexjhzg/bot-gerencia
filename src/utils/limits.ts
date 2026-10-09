export interface UnitLimitConfig {
  maxChars: number;
  label: string;
}

/**
 * Límites máximos recomendados de caracteres por unidad.
 * Diseñados para asegurar que el consolidado institucional de todas las unidades
 * más encabezados y plantilla fija quepa siempre en 1 solo mensaje de Telegram (≤ 4.096 car.).
 */
export const UNIT_CHARACTER_LIMITS: Record<string, UnitLimitConfig> = {
  'COORDINACIÓN DE PROGRAMAS': {
    maxChars: 2100,
    label: 'Coordinación de Programas',
  },
  'COORDINACIÓN SEEM': {
    maxChars: 850,
    label: 'Coordinación SEEM',
  },
  'ENLACE DE RRHH Y ADMINISTRACIÓN': {
    maxChars: 550,
    label: 'Enlace de RRHH y Administración',
  },
  'GERENCIA': {
    maxChars: 300,
    label: 'Gerencia',
  },
};

/**
 * Límite por defecto para cualquier unidad que no esté explícitamente en el mapa.
 */
export const DEFAULT_UNIT_LIMIT = 800;

import { normalizeText } from './report';

/**
 * Obtiene la configuración de límite para una unidad (búsqueda normalizada insensible a mayúsculas y acentos).
 */
export function getUnitLimit(deptName: string): UnitLimitConfig {
  const cleanInput = normalizeText(deptName);

  for (const [key, cfg] of Object.entries(UNIT_CHARACTER_LIMITS)) {
    const cleanKey = normalizeText(key);
    if (cleanKey === cleanInput || cleanKey.includes(cleanInput) || cleanInput.includes(cleanKey)) {
      return cfg;
    }
  }

  return {
    maxChars: DEFAULT_UNIT_LIMIT,
    label: deptName.trim(),
  };
}

export interface LimitViolation {
  unitName: string;
  currentChars: number;
  maxChars: number;
  excess: number;
}

/**
 * Valida si los reportes por unidad exceden la cuota máxima de caracteres permitida.
 * Retorna la lista de infracciones (si está vacía, todos los reportes son válidos).
 */
export function checkReportLimits(
  reports: { departmentName: string; formattedActivities: string }[]
): LimitViolation[] {
  const violations: LimitViolation[] = [];

  for (const report of reports) {
    const config = getUnitLimit(report.departmentName);
    const current = report.formattedActivities.length;

    if (current > config.maxChars) {
      violations.push({
        unitName: config.label,
        currentChars: current,
        maxChars: config.maxChars,
        excess: current - config.maxChars,
      });
    }
  }

  return violations;
}
