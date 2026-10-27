import type { Calendar } from './types';

export async function loadCalendar(url = 'data/calendar.json'): Promise<Calendar> {
  const res = await fetch(url, { credentials: 'same-origin', cache: 'no-cache' });
  if (!res.ok) throw new Error(`Could not load calendar data (HTTP ${res.status})`);
  const data = (await res.json()) as Calendar;
  if (data.schema_version?.split('.')[0] !== '1') {
    throw new Error(`Unsupported calendar schema version: ${data.schema_version}`);
  }
  return data;
}
