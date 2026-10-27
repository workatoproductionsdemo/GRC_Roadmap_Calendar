import { describe, expect, it } from 'vitest';
import { currentFiscalYear, fiscalMonthOf, fiscalYearOf, fiscalYearRange, quarterOf, quarterRange } from '../../src/engine/fiscal';

describe('fiscal year', () => {
  it('rolls over on 1 February', () => {
    expect(fiscalYearOf('2027-01-31')).toBe(2026);
    expect(fiscalYearOf('2027-02-01')).toBe(2027);
    expect(currentFiscalYear('2026-10-27')).toBe(2026);
  });
  it('range is Feb 1 to Jan 31, incl. leap years', () => {
    expect(fiscalYearRange(2026)).toEqual({ start: '2026-02-01', end: '2027-01-31' });
    expect(fiscalYearRange(2027)).toEqual({ start: '2027-02-01', end: '2028-01-31' });
  });
});

describe('quarters', () => {
  it.each([
    ['2026-02-01', 1], ['2026-04-30', 1], ['2026-05-01', 2], ['2026-07-31', 2],
    ['2026-08-01', 3], ['2026-10-31', 3], ['2026-11-01', 4], ['2027-01-31', 4],
  ])('%s is Q%i', (d, q) => expect(quarterOf(d)).toBe(q));

  it('quarter ranges', () => {
    expect(quarterRange(2026, 1)).toEqual({ start: '2026-02-01', end: '2026-04-30' });
    expect(quarterRange(2026, 2)).toEqual({ start: '2026-05-01', end: '2026-07-31' });
    expect(quarterRange(2026, 3)).toEqual({ start: '2026-08-01', end: '2026-10-31' });
    expect(quarterRange(2026, 4)).toEqual({ start: '2026-11-01', end: '2027-01-31' });
    expect(quarterRange(2027, 1).end).toBe('2027-04-30');
  });
  it('fiscal month', () => {
    expect(fiscalMonthOf('2026-02-10')).toBe(1);
    expect(fiscalMonthOf('2027-01-10')).toBe(12);
  });
});
