/*
 * Check-In / Check-Out Timings panel
 * Shared by the Super Admin portal (all companies), the Company Admin portal and the
 * Organization Enterprise portal (all employees of one company).
 *
 * Usage:
 *   const panel = CheckinCheckoutPanel.mount(document.getElementById('timings-panel'), {
 *     endpoint: '/api/company/checkin-checkout',
 *     extraParams: () => ({ company_id: currentCompanyId }),   // optional
 *     showCompany: false,                                       // true = company column + picker
 *     companies: [],                                            // [{company_id, name}] for picker
 *     csvPrefix: 'company'
 *   });
 *   panel.reload();
 */
(function () {
  'use strict';

  const STATE_META = {
    CHECKED_IN:       { label: 'Checked In',        badge: 'badge-emerald', chip: 'On Duty' },
    PENDING_APPROVAL: { label: 'Awaiting Approval', badge: 'badge-amber',   chip: 'Awaiting Approval' },
    CHECKED_OUT:      { label: 'Checked Out',       badge: 'badge-indigo',  chip: 'Checked Out' },
    MISSED_CHECK_OUT: { label: 'Missed Check-Out',  badge: 'badge-rose',    chip: 'Missed Check-Out' },
    MISSING_CHECK_IN: { label: 'Missing Check-In',  badge: 'badge-rose',    chip: 'Missing Check-In' },
    REJECTED:         { label: 'Rejected',          badge: 'badge-rose',    chip: 'Rejected' },
    ON_LEAVE:         { label: 'On Leave',          badge: 'badge-purple',  chip: 'On Leave' },
    NOT_CHECKED_IN:   { label: 'Not Checked In',    badge: 'badge-neutral', chip: 'Not Checked In' }
  };
  const CHIP_ORDER = ['CHECKED_IN', 'CHECKED_OUT', 'NOT_CHECKED_IN', 'PENDING_APPROVAL', 'MISSED_CHECK_OUT', 'MISSING_CHECK_IN', 'ON_LEAVE', 'REJECTED'];

  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  /** "17:05:09" -> "05:05 PM" */
  function fmtClock(t) {
    if (!t || typeof t !== 'string') return '';
    const p = t.split(':');
    let h = parseInt(p[0], 10);
    const m = (p[1] || '00').padStart(2, '0');
    if (isNaN(h)) return t;
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }

  function fmtDate(d) {
    if (!d) return '';
    const dt = new Date(d + 'T00:00:00');
    if (isNaN(dt)) return d;
    return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'short' });
  }

  function isoDay(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const css = `
      .cico-panel { display:flex; flex-direction:column; gap:14px; }
      .cico-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; }
      .cico-filters { display:flex; flex-wrap:wrap; gap:8px; align-items:center; flex:1; min-width:0; }
      .cico-filters .form-input, .cico-filters .form-select { width:auto; min-width:0; padding:7px 12px; font-size:12.5px; }
      .cico-filters .cico-search { width:220px; max-width:100%; }
      .cico-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
      .cico-btn { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; font-size:12.5px; font-weight:600;
        border-radius:8px; border:1px solid var(--border-medium); background:var(--bg-surface); color:var(--text-primary);
        cursor:pointer; white-space:nowrap; font-family:inherit; text-decoration:none; }
      .cico-btn:hover { background:var(--bg-elevated); }
      .cico-btn.active { border-color:var(--indigo); color:var(--indigo); }
      .cico-btn-accent { background:linear-gradient(135deg, var(--indigo), var(--indigo-dark, #4F46E5)); color:#FFF; border-color:transparent; }
      .cico-btn-accent:hover { filter:brightness(1.08); background:linear-gradient(135deg, var(--indigo), var(--indigo-dark, #4F46E5)); }
      .cico-scope { font-size:12px; color:var(--text-muted); }
      .cico-chips { display:flex; flex-wrap:wrap; gap:8px; }
      .cico-chip { display:flex; flex-direction:column; gap:2px; min-width:112px; padding:10px 14px; border-radius:10px;
        border:1px solid var(--border-subtle); background:var(--bg-surface); cursor:pointer; text-align:left; font-family:inherit; color:var(--text-primary); }
      .cico-chip:hover { border-color:var(--border-medium); }
      .cico-chip.active { border-color:var(--indigo); box-shadow:0 0 0 2px rgba(99,102,241,0.25); }
      .cico-chip-num { font-size:20px; font-weight:800; font-family:var(--font-mono, monospace); line-height:1.1; }
      .cico-chip-label { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:var(--text-muted); }
      .cico-time { font-family:var(--font-mono, monospace); font-weight:700; font-size:13px; white-space:nowrap; }
      .cico-time-in { color:var(--emerald); }
      .cico-time-out { color:var(--indigo); }
      .cico-muted { color:var(--text-muted); font-size:12px; }
      .cico-sub { font-size:11px; color:var(--text-muted); margin-top:2px; }
      .cico-late { display:inline-block; margin-left:6px; padding:1px 6px; font-size:9.5px; font-weight:800; border-radius:6px;
        color:var(--amber); border:1px solid rgba(245,158,11,0.4); background:rgba(245,158,11,0.12); vertical-align:middle; }
      .cico-live { display:inline-block; width:7px; height:7px; border-radius:50%; background:var(--emerald); margin-right:6px;
        box-shadow:0 0 0 0 rgba(16,185,129,0.6); animation:cicoPulse 1.6s infinite; vertical-align:middle; }
      @keyframes cicoPulse { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.55);} 70%{box-shadow:0 0 0 7px rgba(16,185,129,0);} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0);} }
      .cico-table td { vertical-align:middle; }
      .cico-empty { text-align:center; padding:28px 12px; color:var(--text-muted); font-size:13px; }
      .cico-error { color:var(--rose); }
      @media (max-width: 640px) { .cico-filters .cico-search { width:100%; } .cico-chip { min-width:calc(50% - 4px); } }
    `;
    const style = document.createElement('style');
    style.id = 'cico-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function mount(container, options) {
    if (!container) return null;
    injectStyles();
    const opts = Object.assign({
      endpoint: '/api/company/checkin-checkout',
      extraParams: null,
      showCompany: false,
      companies: [],
      csvPrefix: 'timings',
      emptyText: 'No employees found for this day.'
    }, options || {});

    const uid = 'cico' + Math.random().toString(36).slice(2, 8);
    const state = { stateFilter: '', lastData: null, loading: false, pending: false, searchTimer: null };

    container.innerHTML = `
      <div class="cico-panel">
        <div class="cico-toolbar">
          <div class="cico-filters">
            <input type="date" class="form-input" id="${uid}-date" title="Pick a day (leave empty for today)">
            <button type="button" class="cico-btn active" id="${uid}-today">Today</button>
            <button type="button" class="cico-btn" id="${uid}-yday">Yesterday</button>
            ${opts.showCompany ? `<select class="form-select" id="${uid}-company" style="max-width:240px;"><option value="">All Companies</option></select>` : ''}
            <input type="text" class="form-input cico-search" id="${uid}-search" placeholder="Search employee, ID${opts.showCompany ? ', company' : ''}...">
          </div>
          <div class="cico-actions">
            <span class="cico-scope" id="${uid}-scope"></span>
            <button type="button" class="cico-btn" id="${uid}-refresh" title="Reload timings">🔄 Refresh</button>
            <button type="button" class="cico-btn cico-btn-accent" id="${uid}-csv" title="Download as CSV">📥 Export CSV</button>
          </div>
        </div>
        <div class="cico-chips" id="${uid}-chips"></div>
        <div class="table-container">
          <table class="cico-table">
            <thead>
              <tr>
                ${opts.showCompany ? '<th>Company</th>' : ''}
                <th>Employee</th>
                <th>Department</th>
                <th>Date</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Worked</th>
                <th>Status</th>
                <th>Method</th>
              </tr>
            </thead>
            <tbody id="${uid}-body">
              <tr><td colspan="${opts.showCompany ? 9 : 8}" class="cico-empty">Loading check-in / check-out timings...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const el = (s) => container.querySelector('#' + uid + '-' + s);
    const dateInput = el('date');
    const companySelect = opts.showCompany ? el('company') : null;
    const searchInput = el('search');
    const colspan = opts.showCompany ? 9 : 8;

    function setCompanies(list) {
      if (!companySelect) return;
      const current = companySelect.value;
      companySelect.innerHTML = '<option value="">All Companies</option>' + (list || []).map(c =>
        `<option value="${esc(c.company_id)}">${esc(c.name || c.company_id)} (${esc(c.company_id)})</option>`).join('');
      companySelect.value = current;
    }

    function syncDayButtons() {
      el('today').classList.toggle('active', !dateInput.value);
      el('yday').classList.toggle('active', dateInput.value === isoDay(-1));
    }

    function buildParams(forCsv) {
      const p = new URLSearchParams();
      if (dateInput.value) p.set('date', dateInput.value);
      if (companySelect && companySelect.value) p.set('company_id', companySelect.value);
      const extra = typeof opts.extraParams === 'function' ? (opts.extraParams() || {}) : {};
      Object.keys(extra).forEach(k => { if (extra[k]) p.set(k, extra[k]); });
      const q = searchInput.value.trim();
      if (q) p.set('search', q);
      if (state.stateFilter) p.set('state', state.stateFilter);
      if (forCsv) p.set('format', 'csv');
      return p;
    }

    function renderChips(summary) {
      const chips = [`
        <button type="button" class="cico-chip ${state.stateFilter ? '' : 'active'}" data-state="">
          <span class="cico-chip-num">${summary.total || 0}</span><span class="cico-chip-label">All Employees</span>
        </button>`];
      CHIP_ORDER.forEach(key => {
        const n = summary[key.toLowerCase()] || 0;
        if (!n && !['CHECKED_IN', 'CHECKED_OUT', 'NOT_CHECKED_IN'].includes(key)) return;
        chips.push(`
          <button type="button" class="cico-chip ${state.stateFilter === key ? 'active' : ''}" data-state="${key}">
            <span class="cico-chip-num">${n}</span><span class="cico-chip-label">${STATE_META[key].chip}</span>
          </button>`);
      });
      if (summary.late) {
        chips.push(`<div class="cico-chip" style="cursor:default;"><span class="cico-chip-num" style="color:var(--amber);">${summary.late}</span><span class="cico-chip-label">Late Arrivals</span></div>`);
      }
      el('chips').innerHTML = chips.join('');
      el('chips').querySelectorAll('button[data-state]').forEach(btn => {
        btn.addEventListener('click', () => {
          const s = btn.getAttribute('data-state');
          state.stateFilter = (state.stateFilter === s) ? '' : s;
          reload();
        });
      });
    }

    function renderRows(rows) {
      const body = el('body');
      if (!rows.length) {
        body.innerHTML = `<tr><td colspan="${colspan}" class="cico-empty">${esc(opts.emptyText)}</td></tr>`;
        return;
      }
      body.innerHTML = rows.map(r => {
        const meta = STATE_META[r.state] || { label: r.state_label || r.state, badge: 'badge-neutral' };
        const inCell = r.check_in
          ? `<span class="cico-time cico-time-in" title="${esc(r.check_in)} (${esc(r.timezone)})">${fmtClock(r.check_in)}</span>${r.is_late ? '<span class="cico-late">LATE</span>' : ''}`
          : '<span class="cico-muted">—</span>';
        let outCell;
        if (r.check_out) {
          outCell = `<span class="cico-time cico-time-out" title="${esc(r.check_out)} (${esc(r.timezone)})">${fmtClock(r.check_out)}</span>`;
        } else if (r.state === 'CHECKED_IN') {
          outCell = '<span class="cico-muted"><span class="cico-live"></span>On duty</span>';
        } else if (r.state === 'MISSED_CHECK_OUT') {
          outCell = '<span class="cico-muted" style="color:var(--rose);">Not punched</span>';
        } else {
          outCell = '<span class="cico-muted">—</span>';
        }
        const worked = r.worked
          ? `<span class="cico-time">${esc(r.worked)}</span>${r.is_live ? '<div class="cico-sub">so far</div>' : ''}`
          : '<span class="cico-muted">—</span>';
        const methods = (r.methods || []).length
          ? (r.methods || []).map(m => `<span class="badge badge-neutral" style="font-size:10.5px; margin:1px 2px 1px 0;">${esc(m)}</span>`).join('')
          : '<span class="cico-muted">—</span>';
        const extra = [];
        if (r.attendance_status && !['Completed', 'Pending Approval'].includes(r.attendance_status) && r.state !== 'ON_LEAVE') extra.push(esc(r.attendance_status));
        if (r.rejected_count) extra.push(`${r.rejected_count} rejected punch${r.rejected_count > 1 ? 'es' : ''}`);
        return `
          <tr>
            ${opts.showCompany ? `<td><strong style="color:var(--text-primary);">${esc(r.company_name)}</strong><div class="cico-sub" style="font-family:var(--font-mono, monospace); color:var(--cyan);">${esc(r.company_id)}</div></td>` : ''}
            <td><strong style="color:var(--text-primary);">${esc(r.name)}</strong><div class="cico-sub" style="font-family:var(--font-mono, monospace);">${esc(r.emp_id)}</div></td>
            <td>${esc(r.department)}<div class="cico-sub">${esc(r.work_type)}</div></td>
            <td style="white-space:nowrap;">${esc(fmtDate(r.date))}</td>
            <td>${inCell}</td>
            <td>${outCell}</td>
            <td>${worked}</td>
            <td><span class="badge ${meta.badge}" style="white-space:nowrap;">${esc(meta.label)}</span>${extra.length ? `<div class="cico-sub">${extra.join(' · ')}</div>` : ''}</td>
            <td>${methods}</td>
          </tr>`;
      }).join('');
    }

    function renderScope(data) {
      let txt = '';
      if (data.mode === 'today') {
        txt = (data.dates && data.dates.length === 1) ? `Today • ${fmtDate(data.dates[0])}` : 'Today (each company\'s local date)';
      } else if (data.mode === 'date') {
        txt = fmtDate(data.date);
      } else if (data.mode === 'range') {
        txt = `${data.date_from} → ${data.date_to}`;
      }
      el('scope').textContent = `${txt} • ${data.count} row${data.count === 1 ? '' : 's'}${data.truncated ? ' (truncated)' : ''}`;
    }

    async function reload() {
      if (state.loading) { state.pending = true; return; }
      state.loading = true;
      state.pending = false;
      syncDayButtons();
      try {
        const res = await fetch(`${opts.endpoint}?${buildParams(false).toString()}`, { credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          el('body').innerHTML = `<tr><td colspan="${colspan}" class="cico-empty cico-error">${esc(data.error || 'Could not load timings (HTTP ' + res.status + ')')}</td></tr>`;
          return;
        }
        state.lastData = data;
        renderChips(data.summary || {});
        renderRows(data.rows || []);
        renderScope(data);
      } catch (err) {
        el('body').innerHTML = `<tr><td colspan="${colspan}" class="cico-empty cico-error">Network error while loading timings.</td></tr>`;
      } finally {
        state.loading = false;
        if (state.pending) reload();
      }
    }

    el('today').addEventListener('click', () => { dateInput.value = ''; reload(); });
    el('yday').addEventListener('click', () => { dateInput.value = isoDay(-1); reload(); });
    dateInput.addEventListener('change', reload);
    if (companySelect) companySelect.addEventListener('change', reload);
    searchInput.addEventListener('input', () => {
      clearTimeout(state.searchTimer);
      state.searchTimer = setTimeout(reload, 300);
    });
    el('refresh').addEventListener('click', reload);
    el('csv').addEventListener('click', () => {
      window.location.href = `${opts.endpoint}?${buildParams(true).toString()}`;
    });

    setCompanies(opts.companies);
    return { reload, setCompanies };
  }

  window.CheckinCheckoutPanel = { mount, fmtClock, fmtDate };
})();
