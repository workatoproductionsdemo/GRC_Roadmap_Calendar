import { describe, expect, it } from 'vitest';
import { expandWindows, periodLabel } from '../../src/engine/recurrence';
import type { Activity } from '../../src/engine/types';

const base: Activity = { id: 'uar', cadence: 'quarterly', anchor: '2026-02-15', duration_days: 10, active: true };
const today = '2026-10-27';
const ids = (a: Activity, fy = 2026, o = []) => expandWindows(a, fy, o, today).map((w) => w.window_id);

describe('cadences', () => {
  it('quarterly -> 4 windows', () => {
    expect(ids(base)).toEqual(['uar-FY2026-Q1', 'uar-FY2026-Q2', 'uar-FY2026-Q3', 'uar-FY2026-Q4']);
  });
  it('semiannual -> H1, H2', () => {
    expect(ids({ ...base, cadence: 'semiannual' })).toEqual(['uar-FY2026-H1', 'uar-FY2026-H2']);
  });
  it('annual -> A', () => {
    expect(ids({ ...base, cadence: 'annual' })).toEqual(['uar-FY2026-A']);
  });
  it('monthly -> 12 windows M01..M12', () => {
    const r = ids({ ...base, cadence: 'monthly' });
    expect(r).toHaveLength(12);
    expect(r[0]).toBe('uar-FY2026-M01');
    expect(r[11]).toBe('uar-FY2026-M12');
  });
  it('once -> only in the FY containing the anchor', () => {
    const a: Activity = { ...base, cadence: 'once', anchor: '2026-09-01' };
    expect(ids(a)).toEqual(['uar-FY2026-ONCE']);
    expect(ids(a, 2027)).toEqual([]);
  });
  it('null anchor (dates TBC) -> no windows', () => {
    expect(ids({ ...base, anchor: null })).toEqual([]);
  });
  it('inactive -> no windows', () => {
    expect(ids({ ...base, active: false })).toEqual([]);
  });
});

describe('anchoring', () => {
  it('anchor in a prior FY projects forward', () => {
    const a: Activity = { ...base, cadence: 'annual', anchor: '2024-03-10' };
    const [w] = expandWindows(a, 2026, [], today);
    expect(w?.start).toBe('2026-03-10');
  });
  it('anchor after the FY yields nothing', () => {
    expect(ids({ ...base, anchor: '2027-03-01' })).toEqual([]);
  });
  it('quarterly anchored mid-quarter keeps its day', () => {
    const starts = expandWindows(base, 2026, [], today).map((w) => w.start);
    expect(starts).toEqual(['2026-02-15', '2026-05-15', '2026-08-15', '2026-11-15']);
  });
  it('monthly anchored on the 31st clamps without drifting', () => {
    const a: Activity = { ...base, cadence: 'monthly', anchor: '2026-01-31' };
    const starts = expandWindows(a, 2026, [], today).map((w) => w.start);
    expect(starts.slice(0, 3)).toEqual(['2026-02-28', '2026-03-31', '2026-04-30']);
    expect(starts[11]).toBe('2027-01-31');
  });
  it('window straddling year end keeps FY of its start', () => {
    const a: Activity = { ...base, cadence: 'annual', anchor: '2027-01-25', duration_days: 20 };
    const [w] = expandWindows(a, 2026, [], today);
    expect(w).toMatchObject({ window_id: 'uar-FY2026-A', start: '2027-01-25', end: '2027-02-13' });
  });
  it('end is inclusive of duration_days', () => {
    const [w] = expandWindows({ ...base, cadence: 'once', anchor: '2026-05-01', duration_days: 1 }, 2026, [], today);
    expect(w?.end).toBe('2026-05-01');
  });
});

describe('overrides', () => {
  it('merge by window_id and mark confirmed', () => {
    const w = expandWindows(base, 2026, [
      { window_id: 'uar-FY2026-Q2', start: '2026-05-18', basis: 'confirmed', jira_key: 'GRC-1', notes: 'moved' },
    ], today).find((x) => x.period === 'Q2');
    expect(w).toMatchObject({ start: '2026-05-18', end: '2026-05-27', basis: 'confirmed', jira_key: 'GRC-1', notes: 'moved' });
  });
  it('explicit end wins', () => {
    const w = expandWindows(base, 2026, [{ window_id: 'uar-FY2026-Q1', end: '2026-03-31' }], today)[0];
    expect(w?.end).toBe('2026-03-31');
  });
  it('defaults to indicative; other windows unaffected', () => {
    const ws = expandWindows(base, 2026, [{ window_id: 'uar-FY2026-Q2', basis: 'confirmed' }], today);
    expect(ws.map((w) => w.basis)).toEqual(['indicative', 'confirmed', 'indicative', 'indicative']);
  });
  it('manual done beats date-derived; jira beats manual', () => {
    const q3 = (o: object) =>
      expandWindows(base, 2026, [{ window_id: 'uar-FY2026-Q3', ...o }], today).find((w) => w.period === 'Q3');
    expect(q3({ status: 'done' })).toMatchObject({ status: 'done', status_source: 'manual' });
    expect(q3({ status: 'done', jira_status: 'in_progress' })).toMatchObject({ status: 'in_progress', status_source: 'jira' });
  });
  it('ignores overrides for unknown windows', () => {
    expect(expandWindows(base, 2026, [{ window_id: 'nope-FY2026-Q1', status: 'done' }], today)).toHaveLength(4);
  });
  it('is per window, not per activity', () => {
    const ws = expandWindows(base, 2026, [{ window_id: 'uar-FY2026-Q1', status: 'done' }], '2026-02-01');
    expect(ws.map((w) => w.status)).toEqual(['done', 'planned', 'planned', 'planned']);
  });
});

describe('periodLabel', () => {
  it('maps cadence + date', () => {
    expect(periodLabel('quarterly', '2026-11-15')).toBe('Q4');
    expect(periodLabel('semiannual', '2026-08-01')).toBe('H2');
  });
});
