import type { ISODate } from './types';

export function parseISO(d: ISODate): { y: number; m: number; d: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!match) throw new Error(`Invalid ISO date: ${d}`);
  const [y, m, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const check = new Date(Date.UTC(y, m - 1, day));
  if (check.getUTCMonth() !== m - 1 || check.getUTCDate() !== day) {
    throw new Error(`Invalid ISO date: ${d}`);
  }
  return { y, m, d: day };
}

export function toISO(y: number, m: number, d: number): ISODate {
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function addDays(date: ISODate, n: number): ISODate {
  const { y, m, d } = parseISO(date);
  return toISO(y, m, d + n);
}

/** Add whole months, clamping the day to the target month's length. */
export function addMonths(date: ISODate, n: number): ISODate {
  const { y, m, d } = parseISO(date);
  const idx = y * 12 + (m - 1) + n;
  const ty = Math.floor(idx / 12);
  const tm = (idx % 12) + 1;
  return toISO(ty, tm, Math.min(d, daysInMonth(ty, tm)));
}

/** Whole days from a to b (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  const pa = parseISO(a);
  const pb = parseISO(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}
