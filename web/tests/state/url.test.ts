import { describe, expect, it } from 'vitest';
import { parseState, serializeState } from '../../src/state/url';

describe('url state', () => {
  it('round-trips filters, group and selection', () => {
    const qs = '?q=2&type=review&team=Infra&fw=soc2&status=done&search=access&group=team&sel=uar';
    const s = parseState(qs);
    expect(s).toEqual({
      filters: { quarter: 2, type: 'review', team: 'Infra', framework: 'soc2', status: 'done', search: 'access' },
      group: 'team',
      sel: 'uar',
    });
    expect(new URLSearchParams(serializeState(s)).toString()).toBe(new URLSearchParams(qs).toString());
  });
  it('ignores invalid values and falls back to defaults', () => {
    const s = parseState('?q=9&status=bogus&group=nope', 3);
    expect(s).toEqual({ filters: { quarter: 3 }, group: 'none', sel: null });
  });
  it('omits defaults from the URL', () => {
    expect(serializeState({ filters: { quarter: 3 }, group: 'none', sel: null }, 3)).toBe('');
  });
  it('explicit q=0 overrides the default quarter', () => {
    expect(parseState('?q=0', 3).filters.quarter).toBe(0);
    expect(serializeState({ filters: { quarter: 0 }, group: 'none', sel: null }, 3)).toBe('?q=0');
  });
});
