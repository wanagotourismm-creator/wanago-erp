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

let invFilter = 'all';

// Auto-generate invoices from confirmed bookings that don't have one yet
function autoGenerateInvoices() {
  const confirmed = (DB.bookings||[]).filter(b => b.status === 'confirmed' || (Number(b.advancePaid||b.paidAmount||0) > 0));
  confirmed.forEach(b => {
    const existing = DB.invoices.find(i => i.bookingId === b.id);
    if (existing) {
      // Update existing invoice with latest payment data
      existing.amountPaid = Number(b.advancePaid || b.paidAmount || 0);
      existing.amountDue = Math.max(0, Number(existing.grandTotal||0) - existing.amountPaid);
      existing.status = existing.amountDue <= 0 ? 'paid' : (existing.dueDate && new Date(existing.dueDate) < new Date() ? 'overdue' : 'unpaid');
      return;
    }
    if (!DB.counters) DB.counters = {};
    const ref = (DB.settings.invPrefix||'INV') + '-' + String((DB.counters.invoices = (DB.counters.invoices||0)+1)).padStart(4,'0');
    const total = Number(b.totalAmount||0);
    const paid = Number(b.advancePaid||b.paidAmount||0);
    const s = DB.settings;
    const gstAmt = s.gstEnabled ? Math.round(total * (s.gstRate||5) / 100) : 0;
    const grandTotal = total + gstAmt;
    const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
    DB.invoices.unshift({
      id: uid(), ref, bookingId: b.id, bookingRef: b.ref,
      customerName: b.customerName, customerPhone: b.customerPhone, customerEmail: b.customerEmail,
      destination: b.destination, pax: b.pax,
      subtotal: total, gstAmount: gstAmt, discount: Number(b.discount||0),
      grandTotal: grandTotal - Number(b.discount||0),
      amountPaid: paid, amountDue: Math.max(0, grandTotal - Number(b.discount||0) - paid),
      issueDate: today(), dueDate: dueDate.toISOString().slice(0,10),
      status: paid >= grandTotal ? 'paid' : 'unpaid',
      lineItems: [{description: b.destination + (b.packageName ? ' — '+b.packageName : ''), pax: b.pax, total: total}],
      officeId: b.officeId, createdBy: createdByStamp(), createdAt: new Date().toISOString()
    });
  });
  saveDB();
}

function renderInvAIStrip() {
  const el = document.getElementById('inv-ai-strip');
  if (!el) return;
  const allInvs = hScoped('invoices');
  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const overdue = allInvs.filter(i => i.status === 'overdue' && Number(i.amountDue||0) > 0);
  if (!overdue.length) { el.style.display = 'none'; return; }
  el.style.display = '';

  // Aging buckets
  let b1=0,b1a=0, b2=0,b2a=0, b3=0,b3a=0, b4=0,b4a=0;
  const companyName = (DB.settings||{}).companyName || 'Wanago';

  const scored = overdue.map(inv => {
    const days = inv.dueDate ? Math.ceil((todayDate - new Date(inv.dueDate)) / 86400000) : 0;
    if (days <= 7) { b1++; b1a += Number(inv.amountDue||0); }
    else if (days <= 30) { b2++; b2a += Number(inv.amountDue||0); }
    else if (days <= 60) { b3++; b3a += Number(inv.amountDue||0); }
    else { b4++; b4a += Number(inv.amountDue||0); }
    return { ...inv, _days: days, _score: Number(inv.amountDue||0) * Math.max(days, 1) };
  });
  scored.sort((a, b) => b._score - a._score);
  const top5 = scored.slice(0, 5);

  const totalOverdue = overdue.reduce((s, i) => s + Number(i.amountDue||0), 0);

  // Aging bar (max bucket for scaling)
  const maxBktAmt = Math.max(b1a, b2a, b3a, b4a, 1);
  const agingBars = [
    { label:'1–7 days', count:b1, amt:b1a, color:'#f59e0b' },
    { label:'8–30 days', count:b2, amt:b2a, color:'#f97316' },
    { label:'31–60 days', count:b3, amt:b3a, color:'#dc2626' },
    { label:'60+ days', count:b4, amt:b4a, color:'#7f1d1d' },
  ].filter(b => b.count > 0).map(b =>
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">'+
      '<div style="font-size:11px;color:var(--textd);width:70px;flex-shrink:0">'+b.label+'</div>'+
      '<div style="flex:1;height:8px;background:var(--border);border-radius:4px;overflow:hidden">'+
        '<div style="width:'+Math.round((b.amt/maxBktAmt)*100)+'%;height:100%;background:'+b.color+';border-radius:4px;transition:.4s"></div>'+
      '</div>'+
      '<div style="font-size:11px;font-weight:700;color:'+b.color+';width:72px;text-align:right;flex-shrink:0">'+formatMoney(b.amt)+'</div>'+
      '<div style="font-size:10px;color:var(--textd);width:30px;flex-shrink:0">'+b.count+'inv</div>'+
    '</div>'
  ).join('');

  const cards = top5.map(inv => {
    const cust = (DB.customers||[]).find(c => c.id === inv.customerId || c.name === inv.customerName);
    const phone = ((cust&&cust.phone)||inv.customerPhone||'').replace(/\D/g,'').replace(/^0/,'91');
    const msg = 'Dear '+inv.customerName+', your invoice '+inv.ref+' for '+(inv.destination||'your booking')+' amounting to ₹'+Number(inv.amountDue).toLocaleString('en-IN')+' was due on '+formatDate(inv.dueDate)+'. Kindly clear the balance at the earliest. - '+companyName;
    const waBtn = phone ? '<a href="https://wa.me/'+phone+'?text='+encodeURIComponent(msg)+'" target="_blank" title="Send WhatsApp reminder" style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:8px;background:#dcfce7;color:#16a34a;text-decoration:none;flex-shrink:0;font-size:16px">💬</a>' : '';
    const urgColor = inv._days > 60 ? '#7f1d1d' : inv._days > 30 ? '#dc2626' : inv._days > 7 ? '#f97316' : '#f59e0b';
    return '<div style="background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:10px 13px;display:flex;align-items:center;gap:10px">'+
      '<div style="flex:1;min-width:0">'+
        '<div style="display:flex;align-items:center;gap:7px;margin-bottom:2px">'+
          '<div style="font-weight:700;font-size:12.5px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px">'+inv.customerName+'</div>'+
          '<span style="font-size:10px;font-weight:700;padding:1px 7px;border-radius:20px;background:'+urgColor+'20;color:'+urgColor+';white-space:nowrap">+'+inv._days+'d overdue</span>'+
        '</div>'+
        '<div style="font-size:11px;color:var(--textd)">'+inv.ref+' · '+(inv.destination||'—')+'</div>'+
      '</div>'+
      '<div style="text-align:right;flex-shrink:0;margin-right:4px">'+
        '<div style="font-size:14px;font-weight:800;color:var(--red)">₹'+Number(inv.amountDue).toLocaleString('en-IN')+'</div>'+
        '<div style="font-size:10px;color:var(--textd)">due '+formatDate(inv.dueDate)+'</div>'+
      '</div>'+
      waBtn+
    '</div>';
  }).join('');

  el.innerHTML =
    '<div style="background:var(--white);border:1px solid rgba(192,57,43,.2);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--sh)">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
        '<div style="font-size:13px;font-weight:700;color:var(--text);display:flex;align-items:center;gap:8px">🔍 Recovery Radar '+
          '<span style="font-size:11px;font-weight:500;color:var(--textd)">'+overdue.length+' overdue invoice'+(overdue.length!==1?'s':'')+' · top '+top5.length+' by priority</span>'+
        '</div>'+
        '<div style="font-size:14px;font-weight:800;color:var(--red)">₹'+totalOverdue.toLocaleString('en-IN')+' at risk</div>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:200px 1fr;gap:16px;align-items:start">'+
        '<div>'+
          '<div style="font-size:10px;font-weight:700;color:var(--textd);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">Aging Analysis</div>'+
          agingBars+
        '</div>'+
        '<div style="display:grid;gap:7px">'+cards+'</div>'+
      '</div>'+
    '</div>';
}

function renderInvoices(filter) {
  if (filter) invFilter = filter;
  // Mark overdue
  DB.invoices.forEach(inv => { if (inv.status !== 'paid' && inv.dueDate && new Date(inv.dueDate) < new Date()) inv.status = 'overdue'; });

  const allInvs = hScoped('invoices');
  const totalInv = allInvs.reduce((s,i)=>s+Number(i.grandTotal||0),0);
  const totalPaid = allInvs.reduce((s,i)=>s+Number(i.amountPaid||0),0);
  const totalDue = allInvs.reduce((s,i)=>s+Number(i.amountDue||0),0);
  const overdueList = allInvs.filter(i=>i.status==='overdue');
  const overdueAmt = overdueList.reduce((s,i)=>s+Number(i.amountDue||0),0);
  const paidCount = allInvs.filter(i=>i.status==='paid').length;
  const collRate = allInvs.length ? Math.round((paidCount/allInvs.length)*100) : 0;

  const strip = document.getElementById('inv-strip');
  if (strip) strip.innerHTML = [
    {label:'📄 Total Invoiced',val:formatMoney(totalInv),meta:allInvs.length+' invoices'},
    {label:'✅ Collected',val:formatMoney(totalPaid),meta:collRate+'% collection rate',cls:'stat-up'},
    {label:'⏳ Pending',val:formatMoney(totalDue),meta:'balance outstanding',cls:'stat-dn'},
    {label:'🔴 Overdue',val:formatMoney(overdueAmt),meta:overdueList.length+' invoices',cls:'stat-dn'},
    {label:'✅ Paid',val:paidCount+'/'+allInvs.length,meta:'fully cleared',cls:'stat-up'},
  ].map(s=>'<div class="stat-card" style="cursor:pointer"><div class="stat-label">'+s.label+'</div><div class="stat-val '+(s.cls||'')+'">'+s.val+'</div><div class="stat-meta">'+s.meta+'</div></div>').join('');

  renderInvAIStrip();

  // Overdue banner
  const banner = document.getElementById('inv-overdue-banner');
  if (banner) {
    if (overdueList.length) { banner.style.display='flex'; document.getElementById('inv-overdue-msg').textContent = overdueList.length+' invoice'+(overdueList.length>1?'s':'')+' overdue — '+formatMoney(overdueAmt)+' pending'; }
    else banner.style.display='none';
  }

  // Filter + search + sort
  let invs = [...allInvs];
  if (invFilter !== 'all') invs = invs.filter(i=>i.status===invFilter);
  const q = (document.getElementById('inv-search')?.value||'').toLowerCase();
  if (q) invs = invs.filter(i=>(i.ref||'').toLowerCase().includes(q)||(i.customerName||'').toLowerCase().includes(q)||(i.bookingRef||'').toLowerCase().includes(q)||(i.destination||'').toLowerCase().includes(q));
  const df = document.getElementById('inv-date-from')?.value;
  const dt = document.getElementById('inv-date-to')?.value;
  if (df) invs = invs.filter(i=>(i.issueDate||'')>=df);
  if (dt) invs = invs.filter(i=>(i.issueDate||'')<=dt);
  const sort = document.getElementById('inv-sort')?.value||'newest';
  if (sort==='oldest') invs.sort((a,b)=>(a.issueDate||'').localeCompare(b.issueDate||''));
  else if (sort==='newest') invs.sort((a,b)=>(b.issueDate||b.createdAt||'').localeCompare(a.issueDate||a.createdAt||''));
  else if (sort==='amount-desc') invs.sort((a,b)=>Number(b.grandTotal||0)-Number(a.grandTotal||0));
  else if (sort==='amount-asc') invs.sort((a,b)=>Number(a.grandTotal||0)-Number(b.grandTotal||0));
  else if (sort==='due') invs.sort((a,b)=>(a.dueDate||'9').localeCompare(b.dueDate||'9'));

  const tbody = document.getElementById('invoices-tbody'); if(!tbody) return;
  if (!invs.length) { tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:48px;color:var(--textd)"><div style="font-size:32px;margin-bottom:10px">🧾</div><div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:4px">No invoices found</div><div style="font-size:12px">Invoices are auto-generated from confirmed bookings</div></td></tr>'; return; }

  tbody.innerHTML = invs.map(inv => {
    const gt = Number(inv.grandTotal||0); const paid = Number(inv.amountPaid||0);
    const balance = Math.max(0, gt - paid); const pct = gt > 0 ? Math.round(paid/gt*100) : 0;
    const age = inv.dueDate ? Math.ceil((new Date()-new Date(inv.dueDate))/86400000) : null;
    const rowBg = inv.status==='overdue'?'background:rgba(192,57,43,.03);':inv.status==='paid'?'background:rgba(34,128,80,.02);':'';
    return '<tr style="'+rowBg+'">'+
      '<td><span style="font-family:JetBrains Mono,monospace;font-size:11px;font-weight:600;color:var(--g700)">'+inv.ref+'</span><div style="font-size:10px;color:var(--textd)">'+formatDate(inv.issueDate)+'</div></td>'+
      '<td style="font-family:JetBrains Mono,monospace;font-size:12px">'+(inv.bookingRef||'—')+'</td>'+
      '<td><div style="font-weight:600">'+inv.customerName+'</div>'+(inv.destination?'<div style="font-size:10.5px;color:var(--textd)">📍 '+inv.destination+'</div>':'')+'</td>'+
      '<td style="font-weight:600">'+formatMoney(gt)+'</td>'+
      '<td><div style="font-weight:600;color:var(--g600)">'+formatMoney(paid)+'</div><div style="width:60px;height:4px;background:var(--border);border-radius:2px;margin-top:4px;overflow:hidden"><div style="width:'+pct+'%;height:100%;background:'+(pct===100?'var(--g500)':pct>0?'var(--amb)':'var(--border2)')+';border-radius:2px"></div></div></td>'+
      '<td style="font-weight:600;color:'+(balance>0?(inv.status==='overdue'?'var(--red)':'var(--amb)'):'var(--g500)')+'">'+
        (balance>0?formatMoney(balance):'<span style="color:var(--g500);font-size:11px">✓ Cleared</span>')+
      '</td>'+
      '<td style="font-size:12px;color:'+(inv.status==='overdue'?'var(--red)':'var(--text)')+';font-weight:'+(inv.status==='overdue'?'600':'400')+'">'+(inv.dueDate?formatDate(inv.dueDate):'—')+
        (age!==null&&age>0&&inv.status!=='paid'?'<div style="font-size:10px;color:var(--red)">+'+age+' days</div>':'')+
      '</td>'+
      '<td>'+stagePill(inv.status)+'</td>'+
      '<td style="white-space:nowrap">'+
        '<button class="row-btn" onclick="viewInvoice(\''+inv.id+'\')">👁 View</button>'+
        (inv.status!=='paid'?'<button class="row-btn" style="margin-left:3px;color:var(--g600);font-weight:600" onclick="quickMarkPaid(\''+inv.id+'\')">✅</button>':'')+
        '<button class="row-btn" style="margin-left:3px" onclick="printInvoice(\''+inv.id+'\')">🖨</button>'+
      '</td></tr>';
  }).join('');
}

function filterInvoices(f,el) { document.querySelectorAll('.page .chip').forEach(c=>c.classList.remove('active')); if(el)el.classList.add('active'); invFilter=f; renderInvoices(); }
function clearInvDateFilter() { const df=document.getElementById('inv-date-from'); const dt=document.getElementById('inv-date-to'); if(df)df.value=''; if(dt)dt.value=''; renderInvoices(); }

function quickMarkPaid(id) {
  const inv = DB.invoices.find(i=>i.id===id); if(!inv) return;
  if (!confirm('Mark invoice '+inv.ref+' as fully paid?')) return;
  inv.amountPaid = inv.grandTotal; inv.amountDue = 0; inv.status = 'paid';
  // Also update booking
  const bk = DB.bookings.find(b=>b.id===inv.bookingId);
  if (bk) { bk.advancePaid = bk.totalAmount; bk.paidAmount = bk.totalAmount; bk.pendingAmount = 0; if(bk.status==='pending'){bk.status='confirmed';bk.confirmedAt=new Date().toISOString();} }
  if(typeof dbSave==='function'){dbSave('invoices',inv).catch(()=>{});if(bk)dbSave('bookings',bk).catch(()=>{});}
  saveDB(); renderInvoices(); showToast(inv.ref+' marked as paid! ✅');
}

function viewInvoice(id) {
  const inv = DB.invoices.find(i=>i.id===id); if(!inv) return;
  const s = DB.settings;
  const gt = Number(inv.grandTotal||0); const paid = Number(inv.amountPaid||0); const balance = Math.max(0,gt-paid);
  document.getElementById('vi-title').textContent = inv.ref;
  document.getElementById('vi-body').innerHTML =
    '<div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;padding:24px;background:#fff">'+
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px"><div><img src="../assets/logo-transparent.png" alt="Wanago" style="width:140px;height:auto;margin-bottom:8px"><div style="font-size:11px;color:#666">'+(s.address||'')+'</div><div style="font-size:11px;color:#666">'+(s.phone||'')+' · '+(s.email||'')+'</div></div><div style="text-align:right"><div style="font-size:20px;font-weight:900;color:#134a32">INVOICE</div><div style="font-size:13px;font-weight:700;color:#134a32;margin-top:4px">'+inv.ref+'</div><div style="font-size:11px;color:#666;margin-top:6px">Date: '+formatDate(inv.issueDate)+'</div><div style="font-size:11px;color:#666">Due: '+formatDate(inv.dueDate)+'</div></div></div>'+
      '<div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:14px;margin-bottom:20px"><div style="font-size:11px;font-weight:700;color:#2e7d32;margin-bottom:6px">Bill To:</div><div style="font-size:15px;font-weight:700">'+inv.customerName+'</div>'+(inv.customerPhone?'<div style="font-size:12px;color:#555;margin-top:2px">'+inv.customerPhone+'</div>':'')+'</div>'+
      '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;border-radius:8px;overflow:hidden"><thead><tr style="background:#2e7d32"><th style="padding:12px 16px;text-align:left;font-size:11px;color:#fff;font-weight:700">Description</th><th style="padding:12px;text-align:center;font-size:11px;color:#fff;width:70px">Pax</th><th style="padding:12px 16px;text-align:right;font-size:11px;color:#fff;width:120px">Total</th></tr></thead><tbody style="background:#f9fff9">'+
      (inv.lineItems||[{description:inv.destination,pax:inv.pax,total:inv.subtotal}]).map(item=>'<tr><td style="padding:14px 16px;font-size:13px">'+item.description+'</td><td style="padding:14px;text-align:center">'+(item.pax||'')+'</td><td style="padding:14px 16px;text-align:right;font-weight:700">'+formatMoney(item.total)+'</td></tr>').join('')+
      '</tbody></table>'+
      '<div style="display:flex;justify-content:flex-end;margin-bottom:24px"><table style="width:350px;border-collapse:collapse;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">'+
        '<tr style="background:#fafafa"><td style="padding:10px 16px;font-size:13px">Subtotal</td><td style="padding:10px 16px;text-align:right;font-weight:600">'+formatMoney(inv.subtotal)+'</td></tr>'+
        (inv.gstAmount>0?'<tr><td style="padding:10px 16px;font-size:13px">GST ('+(s.gstRate||5)+'%)</td><td style="padding:10px 16px;text-align:right">'+formatMoney(inv.gstAmount)+'</td></tr>':'')+
        (inv.discount>0?'<tr><td style="padding:10px 16px;font-size:13px">Discount</td><td style="padding:10px 16px;text-align:right;color:var(--red)">-'+formatMoney(inv.discount)+'</td></tr>':'')+
        '<tr style="background:#2e7d32"><td style="padding:12px 16px;font-weight:700;color:#fff">Grand Total</td><td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:700;color:#fff">'+formatMoney(gt)+'</td></tr>'+
        '<tr style="background:#f9fff9"><td style="padding:10px 16px;font-size:12px;color:var(--g600)">Paid</td><td style="padding:10px 16px;text-align:right;font-weight:600;color:var(--g600)">'+formatMoney(paid)+'</td></tr>'+
        '<tr style="background:#fff"><td style="padding:10px 16px;font-size:13px;font-weight:700;color:'+(balance>0?'var(--red)':'var(--g600)')+'">Balance Due</td><td style="padding:10px 16px;text-align:right;font-size:15px;font-weight:700;color:'+(balance>0?'var(--red)':'var(--g600)')+'">'+formatMoney(balance)+'</td></tr>'+
      '</table></div>'+
      (s.bankName?'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 0;border-top:1px solid #ddd"><div><div style="font-size:11px;font-weight:700;color:#2e7d32;margin-bottom:8px">Bank Details</div><div style="font-size:12px;line-height:2;color:#444">Bank: <strong>'+s.bankName+'</strong><br>A/C: <strong>'+s.accountNo+'</strong><br>IFSC: <strong>'+s.ifsc+'</strong>'+(s.upi?'<br>UPI: <strong>'+s.upi+'</strong>':'')+'</div></div><div><div style="font-size:11px;font-weight:700;color:#2e7d32;margin-bottom:8px">Terms</div><div style="font-size:12px;line-height:1.8;color:#444">'+(s.invTerms||'Payment due within 7 days')+'</div></div></div>':'')+
      (s.gstEnabled&&s.gstin?'<div style="font-size:11px;color:#666;margin-top:12px;padding-top:12px;border-top:1px solid #ddd">GSTIN: '+s.gstin+(s.state?' · '+s.state:'')+'</div>':'')+
    '</div>';
  openModal('modal-view-invoice');
}

function printInvoice(id) {
  viewInvoice(id);
  setTimeout(() => {
    const body = document.getElementById('vi-body');
    if (!body) return;
    const w = window.open('','_blank','width=800,height=700');
    if(w) { w.document.write('<html><head><title>Invoice</title></head><body>'+body.innerHTML+'<script>window.print()<\/script></body></html>'); w.document.close(); }
  }, 300);
}


function whatsappInvoice(id) {
  const inv = id ? (DB.invoices || []).find(x => x.id === id) : null;
  if (!inv) { showToast('Invoice not found', 'error'); return; }
  const company = (DB.settings && DB.settings.companyName) || 'Wanago';
  const dueAmt = formatMoney(inv.amountDue || inv.total || 0);
  const dueDate = inv.dueDate ? formatDate(inv.dueDate) : '';
  const lines = [
    `Hi ${inv.customerName} 👋`,
    ``,
    `This is a gentle reminder from *${company}*.`,
    ``,
    `🧾 *Invoice:* ${inv.ref || inv.invoiceNo || inv.id}`,
    `💰 *Amount Due:* ${dueAmt}`,
    dueDate ? `📅 *Due Date:* ${dueDate}` : '',
    ``,
    `Kindly process the payment at the earliest. Thank you! 🙏`,
    ``,
    `— ${company} | ${(DB.settings && DB.settings.phone) || ''}`,
  ].filter(l => l !== '').join('\n');
  const ph = (inv.customerPhone || '').replace(/\D/g,'').replace(/^0+/,'');
  const full = ph.startsWith('91') ? ph : '91' + ph;
  if (!ph) { showToast('No phone number on invoice', 'error'); return; }
  window.open(`https://wa.me/${full}?text=${encodeURIComponent(lines)}`, '_blank');
}

window.autoGenerateInvoices=autoGenerateInvoices;window.renderInvAIStrip=renderInvAIStrip;window.renderInvoices=renderInvoices;window.filterInvoices=filterInvoices;window.initInvoices=function(){autoGenerateInvoices();renderInvoices();};
window.clearInvDateFilter=clearInvDateFilter;window.viewInvoice=viewInvoice;window.quickMarkPaid=quickMarkPaid;window.printInvoice=printInvoice;
window.whatsappInvoice=whatsappInvoice;

function initInvoices() { autoGenerateInvoices(); renderInvoices(); }
initPage(function() {
  initInvoices();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      initInvoices();
      if (typeof dbSubscribe === 'function') dbSubscribe('invoices', function() { initInvoices(); });
    }, 5000);
  }
});
