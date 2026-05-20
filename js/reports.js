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

let repPeriod = 'month';

function renderAllReports() {
  const from = document.getElementById('rep-from').value;
  const to = document.getElementById('rep-to').value;
  renderAIIntelligence(from, to);
  renderSalesReport(from, to);
  renderLeadsReport(from, to);
  renderLeadQuality(from, to);
  renderAgentReport(from, to);
  renderFinanceReport(from, to);
  renderDestinationReport(from, to);
  renderQuotationsReport(from, to);
  renderPackageReport(from, to);
  renderPLStatement(from, to);
  renderCashflow(from, to);
  renderExpenseBreakdown(from, to);
  renderRevenueForecast(from, to);
  renderOutstandingCollections(from, to);
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
    {l:'Revenue Collected', v:formatMoney(revenue), s:payments.length+' payments', c:'stat-up'},
    {l:'Total Profit', v:formatMoney(profit), s:'From confirmed bookings', c:'stat-up'},
    {l:'Confirmed Bookings', v:confirmedBk, s:pendingBk+' pending', c:''},
    {l:'Leads Generated', v:leads.length, s:cvr+'% conversion', c:''},
    {l:'Avg Booking Value', v:formatMoney(avgBooking), s:'Per confirmed booking', c:''},
    {l:'Pending Dues', v:formatMoney(pendingDues), s:'Outstanding balance', c:'stat-dn'},
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

  var _el_rep_finance_total=document.getElementById('rep-finance-total');if(_el_rep_finance_total){_el_rep_finance_total.textContent=formatMoney(total)}
  var _el_rep_finance_txns=document.getElementById('rep-finance-txns');if(_el_rep_finance_txns){_el_rep_finance_txns.textContent=payments.length+' transactions'}
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

// ══════ AI INTELLIGENCE ══════
function renderAIIntelligence(from, to) {
  const section = document.getElementById('rep-ai-section');
  const el = document.getElementById('rep-ai-content');
  if (!el) return;
  if (typeof window.WanagoAI === 'undefined') { if (section) section.style.display = 'none'; return; }
  try {
    const { forecast, ema } = WanagoAI.forecastRevenue();
    const activeLeads = hScoped('leads').filter(l => !['won','lost'].includes(l.stage));
    const heats = activeLeads.map(l => WanagoAI.scoreLeadHeat(l));
    const hot = heats.filter(s => s >= 70).length;
    const hotPct = heats.length ? Math.round(hot / heats.length * 100) : 0;
    const health = WanagoAI.dataHealthScore();
    const segs = WanagoAI.segmentCustomers();
    const totalCusts = Object.values(segs).reduce((s, a) => s + a.length, 0);
    const cards = [];

    // Next month forecast
    const nf = forecast[0];
    if (nf) cards.push(
      '<div style="background:linear-gradient(135deg,#134a32,#1e7a4e);border-radius:10px;padding:14px;color:#fff">' +
        '<div style="font-size:10.5px;opacity:.75;margin-bottom:4px">' + nf.month + ' Forecast</div>' +
        '<div style="font-size:22px;font-weight:800;font-family:\'DM Serif Display\',serif">₹' + WanagoAI.fmt(nf.predicted) + '</div>' +
        '<div style="font-size:10px;opacity:.6;margin-top:4px">EMA ₹' + WanagoAI.fmt(ema) + '/mo</div>' +
        '<div style="font-size:9.5px;background:rgba(255,255,255,.15);border-radius:5px;padding:2px 7px;display:inline-block;margin-top:6px">' +
          (nf.confidence === 'high' ? '↑ High confidence' : nf.confidence === 'medium' ? '~ Medium confidence' : '? Low confidence') +
        '</div>' +
      '</div>'
    );

    // Lead temperature
    cards.push(
      '<div style="background:#fde8e8;border:1px solid #e74c3c30;border-radius:10px;padding:14px">' +
        '<div style="font-size:10.5px;color:#888;margin-bottom:6px">Lead Temperature</div>' +
        '<div style="font-size:26px;font-weight:800;color:#c0392b">' + hotPct + '%</div>' +
        '<div style="font-size:11px;color:#888;margin-top:2px">' + hot + ' hot leads (score ≥70)</div>' +
        '<div style="margin-top:8px;height:5px;background:#f4f4f4;border-radius:3px;overflow:hidden">' +
          '<div style="height:100%;width:' + hotPct + '%;background:#e74c3c;border-radius:3px"></div>' +
        '</div>' +
      '</div>'
    );

    // Data health
    const hc = health.score >= 80 ? '#2ecc71' : health.score >= 60 ? '#f39c12' : '#e74c3c';
    const hbg = health.score >= 80 ? '#f0faf4' : health.score >= 60 ? '#fff8f0' : '#fde8e8';
    cards.push(
      '<div style="background:' + hbg + ';border:1px solid ' + hc + '30;border-radius:10px;padding:14px">' +
        '<div style="font-size:10.5px;color:#888;margin-bottom:6px">🏥 Data Health</div>' +
        '<div style="display:flex;align-items:baseline;gap:4px">' +
          '<div style="font-size:26px;font-weight:800;color:' + hc + '">' + health.score + '</div>' +
          '<div style="font-size:10px;color:#aaa">/ 100</div>' +
        '</div>' +
        '<div style="font-size:11px;color:#888;margin-top:2px">' + (health.issues > 0 ? health.issues + ' issues found' : 'All records complete') + '</div>' +
        '<div style="margin-top:8px;height:5px;background:#f4f4f4;border-radius:3px;overflow:hidden">' +
          '<div style="height:100%;width:' + health.score + '%;background:' + hc + ';border-radius:3px;transition:.4s"></div>' +
        '</div>' +
      '</div>'
    );

    // Customer segments
    if (totalCusts > 0) {
      const segCfg = [
        { key:'vip',     label:'VIP',      color:'#f0ad4e' },
        { key:'loyal',   label:'Loyal',    color:'#2ecc71' },
        { key:'regular', label:'Regular',  color:'#3498db' },
        { key:'at_risk', label:'At Risk',  color:'#e74c3c' },
        { key:'new',     label:'New',      color:'#9b59b6' },
        { key:'inactive',label:'Inactive', color:'#aaa'    },
      ].filter(s => segs[s.key]?.length > 0);
      cards.push(
        '<div style="background:#f8f9fa;border:1px solid var(--border);border-radius:10px;padding:14px">' +
          '<div style="font-size:10.5px;color:#888;margin-bottom:8px">👥 Customer Segments</div>' +
          segCfg.map(s => {
            const pct = Math.round(segs[s.key].length / totalCusts * 100);
            return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">' +
              '<div style="width:8px;height:8px;border-radius:50%;background:' + s.color + ';flex-shrink:0"></div>' +
              '<div style="flex:1;font-size:11px;color:#555">' + s.label + '</div>' +
              '<div style="font-size:10px;font-weight:700;color:' + s.color + ';min-width:22px;text-align:right">' + segs[s.key].length + '</div>' +
              '<div style="width:44px;height:5px;background:#eee;border-radius:3px;overflow:hidden">' +
                '<div style="height:100%;width:' + pct + '%;background:' + s.color + ';border-radius:3px"></div>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>'
      );
    }

    el.innerHTML = cards.join('');
    if (section) section.style.display = '';
  } catch (e) {
    if (section) section.style.display = 'none';
  }
}

// ══════ LEAD QUALITY ══════
function renderLeadQuality(from, to) {
  const el = document.getElementById('rep-lead-quality'); if (!el) return;
  if (typeof window.WanagoAI === 'undefined') { el.closest('.rep-section')?.style && (el.closest('.rep-section').style.display = 'none'); return; }
  const leads = hScoped('leads').filter(l => inRange(l.createdAt, from, to) && !['won','lost'].includes(l.stage));
  if (!leads.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textd);font-size:12px">No active leads in this period</div>'; return; }

  const buckets = { hot:[], warm:[], lukewarm:[], cold:[], dormant:[] };
  leads.forEach(l => {
    const s = WanagoAI.scoreLeadHeat(l);
    const tagged = {...l, _score: s};
    if (s >= 82)      buckets.hot.push(tagged);
    else if (s >= 62) buckets.warm.push(tagged);
    else if (s >= 42) buckets.lukewarm.push(tagged);
    else if (s >= 20) buckets.cold.push(tagged);
    else              buckets.dormant.push(tagged);
  });
  const maxB = Math.max(...Object.values(buckets).map(b => b.length), 1);
  const avgScore = Math.round(leads.reduce((s, l) => s + WanagoAI.scoreLeadHeat(l), 0) / leads.length);
  const bucketCfg = [
    { key:'hot',      label:'Hot',      color:'#e74c3c' },
    { key:'warm',     label:'Warm',     color:'#e67e22' },
    { key:'lukewarm', label:'Lukewarm', color:'#d4ac0d' },
    { key:'cold',     label:'Cold',     color:'#3498db' },
    { key:'dormant',  label:'Dormant',  color:'#95a5a6' },
  ];

  let html = '<div style="display:flex;align-items:flex-start;gap:20px;flex-wrap:wrap;margin-bottom:16px">' +
    '<div style="text-align:center;padding:12px 18px;background:var(--cream);border-radius:10px;flex-shrink:0">' +
      '<div style="font-size:28px;font-weight:800;color:var(--g700)">' + avgScore + '</div>' +
      '<div style="font-size:10.5px;color:var(--textd)">Avg Heat Score</div>' +
    '</div>' +
    '<div style="flex:1;min-width:220px">' +
      bucketCfg.map(b => {
        const cnt = buckets[b.key].length;
        const pct = Math.max(2, cnt / maxB * 100);
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px">' +
          '<div style="width:78px;font-size:11px;color:' + b.color + ';font-weight:600;flex-shrink:0">' + b.label + '</div>' +
          '<div style="flex:1;height:7px;background:var(--border);border-radius:4px;overflow:hidden">' +
            '<div style="height:100%;width:' + pct + '%;background:' + b.color + ';border-radius:4px;transition:.4s"></div>' +
          '</div>' +
          '<div style="width:24px;font-size:11.5px;font-weight:700;text-align:right;color:#333">' + cnt + '</div>' +
        '</div>';
      }).join('') +
    '</div>' +
  '</div>';

  const topLeads = [...buckets.hot, ...buckets.warm].sort((a, b) => b._score - a._score).slice(0, 5);
  if (topLeads.length) {
    html += '<div style="font-size:11.5px;font-weight:700;color:var(--textm);margin-bottom:8px;padding-top:12px;border-top:1px solid var(--border)">Top Priority Leads</div>';
    html += topLeads.map(l => {
      const hl = WanagoAI.heatLabel(l._score);
      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f4f4f4;cursor:pointer" onclick="goTo(\'leads\')">' +
        '<div style="flex:1">' +
          '<div style="font-size:12.5px;font-weight:600">' + (l.name||'Lead') + '</div>' +
          '<div style="font-size:10.5px;color:#888">' + (l.destination||'—') + ' · ' + (l.agent||'Unassigned') + '</div>' +
        '</div>' +
        '<span style="font-size:10.5px;font-weight:700;color:' + hl.color + ';background:' + hl.bg + ';padding:2px 8px;border-radius:6px">' + hl.label + '</span>' +
        '<span style="font-size:11px;font-weight:800;color:' + hl.color + ';min-width:24px;text-align:right">' + l._score + '</span>' +
      '</div>';
    }).join('');
  }
  el.innerHTML = html;
}

// ══════ 6. QUOTATIONS FUNNEL ══════
function renderQuotationsReport(from, to) {
  const statsEl = document.getElementById('rep-quot-stats');
  const funnelEl = document.getElementById('rep-quot-funnel');
  if (!statsEl || !funnelEl) return;

  const quots = hScoped('quotations').filter(q => inRange(q.createdAt || q.date, from, to));
  const total = quots.length;
  const sent = quots.filter(q => q.status === 'sent' || q.status === 'draft' || !q.status).length;
  const accepted = quots.filter(q => q.status === 'accepted').length;
  const converted = quots.filter(q => q.status === 'converted').length;
  const expired = quots.filter(q => q.status === 'expired').length;
  const totalVal = quots.reduce((s, q) => s + Number(q.grandTotal || q.amount || 0), 0);
  const convRate = total ? ((converted / total) * 100).toFixed(1) : 0;
  const avgVal = total ? Math.round(totalVal / total) : 0;

  statsEl.innerHTML = [
    { l: 'Total Quotes', v: total, c: '' },
    { l: 'Accepted', v: accepted, c: 'stat-up' },
    { l: 'Converted', v: converted, c: 'stat-up' },
    { l: 'Conv. Rate', v: convRate + '%', c: Number(convRate) >= 30 ? 'stat-up' : '' },
  ].map(s => `<div class="stat-card" style="padding:10px 12px"><div class="stat-label" style="font-size:10.5px">${s.l}</div><div class="stat-val ${s.c}" style="font-size:18px">${s.v}</div></div>`).join('');

  const stages = [
    { label: 'Sent',      count: sent,      color: 'var(--blue)' },
    { label: 'Accepted',  count: accepted,  color: 'var(--g500)' },
    { label: 'Converted', count: converted, color: 'var(--g700)' },
    { label: 'Expired',   count: expired,   color: 'var(--red)'  },
  ];
  const maxC = Math.max(...stages.map(s => s.count), 1);

  funnelEl.innerHTML = `<div style="font-size:10.5px;color:var(--textd);margin-bottom:10px">Avg value: <strong>${formatMoney(avgVal)}</strong> · Total: <strong>${formatMoney(totalVal)}</strong></div>` +
    stages.map(s => {
      const pct = Math.max(3, (s.count / maxC) * 100);
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
          <span>${s.label}</span><span style="font-weight:700">${s.count}</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${s.color};border-radius:4px;transition:.4s"></div>
        </div>
      </div>`;
    }).join('') +
    (total ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--textd)">
      Drop-off: ${total - converted} quotes did not convert (${(100 - Number(convRate)).toFixed(1)}%)
    </div>` : '');
}

// ══════ 7. PACKAGE REVENUE ══════
function renderPackageReport(from, to) {
  const el = document.getElementById('rep-packages');
  if (!el) return;

  const bookings = hScoped('bookings').filter(b => inRange(b.createdAt, from, to));
  const pkgMap = {};
  bookings.forEach(b => {
    if (!b.packageId) return;
    if (!pkgMap[b.packageId]) pkgMap[b.packageId] = { revenue: 0, count: 0 };
    pkgMap[b.packageId].revenue += Number(b.totalAmount || b.total || 0);
    pkgMap[b.packageId].count++;
  });

  const pkgs = hScoped('packages');
  const rows = pkgs
    .filter(p => pkgMap[p.id])
    .map(p => ({ name: p.name, dest: p.destination, ...pkgMap[p.id] }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  if (!rows.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--textd);font-size:12px">No package bookings in this period</div>';
    return;
  }

  const maxR = Math.max(...rows.map(r => r.revenue), 1);
  const colors = ['var(--g600)', 'var(--blue)', 'var(--amb)', '#7c3aed', 'var(--g400)', 'var(--red)', 'var(--g700)', '#e91e8c'];

  el.innerHTML = rows.map((r, i) => {
    const pct = Math.max(3, (r.revenue / maxR) * 100);
    return `<div style="margin-bottom:9px">
      <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
        <span style="font-weight:600">📦 ${r.name} <span style="font-weight:400;color:var(--textd)">· ${r.dest||''}</span></span>
        <span style="font-weight:700">${formatMoney(r.revenue)} <span style="color:var(--textd);font-weight:400">(${r.count} bk)</span></span>
      </div>
      <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${colors[i%colors.length]};border-radius:4px;transition:.4s"></div>
      </div>
    </div>`;
  }).join('');
}

// ══════ 8. P&L STATEMENT ══════
function renderPLStatement(from, to) {
  const el = document.getElementById('rep-pl-content'); if (!el) return;
  const payments = hScoped('payments').filter(p => inRange(p.date, from, to) && p.status === 'completed');
  const expenses = hScoped('expenses').filter(e => inRange(e.date, from, to));
  const bookings = hScoped('bookings').filter(b => inRange(b.date || b.createdAt, from, to) && b.status === 'Cancelled');

  const totalRevenue  = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
  const totalRefunds  = bookings.reduce((s, b) => s + Number(b.cancellation?.refundAmount || 0), 0);
  const grossProfit   = totalRevenue - totalRefunds;
  const netProfit     = grossProfit - totalExpenses;
  const margin        = grossProfit > 0 ? ((netProfit / grossProfit) * 100).toFixed(1) : 0;
  const profitColor   = netProfit >= 0 ? 'var(--g700)' : 'var(--red)';

  const row = (label, value, bold, color) =>
    `<tr style="${bold ? 'font-weight:700;border-top:2px solid var(--border)' : ''}">
      <td style="padding:9px 14px;font-size:13px;color:var(--textm)">${label}</td>
      <td style="padding:9px 14px;font-size:13px;text-align:right;font-weight:${bold?'700':'500'};color:${color||'var(--text)'}">${formatMoney(value)}</td>
      <td style="padding:9px 14px;font-size:12px;text-align:right;color:var(--textd)">${grossProfit>0?Math.round(Math.abs(value)/grossProfit*100)+'%':''}</td>
    </tr>`;

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px">
      ${[
        {l:'Revenue Collected', v:formatMoney(totalRevenue), c:'var(--g700)'},
        {l:'Total Expenses',    v:formatMoney(totalExpenses), c:'var(--red)'},
        {l:'Net Profit / Loss', v:formatMoney(netProfit),    c:profitColor},
        {l:'Profit Margin',     v:margin+'%',                c:Number(margin)>=20?'var(--g700)':Number(margin)>=0?'var(--amb)':'var(--red)'},
      ].map(s=>`<div style="background:var(--cream);border-radius:10px;padding:14px 16px">
        <div style="font-size:11px;color:var(--textd);margin-bottom:5px">${s.l}</div>
        <div style="font-size:22px;font-weight:800;color:${s.c}">${s.v}</div>
      </div>`).join('')}
    </div>
    <div style="overflow-x:auto;border:1px solid var(--border);border-radius:10px">
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:var(--cream)">
          <th style="padding:9px 14px;text-align:left;font-size:11px;color:var(--textd);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Item</th>
          <th style="padding:9px 14px;text-align:right;font-size:11px;color:var(--textd);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Amount</th>
          <th style="padding:9px 14px;text-align:right;font-size:11px;color:var(--textd);font-weight:600;text-transform:uppercase;letter-spacing:.5px">% of Revenue</th>
        </tr></thead>
        <tbody>
          ${row('Revenue from Payments', totalRevenue, false, 'var(--g700)')}
          ${totalRefunds ? row('Less: Cancellation Refunds', -totalRefunds, false, 'var(--red)') : ''}
          ${row('Gross Revenue', grossProfit, true, 'var(--g700)')}
          ${row('Total Expenses', totalExpenses, false, 'var(--red)')}
          ${row('Net Profit / Loss', netProfit, true, profitColor)}
        </tbody>
      </table>
    </div>`;
}

// ══════ 9. CASHFLOW ══════
function renderCashflow(from, to) {
  const el = document.getElementById('rep-cashflow-chart'); if (!el) return;
  const payments = hScoped('payments').filter(p => p.status === 'completed' && p.date);
  const expenses = hScoped('expenses').filter(e => e.date);

  const months = {};
  const ensure = m => { if (!months[m]) months[m] = { in:0, out:0 }; };

  payments.forEach(p => { const m=p.date.slice(0,7); ensure(m); months[m].in += Number(p.amount||0); });
  expenses.forEach(e => { const m=e.date.slice(0,7); ensure(m); months[m].out += Number(e.amount||0); });

  const keys = Object.keys(months).sort().slice(-12);
  if (!keys.length) { el.innerHTML='<div style="text-align:center;padding:30px;color:var(--textd)">No cashflow data yet</div>'; return; }

  const maxVal = Math.max(...keys.flatMap(k=>[months[k].in, months[k].out]), 1);

  el.innerHTML = `<div style="display:flex;align-items:flex-end;gap:8px;height:180px;padding-bottom:22px;overflow-x:auto">` +
    keys.map(k => {
      const m = months[k];
      const net = m.in - m.out;
      const inPct  = Math.max(3, (m.in  / maxVal) * 100);
      const outPct = Math.max(3, (m.out / maxVal) * 100);
      const label  = new Date(k+'-01').toLocaleDateString('en-IN',{month:'short',year:'2-digit'});
      const netClr = net >= 0 ? 'var(--g700)' : 'var(--red)';
      return `<div style="flex:1;min-width:48px;display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="font-size:9px;color:${netClr};font-weight:700;margin-bottom:1px">${net>=0?'+':''}${formatMoney(net)}</div>
        <div style="width:100%;display:flex;gap:3px;align-items:flex-end;height:130px">
          <div style="flex:1;background:var(--g500);border-radius:3px 3px 0 0;height:${inPct}%;min-height:3px;opacity:.85" title="Cash In: ${formatMoney(m.in)}"></div>
          <div style="flex:1;background:var(--red);border-radius:3px 3px 0 0;height:${outPct}%;min-height:3px;opacity:.75" title="Cash Out: ${formatMoney(m.out)}"></div>
        </div>
        <div style="font-size:9px;color:var(--textd)">${label}</div>
      </div>`;
    }).join('') +
  `</div>
  <div style="display:flex;gap:16px;justify-content:center;margin-top:6px">
    <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--textd)"><div style="width:10px;height:10px;background:var(--g500);border-radius:2px;opacity:.85"></div>Cash In</div>
    <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--textd)"><div style="width:10px;height:10px;background:var(--red);border-radius:2px;opacity:.75"></div>Cash Out</div>
    <div style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--textd)"><div style="width:10px;height:10px;background:var(--g700);border-radius:2px"></div>Net (label)</div>
  </div>`;
}

// ══════ 10. EXPENSE BREAKDOWN ══════
function renderExpenseBreakdown(from, to) {
  const el = document.getElementById('rep-expense-breakdown'); if (!el) return;
  const expenses = hScoped('expenses').filter(e => inRange(e.date, from, to));
  if (!expenses.length) { el.innerHTML='<div style="text-align:center;padding:24px;color:var(--textd);font-size:12px">No expense data for this period</div>'; return; }

  const cats = {};
  expenses.forEach(e => {
    const c = e.category || e.type || 'Uncategorised';
    if (!cats[c]) cats[c] = 0;
    cats[c] += Number(e.amount || 0);
  });

  const total  = Object.values(cats).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const maxV   = Math.max(...sorted.map(s => s[1]), 1);
  const clrs   = ['var(--red)','var(--amb)','#7c3aed','var(--blue)','var(--g500)','#e91e8c','var(--g700)','#aaa'];

  el.innerHTML = `<div style="font-size:11.5px;color:var(--textd);margin-bottom:12px;font-weight:600">Total: ${formatMoney(total)}</div>` +
    sorted.map(([cat, val], i) => {
      const pct     = Math.max(3, (val / maxV) * 100);
      const sharePct = Math.round((val / total) * 100);
      return `<div style="margin-bottom:9px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
          <span style="color:var(--textm)">${cat}</span>
          <span style="font-weight:700">${formatMoney(val)} <span style="color:var(--textd);font-weight:400">(${sharePct}%)</span></span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${clrs[i%clrs.length]};border-radius:4px;transition:.4s"></div>
        </div>
      </div>`;
    }).join('');
}

// ══════ 11. REVENUE FORECAST ══════
function renderRevenueForecast(from, to) {
  const el = document.getElementById('rep-revenue-forecast'); if (!el) return;
  const today = new Date().toISOString().slice(0,10);

  // Upcoming confirmed bookings (future departure dates)
  const upcoming = hScoped('bookings').filter(b =>
    b.status === 'Confirmed' && b.date && b.date >= today
  ).sort((a, b) => a.date < b.date ? -1 : 1);

  if (!upcoming.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--textd);font-size:12px">No upcoming confirmed bookings</div>';
    return;
  }

  // Group by month
  const months = {};
  upcoming.forEach(b => {
    const m = b.date.slice(0, 7);
    if (!months[m]) months[m] = { count:0, expected:0, bookings:[] };
    const amt = Number(b.amount || b.totalAmount || 0);
    months[m].count++;
    months[m].expected += amt;
    months[m].bookings.push(b);
  });

  const keys    = Object.keys(months).sort().slice(0, 6);
  const totalFc = Object.values(months).reduce((s, m) => s + m.expected, 0);
  const maxV    = Math.max(...keys.map(k => months[k].expected), 1);

  el.innerHTML = `<div style="font-size:11.5px;color:var(--textd);margin-bottom:12px">
    <strong style="color:var(--g700);font-size:13px">${formatMoney(totalFc)}</strong> expected from ${upcoming.length} upcoming bookings
  </div>` +
    keys.map(k => {
      const m     = months[k];
      const pct   = Math.max(3, (m.expected / maxV) * 100);
      const label = new Date(k+'-01').toLocaleDateString('en-IN',{month:'short', year:'numeric'});
      return `<div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px">
          <span style="font-weight:600">${label}</span>
          <span style="font-weight:700;color:var(--g700)">${formatMoney(m.expected)} <span style="color:var(--textd);font-weight:400">(${m.count} bk)</span></span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:var(--g500);border-radius:4px;transition:.4s"></div>
        </div>
      </div>`;
    }).join('') +
    `<div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--textd)">
      Based on booking amounts of confirmed trips. Amounts marked TBD excluded.
    </div>`;
}

// ══════ 12. OUTSTANDING COLLECTIONS ══════
function renderOutstandingCollections(from, to) {
  const el = document.getElementById('rep-outstanding'); if (!el) return;

  // Bookings with pending dues (pendingAmount > 0 or status = Confirmed and unpaid)
  const bookings = hScoped('bookings').filter(b =>
    b.status !== 'Cancelled' &&
    (Number(b.pendingAmount || 0) > 0 || (b.status === 'Confirmed' && !b.isPaid && b.amount && b.amount !== 'TBD'))
  );

  if (!bookings.length) {
    el.innerHTML = '<div style="text-align:center;padding:24px;color:var(--textd);font-size:12px">No outstanding collections — all cleared!</div>';
    return;
  }

  const total = bookings.reduce((s, b) => {
    const due = Number(b.pendingAmount || b.amount || 0);
    return s + due;
  }, 0);

  const today = new Date().toISOString().slice(0,10);
  const sortedBk = [...bookings].sort((a, b) => (a.date||'') < (b.date||'') ? -1 : 1);

  el.innerHTML = `<div style="font-size:12px;color:var(--textd);margin-bottom:12px">
    <strong style="color:var(--red);font-size:14px">${formatMoney(total)}</strong> outstanding across <strong>${bookings.length}</strong> booking${bookings.length!==1?'s':''}
  </div>
  <div style="overflow-x:auto;border:1px solid var(--border);border-radius:10px">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="background:var(--cream)">
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--textd);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Booking</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--textd);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Customer</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--textd);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Package</th>
        <th style="padding:8px 12px;text-align:right;font-size:11px;color:var(--textd);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Amount Due</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--textd);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Dep. Date</th>
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:var(--textd);font-weight:600;text-transform:uppercase;letter-spacing:.5px">Status</th>
      </tr></thead>
      <tbody>${sortedBk.map(b => {
        const due = Number(b.pendingAmount || b.amount || 0);
        const isOverdue = b.date && b.date < today;
        const statusCl  = isOverdue ? 'color:var(--red);font-weight:700' : 'color:var(--amb);font-weight:600';
        return `<tr style="border-bottom:1px solid var(--border)">
          <td style="padding:9px 12px;font-size:12.5px;font-weight:700;color:var(--g700)">${b.id||b.ref||'—'}</td>
          <td style="padding:9px 12px;font-size:12.5px">${b.customer||b.customerName||'—'}</td>
          <td style="padding:9px 12px;font-size:12.5px;color:var(--textd)">${b.pkg||b.packageName||'—'}</td>
          <td style="padding:9px 12px;font-size:13px;font-weight:700;text-align:right;color:var(--red)">${formatMoney(due)}</td>
          <td style="padding:9px 12px;font-size:12px">${b.date ? new Date(b.date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</td>
          <td style="padding:9px 12px;font-size:12px;${statusCl}">${isOverdue ? '🔴 Overdue' : '🟡 Due'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;
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

initPage(function() {
  initReports();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      // Re-render reports with fresh Firestore data
      if (typeof renderAllReports === 'function') renderAllReports();
      // Subscribe to all relevant collections
      if (typeof dbSubscribe === 'function') {
        var reRender = function() {
          if (typeof renderAllReports === 'function') renderAllReports();
        };
        dbSubscribe('bookings',  reRender);
        dbSubscribe('payments',  reRender);
        dbSubscribe('leads',     reRender);
        dbSubscribe('customers', reRender);
        dbSubscribe('expenses',  reRender);
        dbSubscribe('invoices',  reRender);
      }
    }, 5000);
  }
});
