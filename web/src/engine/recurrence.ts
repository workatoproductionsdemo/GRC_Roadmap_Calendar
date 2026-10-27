import { addDays, addMonths } from './dates';
import { fiscalMonthOf, fiscalYearRange, quarterOf } from './fiscal';
import { deriveStatus, resolveStatus } from './status';
import type { Activity, Cadence, ISODate, Window, WindowOverride } from './types';

const STEP_MONTHS: Record<Exclude<Cadence, 'once'>, number> = {
  annual: 12,
  semiannual: 6,
  quarterly: 3,
  monthly: 1,
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Period label used in window ids: Q1–Q4, H1/H2, A (annual), M01–M12, ONCE. */
export function periodLabel(cadence: Cadence, start: ISODate): string {
  const q = quarterOf(start);
  switch (cadence) {
    case 'quarterly':
      return `Q${q}`;
    case 'semiannual':
      return q <= 2 ? 'H1' : 'H2';
    case 'monthly':
      return `M${pad(fiscalMonthOf(start))}`;
    case 'annual':
      return 'A';
    case 'once':
      return 'ONCE';
  }
}

export function windowId(activityId: string, fy: number, period: string): string {
  return `${activityId}-FY${fy}-${period}`;
}

/** Window start dates for an activity that fall inside the given fiscal year. */
function startsInFiscalYear(a: Activity, fy: number): ISODate[] {
  if (!a.anchor) return [];
  const { start, end } = fiscalYearRange(fy);
  const inRange = (d: ISODate) => d >= start && d <= end;
  if (a.cadence === 'once') return inRange(a.anchor) ? [a.anchor] : [];

  const step = STEP_MONTHS[a.cadence];
  const out: ISODate[] = [];
  // Always step from the anchor so month-end clamping never drifts.
  for (let i = 0; ; i++) {
    const d = addMonths(a.anchor, i * step);
    if (d > end) break;
    if (d >= start) out.push(d);
  }
  return out;
}

export function expandWindows(
  activity: Activity,
  fy: number,
  overrides: WindowOverride[],
  today: ISODate,
): Window[] {
  if (!activity.active) return [];
  const byId = new Map(overrides.map((o) => [o.window_id, o]));
  const length = Math.max(activity.duration_days, 1);

  return startsInFiscalYear(activity, fy).map((genStart) => {
    const period = periodLabel(activity.cadence, genStart);
    const id = windowId(activity.id, fy, period);
    const o = byId.get(id);
    const start = o?.start ?? genStart;
    const end = o?.end ?? addDays(start, length - 1);
    const { status, source } = resolveStatus({
      jira: o?.jira_status,
      manual: o?.status,
      derived: deriveStatus(start, end, today),
    });
    const w: Window = {
      window_id: id,
      activity_id: activity.id,
      fiscal_year: fy,
      period,
      start,
      end,
      basis: o?.basis ?? 'indicative',
      status,
      status_source: source,
    };
    if (o?.jira_key) w.jira_key = o.jira_key;
    if (o?.notes) w.notes = o.notes;
    return w;
  });
}
