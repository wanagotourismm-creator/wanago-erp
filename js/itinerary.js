// itinerary.js — Wanago ERP Itinerary Builder

// ── Auth guard (same pattern as every other page module) ──
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
    try { if (renderFn) renderFn(); } catch(e) { console.error('Itinerary render error:', e); }
    fadeLoader();
  }, 20);
}
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

const SERVICE_TYPES = {
  flight:      { label:'Flight',      emoji:'✈️',  color:'#dbeafe', text:'#1e40af', group:'fg-flight'   },
  hotel:       { label:'Hotel',       emoji:'🏨',  color:'#dcfce7', text:'#166534', group:'fg-hotel'    },
  transfer:    { label:'Transfer',    emoji:'🚗',  color:'#fef9c3', text:'#854d0e', group:'fg-transfer'  },
  activity:    { label:'Activity',    emoji:'🎯',  color:'#ede9fe', text:'#5b21b6', group:'fg-activity'  },
  sightseeing: { label:'Sightseeing', emoji:'🗺️',  color:'#fce7f3', text:'#9d174d', group:'fg-activity'  },
  meal:        { label:'Meal',        emoji:'🍽️',  color:'#fff7ed', text:'#9a3412', group:'fg-meal'     },
  visa:        { label:'Visa',        emoji:'📋',  color:'#f0f9ff', text:'#0c4a6e', group:'fg-misc',
    miscConfig:{ title:'Visa Details',       f1:'Country',        f2:'Visa Type',     f3:'Application Date', f4:'Collection Date' } },
  insurance:   { label:'Insurance',   emoji:'🛡️',  color:'#f0fdf4', text:'#14532d', group:'fg-misc',
    miscConfig:{ title:'Insurance Details',  f1:'Provider',       f2:'Policy No',     f3:'Type',             f4:'Valid Till' } },
  bus:         { label:'Bus',         emoji:'🚌',  color:'#fefce8', text:'#713f12', group:'fg-misc',
    miscConfig:{ title:'Bus Details',        f1:'Operator',       f2:'From',          f3:'To',               f4:'Seat Nos' } },
  train:       { label:'Train',       emoji:'🚂',  color:'#fef2f2', text:'#7f1d1d', group:'fg-misc',
    miscConfig:{ title:'Train Details',      f1:'Train Name / No',f2:'From Station',  f3:'To Station',       f4:'Class / Berth' } },
  car:         { label:'Car Rental',  emoji:'🚙',  color:'#f9fafb', text:'#374151', group:'fg-transfer'  },
  cruise:      { label:'Cruise',      emoji:'🚢',  color:'#e0f2fe', text:'#0c4a6e', group:'fg-misc',
    miscConfig:{ title:'Cruise Details',     f1:'Cruise Line',    f2:'Ship Name',     f3:'Embark Port',      f4:'Disembark Port' } },
  ferry:       { label:'Ferry',       emoji:'⛴️',  color:'#cffafe', text:'#164e63', group:'fg-misc',
    miscConfig:{ title:'Ferry Details',      f1:'Operator',       f2:'From',          f3:'To',               f4:'Vessel' } },
  taxi:        { label:'Taxi',        emoji:'🚕',  color:'#fef9c3', text:'#78350f', group:'fg-transfer'  },
  note:        { label:'Note',        emoji:'📝',  color:'#f8fafc', text:'#64748b', group:null             },
};

let _openItinId = null;
let _dragState   = null;

// ── DB helpers ───────────────────────────────────────────────────
function _getItin(id) {
  return (DB.itineraries || []).find(i => i.id === id) || null;
}

function _saveItin(itin) {
  if (!DB.itineraries) DB.itineraries = [];
  const idx = DB.itineraries.findIndex(i => i.id === itin.id);
  if (idx > -1) DB.itineraries[idx] = itin;
  else DB.itineraries.unshift(itin);
  saveDB();
  if (typeof dbSave === 'function') dbSave('itineraries', itin).catch(() => {});
}

// ── Tab switching ────────────────────────────────────────────────
function switchITab(el, tab) {
  document.querySelectorAll('.itin-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('itinerary-list-view').style.display  = tab === 'list'    ? '' : 'none';
  document.getElementById('itinerary-builder-view').style.display = tab === 'builder' ? '' : 'none';
}

function backToList() {
  _openItinId = null;
  document.getElementById('builder-tab').style.display = 'none';
  switchITab(document.querySelector('.itin-tab'), 'list');
  renderItineraryList();
}

// ── LIST VIEW ────────────────────────────────────────────────────
function renderItineraryList() {
  const search = (document.getElementById('itin-search')?.value || '').toLowerCase();
  const filter = document.getElementById('itin-filter')?.value || 'all';
  let items = DB.itineraries || [];
  if (filter !== 'all') items = items.filter(i => i.status === filter);
  if (search) items = items.filter(i =>
    (i.title || '').toLowerCase().includes(search) ||
    (i.destination || '').toLowerCase().includes(search)
  );

  const body = document.getElementById('itin-list-body');
  if (!items.length) {
    body.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--textd);font-size:13px">
      <div style="font-size:40px;margin-bottom:12px">🗓️</div>
      No itineraries found.<br><br>
      <button class="btn btn-primary" onclick="openNewItineraryModal()">+ Create Your First Itinerary</button>
    </div>`;
    return;
  }

  const statusColors = { draft:'#6b7280', sent:'#2563eb', confirmed:'#16a34a' };
  const statusLabels = { draft:'Draft', sent:'Sent to Customer', confirmed:'Confirmed' };

  body.innerHTML = items.map(itin => {
    const days  = itin.days  ? itin.days.length : 0;
    const pax   = (itin.adults || 0) + (itin.children || 0);
    const total = _calcTotalCost(itin);
    const sc    = statusColors[itin.status] || '#6b7280';
    const sl    = statusLabels[itin.status] || (itin.status || 'Draft');
    const itemCount = (itin.days || []).reduce((s, d) => s + (d.items || []).length, 0);

    return `<div class="card" style="margin-bottom:10px;padding:14px 18px;display:flex;align-items:center;gap:14px;cursor:pointer" onclick="openItinerary('${itin.id}')">
      <div style="width:44px;height:44px;border-radius:10px;background:var(--g50);border:1px solid var(--g200);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🗓️</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:700;color:var(--text)">${_esc(itin.title || 'Untitled')}</div>
        <div style="font-size:11.5px;color:var(--textd);margin-top:3px">
          📍 ${_esc(itin.destination || '—')} &nbsp;·&nbsp;
          ${itin.startDate ? '📅 ' + _fmtDate(itin.startDate) : ''}${itin.endDate ? ' → ' + _fmtDate(itin.endDate) : ''} &nbsp;·&nbsp;
          ${days} day${days !== 1 ? 's' : ''} · ${itemCount} item${itemCount !== 1 ? 's' : ''} &nbsp;·&nbsp; 👤 ${pax} pax
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-right:8px">
        <div style="font-size:13px;font-weight:700;color:var(--g700)">${total > 0 ? '₹' + _fmtNum(total) : '—'}</div>
        <div style="font-size:10.5px;font-weight:700;color:${sc};margin-top:3px">${sl}</div>
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0" onclick="event.stopPropagation()">
        <button class="icon-btn" title="Delete" onclick="deleteItinerary('${itin.id}')" style="font-size:13px;padding:5px 8px;color:var(--red)">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function deleteItinerary(id) {
  if (!confirm('Delete this itinerary? This cannot be undone.')) return;
  DB.itineraries = (DB.itineraries || []).filter(i => i.id !== id);
  saveDB();
  if (typeof dbDelete === 'function') dbDelete('itineraries', id);
  renderItineraryList();
  showToast('Itinerary deleted.');
}

// ── NEW / EDIT META MODAL ────────────────────────────────────────
function openNewItineraryModal() {
  document.getElementById('itin-meta-modal-title').textContent = 'New Itinerary';
  document.getElementById('meta-edit-id').value = '';
  document.getElementById('meta-title').value = '';
  document.getElementById('meta-dest').value = '';
  document.getElementById('meta-start').value = '';
  document.getElementById('meta-end').value = '';
  document.getElementById('meta-adults').value = '2';
  document.getElementById('meta-children').value = '0';
  document.getElementById('meta-notes').value = '';
  document.getElementById('meta-duration-preview').textContent = '—';
  document.getElementById('meta-error').style.display = 'none';
  _populateBookingDropdown('');
  openModal('modal-itin-meta');
}

function editItineraryMeta() {
  const itin = _getItin(_openItinId);
  if (!itin) return;
  document.getElementById('itin-meta-modal-title').textContent = 'Edit Trip';
  document.getElementById('meta-edit-id').value = itin.id;
  document.getElementById('meta-title').value = itin.title || '';
  document.getElementById('meta-dest').value = itin.destination || '';
  document.getElementById('meta-start').value = itin.startDate || '';
  document.getElementById('meta-end').value = itin.endDate || '';
  document.getElementById('meta-adults').value = itin.adults ?? 2;
  document.getElementById('meta-children').value = itin.children ?? 0;
  document.getElementById('meta-notes').value = itin.notes || '';
  document.getElementById('meta-error').style.display = 'none';
  _populateBookingDropdown(itin.bookingId || '');
  calcTripDays();
  openModal('modal-itin-meta');
}

function _populateBookingDropdown(selected) {
  const sel = document.getElementById('meta-booking');
  sel.innerHTML = '<option value="">— Standalone —</option>' +
    (DB.bookings || []).map(b =>
      `<option value="${_esc(b.id)}" ${b.id === selected ? 'selected' : ''}>${_esc(b.id)} — ${_esc(b.customerName || b.customer || '')}</option>`
    ).join('');
}

function calcTripDays() {
  const s  = document.getElementById('meta-start').value;
  const e  = document.getElementById('meta-end').value;
  const el = document.getElementById('meta-duration-preview');
  if (s && e) {
    const days = Math.round((new Date(e) - new Date(s)) / 86400000) + 1;
    el.textContent = days > 0
      ? `${days} Day${days > 1 ? 's' : ''} / ${days - 1} Night${days - 1 !== 1 ? 's' : ''}`
      : 'Invalid range';
  } else {
    el.textContent = '—';
  }
}

function saveItineraryMeta() {
  const title     = document.getElementById('meta-title').value.trim();
  const dest      = document.getElementById('meta-dest').value.trim();
  const startDate = document.getElementById('meta-start').value;
  const endDate   = document.getElementById('meta-end').value;
  const errEl     = document.getElementById('meta-error');

  if (!title)     { errEl.textContent = 'Trip title is required.';           errEl.style.display = ''; return; }
  if (!dest)      { errEl.textContent = 'Destination is required.';          errEl.style.display = ''; return; }
  if (!startDate || !endDate) { errEl.textContent = 'Start and end dates are required.'; errEl.style.display = ''; return; }
  if (new Date(endDate) < new Date(startDate)) { errEl.textContent = 'End date must be after start date.'; errEl.style.display = ''; return; }
  errEl.style.display = 'none';

  const editId = document.getElementById('meta-edit-id').value;
  let itin = editId ? _getItin(editId) : null;

  if (!itin) {
    itin = { id:'ITIN-' + Date.now(), days:[], passengers:[], status:'draft', createdAt:new Date().toISOString() };
  }

  const prevStart = itin.startDate;
  itin.title       = title;
  itin.destination = dest;
  itin.startDate   = startDate;
  itin.endDate     = endDate;
  itin.adults      = parseInt(document.getElementById('meta-adults').value)   || 2;
  itin.children    = parseInt(document.getElementById('meta-children').value) || 0;
  itin.notes       = document.getElementById('meta-notes').value.trim();
  itin.bookingId   = document.getElementById('meta-booking').value || null;
  itin.updatedAt   = new Date().toISOString();

  // Auto-create days on new itinerary
  if (!editId) {
    const dayCount = Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
    for (let d = 0; d < Math.max(dayCount, 1); d++) {
      const dt = new Date(startDate);
      dt.setDate(dt.getDate() + d);
      itin.days.push({ title:`Day ${d + 1}`, date:dt.toISOString().slice(0, 10), items:[] });
    }
  }

  _saveItin(itin);
  closeModal('modal-itin-meta');
  openItinerary(itin.id);
}

// ── OPEN BUILDER ─────────────────────────────────────────────────
function openItinerary(id) {
  const itin = _getItin(id);
  if (!itin) return;
  _openItinId = id;
  const btab = document.getElementById('builder-tab');
  btab.style.display = '';
  switchITab(btab, 'builder');
  renderBuilder(itin);
}

function renderBuilder(itin) {
  // Toolbar info
  document.getElementById('itin-disp-title').textContent = itin.title || 'Untitled';
  const pax  = (itin.adults || 0) + (itin.children || 0);
  const days = itin.days ? itin.days.length : 0;
  document.getElementById('itin-disp-meta').textContent =
    `📍 ${itin.destination || '—'} · ` +
    `${itin.startDate ? _fmtDate(itin.startDate) : '—'} → ${itin.endDate ? _fmtDate(itin.endDate) : '—'} · ` +
    `${days} day${days !== 1 ? 's' : ''} · ${pax} pax`;

  const sel = document.getElementById('itin-status-sel');
  if (sel) sel.value = itin.status || 'draft';

  // PDF header / print footer
  const compInfo = document.getElementById('pdf-company-info');
  if (compInfo) {
    const s = DB.settings || {};
    compInfo.innerHTML = `${_esc(s.companyName || 'Wanago Travel')}<br>${_esc(s.companyPhone || '')}<br>${_esc(s.companyEmail || '')}`;
  }
  const pfl = document.getElementById('print-footer-left');
  if (pfl) pfl.textContent = `${itin.title} · Generated ${new Date().toLocaleDateString('en-IN')}`;

  _renderPaxStrip(itin);
  _renderCostStrip(itin);

  document.getElementById('days-container').innerHTML =
    (itin.days || []).map((day, di) => _renderDayCard(day, di)).join('');
}

function _renderPaxStrip(itin) {
  const strip = document.getElementById('pax-strip');
  let html = `<div class="pax-badge">👤 ${itin.adults || 0} Adult${(itin.adults || 0) !== 1 ? 's' : ''}</div>`;
  if (itin.children) html += `<div class="pax-badge">🧒 ${itin.children} Child${itin.children !== 1 ? 'ren' : ''}</div>`;
  const pax = itin.passengers || [];
  pax.forEach(p => {
    html += `<div class="pax-badge">🧳 ${_esc(p.name || 'Passenger')}${p.passport ? ' · 🛂 ' + _esc(p.passport) : ''}</div>`;
  });
  if (!pax.length) {
    html += `<div class="pax-badge" style="cursor:pointer;color:var(--textd)" onclick="openPassengerModal()">+ Add passenger details</div>`;
  }
  strip.innerHTML = html;
}

function _calcTotalCost(itin) {
  return (itin.days || []).reduce((sum, d) =>
    sum + (d.items || []).reduce((s, item) => s + (parseFloat(item.cost) || 0), 0), 0);
}

function _calcCostByType(itin) {
  const map = {};
  (itin.days || []).forEach(d =>
    (d.items || []).forEach(item => {
      const k = item.type || 'other';
      map[k] = (map[k] || 0) + (parseFloat(item.cost) || 0);
    })
  );
  return map;
}

function _renderCostStrip(itin) {
  const strip     = document.getElementById('cost-strip');
  const total     = _calcTotalCost(itin);
  const breakdown = _calcCostByType(itin);
  let html = `<div class="cost-item"><strong>Total: ₹${_fmtNum(total)}</strong></div>`;
  Object.entries(breakdown).forEach(([type, amt]) => {
    if (amt > 0) {
      const t = SERVICE_TYPES[type];
      html += `<div class="cost-item">${t ? t.emoji : '•'} ${t ? t.label : type}: <strong>₹${_fmtNum(amt)}</strong></div>`;
    }
  });
  strip.innerHTML = html;
}

// ── DAY CARD ─────────────────────────────────────────────────────
function _renderDayCard(day, di) {
  const dateStr  = day.date ? ` · ${_fmtDate(day.date)}` : '';
  const itemsHtml = (day.items || []).length
    ? (day.items || []).map((item, ii) => _renderItemCard(item, di, ii)).join('')
    : '<div class="day-empty">No items yet — click <b>+ Add Item</b>.</div>';

  return `<div class="day-card" id="day-card-${di}" draggable="true"
    ondragstart="onDayDragStart(event,${di})"
    ondragover="event.preventDefault();event.stopPropagation();this.classList.add('drag-over')"
    ondragleave="this.classList.remove('drag-over')"
    ondrop="onDayDrop(event,${di})">
    <div class="day-header">
      <span class="day-num-badge">Day ${di + 1}</span>
      <span class="day-date-lbl">${dateStr}</span>
      <input class="day-title-inp" value="${_esc(day.title || '')}" placeholder="Day title…"
        onchange="updateDayTitle(${di},this.value)">
      <div class="day-header-actions">
        <button class="day-add-btn" onclick="openAddItemModal(${di})">+ Add Item</button>
        <button class="day-del-btn" onclick="removeDay(${di})" title="Remove day">🗑</button>
      </div>
    </div>
    <div class="day-items" id="day-items-${di}"
      ondragover="onItemDragOver(event,${di})"
      ondrop="onItemDropInDay(event,${di})">
      ${itemsHtml}
    </div>
  </div>`;
}

function _renderItemCard(item, di, ii) {
  const t          = SERVICE_TYPES[item.type] || SERVICE_TYPES.note;
  const statusMap  = { confirmed:'Confirmed', pending:'Pending', 'on-request':'On Request', cancelled:'Cancelled' };
  const sub        = _buildSubRow(item);

  return `<div class="itin-item" draggable="true"
    ondragstart="onItemDragStart(event,${di},${ii})"
    ondragover="event.preventDefault();event.stopPropagation();this.classList.add('drag-over-item')"
    ondragleave="this.classList.remove('drag-over-item')"
    ondrop="onItemDrop(event,${di},${ii})">
    <span class="drag-handle">⠿</span>
    <div class="item-type-icon" style="background:${t.color};color:${t.text}">${t.emoji}</div>
    <div class="item-time-col">
      ${item.time || '—'}
      ${item.endTime ? `<div class="item-time-end">${item.endTime}</div>` : ''}
    </div>
    <div class="item-body">
      <div class="item-title-row">${_esc(item.title || '—')}</div>
      ${sub ? `<div class="item-sub-row">${_esc(sub)}</div>` : ''}
      ${item.status ? `<span class="item-status-pill item-status-${item.status}">${statusMap[item.status] || item.status}</span>` : ''}
    </div>
    <div class="item-cost-col">${item.cost ? '₹' + _fmtNum(parseFloat(item.cost)) : ''}</div>
    <div class="item-actions-col">
      <button class="item-edit-btn" onclick="editItem(${di},${ii})" title="Edit">✏️</button>
      <button class="item-del-btn"  onclick="removeItem(${di},${ii})" title="Remove">🗑</button>
    </div>
  </div>`;
}

function _buildSubRow(item) {
  switch (item.type) {
    case 'flight':
      return [item.flightNo, item.flFrom && item.flTo ? `${item.flFrom}→${item.flTo}` : null, item.flClass].filter(Boolean).join(' · ');
    case 'hotel':
      return [item.htCity, item.htRoom, item.htMeal].filter(Boolean).join(' · ');
    case 'transfer': case 'car': case 'taxi':
      return [item.trFrom && item.trTo ? `${item.trFrom} → ${item.trTo}` : null, item.trVehicle, item.trDriver ? '🚗 '+item.trDriver : null].filter(Boolean).join(' · ');
    case 'activity': case 'sightseeing':
      return [item.acLoc, item.acDuration, item.acVendor].filter(Boolean).join(' · ');
    case 'meal':
      return [item.mlVenue, item.mlCuisine, item.mlIncl === 'yes' ? '✓ Included' : 'Own Cost'].filter(Boolean).join(' · ');
    case 'train': case 'bus':
      return [item.miscF1, item.miscF2 && item.miscF3 ? `${item.miscF2}→${item.miscF3}` : null, item.miscF4].filter(Boolean).join(' · ');
    default:
      return [item.miscF1, item.miscF2].filter(Boolean).join(' · ') || (item.notes || '');
  }
}

function updateDayTitle(di, val) {
  const itin = _getItin(_openItinId);
  if (!itin || !itin.days[di]) return;
  itin.days[di].title = val;
  _saveItin(itin);
}

// ── ADD / REMOVE DAYS ────────────────────────────────────────────
function addDay() {
  const itin = _getItin(_openItinId);
  if (!itin) return;
  const days = itin.days || [];
  let date = '';
  if (itin.startDate) {
    const dt = new Date(itin.startDate);
    dt.setDate(dt.getDate() + days.length);
    date = dt.toISOString().slice(0, 10);
  }
  days.push({ title:`Day ${days.length + 1}`, date, items:[] });
  itin.days = days;
  _saveItin(itin);
  renderBuilder(itin);
}

function removeDay(di) {
  const itin = _getItin(_openItinId);
  if (!itin) return;
  if ((itin.days || []).length <= 1) { showToast('Cannot remove the last day.', 'error'); return; }
  if (!confirm(`Remove Day ${di + 1}? All items in this day will be lost.`)) return;
  itin.days.splice(di, 1);
  _saveItin(itin);
  renderBuilder(itin);
}

// ── TYPE SELECTOR GRID ───────────────────────────────────────────
function _buildTypeGrid() {
  const grid = document.getElementById('type-grid');
  if (!grid) return;
  grid.innerHTML = Object.entries(SERVICE_TYPES).map(([key, t]) =>
    `<div class="type-btn" id="type-btn-${key}" onclick="selectItemType('${key}')">
      <span class="type-emoji">${t.emoji}</span>${t.label}
    </div>`
  ).join('');
}

// ── ADD / EDIT ITEM MODAL ────────────────────────────────────────
function openAddItemModal(di) {
  _buildTypeGrid();
  document.getElementById('add-item-title').textContent = 'Add Item';
  document.getElementById('item-edit-day').value = di;
  document.getElementById('item-edit-idx').value = '';
  _resetItemModal();
  selectItemType('flight');
  openModal('modal-add-item');
}

function editItem(di, ii) {
  const itin = _getItin(_openItinId);
  if (!itin) return;
  const item = itin.days[di]?.items[ii];
  if (!item) return;
  _buildTypeGrid();
  document.getElementById('add-item-title').textContent = 'Edit Item';
  document.getElementById('item-edit-day').value = di;
  document.getElementById('item-edit-idx').value = ii;
  _resetItemModal();
  selectItemType(item.type || 'flight');

  // Common fields
  _v('item-time',    item.time);
  _v('item-endtime', item.endTime);
  _v('item-title',   item.title);
  _v('item-cost',    item.cost);
  _v('item-ref',     item.ref);
  _v('item-notes',   item.notes);
  const statusEl = document.getElementById('item-status');
  if (statusEl && item.status) statusEl.value = item.status;

  _fillTypeFields(item);
  openModal('modal-add-item');
}

function _resetItemModal() {
  const ids = [
    'item-time','item-endtime','item-title','item-cost','item-ref','item-notes',
    'fl-airline','fl-no','fl-from','fl-to','fl-pnr','fl-seats','fl-terminal',
    'ht-name','ht-city','ht-checkout','ht-room','ht-conf','ht-phone',
    'tr-from','tr-to','tr-driver','tr-phone','tr-vendor',
    'ac-name','ac-loc','ac-duration','ac-vendor','ac-ref','ac-incl',
    'ml-venue','ml-cuisine','misc-f1','misc-f2','misc-f3','misc-f4'
  ];
  ids.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const statusEl = document.getElementById('item-status');
  if (statusEl) statusEl.value = 'confirmed';
  const htRooms = document.getElementById('ht-rooms');
  if (htRooms) htRooms.value = '1';
  document.getElementById('item-error').style.display = 'none';
}

function _fillTypeFields(item) {
  const t = item.type;
  if (t === 'flight') {
    _v('fl-airline', item.airline); _v('fl-no', item.flightNo);
    _v('fl-from', item.flFrom);     _v('fl-to', item.flTo);
    _v('fl-pnr', item.flPnr);       _v('fl-seats', item.flSeats);
    _v('fl-terminal', item.flTerminal);
    const fc = document.getElementById('fl-class'); if (fc && item.flClass) fc.value = item.flClass;
  } else if (t === 'hotel') {
    _v('ht-name', item.htName); _v('ht-city', item.htCity);
    _v('ht-checkout', item.htCheckout); _v('ht-room', item.htRoom);
    _v('ht-rooms', item.htRooms);  _v('ht-conf', item.htConf);  _v('ht-phone', item.htPhone);
    const hm = document.getElementById('ht-meal'); if (hm && item.htMeal) hm.value = item.htMeal;
  } else if (['transfer','car','taxi'].includes(t)) {
    _v('tr-from', item.trFrom); _v('tr-to', item.trTo);
    _v('tr-driver', item.trDriver); _v('tr-phone', item.trPhone); _v('tr-vendor', item.trVendor);
    const tv = document.getElementById('tr-vehicle'); if (tv && item.trVehicle) tv.value = item.trVehicle;
  } else if (['activity','sightseeing'].includes(t)) {
    _v('ac-name', item.acName); _v('ac-loc', item.acLoc);
    _v('ac-duration', item.acDuration); _v('ac-vendor', item.acVendor);
    _v('ac-ref', item.acRef); _v('ac-incl', item.acIncl);
  } else if (t === 'meal') {
    _v('ml-venue', item.mlVenue); _v('ml-cuisine', item.mlCuisine);
    const mt = document.getElementById('ml-type'); if (mt && item.mlType) mt.value = item.mlType;
    const mi = document.getElementById('ml-incl'); if (mi && item.mlIncl) mi.value = item.mlIncl;
  } else if (SERVICE_TYPES[t]?.group === 'fg-misc') {
    _v('misc-f1', item.miscF1); _v('misc-f2', item.miscF2);
    _v('misc-f3', item.miscF3); _v('misc-f4', item.miscF4);
  }
}

function _v(id, val) {
  const el = document.getElementById(id);
  if (el && val != null) el.value = val;
}

function selectItemType(type) {
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById(`type-btn-${type}`);
  if (btn) btn.classList.add('selected');
  document.getElementById('item-type').value = type;

  const allGroups = ['fg-flight','fg-hotel','fg-transfer','fg-activity','fg-meal','fg-misc'];
  allGroups.forEach(g => {
    const el = document.getElementById(g); if (el) el.classList.remove('visible');
  });

  const t = SERVICE_TYPES[type];
  if (t && t.group) {
    const groupEl = document.getElementById(t.group);
    if (groupEl) groupEl.classList.add('visible');

    if (t.group === 'fg-misc' && t.miscConfig) {
      document.getElementById('misc-section-title').textContent = t.miscConfig.title;
      document.getElementById('misc-f1-lbl').textContent = t.miscConfig.f1;
      document.getElementById('misc-f2-lbl').textContent = t.miscConfig.f2;
      document.getElementById('misc-f3-lbl').textContent = t.miscConfig.f3;
      document.getElementById('misc-f4-lbl').textContent = t.miscConfig.f4;
    }
  }
}

function autoFillItemTitle() {
  const type = document.getElementById('item-type').value;
  let title = '';
  switch (type) {
    case 'flight': {
      const airline = document.getElementById('fl-airline').value;
      const no      = document.getElementById('fl-no').value;
      const from    = document.getElementById('fl-from').value.toUpperCase();
      const to      = document.getElementById('fl-to').value.toUpperCase();
      if (airline || no) title = [airline, no].filter(Boolean).join(' ');
      if (from && to) title += (title ? ' · ' : '') + `${from} → ${to}`;
      break;
    }
    case 'hotel':
      title = document.getElementById('ht-name').value; break;
    case 'transfer': case 'car': case 'taxi': {
      const from = document.getElementById('tr-from').value;
      const to   = document.getElementById('tr-to').value;
      title = from && to ? `${from} → ${to}` : (from || to || 'Transfer');
      break;
    }
    case 'activity': case 'sightseeing':
      title = document.getElementById('ac-name').value; break;
    case 'meal': {
      const mtype = document.getElementById('ml-type').value;
      const venue = document.getElementById('ml-venue').value;
      title = venue ? `${mtype} at ${venue}` : mtype;
      break;
    }
    default: {
      const mc = SERVICE_TYPES[type]?.miscConfig;
      if (mc) title = document.getElementById('misc-f1').value;
    }
  }
  if (title) document.getElementById('item-title').value = title;
}

function saveItem() {
  const di        = parseInt(document.getElementById('item-edit-day').value);
  const editIdxRaw = document.getElementById('item-edit-idx').value;
  const type       = document.getElementById('item-type').value;
  const title      = document.getElementById('item-title').value.trim();
  const errEl      = document.getElementById('item-error');

  if (!title) { errEl.textContent = 'Title is required.'; errEl.style.display = ''; return; }
  errEl.style.display = 'none';

  const item = {
    type,
    title,
    time:    document.getElementById('item-time').value,
    endTime: document.getElementById('item-endtime').value,
    status:  document.getElementById('item-status').value,
    cost:    document.getElementById('item-cost').value || 0,
    ref:     document.getElementById('item-ref').value,
    notes:   document.getElementById('item-notes').value,
  };

  if (type === 'flight') {
    item.airline   = document.getElementById('fl-airline').value;
    item.flightNo  = document.getElementById('fl-no').value;
    item.flFrom    = document.getElementById('fl-from').value.toUpperCase();
    item.flTo      = document.getElementById('fl-to').value.toUpperCase();
    item.flPnr     = document.getElementById('fl-pnr').value.toUpperCase();
    item.flClass   = document.getElementById('fl-class').value;
    item.flSeats   = document.getElementById('fl-seats').value;
    item.flTerminal= document.getElementById('fl-terminal').value;
  } else if (type === 'hotel') {
    item.htName    = document.getElementById('ht-name').value;
    item.htCity    = document.getElementById('ht-city').value;
    item.htCheckout= document.getElementById('ht-checkout').value;
    item.htRoom    = document.getElementById('ht-room').value;
    item.htRooms   = document.getElementById('ht-rooms').value;
    item.htMeal    = document.getElementById('ht-meal').value;
    item.htConf    = document.getElementById('ht-conf').value;
    item.htPhone   = document.getElementById('ht-phone').value;
  } else if (['transfer','car','taxi'].includes(type)) {
    item.trFrom    = document.getElementById('tr-from').value;
    item.trTo      = document.getElementById('tr-to').value;
    item.trVehicle = document.getElementById('tr-vehicle').value;
    item.trDriver  = document.getElementById('tr-driver').value;
    item.trPhone   = document.getElementById('tr-phone').value;
    item.trVendor  = document.getElementById('tr-vendor').value;
  } else if (['activity','sightseeing'].includes(type)) {
    item.acName     = document.getElementById('ac-name').value;
    item.acLoc      = document.getElementById('ac-loc').value;
    item.acDuration = document.getElementById('ac-duration').value;
    item.acVendor   = document.getElementById('ac-vendor').value;
    item.acRef      = document.getElementById('ac-ref').value;
    item.acIncl     = document.getElementById('ac-incl').value;
  } else if (type === 'meal') {
    item.mlType    = document.getElementById('ml-type').value;
    item.mlVenue   = document.getElementById('ml-venue').value;
    item.mlCuisine = document.getElementById('ml-cuisine').value;
    item.mlIncl    = document.getElementById('ml-incl').value;
  } else if (SERVICE_TYPES[type]?.group === 'fg-misc') {
    item.miscF1 = document.getElementById('misc-f1').value;
    item.miscF2 = document.getElementById('misc-f2').value;
    item.miscF3 = document.getElementById('misc-f3').value;
    item.miscF4 = document.getElementById('misc-f4').value;
  }

  const itin = _getItin(_openItinId);
  if (!itin || !itin.days[di]) return;

  if (editIdxRaw !== '') {
    itin.days[di].items[parseInt(editIdxRaw)] = item;
  } else {
    itin.days[di].items.push(item);
  }

  _saveItin(itin);
  closeModal('modal-add-item');
  renderBuilder(itin);
  showToast(editIdxRaw !== '' ? 'Item updated.' : 'Item added.');
}

function removeItem(di, ii) {
  const itin = _getItin(_openItinId);
  if (!itin) return;
  itin.days[di].items.splice(ii, 1);
  _saveItin(itin);
  renderBuilder(itin);
}

// ── DRAG & DROP — ITEMS ──────────────────────────────────────────
function onItemDragStart(event, fromDay, fromIdx) {
  _dragState = { type:'item', fromDay, fromIdx };
  event.dataTransfer.effectAllowed = 'move';
  event.stopPropagation();
}

function onItemDragOver(event, dayIdx) {
  if (!_dragState || _dragState.type !== 'item') return;
  event.preventDefault();
  event.stopPropagation();
}

// Drop on a specific item — insert before it
function onItemDrop(event, toDayIdx, toItemIdx) {
  event.preventDefault();
  event.stopPropagation();
  if (!_dragState || _dragState.type !== 'item') return;
  const itin = _getItin(_openItinId);
  if (!itin) return;

  const { fromDay, fromIdx } = _dragState;
  _dragState = null;
  if (fromDay === toDayIdx && fromIdx === toItemIdx) return;

  const item = itin.days[fromDay].items.splice(fromIdx, 1)[0];
  const adjustedIdx = (fromDay === toDayIdx && fromIdx < toItemIdx) ? toItemIdx - 1 : toItemIdx;
  itin.days[toDayIdx].items.splice(adjustedIdx, 0, item);

  _saveItin(itin);
  renderBuilder(itin);
}

// Drop on the day items container (append to end)
function onItemDropInDay(event, toDayIdx) {
  event.preventDefault();
  event.stopPropagation();
  if (!_dragState || _dragState.type !== 'item') return;
  const itin = _getItin(_openItinId);
  if (!itin) return;

  const { fromDay, fromIdx } = _dragState;
  _dragState = null;

  const item = itin.days[fromDay].items.splice(fromIdx, 1)[0];
  itin.days[toDayIdx].items.push(item);

  _saveItin(itin);
  renderBuilder(itin);
}

// ── DRAG & DROP — DAYS ───────────────────────────────────────────
function onDayDragStart(event, fromIdx) {
  _dragState = { type:'day', fromIdx };
  event.dataTransfer.effectAllowed = 'move';
}

function onDayDragOver(event) {
  if (!_dragState || _dragState.type !== 'day') return;
  event.preventDefault();
}

// targetDayIdx is the index of the day card being dropped onto
function onDayDrop(event, targetDayIdx) {
  event.preventDefault();
  event.stopPropagation();
  if (!_dragState || _dragState.type !== 'day') return;
  const itin = _getItin(_openItinId);
  if (!itin) return;

  const fromIdx = _dragState.fromIdx;
  _dragState = null;

  if (targetDayIdx === undefined || targetDayIdx === fromIdx) return;

  const day    = itin.days.splice(fromIdx, 1)[0];
  const toIdx  = fromIdx < targetDayIdx ? targetDayIdx - 1 : targetDayIdx;
  itin.days.splice(toIdx, 0, day);

  _saveItin(itin);
  renderBuilder(itin);
}

// ── STATUS ───────────────────────────────────────────────────────
function changeItineraryStatus(val) {
  const itin = _getItin(_openItinId);
  if (!itin) return;
  itin.status = val;
  _saveItin(itin);
  showToast('Status updated.');
}

// ── PASSENGERS MODAL ─────────────────────────────────────────────
function openPassengerModal() {
  const itin = _getItin(_openItinId);
  if (!itin) return;
  const pax  = itin.passengers || [];
  const form = document.getElementById('pax-list-form');
  form.innerHTML = pax.map((p, i) => _paxRowHtml(i, p)).join('');
  if (!pax.length) form.innerHTML = _paxRowHtml(0, {});
  openModal('modal-passengers');
}

function _paxRowHtml(i, p) {
  return `<div class="form-grid" id="pax-row-${i}" style="margin-bottom:8px;align-items:end">
    <div class="form-group"><label class="form-label">Name *</label><input class="form-input" id="pax-name-${i}" value="${_esc(p.name||'')}"></div>
    <div class="form-group"><label class="form-label">Passport No.</label><input class="form-input" id="pax-pass-${i}" value="${_esc(p.passport||'')}"></div>
    <div class="form-group"><label class="form-label">Date of Birth</label><input class="form-input" type="date" id="pax-dob-${i}" value="${p.dob||''}"></div>
    <div class="form-group"><label class="form-label">Nationality</label><input class="form-input" id="pax-nat-${i}" value="${_esc(p.nationality||'')}"></div>
    <div class="form-group"><label class="form-label">Type</label>
      <select class="form-select" id="pax-type-${i}">
        <option value="adult"  ${(p.type||'adult')==='adult'  ?'selected':''}>Adult</option>
        <option value="child"  ${p.type==='child'  ?'selected':''}>Child</option>
        <option value="infant" ${p.type==='infant' ?'selected':''}>Infant</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">&nbsp;</label>
      <button class="btn btn-outline" style="padding:7px 10px;font-size:12px" onclick="removePaxRow(${i})">Remove</button>
    </div>
  </div>`;
}

function addPaxRow() {
  const form  = document.getElementById('pax-list-form');
  const count = form.querySelectorAll('[id^="pax-row-"]').length;
  const div   = document.createElement('div');
  div.innerHTML = _paxRowHtml(count, {});
  form.appendChild(div.firstElementChild);
}

function removePaxRow(i) {
  const row = document.getElementById(`pax-row-${i}`);
  if (row) row.remove();
}

function savePassengers() {
  const itin = _getItin(_openItinId);
  if (!itin) return;
  const rows = document.getElementById('pax-list-form').querySelectorAll('[id^="pax-row-"]');
  const passengers = [];
  rows.forEach(row => {
    const i    = row.id.replace('pax-row-', '');
    const name = (document.getElementById(`pax-name-${i}`)?.value || '').trim();
    if (!name) return;
    passengers.push({
      name,
      passport:    document.getElementById(`pax-pass-${i}`)?.value || '',
      dob:         document.getElementById(`pax-dob-${i}`)?.value  || '',
      nationality: document.getElementById(`pax-nat-${i}`)?.value  || '',
      type:        document.getElementById(`pax-type-${i}`)?.value || 'adult',
    });
  });
  itin.passengers = passengers;
  _saveItin(itin);
  closeModal('modal-passengers');
  renderBuilder(itin);
  showToast('Passengers saved.');
}

// ── PDF EXPORT ───────────────────────────────────────────────────
function exportItineraryPDF() {
  window.print();
}

// ── WHATSAPP SHARE ───────────────────────────────────────────────
function shareItineraryWhatsApp() {
  const itin = _getItin(_openItinId);
  if (!itin) return;
  const s = DB.settings || {};
  const lines = [];

  lines.push(`*${itin.title || 'Itinerary'}*`);
  lines.push(`_${s.companyName || 'Wanago Travel'}_`);
  lines.push('');
  lines.push(`📍 *Destination:* ${itin.destination || '—'}`);
  lines.push(`📅 *Dates:* ${itin.startDate ? _fmtDate(itin.startDate) : '—'} → ${itin.endDate ? _fmtDate(itin.endDate) : '—'}`);
  const paxStr = `${itin.adults || 0} Adult${(itin.adults||0)!==1?'s':''}${itin.children ? `, ${itin.children} Child${itin.children!==1?'ren':''}` : ''}`;
  lines.push(`👤 *Travellers:* ${paxStr}`);
  if (itin.notes) lines.push(`📝 ${itin.notes}`);
  lines.push('');

  (itin.days || []).forEach((day, di) => {
    const dayLabel = `Day ${di+1}${day.title && day.title !== `Day ${di+1}` ? ' — '+day.title : ''}`;
    lines.push(`*${dayLabel}*${day.date ? ' ('+_fmtDate(day.date)+')' : ''}`);
    (day.items || []).forEach(item => {
      const t   = SERVICE_TYPES[item.type];
      const sub = _buildSubRow(item);
      let line  = `${t ? t.emoji : '•'} `;
      if (item.time) line += `${item.time} — `;
      line += `*${item.title}*`;
      if (sub) line += `\n   _${sub}_`;
      if (item.ref) line += `\n   Ref: ${item.ref}`;
      lines.push(line);
    });
    lines.push('');
  });

  const total = _calcTotalCost(itin);
  if (total > 0) lines.push(`💰 *Total: ₹${_fmtNum(total)}*`);
  lines.push('');
  lines.push(`_Regards,_`);
  lines.push(`_${s.companyName || 'Wanago Travel'}${s.companyPhone ? ' · '+s.companyPhone : ''}_`);

  window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
}

// ── HELPERS ──────────────────────────────────────────────────────
function _fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}

function _fmtNum(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function _esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── EXPOSE TO GLOBAL SCOPE (HTML onclick handlers) ───────────────
Object.assign(window, {
  switchITab, backToList, renderItineraryList,
  openNewItineraryModal, editItineraryMeta, calcTripDays, saveItineraryMeta,
  openItinerary, renderBuilder,
  addDay, removeDay, updateDayTitle,
  openAddItemModal, editItem, saveItem, removeItem,
  selectItemType, autoFillItemTitle,
  onItemDragStart, onItemDragOver, onItemDrop, onItemDropInDay,
  onDayDragStart, onDayDragOver, onDayDrop,
  changeItineraryStatus,
  openPassengerModal, addPaxRow, removePaxRow, savePassengers,
  exportItineraryPDF, shareItineraryWhatsApp,
  deleteItinerary,
});

// ── INIT ─────────────────────────────────────────────────────────
initPage(() => {
  if (!DB.itineraries) DB.itineraries = [];
  renderItineraryList();
});
