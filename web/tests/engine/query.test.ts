import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Calendar } from '../../src/data/types';
import { applyFilters, buildRows, groupRows, isStale, summarize, tbcRows, type Filters } from '../../src/engine/query';

const cal = JSON.parse(readFileSync(resolve(__dirname, '../../../schema/fixtures/sample.calendar.json'), 'utf8')) as Calendar;
const today = '2026-10-27';
const rows = buildRows(cal, 2026, today);
const f = (o: Partial<Filters> = {}): Filters => ({ quarter: 0, ...o });
const names = (rs: typeof rows) => rs.map((r) => r.activity.id);

describe('applyFilters', () => {
  it('whole FY excludes dateless activities', () => {
    expect(names(applyFilters(rows, f(), 2026))).not.toContain('pen-test');
  });
  it('quarter keeps only windows overlapping it', () => {
    const r = applyFilters(rows, f({ quarter: 2 }), 2026);
    expect(r.every((x) => x.windows.every((w) => w.start <= '2026-07-31' && w.end >= '2026-05-01'))).toBe(true);
    expect(names(r)).toContain('policy-review');
    expect(names(r)).not.toContain('soc2-audit');
  });
  it('team filter returns only that team’s activities', () => {
    const r = applyFilters(rows, f({ team: 'Legal' }), 2026);
    expect(names(r)).toEqual(['policy-review']);
  });
  it('framework, type and search compose', () => {
    expect(names(applyFilters(rows, f({ framework: 'dora' }), 2026)).sort()).toEqual(['bcdr-test', 'vendor-review']);
    expect(names(applyFilters(rows, f({ framework: 'dora', type: 'exercise' }), 2026))).toEqual(['bcdr-test']);
    expect(names(applyFilters(rows, f({ search: 'PENETRATION' }), 2026))).toEqual([]);
  });
  it('status filter trims windows', () => {
    const r = applyFilters(rows, f({ status: 'done' }), 2026).find((x) => x.activity.id === 'uar');
    expect(r?.windows.map((w) => w.period)).toEqual(['Q1', 'Q2', 'Q3']);
  });
});

describe('tbcRows', () => {
  it('lists activities with no anchor and respects filters', () => {
    expect(names(tbcRows(rows, f()))).toEqual(['pen-test']);
    expect(names(tbcRows(rows, f({ framework: 'dora' })))).toEqual([]);
  });
});

describe('summarize', () => {
  it('counts in-progress, next 30 days and current quarter', () => {
    const s = summarize(rows, today);
    expect(s.inProgress).toBeGreaterThanOrEqual(1);
    expect(s.quarter.q).toBe(3);
    expect(s.quarter.total).toBeGreaterThan(0);
  });
  it('next30 counts planned windows starting within 30 days', () => {
    const s = summarize(rows, today);
    // uar Q4 (Nov 16) and training (Nov 2) start within 30 days
    expect(s.next30).toBe(2);
  });
});

describe('groupRows', () => {
  it('team grouping lists an activity under each team and honours the team filter', () => {
    const g = groupRows(applyFilters(rows, f(), 2026), 'team', f());
    expect(g.find((x) => x.label === 'Infra')?.rows.length).toBeGreaterThan(1);
    const only = groupRows(applyFilters(rows, f({ team: 'IT' }), 2026), 'team', f({ team: 'IT' }));
    expect(only.map((x) => x.label)).toEqual(['IT']);
  });
});

describe('isStale', () => {
  const now = Date.parse('2026-10-29T12:00:01Z');
  it('flags data older than 48h', () => {
    expect(isStale('2026-10-27T12:00:00Z', now)).toBe(true);
    expect(isStale('2026-10-28T12:00:00Z', now)).toBe(false);
    expect(isStale('garbage', now)).toBe(true);
  });
});
