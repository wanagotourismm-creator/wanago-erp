// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Expenses Module
//  Track company expenses, vendor bills, staff costs
// ═══════════════════════════════════════════════════════════════

function initPage(renderFn) {
  var session = sessionStorage.getItem('wanago_session');
  if (!session) { window.location.href = '../index.html'; return; }
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

function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

// ── State ──
let expFilter = 'all';

const EXP_CAT = {
  transportation: { label: 'Transportation',   color: 'var(--blue)'  },
  hotel:          { label: 'Hotel & Stay',      color: 'var(--g600)'  },
  visa:           { label: 'Visa & Docs',       color: '#7c3aed'      },
  marketing:      { label: 'Marketing',         color: 'var(--amb)'   },
  office:         { label: 'Office & Admin',    color: 'var(--g400)'  },
  salary:         { label: 'Staff & Salary',    color: '#e91e8c'      },
  technology:     { label: 'Technology',        color: '#2196f3'      },
  vehicle:        { label: 'Vehicle & Fuel',    color: 'var(--amb)'   },
  miscellaneous:  { label: 'Miscellaneous',     color: 'var(--textd)' },
};

// ── Stats ──
function renderExpStats() {
  const all = hScoped('expenses');
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthExp = all.filter(e => (e.date || '').startsWith(thisMonth));
  const totalAmt = all.filter(e => e.status === 'paid').reduce((s, e) => s + Number(e.amount || 0), 0);
  const monthAmt = monthExp.reduce((s, e) => s + Number(e.amount || 0), 0);
  const pendingAmt = all.filter(e => e.status === 'pending').reduce((s, e) => s + Number(e.amount || 0), 0);
  const linkedToBooking = all.filter(e => e.bookingRef).length;
  const strip = document.getElementById('exp-stats');
  if (strip) strip.innerHTML = [
    { label: 'This Month',     val: formatMoney(monthAmt),   meta: monthExp.length + ' expenses',          cls: 'stat-dn' },
    { label: 'Total Paid',     val: formatMoney(totalAmt),   meta: all.filter(e=>e.status==='paid').length + ' transactions', cls: '' },
    { label: 'Pending',        val: formatMoney(pendingAmt), meta: all.filter(e=>e.status==='pending').length + ' unpaid',    cls: 'stat-dn' },
    { label: 'Linked Booking', val: linkedToBooking,         meta: 'expenses tied to bookings',            cls: '' },
  ].map(s => '<div class="stat-card"><div class="stat-label">' + s.label + '</div><div class="stat-val ' + s.cls + '">' + s.val + '</div><div class="stat-meta">' + s.meta + '</div></div>').join('');
}

// ── AI Strip ──
function renderExpAIStrip() {
  const el = document.getElementById('exp-ai-strip'); if (!el) return;
  const all = hScoped('expenses');
  if (!all.length) { el.innerHTML = ''; return; }
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthAmt = all.filter(e => (e.date||'').startsWith(thisMonth)).reduce((s, e) => s + Number(e.amount||0), 0);
  const catTotals = {};
  all.forEach(e => { const c = e.category || 'miscellaneous'; catTotals[c] = (catTotals[c]||0) + Number(e.amount||0); });
  const topCat = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];
  const pending = all.filter(e => e.status === 'pending');
  const cards = [];
  if (topCat) {
    const m = EXP_CAT[topCat[0]] || { label: topCat[0], color: 'var(--textd)' };
    cards.push('<div style="background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:10px 14px">' +
      '<div><div style="font-size:12.5px;font-weight:700">' + m.label + ' — Highest Spend</div><div style="font-size:11px;color:var(--textd)">' + formatMoney(topCat[1]) + ' total</div></div></div>');
  }
  if (pending.length) {
    const pAmt = pending.reduce((s,e) => s + Number(e.amount||0), 0);
    cards.push('<div style="background:#fff8f0;border:1px solid var(--amb2,#fde8c8);border-radius:10px;padding:10px 14px">' +
      '<div><div style="font-size:12.5px;font-weight:700">' + pending.length + ' Pending Expense' + (pending.length>1?'s':'') + '</div><div style="font-size:11px;color:var(--textd)">' + formatMoney(pAmt) + ' awaiting payment</div></div></div>');
  }
  if (monthAmt > 0) {
    const rev = (hScoped('payments')||[]).filter(p=>p.status==='completed'&&(p.date||'').startsWith(thisMonth)).reduce((s,p)=>s+Number(p.amount||0),0);
    if (rev > 0) {
      const margin = rev > 0 ? Math.round(((rev - monthAmt) / rev) * 100) : 0;
      const ok = margin >= 20;
      cards.push('<div style="background:' + (ok?'var(--g50)':'#fee2e2') + ';border:1px solid ' + (ok?'var(--g200)':'#fca5a5') + ';border-radius:10px;padding:10px 14px">' +
        '<div><div style="font-size:12.5px;font-weight:700">This Month Margin: ' + margin + '%</div><div style="font-size:11px;color:var(--textd)">Revenue ' + formatMoney(rev) + ' · Expenses ' + formatMoney(monthAmt) + '</div></div></div>');
    }
  }
  el.innerHTML = cards.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-bottom:4px">' + cards.join('') + '</div>' : '';
}

// ── Main Render ──
function renderExpenses(filter) {
  if (filter) expFilter = filter;
  renderExpStats();
  renderExpAIStrip();
  let exps = hScoped('expenses');
  if (expFilter !== 'all') exps = exps.filter(e => e.status === expFilter);
  const cat = document.getElementById('exp-cat-filter')?.value;
  if (cat) exps = exps.filter(e => e.category === cat);
  const df = document.getElementById('exp-from')?.value;
  const dt = document.getElementById('exp-to')?.value;
  if (df) exps = exps.filter(e => (e.date||'') >= df);
  if (dt) exps = exps.filter(e => (e.date||'') <= dt);
  exps = [...exps].sort((a, b) => (b.date||'').localeCompare(a.date||''));
  const tbody = document.getElementById('exp-tbody'); if (!tbody) return;
  if (!exps.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--textd)"><div style="font-weight:600;color:var(--text)">No expenses found</div><div style="font-size:12px;margin-top:4px">Click "+ Add Expense" to record your first expense</div></td></tr>';
    return;
  }
  tbody.innerHTML = exps.map(e => {
    const m = EXP_CAT[e.category] || { label: e.category||'—', color: 'var(--textd)' };
    const statusPill = e.status === 'paid'
      ? '<span style="background:var(--g50);color:var(--g700);padding:2px 8px;border-radius:8px;font-size:10.5px;font-weight:600">✓ Paid</span>'
      : '<span style="background:#fff8f0;color:var(--amb);padding:2px 8px;border-radius:8px;font-size:10.5px;font-weight:600;border:1px solid var(--amb2,#fde8c8)">Pending</span>';
    return '<tr>' +
      '<td style="font-size:12px;white-space:nowrap">' + formatDate(e.date) + '</td>' +
      '<td><span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:' + m.color + '">' + m.label + '</span></td>' +
      '<td style="font-weight:600">' + (e.vendor||'—') + '</td>' +
      '<td style="font-size:12px;color:var(--textm)">' + (e.description||'—') + '</td>' +
      '<td style="font-family:JetBrains Mono,monospace;font-size:11px">' + (e.bookingRef ? '<a href="#" onclick="return false" style="color:var(--g700);font-weight:600">' + e.bookingRef + '</a>' : '<span style="color:var(--textd)">—</span>') + '</td>' +
      '<td style="font-size:11.5px">' + (e.method||'—') + '</td>' +
      '<td style="font-weight:700;font-size:13px;color:var(--red)">₹' + Number(e.amount||0).toLocaleString('en-IN') + '</td>' +
      '<td>' + statusPill + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="row-btn" onclick="editExpense(\'' + e.id + '\')">Edit</button>' +
        (e.status==='pending' ? '<button class="row-btn" style="margin-left:3px;color:var(--g600);font-weight:600" onclick="markExpPaid(\'' + e.id + '\')">✓</button>' : '') +
        '<button class="row-btn" style="margin-left:3px;color:var(--red)" onclick="deleteExpense(\'' + e.id + '\')">✕</button>' +
      '</td></tr>';
  }).join('');
}

function filterExp(f, el) {
  document.querySelectorAll('.page .chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderExpenses(f);
}

function clearExpFilters() {
  document.getElementById('exp-cat-filter').value = '';
  document.getElementById('exp-from').value = '';
  document.getElementById('exp-to').value = '';
  document.querySelectorAll('.page .chip').forEach((c,i) => c.classList.toggle('active', i===0));
  renderExpenses('all');
}

// ── Add / Edit ──
function openAddExpenseModal() {
  document.getElementById('exp-edit-id').value = '';
  var _el_exp_modal_title=document.getElementById('exp-modal-title');if(_el_exp_modal_title){_el_exp_modal_title.textContent='Add Expense'}
  document.getElementById('exp-date').value = today();
  document.getElementById('exp-category').value = '';
  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-vendor').value = '';
  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-bkref').value = '';
  document.getElementById('exp-method').value = 'Cash';
  document.getElementById('exp-status').value = 'paid';
  document.getElementById('exp-notes').value = '';
  document.getElementById('exp-error').style.display = 'none';
  openModal('modal-add-expense');
}

function editExpense(id) {
  const e = (DB.expenses||[]).find(x => x.id === id); if (!e) return;
  document.getElementById('exp-edit-id').value = id;
  var _el_exp_modal_title=document.getElementById('exp-modal-title');if(_el_exp_modal_title){_el_exp_modal_title.textContent='Edit Expense'}
  document.getElementById('exp-date').value = e.date || today();
  document.getElementById('exp-category').value = e.category || '';
  document.getElementById('exp-amount').value = e.amount || '';
  document.getElementById('exp-vendor').value = e.vendor || '';
  document.getElementById('exp-desc').value = e.description || '';
  document.getElementById('exp-bkref').value = e.bookingRef || '';
  document.getElementById('exp-method').value = e.method || 'Cash';
  document.getElementById('exp-status').value = e.status || 'paid';
  document.getElementById('exp-notes').value = e.notes || '';
  document.getElementById('exp-error').style.display = 'none';
  openModal('modal-add-expense');
}

function saveExpense() {
  const date     = document.getElementById('exp-date').value;
  const category = document.getElementById('exp-category').value;
  const amount   = parseFloat(document.getElementById('exp-amount').value) || 0;
  const vendor   = document.getElementById('exp-vendor').value.trim();
  const errEl    = document.getElementById('exp-error');
  if (!date || !category || !amount || !vendor) {
    errEl.textContent = 'Date, category, amount and vendor are required.';
    errEl.style.display = 'block'; return;
  }
  errEl.style.display = 'none';
  const data = {
    date, category, amount,
    vendor,
    description: document.getElementById('exp-desc').value.trim(),
    bookingRef:  document.getElementById('exp-bkref').value.trim(),
    method:      document.getElementById('exp-method').value,
    status:      document.getElementById('exp-status').value,
    notes:       document.getElementById('exp-notes').value.trim(),
  };
  const editId = document.getElementById('exp-edit-id').value;
  if (!Array.isArray(DB.expenses)) DB.expenses = [];
  if (editId) {
    const idx = DB.expenses.findIndex(x => x.id === editId);
    if (idx > -1) { Object.assign(DB.expenses[idx], data); if(typeof dbSave==='function')dbSave('expenses',DB.expenses[idx]).catch(()=>{}); }
    showToast('Expense updated!');
  } else {
    const _exp = { id: uid(), ...data, officeId: officeIdForNewRecord(), createdBy: createdByStamp(), createdAt: new Date().toISOString() };
    DB.expenses.unshift(_exp);
    if (typeof dbSave === 'function') dbSave('expenses', _exp).catch(()=>{});
    showToast('Expense recorded!');
    logActivity('Expense: ' + vendor + ' ₹' + amount.toLocaleString('en-IN'), 'payment');
  }
  saveDB();
  closeModal('modal-add-expense');
  renderExpenses();
}

function markExpPaid(id) {
  const e = (DB.expenses||[]).find(x => x.id === id); if (!e) return;
  e.status = 'paid';
  if (e && typeof dbSave === 'function') dbSave('expenses', e).catch(()=>{});
  saveDB(); renderExpenses(); showToast('Expense marked as paid');
}

function deleteExpense(id) {
  if (!confirm('Delete this expense? Cannot be undone.')) return;
  if (typeof dbDelete === 'function') dbDelete('expenses', id).catch(()=>{});
  DB.expenses = (DB.expenses||[]).filter(x => x.id !== id);
  saveDB(); renderExpenses(); showToast('Expense deleted');
}

// ── Analytics ──
function renderExpAnalytics() {
  const all = hScoped('expenses');

  // Monthly spend chart (last 12 months)
  const mc = document.getElementById('exp-monthly-chart');
  if (mc) {
    const months = [];
    for (let i = 11; i >= 0; i--) { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); months.push(d.toISOString().slice(0,7)); }
    const totals = {}; months.forEach(m => { totals[m] = 0; });
    all.forEach(e => { const m = (e.date||'').slice(0,7); if (totals[m]!==undefined) totals[m] += Number(e.amount||0); });
    const maxVal = Math.max(1, ...months.map(m => totals[m]));
    const hasData = months.some(m => totals[m] > 0);
    if (!hasData) {
      mc.innerHTML = '<div style="color:var(--textd);font-size:12px;padding:20px;text-align:center">No expense data yet</div>';
    } else {
      const lbl = m => new Date(m+'-02').toLocaleString('default', { month: 'short' });
      mc.innerHTML = '<div style="display:flex;align-items:flex-end;gap:3px;height:104px;padding:4px 2px 0">' +
        months.map(m => {
          const amt = totals[m];
          const barH = Math.max(amt>0?4:0, Math.round(amt/maxVal*84));
          return '<div style="flex:1;display:flex;flex-direction:column;align-items:center">' +
            '<div style="font-size:8.5px;font-weight:700;color:var(--red);min-height:12px;line-height:12px">' + (amt?'₹'+(amt>=100000?(amt/100000).toFixed(1)+'L':amt>=1000?Math.round(amt/1000)+'K':amt):'') + '</div>' +
            '<div style="flex:1;width:100%;display:flex;align-items:flex-end"><div style="width:100%;height:'+barH+'px;background:#fca5a5;border-radius:3px 3px 0 0"></div></div>' +
            '<div style="font-size:8.5px;color:var(--textd);margin-top:3px;white-space:nowrap">' + lbl(m) + '</div>' +
            '</div>';
        }).join('') + '</div>';
    }
  }

  // Category breakdown
  const cc = document.getElementById('exp-cat-chart');
  if (cc) {
    const catTotals = {};
    all.forEach(e => { const c = e.category||'miscellaneous'; catTotals[c] = (catTotals[c]||0)+Number(e.amount||0); });
    const entries = Object.entries(catTotals).sort((a,b)=>b[1]-a[1]);
    const grandTotal = entries.reduce((s,[,v])=>s+v, 0) || 1;
    if (!entries.length) { cc.innerHTML = '<div style="color:var(--textd);font-size:12px;padding:20px;text-align:center">No data</div>'; }
    else cc.innerHTML = entries.map(([cat, amt]) => {
      const m = EXP_CAT[cat] || { label: cat, color: 'var(--textd)' };
      const pct = Math.max(3, Math.round(amt/grandTotal*100));
      return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span>' + m.label + '</span><span style="font-weight:700">' + formatMoney(amt) + ' (' + Math.round(amt/grandTotal*100) + '%)</span></div><div style="height:7px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:'+m.color+';border-radius:4px"></div></div></div>';
    }).join('');
  }

  // P&L summary
  const pnl = document.getElementById('exp-pnl');
  if (pnl) {
    const thisMonth = new Date().toISOString().slice(0,7);
    const mRevenue = (hScoped('payments')||[]).filter(p=>p.status==='completed'&&(p.date||'').startsWith(thisMonth)).reduce((s,p)=>s+Number(p.amount||0),0);
    const mExpenses = all.filter(e=>(e.date||'').startsWith(thisMonth)&&e.status==='paid').reduce((s,e)=>s+Number(e.amount||0),0);
    const mProfit = mRevenue - mExpenses;
    const tRevenue = (hScoped('payments')||[]).filter(p=>p.status==='completed').reduce((s,p)=>s+Number(p.amount||0),0);
    const tExpenses = all.filter(e=>e.status==='paid').reduce((s,e)=>s+Number(e.amount||0),0);
    const tProfit = tRevenue - tExpenses;
    pnl.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">' +
      '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--textd);margin-bottom:10px">This Month</div>' +
      _pnlRow('Revenue', mRevenue, 'var(--g600)') + _pnlRow('Expenses', mExpenses, 'var(--red)') +
      '<div style="border-top:2px solid var(--border);padding-top:8px;margin-top:8px">' + _pnlRow('Net Profit', mProfit, mProfit>=0?'var(--g600)':'var(--red)') + '</div></div>' +
      '<div><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;color:var(--textd);margin-bottom:10px">All Time</div>' +
      _pnlRow('Revenue', tRevenue, 'var(--g600)') + _pnlRow('Expenses', tExpenses, 'var(--red)') +
      '<div style="border-top:2px solid var(--border);padding-top:8px;margin-top:8px">' + _pnlRow('Net Profit', tProfit, tProfit>=0?'var(--g600)':'var(--red)') + '</div></div>' +
      '</div>';
  }

  // Top vendors
  const tv = document.getElementById('exp-vendors');
  if (tv) {
    const vendorMap = {};
    all.forEach(e => { const v = e.vendor||'Unknown'; vendorMap[v] = (vendorMap[v]||0)+Number(e.amount||0); });
    const top = Object.entries(vendorMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const maxV = Math.max(1, ...top.map(([,v])=>v));
    if (!top.length) { tv.innerHTML = '<div style="color:var(--textd);font-size:12px;padding:20px;text-align:center">No vendor data yet</div>'; }
    else tv.innerHTML = top.map(([name, amt]) => {
      const pct = Math.max(3, Math.round(amt/maxV*100));
      return '<div style="margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span style="font-weight:600">' + name + '</span><span style="font-weight:700">' + formatMoney(amt) + '</span></div><div style="height:7px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--g300);border-radius:4px"></div></div></div>';
    }).join('');
  }
}

function _pnlRow(label, amount, color) {
  return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;font-size:12.5px"><span style="color:var(--textm)">' + label + '</span><span style="font-weight:700;color:' + color + '">' + formatMoney(amount) + '</span></div>';
}

// ── Export ──
function exportExpenses() {
  let exps = hScoped('expenses');
  if (!exps.length) { showToast('No expenses to export', 'error'); return; }
  const cat = document.getElementById('exp-cat-filter')?.value;
  const df = document.getElementById('exp-from')?.value;
  const dt = document.getElementById('exp-to')?.value;
  if (cat) exps = exps.filter(e => e.category === cat);
  if (df) exps = exps.filter(e => (e.date||'') >= df);
  if (dt) exps = exps.filter(e => (e.date||'') <= dt);
  const csv = 'Date,Category,Vendor,Description,Booking Ref,Method,Amount,Status,Notes\n' +
    exps.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(e => [
      e.date||'', (EXP_CAT[e.category]?.label||e.category||''),
      e.vendor||'', e.description||'', e.bookingRef||'', e.method||'',
      e.amount||0, e.status||'', e.notes||''
    ].map(v => '"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'wanago_expenses_' + today() + '.csv'; a.click();
  showToast(exps.length + ' expenses exported!');
}

// ── Expose ──
window.renderExpenses = renderExpenses;
window.filterExp = filterExp;
window.clearExpFilters = clearExpFilters;
window.openAddExpenseModal = openAddExpenseModal;
window.editExpense = editExpense;
window.saveExpense = saveExpense;
window.markExpPaid = markExpPaid;
window.deleteExpense = deleteExpense;
window.renderExpAnalytics = renderExpAnalytics;
window.exportExpenses = exportExpenses;

initPage(function() {
  renderExpenses();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      renderExpenses();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('expenses', function() { renderExpenses(); });
      }
    }, 5000);
  }
});
