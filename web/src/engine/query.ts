import type { Calendar, FullActivity } from '../data/types';
import { addDays } from './dates';
import { currentFiscalYear, fiscalYearRange, quarterOf, quarterRange, type Quarter, type Range } from './fiscal';
import { expandWindows } from './recurrence';
import type { ISODate, Status, Window } from './types';

export interface Row {
  activity: FullActivity;
  windows: Window[];
}

/** quarter 0 = whole fiscal year. */
export interface Filters {
  quarter: 0 | Quarter;
  type?: string;
  team?: string;
  framework?: string;
  status?: Status;
  search?: string;
}

export type Group = 'none' | 'type' | 'team' | 'framework';

export const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

export function buildRows(cal: Calendar, fy: number, today: ISODate): Row[] {
  return cal.activities
    .filter((a) => a.active)
    .map((activity) => ({ activity, windows: expandWindows(activity, fy, cal.windows, today) }));
}

export function viewRange(fy: number, quarter: Filters['quarter']): Range {
  return quarter === 0 ? fiscalYearRange(fy) : quarterRange(fy, quarter);
}

const overlaps = (w: Window, r: Range) => w.start <= r.end && w.end >= r.start;

export function matchesActivity(a: FullActivity, f: Filters): boolean {
  if (f.type && a.type !== f.type) return false;
  if (f.team && !a.team_asks.some((t) => t.team === f.team)) return false;
  if (f.framework && !a.frameworks.includes(f.framework)) return false;
  const q = f.search?.trim().toLowerCase();
  if (q && !`${a.name} ${a.summary} ${a.owner} ${a.type}`.toLowerCase().includes(q)) return false;
  return true;
}

/** Rows that pass the non-date filters (type, team, framework, search). */
export function filterActivities(rows: Row[], f: Filters): Row[] {
  return rows.filter((r) => matchesActivity(r.activity, f));
}

/** Rows with at least one window in the chosen quarter/status; windows are trimmed to match. */
export function applyFilters(rows: Row[], f: Filters, fy: number): Row[] {
  const range = viewRange(fy, f.quarter);
  return filterActivities(rows, f)
    .map((r) => ({
      activity: r.activity,
      windows: r.windows.filter((w) => overlaps(w, range) && (!f.status || w.status === f.status)),
    }))
    .filter((r) => r.windows.length > 0);
}

/** Active activities with no dates yet. */
export function tbcRows(rows: Row[], f: Filters): Row[] {
  return filterActivities(rows, f).filter((r) => r.activity.anchor === null);
}

export interface Summary {
  inProgress: number;
  next30: number;
  quarter: { q: Quarter; done: number; total: number };
}

export function summarize(rows: Row[], today: ISODate): Summary {
  const fy = currentFiscalYear(today);
  const q = quarterOf(today);
  const qr = quarterRange(fy, q);
  const horizon = addDays(today, 30);
  const all = rows.flatMap((r) => r.windows);
  const inQuarter = all.filter((w) => overlaps(w, qr));
  return {
    inProgress: all.filter((w) => w.status === 'in_progress').length,
    next30: all.filter((w) => w.status === 'planned' && w.start > today && w.start <= horizon).length,
    quarter: { q, done: inQuarter.filter((w) => w.status === 'done').length, total: inQuarter.length },
  };
}

export interface GroupedRows {
  label: string;
  rows: Row[];
}

export function groupRows(rows: Row[], group: Group, f: Filters): GroupedRows[] {
  if (group === 'none') return [{ label: '', rows }];
  const keysOf = (a: FullActivity): string[] => {
    if (group === 'type') return [a.type];
    if (group === 'team') {
      const teams = [...new Set(a.team_asks.map((t) => t.team))].filter((t) => !f.team || t === f.team);
      return teams.length ? teams : ['No team asks'];
    }
    return a.frameworks.length ? a.frameworks : ['No framework'];
  };
  const map = new Map<string, Row[]>();
  for (const r of rows) for (const k of keysOf(r.activity)) map.set(k, [...(map.get(k) ?? []), r]);
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([label, rs]) => ({ label, rows: rs }));
}

export function isStale(generatedAt: string, nowMs: number): boolean {
  const t = Date.parse(generatedAt);
  return Number.isNaN(t) || nowMs - t > STALE_AFTER_MS;
}
