import { addMonths, diffDays, parseISO, toISO } from '../engine/dates';
import type { GroupedRows, Row } from '../engine/query';
import type { Range } from '../engine/fiscal';
import type { ISODate, Window } from '../engine/types';
import { esc, fmtRange, monthName, STATUS_LABEL } from './html';

function monthTicks(range: Range): { label: string; pct: number }[] {
  const total = diffDays(range.start, range.end) + 1;
  const out: { label: string; pct: number }[] = [];
  const first = parseISO(range.start);
  let cur: ISODate = toISO(first.y, first.m, 1);
  while (cur <= range.end) {
    const at = cur < range.start ? range.start : cur;
    out.push({ label: monthName(parseISO(cur).m), pct: (diffDays(range.start, at) / total) * 100 });
    cur = addMonths(cur, 1);
  }
  return out;
}

function bar(row: Row, w: Window, range: Range, total: number, selected: boolean): string {
  const s = w.start < range.start ? range.start : w.start;
  const e = w.end > range.end ? range.end : w.end;
  const left = (diffDays(range.start, s) / total) * 100;
  const width = Math.max(((diffDays(s, e) + 1) / total) * 100, 0.8);
  const label = `${row.activity.name}, ${w.period}: ${fmtRange(w.start, w.end)}, ${STATUS_LABEL[w.status]}, ${w.basis} dates`;
  return `<button class="bar s-${w.status} ${w.basis}" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%" data-act="select" data-id="${esc(row.activity.id)}" aria-label="${esc(label)}" ${selected ? 'aria-current="true"' : ''} title="${esc(label)}"></button>`;
}

export function renderGantt(groups: GroupedRows[], range: Range, today: ISODate, selId: string | null): string {
  const total = diffDays(range.start, range.end) + 1;
  const ticks = monthTicks(range);
  const todayPct = today >= range.start && today <= range.end ? (diffDays(range.start, today) / total) * 100 : null;
  const grid = ticks.map((t) => `<span class="tick" style="left:${t.pct.toFixed(2)}%"></span>`).join('');
  const todayLine = todayPct === null ? '' : `<span class="today" style="left:${todayPct.toFixed(2)}%" title="Today"><b>Today</b></span>`;

  const head = `<div class="g-row g-head"><div class="g-label" aria-hidden="true"></div><div class="g-track" aria-hidden="true">${ticks
    .map((t) => `<span class="mlabel" style="left:${t.pct.toFixed(2)}%">${t.label}</span>`)
    .join('')}${todayLine}</div></div>`;

  const body = groups
    .map((g) => {
      const rows = g.rows
        .map((r) => {
          const sel = r.activity.id === selId;
          return `<div class="g-row${sel ? ' sel' : ''}">
            <button class="g-label" data-act="select" data-id="${esc(r.activity.id)}" ${sel ? 'aria-current="true"' : ''}>
              <span class="nm">${esc(r.activity.name)}</span><span class="ty">${esc(r.activity.type)} · ${esc(r.activity.cadence)}</span>
            </button>
            <div class="g-track">${grid}${todayLine}${r.windows.map((w) => bar(r, w, range, total, sel)).join('')}</div>
          </div>`;
        })
        .join('');
      return `${g.label ? `<h3 class="g-group">${esc(g.label)}</h3>` : ''}${rows}`;
    })
    .join('');

  if (!groups.some((g) => g.rows.length)) return `<p class="empty" role="status">No activities match these filters.</p>`;
  return `<div class="gantt" role="group" aria-label="Timeline">${head}${body}</div>
    <p class="legend" aria-hidden="true">
      <span><i class="sw s-planned confirmed"></i>Planned</span><span><i class="sw s-in_progress confirmed"></i>In progress</span><span><i class="sw s-done confirmed"></i>Done</span>
      <span><i class="sw s-planned indicative"></i>Indicative dates (striped)</span></p>`;
}
