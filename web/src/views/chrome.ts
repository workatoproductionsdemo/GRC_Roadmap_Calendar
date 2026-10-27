import type { Calendar } from '../data/types';
import type { Filters, Group, Row, Summary } from '../engine/query';
import { esc, FRAMEWORK_STATUS_LABEL, STATUS_LABEL } from './html';

export function renderBanner(stale: boolean, generatedAt: string): string {
  if (!stale) return '';
  const when = Number.isNaN(Date.parse(generatedAt)) ? 'unknown time' : new Date(generatedAt).toLocaleString();
  return `<div class="banner" role="alert">This data may be out of date. It was last updated ${esc(when)}, more than 48 hours ago.</div>`;
}

export function renderSummary(s: Summary, fy: number): string {
  const card = (k: string, v: string, n: string, c: string) =>
    `<div class="metric" style="--c:${c}"><div class="k">${k}</div><div class="v">${v}</div><div class="n">${n}</div></div>`;
  return `<section class="metrics" aria-label="Summary">
    ${card('In progress now', String(s.inProgress), s.inProgress === 1 ? 'window under way' : 'windows under way', 'var(--accent)')}
    ${card('Next 30 days', String(s.next30), s.next30 === 1 ? 'window starting' : 'windows starting', 'var(--today)')}
    ${card(`Q${s.quarter.q} FY${fy}`, `${s.quarter.done}/${s.quarter.total}`, 'windows done this quarter', 'var(--done)')}
  </section>`;
}

const opts = (values: string[], selected: string | undefined, all: string) =>
  `<option value="">${all}</option>${values.map((v) => `<option value="${esc(v)}"${v === selected ? ' selected' : ''}>${esc(v)}</option>`).join('')}`;

export function renderControls(cal: Calendar, f: Filters, group: Group, fy: number): string {
  const types = [...new Set(cal.activities.map((a) => a.type))].sort();
  const teams = [...new Set(cal.activities.flatMap((a) => a.team_asks.map((t) => t.team)))].sort();
  const tab = (q: 0 | 1 | 2 | 3 | 4, label: string) =>
    `<button data-act="quarter" data-q="${q}" aria-pressed="${f.quarter === q}">${label}</button>`;
  const fwOpts = cal.frameworks.map((x) => `<option value="${esc(x.id)}"${x.id === f.framework ? ' selected' : ''}>${esc(x.name)}</option>`).join('');
  return `<section class="controls" aria-label="Filters">
    <div class="seg" role="group" aria-label="Quarter">${tab(0, `FY${fy}`)}${tab(1, 'Q1')}${tab(2, 'Q2')}${tab(3, 'Q3')}${tab(4, 'Q4')}</div>
    <div class="row-ctl">
      <input id="search" class="field" type="search" placeholder="Search activities" aria-label="Search activities" value="${esc(f.search ?? '')}">
      <select id="f-type" class="field" aria-label="Type">${opts(types, f.type, 'All types')}</select>
      <select id="f-team" class="field" aria-label="Team">${opts(teams, f.team, 'All teams')}</select>
      <select id="f-fw" class="field" aria-label="Framework"><option value="">All frameworks</option>${fwOpts}</select>
      <select id="f-status" class="field" aria-label="Status"><option value="">All statuses</option>${(['planned', 'in_progress', 'done'] as const)
        .map((s) => `<option value="${s}"${s === f.status ? ' selected' : ''}>${STATUS_LABEL[s]}</option>`)
        .join('')}</select>
      <select id="f-group" class="field" aria-label="Group by">${(['none', 'type', 'team', 'framework'] as const)
        .map((g) => `<option value="${g}"${g === group ? ' selected' : ''}>${g === 'none' ? 'No grouping' : `Group by ${g}`}</option>`)
        .join('')}</select>
      <button data-act="clear" class="link">Clear filters</button>
    </div></section>`;
}

export function renderFrameworks(cal: Calendar, f: Filters): string {
  return `<section class="fws" aria-label="Frameworks"><h2>Frameworks</h2><div class="seg chips">${cal.frameworks
    .map(
      (x) =>
        `<button data-act="fw" data-id="${esc(x.id)}" aria-pressed="${f.framework === x.id}" title="${esc(x.note ?? '')}">${esc(x.name)}<small>${FRAMEWORK_STATUS_LABEL[x.status]}</small></button>`,
    )
    .join('')}</div></section>`;
}

export function renderTbc(rows: Row[]): string {
  if (!rows.length) return '';
  return `<section class="tbc" aria-label="Dates to be confirmed"><h2>Dates to be confirmed</h2><ul>${rows
    .map((r) => `<li><button class="link" data-act="select" data-id="${esc(r.activity.id)}">${esc(r.activity.name)}</button> <span class="muted">${esc(r.activity.type)} · ${esc(r.activity.cadence)}</span></li>`)
    .join('')}</ul></section>`;
}
