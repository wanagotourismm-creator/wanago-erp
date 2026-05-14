/* ══════════════════════════════════════════════════
   bookings.js — Bookings management module
   Branch: js/bookings
   Dependencies: data.js, utils.js, app.js
══════════════════════════════════════════════════ */

'use strict';

const BOOKING_STATUS_CLS = {
  Confirmed: 'p-green',
  Pending:   'p-amber',
  Completed: 'p-blue',
  Cancelled: 'p-red',
};

function renderBookings(filter) {
  const allVisible = typeof hScoped === 'function' ? hScoped('bookings') : DB.bookings;
  const list = filter
    ? allVisible.filter(b => b.status === filter)
    : allVisible;

  // Update summary counters
  document.getElementById('bk-total').textContent     = allVisible.length;
  document.getElementById('bk-confirmed').textContent = allVisible.filter(b => b.status === 'Confirmed').length;
  document.getElementById('bk-pending').textContent   = allVisible.filter(b => b.status === 'Pending').length;

  document.getElementById('bookings-tbody').innerHTML = list.map(b => `
    <tr>
      <td class="mono">${b.id}</td>
      <td><div class="td-name">${b.customer}</div></td>
      <td>${b.pkg}</td>
      <td>${formatDate(b.date)}</td>
      <td style="font-weight:600">${b.pax}</td>
      <td style="font-weight:600;color:var(--g700)">
        ${b.amount ? '₹' + b.amount.toLocaleString() : 'TBD'}
      </td>
      <td><span class="pill ${BOOKING_STATUS_CLS[b.status] || 'p-gray'}">${b.status}</span></td>
      <td>${b.agent || '<span style="color:var(--texth)">Unassigned</span>'}</td>
      <td>${b.campaign ? `<span class="pill p-blue" style="font-size:9.5px">${b.campaign}</span>` : '—'}</td>
      <td>
        <button class="btn btn-ghost btn-xs"   onclick="confirmBooking('${b.id}')">Confirm</button>
        <button class="btn btn-ghost btn-xs"   onclick="toast('Invoice generated for ${b.id}','success')">Invoice</button>
      </td>
    </tr>`).join('');
}

function filterBookings(f) { renderBookings(f); }

function confirmBooking(id) {
  const b = DB.bookings.find(x => x.id === id);
  if (b && b.status === 'Pending') {
    b.status = 'Confirmed';
    if(typeof dbSave==='function')dbSave('bookings',b).catch(()=>{});
    saveDB();
    renderBookings();
    logActivity(currentUser.name, currentUser.role, 'Booking confirmed', 'Bookings', id);
    toast(`Booking ${id} confirmed`, 'success');
  } else {
    toast('Already confirmed or not found', 'warning');
  }
}

function addBooking() {
  const cust = document.getElementById('bk-cust').value.trim();
  if (!cust) { toast('Customer name required', 'error'); return; }

  const refNo = 'WGO-' + (2050 + DB.bookings.length);
  DB.bookings.unshift({
    id:       refNo,
    customer: cust,
    pkg:      document.getElementById('bk-pkg').value,
    date:     document.getElementById('bk-date').value,
    pax:      parseInt(document.getElementById('bk-pax').value) || 1,
    amount:   parseInt(document.getElementById('bk-amount').value) || 0,
    status:   'Pending',
    agent:    document.getElementById('bk-agent').value,
    campaign: '',
  });

  if(typeof dbSave==='function')dbSave('bookings',DB.bookings[0]).catch(()=>{});
  saveDB();
  logActivity(currentUser.name, currentUser.role, 'Booking created', 'Bookings', `${refNo} — ${cust}`);
  renderBookings();
  closeModal('modal-add-booking');
  toast(`Booking created: ${refNo}`, 'success');
}

/* Populate package dropdown in booking modal */
function populateBookingPackages() {
  const sel = document.getElementById('bk-pkg');
  sel.innerHTML = DB.packages.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
}
