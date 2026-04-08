/* ─────────────────────────────────────────────
   Redix · Data Migration Dashboard — app.js
   ───────────────────────────────────────────── */

// ── Company config ────────────────────────────
const COMPANY_COLORS = {
  REC:          '#3b82f6',
  RUS:          '#14b8a6',
  RMX:          '#8b5cf6',
  RBR:          '#f59e0b',
  PhotosCas:    '#ec4899',
  PhotosProxxi: '#06b6d4'
};

// ── Helpers ───────────────────────────────────

/** Format a number with comma separators. */
function formatNumber(n) {
  if (n === null || n === undefined) return null;
  return Number(n).toLocaleString('en-US');
}

/**
 * Return a formatted value string, or null if the value is null/undefined.
 * Used so callers can decide whether to show Pending or the actual number.
 */
function renderValue(value) {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? formatNumber(value) : String(value);
}

/** Returns the HTML for a "Pending *" badge. */
function renderPending() {
  return '<span class="badge badge-pending" style="font-size:10px;padding:2px 7px">Pending <sup>*</sup></span>';
}

/** Returns the HTML for a status badge. */
function renderBadge(status) {
  const map = {
    done:    '<span class="badge badge-done">Done</span>',
    working: '<span class="badge badge-working">Working On It</span>',
    pending: '<span class="badge badge-pending">Pending</span>'
  };
  return map[status] || map.pending;
}

/** Returns an inline company dot element. */
function companyDot(company) {
  const color = COMPANY_COLORS[company] || '#94a3b8';
  return `<div class="company-dot" style="background:${color}"></div>`;
}

/** Set textContent of an element by ID (no-op if missing). */
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/** Set innerHTML of an element by ID (no-op if missing). */
function setHTML(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

/** Set a CSS property on an element by ID (no-op if missing). */
function setStyle(id, prop, value) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = value;
}

// ── Stats ─────────────────────────────────────
function renderStats(stats) {
  const { totalItems, completed, inProgress, pending } = stats;

  setText('stat-total-val',    totalItems);
  setText('stat-done-val',     completed);
  setText('stat-working-val',  inProgress);
  setText('stat-pending-val',  pending);

  setText('stat-done-pct',    `${Math.round(completed   / totalItems * 100)}% of total`);
  setText('stat-working-pct', `${Math.round(inProgress  / totalItems * 100)}% of total`);
  setText('stat-pending-pct', `${Math.round(pending     / totalItems * 100)}% of total`);

  // Legend
  setText('legend-done',    completed);
  setText('legend-working', inProgress);
  setText('legend-pending', pending);
}

// ── Overall progress breakdown ─────────────────
function renderProgressBreakdown(data) {
  // Config items: done/working percentages
  const total = data.stats.totalItems;
  const donePct    = (data.stats.completed  / total * 100).toFixed(1);
  const workingPct = (data.stats.inProgress / total * 100).toFixed(1);

  // Products: REC migrated / grand total
  const prodEntries = Object.values(data.products);
  const prodTotal   = prodEntries.reduce((s, v) => s + (v ? v.total    : 0), 0);
  const prodMigrated= prodEntries.reduce((s, v) => s + (v ? v.migrated : 0), 0);

  // Photos: all pending
  const photoTotal = Object.values(data.photos).reduce((s, v) => s + (v ? v.total : 0), 0);

  // Storage: done vs total
  const storageEntries = Object.values(data.storage);
  const storageTotal   = storageEntries.reduce((s, v) => s + v.gb, 0);
  const storageDone    = storageEntries.filter(v => v.status === 'done').reduce((s, v) => s + v.gb, 0);
  const storagePct     = (storageDone / storageTotal * 100).toFixed(0);

  const rows = [
    {
      label:    'Config Items',
      barHTML:  `<div style="width:${donePct}%;height:100%;background:var(--success)"></div>
                 <div style="width:${workingPct}%;height:100%;background:var(--warning)"></div>`,
      valueHTML:`<span style="font-size:11px;font-weight:700;color:var(--success)">${donePct}% done</span>`,
      overflow: true
    },
    {
      label:    'Products',
      barHTML:  `<div style="width:${Math.max(prodMigrated / prodTotal * 100, 0.02).toFixed(3)}%;min-width:3px;height:100%;background:var(--warning);border-radius:99px"></div>`,
      valueHTML:`<span style="font-size:11px;font-weight:700;color:var(--warning)">${formatNumber(prodMigrated)} / ${Math.round(prodTotal/1000)}K</span>`,
      overflow: true
    },
    {
      label:    'Photos (Records)',
      barHTML:  '',
      valueHTML:`<span style="font-size:11px;font-weight:600;color:var(--text-muted)">0 / ${Math.round(photoTotal/1000)}K</span>`,
      overflow: false
    },
    {
      label:    'Storage',
      barHTML:  `<div style="width:${storagePct}%;height:100%;background:var(--success);border-radius:99px"></div>`,
      valueHTML:`<span style="font-size:11px;font-weight:700;color:var(--success)">${storagePct}% <span style="font-weight:400;color:var(--text-muted)">(${formatNumber(storageDone)} GB)</span></span>`,
      overflow: true
    },
    {
      label:    'Clients & Vendors',
      barHTML:  `<div style="width:2px;height:100%;background:var(--warning);border-radius:99px"></div>`,
      valueHTML:`<span style="font-size:11px;font-weight:700;color:var(--warning)">In progress</span>`,
      overflow: true
    },
    {
      label:    'Contacts',
      barHTML:  '',
      valueHTML:`<span style="font-size:11px;font-weight:600;color:var(--text-muted)">Pending</span>`,
      overflow: false
    }
  ];

  const html = rows.map(r => `
    <div style="display:grid;grid-template-columns:160px 1fr 120px;align-items:center;gap:12px">
      <span style="font-size:11px;font-weight:600;color:var(--text-secondary)">${r.label}</span>
      <div style="height:7px;background:var(--surface);border-radius:99px;${r.overflow ? 'overflow:hidden;' : ''}display:flex">${r.barHTML}</div>
      <div style="text-align:right">${r.valueHTML}</div>
    </div>`).join('');

  setHTML('progress-breakdown', html);
}

// ── Migration items table ──────────────────────
function renderMigrationItems(items) {
  setText('migration-items-count', `${items.length} items`);

  const rows = items.map(item => `
    <tr>
      <td class="item-name">${item.name}</td>
      <td>${renderBadge(item.status)}</td>
    </tr>`).join('');

  setHTML('migration-items-tbody', rows);
}

// ── Volume: Products ───────────────────────────
function renderProducts(products) {
  const entries = Object.entries(products);
  const grandTotal = entries.reduce((s, [, v]) => s + (v ? v.total : 0), 0);

  let rowsHTML = entries.map(([company, data], i) => {
    const isLast  = i === entries.length - 1;
    const border  = isLast ? 'border-bottom:none' : '';

    if (!data || data.status === 'pending') {
      return `
        <div class="volume-row" style="flex-direction:column;align-items:stretch;gap:5px;padding:8px 12px;${border}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="volume-company">${companyDot(company)}${company}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge badge-pending" style="font-size:10px;padding:2px 7px">Pending</span>
              <div class="volume-num">${data ? formatNumber(data.total) : '—'}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:5px;background:var(--surface);border-radius:99px"></div>
            <span style="font-size:10px;color:var(--text-muted);font-weight:500">Not started</span>
          </div>
        </div>`;
    }

    const pct = data.total > 0 ? Math.max(data.migrated / data.total * 100, 0.065).toFixed(3) : 0;
    return `
      <div class="volume-row" style="flex-direction:column;align-items:stretch;gap:5px;padding:8px 12px;${border}">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="volume-company">${companyDot(company)}${company}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge badge-working" style="font-size:10px;padding:2px 7px">Working On It</span>
            <div class="volume-num">${formatNumber(data.total)}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:5px;background:var(--surface);border-radius:99px;overflow:hidden">
            <div style="width:${pct}%;min-width:3px;height:100%;background:var(--warning);border-radius:99px"></div>
          </div>
          <span style="font-size:10px;color:var(--warning);font-weight:600;white-space:nowrap">${formatNumber(data.migrated)} migrated</span>
        </div>
      </div>`;
  }).join('');

  setHTML('volume-products-rows', rowsHTML);
  setText('volume-products-total', formatNumber(grandTotal));
}

// ── Volume: Photos ─────────────────────────────
function renderPhotos(photos) {
  const entries = Object.entries(photos);
  const grandTotal = entries.reduce((s, [, v]) => s + (v ? v.total : 0), 0);

  const rowsHTML = entries.map(([company, data], i) => {
    const isLast = i === entries.length - 1;
    const border = isLast ? 'border-bottom:none' : '';
    const num    = data ? formatNumber(data.total) : '—';
    return `
      <div class="volume-row" style="${border}">
        <div class="volume-company">${companyDot(company)}${company}</div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge badge-pending" style="font-size:10px;padding:2px 7px">Pending</span>
          <div class="volume-num">${num}</div>
        </div>
      </div>`;
  }).join('');

  setHTML('volume-photos-rows', rowsHTML);
  setText('volume-photos-total', formatNumber(grandTotal));
}

// ── Volume: Storage ────────────────────────────
function renderStorage(storage) {
  const entries   = Object.entries(storage);
  const totalGB   = entries.reduce((s, [, v]) => s + v.gb, 0);
  const doneGB    = entries.filter(([, v]) => v.status === 'done').reduce((s, [, v]) => s + v.gb, 0);
  const donePct   = (doneGB / totalGB * 100).toFixed(1);

  const rowsHTML = entries.map(([company, data], i) => {
    const isLast = i === entries.length - 1;
    const border = isLast ? 'border-bottom:none' : '';

    if (data.status === 'done') {
      return `
        <div class="volume-row" style="flex-direction:column;align-items:stretch;gap:5px;padding:8px 12px;${border}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="volume-company">${companyDot(company)}${company}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge badge-done" style="font-size:10px;padding:2px 7px">Done</span>
              <div class="volume-num">${formatNumber(data.gb)} <span class="volume-sub">GB</span></div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:5px;background:var(--surface);border-radius:99px;overflow:hidden">
              <div style="width:100%;height:100%;background:var(--success);border-radius:99px"></div>
            </div>
            <span style="font-size:10px;color:var(--success);font-weight:600">100%</span>
          </div>
        </div>`;
    }

    return `
      <div class="volume-row" style="flex-direction:column;align-items:stretch;gap:5px;padding:8px 12px;${border}">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="volume-company">${companyDot(company)}${company}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge badge-pending" style="font-size:10px;padding:2px 7px">Pending</span>
            <div class="volume-num">${formatNumber(data.gb)} <span class="volume-sub">GB</span></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="flex:1;height:5px;background:var(--surface);border-radius:99px"></div>
          <span style="font-size:10px;color:var(--text-muted);font-weight:500">Not started</span>
        </div>
      </div>`;
  }).join('');

  setHTML('volume-storage-rows', rowsHTML);
  setText('volume-storage-total', `${totalGB % 1 === 0 ? formatNumber(totalGB) : totalGB.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} GB`);
  setStyle('storage-done-bar', 'width', `${donePct}%`);
  setText('storage-done-label', `${formatNumber(doneGB)} GB completed`);
}

// ── Clients / Vendors / Contacts ───────────────

function renderCompanyGrid(containerId, entries, renderCell) {
  const cells = entries.map(([company, data], i) => {
    const borderLeft = i > 0 ? 'border-left:1px solid var(--border);' : '';
    const opacity    = data === null ? 'opacity:0.7;' : '';
    return `<div class="split-cell" style="${borderLeft}${opacity}">${renderCell(company, data)}</div>`;
  }).join('');

  const html = `
    <div class="split-grid" style="margin:8px 16px 12px;border-radius:8px;overflow:hidden;border:1px solid var(--border);grid-template-columns:repeat(${entries.length},1fr)">
      ${cells}
    </div>`;
  setHTML(containerId, html);
}

function renderClients(clients) {
  renderCompanyGrid('clients-grid', Object.entries(clients), (company, data) => {
    if (data === null) return `
      <div class="split-company">${companyDot(company)}${company}</div>
      <div style="display:inline-flex;margin-top:6px">${renderPending()}</div>
      <div class="split-sub" style="margin-top:4px">Not available yet</div>`;

    const activeLine = data.active
      ? `<div class="split-extra">${formatNumber(data.active)} active</div>`
      : `<div class="split-sub">Total clients</div>`;

    return `
      <div class="split-company">${companyDot(company)}${company}</div>
      <div class="split-num">${formatNumber(data.total)}</div>
      ${activeLine}`;
  });
}

function renderVendors(vendors) {
  renderCompanyGrid('vendors-grid', Object.entries(vendors), (company, data) => {
    if (data === null) return `
      <div class="split-company">${companyDot(company)}${company}</div>
      <div style="display:inline-flex;margin-top:6px">${renderPending()}</div>
      <div class="split-sub" style="margin-top:4px">Not available yet</div>`;

    return `
      <div class="split-company">${companyDot(company)}${company}</div>
      <div class="split-num">${formatNumber(data.total)}</div>
      <div class="split-extra">${formatNumber(data.active)} active</div>`;
  });
}

function renderContacts(contacts) {
  renderCompanyGrid('contacts-grid', Object.entries(contacts), (company, data) => {
    if (data === null) return `
      <div class="split-company">${companyDot(company)}${company}</div>
      <div style="display:inline-flex;margin-top:6px">${renderPending()}</div>
      <div class="split-sub" style="margin-top:4px">Not available yet</div>`;

    return `
      <div class="split-company">${companyDot(company)}${company}</div>
      <div class="split-num">${formatNumber(data)}</div>
      <div class="split-sub">Total contacts</div>`;
  });
}

// ── Open Orders ────────────────────────────────
function renderOrders(orders) {
  const companies  = Object.keys(orders);
  const recData    = orders.REC;
  const otherComps = companies.filter(c => c !== 'REC' && orders[c] === null);

  // REC known orders
  const recCards = `
    <div style="padding:10px 16px 0;display:flex;align-items:center;gap:8px">
      ${companyDot('REC')}
      <span style="font-size:11px;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.4px">REC</span>
      <span class="badge badge-working" style="font-size:10px;padding:2px 7px">Known</span>
    </div>
    <div class="orders-grid" style="padding-top:8px">
      <div class="order-card" style="border-color:#bfdbfe;background:#eff6ff">
        <div class="order-num" style="color:var(--primary-dark)">${recData.SO}</div>
        <div class="order-label">Sales Orders</div>
        <div class="order-sub">Open sales orders</div>
      </div>
      <div class="order-card" style="border-color:#fed7aa;background:#fff7ed">
        <div class="order-num" style="color:var(--warning)">${recData.PO}</div>
        <div class="order-label">Purchase Orders</div>
        <div class="order-sub">Open purchase orders</div>
      </div>
      <div class="order-card" style="border-color:#d1fae5;background:#ecfdf5">
        <div class="order-num" style="color:var(--success)">${recData.Quotes}</div>
        <div class="order-label">Quotes</div>
        <div class="order-sub">Open quotes</div>
      </div>
    </div>
    <div class="orders-detail">
      <div class="orders-detail-title">Sales Orders IDs</div>
      <div class="order-ids" style="margin-bottom:12px">
        ${recData.SOIds.map(id => `<span class="order-id-tag">${id}</span>`).join('')}
      </div>
      <div class="orders-detail-title">Purchase Orders IDs</div>
      <div class="order-ids" style="margin-bottom:16px">
        ${recData.POIds.map(id => `<span class="order-id-tag">${id}</span>`).join('')}
      </div>
    </div>`;

  // Other companies: pending
  const otherRows = otherComps.map(company => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--surface);border-radius:7px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:var(--text-primary)">
        ${companyDot(company)}${company}
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10.5px;color:var(--text-secondary)">Sales · Purchase · Quotes</span>
        ${renderPending()}
      </div>
    </div>`).join('');

  const otherBlock = otherComps.length ? `
    <div style="border-top:1px solid var(--border);margin:0 16px 16px;padding-top:12px">
      <div style="font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:10px">Other Companies</div>
      <div style="display:flex;flex-direction:column;gap:7px">${otherRows}</div>
    </div>` : '';

  setHTML('orders-content', recCards + otherBlock);

  // Header badge
  setText('orders-companies-badge', companies.join(' · '));
}


/* ═══════════════════════════════════════════════
   TEAM PERFORMANCE DASHBOARD MODULE
   ═══════════════════════════════════════════════ */

const TEAM_COLORS = ['#2563eb','#16a34a','#f59e0b','#dc2626','#8b5cf6','#06b6d4','#ec4899','#f97316','#14b8a6'];

/** Switch between migration and team views */
function switchView(view) {
  var mv = document.getElementById('migration-view');
  var tv = document.getElementById('team-view');
  if (mv) mv.style.display = (view === 'migration') ? '' : 'none';
  if (tv) tv.style.display = (view === 'team') ? '' : 'none';
  document.querySelectorAll('.view-tab').forEach(function(t) {
    t.classList.toggle('active', t.dataset.view === view);
  });
}

const TeamDashboard = (function() {
  var allReports = [];
  var currentReport = null;
  var currentFilter = 'all';
  var currentSort = 'load';
  var cachedStats = null;

  /* ── helpers ── */
  function shortName(name) { return name.split(' ').slice(0, 2).join(' '); }
  function pctColor(p)     { return p >= 80 ? '#16a34a' : p >= 60 ? '#ca8a04' : '#dc2626'; }
  function pctClass(p)     { return p >= 80 ? 'green' : p >= 60 ? 'yellow' : 'red'; }

  /** roundRect polyfill for older browsers */
  function roundedRect(ctx, x, y, w, h, r) {
    if (w <= 0) return;
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  /* ── 1. loadData ── */
  function loadData(reports) {
    allReports = reports.slice().sort(function(a, b) { return b.date.localeCompare(a.date); });
    var sel = document.getElementById('team-date-select');
    if (sel) {
      sel.innerHTML = allReports.map(function(r) {
        return '<option value="' + r.date + '">' + r.dateLabel + '</option>';
      }).join('');
      sel.onchange = function() { selectDate(this.value); };
    }
    if (allReports.length > 0) selectDate(allReports[0].date);
  }

  /* ── 2. selectDate ── */
  function selectDate(dateStr) {
    currentReport = allReports.find(function(r) { return r.date === dateStr; });
    if (!currentReport) return;
    cachedStats = calcStats(currentReport);
    renderAll();
  }

  /* ── 3. calcStats ── */
  function calcStats(report) {
    var perPerson = {};
    var totalTasks = 0, totalDone = 0, totalPending = 0, totalImprevista = 0, totalColab = 0;

    report.members.forEach(function(m) {
      var s = { total: m.tasks.length, done: 0, pending: 0, imprevista: 0, colaborativa: 0, tasks: m.tasks };
      m.tasks.forEach(function(t) {
        if (t.status === 'done') s.done++; else s.pending++;
        if (t.imprevista) s.imprevista++;
        if (t.colaborativa) s.colaborativa++;
      });
      s.compliance = s.total ? Math.round(s.done / s.total * 100) : 0;
      perPerson[m.name] = s;
      totalTasks += s.total;
      totalDone += s.done;
      totalPending += s.pending;
      totalImprevista += s.imprevista;
      totalColab += s.colaborativa;
    });

    var entries = Object.entries(perPerson);
    var maxLoad = entries.slice().sort(function(a, b) { return b[1].total - a[1].total; })[0];
    var maxPending = entries.slice().sort(function(a, b) { return b[1].pending - a[1].pending; })[0];
    var bestCompliance = entries.filter(function(e) { return e[1].total > 1; })
      .sort(function(a, b) { return b[1].compliance - a[1].compliance; })[0] || entries[0];
    var stars = entries.filter(function(e) { return e[1].compliance === 100 && e[1].total > 1; })
      .map(function(e) { return e[0]; });

    return {
      perPerson: perPerson,
      totalTasks: totalTasks,
      totalDone: totalDone,
      totalPending: totalPending,
      totalImprevista: totalImprevista,
      totalColab: totalColab,
      compliance: totalTasks ? Math.round(totalDone / totalTasks * 100) : 0,
      numPersons: report.members.length,
      avgTasks: (totalTasks / report.members.length).toFixed(1),
      maxLoad: maxLoad,
      maxPending: maxPending,
      bestCompliance: bestCompliance,
      stars: stars
    };
  }

  /* ── render all ── */
  function renderAll() {
    if (!cachedStats) return;
    renderKPIs(cachedStats);
    renderPersons(cachedStats, currentSort);
    renderCharts(cachedStats);
    renderCollab(currentReport);
    renderNextDay(currentReport);
    renderExecutiveSummary(cachedStats);
    renderFindings(cachedStats);
    renderRecommendations(cachedStats);
    renderPMComment(cachedStats);
    renderTrend(allReports);
    var now = new Date().toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'medium' });
    setText('team-gen-time', now);
    setText('team-footer-ts', 'Dashboard generado el ' + now);
    filterTasks(currentFilter);
  }

  /* ── 4. renderKPIs ── */
  function renderKPIs(st) {
    var compCls = pctClass(st.compliance);
    var kpis = [
      { label: 'Total Tareas',        value: st.totalTasks,                    sub: 'asignaciones del d\u00eda',                         cls: '' },
      { label: 'Completadas',         value: st.totalDone,                     sub: 'de ' + st.totalTasks + ' tareas',                   cls: 'green' },
      { label: 'Pendientes',          value: st.totalPending,                  sub: Math.round(st.totalPending/st.totalTasks*100)+'% del total', cls: st.totalPending > 5 ? 'red' : 'yellow' },
      { label: '% Cumplimiento',      value: st.compliance + '%',              sub: 'del equipo',                                        cls: compCls },
      { label: 'Personas',            value: st.numPersons,                    sub: 'Promedio: ' + st.avgTasks + ' tareas/persona',       cls: '' },
      { label: 'Mayor Carga',         value: shortName(st.maxLoad[0]),         sub: st.maxLoad[1].total + ' tareas asignadas',            cls: 'red' },
      { label: 'M\u00e1s Pendientes', value: shortName(st.maxPending[0]),      sub: st.maxPending[1].pending + ' pendientes',             cls: st.maxPending[1].pending > 2 ? 'red' : 'yellow' },
      { label: 'Mejor Cumplimiento',  value: shortName(st.bestCompliance[0]),  sub: st.bestCompliance[1].compliance + '% (' + st.bestCompliance[1].total + ' tareas)', cls: 'green' },
      { label: 'Imprevistas',         value: st.totalImprevista,               sub: Math.round(st.totalImprevista/st.totalTasks*100)+'% del total', cls: 'yellow' },
      { label: 'Colaborativas',       value: st.totalColab,                    sub: Math.round(st.totalColab/st.totalTasks*100)+'% del total',      cls: '' }
    ];
    setHTML('team-kpi-grid', kpis.map(function(k) {
      return '<div class="tm-kpi' + (k.cls ? ' tm-kpi-' + k.cls : '') + '">' +
        '<div class="tm-kpi-label">' + k.label + '</div>' +
        '<div class="tm-kpi-value">' + k.value + '</div>' +
        '<div class="tm-kpi-sub">' + k.sub + '</div></div>';
    }).join(''));
  }

  /* ── 5. renderPersons ── */
  function renderPersons(st, sortBy) {
    currentSort = sortBy || currentSort;
    var entries = Object.entries(st.perPerson);
    if (currentSort === 'load')       entries.sort(function(a,b){ return b[1].total - a[1].total; });
    if (currentSort === 'compliance') entries.sort(function(a,b){ return b[1].compliance - a[1].compliance; });
    if (currentSort === 'pending')    entries.sort(function(a,b){ return b[1].pending - a[1].pending; });

    var html = entries.map(function(pair) {
      var name = pair[0], s = pair[1];
      var cColor = pctClass(s.compliance);
      var isOverload = s.total >= 6;
      var isStar = s.compliance === 100 && s.total > 1;
      var highlight = isOverload ? ' tm-highlight-overload' : (isStar ? ' tm-highlight-star' : '');

      var tags = '';
      if (isOverload) tags += '<span class="tm-badge tm-badge-red">Sobrecarga</span> ';
      if (isStar)     tags += '<span class="tm-badge tm-badge-green">Alto rendimiento</span> ';
      if (s.imprevista > 0) tags += '<span class="tm-badge tm-badge-blue">' + s.imprevista + ' imprevista' + (s.imprevista > 1 ? 's' : '') + '</span>';

      var taskRows = s.tasks.map(function(t) {
        var icon = t.status === 'done'
          ? '<div class="tm-task-icon tm-task-done">\u2713</div>'
          : '<div class="tm-task-icon tm-task-pending">\u23f3</div>';
        var tTags = '';
        if (t.imprevista)        tTags += '<span class="tm-tag tm-tag-imprevista">Imprevista</span>';
        if (t.colaborativa)      tTags += '<span class="tm-tag tm-tag-colaborativa">Colaborativa</span>';
        if (t.status==='pending') tTags += '<span class="tm-tag tm-tag-pendiente">Pendiente</span>';
        return '<li class="tm-task-item" data-status="' + t.status + '" data-imprevista="' + t.imprevista + '" data-colaborativa="' + t.colaborativa + '">' +
          icon + '<span>' + t.desc + '</span><div class="tm-task-tags">' + tTags + '</div></li>';
      }).join('');

      return '<div class="tm-card' + highlight + ' tm-person-card" data-name="' + name.toLowerCase() + '">' +
        '<div class="tm-card-header" onclick="TeamDashboard.toggleCard(this)">' +
          '<h3><span class="tm-arrow">\u25b6</span> ' + name + ' ' + tags + '</h3>' +
          '<div class="tm-meta">' +
            '<span class="tm-badge tm-badge-' + cColor + '">' + s.compliance + '%</span>' +
            '<div class="tm-progress-bar"><div class="tm-progress-fill" style="width:' + s.compliance + '%;background:' + pctColor(s.compliance) + '"></div></div>' +
            '<span style="font-size:12px;color:#64748b">' + s.done + '/' + s.total + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="tm-card-body">' +
          '<div class="tm-stats-row">' +
            '<span><strong>' + s.total + '</strong> total</span>' +
            '<span style="color:#16a34a"><strong>' + s.done + '</strong> completadas</span>' +
            '<span style="color:#ca8a04"><strong>' + s.pending + '</strong> pendientes</span>' +
            '<span style="color:#a21caf"><strong>' + s.imprevista + '</strong> imprevistas</span>' +
            '<span style="color:#0369a1"><strong>' + s.colaborativa + '</strong> colaborativas</span>' +
          '</div>' +
          '<ul class="tm-task-list">' + taskRows + '</ul>' +
        '</div></div>';
    }).join('');

    setHTML('team-persons-container', html);
  }

  /* ── 6. renderCharts ── */
  function renderCharts(st) {
    drawBarChart(st);
    drawPieChart(st);
    drawLoadChart(st);
    drawComplianceChart(st);
  }

  function drawBarChart(st) {
    var canvas = document.getElementById('chartTeamBar');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var entries = Object.entries(st.perPerson).sort(function(a,b){ return b[1].total-a[1].total; });
    var n = entries.length;
    var W = canvas.width  = canvas.parentElement.clientWidth - 40;
    var H = canvas.height = Math.max(250, n * 42 + 60);
    var mL = 130, mR = 40, mT = 10, mB = 30;
    var cW = W - mL - mR, cH = H - mT - mB;
    var maxVal = Math.max.apply(null, entries.map(function(e){ return e[1].total; }));
    var barH = Math.min(28, cH / n - 6);
    ctx.clearRect(0, 0, W, H);
    ctx.textBaseline = 'middle';

    entries.forEach(function(pair, i) {
      var name = pair[0], s = pair[1];
      var y = mT + i * (cH / n) + cH / n / 2;
      var wD = Math.max((s.done / maxVal) * cW, 0);
      var wP = Math.max((s.pending / maxVal) * cW, 0);
      ctx.textAlign = 'right'; ctx.fillStyle = '#334155'; ctx.font = '12px Inter, sans-serif';
      ctx.fillText(shortName(name), mL - 10, y);
      ctx.fillStyle = '#16a34a'; roundedRect(ctx, mL, y - barH/2, wD, barH/2 - 1, 3);
      ctx.fillStyle = '#f59e0b'; roundedRect(ctx, mL, y + 1, wP, barH/2 - 1, 3);
      ctx.textAlign = 'left'; ctx.fillStyle = '#334155'; ctx.font = '11px Inter, sans-serif';
      if (s.done > 0)    ctx.fillText(s.done,    mL + wD + 4, y - barH/4);
      if (s.pending > 0) ctx.fillText(s.pending, mL + wP + 4, y + barH/4);
    });
    // legend
    ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
    ctx.fillStyle = '#16a34a'; roundedRect(ctx, mL, H-18, 12, 12, 2);
    ctx.fillStyle = '#334155'; ctx.fillText('Completadas', mL+16, H-12);
    ctx.fillStyle = '#f59e0b'; roundedRect(ctx, mL+100, H-18, 12, 12, 2);
    ctx.fillStyle = '#334155'; ctx.fillText('Pendientes', mL+116, H-12);
  }

  function drawPieChart(st) {
    var canvas = document.getElementById('chartTeamPie');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width  = canvas.parentElement.clientWidth - 40;
    var H = canvas.height = 280;
    var cx = W/2 - 60, cy = H/2, r = Math.min(100, H/2 - 20);
    ctx.clearRect(0, 0, W, H);
    var entries = Object.entries(st.perPerson).sort(function(a,b){ return b[1].total-a[1].total; });
    var startAngle = -Math.PI / 2;
    entries.forEach(function(pair, i) {
      var slice = (pair[1].total / st.totalTasks) * 2 * Math.PI;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + slice);
      ctx.fillStyle = TEAM_COLORS[i % TEAM_COLORS.length]; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      startAngle += slice;
    });
    // donut hole
    ctx.beginPath(); ctx.arc(cx, cy, r*0.5, 0, 2*Math.PI); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.font = 'bold 16px Space Grotesk, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#1e293b'; ctx.fillText(st.totalTasks, cx, cy - 8);
    ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#64748b'; ctx.fillText('tareas', cx, cy + 10);
    // legend
    ctx.textAlign = 'left'; ctx.font = '11px Inter, sans-serif';
    var ly = 20;
    entries.forEach(function(pair, i) {
      ctx.fillStyle = TEAM_COLORS[i % TEAM_COLORS.length]; roundedRect(ctx, W-155, ly, 10, 10, 2);
      ctx.fillStyle = '#334155'; ctx.fillText(shortName(pair[0])+' ('+pair[1].total+')', W-140, ly+9);
      ly += 18;
    });
  }

  function drawLoadChart(st) {
    var canvas = document.getElementById('chartTeamLoad');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var entries = Object.entries(st.perPerson).sort(function(a,b){ return b[1].total-a[1].total; });
    var n = entries.length;
    var W = canvas.width  = canvas.parentElement.clientWidth - 40;
    var H = canvas.height = Math.max(250, n*36+40);
    var mL = 130, mR = 60, mT = 10, mB = 20;
    var cW = W - mL - mR;
    var maxVal = Math.max.apply(null, entries.map(function(e){ return e[1].total; }));
    var barH = Math.min(24, (H-mT-mB)/n - 8);
    ctx.clearRect(0, 0, W, H);
    entries.forEach(function(pair, i) {
      var name = pair[0], s = pair[1];
      var y = mT + i * ((H-mT-mB)/n) + (H-mT-mB)/n/2;
      var w = (s.total / maxVal) * cW;
      var isOver = s.total >= 6;
      ctx.textAlign = 'right'; ctx.fillStyle = '#334155'; ctx.font = '12px Inter, sans-serif';
      ctx.fillText(shortName(name), mL-10, y);
      var grad = ctx.createLinearGradient(mL, 0, mL+w, 0);
      if (isOver) { grad.addColorStop(0,'#f87171'); grad.addColorStop(1,'#dc2626'); }
      else        { grad.addColorStop(0,'#60a5fa'); grad.addColorStop(1,'#2563eb'); }
      ctx.fillStyle = grad;
      roundedRect(ctx, mL, y-barH/2, w, barH, 4);
      ctx.textAlign = 'left'; ctx.fillStyle = isOver ? '#dc2626' : '#334155';
      ctx.font = 'bold 12px Space Grotesk, sans-serif';
      ctx.fillText(s.total + (isOver ? ' \u26a0\ufe0f' : ''), mL+w+8, y);
    });
  }

  function drawComplianceChart(st) {
    var canvas = document.getElementById('chartTeamCompliance');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var entries = Object.entries(st.perPerson).sort(function(a,b){ return b[1].compliance-a[1].compliance; });
    var n = entries.length;
    var W = canvas.width  = canvas.parentElement.clientWidth - 40;
    var H = canvas.height = Math.max(250, n*36+40);
    var mL = 130, mR = 60, mT = 10, mB = 20;
    var cW = W - mL - mR;
    var barH = Math.min(24, (H-mT-mB)/n - 8);
    ctx.clearRect(0, 0, W, H);
    entries.forEach(function(pair, i) {
      var name = pair[0], s = pair[1];
      var y = mT + i * ((H-mT-mB)/n) + (H-mT-mB)/n/2;
      var w = (s.compliance / 100) * cW;
      var color = pctColor(s.compliance);
      ctx.textAlign = 'right'; ctx.fillStyle = '#334155'; ctx.font = '12px Inter, sans-serif';
      ctx.fillText(shortName(name), mL-10, y);
      ctx.fillStyle = color;
      roundedRect(ctx, mL, y-barH/2, w, barH, 4);
      ctx.textAlign = 'left'; ctx.fillStyle = color;
      ctx.font = 'bold 12px Space Grotesk, sans-serif';
      ctx.fillText(s.compliance + '%', mL+w+8, y);
    });
  }

  /* ── 7. renderCollab ── */
  function renderCollab(report) {
    var collabTasks = [];
    var seen = {};
    report.members.forEach(function(m) {
      m.tasks.filter(function(t){ return t.colaborativa; }).forEach(function(t) {
        if (!seen[t.desc]) {
          seen[t.desc] = true;
          collabTasks.push({ desc: t.desc, participants: [m.name].concat(t.collabWith||[]), status: t.status, imprevista: t.imprevista });
        }
      });
    });
    if (!collabTasks.length) {
      setHTML('team-collab-container','<p style="color:#64748b;font-size:13px;padding:12px">No se registraron tareas colaborativas este d\u00eda.</p>');
      return;
    }
    var rows = collabTasks.map(function(t) {
      var icon = t.status==='done' ? '<div class="tm-task-icon tm-task-done">\u2713</div>' : '<div class="tm-task-icon tm-task-pending">\u23f3</div>';
      return '<li style="padding:10px 0;border-bottom:1px solid #e2e8f0;display:flex;align-items:flex-start;gap:8px">'+icon+
        '<div><strong style="font-size:13px">'+t.desc+'</strong><br><span style="font-size:12px;color:#64748b">'+t.participants.join(', ')+'</span></div>'+
        '<div style="margin-left:auto;flex-shrink:0">'+(t.imprevista?'<span class="tm-tag tm-tag-imprevista">Imprevista</span>':'')+'</div></li>';
    }).join('');
    setHTML('team-collab-container',
      '<div class="tm-card" style="border-left:4px solid #0369a1"><div style="padding:16px 20px"><ul style="list-style:none;padding:0;margin:0">'+rows+'</ul></div></div>');
  }

  /* ── 8. renderNextDay ── */
  function renderNextDay(report) {
    var el = document.getElementById('team-nextday-container');
    if (!el) return;
    if (!report.nextDay || !report.nextDay.length) {
      el.innerHTML = '<p style="color:#64748b;font-size:13px;padding:12px">No hay pendientes arrastrados.</p>';
      return;
    }
    var rows = report.nextDay.map(function(p) {
      return '<li style="padding:7px 0;font-size:13px;border-bottom:1px solid #e2e8f0;display:flex;gap:8px">' +
        '<span style="color:#ca8a04">\u23f3</span><div><strong>'+p.person+':</strong> '+p.task+
        (p.fromToday ? ' <span class="tm-badge tm-badge-yellow" style="font-size:10px">Arrastrada</span>' : '')+'</div></li>';
    }).join('');
    el.innerHTML = '<div class="tm-card"><div style="padding:16px 20px"><ul style="list-style:none;padding:0;margin:0">'+rows+'</ul></div></div>';
  }

  /* ── 9. renderExecutiveSummary ── */
  function renderExecutiveSummary(st) {
    var pctI = Math.round(st.totalImprevista / st.totalTasks * 100);
    var pctC = Math.round(st.totalColab / st.totalTasks * 100);
    setHTML('team-executive-summary',
      '<h2 style="font-size:16px;margin-bottom:12px;font-weight:700">Resumen Ejecutivo \u2013 '+(currentReport?currentReport.dateLabel:'')+'</h2>'+
      '<p style="font-size:13.5px;line-height:1.7;opacity:.92;margin-bottom:10px">'+
        'El equipo registr\u00f3 un total de <strong>'+st.totalTasks+' asignaciones de tareas</strong> distribuidas entre <strong>'+
        st.numPersons+' miembros</strong>, alcanzando un cumplimiento general del <strong>'+st.compliance+'%</strong> ('+
        st.totalDone+' completadas, '+st.totalPending+' pendientes). El promedio de carga fue de '+st.avgTasks+' tareas por persona.</p>'+
      '<p style="font-size:13.5px;line-height:1.7;opacity:.92;margin-bottom:10px">'+
        'Se ejecutaron <strong>'+st.totalImprevista+' tareas imprevistas</strong> ('+pctI+'% del total), lo que evidencia capacidad de respuesta ante situaciones no planificadas. '+
        'El <strong>'+pctC+'%</strong> de las asignaciones correspondieron a trabajo colaborativo ('+st.totalColab+' tareas).</p>'+
      '<p style="font-size:13.5px;line-height:1.7;opacity:.92">'+
        '<strong>'+st.maxLoad[0]+'</strong> concentr\u00f3 la mayor carga laboral con '+st.maxLoad[1].total+' tareas.'+
        (st.stars.length ? ' Miembros con cumplimiento perfecto (100%): <strong>'+st.stars.join(', ')+'</strong>.' : '')+'</p>');
  }

  /* ── 10. renderFindings ── */
  function renderFindings(st) {
    var pctI = Math.round(st.totalImprevista / st.totalTasks * 100);
    var findings = [
      { type:'positive', icon:'\u2705', text:'Cumplimiento general del '+st.compliance+'%: el equipo mantiene un ritmo de ejecuci\u00f3n s\u00f3lido.' },
      { type:'positive', icon:'\u2b50', text:st.stars.length+' persona'+(st.stars.length>1?'s':'')+' con cumplimiento del 100%: '+st.stars.join(', ')+'.' },
      { type:'warning',  icon:'\u26a0\ufe0f', text:st.maxLoad[0]+' concentra '+st.maxLoad[1].total+' tareas ('+st.maxLoad[1].imprevista+' imprevistas). Posible riesgo de sobrecarga.' },
      { type:'warning',  icon:'\u23f3', text:st.totalPending+' tareas pendientes se arrastran al siguiente d\u00eda. '+st.maxPending[0]+' acumula la mayor cantidad ('+st.maxPending[1].pending+').' },
      { type:'info',     icon:'\ud83d\udd04', text:'El '+pctI+'% de las tareas fueron imprevistas ('+st.totalImprevista+' de '+st.totalTasks+'). Alta reactividad del equipo.' },
      { type:'info',     icon:'\ud83e\udd1d', text:st.totalColab+' asignaciones colaborativas ('+Math.round(st.totalColab/st.totalTasks*100)+'%). Buena coordinaci\u00f3n entre miembros.' }
    ];
    var cls = { positive:'tm-finding-positive', warning:'tm-finding-warning', risk:'tm-finding-risk', info:'tm-finding-info' };
    setHTML('team-findings',
      '<h3 style="font-size:15px;font-weight:700;margin-bottom:12px">Hallazgos Clave</h3>'+
      findings.map(function(f) {
        return '<div class="tm-finding-item '+cls[f.type]+'"><span style="font-size:16px;flex-shrink:0">'+f.icon+'</span><span style="font-size:13px">'+f.text+'</span></div>';
      }).join(''));
  }

  /* ── 11. renderRecommendations ── */
  function renderRecommendations(st) {
    var recs = [];
    if (st.maxLoad[1].total >= 6)
      recs.push({ icon:'\ud83d\udccb', text:'Redistribuir carga de '+st.maxLoad[0]+': con '+st.maxLoad[1].total+' tareas asignadas, es recomendable priorizar o reasignar para evitar acumulaci\u00f3n.' });
    if (st.maxPending[1].pending >= 3)
      recs.push({ icon:'\ud83d\udd0d', text:'Monitorear pendientes de '+st.maxPending[0]+': acumula '+st.maxPending[1].pending+' tareas sin completar que podr\u00edan impactar sprints futuros.' });
    var entries = Object.entries(st.perPerson);
    var minLoad = entries.reduce(function(min,e){ return e[1].total < min[1].total ? e : min; }, entries[0]);
    if (st.maxLoad[1].total > minLoad[1].total * 3)
      recs.push({ icon:'\u2696\ufe0f', text:'Balancear la carga: mientras '+shortName(st.maxLoad[0])+' tiene '+st.maxLoad[1].total+' tareas, '+shortName(minLoad[0])+' tiene '+minLoad[1].total+'. Evaluar redistribuci\u00f3n.' });
    var pctI = Math.round(st.totalImprevista / st.totalTasks * 100);
    if (pctI > 20)
      recs.push({ icon:'\ud83d\udcca', text:'Documentar causa ra\u00edz de imprevistas: el '+pctI+'% de tareas fueron imprevistas. Identificar patrones para reducir variabilidad.' });
    if (st.totalColab > 0)
      recs.push({ icon:'\ud83e\udd1d', text:'Mantener el modelo de trabajo colaborativo. La din\u00e1mica demostr\u00f3 efectividad. Considerar replicarlo.' });
    recs.push({ icon:'\u23f0', text:'Establecer checkpoints intra-d\u00eda para tareas de alta dependencia para detectar bloqueos tempranamente.' });

    setHTML('team-recommendations',
      '<h3 style="font-size:15px;font-weight:700;margin-bottom:12px">Recomendaciones</h3>'+
      recs.map(function(r) {
        return '<div class="tm-finding-item tm-finding-info"><span style="font-size:16px;flex-shrink:0">'+r.icon+'</span><span style="font-size:13px">'+r.text+'</span></div>';
      }).join(''));
  }

  /* ── 12. renderPMComment ── */
  function renderPMComment(st) {
    setHTML('team-pm-comment',
      '<h2 style="font-size:16px;margin-bottom:12px;font-weight:700">Comentario del Project Manager</h2>'+
      '<p style="font-size:13.5px;line-height:1.7;opacity:.92;margin-bottom:10px">'+
        'Buen d\u00eda de ejecuci\u00f3n para el equipo. Un cumplimiento del '+st.compliance+'% es '+(st.compliance>=80?'positivo':'aceptable')+
        ', especialmente considerando que casi un '+Math.round(st.totalImprevista/st.totalTasks*100)+'% de las tareas fueron imprevistas y el equipo las absorbi\u00f3 sin dejar caer las planificadas.</p>'+
      '<p style="font-size:13.5px;line-height:1.7;opacity:.92;margin-bottom:10px">'+
        'El foco de atenci\u00f3n para ma\u00f1ana es <strong>'+st.maxPending[0]+'</strong>: acumula la mayor cantidad de pendientes. '+
        'Recomiendo una revisi\u00f3n de prioridades en el standup para asegurar que los bloqueos se resuelvan primero.</p>'+
      '<p style="margin-top:12px;opacity:.6;font-size:12px">\u2014 An\u00e1lisis generado autom\u00e1ticamente | Dashboard de Desempe\u00f1o v1.0</p>');
  }

  /* ── 13. renderTrend ── */
  function renderTrend(reports) {
    var canvas = document.getElementById('chartTeamTrend');
    if (!canvas) return;
    var section = document.getElementById('team-trend-section');

    if (reports.length < 2) {
      canvas.style.display = 'none';
      if (section) {
        var existing = section.querySelector('.tm-trend-msg');
        if (!existing) {
          var p = document.createElement('p');
          p.className = 'tm-trend-msg';
          p.style.cssText = 'color:#64748b;font-size:13px;padding:16px;text-align:center';
          p.textContent = 'El gr\u00e1fico de tendencia se activar\u00e1 cuando haya m\u00e1s de un d\u00eda de datos hist\u00f3ricos.';
          section.appendChild(p);
        }
      }
      return;
    }
    canvas.style.display = '';
    var old = section ? section.querySelector('.tm-trend-msg') : null;
    if (old) old.remove();

    var sorted = reports.slice().sort(function(a,b){ return a.date.localeCompare(b.date); });
    var points = sorted.map(function(r) {
      var s = calcStats(r);
      return { date: r.date, label: r.dateLabel.split(',')[0] || r.date, compliance: s.compliance };
    });

    var ctx = canvas.getContext('2d');
    var W = canvas.width  = canvas.parentElement.clientWidth - 40;
    var H = canvas.height = 200;
    var mL = 50, mR = 30, mT = 20, mB = 40;
    var cW = W-mL-mR, cH = H-mT-mB;
    ctx.clearRect(0, 0, W, H);

    // grid
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
    for (var g = 0; g <= 100; g += 25) {
      var gy = mT + cH - (g/100)*cH;
      ctx.beginPath(); ctx.moveTo(mL, gy); ctx.lineTo(W-mR, gy); ctx.stroke();
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'right';
      ctx.fillText(g+'%', mL-6, gy+3);
    }
    // line
    ctx.strokeStyle = '#2563eb'; ctx.lineWidth = 2.5; ctx.beginPath();
    points.forEach(function(p, i) {
      var x = mL + (i / (points.length - 1)) * cW;
      var y = mT + cH - (p.compliance / 100) * cH;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    // dots
    points.forEach(function(p, i) {
      var x = mL + (i / (points.length - 1)) * cW;
      var y = mT + cH - (p.compliance / 100) * cH;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 2*Math.PI);
      ctx.fillStyle = '#2563eb'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#1e293b'; ctx.font = 'bold 11px Space Grotesk, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.compliance + '%', x, y - 12);
      ctx.fillStyle = '#64748b'; ctx.font = '10px Inter, sans-serif';
      ctx.fillText(p.label, x, H - mB + 16);
    });
  }

  /* ── 14. filterTasks ── */
  function filterTasks(filter) {
    currentFilter = filter;
    document.querySelectorAll('.tm-filter-btn').forEach(function(b) {
      b.classList.toggle('active', b.dataset.filter === filter);
    });
    document.querySelectorAll('.tm-task-item').forEach(function(li) {
      var st = li.getAttribute('data-status');
      var imp = li.getAttribute('data-imprevista') === 'true';
      var col = li.getAttribute('data-colaborativa') === 'true';
      var show = true;
      if (filter === 'done')         show = (st === 'done');
      else if (filter === 'pending') show = (st === 'pending');
      else if (filter === 'imprevista')   show = imp;
      else if (filter === 'colaborativa') show = col;
      li.style.display = show ? '' : 'none';
    });
    document.querySelectorAll('.tm-person-card').forEach(function(card) {
      if (filter === 'all') { card.style.display = ''; return; }
      var vis = card.querySelectorAll('.tm-task-item:not([style*="display: none"])');
      card.style.display = vis.length > 0 ? '' : 'none';
    });
  }

  /* ── 15. filterBySearch ── */
  function filterBySearch(query) {
    var q = (query || '').toLowerCase();
    document.querySelectorAll('.tm-person-card').forEach(function(card) {
      card.style.display = card.getAttribute('data-name').indexOf(q) >= 0 ? '' : 'none';
    });
  }

  /* ── 16. toggleCard ── */
  function toggleCard(headerEl) {
    var body = headerEl.nextElementSibling;
    var arrow = headerEl.querySelector('.tm-arrow');
    if (body) body.classList.toggle('open');
    if (arrow) arrow.classList.toggle('open');
  }

  /* ── resize handler ── */
  window.addEventListener('resize', function() {
    if (cachedStats) renderCharts(cachedStats);
    if (allReports.length > 1) renderTrend(allReports);
  });

  /* ── public API ── */
  return {
    loadData: loadData,
    selectDate: selectDate,
    filterTasks: filterTasks,
    filterBySearch: filterBySearch,
    toggleCard: toggleCard,
    sortPersons: function(by) {
      currentSort = by;
      document.querySelectorAll('.tm-sort-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.sort === by);
      });
      if (cachedStats) renderPersons(cachedStats, by);
    }
  };
})();


// ── Bootstrap ─────────────────────────────────
(async function init() {
  try {
    const res  = await fetch('data.json');
    const data = await res.json();

    setText('report-date', data.reportDate);
    setText('footer-date', data.reportDate);

    renderStats(data.stats);
    renderProgressBreakdown(data);
    renderMigrationItems(data.migrationItems);
    renderProducts(data.products);
    renderPhotos(data.photos);
    renderStorage(data.storage);
    renderClients(data.clients);
    renderVendors(data.vendors);
    renderContacts(data.contacts);
    renderOrders(data.orders);

    // ── Team dashboard ──
    try {
      const teamRes = await fetch('team-data.json');
      const teamReports = await teamRes.json();
      TeamDashboard.loadData(teamReports);
    } catch (e) {
      console.warn('team-data.json not loaded:', e);
    }

  } catch (err) {
    console.error('Failed to load data.json:', err);
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="background:#fee2e2;color:#991b1b;padding:12px 24px;font-family:sans-serif;font-size:13px">' +
      '\u26a0\ufe0f Could not load data.json. Open this file via a local server (e.g. <code>npx serve .</code>) rather than directly from the filesystem.' +
      '</div>');
  }
}());
