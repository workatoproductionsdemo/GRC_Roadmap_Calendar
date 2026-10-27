import { daysInMonth, parseISO, toISO } from './dates';
import type { ISODate } from './types';

/** Fiscal year runs Feb–Jan and is named by its start year (FY2026 = Feb 2026–Jan 2027). */
const FY_START_MONTH = 2;

export type Quarter = 1 | 2 | 3 | 4;

export interface Range {
  start: ISODate;
  end: ISODate;
}

export function fiscalYearOf(date: ISODate): number {
  const { y, m } = parseISO(date);
  return m >= FY_START_MONTH ? y : y - 1;
}

/** 0-based month offset within the fiscal year (Feb = 0 … Jan = 11). */
function fiscalMonthIndex(m: number): number {
  return (m - FY_START_MONTH + 12) % 12;
}

/** 1-based fiscal month (Feb = 1 … Jan = 12). */
export function fiscalMonthOf(date: ISODate): number {
  return fiscalMonthIndex(parseISO(date).m) + 1;
}

export function quarterOf(date: ISODate): Quarter {
  return (Math.floor(fiscalMonthIndex(parseISO(date).m) / 3) + 1) as Quarter;
}

export function fiscalYearRange(fy: number): Range {
  return { start: toISO(fy, FY_START_MONTH, 1), end: toISO(fy + 1, FY_START_MONTH, 0) };
}

export function quarterRange(fy: number, q: Quarter): Range {
  const startIdx = fy * 12 + (FY_START_MONTH - 1) + (q - 1) * 3;
  const endIdx = startIdx + 2;
  const ey = Math.floor(endIdx / 12);
  const em = (endIdx % 12) + 1;
  return {
    start: toISO(Math.floor(startIdx / 12), (startIdx % 12) + 1, 1),
    end: toISO(ey, em, daysInMonth(ey, em)),
  };
}

/** Current FY rolls over automatically on 1 February. */
export function currentFiscalYear(today: ISODate): number {
  return fiscalYearOf(today);
}
