// cancellations.js — Cancellations & Rescheduling

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
    try { if (renderFn) renderFn(); } catch(e) { console.error('Cancellations render error:', e); }
    fadeLoader();
  }, 20);
}
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

// ── State ─────────────────────────────────────────────────────────
let _cnTab = 'cancellations';

// ── Helpers ───────────────────────────────────────────────────────
function _today() { return new Date().toISOString().slice(0, 10); }

function _fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _fmtCurrency(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function _setText(id, val) {
  const el = document.getElementById(id); if (el) el.textContent = val;
}

// ── Stats ─────────────────────────────────────────────────────────
function renderStats() {
  const bookings    = DB.bookings || [];
  const cancelled   = bookings.filter(b => b.status === 'Cancelled');
  const refPending  = cancelled.filter(b => b.cancellation?.refundStatus === 'pending');
  const refDone     = cancelled.filter(b => ['full','partial'].includes(b.cancellation?.refundStatus));
  const rescheduled = bookings.filter(b => (b.rescheduleHistory || []).length > 0);

  _setText('stat-cancelled',     cancelled.length);
  _setText('stat-refund-pending',refPending.length);
  _setText('stat-refunded',      refDone.length);
  _setText('stat-rescheduled',   rescheduled.length);
}

// ── Tab rendering ─────────────────────────────────────────────────
function setCnTab(tab) {
  _cnTab = tab;
  document.querySelectorAll('.cn-tab').forEach(t => t.classList.remove('active'));
  const btn = document.getElementById('tab-' + tab);
  if (btn) btn.classList.add('active');
  const titles = { cancellations:'Cancelled Bookings', reschedules:'Rescheduled Bookings', refunds:'Refund Tracker' };
  _setText('cn-tab-title', titles[tab] || '');
  renderCnTab();
}

function renderCnTab() {
  const query = (document.getElementById('cn-search')?.value || '').toLowerCase();
  if (_cnTab === 'cancellations') renderCancellationsTab(query);
  if (_cnTab === 'reschedules')   renderReschedulesTab(query);
  if (_cnTab === 'refunds')       renderRefundsTab(query);
}

// ── Cancellations tab ─────────────────────────────────────────────
function renderCancellationsTab(query) {
  const rows = (DB.bookings || [])
    .filter(b => b.status === 'Cancelled')
    .filter(b => !query || _matchSearch(b, query))
    .sort((a, b) => (b.cancellation?.date || '') > (a.cancellation?.date || '') ? 1 : -1);

  _setText('cn-row-count', rows.length + ' record' + (rows.length !== 1 ? 's' : ''));

  const wrap = document.getElementById('cn-table-wrap');
  if (!wrap) return;
  if (!rows.length) { wrap.innerHTML = '<div class="cn-empty">No cancellations found.</div>'; return; }

  const refundLabel = { none:'No Refund', pending:'Pending', partial:'Partial', full:'Full Refund' };
  const refundClass = { none:'chip-gray', pending:'chip-amber', partial:'chip-blue', full:'chip-green' };

  wrap.innerHTML = `<table class="cn-table">
    <thead><tr>
      <th>Booking</th><th>Customer</th><th>Package</th><th>Dep. Date</th>
      <th>Cancelled On</th><th>Reason</th><th>Refund</th><th>Amount</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows.map(b => {
      const cn = b.cancellation || {};
      const rs = cn.refundStatus || 'none';
      return `<tr>
        <td><span style="font-size:12px;font-weight:700;color:#6366f1">${_esc(b.id)}</span></td>
        <td style="font-weight:500">${_esc(b.customer || '—')}</td>
        <td>${_esc(b.pkg || '—')}</td>
        <td>${_fmtDate(b.date)}</td>
        <td>${_fmtDate(cn.date)}</td>
        <td style="max-width:160px;white-space:normal"><span style="font-size:12px">${_esc(cn.reason || '—')}</span></td>
        <td><span class="chip ${refundClass[rs]}">${refundLabel[rs] || rs}</span></td>
        <td style="font-weight:500">${cn.refundAmount ? _fmtCurrency(cn.refundAmount) : '—'}</td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openRefundModal('${_esc(b.id)}')">Update Refund</button>
          <button class="btn btn-outline btn-sm" style="margin-left:4px" onclick="undoCancellation('${_esc(b.id)}')">Restore</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ── Reschedules tab ───────────────────────────────────────────────
function renderReschedulesTab(query) {
  const rows = (DB.bookings || [])
    .filter(b => (b.rescheduleHistory || []).length > 0)
    .filter(b => !query || _matchSearch(b, query))
    .sort((a, b) => {
      const lastA = a.rescheduleHistory[a.rescheduleHistory.length - 1]?.on || '';
      const lastB = b.rescheduleHistory[b.rescheduleHistory.length - 1]?.on || '';
      return lastB > lastA ? 1 : -1;
    });

  _setText('cn-row-count', rows.length + ' record' + (rows.length !== 1 ? 's' : ''));

  const wrap = document.getElementById('cn-table-wrap');
  if (!wrap) return;
  if (!rows.length) { wrap.innerHTML = '<div class="cn-empty">No rescheduled bookings found.</div>'; return; }

  wrap.innerHTML = `<table class="cn-table">
    <thead><tr>
      <th>Booking</th><th>Customer</th><th>Package</th><th>Current Date</th>
      <th>Reschedules</th><th>Last Rescheduled On</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows.map(b => {
      const hist = b.rescheduleHistory || [];
      const last = hist[hist.length - 1] || {};
      const statusClass = { Confirmed:'chip-green', Pending:'chip-amber', Completed:'chip-blue', Cancelled:'chip-red' }[b.status] || 'chip-gray';
      return `<tr>
        <td><span style="font-size:12px;font-weight:700;color:#6366f1">${_esc(b.id)}</span></td>
        <td style="font-weight:500">${_esc(b.customer || '—')}</td>
        <td>${_esc(b.pkg || '—')}<br><span class="chip ${statusClass}" style="font-size:10px">${_esc(b.status)}</span></td>
        <td>${_fmtDate(b.date)}</td>
        <td style="text-align:center"><span style="font-weight:700;color:#6366f1">${hist.length}×</span></td>
        <td>${_fmtDate(last.on)}<br><span style="font-size:11px;color:#94a3b8">${_esc(last.by || '')}</span></td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="openHistoryModal('${_esc(b.id)}')">View History</button>
          <button class="btn btn-amber btn-sm" style="margin-left:4px" onclick="openRescheduleModal('${_esc(b.id)}')">↺ Reschedule Again</button>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

// ── Refunds tab ───────────────────────────────────────────────────
function renderRefundsTab(query) {
  const rows = (DB.bookings || [])
    .filter(b => b.status === 'Cancelled' && (b.cancellation?.refundStatus || 'none') !== 'none')
    .filter(b => !query || _matchSearch(b, query))
    .sort((a, b) => (b.cancellation?.refundDate || b.cancellation?.date || '') > (a.cancellation?.refundDate || a.cancellation?.date || '') ? 1 : -1);

  _setText('cn-row-count', rows.length + ' record' + (rows.length !== 1 ? 's' : ''));

  const wrap = document.getElementById('cn-table-wrap');
  if (!wrap) return;
  if (!rows.length) { wrap.innerHTML = '<div class="cn-empty">No refund records found.</div>'; return; }

  const refundLabel = { pending:'Pending', partial:'Partial', full:'Full Refund' };
  const refundClass = { pending:'chip-amber', partial:'chip-blue', full:'chip-green' };

  wrap.innerHTML = `<table class="cn-table">
    <thead><tr>
      <th>Booking</th><th>Customer</th><th>Booking Amount</th>
      <th>Refund Amount</th><th>Status</th><th>Mode</th><th>Refund Date</th><th>Actions</th>
    </tr></thead>
    <tbody>${rows.map(b => {
      const cn = b.cancellation || {};
      const rs = cn.refundStatus || 'none';
      return `<tr>
        <td><span style="font-size:12px;font-weight:700;color:#6366f1">${_esc(b.id)}</span><br><span style="font-size:11px;color:#94a3b8">${_esc(b.customer || '—')}</span></td>
        <td style="font-weight:500">${_esc(b.pkg || '—')}</td>
        <td>${b.amount && b.amount !== 'TBD' ? _fmtCurrency(b.amount) : '—'}</td>
        <td style="font-weight:600;color:#166534">${cn.refundAmount ? _fmtCurrency(cn.refundAmount) : '—'}</td>
        <td><span class="chip ${refundClass[rs] || 'chip-gray'}">${refundLabel[rs] || rs}</span></td>
        <td>${_esc(cn.refundMode || '—')}</td>
        <td>${_fmtDate(cn.refundDate)}</td>
        <td><button class="btn btn-outline btn-sm" onclick="openRefundModal('${_esc(b.id)}')">Update</button></td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

function _matchSearch(b, q) {
  return (b.id || '').toLowerCase().includes(q) ||
         (b.customer || '').toLowerCase().includes(q) ||
         (b.pkg || '').toLowerCase().includes(q);
}

// ── Cancel Booking Modal ──────────────────────────────────────────
function openCancelModal(bookingId) {
  _populateBookingSelect('cancel-booking-select', ['Confirmed','Pending']);
  if (bookingId) {
    document.getElementById('cancel-booking-select').value = bookingId;
    onCancelBookingChange();
  }
  document.getElementById('cancel-date').value            = _today();
  document.getElementById('cancel-by').value              = '';
  document.getElementById('cancel-reason-select').value   = '';
  document.getElementById('cancel-reason-other').value    = '';
  document.getElementById('cancel-reason-other-wrap').style.display = 'none';
  document.getElementById('cancel-refund-status').value   = 'pending';
  document.getElementById('cancel-refund-amount').value   = '';
  document.getElementById('cancel-notes').value           = '';
  document.getElementById('cancel-error').style.display   = 'none';
  document.getElementById('modal-cancel').classList.add('open');
}

function closeCancelModal() {
  document.getElementById('modal-cancel').classList.remove('open');
}

function onCancelBookingChange() {
  const id = document.getElementById('cancel-booking-select').value;
  const preview = document.getElementById('cancel-booking-preview');
  if (!id) { preview.style.display = 'none'; return; }
  const b = (DB.bookings || []).find(x => x.id === id);
  if (!b) { preview.style.display = 'none'; return; }
  document.getElementById('cbp-id').textContent   = b.id;
  document.getElementById('cbp-name').textContent = b.customer || '—';
  document.getElementById('cbp-sub').textContent  = `${b.pkg || '—'} · ${_fmtDate(b.date)} · ₹${Number(b.amount||0).toLocaleString('en-IN')}`;
  if (b.amount && b.amount !== 'TBD') {
    document.getElementById('cancel-refund-amount').value = b.amount;
  }
  preview.style.display = '';
}

function onCancelReasonChange() {
  const val = document.getElementById('cancel-reason-select').value;
  document.getElementById('cancel-reason-other-wrap').style.display = val === 'Other' ? '' : 'none';
}

function saveCancellation() {
  const id     = document.getElementById('cancel-booking-select').value;
  const date   = document.getElementById('cancel-date').value;
  const rsVal  = document.getElementById('cancel-reason-select').value;
  const reason = rsVal === 'Other'
    ? document.getElementById('cancel-reason-other').value.trim()
    : rsVal;
  const errEl = document.getElementById('cancel-error');

  if (!id)     { errEl.textContent = 'Please select a booking.';    errEl.style.display = ''; return; }
  if (!date)   { errEl.textContent = 'Cancellation date required.'; errEl.style.display = ''; return; }
  if (!reason) { errEl.textContent = 'Please select a reason.';     errEl.style.display = ''; return; }
  errEl.style.display = 'none';

  const bookings = DB.bookings || [];
  const idx = bookings.findIndex(x => x.id === id);
  if (idx < 0) { errEl.textContent = 'Booking not found.'; errEl.style.display = ''; return; }

  bookings[idx].status = 'Cancelled';
  bookings[idx].cancellation = {
    date,
    reason,
    cancelledBy:  document.getElementById('cancel-by').value.trim(),
    refundStatus: document.getElementById('cancel-refund-status').value,
    refundAmount: parseFloat(document.getElementById('cancel-refund-amount').value) || 0,
    notes:        document.getElementById('cancel-notes').value.trim(),
  };

  DB.bookings = bookings;
  saveDB();
  _syncBooking(bookings[idx]);
  closeCancelModal();
  renderStats();
  renderCnTab();
  showToast(`Booking ${id} cancelled.`);
}

// ── Undo Cancellation ─────────────────────────────────────────────
function undoCancellation(bookingId) {
  if (!confirm(`Restore booking ${bookingId} to Confirmed status?`)) return;
  const bookings = DB.bookings || [];
  const idx = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) return;
  bookings[idx].status = 'Confirmed';
  delete bookings[idx].cancellation;
  DB.bookings = bookings;
  saveDB();
  _syncBooking(bookings[idx]);
  renderStats();
  renderCnTab();
  showToast(`Booking ${bookingId} restored.`);
}

// ── Reschedule Modal ──────────────────────────────────────────────
function openRescheduleModal(bookingId) {
  _populateBookingSelect('reschedule-booking-select', ['Confirmed','Pending','Cancelled']);
  if (bookingId) {
    document.getElementById('reschedule-booking-select').value = bookingId;
    onRescheduleBookingChange();
  }
  document.getElementById('reschedule-new-date').value  = '';
  document.getElementById('reschedule-new-pkg').value   = '';
  document.getElementById('reschedule-by').value        = '';
  document.getElementById('reschedule-on-date').value   = _today();
  document.getElementById('reschedule-reason').value    = '';
  document.getElementById('reschedule-notes').value     = '';
  document.getElementById('reschedule-error').style.display = 'none';
  document.getElementById('modal-reschedule').classList.add('open');
}

function closeRescheduleModal() {
  document.getElementById('modal-reschedule').classList.remove('open');
}

function onRescheduleBookingChange() {
  const id = document.getElementById('reschedule-booking-select').value;
  const preview = document.getElementById('reschedule-booking-preview');
  if (!id) { preview.style.display = 'none'; return; }
  const b = (DB.bookings || []).find(x => x.id === id);
  if (!b) { preview.style.display = 'none'; return; }
  document.getElementById('rbp-id').textContent   = b.id;
  document.getElementById('rbp-name').textContent = b.customer || '—';
  document.getElementById('rbp-sub').textContent  = `Current: ${b.pkg || '—'} · ${_fmtDate(b.date)}`;
  document.getElementById('reschedule-new-pkg').placeholder = b.pkg || 'Leave blank to keep current';
  preview.style.display = '';
}

function saveReschedule() {
  const id      = document.getElementById('reschedule-booking-select').value;
  const newDate = document.getElementById('reschedule-new-date').value;
  const errEl   = document.getElementById('reschedule-error');

  if (!id)      { errEl.textContent = 'Please select a booking.';     errEl.style.display = ''; return; }
  if (!newDate) { errEl.textContent = 'New departure date required.'; errEl.style.display = ''; return; }
  errEl.style.display = 'none';

  const bookings = DB.bookings || [];
  const idx = bookings.findIndex(x => x.id === id);
  if (idx < 0) { errEl.textContent = 'Booking not found.'; errEl.style.display = ''; return; }

  const b          = bookings[idx];
  const newPkg     = document.getElementById('reschedule-new-pkg').value.trim() || b.pkg;
  const histEntry  = {
    fromDate: b.date,
    toDate:   newDate,
    fromPkg:  b.pkg,
    toPkg:    newPkg,
    reason:   document.getElementById('reschedule-reason').value.trim(),
    by:       document.getElementById('reschedule-by').value.trim(),
    on:       document.getElementById('reschedule-on-date').value || _today(),
    notes:    document.getElementById('reschedule-notes').value.trim(),
  };

  if (!bookings[idx].rescheduleHistory) bookings[idx].rescheduleHistory = [];
  bookings[idx].rescheduleHistory.push(histEntry);
  bookings[idx].date = newDate;
  bookings[idx].pkg  = newPkg;
  if (b.status === 'Cancelled') bookings[idx].status = 'Confirmed';

  DB.bookings = bookings;
  saveDB();
  _syncBooking(bookings[idx]);
  closeRescheduleModal();
  renderStats();
  renderCnTab();
  showToast(`Booking ${id} rescheduled to ${_fmtDate(newDate)}.`);
}

// ── Refund Modal ──────────────────────────────────────────────────
function openRefundModal(bookingId) {
  const b = (DB.bookings || []).find(x => x.id === bookingId);
  if (!b) return;
  const cn = b.cancellation || {};
  document.getElementById('refund-booking-id').value = bookingId;
  document.getElementById('rfp-id').textContent      = b.id;
  document.getElementById('rfp-name').textContent    = b.customer || '—';
  document.getElementById('rfp-sub').textContent     = `${b.pkg || '—'} · ${_fmtDate(b.date)} · Booking Amt: ${b.amount && b.amount !== 'TBD' ? _fmtCurrency(b.amount) : '—'}`;
  document.getElementById('refund-status').value  = cn.refundStatus  || 'pending';
  document.getElementById('refund-amount').value  = cn.refundAmount  || '';
  document.getElementById('refund-date').value    = cn.refundDate    || _today();
  document.getElementById('refund-mode').value    = cn.refundMode    || '';
  document.getElementById('refund-notes').value   = cn.refundNotes   || '';
  document.getElementById('modal-refund').classList.add('open');
}

function closeRefundModal() {
  document.getElementById('modal-refund').classList.remove('open');
}

function saveRefundUpdate() {
  const bookingId = document.getElementById('refund-booking-id').value;
  const bookings  = DB.bookings || [];
  const idx       = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) return;
  if (!bookings[idx].cancellation) bookings[idx].cancellation = {};
  bookings[idx].cancellation.refundStatus  = document.getElementById('refund-status').value;
  bookings[idx].cancellation.refundAmount  = parseFloat(document.getElementById('refund-amount').value) || 0;
  bookings[idx].cancellation.refundDate    = document.getElementById('refund-date').value;
  bookings[idx].cancellation.refundMode    = document.getElementById('refund-mode').value;
  bookings[idx].cancellation.refundNotes   = document.getElementById('refund-notes').value.trim();
  DB.bookings = bookings;
  saveDB();
  _syncBooking(bookings[idx]);
  closeRefundModal();
  renderStats();
  renderCnTab();
  showToast('Refund updated.');
}

// ── History Modal ─────────────────────────────────────────────────
function openHistoryModal(bookingId) {
  const b = (DB.bookings || []).find(x => x.id === bookingId);
  if (!b) return;
  document.getElementById('history-title').textContent = `Reschedule History — ${b.id}`;
  const hist = b.rescheduleHistory || [];
  const body = document.getElementById('history-body');
  if (!hist.length) {
    body.innerHTML = '<p style="color:#94a3b8;font-size:13px;text-align:center">No reschedule history.</p>';
  } else {
    body.innerHTML = [...hist].reverse().map((h, i) => `
      <div class="reschedule-entry">
        <div style="font-size:11px;color:#94a3b8;margin-bottom:5px">
          Reschedule #${hist.length - i} &nbsp;·&nbsp; ${_fmtDate(h.on)} &nbsp;·&nbsp; ${_esc(h.by || 'Unknown')}
        </div>
        <div style="font-size:13px;font-weight:500">
          ${_fmtDate(h.fromDate)} <span class="reschedule-arrow">→</span> ${_fmtDate(h.toDate)}
        </div>
        ${h.fromPkg !== h.toPkg ? `<div style="font-size:12px;color:#64748b;margin-top:3px">Package: ${_esc(h.fromPkg || '—')} → ${_esc(h.toPkg || '—')}</div>` : ''}
        ${h.reason ? `<div style="font-size:12px;color:#475569;margin-top:3px">Reason: ${_esc(h.reason)}</div>` : ''}
        ${h.notes  ? `<div style="font-size:12px;color:#94a3b8;margin-top:3px">${_esc(h.notes)}</div>` : ''}
      </div>`).join('');
  }
  document.getElementById('modal-history').classList.add('open');
}

function closeHistoryModal() {
  document.getElementById('modal-history').classList.remove('open');
}

// ── Booking select helper ─────────────────────────────────────────
function _populateBookingSelect(selectId, statuses) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const bookings = (DB.bookings || []).filter(b => statuses.includes(b.status));
  bookings.sort((a, b) => (a.date || '') < (b.date || '') ? -1 : 1);
  el.innerHTML = '<option value="">— Choose a booking —</option>' +
    bookings.map(b => `<option value="${_esc(b.id)}">${_esc(b.id)} — ${_esc(b.customer || '—')} (${_fmtDate(b.date)})</option>`).join('');
}

// ── Firestore sync ────────────────────────────────────────────────
function _syncBooking(booking) {
  if (typeof dbSave === 'function') {
    dbSave('bookings', booking, err => {
      if (err) console.warn('Firestore sync failed for booking', booking.id, err);
    });
  }
}

// ── Expose globals ────────────────────────────────────────────────
Object.assign(window, {
  setCnTab, renderCnTab,
  openCancelModal, closeCancelModal, saveCancellation, onCancelBookingChange, onCancelReasonChange, undoCancellation,
  openRescheduleModal, closeRescheduleModal, saveReschedule, onRescheduleBookingChange,
  openRefundModal, closeRefundModal, saveRefundUpdate,
  openHistoryModal, closeHistoryModal,
});

// ── Init ──────────────────────────────────────────────────────────
initPage(function() {
  renderStats();
  renderCnTab();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      renderStats();
      renderCnTab();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('bookings', function() { renderStats(); renderCnTab(); });
      }
    }, 5000);
  }
});
