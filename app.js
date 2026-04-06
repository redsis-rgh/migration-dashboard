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

  } catch (err) {
    console.error('Failed to load data.json:', err);
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="background:#fee2e2;color:#991b1b;padding:12px 24px;font-family:sans-serif;font-size:13px">' +
      '⚠️ Could not load data.json. Open this file via a local server (e.g. <code>npx serve .</code>) rather than directly from the filesystem.' +
      '</div>');
  }
}());
