import type { Quarter } from '../engine/fiscal';
import type { Filters, Group } from '../engine/query';
import type { Status } from '../engine/types';

export interface State {
  filters: Filters;
  group: Group;
  /** Selected activity id (detail panel). */
  sel: string | null;
}

const STATUSES: Status[] = ['planned', 'in_progress', 'done'];
const GROUPS: Group[] = ['none', 'type', 'team', 'framework'];

export const defaultState = (quarter: Filters['quarter'] = 0): State => ({
  filters: { quarter },
  group: 'none',
  sel: null,
});

export function parseState(search: string, defaultQuarter: Filters['quarter'] = 0): State {
  const p = new URLSearchParams(search);
  const qn = Number(p.get('q'));
  const quarter = p.has('q') && Number.isInteger(qn) && qn >= 0 && qn <= 4 ? (qn as Filters['quarter']) : defaultQuarter;
  const status = p.get('status') as Status | null;
  const group = p.get('group') as Group | null;
  const filters: Filters = { quarter };
  for (const k of ['type', 'team', 'framework', 'search'] as const) {
    const v = p.get(k === 'framework' ? 'fw' : k);
    if (v) filters[k] = v;
  }
  if (status && STATUSES.includes(status)) filters.status = status;
  return { filters, group: group && GROUPS.includes(group) ? group : 'none', sel: p.get('sel') };
}

export function serializeState(s: State, defaultQuarter: Filters['quarter'] = 0): string {
  const p = new URLSearchParams();
  if (s.filters.quarter !== defaultQuarter) p.set('q', String(s.filters.quarter));
  if (s.filters.type) p.set('type', s.filters.type);
  if (s.filters.team) p.set('team', s.filters.team);
  if (s.filters.framework) p.set('fw', s.filters.framework);
  if (s.filters.status) p.set('status', s.filters.status);
  if (s.filters.search) p.set('search', s.filters.search);
  if (s.group !== 'none') p.set('group', s.group);
  if (s.sel) p.set('sel', s.sel);
  const out = p.toString();
  return out ? `?${out}` : '';
}
