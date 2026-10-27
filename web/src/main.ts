import './style.css';
import { loadCalendar } from './data/load';
import type { Calendar } from './data/types';
import { currentFiscalYear, quarterOf } from './engine/fiscal';
import { applyFilters, buildRows, filterActivities, groupRows, isStale, summarize, tbcRows, viewRange, type Group, type Row } from './engine/query';
import type { ISODate, Status } from './engine/types';
import { parseState, serializeState, type State } from './state/url';
import { renderBanner, renderControls, renderFrameworks, renderSummary, renderTbc } from './views/chrome';
import { renderDetail } from './views/detail';
import { renderGantt } from './views/gantt';
import { esc } from './views/html';

const app = document.getElementById('app')!;

function localToday(): ISODate {
  const override = import.meta.env.DEV ? new URLSearchParams(location.search).get('today') : null;
  if (override && /^\d{4}-\d{2}-\d{2}$/.test(override)) return override;
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function start(cal: Calendar) {
  const today = localToday();
  const fy = currentFiscalYear(today);
  const defaultQuarter = quarterOf(today);
  const rows = buildRows(cal, fy, today);
  let state: State = parseState(location.search, defaultQuarter);

  const sync = (push = false) => {
    const qs = serializeState(state, defaultQuarter);
    const dev = import.meta.env.DEV ? new URLSearchParams(location.search).get('today') : null;
    const full = dev ? `${qs}${qs ? '&' : '?'}today=${dev}` : qs;
    history[push ? 'pushState' : 'replaceState'](null, '', location.pathname + full);
  };

  const render = () => {
    const active = document.activeElement as HTMLInputElement | null;
    const focusId = active?.id || null;
    const sel = active?.selectionStart ?? null;

    const f = state.filters;
    const visible = applyFilters(rows, f, fy);
    const grouped = groupRows(visible, state.group, f);
    const selected: Row | undefined = state.sel ? rows.find((r) => r.activity.id === state.sel) : undefined;
    // Summary reflects activity-level filters but not the quarter tab or status.
    const summary = summarize(filterActivities(rows, f), today);
    const stale = isStale(cal.generated_at, Date.now());

    app.innerHTML = `
      ${renderBanner(stale, cal.generated_at)}
      <div class="wrap">
        <header class="top"><div><h1>GRC Roadmap Calendar</h1>
          <p class="sub">Upcoming GRC activities and asks for FY${fy} (Feb–Jan)</p></div>
          <span class="tag">Updated ${esc(new Date(cal.generated_at).toLocaleString())}</span></header>
        ${renderSummary(summary, fy)}
        ${renderControls(cal, f, state.group, fy)}
        <div class="layout${selected ? ' has-detail' : ''}">
          <main>${renderGantt(grouped, viewRange(fy, f.quarter), today, state.sel)}
            ${renderTbc(tbcRows(rows, f))}</main>
          ${selected ? renderDetail(selected, cal, f) : ''}
        </div>
        ${renderFrameworks(cal, f)}
      </div>`;

    if (focusId) {
      const el = document.getElementById(focusId) as HTMLInputElement | null;
      el?.focus();
      if (el && sel !== null && 'setSelectionRange' in el && el.type !== 'search') el.setSelectionRange(sel, sel);
      if (el && el.type === 'search') el.setSelectionRange(el.value.length, el.value.length);
    }
  };

  const update = (next: State, push = false) => {
    state = next;
    sync(push);
    render();
  };

  app.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    if (act === 'quarter') update({ ...state, filters: { ...state.filters, quarter: Number(t.dataset.q) as 0 } });
    else if (act === 'select') update({ ...state, sel: t.dataset.id ?? null }, true);
    else if (act === 'close') update({ ...state, sel: null });
    else if (act === 'fw') {
      const id = t.dataset.id;
      update({ ...state, filters: { ...state.filters, framework: state.filters.framework === id ? undefined : id } });
    } else if (act === 'clear') update({ filters: { quarter: state.filters.quarter }, group: 'none', sel: state.sel });
  });

  const setFilter = (key: 'type' | 'team' | 'framework' | 'search', v: string) =>
    update({ ...state, filters: { ...state.filters, [key]: v || undefined } });

  app.addEventListener('input', (e) => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'search') setFilter('search', el.value);
  });
  app.addEventListener('change', (e) => {
    const el = e.target as HTMLSelectElement;
    if (el.id === 'f-type') setFilter('type', el.value);
    else if (el.id === 'f-team') setFilter('team', el.value);
    else if (el.id === 'f-fw') setFilter('framework', el.value);
    else if (el.id === 'f-status') update({ ...state, filters: { ...state.filters, status: (el.value || undefined) as Status | undefined } });
    else if (el.id === 'f-group') update({ ...state, group: el.value as Group });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.sel) update({ ...state, sel: null });
  });
  window.addEventListener('popstate', () => {
    state = parseState(location.search, defaultQuarter);
    render();
  });

  render();
}

loadCalendar()
  .then(start)
  .catch((err: Error) => {
    app.innerHTML = `<div class="wrap"><p class="banner" role="alert">${esc(err.message)}</p></div>`;
  });
