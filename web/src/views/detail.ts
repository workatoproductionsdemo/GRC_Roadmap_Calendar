import type { Calendar } from '../data/types';
import type { Filters, Row } from '../engine/query';
import { esc, FRAMEWORK_STATUS_LABEL, fmtRange, SOURCE_LABEL, STATUS_LABEL } from './html';

const list = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : `<p class="muted">Not specified.</p>`);

export function renderDetail(row: Row, cal: Calendar, f: Filters): string {
  const a = row.activity;
  // Team filter narrows the asks to that team only.
  const asks = a.team_asks.filter((t) => !f.team || t.team === f.team);
  const fws = cal.frameworks.filter((x) => a.frameworks.includes(x.id));
  const windows = row.windows.length
    ? `<ul class="wins">${row.windows
        .map(
          (w) => `<li><span class="pill s-${w.status}">${STATUS_LABEL[w.status]}</span>
            <strong>${esc(w.period)}</strong> ${esc(fmtRange(w.start, w.end))}
            <span class="muted">· ${w.basis === 'confirmed' ? 'Confirmed' : 'Indicative'} · source: ${SOURCE_LABEL[w.status_source]}${w.jira_key ? ` · ${esc(w.jira_key)}` : ''}</span>
            ${w.notes ? `<div class="muted">${esc(w.notes)}</div>` : ''}</li>`,
        )
        .join('')}</ul>`
    : `<p class="muted">Dates to be confirmed.</p>`;

  return `<aside class="detail" aria-labelledby="d-title">
    <div class="d-head"><h2 id="d-title">${esc(a.name)}</h2>
      <button class="close" data-act="close" aria-label="Close details">×</button></div>
    <p class="muted">${esc(a.type)} · ${esc(a.cadence)} · owner ${esc(a.owner)} · <a href="mailto:${esc(a.grc_contact)}">${esc(a.grc_contact)}</a></p>
    <p>${esc(a.summary)}</p>
    <h3>Windows</h3>${windows}
    <h3>Why it's required</h3>${list(a.drivers)}
    <h3>What's required</h3>${list(a.requirements)}
    <h3>Team asks${f.team ? ` — ${esc(f.team)}` : ''}</h3>
    ${asks.length ? `<ul>${asks.map((t) => `<li><strong>${esc(t.team)}:</strong> ${esc(t.ask)}</li>`).join('')}</ul>` : `<p class="muted">None.</p>`}
    <h3>Evidence</h3>${list(a.evidence)}
    <h3>Frameworks</h3>
    ${fws.length ? `<p>${fws.map((x) => `<span class="chip-s">${esc(x.name)} <small>${FRAMEWORK_STATUS_LABEL[x.status]}</small></span>`).join(' ')}</p>` : `<p class="muted">None.</p>`}
  </aside>`;
}
