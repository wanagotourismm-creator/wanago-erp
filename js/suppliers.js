// suppliers.js — Supplier Directory & Booking Allocations

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
    try { if (renderFn) renderFn(); } catch(e) { console.error('Suppliers render error:', e); }
    fadeLoader();
  }, 20);
}
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

// ── Config ────────────────────────────────────────────────────────
const SUP_TYPES = {
  hotel:     { label:'Hotel',        emoji:'🏨', chipClass:'chip-green'  },
  transport: { label:'Transport',    emoji:'🚗', chipClass:'chip-blue'   },
  activity:  { label:'Activity',     emoji:'🎯', chipClass:'chip-amber'  },
  restaurant:{ label:'Restaurant',   emoji:'🍽️', chipClass:'chip-orange' },
  airline:   { label:'Airline',      emoji:'✈️', chipClass:'chip-teal'   },
  cruise:    { label:'Cruise',       emoji:'🚢', chipClass:'chip-purple' },
  other:     { label:'Other',        emoji:'📦', chipClass:'chip-gray'   },
};

const SERVICE_LABELS = {
  accommodation:'Accommodation', transport:'Transport / Transfer',
  activity:'Activity / Tour', meal:'Meals', guide:'Guide', other:'Other',
};

// ── State ─────────────────────────────────────────────────────────
let _supTab = 'directory';

// ── Helpers ───────────────────────────────────────────────────────
function _genId()   { return 'SUP-' + Date.now().toString(36).toUpperCase(); }
function _today()   { return new Date().toISOString().slice(0, 10); }
function _fmtDate(d){ if(!d) return '—'; return new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); }
function _fmtMoney(n){ return '₹' + Number(n||0).toLocaleString('en-IN'); }
function _esc(s)    { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _setText(id,v){ const e=document.getElementById(id); if(e) e.textContent=v; }

function _stars(n) {
  const r = Math.round(Number(n) || 0);
  return '⭐'.repeat(r) + '☆'.repeat(Math.max(0, 5 - r));
}

// ── Stats ─────────────────────────────────────────────────────────
function renderStats() {
  const sups  = DB.suppliers || [];
  const allocs = (DB.bookings || []).reduce((s, b) => s + (b.supplierAllocations || []).length, 0);
  _setText('stat-hotels',      sups.filter(s => s.type === 'hotel').length);
  _setText('stat-transport',   sups.filter(s => s.type === 'transport').length);
  _setText('stat-activity',    sups.filter(s => s.type === 'activity').length);
  _setText('stat-other',       sups.filter(s => !['hotel','transport','activity'].includes(s.type)).length);
  _setText('stat-allocations', allocs);
}

// ── Tab ───────────────────────────────────────────────────────────
function setSupTab(tab) {
  _supTab = tab;
  document.querySelectorAll('.sup-tab').forEach(t => t.classList.remove('active'));
  const btn = document.getElementById('tab-' + tab);
  if (btn) btn.classList.add('active');
  renderSupTab();
}

function renderSupTab() {
  if (_supTab === 'directory')   renderDirectory();
  if (_supTab === 'allocations') renderAllocations();
}

// ── Directory ─────────────────────────────────────────────────────
function renderDirectory() {
  const query      = (document.getElementById('sup-search')?.value || '').toLowerCase();
  const typeFilter = document.getElementById('sup-type-filter')?.value || '';
  const content    = document.getElementById('sup-content');
  if (!content) return;

  const sups = (DB.suppliers || []).filter(s => {
    if (typeFilter && s.type !== typeFilter) return false;
    if (!query) return true;
    return (s.name||'').toLowerCase().includes(query) ||
           (s.city||'').toLowerCase().includes(query) ||
           (s.contact||'').toLowerCase().includes(query);
  }).sort((a, b) => (a.name||'').localeCompare(b.name||''));

  if (!sups.length) {
    content.innerHTML = `<div class="sup-grid"><div class="sup-empty">
      No suppliers found.<br>
      <button class="btn btn-primary" style="margin-top:12px" onclick="openSupplierModal(null)">+ Add First Supplier</button>
    </div></div>`;
    return;
  }

  content.innerHTML = `<div class="sup-grid">${sups.map(s => _supCard(s)).join('')}</div>`;
}

function _supCard(s) {
  const t = SUP_TYPES[s.type] || SUP_TYPES.other;
  return `<div class="sup-card" onclick="openSupDetailModal('${_esc(s.id)}')">
    <div class="sup-card-top">
      <div class="sup-avatar" style="background:${_avatarBg(s.type)}">${t.emoji}</div>
      <div style="flex:1;min-width:0">
        <div class="sup-name">${_esc(s.name)}</div>
        <span class="sup-type-chip chip ${t.chipClass}">${t.label}</span>
        ${s.city ? `<span style="font-size:11px;color:#94a3b8;margin-left:6px">📍 ${_esc(s.city)}</span>` : ''}
      </div>
    </div>
    ${s.contact ? `<div class="sup-card-detail">👤 <span>${_esc(s.contact)}</span></div>` : ''}
    ${s.phone   ? `<div class="sup-card-detail">📞 <span>${_esc(s.phone)}</span></div>` : ''}
    ${s.rate    ? `<div class="sup-card-detail">💰 <span>${_esc(s.rate)}</span></div>` : ''}
    ${s.rating  ? `<div class="sup-rating">${_stars(s.rating)}</div>` : ''}
    <div class="sup-card-actions" onclick="event.stopPropagation()">
      <button class="btn btn-outline btn-sm" onclick="openAllocateModalForSupplier('${_esc(s.id)}')">+ Allocate</button>
      <button class="btn btn-outline btn-sm" onclick="openSupplierModal('${_esc(s.id)}')">Edit</button>
      <button class="btn-danger-sm" onclick="deleteSupplier('${_esc(s.id)}')">Delete</button>
    </div>
  </div>`;
}

function _avatarBg(type) {
  const map = { hotel:'#dcfce7', transport:'#dbeafe', activity:'#fef9c3', restaurant:'#ffedd5', airline:'#ccfbf1', cruise:'#ede9fe', other:'#f1f5f9' };
  return map[type] || '#f1f5f9';
}

// ── Allocations tab ───────────────────────────────────────────────
function renderAllocations() {
  const query   = (document.getElementById('sup-search')?.value || '').toLowerCase();
  const content = document.getElementById('sup-content');
  if (!content) return;

  // Collect all allocations across all bookings
  const rows = [];
  (DB.bookings || []).forEach(b => {
    (b.supplierAllocations || []).forEach((a, ai) => {
      if (query) {
        const haystack = `${b.id} ${b.customer} ${a.supplierName} ${a.confNo}`.toLowerCase();
        if (!haystack.includes(query)) return;
      }
      rows.push({ booking: b, alloc: a, allocIdx: ai });
    });
  });
  rows.sort((a, b) => (a.booking.date || '') < (b.booking.date || '') ? -1 : 1);

  const html = `<div class="alloc-card">
    <div class="alloc-card-hdr">
      <span class="alloc-card-title">All Supplier Allocations</span>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;color:#94a3b8">${rows.length} allocation${rows.length!==1?'s':''}</span>
        <button class="btn btn-primary btn-sm" onclick="openAllocateModal(null)">+ New Allocation</button>
      </div>
    </div>
    ${!rows.length
      ? '<div class="alloc-empty">No allocations yet. Assign suppliers to bookings from the Directory tab or the button above.</div>'
      : `<div style="overflow-x:auto"><table class="alloc-table">
          <thead><tr>
            <th>Booking</th><th>Customer</th><th>Supplier</th><th>Service</th>
            <th>Details</th><th>Rate</th><th>Conf. No.</th><th>Dates</th><th></th>
          </tr></thead>
          <tbody>${rows.map(r => _allocRow(r)).join('')}</tbody>
        </table></div>`}
  </div>`;
  content.innerHTML = html;
}

function _allocRow({ booking: b, alloc: a, allocIdx: ai }) {
  const t = SUP_TYPES[_supplierType(a.supplierId)] || SUP_TYPES.other;
  const svcLabel = SERVICE_LABELS[a.serviceType] || a.serviceType || '—';
  const datesStr = a.checkIn ? `${_fmtDate(a.checkIn)} → ${_fmtDate(a.checkOut||'')}` : '—';
  return `<tr>
    <td><span style="font-size:12px;font-weight:700;color:#6366f1">${_esc(b.id)}</span></td>
    <td style="font-weight:500">${_esc(b.customer||'—')}</td>
    <td>
      <div style="font-weight:600">${t.emoji} ${_esc(a.supplierName||'—')}</div>
    </td>
    <td><span style="font-size:12px;color:#475569">${_esc(svcLabel)}</span></td>
    <td style="font-size:12px;color:#64748b;max-width:140px;white-space:normal">${_esc(a.room||'—')}</td>
    <td style="font-weight:600">${a.rate ? _fmtMoney(a.rate) : '—'}</td>
    <td style="font-family:monospace;font-size:12px;color:#6366f1">${_esc(a.confNo||'—')}</td>
    <td style="font-size:12px">${datesStr}</td>
    <td>
      <button class="btn-danger-sm" onclick="deleteAllocation('${_esc(b.id)}',${ai})">✕</button>
    </td>
  </tr>`;
}

function _supplierType(supplierId) {
  const s = (DB.suppliers||[]).find(x => x.id === supplierId);
  return s ? s.type : 'other';
}

// ── Add / Edit Supplier Modal ─────────────────────────────────────
function openSupplierModal(supplierId) {
  const s = supplierId ? (DB.suppliers||[]).find(x => x.id === supplierId) : null;
  document.getElementById('sup-edit-id').value   = supplierId || '';
  document.getElementById('supplier-modal-title').textContent = s ? 'Edit Supplier' : 'Add Supplier';
  document.getElementById('sup-name').value      = s?.name     || '';
  document.getElementById('sup-type').value      = s?.type     || 'hotel';
  document.getElementById('sup-city').value      = s?.city     || '';
  document.getElementById('sup-contact').value   = s?.contact  || '';
  document.getElementById('sup-phone').value     = s?.phone    || '';
  document.getElementById('sup-email').value     = s?.email    || '';
  document.getElementById('sup-website').value   = s?.website  || '';
  document.getElementById('sup-rate').value      = s?.rate     || '';
  document.getElementById('sup-gst').value       = s?.gst      || '';
  document.getElementById('sup-address').value   = s?.address  || '';
  document.getElementById('sup-rating').value    = s?.rating   || '0';
  document.getElementById('sup-notes').value     = s?.notes    || '';
  document.getElementById('sup-modal-error').style.display = 'none';
  _renderStarsInput(Number(s?.rating || 0));
  document.getElementById('modal-supplier').classList.add('open');
  setTimeout(() => document.getElementById('sup-name').focus(), 50);
}

function closeSupplierModal() {
  document.getElementById('modal-supplier').classList.remove('open');
}

function setSupplierRating(event) {
  const span = event.target.closest('[data-val]');
  if (!span) return;
  const val = parseInt(span.dataset.val);
  document.getElementById('sup-rating').value = val;
  _renderStarsInput(val);
}

function _renderStarsInput(selected) {
  const container = document.getElementById('sup-stars-input');
  if (!container) return;
  container.querySelectorAll('span').forEach(span => {
    const v = parseInt(span.dataset.val);
    span.textContent = v <= selected ? '⭐' : '☆';
  });
}

function saveSupplier() {
  const name  = document.getElementById('sup-name').value.trim();
  const errEl = document.getElementById('sup-modal-error');
  if (!name) { errEl.textContent = 'Supplier name is required.'; errEl.style.display = ''; return; }
  errEl.style.display = 'none';

  const editId   = document.getElementById('sup-edit-id').value;
  const suppliers = DB.suppliers || [];
  const record = {
    id:      editId || _genId(),
    name,
    type:    document.getElementById('sup-type').value,
    city:    document.getElementById('sup-city').value.trim(),
    contact: document.getElementById('sup-contact').value.trim(),
    phone:   document.getElementById('sup-phone').value.trim(),
    email:   document.getElementById('sup-email').value.trim(),
    website: document.getElementById('sup-website').value.trim(),
    rate:    document.getElementById('sup-rate').value.trim(),
    gst:     document.getElementById('sup-gst').value.trim(),
    address: document.getElementById('sup-address').value.trim(),
    rating:  Number(document.getElementById('sup-rating').value) || 0,
    notes:   document.getElementById('sup-notes').value.trim(),
    createdAt: editId ? (suppliers.find(x=>x.id===editId)?.createdAt || _today()) : _today(),
  };

  if (editId) {
    const idx = suppliers.findIndex(x => x.id === editId);
    if (idx >= 0) suppliers[idx] = record; else suppliers.push(record);
  } else {
    suppliers.push(record);
  }
  DB.suppliers = suppliers;
  saveDB();
  if (typeof dbSave === 'function') dbSave('suppliers', record);

  closeSupplierModal();
  renderStats();
  renderSupTab();
  showToast(editId ? 'Supplier updated.' : 'Supplier added.');
}

function deleteSupplier(supplierId) {
  const s = (DB.suppliers||[]).find(x=>x.id===supplierId);
  if (!confirm(`Delete supplier "${s?.name||supplierId}"? This cannot be undone.`)) return;
  DB.suppliers = (DB.suppliers||[]).filter(x => x.id !== supplierId);
  saveDB();
  if (typeof dbDelete === 'function') dbDelete('suppliers', supplierId);
  renderStats();
  renderSupTab();
  showToast('Supplier deleted.');
}

// ── Supplier Detail Modal ─────────────────────────────────────────
function openSupDetailModal(supplierId) {
  const s = (DB.suppliers||[]).find(x => x.id === supplierId);
  if (!s) return;
  const t = SUP_TYPES[s.type] || SUP_TYPES.other;
  document.getElementById('sup-detail-title').textContent = s.name;
  document.getElementById('sup-detail-edit-btn').onclick = () => { closeSupDetailModal(); openSupplierModal(supplierId); };

  // Count allocations for this supplier
  const allocCount = (DB.bookings||[]).reduce((n, b) => n + (b.supplierAllocations||[]).filter(a => a.supplierId === supplierId).length, 0);

  document.getElementById('sup-detail-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
      <div style="width:56px;height:56px;border-radius:14px;background:${_avatarBg(s.type)};display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0">${t.emoji}</div>
      <div>
        <span class="chip ${t.chipClass}">${t.label}</span>
        ${s.city ? `<span style="font-size:13px;color:#64748b;margin-left:8px">📍 ${_esc(s.city)}</span>` : ''}
        ${s.rating ? `<div class="sup-rating" style="margin-top:4px">${_stars(s.rating)}</div>` : ''}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
      ${s.contact  ? _dRow('Contact',     s.contact)  : ''}
      ${s.phone    ? _dRow('Phone',       s.phone)    : ''}
      ${s.email    ? _dRow('Email',       s.email)    : ''}
      ${s.website  ? _dRow('Website',     s.website)  : ''}
      ${s.rate     ? _dRow('Contract Rate', s.rate)   : ''}
      ${s.gst      ? _dRow('GST / PAN',   s.gst)      : ''}
      ${s.address  ? _dRow('Address',     s.address)  : ''}
      ${_dRow('Allocations', `${allocCount} booking${allocCount!==1?'s':''}`)}
    </div>
    ${s.notes ? `<div style="background:#f8fafc;border-radius:8px;padding:10px 12px">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px">NOTES</div>
      <div style="font-size:13px;color:#334155">${_esc(s.notes)}</div>
    </div>` : ''}`;

  document.getElementById('modal-sup-detail').classList.add('open');
}

function _dRow(label, val) {
  return `<div><div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">${label}</div>
    <div style="font-size:13px;color:#1e293b;font-weight:500">${_esc(String(val||'—'))}</div></div>`;
}

function closeSupDetailModal() {
  document.getElementById('modal-sup-detail').classList.remove('open');
}

// ── Allocate Modal ────────────────────────────────────────────────
let _allocPresetSupplier = null;

function openAllocateModal(bookingId) {
  _allocPresetSupplier = null;
  _populateAllocSelects(bookingId, null);
  document.getElementById('alloc-modal-title').textContent = 'Allocate Supplier to Booking';
  _resetAllocForm();
  document.getElementById('modal-allocate').classList.add('open');
}

function openAllocateModalForSupplier(supplierId) {
  _allocPresetSupplier = supplierId;
  _populateAllocSelects(null, supplierId);
  document.getElementById('alloc-modal-title').textContent = 'Allocate Supplier to Booking';
  _resetAllocForm();
  if (supplierId) document.getElementById('alloc-supplier').value = supplierId;
  document.getElementById('modal-allocate').classList.add('open');
}

function closeAllocateModal() {
  document.getElementById('modal-allocate').classList.remove('open');
  _allocPresetSupplier = null;
}

function _populateAllocSelects(bookingId, supplierId) {
  // bookings select
  const bSel = document.getElementById('alloc-booking');
  const bookings = (DB.bookings||[]).filter(b => b.status !== 'Cancelled').sort((a,b)=>(a.date||'')<(b.date||'')?-1:1);
  bSel.innerHTML = '<option value="">— Select booking —</option>' +
    bookings.map(b => `<option value="${_esc(b.id)}">${_esc(b.id)} — ${_esc(b.customer||'—')} (${_fmtDate(b.date)})</option>`).join('');
  if (bookingId) bSel.value = bookingId;

  // suppliers select
  const sSel = document.getElementById('alloc-supplier');
  const sups = (DB.suppliers||[]).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  sSel.innerHTML = '<option value="">— Select supplier —</option>' +
    sups.map(s => {
      const t = SUP_TYPES[s.type]||SUP_TYPES.other;
      return `<option value="${_esc(s.id)}">${t.emoji} ${_esc(s.name)}${s.city?' ('+s.city+')':''}`;
    }).join('');
  if (supplierId) sSel.value = supplierId;
}

function _resetAllocForm() {
  document.getElementById('alloc-checkin').value  = '';
  document.getElementById('alloc-checkout').value = '';
  document.getElementById('alloc-room').value     = '';
  document.getElementById('alloc-conf').value     = '';
  document.getElementById('alloc-rate').value     = '';
  document.getElementById('alloc-pax').value      = '1';
  document.getElementById('alloc-notes').value    = '';
  document.getElementById('alloc-error').style.display = 'none';
  document.getElementById('alloc-booking-preview').style.display = 'none';
}

function onAllocBookingChange() {
  const id = document.getElementById('alloc-booking').value;
  const b  = (DB.bookings||[]).find(x => x.id === id);
  const preview = document.getElementById('alloc-booking-preview');
  if (!b) { preview.style.display = 'none'; return; }
  document.getElementById('abp-text').textContent = `${b.id} — ${b.customer||'—'} · ${b.pkg||'—'} · ${_fmtDate(b.date)}`;
  if (!document.getElementById('alloc-checkin').value && b.date) {
    document.getElementById('alloc-checkin').value = b.date;
  }
  preview.style.display = '';
}

function onAllocSupplierChange() {
  const supplierId = document.getElementById('alloc-supplier').value;
  const s = (DB.suppliers||[]).find(x => x.id === supplierId);
  if (s?.rate && !document.getElementById('alloc-rate').value) {
    // pre-fill rate if supplier has a contract rate (parse first number found)
    const match = s.rate.replace(/,/g,'').match(/[\d]+/);
    if (match) document.getElementById('alloc-rate').value = match[0];
  }
  // Auto-select service type based on supplier type
  const typeMap = { hotel:'accommodation', transport:'transport', activity:'activity', restaurant:'meal', airline:'transport', cruise:'accommodation' };
  const mapped = typeMap[s?.type];
  if (mapped) document.getElementById('alloc-service-type').value = mapped;
}

function saveAllocation() {
  const bookingId   = document.getElementById('alloc-booking').value;
  const supplierId  = document.getElementById('alloc-supplier').value;
  const errEl       = document.getElementById('alloc-error');
  if (!bookingId)  { errEl.textContent='Please select a booking.';  errEl.style.display=''; return; }
  if (!supplierId) { errEl.textContent='Please select a supplier.'; errEl.style.display=''; return; }
  errEl.style.display = 'none';

  const bookings = DB.bookings || [];
  const idx      = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) { errEl.textContent='Booking not found.'; errEl.style.display=''; return; }

  const supplier = (DB.suppliers||[]).find(x => x.id === supplierId);
  const alloc = {
    supplierId,
    supplierName: supplier?.name || '',
    serviceType:  document.getElementById('alloc-service-type').value,
    checkIn:      document.getElementById('alloc-checkin').value,
    checkOut:     document.getElementById('alloc-checkout').value,
    room:         document.getElementById('alloc-room').value.trim(),
    confNo:       document.getElementById('alloc-conf').value.trim(),
    rate:         parseFloat(document.getElementById('alloc-rate').value) || 0,
    pax:          parseInt(document.getElementById('alloc-pax').value) || 1,
    notes:        document.getElementById('alloc-notes').value.trim(),
    allocatedOn:  _today(),
  };

  if (!bookings[idx].supplierAllocations) bookings[idx].supplierAllocations = [];
  bookings[idx].supplierAllocations.push(alloc);
  DB.bookings = bookings;
  saveDB();
  if (typeof dbSave === 'function') dbSave('bookings', bookings[idx]);

  closeAllocateModal();
  renderStats();
  renderSupTab();
  showToast(`Supplier allocated to ${bookingId}.`);
}

function deleteAllocation(bookingId, allocIdx) {
  if (!confirm('Remove this supplier allocation?')) return;
  const bookings = DB.bookings || [];
  const idx = bookings.findIndex(x => x.id === bookingId);
  if (idx < 0) return;
  (bookings[idx].supplierAllocations || []).splice(allocIdx, 1);
  DB.bookings = bookings;
  saveDB();
  if (typeof dbSave === 'function') dbSave('bookings', bookings[idx]);
  renderStats();
  renderSupTab();
  showToast('Allocation removed.');
}

// ── Expose globals ────────────────────────────────────────────────
Object.assign(window, {
  setSupTab, renderSupTab,
  openSupplierModal, closeSupplierModal, saveSupplier, deleteSupplier, setSupplierRating,
  openSupDetailModal, closeSupDetailModal,
  openAllocateModal, openAllocateModalForSupplier, closeAllocateModal,
  saveAllocation, deleteAllocation,
  onAllocBookingChange, onAllocSupplierChange,
});

// ── Init ──────────────────────────────────────────────────────────
initPage(function() {
  if (!DB.suppliers) DB.suppliers = [];
  renderStats();
  renderSupTab();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      renderStats();
      renderSupTab();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('suppliers', function() { renderStats(); renderSupTab(); });
        dbSubscribe('bookings',  function() { renderStats(); if (_supTab==='allocations') renderAllocations(); });
      }
    }, 5000);
  }
});
