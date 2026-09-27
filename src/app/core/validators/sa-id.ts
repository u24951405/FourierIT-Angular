import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Entity type for people identified by a South African ID number (matches the API). */
export const SA_ID_ENTITY_TYPE_ID = 1;

/**
 * Reads the date of birth (YYYY-MM-DD) from a South African ID number, or null when the number isn't a
 * valid ID: 13 digits, a real YYMMDD date and a valid South African check digit. Mirrors the API's validator.
 */
export function saIdDateOfBirth(idNumber: string | null | undefined, today = new Date()): string | null {
  const digits = String(idNumber ?? '').replace(/\s+/g, '');
  if (!/^\d{13}$/.test(digits) || !hasValidCheckDigit(digits)) return null;

  const yy = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));
  const day = Number(digits.slice(4, 6));

  // Two-digit years: a year that would be in the future belongs to the previous century.
  let year = 2000 + yy;
  if (year > today.getFullYear()) year -= 100;

  const daysInMonth = new Date(year, month, 0).getDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return null;

  const candidate = new Date(year, month - 1, day);
  if (candidate > today) year -= 100;

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Validator for a South African ID number field. */
export function saIdNumber(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '').replace(/\s+/g, '');
    if (!value) return null;
    if (!/^\d{13}$/.test(value)) return { saIdInvalid: true };
    return saIdDateOfBirth(value) ? null : { saIdChecksum: true };
  };
}

function hasValidCheckDigit(digits: string): boolean {
  const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 5, 4, 3];
  let sum = 0;

  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * weights[i];
  }

  let checkDigit = 11 - (sum % 11);
  if (checkDigit === 10 || checkDigit === 11) {
    checkDigit = 0;
  }

  return checkDigit === Number(digits[12]);
}
