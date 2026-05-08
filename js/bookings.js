// ═══════════════════════════════════════════════════════════════
//  AUTH GUARD
// ═══════════════════════════════════════════════════════════════

function initPage(renderFn) {
  // Check session
  var session = sessionStorage.getItem('wanago_session');
  if (!session) { window.location.href = '../index.html'; return; }

  // Set user UI
  try {
    var s = JSON.parse(session);
    var name = (window.currentUser && window.currentUser.name) || s.name || 'User';
    var av = document.getElementById('user-avatar');
    var un = document.getElementById('user-name');
    var tu = document.getElementById('topbar-user');
    if (av) av.textContent = name[0].toUpperCase();
    if (un) un.textContent = name;
    if (tu) tu.textContent = s.email || '';
    if (typeof window.rebuildSidebar === 'function') window.rebuildSidebar();
  } catch(ex) {}

  // Render with loader fade
  function fadeLoader() {
    var l = document.getElementById('page-loader');
    var a = document.querySelector('.app');
    if (l) { l.classList.add('fade-out'); setTimeout(function(){ try{l.parentNode.removeChild(l);}catch(e){} }, 300); }
    if (a) a.classList.add('loaded');
  }

  setTimeout(function() {
    try { if (renderFn) renderFn(); } catch(e) { console.error('Page render error:', e); }
    fadeLoader();
  }, 20);
}

function handleLogout() {
  sessionStorage.removeItem('wanago_session');
  window.location.href = '../index.html';
}

function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

const BK_WORKFLOW = {
  pending_finance: { next: 'finance_approved', label: '✔ Approve Finance' },
  finance_approved: { next: 'ops_pending', label: '⚙ Send to Ops' },
  ops_pending: { next: 'confirmed', label: '✅ Confirm Booking' },
};
const PENDING_STATUSES = ['pending','pending_finance','finance_approved','ops_pending'];
let bookFilter = 'all';
let bkUrgencySort = false;

function _deptBadge(travelDate) {
  if (!travelDate) return '';
  const d = Math.ceil((new Date(travelDate) - new Date(today())) / 86400000);
  if (d === 0) return '<div style="font-size:9px;font-weight:700;color:#e74c3c;background:#fde8e8;border-radius:4px;padding:1px 5px;margin-top:2px;display:inline-block">Today!</div>';
  if (d === 1) return '<div style="font-size:9px;font-weight:700;color:#e67e22;background:#fef3e2;border-radius:4px;padding:1px 5px;margin-top:2px;display:inline-block">Tomorrow</div>';
  if (d > 1 && d <= 7) return '<div style="font-size:9px;color:#f39c12;background:#fffce0;border-radius:4px;padding:1px 5px;margin-top:2px;display:inline-block">In ' + d + ' days</div>';
  if (d < 0) return '<div style="font-size:9px;color:#aaa;border-radius:4px;padding:1px 5px;margin-top:2px;display:inline-block">Departed</div>';
  return '';
}

function renderBkAIStrip() {
  const el = document.getElementById('bk-ai-strip'); if (!el) return;
  const bks = hScoped('bookings');
  const now = new Date();
  const todayStr = today();
  const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const depToday = bks.filter(b => b.travelDate === todayStr && b.status !== 'cancelled').length;
  const depTomorrow = bks.filter(b => b.travelDate === tomorrowStr && b.status !== 'cancelled').length;
  const dep7 = bks.filter(b => { if (!b.travelDate || b.status === 'cancelled') return false; const d = Math.ceil((new Date(b.travelDate) - now) / 86400000); return d > 1 && d <= 7; }).length;
  const pendingBal = bks.filter(b => b.status !== 'cancelled').reduce((s, b) => s + Number(b.pendingAmount || 0), 0);
  const pendingCount = bks.filter(b => PENDING_STATUSES.includes(b.status)).length;
  const items = [];
  if (depToday > 0) items.push('<div style="background:#fde8e8;border-left:3px solid #e74c3c;border-radius:8px;padding:9px 12px"><div style="font-size:12px;font-weight:700;color:#c0392b">✈️ ' + depToday + ' departure' + (depToday > 1 ? 's' : '') + ' TODAY</div><div style="font-size:10.5px;color:#888;margin-top:1px">Immediate action required</div></div>');
  if (depTomorrow > 0) items.push('<div style="background:#fef3e2;border-left:3px solid #f39c12;border-radius:8px;padding:9px 12px"><div style="font-size:12px;font-weight:700;color:#b7770d">🗓️ ' + depTomorrow + ' departure' + (depTomorrow > 1 ? 's' : '') + ' tomorrow</div><div style="font-size:10.5px;color:#888;margin-top:1px">Confirm documents and transfers</div></div>');
  if (dep7 > 0) items.push('<div style="background:#f0faf4;border-left:3px solid #2ecc71;border-radius:8px;padding:9px 12px"><div style="font-size:12px;font-weight:700;color:#1a7a4a">📅 ' + dep7 + ' more within 7 days</div><div style="font-size:10.5px;color:#888;margin-top:1px">Plan ahead</div></div>');
  if (pendingBal > 0) items.push('<div style="background:#fff8f0;border-left:3px solid #e67e22;border-radius:8px;padding:9px 12px"><div style="font-size:12px;font-weight:700;color:#b7770d">💳 ' + formatMoney(pendingBal) + ' pending collection</div><div style="font-size:10.5px;color:#888;margin-top:1px">' + pendingCount + ' booking' + (pendingCount !== 1 ? 's' : '') + ' awaiting payment</div></div>');
  if (!items.length) { el.style.display = 'none'; return; }
  el.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:12px';
  el.innerHTML = items.join('');
}

function toggleBkUrgencySort() {
  bkUrgencySort = !bkUrgencySort;
  const btn = document.getElementById('bk-urgency-btn');
  if (btn) { btn.style.background = bkUrgencySort ? 'var(--g600)' : ''; btn.style.color = bkUrgencySort ? '#fff' : ''; btn.style.borderColor = bkUrgencySort ? 'var(--g600)' : ''; }
  renderBookings();
}

function renderBkStats() {
  const bks = hScoped('bookings');
  const confirmed = bks.filter(b=>b.status==='confirmed').length;
  const pending = bks.filter(b=>PENDING_STATUSES.includes(b.status)).length;
  const revenue = bks.filter(b=>b.status!=='cancelled').reduce((s,b)=>s+Number(b.advancePaid||b.paidAmount||0),0);
  const balance = bks.filter(b=>b.status!=='cancelled').reduce((s,b)=>s+Number(b.pendingAmount||0),0);
  const profit = bks.filter(b=>b.status==='confirmed').reduce((s,b)=>s+Number(b.profit||0),0);
  const departing7 = bks.filter(b=>{ if(!b.travelDate||b.status==='cancelled')return false; const d=Math.ceil((new Date(b.travelDate)-new Date(today()))/86400000); return d>=0&&d<=7; }).length;
  const el = document.getElementById('bk-stats'); if(!el) return;
  el.innerHTML = [
    {label:'Total Bookings',val:bks.length,meta:confirmed+' confirmed, '+pending+' pending',click:"filterBookings('all',document.querySelector('.chip'))"},
    {label:'💰 Revenue Collected',val:formatMoney(revenue),meta:'From all payments'},
    {label:'⚠️ Balance Pending',val:formatMoney(balance),meta:'Outstanding dues',cls:'stat-dn'},
    {label:'📊 Total Profit',val:formatMoney(profit),meta:'From confirmed bookings',cls:'stat-up'},
    {label:'✈️ Departing in 7 Days',val:departing7,meta:'Upcoming trips'},
  ].map(s=>'<div class="stat-card" style="cursor:pointer" '+(s.click?'onclick="'+s.click+'"':'')+'><div class="stat-label">'+s.label+'</div><div class="stat-val '+(s.cls||'')+'">'+s.val+'</div><div class="stat-meta">'+s.meta+'</div></div>').join('');
}

function renderBookings(filter) {
  if (filter) bookFilter = filter;
  renderBkStats();
  renderBkAIStrip();
  let bks = hScoped('bookings');
  if (bookFilter !== 'all') bks = bks.filter(b=>b.status===bookFilter);
  const q = (document.getElementById('bk-search')?.value||'').toLowerCase();
  if (q) bks = bks.filter(b=>(b.ref||'').toLowerCase().includes(q)||(b.customerName||'').toLowerCase().includes(q)||(b.destination||'').toLowerCase().includes(q));
  const agentF = document.getElementById('bk-agent-filter')?.value;
  if (agentF) bks = bks.filter(b=>b.agent===agentF);
  const payF = document.getElementById('bk-pay-filter')?.value;
  if (payF==='unpaid') bks=bks.filter(b=>!b.advancePaid&&!b.paidAmount);
  if (payF==='partial') bks=bks.filter(b=>(Number(b.advancePaid||b.paidAmount||0)>0)&&(Number(b.pendingAmount||0)>0));
  if (payF==='paid') bks=bks.filter(b=>Number(b.pendingAmount||0)<=0);

  // Populate agent filter
  const agentSel = document.getElementById('bk-agent-filter');
  if (agentSel) { const cur=agentSel.value; const agents=[...new Set(hScoped('bookings').map(b=>b.agent).filter(Boolean))]; agentSel.innerHTML='<option value="">All Agents</option>'+agents.map(a=>'<option value="'+a+'" '+(cur===a?'selected':'')+'>'+a+'</option>').join(''); }

  if (bkUrgencySort) bks = bks.slice().sort((a, bk) => {
    const da = a.travelDate ? new Date(a.travelDate) : new Date('9999-12-31');
    const db = bk.travelDate ? new Date(bk.travelDate) : new Date('9999-12-31');
    return da - db;
  });
  const tbody = document.getElementById('bookings-tbody'); if(!tbody) return;
  if (!bks.length) { tbody.innerHTML = emptyRow(12,'No bookings found. Bookings are created from accepted quotations.'); return; }

  const STATUS_PILL = {
    pending_finance:'<span class="pill pill-amb">💳 Finance Review</span>',
    finance_approved:'<span class="pill pill-blue">✔ Finance OK</span>',
    ops_pending:'<span class="pill pill-gold">⚙ Ops Pending</span>',
    pending:'<span class="pill pill-amb">⏳ Pending</span>',
    confirmed:'<span class="pill pill-green">✅ Confirmed</span>',
    completed:'<span class="pill pill-blue">🏁 Completed</span>',
    cancelled:'<span class="pill pill-red">❌ Cancelled</span>'
  };
  tbody.innerHTML = bks.map(b => {
    const total = Number(b.totalAmount||0);
    const paid = Number(b.advancePaid||b.paidAmount||0);
    const pending = Number(b.pendingAmount||0);
    const payPct = total>0 ? Math.round(paid/total*100) : 0;
    const payColor = payPct>=100?'var(--g500)':payPct>0?'var(--amb)':'var(--red)';
    return '<tr>'+
      '<td><span style="font-family:JetBrains Mono,monospace;font-size:11.5px;font-weight:600;color:var(--g700)">'+(b.ref||'—')+'</span>'+(b.quotationId?'<div style="font-size:9px;color:var(--textd)">from '+b.quotationId+'</div>':'')+'</td>'+
      '<td><div style="font-weight:600">'+b.customerName+'</div><div style="font-size:10.5px;color:var(--textd)">'+(b.customerPhone||'')+'</div></td>'+
      '<td>'+b.destination+'<br><span style="font-size:10px;color:var(--textd)">'+(b.tripType==='international'?'✈️ Intl':'🇮🇳 Dom')+'</span></td>'+
      '<td>'+(b.travelDate?formatDate(b.travelDate):'—')+_deptBadge(b.travelDate)+'</td>'+
      '<td style="text-align:center">'+(b.pax||'—')+'</td>'+
      '<td style="font-weight:600">'+formatMoney(total)+'</td>'+
      '<td style="color:var(--g600);font-weight:600">'+formatMoney(paid)+'</td>'+
      '<td style="color:'+(pending>0?'var(--red)':'var(--g600)')+';font-weight:700">'+formatMoney(pending)+'</td>'+
      '<td>'+(b.profit?'<div style="font-size:11px;font-weight:600;color:var(--g700)">'+formatMoney(b.profit)+'</div>':'<span style="font-size:10px;color:var(--textd)">—</span>')+'</td>'+
      '<td>'+(STATUS_PILL[b.status]||'')+'</td>'+
      '<td><div style="width:50px;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+payPct+'%;background:'+payColor+';border-radius:3px"></div></div><div style="font-size:9px;color:var(--textd);margin-top:2px">'+payPct+'% paid</div></td>'+
      '<td style="white-space:nowrap">'+
        '<button class="row-btn" onclick="viewBooking(\''+b.id+'\')">View</button>'+
        (['pending','pending_finance','finance_approved','ops_pending'].includes(b.status)?'<button class="row-btn" style="margin-left:3px;background:var(--g50);color:var(--g700);border-color:var(--g300)" onclick="recordPayment(\''+b.id+'\')">💰 Pay</button>':'')+
        (BK_WORKFLOW[b.status]?'<button class="row-btn" style="margin-left:3px;background:var(--blue2);color:var(--blue);border-color:var(--blue)" onclick="advanceBookingStatus(\''+b.id+'\')">'+(BK_WORKFLOW[b.status]?.label||'→')+'</button>':'')+
      '</td></tr>';
  }).join('');
}

function filterBookings(f,el) { document.querySelectorAll('.page .chip').forEach(c=>c.classList.remove('active')); if(el)el.classList.add('active'); renderBookings(f); }

// ══════ VIEW BOOKING ══════
function viewBooking(id) {
  const b = DB.bookings.find(x=>x.id===id); if(!b) return;
  const total=Number(b.totalAmount||0); const paid=Number(b.advancePaid||b.paidAmount||0); const pending=Number(b.pendingAmount||0);
  const STATUS_LABEL = {pending:'⏳ Awaiting Payment',confirmed:'✅ Confirmed',completed:'🏁 Completed',cancelled:'❌ Cancelled'};
  document.getElementById('vb-title').textContent = b.ref + ' — ' + b.customerName;
  document.getElementById('vb-body').innerHTML = 
    '<div style="background:linear-gradient(135deg,var(--g800),var(--g600));border-radius:12px;padding:18px;color:#fff;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">'+
      '<div><div style="font-size:18px;font-weight:800;font-family:DM Serif Display,serif">'+b.customerName+'</div><div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px">'+b.destination+' · '+(b.pax||'')+'pax · '+(b.travelDate?formatDate(b.travelDate):'')+'</div></div>'+
      '<div style="text-align:right"><div style="font-size:12px;color:rgba(255,255,255,.5)">'+b.ref+'</div><div style="font-size:14px;font-weight:700;margin-top:4px">'+(STATUS_LABEL[b.status]||b.status)+'</div></div>'+
    '</div>'+
    '<div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">'+
      '<div class="stat-card"><div class="stat-label">Package Amount</div><div class="stat-val" style="font-size:18px">'+formatMoney(total)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Paid</div><div class="stat-val stat-up" style="font-size:18px">'+formatMoney(paid)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Balance</div><div class="stat-val '+(pending>0?'stat-dn':'')+'" style="font-size:18px">'+formatMoney(pending)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Profit</div><div class="stat-val stat-up" style="font-size:18px">'+(b.profit?formatMoney(b.profit):'—')+'</div></div>'+
    '</div>'+
    (function(){
      var pkg = b.packageId ? (DB.packages||[]).find(function(p){return p.id===b.packageId;}) : null;
      return '<div class="form-grid" style="margin-bottom:14px">'+
        '<div><div class="form-label">Phone</div><div style="font-size:13px;margin-top:4px">'+(b.customerPhone||'—')+'</div></div>'+
        '<div><div class="form-label">Email</div><div style="font-size:13px;margin-top:4px">'+(b.customerEmail||'—')+'</div></div>'+
        '<div><div class="form-label">Agent</div><div style="font-size:13px;margin-top:4px">'+(b.agent||'—')+'</div></div>'+
        '<div><div class="form-label">Quotation</div><div style="font-size:13px;margin-top:4px">'+(b.quotationId||'Direct')+'</div></div>'+
        (pkg ? '<div style="grid-column:1/-1"><div class="form-label">📦 Package</div><div style="margin-top:4px;display:flex;align-items:center;gap:8px"><span style="font-size:13px;font-weight:600;color:var(--g700)">'+pkg.name+'</span><span style="font-size:11px;color:var(--textd)">'+pkg.destination+(pkg.nights?' · '+pkg.nights+'N/'+pkg.days+'D':'')+'</span></div></div>' : '')+
      '</div>';
    })()+
    (b.status==='pending'?
      '<div class="form-section">Record Payment</div>'+
      '<div class="form-grid" style="margin-bottom:14px">'+
        '<div class="form-group"><label class="form-label">Payment Amount (₹)</label><input class="form-input" type="number" id="vb-pay-amt" value="'+pending+'" max="'+pending+'"></div>'+
        '<div class="form-group"><label class="form-label">Payment Method</label><select class="form-select" id="vb-pay-method"><option>Bank Transfer</option><option>UPI</option><option>Cash</option><option>Cheque</option><option>Card</option></select></div>'+
        '<div class="form-group"><label class="form-label">Payment Date</label><input class="form-input" type="date" id="vb-pay-date" value="'+today()+'"></div>'+
        '<div class="form-group"><label class="form-label">Reference / Note</label><input class="form-input" id="vb-pay-ref" placeholder="Transaction ID..."></div>'+
      '</div>'+
      '<button class="btn btn-primary" onclick="submitPayment(\''+b.id+'\')">💰 Record Payment</button>'
    :'')+
    (b.status==='pending'?
      '<div class="form-section" style="margin-top:18px">Set Profit (Cost Basis)</div>'+
      '<div class="form-grid">'+
        '<div class="form-group"><label class="form-label">Actual Cost (₹)</label><input class="form-input" type="number" id="vb-cost" value="'+(b.cost||'')+'" placeholder="Your cost for this trip" oninput="previewProfit(\''+b.id+'\')"></div>'+
        '<div class="form-group"><label class="form-label">Profit (₹)</label><input class="form-input" id="vb-profit-preview" readonly style="background:var(--cream);font-weight:700;color:var(--g700)" value="'+(b.profit?formatMoney(b.profit):'Enter cost to see profit')+'"></div>'+
      '</div>'+
      '<button class="btn btn-sm btn-green" style="margin-top:8px" onclick="saveCostProfit(\''+b.id+'\')">Save Cost & Profit</button>'
    :'')+
  '<div class="form-section" style="margin-top:14px">📎 Travel Documents</div>'+
  '<div id="vb-attach-list">'+_renderBookingAttachments(b)+'</div>'+
  '<label class="btn btn-sm btn-outline" style="cursor:pointer;display:inline-block;margin-top:6px">'+
    '<input type="file" style="display:none" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onchange="uploadBookingFiles(\''+b.id+'\',this)">'+
    '📎 Attach Documents</label>'+
  '<div id="vb-upload-progress" style="display:none;font-size:11px;color:var(--g600);margin-top:4px"></div>';
  document.getElementById('modal-view-booking')._bookingId = id;
  openModal('modal-view-booking');
}

function viewBookingInvoice(bookingId) {
  const existing = (DB.invoices||[]).find(i => i.bookingId === bookingId);
  if (existing) {
    closeModal('modal-view-booking');
    goTo('invoices');
  } else {
    if (!confirm('No invoice exists for this booking. Generate one now?')) return;
    if (typeof autoGenerateInvoices === 'function') autoGenerateInvoices();
    saveDB();
    closeModal('modal-view-booking');
    goTo('invoices');
  }
}

function previewProfit(id) {
  const b = DB.bookings.find(x=>x.id===id); if(!b) return;
  const cost = parseFloat(document.getElementById('vb-cost').value)||0;
  const profit = Number(b.totalAmount||0) - cost;
  document.getElementById('vb-profit-preview').value = profit > 0 ? formatMoney(profit) : '₹0 (no profit)';
}

function saveCostProfit(id) {
  const b = DB.bookings.find(x=>x.id===id); if(!b) return;
  const cost = parseFloat(document.getElementById('vb-cost').value)||0;
  b.cost = cost;
  b.profit = Math.max(0, Number(b.totalAmount||0) - cost);
  saveDB(); showToast('Profit set: '+formatMoney(b.profit));
  viewBooking(id); renderBookings();
}

function submitPayment(id) {
  const b = DB.bookings.find(x=>x.id===id); if(!b) return;
  const amount = parseFloat(document.getElementById('vb-pay-amt').value)||0;
  if (amount <= 0) { showToast('Enter payment amount','error'); return; }
  const method = document.getElementById('vb-pay-method').value;
  const date = document.getElementById('vb-pay-date').value || today();
  const ref = document.getElementById('vb-pay-ref').value;

  // Update booking
  b.advancePaid = (Number(b.advancePaid||b.paidAmount||0)) + amount;
  b.paidAmount = b.advancePaid;
  b.pendingAmount = Math.max(0, Number(b.totalAmount||0) - b.advancePaid);

  // Record payment
  if (!Array.isArray(DB.payments)) DB.payments = [];
  const receipt = 'RCP-'+String((DB.counters.payments=(DB.counters.payments||0)+1)).padStart(4,'0');
  DB.payments.unshift({
    id: uid(), receipt, bookingId: b.id, bookingRef: b.ref, customerName: b.customerName,
    amount, method, date, reference: ref, status: 'completed',
    officeId: b.officeId, createdBy: createdByStamp(), createdAt: new Date().toISOString()
  });
  // Auto-confirm if fully paid
  if (b.pendingAmount <= 0 && PENDING_STATUSES.includes(b.status)) {
    b.status = 'confirmed';
    b.confirmedAt = new Date().toISOString();
    logActivity('Booking '+b.ref+' confirmed — fully paid', 'booking');
    showToast('Payment received! Booking '+b.ref+' is now CONFIRMED! ✅');
  } else {
    showToast('Payment of '+formatMoney(amount)+' recorded for '+b.ref);
  }

  saveDB(); closeModal('modal-view-booking'); renderBookings();
}

function confirmBooking(id) {
  const b = DB.bookings.find(x=>x.id===id); if(!b) return;
  if (!confirm('Manually confirm booking '+b.ref+'?')) return;
  const wasNotConfirmed = b.status !== 'confirmed';
  b.status = 'confirmed'; b.confirmedAt = new Date().toISOString();
  // Update customer bookingsCount if not already counted
  if (wasNotConfirmed && !b._custCountedAt) {
    const cust = (DB.customers||[]).find(c => c.id === b.customerId || c.phone === b.customerPhone);
    if (cust) cust.bookingsCount = (cust.bookingsCount || 0) + 1;
    b._custCountedAt = new Date().toISOString();
  }
  saveDB(); renderBookings(); showToast(b.ref+' confirmed!');
  logActivity('Booking '+b.ref+' manually confirmed', 'booking');
}

function advanceBookingStatus(id) {
  const b = DB.bookings.find(x=>x.id===id); if(!b) return;
  const step = BK_WORKFLOW[b.status]; if(!step) return;
  if (!confirm(step.label+' for '+b.ref+'?')) return;
  b.status = step.next;
  if (step.next === 'confirmed') b.confirmedAt = new Date().toISOString();
  saveDB(); renderBookings(); showToast(b.ref+' → '+step.next);
  logActivity('Booking '+b.ref+' status: '+step.next, 'booking');
}
window.advanceBookingStatus = advanceBookingStatus;

function recordPayment(id) { viewBooking(id); }

// ══════ TIMELINE ══════
function renderBkTimeline() {
  const month = document.getElementById('bk-tl-month')?.value;
  let bks = hScoped('bookings').filter(b=>b.travelDate&&b.status!=='cancelled');
  if (month) bks = bks.filter(b=>b.travelDate.startsWith(month));
  bks.sort((a,b)=>a.travelDate.localeCompare(b.travelDate));
  const grid = document.getElementById('bk-timeline-grid'); if(!grid) return;
  if (!bks.length) { grid.innerHTML='<div style="text-align:center;padding:40px;color:var(--textd)">No departures found for this period</div>'; return; }
  const statusColor = {confirmed:'var(--g400)',pending:'var(--amb)',completed:'var(--blue)'};
  grid.innerHTML = bks.map(b => {
    const daysTo = Math.ceil((new Date(b.travelDate)-new Date(today()))/86400000);
    const urgent = daysTo >= 0 && daysTo <= 3;
    return '<div style="display:flex;gap:14px;padding:12px 0;border-bottom:1px solid var(--border);align-items:center">'+
      '<div style="width:50px;text-align:center;flex-shrink:0"><div style="font-size:18px;font-weight:800;color:var(--text)">'+new Date(b.travelDate).getDate()+'</div><div style="font-size:10px;color:var(--textd)">'+new Date(b.travelDate).toLocaleDateString('en-IN',{month:'short'})+'</div></div>'+
      '<div style="width:4px;border-radius:2px;background:'+(statusColor[b.status]||'var(--border)')+';flex-shrink:0;align-self:stretch"></div>'+
      '<div style="flex:1"><div style="font-weight:600;font-size:13px">'+b.customerName+(urgent?' <span style="background:var(--red);color:#fff;font-size:9px;font-weight:700;padding:1px 6px;border-radius:6px">URGENT</span>':'')+'</div><div style="font-size:11px;color:var(--textd);margin-top:2px">'+b.destination+' · '+b.ref+' · '+(b.pax||'')+'pax</div></div>'+
      '<div style="text-align:right"><div style="font-weight:600">'+formatMoney(b.totalAmount)+'</div>'+stagePill(b.status)+'</div>'+
    '</div>';
  }).join('');
}

// ══════ KANBAN ══════
function renderBkKanban() {
  const statuses = ['pending','confirmed','completed','cancelled'];
  const labels = {pending:'⏳ Pending Payment',confirmed:'✅ Confirmed',completed:'🏁 Completed',cancelled:'❌ Cancelled'};
  const colors = {pending:'var(--amb)',confirmed:'var(--g500)',completed:'var(--blue)',cancelled:'var(--red)'};
  const board = document.getElementById('bk-kanban-board'); if(!board) return;
  board.innerHTML = statuses.map(s => {
    const bks = hScoped('bookings').filter(b=>b.status===s);
    return '<div class="kanban-col"><div class="kanban-col-head">'+labels[s]+' <span class="nav-badge" style="position:static;background:'+colors[s]+'">'+bks.length+'</span></div>'+
      bks.map(b=>'<div class="kanban-card" onclick="viewBooking(\''+b.id+'\')"><div class="kc-name">'+b.customerName+'</div><div class="kc-dest">'+b.destination+' · '+b.ref+'</div><div class="kc-meta"><span>'+formatMoney(b.totalAmount)+'</span><span>'+(b.travelDate?formatDate(b.travelDate):'—')+'</span></div></div>').join('')+
      (!bks.length?'<div style="text-align:center;padding:20px;color:var(--textd);font-size:11px">Empty</div>':'')+
    '</div>';
  }).join('');
}

function switchBkTab(el, contentId) { switchTab(el, contentId); if(contentId==='bk-timeline') renderBkTimeline(); if(contentId==='bk-kanban') renderBkKanban(); }


// ── Travel Document Attachments ──
function _renderBookingAttachments(b) {
  const files = b.attachments || [];
  if (!files.length) return '<div style="font-size:12px;color:var(--textd);padding:4px 0 8px">No documents attached yet. Upload flight tickets, hotel vouchers, visa copies…</div>';
  return files.map((f, i) => {
    const icons = { 'application/pdf':'📄', 'image/jpeg':'🖼', 'image/png':'🖼', 'image/jpg':'🖼' };
    const ico = icons[f.type] || '📎';
    const kb = f.size ? (f.size > 1048576 ? (f.size/1048576).toFixed(1)+' MB' : Math.round(f.size/1024)+' KB') : '';
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--cream);border-radius:8px;margin-bottom:4px">'+
      '<span>'+ico+'</span>'+
      '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+f.name+'</div><div style="font-size:10px;color:var(--textd)">'+kb+(kb&&f.uploadedAt?' · ':'')+( f.uploadedAt?formatDate(f.uploadedAt):'')+'</div></div>'+
      '<a href="'+f.url+'" target="_blank" rel="noopener" style="font-size:11px;color:var(--g700);font-weight:600;text-decoration:none;white-space:nowrap">⬇ View</a>'+
      '<button onclick="deleteBookingFile(\''+b.id+'\','+i+')" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:16px;padding:0 4px;line-height:1">×</button>'+
    '</div>';
  }).join('');
}

async function uploadBookingFiles(bookingId, input) {
  if (!input.files.length) return;
  if (typeof fsUploadFile !== 'function') { showToast('Storage not available', 'error'); return; }
  const b = DB.bookings.find(x => x.id === bookingId);
  if (!b) return;
  if (!b.attachments) b.attachments = [];
  const prog = document.getElementById('vb-upload-progress');
  if (prog) prog.style.display = 'block';
  for (const file of Array.from(input.files)) {
    try {
      if (prog) prog.textContent = 'Uploading '+file.name+'…';
      const path = 'bookings/'+bookingId+'/'+Date.now()+'_'+file.name.replace(/\s+/g,'_');
      const url = await fsUploadFile(path, file, pct => { if (prog) prog.textContent = file.name+' — '+pct+'%'; });
      b.attachments.push({ name: file.name, url, size: file.size, type: file.type, path, uploadedAt: new Date().toISOString(), uploadedBy: (window.currentUser&&window.currentUser.name)||'User' });
    } catch(e) { showToast('Upload failed: '+file.name, 'error'); }
  }
  saveDB();
  if (prog) prog.style.display = 'none';
  viewBooking(bookingId);
}

function deleteBookingFile(bookingId, idx) {
  const b = DB.bookings.find(x => x.id === bookingId);
  if (!b || !b.attachments) return;
  if (!confirm('Remove this document?')) return;
  const f = b.attachments[idx];
  if (f && f.path && typeof fsDeleteFile === 'function') fsDeleteFile(f.path).catch(() => {});
  b.attachments.splice(idx, 1);
  saveDB();
  viewBooking(bookingId);
}

window.renderBookings=renderBookings;window.filterBookings=filterBookings;window.toggleBkUrgencySort=toggleBkUrgencySort;
window.viewBooking=viewBooking;window.recordPayment=recordPayment;window.confirmBooking=confirmBooking;window.viewBookingInvoice=viewBookingInvoice;
window.submitPayment=submitPayment;window.previewProfit=previewProfit;window.saveCostProfit=saveCostProfit;
window.renderBkTimeline=renderBkTimeline;window.renderBkKanban=renderBkKanban;window.switchBkTab=switchBkTab;
window.uploadBookingFiles=uploadBookingFiles;window.deleteBookingFile=deleteBookingFile;

initPage(renderBookings);
