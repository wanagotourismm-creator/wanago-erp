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

let payFilter = 'all';
const PAY_METHOD_META = {
  upi:{label:'UPI',emoji:'📱',color:'var(--blue)',bg:'var(--blue2)'},
  'Bank Transfer':{label:'Bank Transfer',emoji:'🏦',color:'var(--g600)',bg:'var(--g50)'},
  bank_transfer:{label:'Bank Transfer',emoji:'🏦',color:'var(--g600)',bg:'var(--g50)'},
  Cash:{label:'Cash',emoji:'💵',color:'var(--amb)',bg:'var(--amb2)'},
  cash:{label:'Cash',emoji:'💵',color:'var(--amb)',bg:'var(--amb2)'},
  Cheque:{label:'Cheque',emoji:'📋',color:'var(--textm)',bg:'var(--cream2)'},
  cheque:{label:'Cheque',emoji:'📋',color:'var(--textm)',bg:'var(--cream2)'},
  Card:{label:'Card',emoji:'💳',color:'#7c3aed',bg:'#f5f3ff'},
  card:{label:'Card',emoji:'💳',color:'#7c3aed',bg:'#f5f3ff'},
  UPI:{label:'UPI',emoji:'📱',color:'var(--blue)',bg:'var(--blue2)'},
};

function renderCollectionRadar() {
  const el = document.getElementById('pay-collection-radar');
  if (!el) return;
  const bookings = hScoped('bookings');
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const pending = bookings.filter(b => b.status !== 'cancelled' && Number(b.pendingAmount||0) > 0);
  if (!pending.length) { el.style.display = 'none'; return; }
  el.style.display = '';

  const scored = pending.map(b => {
    const days = b.travelDate ? Math.ceil((new Date(b.travelDate) - todayDate) / 86400000) : 999;
    const mul = days < 0 ? 5 : days <= 3 ? 4 : days <= 7 ? 3 : days <= 14 ? 2 : 1;
    return { ...b, _days: days, _score: Number(b.pendingAmount) * mul };
  });
  scored.sort((a, b) => b._score - a._score);
  const top5 = scored.slice(0, 5);
  const totalPending = pending.reduce((s, b) => s + Number(b.pendingAmount||0), 0);
  const companyName = (DB.settings||{}).companyName || 'Wanago';

  const cards = top5.map(b => {
    const days = b._days;
    let badge, badgeStyle;
    if (days < 0) { badge = 'Departed'; badgeStyle = 'background:#fee2e2;color:#dc2626'; }
    else if (days === 0) { badge = 'Today!'; badgeStyle = 'background:#dc2626;color:#fff'; }
    else if (days === 1) { badge = 'Tomorrow'; badgeStyle = 'background:#f97316;color:#fff'; }
    else if (days <= 7) { badge = 'In '+days+'d'; badgeStyle = 'background:#f59e0b;color:#fff'; }
    else if (days <= 14) { badge = 'In '+days+'d'; badgeStyle = 'background:var(--blue2);color:var(--blue)'; }
    else { badge = b.travelDate ? formatDate(b.travelDate) : '—'; badgeStyle = 'background:var(--cream2);color:var(--textd)'; }

    const cust = (DB.customers||[]).find(c => c.id === b.customerId || c.name === b.customerName);
    const phone = ((cust&&cust.phone)||b.customerPhone||'').replace(/\D/g,'').replace(/^0/,'91');
    const travelFmt = b.travelDate ? formatDate(b.travelDate) : 'your travel date';
    const msg = 'Dear '+b.customerName+', this is a gentle reminder from '+companyName+' regarding your upcoming trip to '+(b.destination||'your destination')+' on '+travelFmt+'. You have a balance of ₹'+Number(b.pendingAmount).toLocaleString('en-IN')+' pending. Kindly complete your payment at the earliest. Booking Ref: '+(b.ref||'—')+'.';
    const waBtn = phone ? '<a href="https://wa.me/'+phone+'?text='+encodeURIComponent(msg)+'" target="_blank" title="Send WhatsApp reminder" style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:8px;background:#dcfce7;color:#16a34a;text-decoration:none;flex-shrink:0;font-size:17px">💬</a>' : '';
    return '<div style="background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:11px 14px;display:flex;align-items:center;gap:12px">'+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:3px">'+
          '<div style="font-weight:700;font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">'+b.customerName+'</div>'+
          '<span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;white-space:nowrap;'+badgeStyle+'">'+badge+'</span>'+
        '</div>'+
        '<div style="font-size:11px;color:var(--textd)">'+(b.destination||'—')+' · '+(b.ref||'—')+'</div>'+
      '</div>'+
      '<div style="text-align:right;flex-shrink:0;margin-right:4px">'+
        '<div style="font-size:15px;font-weight:800;color:var(--red)">₹'+Number(b.pendingAmount).toLocaleString('en-IN')+'</div>'+
        '<div style="font-size:10px;color:var(--textd)">due</div>'+
      '</div>'+
      waBtn+
    '</div>';
  }).join('');

  el.innerHTML = '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--sh)">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
      '<div style="font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px">🎯 Collection Radar '+
        '<span style="font-size:11px;font-weight:500;color:var(--textd)">'+pending.length+' booking'+(pending.length!==1?'s':'')+' with pending dues · top '+top5.length+' by urgency</span>'+
      '</div>'+
      '<div style="font-size:14px;font-weight:800;color:var(--red)">₹'+totalPending.toLocaleString('en-IN')+' total</div>'+
    '</div>'+
    '<div style="display:grid;gap:7px">'+cards+'</div>'+
  '</div>';
}

function renderPayments(filter) {
  if (filter) payFilter = filter;
  const allPays = hScoped('payments');

  // Stats
  const totalAmt = allPays.filter(p=>p.status==='completed').reduce((s,p)=>s+Number(p.amount||0),0);
  const todayStr = today();
  const todayAmt = allPays.filter(p=>p.status==='completed'&&p.date===todayStr).reduce((s,p)=>s+Number(p.amount||0),0);
  const pendingDues = hScoped('bookings').filter(b=>b.status!=='cancelled').reduce((s,b)=>s+Number(b.pendingAmount||0),0);
  const thisMonth = new Date().toISOString().slice(0,7);
  const monthAmt = allPays.filter(p=>p.status==='completed'&&(p.date||'').startsWith(thisMonth)).reduce((s,p)=>s+Number(p.amount||0),0);

  const strip = document.getElementById('pay-strip');
  if (strip) strip.innerHTML = [
    {label:'💰 Total Collected',val:formatMoney(totalAmt),meta:allPays.length+' transactions',cls:''},
    {label:'📅 Today',val:formatMoney(todayAmt),meta:'received today',cls:'stat-up'},
    {label:'📊 This Month',val:formatMoney(monthAmt),meta:new Date().toLocaleDateString('en-IN',{month:'long'}),cls:'stat-up'},
    {label:'⚠️ Pending Dues',val:formatMoney(pendingDues),meta:'balance outstanding',cls:'stat-dn'},
  ].map(s=>'<div class="stat-card" style="cursor:pointer"><div class="stat-label">'+s.label+'</div><div class="stat-val '+s.cls+'">'+s.val+'</div><div class="stat-meta">'+s.meta+'</div></div>').join('');

  renderCollectionRadar();

  // Method breakdown cards
  const methodCards = document.getElementById('pay-method-cards');
  if (methodCards) {
    const methods = ['UPI','Bank Transfer','Cash','Cheque','Card'];
    methodCards.innerHTML = methods.map(key => {
      const m = PAY_METHOD_META[key] || {label:key,emoji:'💰',color:'var(--textd)',bg:'var(--cream)'};
      const mAmt = allPays.filter(p=>(p.method||'')=== key && p.status==='completed').reduce((s,p)=>s+Number(p.amount||0),0);
      const mCount = allPays.filter(p=>(p.method||'')===key).length;
      const pct = totalAmt > 0 ? Math.round((mAmt/totalAmt)*100) : 0;
      return '<div onclick="filterPayments(\''+key+'\',this)" style="background:var(--white);border:1px solid var(--border);border-radius:12px;padding:14px 16px;cursor:pointer;transition:.2s;position:relative;overflow:hidden" onmouseover="this.style.boxShadow=\'var(--sh2)\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.boxShadow=\'\';this.style.transform=\'\'"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px"><span style="font-size:18px">'+m.emoji+'</span><span style="font-size:10px;font-weight:700;color:'+m.color+';background:'+m.bg+';padding:2px 8px;border-radius:10px">'+pct+'%</span></div><div style="font-size:13px;font-weight:700;color:var(--text)">'+formatMoney(mAmt)+'</div><div style="font-size:10px;color:var(--textd);margin-top:2px">'+m.label+' · '+mCount+' txn'+(mCount!==1?'s':'')+'</div><div style="position:absolute;bottom:0;left:0;width:'+pct+'%;height:3px;background:'+m.color+';border-radius:0 2px 2px 0;transition:.4s"></div></div>';
    }).join('');
  }

  // Filter + search + sort
  let pays = [...allPays];
  if (payFilter !== 'all') pays = pays.filter(p => (p.method||'') === payFilter);
  const q = (document.getElementById('pay-search')?.value||'').toLowerCase();
  if (q) pays = pays.filter(p=>(p.receipt||'').toLowerCase().includes(q)||(p.bookingRef||'').toLowerCase().includes(q)||(p.customerName||'').toLowerCase().includes(q)||(p.reference||'').toLowerCase().includes(q));
  const df = document.getElementById('pay-date-from')?.value;
  const dt = document.getElementById('pay-date-to')?.value;
  if (df) pays = pays.filter(p=>(p.date||'')>=df);
  if (dt) pays = pays.filter(p=>(p.date||'')<=dt);
  const sort = document.getElementById('pay-sort')?.value||'newest';
  if (sort==='oldest') pays.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  else if (sort==='newest') pays.sort((a,b)=>(b.date||b.createdAt||'').localeCompare(a.date||a.createdAt||''));
  else if (sort==='amount-desc') pays.sort((a,b)=>Number(b.amount)-Number(a.amount));
  else if (sort==='amount-asc') pays.sort((a,b)=>Number(a.amount)-Number(b.amount));

  // Table
  const tbody = document.getElementById('payments-tbody'); if(!tbody) return;
  if (!pays.length) { tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:48px;color:var(--textd)"><div style="font-size:32px;margin-bottom:10px">💳</div><div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">No payments found</div><div style="font-size:12px">Payments are recorded from the Bookings page</div></td></tr>'; return; }

  tbody.innerHTML = pays.map(p => {
    const m = PAY_METHOD_META[p.method] || {label:p.method||'Other',emoji:'💰',color:'var(--textd)',bg:'var(--cream)'};
    return '<tr>'+
      '<td><span style="font-family:JetBrains Mono,monospace;font-size:11px;font-weight:600;color:var(--g700)">'+(p.receipt||p.id?.slice(-6)||'—')+'</span></td>'+
      '<td style="font-family:JetBrains Mono,monospace;font-size:12px">'+(p.bookingRef||'—')+'</td>'+
      '<td><div style="font-weight:600">'+(p.customerName||'—')+'</div></td>'+
      '<td><div style="font-weight:700;font-size:14px;color:var(--g700)">'+formatMoney(p.amount)+'</div></td>'+
      '<td><span style="display:inline-flex;align-items:center;gap:4px;background:'+m.bg+';color:'+m.color+';border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600">'+m.emoji+' '+m.label+'</span></td>'+
      '<td style="font-size:11.5px;color:var(--textd);max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(p.reference||p.ref||'—')+'</td>'+
      '<td style="font-size:12px">'+formatDate(p.date)+'</td>'+
      '<td>'+stagePill(p.status||'completed')+'</td>'+
      '<td><button class="row-btn" onclick="viewPayReceipt(\''+p.id+'\')">🧾 Receipt</button></td>'+
    '</tr>';
  }).join('');
}

function filterPayments(f, el) { document.querySelectorAll('.page .chip').forEach(c=>c.classList.remove('active')); payFilter=f; if(el&&el.classList) el.classList.add('active'); renderPayments(); }
function clearPayDateFilter() { const df=document.getElementById('pay-date-from'); const dt=document.getElementById('pay-date-to'); if(df)df.value=''; if(dt)dt.value=''; renderPayments(); }

// Receipt drawer
function viewPayReceipt(payId) {
  const p = DB.payments.find(x=>x.id===payId); if(!p) return;
  const m = PAY_METHOD_META[p.method]||{label:p.method||'Other',emoji:'💰',color:'var(--g700)',bg:'var(--cream)'};
  const bk = DB.bookings.find(b=>b.id===p.bookingId);
  const s = DB.settings;
  document.getElementById('pay-drawer').innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px"><div style="font-size:18px;font-weight:800;color:var(--g800)">🧾 Payment Receipt</div><button onclick="closePayDrawer()" style="background:var(--cream2);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;font-size:16px;line-height:1">✕</button></div>'+
    '<div style="background:linear-gradient(135deg,var(--g800),var(--g600));border-radius:12px;padding:18px;color:#fff;margin-bottom:16px;text-align:center"><div style="font-size:28px;font-weight:900;font-family:DM Serif Display,serif">'+formatMoney(p.amount)+'</div><div style="font-size:12px;color:rgba(255,255,255,.6);margin-top:4px">'+m.emoji+' '+m.label+' · '+formatDate(p.date)+'</div><div style="margin-top:8px">'+stagePill(p.status||'completed')+'</div></div>'+
    '<div style="display:grid;gap:12px;margin-bottom:16px">'+
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--textd)">Receipt #</span><span style="font-size:12px;font-weight:600">'+(p.receipt||p.id?.slice(-8)||'—')+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--textd)">Booking Ref</span><span style="font-size:12px;font-weight:600">'+(p.bookingRef||'—')+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--textd)">Customer</span><span style="font-size:12px;font-weight:600">'+(p.customerName||'—')+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--textd)">Reference</span><span style="font-size:12px;font-weight:600">'+(p.reference||p.ref||'—')+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border)"><span style="font-size:12px;color:var(--textd)">Date & Time</span><span style="font-size:12px;font-weight:600">'+formatDate(p.date)+' '+(p.createdAt?new Date(p.createdAt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}):'')+'</span></div>'+
    '</div>'+
    (bk?'<div style="background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:16px"><div style="font-size:10px;font-weight:700;color:var(--textd);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Booking Details</div><div style="font-size:13px;font-weight:600">'+bk.customerName+' → '+bk.destination+'</div><div style="font-size:11px;color:var(--textd);margin-top:4px">Total: '+formatMoney(bk.totalAmount)+' · Paid: '+formatMoney(bk.advancePaid||bk.paidAmount||0)+' · Balance: '+formatMoney(bk.pendingAmount||0)+'</div></div>':'')+
    '<div style="display:flex;gap:8px"><button class="btn btn-primary" style="flex:1" onclick="printReceipt(\''+p.id+'\')">🖨 Print Receipt</button></div>';
  document.getElementById('pay-drawer-overlay').style.display = '';
  document.getElementById('pay-drawer').style.display = '';
}

function closePayDrawer() { document.getElementById('pay-drawer-overlay').style.display='none'; document.getElementById('pay-drawer').style.display='none'; }

function printReceipt(payId) {
  const p = DB.payments.find(x=>x.id===payId); if(!p) return;
  const s = DB.settings;
  const m = PAY_METHOD_META[p.method]||{label:p.method||'Other'};
  const html = '<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:30px"><div style="text-align:center;margin-bottom:20px"><div style="font-size:20px;font-weight:900;color:#134a32">'+( s.companyName||'Wanago')+'</div><div style="font-size:11px;color:#666;margin-top:4px">'+(s.address||'')+'</div><div style="font-size:11px;color:#666">'+(s.phone||'')+' · '+(s.email||'')+'</div></div><hr style="border:none;border-top:2px solid #134a32;margin:16px 0"><div style="text-align:center;font-size:16px;font-weight:700;margin-bottom:16px">PAYMENT RECEIPT</div><table style="width:100%;border-collapse:collapse;font-size:13px"><tr><td style="padding:8px 0;color:#666">Receipt #</td><td style="padding:8px 0;text-align:right;font-weight:600">'+(p.receipt||p.id?.slice(-8)||'—')+'</td></tr><tr><td style="padding:8px 0;color:#666">Date</td><td style="padding:8px 0;text-align:right">'+formatDate(p.date)+'</td></tr><tr><td style="padding:8px 0;color:#666">Customer</td><td style="padding:8px 0;text-align:right;font-weight:600">'+(p.customerName||'—')+'</td></tr><tr><td style="padding:8px 0;color:#666">Booking Ref</td><td style="padding:8px 0;text-align:right">'+(p.bookingRef||'—')+'</td></tr><tr><td style="padding:8px 0;color:#666">Method</td><td style="padding:8px 0;text-align:right">'+m.label+'</td></tr><tr><td style="padding:8px 0;color:#666">Reference</td><td style="padding:8px 0;text-align:right">'+(p.reference||p.ref||'—')+'</td></tr></table><hr style="border:none;border-top:1px solid #ddd;margin:16px 0"><div style="text-align:center"><div style="font-size:24px;font-weight:900;color:#134a32">'+formatMoney(p.amount)+'</div><div style="font-size:12px;color:#666;margin-top:4px">Payment Received — Thank You!</div></div></div>';
  const w = window.open('','_blank','width=500,height=600');
  if(w) { w.document.write('<html><head><title>Receipt</title></head><body>'+html+'<script>window.print()<\/script></body></html>'); w.document.close(); }
}

// Record payment modal
function openRecordPaymentModal() {
  const OPEN_STATUSES = ['pending','pending_finance','finance_approved','ops_pending'];
  document.getElementById('rp-booking').innerHTML = '<option value="">Select booking</option>' +
    (DB.bookings||[]).filter(b=>OPEN_STATUSES.includes(b.status)&&Number(b.pendingAmount||0)>0).map(b=>'<option value="'+b.id+'">'+b.ref+' — '+b.customerName+' (₹'+Number(b.pendingAmount).toLocaleString('en-IN')+' due)</option>').join('');
  document.getElementById('rp-amount').value = '';
  document.getElementById('rp-method').value = 'Bank Transfer';
  document.getElementById('rp-date').value = today();
  document.getElementById('rp-ref').value = '';
  openModal('modal-record-payment');
}

function onRPBookingChange() {
  const bId = document.getElementById('rp-booking').value;
  const b = DB.bookings.find(x=>x.id===bId);
  if (b) document.getElementById('rp-amount').value = b.pendingAmount || 0;
}

function saveRecordPayment() {
  const bId = document.getElementById('rp-booking').value;
  const amount = parseFloat(document.getElementById('rp-amount').value)||0;
  const method = document.getElementById('rp-method').value;
  const date = document.getElementById('rp-date').value||today();
  const ref = document.getElementById('rp-ref').value;
  if (!bId||!amount) { showError('rp-error','Select a booking and enter amount.'); return; }
  const b = DB.bookings.find(x=>x.id===bId); if(!b) return;

  // Record payment
  const receipt = 'RCP-'+String((DB.counters.payments=(DB.counters.payments||0)+1)).padStart(4,'0');
  DB.payments.unshift({id:uid(),receipt,bookingId:b.id,bookingRef:b.ref,customerName:b.customerName,amount,method,date,reference:ref,status:'completed',officeId:b.officeId,createdBy:createdByStamp(),createdAt:new Date().toISOString()});
  if(typeof dbSave==='function') dbSave('payments', DB.payments[0]).catch(()=>{});

  // Update booking
  b.advancePaid = (Number(b.advancePaid||b.paidAmount||0)) + amount;
  b.paidAmount = b.advancePaid;
  b.pendingAmount = Math.max(0, Number(b.totalAmount||0) - b.advancePaid);
  const OPEN_ST = ['pending','pending_finance','finance_approved','ops_pending'];
  if (b.pendingAmount <= 0 && OPEN_ST.includes(b.status)) {
    b.status = 'confirmed'; b.confirmedAt = new Date().toISOString();
    logActivity('Booking '+b.ref+' confirmed — fully paid','booking');
    showToast('Payment recorded! Booking '+b.ref+' CONFIRMED! ✅');
  } else { showToast('Payment of '+formatMoney(amount)+' recorded!'); }

  // Update customer totalSpent
  const cust = (DB.customers||[]).find(c => c.id === b.customerId || c.name === b.customerName || (b.customerPhone && c.phone === b.customerPhone));
  if (cust) cust.totalSpent = (Number(cust.totalSpent||0)) + amount;

  saveDB(); closeModal('modal-record-payment'); renderPayments();
}


window.renderCollectionRadar=renderCollectionRadar;window.renderPayments=renderPayments;window.filterPayments=filterPayments;
window.clearPayDateFilter=clearPayDateFilter;window.viewPayReceipt=viewPayReceipt;window.closePayDrawer=closePayDrawer;
window.printReceipt=printReceipt;window.openRecordPaymentModal=openRecordPaymentModal;window.onRPBookingChange=onRPBookingChange;
window.saveRecordPayment=saveRecordPayment;

initPage(function() {
  renderPayments();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      renderPayments();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('payments', function() { renderPayments(); });
      }
    }, 5000);
  }
});
