import { describe, expect, it } from 'vitest';
import { deriveStatus, resolveStatus } from '../../src/engine/status';

describe('deriveStatus', () => {
  it('uses inclusive window bounds', () => {
    expect(deriveStatus('2026-05-01', '2026-05-10', '2026-04-30')).toBe('planned');
    expect(deriveStatus('2026-05-01', '2026-05-10', '2026-05-01')).toBe('in_progress');
    expect(deriveStatus('2026-05-01', '2026-05-10', '2026-05-10')).toBe('in_progress');
    expect(deriveStatus('2026-05-01', '2026-05-10', '2026-05-11')).toBe('done');
  });
});

describe('resolveStatus precedence', () => {
  it('jira > manual > derived', () => {
    expect(resolveStatus({ jira: 'done', manual: 'planned', derived: 'in_progress' })).toEqual({ status: 'done', source: 'jira' });
    expect(resolveStatus({ manual: 'planned', derived: 'in_progress' })).toEqual({ status: 'planned', source: 'manual' });
    expect(resolveStatus({ derived: 'in_progress' })).toEqual({ status: 'in_progress', source: 'date' });
  });
});
