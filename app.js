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

function toNumber(value) {
  return Number(value || 0);
}

function getProductsModel(products) {
  if (products?.summary && products?.byCompany) {
    return {
      summary: {
        targetTotal: toNumber(products.summary.targetTotal),
        migrated: toNumber(products.summary.migrated),
        active: toNumber(products.summary.active || products.summary.migrated),
        sourceLabel: products.summary.sourceLabel || 'Current in redix_core',
        note: products.summary.note || ''
      },
      byCompany: products.byCompany
    };
  }

  const byCompany = products || {};
  const targetTotal = Object.values(byCompany).reduce((s, v) => s + (v ? toNumber(v.total) : 0), 0);
  const migrated = Object.values(byCompany).reduce((s, v) => s + (v ? toNumber(v.migrated) : 0), 0);

  return {
    summary: {
      targetTotal,
      migrated,
      active: migrated,
      sourceLabel: 'Current in redix_core',
      note: ''
    },
    byCompany
  };
}

function getPhotosModel(photos) {
  if (photos?.summary && photos?.byCompany) {
    return {
      summary: {
        targetTotal: toNumber(photos.summary.targetTotal),
        migrated: toNumber(photos.summary.migrated),
        active: toNumber(photos.summary.active || photos.summary.migrated),
        sourceLabel: photos.summary.sourceLabel || 'Current in redix_core',
        note: photos.summary.note || ''
      },
      byCompany: photos.byCompany
    };
  }

  const byCompany = photos || {};
  const targetTotal = Object.values(byCompany).reduce((s, v) => s + (v ? toNumber(v.total) : 0), 0);

  return {
    summary: {
      targetTotal,
      migrated: 0,
      active: 0,
      sourceLabel: 'Current in redix_core',
      note: ''
    },
    byCompany
  };
}

function getAccountSummary(data) {
  const sections = [data.clients || {}, data.vendors || {}];
  return sections.reduce((acc, section) => {
    Object.values(section).forEach((entry) => {
      if (!entry) return;
      acc.total += toNumber(entry.total);
      acc.active += toNumber(entry.active);
      acc.migrated += toNumber(entry.migrated);
    });
    return acc;
  }, { total: 0, active: 0, migrated: 0 });
}

function renderProgressBar(pct, color) {
  const width = pct > 0 ? Math.max(pct, 0.02).toFixed(3) : '0';
  return `
    <div style="height:7px;background:var(--surface);border-radius:99px;overflow:hidden">
      <div style="width:${width}%;height:100%;background:${color};border-radius:99px"></div>
    </div>`;
}

let migrationDataCache = null;
let migrationSyncInFlight = false;
const MIGRATION_SYNC_URL = 'https://n8n-development.redsis.ai/webhook/redix/migration-sync';

function getMigrationSyncMarker(data) {
  if (!data || typeof data !== 'object') return '';
  return String(data.syncedAt || data.reportDate || '');
}

function setMigrationSyncStatus(message, tone) {
  const statusEl = document.getElementById('migration-sync-status');
  if (!statusEl) return;
  statusEl.className = 'tm-sync-status' + (tone ? ' ' + tone : '');
  statusEl.textContent = message;
}

function setMigrationSyncButtonState(isBusy) {
  migrationSyncInFlight = isBusy;
  const button = document.getElementById('migration-sync-btn');
  if (!button) return;
  button.disabled = isBusy;
  button.textContent = isBusy ? 'Syncing...' : 'Sync DB';
}

async function fetchMigrationSnapshot(cacheBust) {
  const url = 'data.json' + (cacheBust ? '?v=' + Date.now() : '');
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('data.json returned ' + res.status);
  }
  return await res.json();
}

function loadMigrationData(data) {
  if (!data || !data.stats) {
    console.warn('Unexpected Migration Report data shape:', data);
    return;
  }

  migrationDataCache = data;
  setText('report-date', data.reportDate || '—');
  setText('footer-date', data.reportDate || '—');

  renderStats(data);
  renderProgressBreakdown(data);
  renderMigrationItems(data.migrationItems || []);
  renderProducts(data.products || {});
  renderPhotos(data.photos || {});
  renderStorage(data.storage || {});
  renderClients(data.clients || {});
  renderVendors(data.vendors || {});
  renderContacts(data.contacts || {});
  renderOrders(data.orders || {});
}

async function waitForPublishedMigrationSync(previousData, expectedSyncedAt) {
  const previousMarker = getMigrationSyncMarker(previousData);
  const previousSyncedMs = previousData && previousData.syncedAt ? Date.parse(previousData.syncedAt) : NaN;
  const expectedMs = expectedSyncedAt ? Date.parse(expectedSyncedAt) : NaN;

  for (let attempt = 0; attempt < 12; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    try {
      const latest = await fetchMigrationSnapshot(true);
      const latestMarker = getMigrationSyncMarker(latest);
      const latestSyncedMs = latest && latest.syncedAt ? Date.parse(latest.syncedAt) : NaN;
      const markerChanged = !!latestMarker && latestMarker !== previousMarker;
      const reachedExpected = !Number.isNaN(latestSyncedMs) && !Number.isNaN(expectedMs) && latestSyncedMs >= expectedMs;
      const isNewerThanPrevious = !Number.isNaN(latestSyncedMs) && (Number.isNaN(previousSyncedMs) || latestSyncedMs > previousSyncedMs);

      if (reachedExpected || isNewerThanPrevious || markerChanged) {
        loadMigrationData(latest);
        return true;
      }
    } catch (err) {
      console.warn('Waiting for published data.json failed:', err);
    }
  }

  return false;
}

async function syncMigrationData() {
  if (migrationSyncInFlight) return;

  const previousData = migrationDataCache;
  setMigrationSyncButtonState(true);
  setMigrationSyncStatus('Syncing... database counts and waiting for GitHub Pages...', 'loading');

  try {
    const response = await fetch(MIGRATION_SYNC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'manual-button', force: true })
    });

    const rawBody = await response.text();
    const result = rawBody ? JSON.parse(rawBody) : null;
    if (!response.ok || !result || !result.ok) {
      throw new Error(result && result.message ? result.message : 'Sync failed or returned an empty response');
    }

    setMigrationSyncStatus('Syncing... backend finished, waiting for published JSON...', 'loading');
    const published = await waitForPublishedMigrationSync(previousData, result.syncedAt);

    if (published) {
      setMigrationSyncStatus('Synced ✓ Dashboard updated with live DB counts.', 'success');
    } else {
      setMigrationSyncStatus('Syncing... backend completed, but GitHub Pages has not published the new JSON yet.', 'loading');
    }
  } catch (err) {
    console.error('Migration sync failed:', err);
    setMigrationSyncStatus('Error: ' + err.message, 'error');
  } finally {
    setMigrationSyncButtonState(false);
  }
}

// ── Stats ─────────────────────────────────────
function renderStats(data) {
  const { totalItems, completed, inProgress, pending } = data.stats;
  const productModel = getProductsModel(data.products);
  const photoModel = getPhotosModel(data.photos);
  const accountSummary = getAccountSummary(data);
  const remainingAccounts = Math.max(accountSummary.total - accountSummary.migrated, 0);

  setText('stat-total-val', `${completed} / ${totalItems}`);
  setText('stat-done-val', formatNumber(productModel.summary.migrated));
  setText('stat-working-val', formatNumber(accountSummary.migrated));
  setText('stat-pending-val', formatNumber(photoModel.summary.migrated));

  setText('stat-total-pct', `${inProgress} in progress · ${pending} pending`);
  setText('stat-done-pct', `${formatNumber(productModel.summary.active)} active in redix_core`);
  setText('stat-working-pct', `${formatNumber(remainingAccounts)} remaining to map`);
  setText('stat-pending-pct', `${formatNumber(photoModel.summary.active)} active in redix_core`);

  // Legend
  setText('legend-done',    completed);
  setText('legend-working', inProgress);
  setText('legend-pending', pending);
}

// ── Overall progress breakdown ─────────────────
function renderProgressBreakdown(data) {
  const total = data.stats.totalItems;
  const donePct = total > 0 ? (data.stats.completed / total * 100) : 0;
  const workingPct = total > 0 ? (data.stats.inProgress / total * 100) : 0;
  const productModel = getProductsModel(data.products);
  const photoModel = getPhotosModel(data.photos);
  const accountSummary = getAccountSummary(data);

  const prodTotal = productModel.summary.targetTotal;
  const prodMigrated = productModel.summary.migrated;
  const prodPct = prodTotal > 0 ? (prodMigrated / prodTotal * 100) : 0;

  const photoTotal = photoModel.summary.targetTotal;
  const photoMigrated = photoModel.summary.migrated;
  const photoPct = photoTotal > 0 ? (photoMigrated / photoTotal * 100) : 0;

  const accountPct = accountSummary.total > 0 ? (accountSummary.migrated / accountSummary.total * 100) : 0;
  const accountRemaining = Math.max(accountSummary.total - accountSummary.migrated, 0);

  const storageEntries = Object.values(data.storage);
  const storageTotal = storageEntries.reduce((s, v) => s + v.gb, 0);
  const storageDone = storageEntries.filter(v => v.status === 'done').reduce((s, v) => s + v.gb, 0);
  const storagePct = storageTotal > 0 ? (storageDone / storageTotal * 100) : 0;

  const rows = [
    {
      label: 'Catalog readiness',
      barHTML: `<div style="width:${donePct.toFixed(1)}%;height:100%;background:var(--success)"></div>
                <div style="width:${workingPct.toFixed(1)}%;height:100%;background:var(--warning)"></div>`,
      valueHTML: `<span style="font-size:11px;font-weight:700;color:var(--success)">${data.stats.completed} ready</span>
                  <span style="font-size:11px;color:var(--text-muted)"> · ${data.stats.inProgress} moving</span>`,
      overflow: true
    },
    {
      label: 'Products live in redix_core',
      barHTML: `<div style="width:${Math.max(prodPct, 0.02).toFixed(3)}%;min-width:3px;height:100%;background:var(--warning);border-radius:99px"></div>`,
      valueHTML: `<span style="font-size:11px;font-weight:700;color:var(--warning)">${formatNumber(prodMigrated)} live</span>
                  <span style="font-size:11px;color:var(--text-muted)"> · ${formatNumber(productModel.summary.active)} active</span>`,
      overflow: true
    },
    {
      label: 'Photo records live in redix_core',
      barHTML: `<div style="width:${Math.max(photoPct, 0.02).toFixed(3)}%;min-width:3px;height:100%;background:#0f766e;border-radius:99px"></div>`,
      valueHTML: `<span style="font-size:11px;font-weight:700;color:#0f766e">${formatNumber(photoMigrated)} live</span>
                  <span style="font-size:11px;color:var(--text-muted)"> · mixed by source</span>`,
      overflow: true
    },
    {
      label: 'Accounts mapped',
      barHTML: `<div style="width:${Math.max(accountPct, 0.02).toFixed(3)}%;height:100%;background:#7c3aed;border-radius:99px"></div>`,
      valueHTML: `<span style="font-size:11px;font-weight:700;color:#7c3aed">${formatNumber(accountSummary.migrated)} mapped</span>
                  <span style="font-size:11px;color:var(--text-muted)"> · ${formatNumber(accountRemaining)} remaining</span>`,
      overflow: true
    },
    {
      label: 'Storage copied',
      barHTML: `<div style="width:${storagePct.toFixed(1)}%;height:100%;background:var(--success);border-radius:99px"></div>`,
      valueHTML: `<span style="font-size:11px;font-weight:700;color:var(--success)">${storagePct.toFixed(0)}%</span>
                  <span style="font-size:11px;color:var(--text-muted)"> · ${formatNumber(storageDone)} GB done</span>`,
      overflow: true
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
  const { summary, byCompany } = getProductsModel(products);
  const entries = Object.entries(byCompany);
  const grandTotal = summary.targetTotal;
  const migratedPct = grandTotal > 0 ? (summary.migrated / grandTotal * 100) : 0;

  const summaryHTML = `
    <div class="volume-row" style="flex-direction:column;align-items:stretch;gap:6px;padding:10px 12px;border-bottom:1px solid var(--border);background:#f8fafc">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.4px">${summary.sourceLabel}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${summary.note || 'Migrated items are mixed in the new database and cannot yet be split by origin company.'}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="volume-num" style="color:var(--warning)">${formatNumber(summary.migrated)}</div>
          <div style="font-size:10px;color:var(--text-muted)">${formatNumber(summary.active)} active · ${migratedPct.toFixed(1)}% of target</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:5px;background:var(--surface);border-radius:99px;overflow:hidden">
          <div style="width:${Math.max(migratedPct, 0.02).toFixed(3)}%;min-width:3px;height:100%;background:var(--warning);border-radius:99px"></div>
        </div>
        <span style="font-size:10px;color:var(--warning);font-weight:600;white-space:nowrap">${formatNumber(summary.migrated)} live</span>
      </div>
    </div>`;

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
            <span style="font-size:10px;color:var(--text-muted);font-weight:500">Target volume</span>
          </div>
        </div>`;
    }

    if (data.status === 'done') {
      return `
        <div class="volume-row" style="flex-direction:column;align-items:stretch;gap:5px;padding:8px 12px;${border}">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div class="volume-company">${companyDot(company)}${company}</div>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="badge badge-done" style="font-size:10px;padding:2px 7px">Done</span>
              <div class="volume-num">${formatNumber(data.total)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:5px;background:var(--surface);border-radius:99px;overflow:hidden">
              <div style="width:100%;height:100%;background:var(--success);border-radius:99px"></div>
            </div>
            <span style="font-size:10px;color:var(--success);font-weight:600;white-space:nowrap">Source completed</span>
          </div>
        </div>`;
    }

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
            <div style="width:35%;min-width:3px;height:100%;background:var(--warning);border-radius:99px"></div>
          </div>
          <span style="font-size:10px;color:var(--warning);font-weight:600;white-space:nowrap">Source loading now</span>
        </div>
      </div>`;
  }).join('');

  setHTML('volume-products-rows', summaryHTML + rowsHTML);
  setText('volume-products-total', formatNumber(grandTotal));
}

// ── Volume: Photos ─────────────────────────────
function renderPhotos(photos) {
  const { summary, byCompany } = getPhotosModel(photos);
  const entries = Object.entries(byCompany);
  const grandTotal = summary.targetTotal;
  const migratedPct = grandTotal > 0 ? (summary.migrated / grandTotal * 100) : 0;

  const summaryHTML = `
    <div class="volume-row" style="flex-direction:column;align-items:stretch;gap:6px;padding:10px 12px;border-bottom:1px solid var(--border);background:#f8fafc">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--text-primary);text-transform:uppercase;letter-spacing:0.4px">${summary.sourceLabel}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">${summary.note || 'Photo records are mixed in the new database and cannot yet be split by origin company.'}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div class="volume-num" style="color:#0f766e">${formatNumber(summary.migrated)}</div>
          <div style="font-size:10px;color:var(--text-muted)">${formatNumber(summary.active)} active · ${migratedPct.toFixed(1)}% of target</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:5px;background:var(--surface);border-radius:99px;overflow:hidden">
          <div style="width:${Math.max(migratedPct, 0.02).toFixed(3)}%;min-width:3px;height:100%;background:#0f766e;border-radius:99px"></div>
        </div>
        <span style="font-size:10px;color:#0f766e;font-weight:600;white-space:nowrap">${formatNumber(summary.migrated)} live</span>
      </div>
    </div>`;

  const rowsHTML = entries.map(([company, data], i) => {
    const isLast = i === entries.length - 1;
    const border = isLast ? 'border-bottom:none' : '';
    const num    = data ? formatNumber(data.total) : '—';
    return `
      <div class="volume-row" style="flex-direction:column;align-items:stretch;gap:5px;padding:8px 12px;${border}">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div class="volume-company">${companyDot(company)}${company}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge badge-pending" style="font-size:10px;padding:2px 7px">Target Only</span>
            <div class="volume-num">${num}</div>
          </div>
        </div>
        <div style="font-size:10px;color:var(--text-muted)">Live photo records are mixed and currently not attributable by company.</div>
      </div>`;
  }).join('');

  setHTML('volume-photos-rows', summaryHTML + rowsHTML);
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

function renderAccountProgress(containerId, entries, entityLabel) {
  const html = `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:8px 16px 14px">
      ${entries.map(([company, data]) => {
        if (data === null) {
          return `
            <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%);opacity:0.8">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
                <div class="split-company" style="margin:0">${companyDot(company)}${company}</div>
                ${renderPending()}
              </div>
              <div style="font-size:10px;color:var(--text-muted);margin-top:24px">Legacy total not loaded yet.</div>
            </div>`;
        }

        const total = toNumber(data.total);
        const migrated = toNumber(data.migrated);
        const active = toNumber(data.active);
        const remaining = Math.max(total - migrated, 0);
        const pct = total > 0 ? (migrated / total * 100) : 0;
        const badge = remaining === 0
          ? '<span class="badge badge-done" style="font-size:10px;padding:2px 7px">Mapped</span>'
          : '<span class="badge badge-working" style="font-size:10px;padding:2px 7px">In Progress</span>';
        const barColor = remaining === 0 ? 'var(--success)' : '#7c3aed';

        return `
          <div style="border:1px solid var(--border);border-radius:12px;padding:12px;background:linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <div class="split-company" style="margin:0">${companyDot(company)}${company}</div>
              ${badge}
            </div>
            <div style="display:flex;align-items:baseline;gap:6px;margin-top:12px">
              <div style="font-size:28px;font-weight:800;letter-spacing:-0.04em;color:var(--text-primary)">${formatNumber(migrated)}</div>
              <div style="font-size:12px;color:var(--text-muted)">/ ${formatNumber(total)}</div>
            </div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${entityLabel} mapped in account_accounting_mapping</div>
            <div style="margin-top:10px">
              ${renderProgressBar(pct, barColor)}
            </div>
            <div style="display:flex;justify-content:space-between;gap:8px;margin-top:8px;font-size:10px;color:var(--text-muted)">
              <span>${formatNumber(active)} active in source</span>
              <span>${formatNumber(remaining)} remaining</span>
            </div>
          </div>`;
      }).join('')}
    </div>`;

  setHTML(containerId, html);
}

function renderClients(clients) {
  renderAccountProgress('clients-grid', Object.entries(clients), 'Clients');
}

function renderVendors(vendors) {
  renderAccountProgress('vendors-grid', Object.entries(vendors), 'Vendors');
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
  var MONDAY_SYNC_URL = 'https://n8n-development.redsis.ai/webhook/redix/monday-sync';
  var boardData = null;
  var cachedStats = null;
  var currentFilter = 'all';
  var currentSort = 'workload';
  var syncInFlight = false;

  function getChartWidth(canvas, fallbackWidth) {
    var parentWidth = canvas && canvas.parentElement ? canvas.parentElement.clientWidth : 0;
    if (parentWidth && parentWidth > 120) return parentWidth - 40;
    return fallbackWidth;
  }

  function shortName(name) {
    return (name || 'Unassigned').split(' ').slice(0, 2).join(' ');
  }

  function pctColor(p) {
    return p >= 80 ? '#16a34a' : p >= 50 ? '#ca8a04' : '#dc2626';
  }

  function pctClass(p) {
    return p >= 80 ? 'green' : p >= 50 ? 'yellow' : 'red';
  }

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

  function parseDate(dateStr) {
    if (!dateStr) return null;
    var dt = new Date(dateStr + 'T00:00:00');
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function setSyncStatus(message, tone) {
    var statusEl = document.getElementById('team-sync-status');
    if (!statusEl) return;
    statusEl.className = 'tm-sync-status' + (tone ? ' ' + tone : '');
    statusEl.textContent = message;
  }

  function setSyncButtonState(isBusy) {
    syncInFlight = isBusy;
    var button = document.getElementById('team-sync-btn');
    if (!button) return;
    button.disabled = isBusy;
    button.textContent = isBusy ? 'Syncing...' : 'Sync Monday';
  }

  async function fetchTeamSnapshot(cacheBust) {
    var url = 'team-data.json' + (cacheBust ? '?v=' + Date.now() : '');
    var teamRes = await fetch(url, { cache: 'no-store' });
    if (!teamRes.ok) {
      throw new Error('team-data.json returned ' + teamRes.status);
    }
    return await teamRes.json();
  }

  async function waitForPublishedSync(previousSyncedAt, expectedSyncedAt) {
    var expectedMs = expectedSyncedAt ? Date.parse(expectedSyncedAt) : NaN;
    var previousMs = previousSyncedAt ? Date.parse(previousSyncedAt) : NaN;

    for (var attempt = 0; attempt < 12; attempt++) {
      if (attempt > 0) {
        await new Promise(function(resolve) { setTimeout(resolve, 5000); });
      }
      try {
        var latest = await fetchTeamSnapshot(true);
        var latestMs = latest && latest.syncedAt ? Date.parse(latest.syncedAt) : NaN;
        var isNewerThanPrevious = !Number.isNaN(latestMs) && (Number.isNaN(previousMs) || latestMs > previousMs);
        var reachedExpected = !Number.isNaN(latestMs) && !Number.isNaN(expectedMs) && latestMs >= expectedMs;
        if (reachedExpected || isNewerThanPrevious) {
          loadData(latest);
          return true;
        }
      } catch (err) {
        console.warn('Waiting for published team-data.json failed:', err);
      }
    }
    return false;
  }

  function loadData(data) {
    if (!data || data.source !== 'monday-board') {
      console.warn('Unexpected Team Performance data shape:', data);
      return;
    }
    boardData = data;
    cachedStats = calcStats(data);
    renderAll();
  }

  function calcStats(data) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var items = (data.items || []).map(function(item) {
      var due = parseDate(item.dueDate);
      var timelineEnd = parseDate(item.timelineEnd);
      var effectiveDue = due || timelineEnd;
      return Object.assign({}, item, {
        effectiveDue: effectiveDue ? effectiveDue.toISOString().slice(0, 10) : null,
        isOverdue: !!(effectiveDue && effectiveDue < today && !item.isDone),
        isBlocked: item.isLate || item.isOnHold || !!(effectiveDue && effectiveDue < today && !item.isDone)
      });
    });

    var ownerMap = {};
    var groupMap = {};
    var statusCounts = { done: 0, working: 0, todo: 0, late: 0, onHold: 0 };

    items.forEach(function(item) {
      if (item.isDone) statusCounts.done++;
      else if (item.isWorking) statusCounts.working++;
      else if (item.isLate) statusCounts.late++;
      else if (item.isOnHold) statusCounts.onHold++;
      else statusCounts.todo++;

      if (!groupMap[item.group]) {
        groupMap[item.group] = {
          name: item.group,
          total: 0,
          done: 0,
          open: 0,
          working: 0,
          late: 0,
          onHold: 0,
          todo: 0,
          progress: 0
        };
      }
      var g = groupMap[item.group];
      g.total++;
      if (item.isDone) g.done++; else g.open++;
      if (item.isWorking) g.working++;
      if (item.isLate || item.isOverdue) g.late++;
      if (item.isOnHold) g.onHold++;
      if (item.isTodo) g.todo++;
      g.progress = g.total ? Math.round(g.done / g.total * 100) : 0;

      var owners = item.owners && item.owners.length ? item.owners : ['Unassigned'];
      owners.forEach(function(owner) {
        if (!ownerMap[owner]) {
          ownerMap[owner] = {
            name: owner,
            total: 0,
            done: 0,
            working: 0,
            todo: 0,
            late: 0,
            onHold: 0,
            overdue: 0,
            blocked: 0,
            collaborative: 0,
            progress: 0,
            open: 0,
            oldestLateDate: null,
            oldestLateLabel: null,
            oldestLateDays: null,
            items: []
          };
        }
        var s = ownerMap[owner];
        s.total++;
        if (item.isDone) s.done++;
        if (item.isWorking) s.working++;
        if (item.isTodo) s.todo++;
        if (item.isLate) s.late++;
        if (item.isOnHold) s.onHold++;
        if (item.isOverdue) s.overdue++;
        if (item.isBlocked) s.blocked++;
        if (item.hasMultipleOwners) s.collaborative++;
        if (item.isLate && item.effectiveDue) {
          if (!s.oldestLateDate || item.effectiveDue < s.oldestLateDate) {
            s.oldestLateDate = item.effectiveDue;
            s.oldestLateLabel = item.name;
            var oldestLateDate = parseDate(item.effectiveDue);
            s.oldestLateDays = oldestLateDate ? Math.max(Math.round((today - oldestLateDate) / 86400000), 0) : null;
          }
        }
        s.items.push(item);
        s.open = s.total - s.done;
        s.progress = s.total ? Math.round(s.done / s.total * 100) : 0;
      });
    });

    var ownerEntries = Object.entries(ownerMap);
    ownerEntries.forEach(function(entry) {
      entry[1].items.sort(function(a, b) {
        if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
        if (a.isBlocked !== b.isBlocked) return a.isBlocked ? -1 : 1;
        return (a.effectiveDue || '').localeCompare(b.effectiveDue || '');
      });
    });

    var groupEntries = Object.values(groupMap).sort(function(a, b) { return b.total - a.total; });
    var overdueItems = items.filter(function(item) { return item.isOverdue; })
      .sort(function(a, b) { return (a.effectiveDue || '').localeCompare(b.effectiveDue || ''); });
    var dueSoonItems = items.filter(function(item) {
      if (!item.effectiveDue || item.isDone) return false;
      var dueDate = parseDate(item.effectiveDue);
      if (!dueDate) return false;
      var diffDays = Math.round((dueDate - today) / 86400000);
      return diffDays >= 0 && diffDays <= 3;
    }).sort(function(a, b) { return (a.effectiveDue || '').localeCompare(b.effectiveDue || ''); });

    var maxLoad = ownerEntries.slice().sort(function(a, b) { return b[1].open - a[1].open; })[0] || ['—', { open: 0 }];
    var mostBlocked = ownerEntries.slice().sort(function(a, b) { return b[1].blocked - a[1].blocked; })[0] || ['—', { blocked: 0 }];
    var mostLate = ownerEntries.slice().sort(function(a, b) {
      return b[1].late - a[1].late;
    })[0] || ['—', { late: 0 }];
    var mostLateCount = mostLate[1].late;
    var mostLateLeaders = ownerEntries.filter(function(entry) {
      return entry[1].late === mostLateCount;
    }).map(function(entry) { return entry[0]; });
    var topOverdueOwners = ownerEntries.slice()
      .filter(function(entry) { return entry[1].overdue > 0; })
      .sort(function(a, b) {
        if (b[1].overdue !== a[1].overdue) return b[1].overdue - a[1].overdue;
        return b[1].open - a[1].open;
      })
      .slice(0, 5);
    var longestLateOwners = ownerEntries.slice()
      .filter(function(entry) { return !!entry[1].oldestLateDate; })
      .sort(function(a, b) {
        if (a[1].oldestLateDate !== b[1].oldestLateDate) return a[1].oldestLateDate.localeCompare(b[1].oldestLateDate);
        return b[1].late - a[1].late;
      })
      .slice(0, 5);
    var bestProgress = ownerEntries.slice().filter(function(e) { return e[1].total > 0; })
      .sort(function(a, b) { return b[1].progress - a[1].progress; })[0] || ['—', { progress: 0 }];

    return {
      board: data.board,
      syncedAt: data.syncedAt,
      items: items,
      ownerEntries: ownerEntries,
      groupEntries: groupEntries,
      totalItems: items.length,
      done: statusCounts.done,
      working: statusCounts.working,
      todo: statusCounts.todo,
      late: statusCounts.late,
      onHold: statusCounts.onHold,
      blocked: statusCounts.late + statusCounts.onHold + overdueItems.length,
      open: items.length - statusCounts.done,
      progress: items.length ? Math.round(statusCounts.done / items.length * 100) : 0,
      activeOwners: ownerEntries.length,
      moduleCount: groupEntries.length,
      maxLoad: maxLoad,
      mostBlocked: mostBlocked,
      mostLate: mostLate,
      mostLateCount: mostLateCount,
      mostLateLeaders: mostLateLeaders,
      topOverdueOwners: topOverdueOwners,
      longestLateOwners: longestLateOwners,
      bestProgress: bestProgress,
      overdueItems: overdueItems,
      dueSoonItems: dueSoonItems
    };
  }

  function renderAll() {
    if (!cachedStats) return;
    var syncLabel = new Date(cachedStats.syncedAt).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
    var sel = document.getElementById('team-date-select');
    if (sel) sel.innerHTML = '<option>' + cachedStats.board.name + ' · Sync ' + syncLabel + '</option>';
    renderKPIs(cachedStats);
    renderPersons(cachedStats, currentSort);
    renderCharts(cachedStats);
    renderOwnerRankings(cachedStats);
    renderModules(cachedStats);
    renderFocus(cachedStats);
    renderExecutiveSummary(cachedStats);
    renderFindings(cachedStats);
    renderRecommendations(cachedStats);
    renderPMComment(cachedStats);
    var trend = document.getElementById('team-trend-section');
    if (trend) trend.style.display = 'none';
    setText('team-footer-date', syncLabel);
    filterTasks(currentFilter);
  }

  async function syncData() {
    if (syncInFlight) return;

    var previousSyncedAt = cachedStats ? cachedStats.syncedAt : null;
    setSyncButtonState(true);
    setSyncStatus('Syncing Monday board and waiting for GitHub Pages...', 'loading');

    try {
      var response = await fetch(MONDAY_SYNC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'manual-button', force: true })
      });

      var rawBody = await response.text();
      var result = rawBody ? JSON.parse(rawBody) : null;
      if (!response.ok || !result.ok) {
        throw new Error(result && result.message ? result.message : 'Sync failed or returned an empty response');
      }

      setSyncStatus('Sync finished in backend. Waiting for published JSON...', 'loading');
      var published = await waitForPublishedSync(previousSyncedAt, result.syncedAt);

      if (published) {
        setSyncStatus('Synced successfully. ' + (result.itemCount ? formatNumber(result.itemCount) + ' items refreshed.' : 'Dashboard updated.'), 'success');
      } else {
        setSyncStatus('Backend sync completed, but GitHub Pages has not published the new JSON yet. Refresh again in a moment.', 'loading');
      }
    } catch (err) {
      console.error('Monday sync failed:', err);
      setSyncStatus('Sync failed: ' + err.message, 'error');
    } finally {
      setSyncButtonState(false);
      if (document.getElementById('team-view') && document.getElementById('team-view').style.display !== 'none') {
        refresh();
      }
    }
  }

  function renderKPIs(st) {
    var mostLateSub = formatNumber(st.mostLateCount) + ' in status Late';
    if (st.mostLateLeaders.length > 1 && st.mostLateCount > 0) {
      mostLateSub += ' · tie +' + (st.mostLateLeaders.length - 1);
    }

    var kpis = [
      { label: 'Board Items', value: formatNumber(st.totalItems), sub: st.board.name, cls: '' },
      { label: 'Done', value: formatNumber(st.done), sub: st.progress + '% completed', cls: 'green' },
      { label: 'Working', value: formatNumber(st.working), sub: formatNumber(st.open) + ' still open', cls: 'yellow' },
      { label: 'Late / On Hold', value: formatNumber(st.late + st.onHold), sub: formatNumber(st.overdueItems.length) + ' overdue by date', cls: 'red' },
      { label: 'To Do', value: formatNumber(st.todo), sub: 'not started yet', cls: '' },
      { label: 'Owners', value: formatNumber(st.activeOwners), sub: 'people with assignments', cls: '' },
      { label: 'Top Workload', value: shortName(st.maxLoad[0]), sub: formatNumber(st.maxLoad[1].open) + ' open items', cls: st.maxLoad[1].open > 6 ? 'red' : 'yellow' },
      { label: 'Most Late', value: shortName(st.mostLate[0]), sub: mostLateSub, cls: st.mostLateCount ? 'red' : '' },
      { label: 'Best Progress', value: shortName(st.bestProgress[0]), sub: st.bestProgress[1].progress + '% done', cls: 'green' },
      { label: 'Modules', value: formatNumber(st.moduleCount), sub: st.groupEntries[0] ? 'largest: ' + st.groupEntries[0].name : 'no groups', cls: '' },
      { label: 'Most Blocked', value: shortName(st.mostBlocked[0]), sub: formatNumber(st.mostBlocked[1].blocked) + ' blocked / overdue', cls: st.mostBlocked[1].blocked ? 'red' : '' }
    ];
    setHTML('team-kpi-grid', kpis.map(function(k) {
      return '<div class="tm-kpi' + (k.cls ? ' ' + k.cls : '') + '">' +
        '<div class="tm-kpi-label">' + k.label + '</div>' +
        '<div class="tm-kpi-value">' + k.value + '</div>' +
        '<div class="tm-kpi-sub">' + k.sub + '</div></div>';
    }).join(''));
  }

  function renderPersons(st, sortBy) {
    currentSort = sortBy || currentSort;
    var entries = st.ownerEntries.slice();
    if (currentSort === 'workload') entries.sort(function(a, b) { return b[1].open - a[1].open; });
    if (currentSort === 'progress') entries.sort(function(a, b) { return b[1].progress - a[1].progress; });
    if (currentSort === 'blocked') entries.sort(function(a, b) { return b[1].blocked - a[1].blocked; });

    var html = entries.map(function(pair) {
      var name = pair[0];
      var s = pair[1];
      var highlight = s.blocked > 0 ? ' tm-highlight-overload' : (s.progress === 100 ? ' tm-highlight-star' : '');
      var tags = '';
      if (s.blocked > 0) tags += '<span class="tm-badge tm-badge-red">' + formatNumber(s.blocked) + ' blocked</span> ';
      if (s.collaborative > 0) tags += '<span class="tm-badge tm-badge-blue">' + formatNumber(s.collaborative) + ' multi-owner</span> ';
      if (s.progress === 100) tags += '<span class="tm-badge tm-badge-green">100% done</span> ';

      var taskRows = s.items.map(function(item) {
        var icon = item.isDone ? '✓' : (item.isBlocked ? '!' : '•');
        var statusCls = item.isDone ? 'tm-task-done' : 'tm-task-pending';
        var tagsHtml = '<span class="tm-tag tm-tag-pendiente">' + item.status + '</span>';
        if (item.group) tagsHtml += '<span class="tm-tag tm-tag-colaborativa">' + item.group + '</span>';
        if (item.effectiveDue) tagsHtml += '<span class="tm-tag tm-tag-imprevista">Due ' + item.effectiveDue + '</span>';
        return '<li class="tm-task-item" data-status="' + item.status + '" data-overdue="' + (item.isOverdue ? 'true' : 'false') + '">' +
          '<div class="tm-task-icon ' + statusCls + '">' + icon + '</div>' +
          '<span>' + item.name + '</span>' +
          '<div class="tm-task-tags">' + tagsHtml + '</div></li>';
      }).join('');

      return '<div class="tm-card' + highlight + ' tm-person-card" data-name="' + name.toLowerCase() + '">' +
        '<div class="tm-card-header" onclick="TeamDashboard.toggleCard(this)">' +
          '<h3><span class="tm-arrow">▶</span> ' + name + ' ' + tags + '</h3>' +
          '<div class="tm-meta">' +
            '<span class="tm-badge tm-badge-' + pctClass(s.progress) + '">' + s.progress + '%</span>' +
            '<div class="tm-progress-bar"><div class="tm-progress-fill" style="width:' + s.progress + '%;background:' + pctColor(s.progress) + '"></div></div>' +
            '<span style="font-size:12px;color:#64748b">' + s.done + '/' + s.total + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="tm-card-body">' +
          '<div class="tm-stats-row">' +
            '<span><strong>' + s.total + '</strong> total</span>' +
            '<span style="color:#16a34a"><strong>' + s.done + '</strong> done</span>' +
            '<span style="color:#ca8a04"><strong>' + s.working + '</strong> working</span>' +
            '<span style="color:#dc2626"><strong>' + s.blocked + '</strong> blocked</span>' +
            '<span style="color:#475569"><strong>' + s.todo + '</strong> to do</span>' +
          '</div>' +
          '<ul class="tm-task-list">' + taskRows + '</ul>' +
        '</div></div>';
    }).join('');

    setHTML('team-persons-container', html);
  }

  function drawOwnerStatusChart(st) {
    var canvas = document.getElementById('chartTeamBar');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var entries = st.ownerEntries.slice().sort(function(a, b) { return b[1].total - a[1].total; }).slice(0, 8);
    var W = canvas.width = getChartWidth(canvas, 720);
    var H = canvas.height = Math.max(240, entries.length * 34 + 50);
    var mL = 130, mR = 40, mT = 10;
    var cW = W - mL - mR;
    var maxVal = Math.max.apply(null, entries.map(function(e) { return e[1].total; }).concat([1]));
    ctx.clearRect(0, 0, W, H);
    entries.forEach(function(pair, i) {
      var s = pair[1];
      var y = mT + i * 30 + 18;
      var doneW = (s.done / maxVal) * cW;
      var openW = (s.open / maxVal) * cW;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#334155';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(shortName(pair[0]), mL - 10, y);
      ctx.fillStyle = '#16a34a';
      roundedRect(ctx, mL, y - 9, doneW, 8, 3);
      ctx.fillStyle = '#f59e0b';
      roundedRect(ctx, mL, y + 2, openW, 8, 3);
    });
  }

  function drawGroupPieChart(st) {
    var canvas = document.getElementById('chartTeamPie');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var entries = st.groupEntries.slice(0, 8);
    var W = canvas.width = getChartWidth(canvas, 720);
    var H = canvas.height = 280;
    var cx = W / 2 - 60;
    var cy = H / 2;
    var r = Math.min(92, H / 2 - 20);
    ctx.clearRect(0, 0, W, H);
    var total = entries.reduce(function(sum, entry) { return sum + entry.total; }, 0) || 1;
    var angle = -Math.PI / 2;
    entries.forEach(function(entry, idx) {
      var slice = entry.total / total * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.fillStyle = TEAM_COLORS[idx % TEAM_COLORS.length];
      ctx.fill();
      angle += slice;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Space Grotesk, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(formatNumber(st.totalItems), cx, cy - 6);
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('items', cx, cy + 12);
    ctx.textAlign = 'left';
    ctx.font = '11px Inter, sans-serif';
    entries.forEach(function(entry, idx) {
      var y = 20 + idx * 18;
      ctx.fillStyle = TEAM_COLORS[idx % TEAM_COLORS.length];
      roundedRect(ctx, W - 165, y, 10, 10, 2);
      ctx.fillStyle = '#334155';
      ctx.fillText(shortName(entry.name) + ' (' + entry.total + ')', W - 150, y + 9);
    });
  }

  function drawOpenLoadChart(st) {
    var canvas = document.getElementById('chartTeamLoad');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var entries = st.ownerEntries.slice().sort(function(a, b) { return b[1].open - a[1].open; }).slice(0, 8);
    var W = canvas.width = getChartWidth(canvas, 720);
    var H = canvas.height = Math.max(240, entries.length * 34 + 40);
    var mL = 130, mR = 50, mT = 10;
    var cW = W - mL - mR;
    var maxVal = Math.max.apply(null, entries.map(function(e) { return e[1].open; }).concat([1]));
    ctx.clearRect(0, 0, W, H);
    entries.forEach(function(pair, i) {
      var s = pair[1];
      var y = mT + i * 30 + 18;
      var w = (s.open / maxVal) * cW;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#334155';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(shortName(pair[0]), mL - 10, y);
      ctx.fillStyle = s.blocked > 0 ? '#dc2626' : '#2563eb';
      roundedRect(ctx, mL, y - 8, w, 16, 4);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      ctx.fillText(String(s.open), mL + w + 8, y + 1);
    });
  }

  function drawGroupProgressChart(st) {
    var canvas = document.getElementById('chartTeamCompliance');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var entries = st.groupEntries.slice().sort(function(a, b) { return b.progress - a.progress; }).slice(0, 8);
    var W = canvas.width = getChartWidth(canvas, 720);
    var H = canvas.height = Math.max(240, entries.length * 34 + 40);
    var mL = 130, mR = 50, mT = 10;
    var cW = W - mL - mR;
    ctx.clearRect(0, 0, W, H);
    entries.forEach(function(entry, i) {
      var y = mT + i * 30 + 18;
      var w = (entry.progress / 100) * cW;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#334155';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(shortName(entry.name), mL - 10, y);
      ctx.fillStyle = pctColor(entry.progress);
      roundedRect(ctx, mL, y - 8, w, 16, 4);
      ctx.textAlign = 'left';
      ctx.fillText(entry.progress + '%', mL + w + 8, y + 1);
    });
  }

  function renderCharts(st) {
    drawOwnerStatusChart(st);
    drawGroupPieChart(st);
    drawOpenLoadChart(st);
    drawGroupProgressChart(st);
  }

  function renderOwnerRankings(st) {
    var overdueHTML = st.topOverdueOwners.length
      ? '<ol class="tm-ranking-list">' + st.topOverdueOwners.map(function(pair, idx) {
          var owner = pair[0];
          var data = pair[1];
          return '<li class="tm-ranking-item">' +
            '<div class="tm-ranking-rank">' + (idx + 1) + '</div>' +
            '<div class="tm-ranking-copy">' +
              '<div class="tm-ranking-title">' + owner + '</div>' +
              '<div class="tm-ranking-sub">' + formatNumber(data.overdue) + ' overdue by date · ' + formatNumber(data.open) + ' open</div>' +
            '</div>' +
            '<div class="tm-ranking-value">' + formatNumber(data.overdue) + '</div>' +
          '</li>';
        }).join('') + '</ol>'
      : '<div class="tm-ranking-empty">No overdue items by date on the board.</div>';

    var longestLateHTML = st.longestLateOwners.length
      ? '<ol class="tm-ranking-list">' + st.longestLateOwners.map(function(pair, idx) {
          var owner = pair[0];
          var data = pair[1];
          var dayLabel = data.oldestLateDays === 1 ? '1 day in Late' : formatNumber(data.oldestLateDays) + ' days in Late';
          return '<li class="tm-ranking-item">' +
            '<div class="tm-ranking-rank">' + (idx + 1) + '</div>' +
            '<div class="tm-ranking-copy">' +
              '<div class="tm-ranking-title">' + owner + '</div>' +
              '<div class="tm-ranking-sub">Oldest Late since ' + data.oldestLateDate + ' · ' + dayLabel + '</div>' +
            '</div>' +
            '<div class="tm-ranking-value">' + formatNumber(data.oldestLateDays) + 'd</div>' +
          '</li>';
        }).join('') + '</ol>'
      : '<div class="tm-ranking-empty">No items currently in status Late with a due date.</div>';

    setHTML('team-overdue-ranking',
      '<h3>Top Overdue By Date</h3>' +
      '<p class="tm-ranking-note">Derived metric: items past due date, even if Monday status is not <strong>Late</strong>.</p>' +
      overdueHTML);

    setHTML('team-longest-late-ranking',
      '<h3>Longest In Status Late</h3>' +
      '<p class="tm-ranking-note">Monday status metric: earliest due date among items currently in <strong>Late</strong>.</p>' +
      longestLateHTML);
  }

  function renderModules(st) {
    var modules = st.groupEntries.map(function(group) {
      return '<div class="tm-card" style="padding:14px 16px">' +
        '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">' +
          '<div><div style="font-size:13px;font-weight:700;color:#0f172a">' + group.name + '</div>' +
          '<div style="font-size:11px;color:#64748b;margin-top:2px">' + formatNumber(group.done) + ' done · ' + formatNumber(group.open) + ' open</div></div>' +
          '<span class="tm-badge tm-badge-' + pctClass(group.progress) + '">' + group.progress + '%</span>' +
        '</div>' +
        '<div class="tm-progress-bar" style="margin-top:10px"><div class="tm-progress-fill" style="width:' + group.progress + '%;background:' + pctColor(group.progress) + '"></div></div>' +
      '</div>';
    }).join('');
    setHTML('team-collab-container', '<h3>Module Progress</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' + modules + '</div>');
  }

  function renderFocus(st) {
    var urgent = st.overdueItems.concat(st.dueSoonItems.filter(function(item) {
      return !st.overdueItems.find(function(overdue) { return overdue.id === item.id; });
    })).slice(0, 12);
    if (!urgent.length) {
      setHTML('team-nextday-container', '<h3>Due Soon / Overdue</h3><div class="tm-card" style="padding:16px;color:#64748b">No overdue or due-soon items on the board.</div>');
      return;
    }
    var rows = urgent.map(function(item) {
      var owners = item.owners && item.owners.length ? item.owners.join(', ') : 'Unassigned';
      var badge = item.isOverdue ? '<span class="tm-badge tm-badge-red">Overdue</span>' : '<span class="tm-badge tm-badge-yellow">Due Soon</span>';
      return '<li style="padding:10px 0;border-bottom:1px solid #e2e8f0;display:flex;gap:10px;align-items:flex-start">' +
        '<span style="color:' + (item.isOverdue ? '#dc2626' : '#ca8a04') + '">●</span>' +
        '<div style="flex:1"><strong style="font-size:13px">' + item.name + '</strong><br><span style="font-size:12px;color:#64748b">' + item.group + ' · ' + owners + ' · ' + (item.effectiveDue || 'No due date') + '</span></div>' +
        badge + '</li>';
    }).join('');
    setHTML('team-nextday-container', '<h3>Due Soon / Overdue</h3><div class="tm-card"><div style="padding:14px 18px"><ul style="list-style:none;margin:0;padding:0">' + rows + '</ul></div></div>');
  }

  function renderExecutiveSummary(st) {
    setHTML('team-executive-summary',
      '<h3>Board Snapshot</h3>' +
      '<p style="font-size:13.5px;line-height:1.7;color:#334155">This view is based directly on Monday board <strong>' + st.board.name + '</strong>. There are <strong>' + formatNumber(st.totalItems) +
      ' items</strong> across <strong>' + formatNumber(st.moduleCount) + ' modules</strong>, with <strong>' + formatNumber(st.done) +
      ' done</strong>, <strong>' + formatNumber(st.working) + ' in progress</strong>, and <strong>' + formatNumber(st.todo) +
      ' not started</strong>. Use this page to spot owner workload, blocked items, and module-level progress quickly.</p>');
  }

  function renderFindings(st) {
    var topGroups = st.groupEntries.filter(function(group) { return group.open > 0; }).slice(0, 4);
    var html = topGroups.map(function(group) {
      return '<div class="tm-finding-item tm-finding-warning"><span style="font-size:16px;flex-shrink:0">📌</span><span style="font-size:13px"><strong>' +
        group.name + '</strong> has ' + formatNumber(group.open) + ' open items and ' + formatNumber(group.late + group.onHold) +
        ' blocked/late statuses.</span></div>';
    }).join('');
    setHTML('team-findings', '<h3>Modules Needing Attention</h3>' + html);
  }

  function renderRecommendations(st) {
    var owners = st.ownerEntries.slice().sort(function(a, b) { return b[1].blocked - a[1].blocked; }).filter(function(pair) {
      return pair[1].blocked > 0 || pair[1].open > 0;
    }).slice(0, 4);
    var html = owners.map(function(pair) {
      var s = pair[1];
      return '<div class="tm-finding-item tm-finding-info"><span style="font-size:16px;flex-shrink:0">👤</span><span style="font-size:13px"><strong>' +
        pair[0] + '</strong>: ' + formatNumber(s.open) + ' open, ' + formatNumber(s.blocked) + ' blocked, ' +
        formatNumber(s.done) + ' done.</span></div>';
    }).join('');
    setHTML('team-recommendations', '<h3>Owner Work Snapshot</h3>' + html);
  }

  function renderPMComment() {
    setHTML('team-pm-comment',
      '<h3>How To Read This Board</h3>' +
      '<p style="font-size:13.5px;line-height:1.7;color:#334155">Use the KPI row for the big picture, the charts for status and workload distribution, the owner cards for individual follow-up, and the due-soon list as the execution queue. Statuses come directly from Monday: <strong>Done</strong>, <strong>Working on it</strong>, <strong>To Do</strong>, <strong>Late</strong>, and <strong>On Hold</strong>.</p>');
  }

  function filterTasks(filter) {
    currentFilter = filter;
    document.querySelectorAll('.tm-filter-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    document.querySelectorAll('.tm-person-card').forEach(function(card) {
      var visibleItems = 0;
      card.querySelectorAll('.tm-task-item').forEach(function(li) {
        var status = li.getAttribute('data-status') || '';
        var isOverdue = li.getAttribute('data-overdue') === 'true';
        var isDone = status === 'Done';
        var isWorking = status === 'Working on it';
        var isBlocked = status === 'Late' || status === 'On Hold' || isOverdue;
        var isTodo = status === 'To Do' || status === 'Unassigned';
        var show = filter === 'all' ||
          (filter === 'done' && isDone) ||
          (filter === 'working' && isWorking) ||
          (filter === 'blocked' && isBlocked) ||
          (filter === 'todo' && isTodo);
        li.style.display = show ? '' : 'none';
        if (show) visibleItems++;
      });
      card.style.display = visibleItems ? '' : 'none';
    });
    var searchInput = document.getElementById('team-search');
    if (searchInput && searchInput.value) filterBySearch(searchInput.value);
  }

  function filterBySearch(query) {
    var q = (query || '').toLowerCase();
    document.querySelectorAll('.tm-person-card').forEach(function(card) {
      var matchesQuery = card.getAttribute('data-name').indexOf(q) >= 0;
      var hasVisibleTasks = Array.from(card.querySelectorAll('.tm-task-item')).some(function(li) {
        return li.style.display !== 'none';
      });
      card.style.display = matchesQuery && hasVisibleTasks ? '' : 'none';
    });
  }

  function toggleCard(headerEl) {
    var body = headerEl.nextElementSibling;
    var arrow = headerEl.querySelector('.tm-arrow');
    if (body) body.classList.toggle('open');
    if (arrow) arrow.classList.toggle('open');
  }

  window.addEventListener('resize', function() {
    if (cachedStats) renderCharts(cachedStats);
  });

  return {
    loadData: loadData,
    filterTasks: filterTasks,
    filterBySearch: filterBySearch,
    toggleCard: toggleCard,
    sortPersons: function(by) {
      currentSort = by;
      document.querySelectorAll('.tm-sort-btn').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.sort === by);
      });
      if (cachedStats) {
        renderPersons(cachedStats, by);
        filterTasks(currentFilter);
      }
    },
    refresh: function() {
      if (!cachedStats) return;
      renderCharts(cachedStats);
    },
    loadLatest: async function() {
      var latest = await fetchTeamSnapshot(true);
      loadData(latest);
    },
    syncData: syncData
  };
})();
// ── Bootstrap ─────────────────────────────────
(async function init() {
  try {
    const data = await fetchMigrationSnapshot(false);
    loadMigrationData(data);

    // ── Team dashboard ──
    try {
      await TeamDashboard.loadLatest();
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
