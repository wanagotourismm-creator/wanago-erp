// ops.js — Operations Dashboard

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
    try { if (renderFn) renderFn(); } catch(e) { console.error('Ops render error:', e); }
    fadeLoader();
  }, 20);
}
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

// ── State ─────────────────────────────────────────────────────────
let _opsView = 'today'; // 'today' | 'tomorrow' | 'week'

// ── Date helpers ──────────────────────────────────────────────────
function _today()    { return new Date().toISOString().slice(0, 10); }
function _tomorrow() { const d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); }
function _weekEnd()  { const d = new Date(); d.setDate(d.getDate()+6); return d.toISOString().slice(0,10); }

function _fmtDate(d) {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function _fmtDay(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday:'short', day:'2-digit', month:'short' });
}

// ── Filter bookings for the active view ───────────────────────────
function _viewBookings() {
  const bookings = DB.bookings || [];
  const today    = _today();
  const tomorrow = _tomorrow();
  const weekEnd  = _weekEnd();
  return bookings.filter(b => {
    if (!b || !b.date) return false;
    if (b.status === 'Cancelled') return false;
    if (_opsView === 'today')    return b.date === today;
    if (_opsView === 'tomorrow') return b.date === tomorrow;
    if (_opsView === 'week')     return b.date >= today && b.date <= weekEnd;
    return false;
  }).sort((a, b) => {
    // sort by date asc, then by pickup time asc
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    const ta = a.opsPickupTime || '99:99';
    const tb = b.opsPickupTime || '99:99';
    return ta < tb ? -1 : ta > tb ? 1 : 0;
  });
}

// ── Build risk alerts ─────────────────────────────────────────────
function _buildAlerts() {
  const today    = _today();
  const tomorrow = _tomorrow();
  const alerts   = [];

  (DB.bookings || []).forEach(b => {
    if (!b || b.status === 'Cancelled') return;

    // Today's departures without driver
    if (b.date === today && !b.opsDriver) {
      alerts.push({ severity:'red', text:`No driver assigned`, sub:`${b.id} · ${b.customer} · departs today` });
    }
    // Tomorrow departures without driver
    else if (b.date === tomorrow && !b.opsDriver) {
      alerts.push({ severity:'amber', text:`Driver not yet assigned`, sub:`${b.id} · ${b.customer} · departs tomorrow` });
    }

    // Pending confirmation with departure date today/tomorrow
    if (b.status === 'Pending' && (b.date === today || b.date === tomorrow)) {
      alerts.push({ severity:'amber', text:`Booking still Pending`, sub:`${b.id} · ${b.customer} · ${_fmtDate(b.date)}` });
    }

    // Overdue — past departure date, not Completed
    if (b.date < today && (b.status === 'Confirmed' || b.status === 'Pending')) {
      alerts.push({ severity:'red', text:`Overdue booking not marked complete`, sub:`${b.id} · ${b.customer} · was ${_fmtDate(b.date)}` });
    }
  });

  return alerts;
}

// ── Render ────────────────────────────────────────────────────────
function renderOps() {
  _updateDateLabel();
  const bookings = _viewBookings();
  const alerts   = _buildAlerts();

  // stats
  const assigned   = bookings.filter(b => b.opsDriver).length;
  const unassigned = bookings.filter(b => !b.opsDriver).length;
  _setText('stat-dep',        bookings.length);
  _setText('stat-assigned',   assigned);
  _setText('stat-unassigned', unassigned);
  _setText('stat-risks',      alerts.length);
  _setText('dep-count',       bookings.length);
  _setText('risk-count',      alerts.length);

  // departures table
  const tbody  = document.getElementById('ops-dep-body');
  const table  = document.getElementById('ops-dep-table');
  const empty  = document.getElementById('ops-dep-empty');

  if (!bookings.length) {
    if (table) table.style.display = 'none';
    if (empty) { empty.style.display = ''; empty.textContent = 'No departures for this period.'; }
  } else {
    if (table) table.style.display = '';
    if (empty) empty.style.display = 'none';
    if (tbody) tbody.innerHTML = bookings.map(b => _depRow(b)).join('');
  }

  // alerts
  const alertsEl = document.getElementById('ops-alerts-body');
  if (alertsEl) {
    if (!alerts.length) {
      alertsEl.innerHTML = '<div class="no-alerts">No alerts 🎉<br><span style="font-size:11px;color:#cbd5e1;margin-top:4px;display:block">All departures look good</span></div>';
    } else {
      alertsEl.innerHTML = alerts.map(a => `
        <div class="alert-item">
          <div class="alert-dot ${a.severity}"></div>
          <div>
            <div class="alert-text">${_esc(a.text)}</div>
            <div class="alert-sub">${_esc(a.sub)}</div>
          </div>
        </div>`).join('');
    }
  }
}

function _depRow(b) {
  const statusClass = { Confirmed:'chip-green', Pending:'chip-amber', Completed:'chip-blue', Cancelled:'chip-red' }[b.status] || 'chip-gray';
  const driverBtn = b.opsDriver
    ? `<span class="driver-pill" onclick="openDriverModal('${_esc(b.id)}')">🚗 ${_esc(b.opsDriver)}</span>`
    : `<span class="driver-unset" onclick="openDriverModal('${_esc(b.id)}')">+ Assign Driver</span>`;

  const dateStr = _opsView === 'week'
    ? `<div class="time-badge">${_fmtDay(b.date)}</div>`
    : (b.opsPickupTime ? `<span class="time-badge">${b.opsPickupTime}</span>` : `<span style="color:#94a3b8;font-size:12px">—</span>`);

  const notesFlag = b.opsNotes
    ? `<span class="notes-flag" title="${_esc(b.opsNotes)}" onclick="openDetailModal('${_esc(b.id)}')">📝</span>`
    : '';

  const vehicleStr = b.opsVehicle ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px">${_esc(b.opsVehicle)}</div>` : '';

  return `<tr>
    <td><span style="font-size:12px;font-weight:600;color:#6366f1">${_esc(b.id)}</span></td>
    <td>
      <div style="font-weight:500;color:#1e293b">${_esc(b.customer || '—')}</div>
      ${b.opsPickupPoint ? `<div style="font-size:11px;color:#94a3b8">📍 ${_esc(b.opsPickupPoint)}</div>` : ''}
    </td>
    <td>
      <div>${_esc(b.pkg || '—')}</div>
      ${b.opsFlightNo ? `<div style="font-size:11px;color:#64748b">✈️ ${_esc(b.opsFlightNo)}</div>` : ''}
    </td>
    <td style="text-align:center"><span style="font-weight:600">${b.pax || 1}</span></td>
    <td>${dateStr}</td>
    <td><span class="chip ${statusClass}">${_esc(b.status)}</span></td>
    <td>${driverBtn}${vehicleStr}</td>
    <td>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-outline btn-sm" onclick="openDetailModal('${_esc(b.id)}')">View</button>
        ${notesFlag}
      </div>
    </td>
  </tr>`;
}

function _updateDateLabel() {
  const el = document.getElementById('ops-date-label');
  if (!el) return;
  if (_opsView === 'today')    el.textContent = 'Today — ' + _fmtDate(_today());
  if (_opsView === 'tomorrow') el.textContent = 'Tomorrow — ' + _fmtDate(_tomorrow());
  if (_opsView === 'week')     el.textContent = `This Week — ${_fmtDate(_today())} to ${_fmtDate(_weekEnd())}`;
}

function setOpsView(view) {
  _opsView = view;
  document.querySelectorAll('.ops-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + view);
  if (tab) tab.classList.add('active');
  renderOps();
}

// ── Driver Assignment Modal ────────────────────────────────────────
function openDriverModal(bookingId) {
  const b = (DB.bookings || []).find(x => x.id === bookingId);
  if (!b) return;
  document.getElementById('dm-booking-id').value    = bookingId;
  document.getElementById('dm-booking-info').textContent = `${b.id} — ${b.customer}`;
  document.getElementById('dm-booking-sub').textContent  = `${b.pkg || '—'} · ${_fmtDate(b.date)} · ${b.pax || 1} pax`;
  document.getElementById('dm-driver').value       = b.opsDriver      || '';
  document.getElementById('dm-vehicle').value      = b.opsVehicle     || '';
  document.getElementById('dm-pickup-time').value  = b.opsPickupTime  || '';
  document.getElementById('dm-pickup-point').value = b.opsPickupPoint || '';
  document.getElementById('dm-flight-no').value    = b.opsFlightNo    || '';
  document.getElementById('dm-return-date').value  = b.opsReturnDate  || '';
  document.getElementById('dm-notes').value        = b.opsNotes       || '';
  document.getElementById('driver-modal-title').textContent = b.opsDriver ? 'Edit Driver Assignment' : 'Assign Driver';
  document.getElementById('modal-driver').classList.add('open');
}

function closeDriverModal() {
  document.getElementById('modal-driver').classList.remove('open');
}

function saveDriverAssignment() {
  const bookingId = document.getElementById('dm-booking-id').value;
  const bookings  = DB.bookings || [];
  const idx       = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) { showToast('Booking not found.', 'error'); return; }

  const driver = document.getElementById('dm-driver').value.trim();
  if (!driver) { showToast('Enter a driver name.', 'error'); return; }

  bookings[idx].opsDriver      = driver;
  bookings[idx].opsVehicle     = document.getElementById('dm-vehicle').value.trim();
  bookings[idx].opsPickupTime  = document.getElementById('dm-pickup-time').value;
  bookings[idx].opsPickupPoint = document.getElementById('dm-pickup-point').value.trim();
  bookings[idx].opsFlightNo    = document.getElementById('dm-flight-no').value.trim();
  bookings[idx].opsReturnDate  = document.getElementById('dm-return-date').value;
  bookings[idx].opsNotes       = document.getElementById('dm-notes').value.trim();

  DB.bookings = bookings;
  saveDB();

  // Sync to Firestore
  if (typeof dbSave === 'function') {
    dbSave('bookings', bookings[idx], function(err) {
      if (err) showToast('Saved locally. Firestore sync failed.', 'error');
      else     showToast('Driver assigned and synced.');
    });
  } else {
    showToast('Driver assigned.');
  }

  closeDriverModal();
  renderOps();
}

function clearDriverAssignment() {
  if (!confirm('Remove driver assignment for this booking?')) return;
  const bookingId = document.getElementById('dm-booking-id').value;
  const bookings  = DB.bookings || [];
  const idx       = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) return;

  ['opsDriver','opsVehicle','opsPickupTime','opsPickupPoint','opsFlightNo','opsReturnDate','opsNotes'].forEach(k => {
    delete bookings[idx][k];
  });

  DB.bookings = bookings;
  saveDB();
  if (typeof dbSave === 'function') dbSave('bookings', bookings[idx]);

  closeDriverModal();
  renderOps();
  showToast('Driver assignment cleared.');
}

// ── Booking Detail Modal ──────────────────────────────────────────
function openDetailModal(bookingId) {
  const b = (DB.bookings || []).find(x => x.id === bookingId);
  if (!b) return;

  document.getElementById('detail-modal-title').textContent = `${b.id} — ${b.customer}`;
  const assignBtn = document.getElementById('detail-assign-btn');
  if (assignBtn) { assignBtn.onclick = () => { closeDetailModal(); openDriverModal(bookingId); }; }

  const statusClass = { Confirmed:'chip-green', Pending:'chip-amber', Completed:'chip-blue', Cancelled:'chip-red' }[b.status] || 'chip-gray';

  document.getElementById('detail-modal-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
      ${_detailRow('Booking ID',   b.id)}
      ${_detailRow('Customer',     b.customer)}
      ${_detailRow('Package',      b.pkg)}
      ${_detailRow('Departure',    _fmtDate(b.date))}
      ${_detailRow('Passengers',   b.pax || 1)}
      ${_detailRow('Status',       `<span class="chip ${statusClass}">${_esc(b.status)}</span>`, true)}
      ${_detailRow('Agent',        b.agent || '—')}
      ${_detailRow('Amount',       b.amount ? '₹' + Number(b.amount).toLocaleString('en-IN') : 'TBD')}
    </div>
    <div style="background:#f8fafc;border-radius:10px;padding:14px;margin-bottom:0">
      <div style="font-size:12px;font-weight:600;color:#475569;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">Ops Assignment</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${_detailRow('Driver',       b.opsDriver      || '—')}
        ${_detailRow('Vehicle',      b.opsVehicle     || '—')}
        ${_detailRow('Pickup Time',  b.opsPickupTime  || '—')}
        ${_detailRow('Pickup Point', b.opsPickupPoint || '—')}
        ${_detailRow('Flight/Train', b.opsFlightNo    || '—')}
        ${_detailRow('Return Date',  b.opsReturnDate ? _fmtDate(b.opsReturnDate) : '—')}
      </div>
      ${b.opsNotes ? `<div style="margin-top:10px"><div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px">NOTES</div><div style="font-size:13px;color:#334155;background:#fff;border:1px solid #e2e8f0;border-radius:7px;padding:8px 12px">${_esc(b.opsNotes)}</div></div>` : ''}
    </div>`;

  document.getElementById('modal-ops-detail').classList.add('open');
}

function closeDetailModal() {
  document.getElementById('modal-ops-detail').classList.remove('open');
}

function _detailRow(label, val, raw) {
  const valHtml = raw ? String(val) : `<span style="font-size:13px;color:#1e293b;font-weight:500">${_esc(String(val || '—'))}</span>`;
  return `<div><div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">${label}</div>${valHtml}</div>`;
}

// ── Utilities ─────────────────────────────────────────────────────
function _setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Expose globals ────────────────────────────────────────────────
Object.assign(window, {
  setOpsView, renderOps,
  openDriverModal, closeDriverModal, saveDriverAssignment, clearDriverAssignment,
  openDetailModal, closeDetailModal,
});

// ── Init ──────────────────────────────────────────────────────────
initPage(function() {
  renderOps();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      renderOps();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('bookings', function() { renderOps(); });
      }
    }, 5000);
  }
});
