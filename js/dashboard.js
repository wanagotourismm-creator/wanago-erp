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

// ── Main Dashboard render ──
function renderDashboard() {
  try {
    var s = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
    var name = (window.currentUser && window.currentUser.name) || s.name || (s.email ? s.email.split('@')[0].replace(/[._-]/g,' ').replace(/\b\w/g,function(c){return c.toUpperCase();}) : 'User');
    renderGreeting(name);
    renderStats();
    renderRevenueChart();
    renderPipeline();
    renderInsights();
    renderAIRecs();
    renderTopPerformers();
    renderDeparting();
    renderActivityFeed();
    renderForecast();
  } catch(e) { console.error('Dashboard render error:', e); }
}

// ── Greeting ──
function renderGreeting(name) {
  const h = new Date().getHours();
  let icon = '🌅', text = 'Good Morning';
  if (h >= 12 && h < 17) { icon = '☀️'; text = 'Good Afternoon'; }
  else if (h >= 17 && h < 21) { icon = '🌆'; text = 'Good Evening'; }
  else if (h >= 21) { icon = '🌙'; text = 'Good Night'; }
  const quotes = [
    "Every journey begins with a single booking.",
    "Travel is the only thing you buy that makes you richer.",
    "The world is a book. Help your clients read more pages.",
    "Great trips start with great planning.",
    "Your passion for travel changes lives."
  ];
  const quote = quotes[new Date().getDate() % quotes.length];
  const gt = document.getElementById('dash-greet-text');
  const gq = document.getElementById('dash-greet-quote');
  if (gt) gt.textContent = `${icon} ${text}, ${name}!`;
  if (gq) gq.textContent = `"${quote}"`;
  function tick() {
    const el = document.getElementById('dash-greet-time');
    if (el) el.textContent = new Date().toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }
  tick();
  setInterval(tick, 1000);
}

// ── Stats ──
function renderStats() {
  try {
    const totalRevenue = hScoped('payments').filter(p=>p.status==='completed').reduce((s,p)=>s+Number(p.amount||0),0);
    const pendingDues = hScoped('bookings').filter(b=>b.status!=='cancelled').reduce((s,b)=>s+Number(b.pendingAmount||0),0);
    const activeLeads = hScoped('leads').filter(l=>!['won','lost'].includes(l.stage)).length;
    const confirmedBookings = hScoped('bookings').filter(b=>b.status==='confirmed').length;
    const wonLeads = hScoped('leads').filter(l=>l.stage==='won').length;
    const totalLeads = hScoped('leads').length;
    const cvr = totalLeads ? ((wonLeads/totalLeads)*100).toFixed(1) : 0;
    const overdueCount = hScoped('invoices').filter(i=>i.status==='overdue').length;
    const el = document.getElementById('dash-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="stat-card" style="cursor:pointer" onclick="goTo('payments')">
        <div class="stat-label">💰 Total Revenue</div><div class="stat-val">${formatMoney(totalRevenue)}</div>
        <div class="stat-meta">Click to view payments</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="goTo('leads')">
        <div class="stat-label">🎯 Active Leads</div><div class="stat-val">${activeLeads}</div>
        <div class="stat-meta stat-up">${cvr}% conversion rate</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="goTo('bookings')">
        <div class="stat-label">🗓️ Confirmed Bookings</div><div class="stat-val">${confirmedBookings}</div>
        <div class="stat-meta">${hScoped('bookings').length} total</div>
      </div>
      <div class="stat-card" style="cursor:pointer" onclick="goTo('invoices')">
        <div class="stat-label">⚠️ Pending Dues</div><div class="stat-val stat-dn">${formatMoney(pendingDues)}</div>
        <div class="stat-meta stat-dn">${overdueCount} overdue invoice${overdueCount!==1?'s':''}</div>
      </div>`;
  } catch(e) { console.warn('Stats error:', e); }
}

// ── Revenue Chart ──
function renderRevenueChart() {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const rev = Array(12).fill(0);
  try { hScoped('payments').filter(p=>p.status==='completed').forEach(p => { if(p.date) rev[new Date(p.date).getMonth()] += Number(p.amount||0); }); } catch(e) {}
  const maxR = Math.max(...rev, 1);
  const el = document.getElementById('revenue-chart');
  if (!el) return;
  el.innerHTML = rev.map((v,i) => `
    <div class="bar-col">
      <div class="bar-col-inner"><div class="bar-rect" style="height:${Math.max(4,(v/maxR)*100)}%;background:${v>0?'var(--g500)':'var(--g100)'}"></div></div>
      <div class="bar-lbl">${months[i]}</div>
    </div>`).join('');
}

// ── Pipeline ──
function renderPipeline() {
  const stages = ['new','contacted','follow_up','quoted','negotiation','won','lost'];
  const colors = {new:'var(--g200)',contacted:'var(--g300)',follow_up:'var(--g400)',quoted:'var(--g500)',negotiation:'var(--amb)',won:'var(--g700)',lost:'var(--red)'};
  const counts = {};
  stages.forEach(s => counts[s] = hScoped('leads').filter(l=>l.stage===s).length);
  const maxS = Math.max(...Object.values(counts), 1);
  const el = document.getElementById('pipeline-funnel');
  if (!el) return;
  el.innerHTML = stages.map(s => `
    <div class="funnel-row" style="cursor:pointer" onclick="goTo('leads')">
      <div class="funnel-label">${s.replace('_',' ')}</div>
      <div class="funnel-track"><div class="funnel-fill" style="width:${Math.max(4,(counts[s]/maxS)*100)}%;background:${colors[s]}">${counts[s]||''}</div></div>
      <div class="funnel-count">${counts[s]}</div>
    </div>`).join('');
}

// ── AI Insights strip ──
function renderInsights() {
  const el = document.getElementById('dash-insights');
  if (!el || !window.WanagoAI) return;
  const insights = WanagoAI.generateInsights();
  if (!insights.length) { el.style.display = 'none'; return; }
  el.style.display = 'grid';
  const typeStyle = {
    success: { bg:'#f0faf4', bdr:'#2ecc71', txt:'#1a7a4a' },
    warning: { bg:'#fff8f0', bdr:'#f39c12', txt:'#b7770d' },
    danger:  { bg:'#fff0f0', bdr:'#e74c3c', txt:'#c0392b' },
    info:    { bg:'#f0f7ff', bdr:'#3498db', txt:'#1565c0' },
  };
  el.innerHTML = insights.map(ins => {
    const st = typeStyle[ins.type] || typeStyle.info;
    return `<div style="background:${st.bg};border:1px solid ${st.bdr}30;border-left:3px solid ${st.bdr};border-radius:10px;padding:11px 13px;display:flex;align-items:flex-start;gap:9px;cursor:pointer;transition:.1s" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'" onclick="goTo('${ins.actionPage}')">
      <span style="font-size:18px;flex-shrink:0;line-height:1.3">${ins.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:700;color:${st.txt};line-height:1.3">${ins.title}</div>
        <div style="font-size:11px;color:#666;margin-top:3px;line-height:1.4">${ins.detail}</div>
      </div>
      <span style="font-size:10.5px;color:${st.txt};border:1px solid ${st.bdr}50;border-radius:6px;padding:2px 8px;white-space:nowrap;flex-shrink:0;margin-top:1px">${ins.action} →</span>
    </div>`;
  }).join('');
}

// ── AI Recommendations ──
function renderAIRecs() {
  const el = document.getElementById('ai-recs');
  if (!el || !window.WanagoAI) return;
  const recs = WanagoAI.getRecommendations();
  if (!recs.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:12.5px">✅ No urgent actions right now</div>';
    return;
  }
  const priColor = { high:'#e74c3c', medium:'#f39c12', low:'#3498db' };
  el.innerHTML = recs.map(r => {
    const c = priColor[r.priority] || '#666';
    return `<div style="border-left:3px solid ${c};padding:10px 12px;margin-bottom:8px;background:#fafafa;border-radius:0 8px 8px 0;cursor:pointer" onclick="goTo('${r.actionPage}')">
      <div style="display:flex;align-items:center;gap:7px;margin-bottom:5px">
        <span style="font-size:16px">${r.icon}</span>
        <span style="font-size:12.5px;font-weight:700;color:#111;flex:1">${r.title}</span>
        <span style="font-size:9.5px;color:${c};font-weight:700;text-transform:uppercase;background:${c}18;border-radius:4px;padding:1px 6px">${r.priority}</span>
      </div>
      <ul style="margin:0;padding-left:18px;font-size:11.5px;color:#555;line-height:1.7">
        ${r.items.map(i => `<li>${i}</li>`).join('')}
      </ul>
    </div>`;
  }).join('');
}

// ── Top Performers ──
function renderTopPerformers() {
  const el = document.getElementById('top-performers');
  if (!el || !window.WanagoAI) return;
  const perf = WanagoAI.getTopPerformers();
  if (!perf.length) {
    el.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:12.5px">No performance data yet</div>';
    return;
  }
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  el.innerHTML = `<table style="width:100%;border-collapse:collapse;font-size:12px">
    <thead><tr style="color:#aaa;font-size:10.5px;text-transform:uppercase;letter-spacing:.5px">
      <th style="padding:6px 8px;text-align:left;font-weight:600">#</th>
      <th style="padding:6px 8px;text-align:left;font-weight:600">Agent</th>
      <th style="padding:6px 8px;text-align:right;font-weight:600">Won</th>
      <th style="padding:6px 8px;text-align:right;font-weight:600">Revenue (MTD)</th>
    </tr></thead>
    <tbody>
      ${perf.map((p, i) => `<tr style="border-top:1px solid #f0f0f0">
        <td style="padding:7px 8px">${medals[i] || i + 1}</td>
        <td style="padding:7px 8px;font-weight:600;color:#111">${p.name}</td>
        <td style="padding:7px 8px;text-align:right;color:#2a7a4f;font-weight:600">${p.won}</td>
        <td style="padding:7px 8px;text-align:right;font-weight:700;color:#111">₹${WanagoAI.fmt(p.revenue)}</td>
      </tr>`).join('')}
    </tbody>
  </table>`;
}

// ── Departing Soon ──
function renderDeparting() {
  const el = document.getElementById('departing-list');
  if (!el || !window.WanagoAI) return;
  const deps = WanagoAI.getUpcomingDepartures();
  if (!deps.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">✈️</div><div class="empty-title">No upcoming departures</div></div>';
    return;
  }
  const now = new Date();
  el.innerHTML = deps.map(b => {
    const diff  = Math.ceil((new Date(b.travelDate) - now) / 86400000);
    const badge = diff === 0 ? 'Today!' : diff === 1 ? 'Tomorrow' : `In ${diff} days`;
    const bc    = diff <= 1 ? '#e74c3c' : diff <= 3 ? '#f39c12' : '#2a7a4f';
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f4f4f4;cursor:pointer" onclick="goTo('bookings')">
      <span style="font-size:18px">✈️</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12.5px;font-weight:600;color:#111;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.customerName || 'Passenger'}</div>
        <div style="font-size:11px;color:#888">${b.destination || ''} · ${b.pax || 1} pax · ${b.ref || ''}</div>
      </div>
      <span style="font-size:10px;font-weight:700;color:${bc};background:${bc}18;border-radius:6px;padding:2px 8px;flex-shrink:0;white-space:nowrap">${badge}</span>
    </div>`;
  }).join('');
}

// ── Activity Feed ──
function renderActivityFeed() {
  const el = document.getElementById('activity-feed');
  if (!el) return;
  // Prefer Firestore activity_log, fall back to DB.activities
  const rawActs = (window.DB && window.DB.activities) ? window.DB.activities : [];
  const acts = rawActs.slice().sort(function(a,b){
    return new Date(b.ts||b.timestamp||b.time||0) - new Date(a.ts||a.timestamp||a.time||0);
  }).slice(0, 20);
  if (!acts.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No recent activity</div></div>';
    return;
  }
  const icons = { lead:'🎯', booking:'📅', payment:'💰', invoice:'🧾', customer:'👤', chat:'💬', login:'🔐', default:'📌' };
  el.innerHTML = acts.map(a => {
    const icon = icons[a.type] || icons.default;
    const d = new Date(a.ts || a.timestamp || a.time || Date.now());
    const ago = _timeAgo(d);
    return `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid #f4f4f4">
      <span style="font-size:13px;flex-shrink:0;margin-top:2px">${icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:12px;color:#222;line-height:1.4">${a.msg || a.message || ''}</div>
        <div style="font-size:10px;color:#bbb;margin-top:2px">${ago}</div>
      </div>
    </div>`;
  }).join('');
}

function _timeAgo(d) {
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function renderForecast() {
  const el = document.getElementById('dash-forecast'); if (!el || !window.WanagoAI) return;
  try {
    const { history, forecast, ema } = WanagoAI.forecastRevenue();
    const all = [...history, ...forecast];
    const maxVal = Math.max(...all.map(m => m.predicted || m.value || 0), 1);
    const confBadge = {
      high:   '<span style="font-size:9px;color:#1a7a4a;background:#f0faf4;border-radius:4px;padding:1px 5px;margin-left:4px">↑ High</span>',
      medium: '<span style="font-size:9px;color:#b7770d;background:#fff8f0;border-radius:4px;padding:1px 5px;margin-left:4px">~ Med</span>',
      low:    '<span style="font-size:9px;color:#888;background:#f4f4f4;border-radius:4px;padding:1px 5px;margin-left:4px">? Low</span>',
    };
    el.innerHTML =
      '<div style="display:flex;align-items:flex-end;gap:3px;height:80px;margin-bottom:8px;padding:0 2px">' +
        history.map(h =>
          '<div style="flex:1;display:flex;flex-direction:column;align-items:center">' +
            '<div title="₹' + h.value.toLocaleString('en-IN') + '" style="width:100%;background:var(--g400);border-radius:3px 3px 0 0;height:' + Math.max(4, Math.round((h.value / maxVal) * 72)) + 'px"></div>' +
          '</div>'
        ).join('') +
        forecast.map(f =>
          '<div style="flex:1;display:flex;flex-direction:column;align-items:center">' +
            '<div title="Forecast ₹' + f.predicted.toLocaleString('en-IN') + '" style="width:100%;background:var(--g100);border:1.5px dashed var(--g400);border-bottom:none;border-radius:3px 3px 0 0;height:' + Math.max(4, Math.round((f.predicted / maxVal) * 72)) + 'px"></div>' +
          '</div>'
        ).join('') +
      '</div>' +
      '<div style="display:flex;gap:3px;margin-bottom:14px;border-top:1px solid var(--border);padding-top:4px">' +
        history.map(h => '<div style="flex:1;text-align:center;font-size:9px;color:#aaa;overflow:hidden;white-space:nowrap">' + h.month + '</div>').join('') +
        forecast.map(f => '<div style="flex:1;text-align:center;font-size:9px;color:var(--g600);font-weight:600;overflow:hidden;white-space:nowrap">' + f.month + '</div>').join('') +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
        forecast.map(f =>
          '<div style="flex:1;min-width:120px;background:var(--cream);border:1px solid var(--border);border-radius:8px;padding:8px 10px">' +
            '<div style="font-size:12px;font-weight:700;color:var(--g700)">₹' + WanagoAI.fmt(f.predicted) + '</div>' +
            '<div style="font-size:10.5px;color:#888;margin-top:2px">' + f.month + (confBadge[f.confidence] || '') + '</div>' +
          '</div>'
        ).join('') +
      '</div>' +
      '<div style="font-size:10px;color:#bbb;padding-top:8px;border-top:1px solid #f4f4f4">EMA baseline: ₹' + WanagoAI.fmt(ema) + '/month · Based on 6-month payment history</div>';
  } catch (e) {
    el.innerHTML = '<div style="color:#bbb;text-align:center;padding:24px;font-size:12px">Forecast available after payment data is collected</div>';
  }
}

window.renderDashboard = renderDashboard;

// ── Wait for Firestore before first render ──
initPage(function() {
  // Show skeleton stats while loading
  var el = document.getElementById('dash-stats');
  if (el && !window._fsReady) {
    el.innerHTML = ['💰 Revenue','🎯 Leads','🗓️ Bookings','⚠️ Dues'].map(function(l) {
      return '<div class="stat-card"><div class="stat-label">'+l+'</div><div style="height:28px;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);border-radius:6px;animation:shimmer 1.5s infinite;background-size:200% 100%"></div></div>';
    }).join('');
    // Add shimmer CSS once
    if (!document.getElementById('shimmer-css')) {
      var s = document.createElement('style');
      s.id = 'shimmer-css';
      s.textContent = '@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}';
      document.head.appendChild(s);
    }
  }
  // Render immediately with whatever data is in cache
  renderDashboard();
  // Re-render after Firestore loads (if not already ready)
  if (!window._fsReady) {
    waitForFirestore(function() { renderDashboard(); }, 6000);
  }
});
