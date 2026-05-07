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

function initReports() {
  // Set default period to current month
  const now = new Date();
  const y = now.getFullYear(), m = String(now.getMonth()+1).padStart(2,'0');
  document.getElementById('rep-from').value = `${y}-${m}-01`;
  document.getElementById('rep-to').value = today();
  renderAllReports();
}

function setPeriod(p) {
  repPeriod = p;
  const now = new Date(); const y=now.getFullYear(); const m=now.getMonth();
  document.querySelectorAll('.rep-period-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('rep-period-'+p)?.classList.add('active');
  if (p==='month') {
    document.getElementById('rep-from').value = `${y}-${String(m+1).padStart(2,'0')}-01`;
    document.getElementById('rep-to').value = today();
  } else if (p==='quarter') {
    const qStart = new Date(y, Math.floor(m/3)*3, 1);
    document.getElementById('rep-from').value = qStart.toISOString().slice(0,10);
    document.getElementById('rep-to').value = today();
  } else if (p==='year') {
    document.getElementById('rep-from').value = `${y}-01-01`;
    document.getElementById('rep-to').value = today();
  } else if (p==='last_month') {
    const lm = new Date(y, m, 1);
    const lmStart = new Date(y, m-1, 1);
    document.getElementById('rep-from').value = lmStart.toISOString().slice(0,10);
    document.getElementById('rep-to').value = new Date(lm-1).toISOString().slice(0,10);
  }
  renderAllReports();
}

function renderAllReports() {
  const from = document.getElementById('rep-from').value;
  const to = document.getElementById('rep-to').value;
  renderSalesReport(from, to);
  renderLeadsReport(from, to);
  renderAgentReport(from, to);
  renderFinanceReport(from, to);
  renderDestinationReport(from, to);
}

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  const d = dateStr.slice(0,10);
  return (!from || d >= from) && (!to || d <= to);
}

// ══════ 1. SALES OVERVIEW ══════
function renderSalesReport(from, to) {
  const bookings = hScoped('bookings').filter(b => inRange(b.createdAt||b.confirmedAt, from, to));
  const payments = hScoped('payments').filter(p => inRange(p.date, from, to) && p.status==='completed');
  const leads = hScoped('leads').filter(l => inRange(l.createdAt, from, to));

  const revenue = payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const profit = bookings.filter(b=>b.status==='confirmed').reduce((s,b)=>s+Number(b.profit||0),0);
  const confirmedBk = bookings.filter(b=>b.status==='confirmed').length;
  const pendingBk = bookings.filter(b=>b.status==='pending').length;
  const wonLeads = leads.filter(l=>l.stage==='won').length;
  const cvr = leads.length ? ((wonLeads/leads.length)*100).toFixed(1) : 0;
  const avgBooking = confirmedBk ? Math.round(revenue/confirmedBk) : 0;
  const pendingDues = bookings.reduce((s,b)=>s+Number(b.pendingAmount||0),0);

  document.getElementById('rep-sales-cards').innerHTML = [
    {l:'💰 Revenue Collected', v:formatMoney(revenue), s:payments.length+' payments', c:'stat-up'},
    {l:'📊 Total Profit', v:formatMoney(profit), s:'From confirmed bookings', c:'stat-up'},
    {l:'🗓️ Confirmed Bookings', v:confirmedBk, s:pendingBk+' pending', c:''},
    {l:'🎯 Leads Generated', v:leads.length, s:cvr+'% conversion', c:''},
    {l:'💵 Avg Booking Value', v:formatMoney(avgBooking), s:'Per confirmed booking', c:''},
    {l:'⚠️ Pending Dues', v:formatMoney(pendingDues), s:'Outstanding balance', c:'stat-dn'},
  ].map(s=>`<div class="stat-card"><div class="stat-label">${s.l}</div><div class="stat-val ${s.c}">${s.v}</div><div class="stat-meta">${s.s}</div></div>`).join('');

  // Monthly trend chart
  renderMonthlyTrend(from, to);
}

function renderMonthlyTrend(from, to) {
  const el = document.getElementById('rep-trend-chart'); if (!el) return;
  const payments = hScoped('payments').filter(p=>p.status==='completed');
  const months = {};
  payments.forEach(p => {
    if (!p.date) return;
    const m = p.date.slice(0,7);
    if (!months[m]) months[m] = {revenue:0, bookings:0};
    months[m].revenue += Number(p.amount||0);
  });
  hScoped('bookings').filter(b=>b.status==='confirmed').forEach(b => {
    const m = (b.confirmedAt||b.createdAt||'').slice(0,7);
    if (!m) return;
    if (!months[m]) months[m] = {revenue:0, bookings:0};
    months[m].bookings += 1;
  });
  const keys = Object.keys(months).sort().slice(-12);
  const maxRev = Math.max(...keys.map(k=>months[k].revenue), 1);
  const maxBk = Math.max(...keys.map(k=>months[k].bookings), 1);

  if (!keys.length) { el.innerHTML='<div style="text-align:center;padding:30px;color:var(--textd)">No data yet</div>'; return; }

  el.innerHTML = `<div style="display:flex;align-items:flex-end;gap:6px;height:160px;padding-bottom:20px;overflow-x:auto">` +
    keys.map(k => {
      const revPct = Math.max(4, (months[k].revenue/maxRev)*100);
      const bkPct = Math.max(4, (months[k].bookings/maxBk)*80);
      const label = new Date(k+'-01').toLocaleDateString('en-IN',{month:'short',year:'2-digit'});
      return `<div style="flex:1;min-width:40px;display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="font-size:9px;color:var(--textd);margin-bottom:2px">${formatMoney(months[k].revenue)}</div>
        <div style="width:100%;display:flex;gap:2px;align-items:flex-end;height:120px">
          <div style="flex:1;background:var(--g500);border-radius:3px 3px 0 0;height:${revPct}%;min-height:4px;transition:.4s" title="Revenue: ${formatMoney(months[k].revenue)}"></div>
          <div style="flex:1;background:var(--amb);border-radius:3px 3px 0 0;height:${bkPct}%;min-height:4px;transition:.4s" title="Bookings: ${months[k].bookings}"></div>
        </div>
        <div style="font-size:9px;color:var(--textd)">${label}</div>
      </div>`;
    }).join('') +
  `</div><div style="display:flex;gap:16px;justify-content:center;margin-top:4px">
    <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--textd)"><div style="width:10px;height:10px;background:var(--g500);border-radius:2px"></div>Revenue</div>
    <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--textd)"><div style="width:10px;height:10px;background:var(--amb);border-radius:2px"></div>Bookings</div>
  </div>`;
}

// ══════ 2. LEADS REPORT ══════
function renderLeadsReport(from, to) {
  const leads = hScoped('leads').filter(l => inRange(l.createdAt, from, to));
  const stages = ['new','contacted','follow_up','quoted','negotiation','won','lost'];
  const stageColors = {new:'var(--g200)',contacted:'var(--g300)',follow_up:'var(--g400)',quoted:'var(--g500)',negotiation:'var(--amb)',won:'var(--g700)',lost:'var(--red)'};

  const stageCounts = {};
  stages.forEach(s => stageCounts[s] = leads.filter(l=>l.stage===s).length);

  const sources = {};
  leads.forEach(l => { const s=l.source||'Unknown'; sources[s]=(sources[s]||0)+1; });
  const topSources = Object.entries(sources).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const maxSrc = Math.max(...topSources.map(s=>s[1]),1);

  const funnel = document.getElementById('rep-leads-funnel'); if (!funnel) return;
  funnel.innerHTML = stages.map(s => {
    const c = stageCounts[s]||0; const pct = leads.length ? Math.max(4,c/leads.length*100) : 4;
    return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span style="text-transform:capitalize;color:var(--textm)">${s.replace('_',' ')}</span><span style="font-weight:700">${c}</span></div>
      <div style="height:7px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${stageColors[s]};border-radius:4px;transition:.4s"></div></div>
    </div>`;
  }).join('');

  const srcEl = document.getElementById('rep-lead-sources'); if (!srcEl) return;
  srcEl.innerHTML = topSources.length ? topSources.map(([src,cnt]) => {
    const pct = Math.max(4, cnt/maxSrc*100);
    const clrs = ['var(--g500)','var(--blue)','var(--amb)','#7c3aed','var(--red)','var(--g300)'];
    const ci = topSources.indexOf(topSources.find(s=>s[0]===src));
    return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span>${src}</span><span style="font-weight:700">${cnt} (${Math.round(cnt/leads.length*100)}%)</span></div>
      <div style="height:7px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${clrs[ci%clrs.length]};border-radius:4px"></div></div>
    </div>`;
  }).join('') : '<div style="color:var(--textd);font-size:12px;text-align:center;padding:20px">No lead data</div>';

  // Conversion stats
  const won=stageCounts['won']||0, lost=stageCounts['lost']||0;
  const conv = leads.length ? ((won/leads.length)*100).toFixed(1) : 0;
  document.getElementById('rep-leads-stats').innerHTML = [
    {l:'Total Leads', v:leads.length},
    {l:'Won', v:won, c:'stat-up'},
    {l:'Lost', v:lost, c:'stat-dn'},
    {l:'Conversion Rate', v:conv+'%', c: Number(conv)>=20?'stat-up':Number(conv)>0?'':'stat-dn'},
  ].map(s=>`<div class="stat-card"><div class="stat-label">${s.l}</div><div class="stat-val ${s.c||''}">${s.v}</div></div>`).join('');
}

// ══════ 3. AGENT PERFORMANCE ══════
function renderAgentReport(from, to) {
  const bookings = hScoped('bookings').filter(b => inRange(b.createdAt, from, to) && b.status==='confirmed');
  const leads = hScoped('leads').filter(l => inRange(l.createdAt, from, to));
  const payments = hScoped('payments').filter(p => inRange(p.date, from, to) && p.status==='completed');

  // Group by agent
  const agents = {};
  bookings.forEach(b => {
    const a=b.agent||'Unassigned';
    if(!agents[a]) agents[a]={bookings:0,revenue:0,profit:0,leads:0,won:0};
    agents[a].bookings++;
    agents[a].revenue += Number(b.totalAmount||0);
    agents[a].profit += Number(b.profit||0);
  });
  leads.forEach(l => {
    const a=l.agent||'Unassigned';
    if(!agents[a]) agents[a]={bookings:0,revenue:0,profit:0,leads:0,won:0};
    agents[a].leads++;
    if(l.stage==='won') agents[a].won++;
  });
  const sorted = Object.entries(agents).sort((a,b)=>b[1].revenue-a[1].revenue);
  const el = document.getElementById('rep-agents-table'); if (!el) return;

  if (!sorted.length) { el.innerHTML=emptyRow(6,'No agent data for this period'); return; }

  el.innerHTML = sorted.map(([name, d], i) => {
    const cvr = d.leads ? ((d.won/d.leads)*100).toFixed(0) : 0;
    const medals = ['🥇','🥈','🥉'];
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:8px">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--g600);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">${name[0]?.toUpperCase()||'?'}</div>
        <span style="font-weight:600">${medals[i]||''} ${name}</span>
      </div></td>
      <td style="text-align:center;font-weight:700">${d.bookings}</td>
      <td style="font-weight:600;color:var(--g700)">${formatMoney(d.revenue)}</td>
      <td style="font-weight:600;color:var(--g600)">${formatMoney(d.profit)}</td>
      <td style="text-align:center">${d.leads}</td>
      <td style="text-align:center"><span style="background:${Number(cvr)>=20?'var(--g50)':'var(--red2)'};color:${Number(cvr)>=20?'var(--g700)':'var(--red)'};padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700">${cvr}%</span></td>
    </tr>`;
  }).join('');
}

// ══════ 4. FINANCE REPORT ══════
function renderFinanceReport(from, to) {
  const payments = hScoped('payments').filter(p => inRange(p.date, from, to) && p.status==='completed');
  const methods = {};
  payments.forEach(p => { const m=p.method||'Other'; methods[m]=(methods[m]||0)+Number(p.amount||0); });

  const total = payments.reduce((s,p)=>s+Number(p.amount||0),0);
  const maxM = Math.max(...Object.values(methods),1);

  const el = document.getElementById('rep-payment-methods'); if (!el) return;
  const mColors = {'Bank Transfer':'var(--g500)','UPI':'var(--blue)','Cash':'var(--amb)','Card':'#7c3aed','Cheque':'var(--textd)'};

  el.innerHTML = Object.entries(methods).sort((a,b)=>b[1]-a[1]).map(([m,v]) => {
    const pct = Math.max(4,(v/maxM)*100);
    const sharePct = total ? ((v/total)*100).toFixed(1) : 0;
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
        <span>${m}</span><span style="font-weight:700">${formatMoney(v)} <span style="color:var(--textd);font-weight:400">(${sharePct}%)</span></span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${mColors[m]||'var(--g400)'};border-radius:4px;transition:.4s"></div>
      </div>
    </div>`;
  }).join('') || '<div style="color:var(--textd);font-size:12px;text-align:center;padding:20px">No payment data</div>';

  document.getElementById('rep-finance-total').textContent = formatMoney(total);
  document.getElementById('rep-finance-txns').textContent = payments.length+' transactions';
}

// ══════ 5. DESTINATION REPORT ══════
function renderDestinationReport(from, to) {
  const bookings = hScoped('bookings').filter(b => inRange(b.createdAt, from, to));
  const dests = {};
  bookings.forEach(b => {
    const d=b.destination||'Unknown';
    if(!dests[d]) dests[d]={count:0,revenue:0};
    dests[d].count++; dests[d].revenue+=Number(b.totalAmount||0);
  });
  const sorted = Object.entries(dests).sort((a,b)=>b[1].count-a[1].count).slice(0,8);
  const maxC = Math.max(...sorted.map(s=>s[1].count),1);

  const el = document.getElementById('rep-destinations'); if (!el) return;
  el.innerHTML = sorted.length ? sorted.map(([dest, d], i) => {
    const pct = Math.max(4,(d.count/maxC)*100);
    const clrs=['var(--g500)','var(--blue)','var(--amb)','#7c3aed','var(--g300)','var(--red)','var(--g700)','#e91e8c'];
    return `<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
        <span>📍 ${dest}</span>
        <span style="font-weight:700">${d.count} bookings · ${formatMoney(d.revenue)}</span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${clrs[i%clrs.length]};border-radius:4px"></div>
      </div>
    </div>`;
  }).join('') : '<div style="color:var(--textd);font-size:12px;text-align:center;padding:20px">No booking data yet</div>';
}

// ══════ EXPORT ══════
function exportReport() {
  const from = document.getElementById('rep-from').value;
  const to = document.getElementById('rep-to').value;
  const bookings = hScoped('bookings').filter(b=>inRange(b.createdAt,from,to));
  const leads = hScoped('leads').filter(l=>inRange(l.createdAt,from,to));
  const payments = hScoped('payments').filter(p=>inRange(p.date,from,to)&&p.status==='completed');

  let csv = `Wanago ERP Report — ${from} to ${to}\n\n`;
  csv += '=== BOOKINGS ===\nRef,Customer,Destination,Amount,Profit,Status,Date\n';
  bookings.forEach(b=>csv+=`${b.ref||''},${b.customerName||''},${b.destination||''},${b.totalAmount||0},${b.profit||0},${b.status||''},${(b.createdAt||'').slice(0,10)}\n`);
  csv += '\n=== LEADS ===\nName,Phone,Destination,Stage,Agent,Source,Date\n';
  leads.forEach(l=>csv+=`${l.name||''},${l.phone||''},${l.destination||''},${l.stage||''},${l.agent||''},${l.source||''},${(l.createdAt||'').slice(0,10)}\n`);
  csv += '\n=== PAYMENTS ===\nRef,Customer,Amount,Method,Date\n';
  payments.forEach(p=>csv+=`${p.bookingRef||''},${p.customerName||''},${p.amount||0},${p.method||''},${p.date||''}\n`);

  const blob = new Blob([csv],{type:'text/csv'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download=`wanago_report_${from}_${to}.csv`; a.click();
  showToast('Report exported!');
}

function printReport() {
  window.print();
  showToast('Printing...');
}


window.setPeriod=setPeriod;
window.renderAllReports=renderAllReports;window.exportReport=exportReport;window.printReport=printReport;

initPage(initReports);
