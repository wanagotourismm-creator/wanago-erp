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
    var name = (window.currentUser && window.currentUser.name) || s.name || 'Admin';
    renderGreeting(name);
    renderStats();
    renderRevenueChart();
    renderPipeline();
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

window.renderDashboard = renderDashboard;

initPage(renderDashboard);
