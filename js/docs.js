// docs.js — Document Checklist & PNR Tracking

// ── Auth guard ────────────────────────────────────────────────────
function initPage(renderFn) {
  var session = sessionStorage.getItem('wanago_session');
  if (!session) { window.location.href = '../index.html'; return; }
  try {
    var s = JSON.parse(session);
    var tu = document.getElementById('topbar-user');
    if (tu) tu.textContent = s.email || '';
    if (typeof window.rebuildSidebar === 'function') window.rebuildSidebar();
  } catch(ex) {}
  function fadeLoader() {
    var l = document.getElementById('page-loader');
    var a = document.querySelector('.app');
    if (l) { l.classList.add('fade-out'); setTimeout(function(){ try{l.parentNode.removeChild(l);}catch(e){} }, 300); }
    if (a) a.classList.add('loaded');
  }
  setTimeout(function() {
    try { if (renderFn) renderFn(); } catch(e) { console.error('Docs render error:', e); }
    fadeLoader();
  }, 20);
}
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

// ── Checklist definition ──────────────────────────────────────────
const DOC_ITEMS = [
  { key:'passportReceived', emoji:'📄', label:'Passport Copy Received'     },
  { key:'visaApplied',      emoji:'🛂', label:'Visa Applied'               },
  { key:'visaReceived',     emoji:'✅', label:'Visa Received'              },
  { key:'ticketsIssued',    emoji:'✈️', label:'Flight / Train Tickets Issued' },
  { key:'hotelVouchers',    emoji:'🏨', label:'Hotel Vouchers Ready'       },
  { key:'insurance',        emoji:'🛡️', label:'Travel Insurance Done'      },
  { key:'welcomeLetter',    emoji:'📬', label:'Welcome Letter Sent'        },
];

// ── State ─────────────────────────────────────────────────────────
let _selectedBookingId = null;
let _docFilter = 'all';

// ── Helpers ───────────────────────────────────────────────────────
function _today() { return new Date().toISOString().slice(0, 10); }

function _docScore(b) {
  const cl = b.docChecklist || {};
  const done = DOC_ITEMS.filter(d => cl[d.key]).length;
  return { done, total: DOC_ITEMS.length };
}

function _fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _progressColor(done, total) {
  const pct = total ? done / total : 0;
  if (pct === 1)   return '#22c55e';
  if (pct >= 0.6)  return '#f59e0b';
  return '#ef4444';
}

// ── List rendering ────────────────────────────────────────────────
function renderDocList() {
  const query   = (document.getElementById('docs-search')?.value || '').toLowerCase();
  const today   = _today();
  const bookings = (DB.bookings || []).filter(b => {
    if (!b || b.status === 'Cancelled') return false;
    if (_docFilter === 'upcoming') return b.date >= today;
    if (_docFilter === 'complete') {
      const s = _docScore(b);
      return s.done === s.total;
    }
    if (_docFilter === 'incomplete') {
      const s = _docScore(b);
      return s.done < s.total;
    }
    return true;
  }).filter(b => {
    if (!query) return true;
    return (b.id || '').toLowerCase().includes(query) ||
           (b.customer || '').toLowerCase().includes(query) ||
           (b.pkg || '').toLowerCase().includes(query);
  }).sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);

  const body = document.getElementById('docs-list-body');
  if (!body) return;

  if (!bookings.length) {
    body.innerHTML = '<div class="docs-empty">No bookings found.</div>';
    return;
  }

  body.innerHTML = bookings.map(b => {
    const s     = _docScore(b);
    const pct   = Math.round((s.done / s.total) * 100);
    const color = _progressColor(s.done, s.total);
    const pnrCount = (b.pnrRecords || []).length;
    const isSelected = b.id === _selectedBookingId;
    const statusClass = { Confirmed:'chip-green', Pending:'chip-amber', Completed:'chip-blue' }[b.status] || 'chip-gray';
    return `<div class="doc-card${isSelected ? ' selected' : ''}" onclick="selectBooking('${_esc(b.id)}')">
      <div class="doc-card-id">${_esc(b.id)}</div>
      <div class="doc-card-name">${_esc(b.customer || '—')}</div>
      <div class="doc-card-sub" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
        <span>${_esc(b.pkg || '—')}</span>
        <span>·</span>
        <span>${_fmtDate(b.date)}</span>
        <span class="chip ${statusClass}" style="font-size:10px;padding:1px 7px">${_esc(b.status)}</span>
        ${pnrCount ? `<span style="font-size:10px;color:#6366f1">✈️ ${pnrCount} PNR</span>` : ''}
      </div>
      <div class="doc-progress-bar"><div class="doc-progress-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="doc-progress-label">${s.done}/${s.total} docs complete${pct === 100 ? ' ✓' : ''}</div>
    </div>`;
  }).join('');
}

function setDocFilter(f) {
  _docFilter = f;
  document.querySelectorAll('.docs-filter').forEach(el => el.classList.remove('active'));
  const btn = document.getElementById('df-' + f);
  if (btn) btn.classList.add('active');
  renderDocList();
}

// ── Panel rendering ───────────────────────────────────────────────
function selectBooking(bookingId) {
  _selectedBookingId = bookingId;
  renderDocList();
  renderPanel(bookingId);
}

function renderPanel(bookingId) {
  const panel = document.getElementById('docs-panel');
  if (!panel) return;
  const b = (DB.bookings || []).find(x => x.id === bookingId);
  if (!b) { panel.innerHTML = '<div class="panel-placeholder"><div>Booking not found.</div></div>'; return; }

  const cl       = b.docChecklist || {};
  const pnrList  = b.pnrRecords   || [];
  const s        = _docScore(b);
  const color    = _progressColor(s.done, s.total);
  const statusClass = { Confirmed:'chip-green', Pending:'chip-amber', Completed:'chip-blue' }[b.status] || 'chip-gray';

  panel.innerHTML = `
    <div class="panel-hdr">
      <div>
        <div class="panel-booking-id">${_esc(b.id)}</div>
        <div class="panel-booking-name">${_esc(b.customer || '—')}</div>
        <div class="panel-booking-sub">
          ${_esc(b.pkg || '—')} &nbsp;·&nbsp; ${_fmtDate(b.date)}
          &nbsp;·&nbsp; ${b.pax || 1} pax
          &nbsp;·&nbsp; <span class="chip ${statusClass}" style="font-size:11px">${_esc(b.status)}</span>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-size:22px;font-weight:700;color:${color}">${s.done}/${s.total}</div>
        <div style="font-size:11px;color:#94a3b8">docs complete</div>
      </div>
    </div>

    <div class="panel-body">

      <!-- Document Checklist -->
      <div class="panel-section">
        <div class="panel-section-title">📋 Document Checklist</div>
        <div class="checklist">
          ${DOC_ITEMS.map(d => {
            const checked = !!cl[d.key];
            const dateStr = cl[d.key + '_date'] ? `<span class="check-date">${_fmtDate(cl[d.key + '_date'])}</span>` : '';
            return `<div class="checklist-item${checked ? ' done' : ''}" onclick="toggleDocItem('${_esc(b.id)}','${d.key}')">
              <div class="check-box">${checked ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}</div>
              <span class="check-emoji">${d.emoji}</span>
              <span class="check-label">${d.label}</span>
              ${dateStr}
            </div>`;
          }).join('')}
        </div>
        <div style="margin-top:10px">
          <button class="btn btn-outline btn-sm" onclick="markAllDocs('${_esc(b.id)}', true)"  style="margin-right:6px">✓ Mark All Done</button>
          <button class="btn btn-outline btn-sm" onclick="markAllDocs('${_esc(b.id)}', false)">✗ Clear All</button>
        </div>
      </div>

      <!-- PNR Records -->
      <div class="panel-section">
        <div class="panel-section-title">✈️ PNR / Ticket Records</div>
        ${pnrList.length ? `
          <div style="overflow-x:auto;border:1px solid #e8ecf0;border-radius:10px">
            <table class="pnr-table">
              <thead>
                <tr>
                  <th>Passenger</th>
                  <th>PNR / Ticket</th>
                  <th>Airline / Flight</th>
                  <th>Sector</th>
                  <th>Seat</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${pnrList.map((p, i) => `
                  <tr>
                    <td style="font-weight:500">${_esc(p.name || '—')}</td>
                    <td><span class="pnr-code">${_esc(p.pnr || '—')}</span></td>
                    <td>${_esc(p.airline || '—')}${p.flightNo ? '<br><span style="font-size:11px;color:#94a3b8">'+_esc(p.flightNo)+'</span>' : ''}</td>
                    <td>${_esc(p.sector || '—')}</td>
                    <td>${_esc(p.seat || '—')}</td>
                    <td>${p.date ? _fmtDate(p.date) : '—'}${p.time ? '<br><span style="font-size:11px;color:#94a3b8">'+_esc(p.time)+'</span>' : ''}</td>
                    <td>
                      <button class="btn-danger-sm" onclick="deletePnrRecord('${_esc(b.id)}',${i})">✕</button>
                    </td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : `<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px;border:1.5px dashed #e2e8f0;border-radius:10px">No PNR records yet. Add one below.</div>`}
        <div style="margin-top:10px">
          <button class="btn-add" onclick="openPnrModal('${_esc(b.id)}', -1)">+ Add PNR / Ticket</button>
        </div>
      </div>

      <!-- Notes -->
      <div class="panel-section">
        <div class="panel-section-title">📝 Document Notes</div>
        <textarea class="form-input" id="doc-notes-${_esc(b.id)}" rows="3" placeholder="Add any document-related notes…" style="resize:vertical;font-family:inherit">${_esc(b.docNotes || '')}</textarea>
        <button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="saveDocNotes('${_esc(b.id)}')">Save Notes</button>
      </div>

    </div>`;
}

// ── Checklist toggle ──────────────────────────────────────────────
function toggleDocItem(bookingId, key) {
  const bookings = DB.bookings || [];
  const idx = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) return;
  if (!bookings[idx].docChecklist) bookings[idx].docChecklist = {};
  const wasChecked = !!bookings[idx].docChecklist[key];
  bookings[idx].docChecklist[key] = !wasChecked;
  if (!wasChecked) {
    bookings[idx].docChecklist[key + '_date'] = _today();
  } else {
    delete bookings[idx].docChecklist[key + '_date'];
  }
  DB.bookings = bookings;
  saveDB();
  _syncBooking(bookings[idx]);
  renderDocList();
  renderPanel(bookingId);
}

function markAllDocs(bookingId, state) {
  const bookings = DB.bookings || [];
  const idx = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) return;
  if (!bookings[idx].docChecklist) bookings[idx].docChecklist = {};
  DOC_ITEMS.forEach(d => {
    bookings[idx].docChecklist[d.key] = state;
    if (state) bookings[idx].docChecklist[d.key + '_date'] = _today();
    else       delete bookings[idx].docChecklist[d.key + '_date'];
  });
  DB.bookings = bookings;
  saveDB();
  _syncBooking(bookings[idx]);
  renderDocList();
  renderPanel(bookingId);
  showToast(state ? 'All documents marked complete.' : 'Checklist cleared.');
}

// ── PNR records ───────────────────────────────────────────────────
let _pnrBookingId = null;

function openPnrModal(bookingId, idx) {
  _pnrBookingId = bookingId;
  document.getElementById('pnr-edit-idx').value = idx;
  document.getElementById('pnr-modal-title').textContent = idx >= 0 ? 'Edit PNR Record' : 'Add PNR / Ticket';

  const b = (DB.bookings || []).find(x => x.id === bookingId);
  const pnrList = b?.pnrRecords || [];
  const rec = idx >= 0 ? pnrList[idx] : {};

  document.getElementById('pnr-name').value    = rec.name    || '';
  document.getElementById('pnr-code').value    = rec.pnr     || '';
  document.getElementById('pnr-airline').value = rec.airline || '';
  document.getElementById('pnr-flight').value  = rec.flightNo|| '';
  document.getElementById('pnr-sector').value  = rec.sector  || '';
  document.getElementById('pnr-seat').value    = rec.seat    || '';
  document.getElementById('pnr-date').value    = rec.date    || (b?.date || '');
  document.getElementById('pnr-time').value    = rec.time    || '';
  document.getElementById('pnr-error').style.display = 'none';
  document.getElementById('modal-pnr').classList.add('open');
  setTimeout(() => document.getElementById('pnr-name').focus(), 50);
}

function closePnrModal() {
  document.getElementById('modal-pnr').classList.remove('open');
  _pnrBookingId = null;
}

function savePnrRecord() {
  const name = document.getElementById('pnr-name').value.trim();
  const pnr  = document.getElementById('pnr-code').value.trim().toUpperCase();
  const errEl = document.getElementById('pnr-error');
  if (!name || !pnr) { errEl.textContent = 'Passenger name and PNR are required.'; errEl.style.display = ''; return; }
  errEl.style.display = 'none';

  const bookings = DB.bookings || [];
  const idx      = bookings.findIndex(x => x.id === _pnrBookingId);
  if (idx < 0) { showToast('Booking not found.', 'error'); return; }

  if (!bookings[idx].pnrRecords) bookings[idx].pnrRecords = [];
  const rec = {
    name,
    pnr,
    airline:  document.getElementById('pnr-airline').value.trim(),
    flightNo: document.getElementById('pnr-flight').value.trim(),
    sector:   document.getElementById('pnr-sector').value.trim(),
    seat:     document.getElementById('pnr-seat').value.trim(),
    date:     document.getElementById('pnr-date').value,
    time:     document.getElementById('pnr-time').value,
  };

  const editIdx = parseInt(document.getElementById('pnr-edit-idx').value);
  if (editIdx >= 0) {
    bookings[idx].pnrRecords[editIdx] = rec;
  } else {
    bookings[idx].pnrRecords.push(rec);
  }

  DB.bookings = bookings;
  saveDB();
  _syncBooking(bookings[idx]);
  closePnrModal();
  renderDocList();
  renderPanel(_pnrBookingId || bookings[idx].id);
  showToast('PNR record saved.');
}

function deletePnrRecord(bookingId, recIdx) {
  if (!confirm('Remove this PNR record?')) return;
  const bookings = DB.bookings || [];
  const idx = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) return;
  (bookings[idx].pnrRecords || []).splice(recIdx, 1);
  DB.bookings = bookings;
  saveDB();
  _syncBooking(bookings[idx]);
  renderDocList();
  renderPanel(bookingId);
  showToast('PNR record removed.');
}

// ── Notes ─────────────────────────────────────────────────────────
function saveDocNotes(bookingId) {
  const bookings = DB.bookings || [];
  const idx = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) return;
  const notesEl = document.getElementById(`doc-notes-${bookingId}`);
  bookings[idx].docNotes = notesEl ? notesEl.value.trim() : '';
  DB.bookings = bookings;
  saveDB();
  _syncBooking(bookings[idx]);
  showToast('Notes saved.');
}

// ── Firestore sync helper ─────────────────────────────────────────
function _syncBooking(booking) {
  if (typeof dbSave === 'function') {
    dbSave('bookings', booking, function(err) {
      if (err) console.warn('Firestore sync failed for booking', booking.id, err);
    });
  }
}

// ── Expose globals ────────────────────────────────────────────────
Object.assign(window, {
  renderDocList, setDocFilter, selectBooking, renderPanel,
  toggleDocItem, markAllDocs,
  openPnrModal, closePnrModal, savePnrRecord, deletePnrRecord,
  saveDocNotes,
});

// ── Init ──────────────────────────────────────────────────────────
initPage(function() {
  renderDocList();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      renderDocList();
      if (_selectedBookingId) renderPanel(_selectedBookingId);
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('bookings', function() {
          renderDocList();
          if (_selectedBookingId) renderPanel(_selectedBookingId);
        });
      }
    }, 5000);
  }
});
