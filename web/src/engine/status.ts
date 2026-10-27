import type { ISODate, Status, StatusSource } from './types';

/** Fallback only: derived from dates, so it can never know a window is truly done. */
export function deriveStatus(start: ISODate, end: ISODate, today: ISODate): Status {
  if (today < start) return 'planned';
  if (today <= end) return 'in_progress';
  return 'done';
}

export interface StatusInputs {
  jira?: Status;
  manual?: Status;
  derived: Status;
}

/** Precedence (proposed, open decision #2): Jira > manual > date-derived. */
export function resolveStatus(i: StatusInputs): { status: Status; source: StatusSource } {
  if (i.jira) return { status: i.jira, source: 'jira' };
  if (i.manual) return { status: i.manual, source: 'manual' };
  return { status: i.derived, source: 'date' };
}
