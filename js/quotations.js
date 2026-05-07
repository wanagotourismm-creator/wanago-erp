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

//  WANAGO ERP — Quotations Module (Lead → Quotation → Booking)
//  Flow: Lead interested → Send Quotation → Customer Accepts → Convert to Booking → Payment → Confirmed
// ═══════════════════════════════════════════════════════════════




let quotFilter = 'all';

function renderQuotationsPage() {
  const search = (document.getElementById('quot-search')?.value || '').toLowerCase();
  const sort = document.getElementById('quot-sort')?.value || 'newest';

  let items = (DB.quotations || []).map(q => {
    // Check if expired (validDays from creation)
    const validDays = q.validDays || 15;
    const expiry = new Date(q.createdAt);
    expiry.setDate(expiry.getDate() + validDays);
    const isExpired = expiry < new Date() && q.status === 'sent';
    const status = isExpired ? 'expired' : q.status;
    return Object.assign({}, q, { _displayStatus: status, _expiry: expiry.toISOString().slice(0,10) });
  // Filter
  if (quotFilter !== 'all') items = items.filter(i => i._displayStatus === quotFilter);

  // Search
  if (search) items = items.filter(i =>
    (i.customerName||'').toLowerCase().includes(search) ||
    (i.destination||'').toLowerCase().includes(search) ||
    (i.id||'').toLowerCase().includes(search) ||
    (i.agent||'').toLowerCase().includes(search)
  );

  // Sort
  });
  items.sort((a,b) => {
    if (sort === 'oldest') return (a.createdAt||'').localeCompare(b.createdAt||'');
    if (sort === 'amount-desc') return Number(b.grandTotal||0) - Number(a.grandTotal||0);
    if (sort === 'amount-asc') return Number(a.grandTotal||0) - Number(b.grandTotal||0);
    return (b.createdAt||'').localeCompare(a.createdAt||'');
  });
  // Stats
  const all = DB.quotations || [];
  const el = id => document.getElementById(id) || {textContent:''};
  el('qstat-total').textContent = all.length;
  el('qstat-sent').textContent = all.filter(q => q.status === 'sent').length;
  el('qstat-accepted').textContent = all.filter(q => q.status === 'accepted').length;
  el('qstat-converted').textContent = all.filter(q => q.status === 'converted').length;
  el('qstat-value').textContent = formatMoney(all.reduce((s,q) => s + Number(q.grandTotal||0), 0));

  // Render table
  const tbody = document.getElementById('quotations-tbody');
  if (!tbody) return;
  if (!items.length) {
    tbody.innerHTML = emptyRow(10, 'No quotations yet. Go to Leads → View a lead → click "Send Quotation".');
    return;
  }

  const STATUS_PILL = {
    sent: '<span class="pill pill-amb">📤 Sent</span>',
    accepted: '<span class="pill pill-blue">✅ Accepted</span>',
    converted: '<span class="pill pill-green">🎉 Booked</span>',
    rejected: '<span class="pill pill-red">✕ Rejected</span>',
    expired: '<span class="pill pill-gray">⏰ Expired</span>',
  };

  tbody.innerHTML = items.map(q => {
    const amt = Number(q.grandTotal || q.amount || 0);
    const pill = STATUS_PILL[q._displayStatus] || STATUS_PILL.sent;
    const canAccept = q._displayStatus === 'sent';
    const canConvert = q._displayStatus === 'accepted';
    const lead = DB.leads.find(l => l.id === q.leadId);

    return `<tr>
      <td><span class="mono" style="font-weight:600;color:var(--g700)">${q.id}</span></td>
      <td>
        <div style="font-weight:600">${q.customerName}</div>
        <div style="font-size:10.5px;color:var(--textd)">${q.customerPhone}</div>
      </td>
      <td>${q.destination}<br><span style="font-size:10px;color:var(--textd)">${q.tripType==='international'?'✈️ Intl':'🇮🇳 Dom'}</span></td>
      <td style="text-align:center">${q.pax || '—'}</td>
      <td><strong>${formatMoney(amt)}</strong></td>
      <td>${formatDate(q.createdAt)}</td>
      <td style="${q._displayStatus==='expired'?'color:var(--red);font-weight:600':''}">${formatDate(q._expiry)}</td>
      <td>${q.agent || '—'}</td>
      <td>${pill}${q.bookingRef ? '<div style="font-size:9.5px;color:var(--g600);font-weight:700;margin-top:2px">→ '+q.bookingRef+'</div>' : ''}</td>
      <td style="white-space:nowrap">
        <button class="row-btn" onclick="viewQuotation('${q.id}')">📄 View</button>
        ${canAccept ? `<button class="row-btn" style="margin-left:3px;background:var(--g50);color:var(--g700);border-color:var(--g300)" onclick="acceptQuotation('${q.id}')">✅ Accept</button>
        <button class="row-btn" style="margin-left:3px;color:var(--red)" onclick="rejectQuotation('${q.id}')">✕</button>` : ''}
        ${canConvert ? `<button class="btn btn-sm btn-primary" style="margin-left:3px" onclick="convertToBooking('${q.id}')">🗓 Convert to Booking</button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

function filterQuotations(f, el) {
  quotFilter = f;
  document.querySelectorAll('.page .chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderQuotationsPage();
}

// ── Accept Quotation (customer agreed) ──
function acceptQuotation(quotId) {
  const q = DB.quotations.find(x => x.id === quotId);
  if (!q) return;
  if (!confirm(`Mark quotation ${quotId} as accepted by ${q.customerName}?`)) return;
  q.status = 'accepted';
  q.acceptedAt = new Date().toISOString();
  // Update lead
  const lead = DB.leads.find(l => l.id === q.leadId);
  if (lead) lead.stage = 'negotiation';
  saveDB();
  renderQuotationsPage();
  showToast(`${q.customerName} accepted the quotation! Ready to convert to booking.`);
}

// ── Reject Quotation ──
function rejectQuotation(quotId) {
  const q = DB.quotations.find(x => x.id === quotId);
  if (!q) return;
  if (!confirm(`Mark quotation ${quotId} as rejected?`)) return;
  q.status = 'rejected';
  q.rejectedAt = new Date().toISOString();
  const lead = DB.leads.find(l => l.id === q.leadId);
  if (lead) lead.stage = 'follow_up'; // back to follow-up for re-engagement
  saveDB();
  renderQuotationsPage();
  showToast('Quotation rejected. Lead moved back to follow-up.');
}

// ── Convert to Booking ──
function convertToBooking(quotId) {
  const q = DB.quotations.find(x => x.id === quotId);
  if (!q) return;
  if (!confirm(`Convert quotation ${quotId} to a booking for ${q.customerName}?\n\nAmount: ${formatMoney(q.grandTotal)}\nBooking will be in "Pending Payment" status.`)) return;
  const booking = convertQuotationToBooking(quotId);
  if (booking) {
    renderQuotationsPage();
    showToast(`Booking ${booking.ref} created! Awaiting payment.`);
  }
}

// ── View Quotation Preview ──
function viewQuotation(quotId) {
  const q = DB.quotations.find(x => x.id === quotId);
  if (!q) return;
  const s = DB.settings;

  const companyName = s.companyName || 'Wanago Private Limited';
  const companyAddr = s.address || '';
  const bankName = s.bankName || '';
  const accountNo = s.accountNo || '';
  const ifsc = s.ifsc || '';

  const item = (q.items && q.items[0]) || { description: q.destination, pax: q.pax, pricePerPerson: 0, total: q.amount };
  const subtotal = item.total || q.amount || 0;
  const grandTotal = subtotal - (q.discount || 0);

  const bankBlock = bankName
    ? `<div style="margin-bottom:8px"><span style="font-size:11px;color:#666">Account Number</span><br><strong>${accountNo}</strong></div><div style="margin-bottom:8px"><span style="font-size:11px;color:#666">IFSC</span><br><strong>${ifsc}</strong></div><div><span style="font-size:11px;color:#666">Bank</span><br><strong>${bankName}</strong></div>`
    : '<div style="color:#999;font-size:12px;font-style:italic">Update bank details in Settings</div>';

  document.getElementById('quotation-preview-body').innerHTML = `
    <div style="font-family:Arial,sans-serif;max-width:720px;margin:0 auto;padding:30px 40px;background:#fff;color:#222">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px">
        <div><img src="../assets/logo-transparent.png" alt="Wanago" style="width:160px;height:auto;object-fit:contain"></div>
        <div style="text-align:right"><div style="font-size:12px;color:#666">Date: ${formatDate(q.createdAt)}</div><div style="font-size:13px;font-weight:700;color:#2e7d32;margin-top:4px">${q.id}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:24px">
        <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:16px">
          <div style="font-size:11px;font-weight:700;color:#2e7d32;margin-bottom:10px">From:</div>
          <div style="font-size:14px;font-weight:700">${companyName}</div>
          ${companyAddr ? '<div style="font-size:11.5px;color:#444;line-height:1.6;margin-top:4px">'+companyAddr+'</div>' : ''}
        </div>
        <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:16px">
          <div style="font-size:11px;font-weight:700;color:#2e7d32;margin-bottom:10px">To:</div>
          <div style="font-size:15px;font-weight:700">${q.customerName}</div>
          <div style="font-size:13px;color:#555;margin-top:2px">${q.customerPhone}</div>
          ${q.customerEmail ? '<div style="font-size:12px;color:#555">'+q.customerEmail+'</div>' : ''}
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:26px;border-radius:10px;overflow:hidden">
        <thead><tr style="background:#2e7d32"><th style="padding:13px 16px;text-align:left;font-size:11px;font-weight:700;letter-spacing:1.5px;color:#fff">DESCRIPTION</th><th style="padding:13px 16px;text-align:center;font-size:11px;font-weight:700;color:#fff;width:80px">PAX</th><th style="padding:13px 16px;text-align:right;font-size:11px;font-weight:700;color:#fff;width:120px">PER PERSON</th><th style="padding:13px 16px;text-align:right;font-size:11px;font-weight:700;color:#fff;width:130px">TOTAL</th></tr></thead>
        <tbody style="background:#f9fff9"><tr><td style="padding:18px 16px;font-size:14px">${item.description}${q.travelDate?'<br><span style="font-size:12px;color:#666">Travel: '+formatDate(q.travelDate)+'</span>':''}</td><td style="padding:18px 16px;text-align:center;font-size:14px">${q.pax||''}</td><td style="padding:18px 16px;text-align:right;font-size:14px">${formatMoney(item.pricePerPerson||0)}</td><td style="padding:18px 16px;text-align:right;font-size:15px;font-weight:700">${formatMoney(subtotal)}</td></tr></tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
        <table style="width:380px;border-collapse:collapse;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
          <tr style="background:#fafafa"><td style="padding:10px 16px;font-size:13px;font-weight:600">Subtotal</td><td style="padding:10px 16px;text-align:right;font-size:14px;font-weight:600">${formatMoney(subtotal)}</td></tr>
          ${(q.discount||0)>0?'<tr style="background:#fff"><td style="padding:10px 16px;font-weight:700">Discount</td><td style="padding:10px 16px;text-align:right;font-weight:700">-'+formatMoney(q.discount)+'</td></tr>':''}
          <tr style="background:#2e7d32"><td style="padding:12px 16px;font-size:14px;font-weight:700;color:#fff">GRAND TOTAL</td><td style="padding:12px 16px;text-align:right;font-size:16px;font-weight:700;color:#fff">${formatMoney(grandTotal)}</td></tr>
        </table>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:20px 0;border-top:1px solid #ddd;border-bottom:1px solid #ddd;margin-bottom:20px">
        <div><div style="font-size:12px;font-weight:700;color:#2e7d32;margin-bottom:10px">Bank Details</div>${bankBlock}</div>
        <div><div style="font-size:12px;font-weight:700;color:#2e7d32;margin-bottom:10px">Terms & Conditions</div><ul style="font-size:12px;color:#444;line-height:1.9;padding-left:18px;margin:0"><li>Valid for ${q.validDays||15} days from issue date</li><li>50% advance payment required</li><li>Balance due 7 days before travel</li></ul></div>
      </div>
      <div style="background:#2e7d32;border-radius:6px;padding:14px 20px;display:flex;justify-content:space-between;font-size:12px;color:#fff"><span>${s.phone||''}</span><span>${s.website||''}</span><span>${s.email||''}</span></div>
    </div>`;

  document.getElementById('modal-view-quotation')._quotId = quotId;

  // Show/hide action buttons based on status
  const acceptBtn = document.getElementById('quot-accept-btn');
  const convertBtn = document.getElementById('quot-convert-btn');
  if (acceptBtn) acceptBtn.style.display = q.status === 'sent' ? '' : 'none';
  if (convertBtn) convertBtn.style.display = q.status === 'accepted' ? '' : 'none';

  openModal('modal-view-quotation');
}

function printQuotation() {
  const body = document.getElementById('quotation-preview-body');
  if (!body) return;
  const w = window.open('', '_blank', 'width=800,height=700');
  if (w) { w.document.write('<html><head><title>Quotation</title></head><body>'+body.innerHTML+'<script>window.print()<\/script></body></html>'); w.document.close(); }
}

function acceptFromModal() {
  const quotId = document.getElementById('modal-view-quotation')._quotId;
  if (quotId) { closeModal('modal-view-quotation'); acceptQuotation(quotId); }
}

function convertFromModal() {
  const quotId = document.getElementById('modal-view-quotation')._quotId;
  if (quotId) { closeModal('modal-view-quotation'); convertToBooking(quotId); }
}

window.renderQuotationsPage = renderQuotationsPage;
window.renderQuotations = renderQuotationsPage;
window.filterQuotations = filterQuotations;
window.viewQuotation = viewQuotation;
window.acceptQuotation = acceptQuotation;
window.rejectQuotation = rejectQuotation;
window.convertToBooking = convertToBooking;
window.printQuotation = printQuotation;
window.acceptFromModal = acceptFromModal;
window.convertFromModal = convertFromModal;

initPage(renderQuotationsPage);
