import { config } from '../config';

export interface ShiftStatus {
  isShift1: boolean;
  isShift2: boolean;
  isValid: boolean;
}

/**
 * Evaluates a given time string (HH:mm) against configured shift limits.
 */
export function getShiftStatus(timeStr: string): ShiftStatus {
  let isShift1 = false;
  let isShift2 = false;

  if (timeStr >= '00:00' && timeStr <= config.shift1Limit) {
    isShift1 = true;
  } else if (timeStr > config.shift1Limit && timeStr <= config.shift2Limit) {
    isShift2 = true;
  }

  return {
    isShift1,
    isShift2,
    isValid: isShift1 || isShift2,
  };
}
