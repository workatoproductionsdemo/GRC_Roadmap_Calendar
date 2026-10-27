export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-05-18" -> "18 May 2026" */
export function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

export function fmtRange(start: string, end: string): string {
  return start === end ? fmtDate(start) : `${fmtDate(start)} – ${fmtDate(end)}`;
}

export const monthName = (m: number) => MONTHS[m - 1] ?? '';

export const STATUS_LABEL = { planned: 'Planned', in_progress: 'In progress', done: 'Done' } as const;
export const FRAMEWORK_STATUS_LABEL = {
  certified: 'Certified',
  attested: 'Attested',
  in_progress: 'In progress',
  not_started: 'Not started',
  regulatory: 'Regulatory',
} as const;
export const SOURCE_LABEL = { jira: 'Jira', manual: 'GRC', date: 'Dates only' } as const;
