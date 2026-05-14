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


// ── Tab switching (new self-contained admin nav) ──
function admTab(name, el) {
  // Update nav items
  document.querySelectorAll('.adm-nav-item').forEach(function(n){n.classList.remove('active');});
  if (el && el.classList.contains('adm-nav-item')) {
    el.classList.add('active');
  } else {
    // Quick-action buttons pass themselves as el — find the real nav item by name
    var navItems = document.querySelectorAll('.adm-nav-item');
    for (var i = 0; i < navItems.length; i++) {
      if ((navItems[i].getAttribute('onclick') || '').indexOf("'" + name + "'") !== -1) {
        navItems[i].classList.add('active');
        break;
      }
    }
  }
  // Scroll content to top
  var cont = document.querySelector('.adm-content');
  if (cont) cont.scrollTop = 0;
  // Show correct tab
  document.querySelectorAll('.adm-tab').forEach(function(t){t.classList.remove('active');});
  var tab = document.getElementById('adm-tab-' + name);
  if (tab) tab.classList.add('active');
  // Update topbar title
  var titles = {
    overview:'⚙️ Admin Panel', company:'🏢 Company Settings', team:'👥 Team Members',
    offices:'🏢 Offices & Branches', settings:'⚙️ Settings', logins:'🔑 Team Logins',
    cloudsync:'☁️ Cloud Sync', activity:'📋 Activity Log', backup:'💾 Backup & Restore',
    integrations:'🔗 Integrations', attendance:'📅 Attendance & Leave',
    notifications:'🔔 Notifications', rbac:'🔒 Access Control'
  };
  var subs = {
    overview:'Overview & quick actions', company:'Company info, bank details, GST',
    team:'Manage staff and roles', offices:'Manage all office locations and view performance',
    settings:'Brand, PIN and preferences', logins:'Team login credentials',
    cloudsync:'Firebase Firestore sync', activity:'Full audit trail of all system actions',
    backup:'Backup and restore data', integrations:'Meta Ads · WhatsApp Business · Gmail — API credentials',
    attendance:'Daily attendance marking & leave management',
    notifications:'Send alerts & manage notification rules',
    rbac:'Role-based permissions for each team member'
  };
  var t = document.getElementById('adm-page-title');
  var s = document.getElementById('adm-page-sub');
  if (t) t.textContent = titles[name] || 'Admin Panel';
  if (s) s.textContent = subs[name] || '';
  // Render content
  if (name === 'overview')       { renderOverviewStats(); renderSetupChecklist(); }
  if (name === 'team')           { renderTeamMembers('all'); }
  if (name === 'offices')        { renderOfficesTab(); }
  if (name === 'activity')       { if (typeof renderActivityLog === 'function') renderActivityLog(); }
  if (name === 'attendance')     { if (typeof renderAttendanceTab === 'function') renderAttendanceTab(); }
  if (name === 'notifications')  { if (typeof renderNotificationsTab === 'function') renderNotificationsTab(); }
  if (name === 'rbac')           { if (typeof renderRBACTab === 'function') renderRBACTab(); }
  if (name === 'company')        { loadCompanySettings(); }
  if (name === 'settings')       { loadAllSettings(); }
  if (name === 'logins')         { renderTeamLogins(); }
  if (name === 'cloudsync')      { renderCloudSync(); }
  if (name === 'integrations')   { loadIntegrations(); }
}

// Keep old function as alias
function switchAdminTab(a,b) { admTab(b||a, null); }

// ── Delete member ──
function persistSettingsNow() {
  saveDB();
  if (typeof fsSaveSettings === 'function') fsSaveSettings();
}

function deleteMember(elOrId) { var id = (typeof elOrId === "string") ? elOrId : elOrId.dataset.id;
  var m = (DB.settings.team||[]).find(function(x){return x.id===id;});
  if (!m) return;
  if (currentUser && currentUser.id === id) { showToast('You cannot remove yourself','error'); return; }
  if (!confirm('Remove ' + m.name + ' from team?')) return;
  DB.settings.team = DB.settings.team.filter(function(x){return x.id!==id;});
  persistSettingsNow(); renderTeamMembers('all'); showToast(m.name + ' removed from team');
}

// ── Backup section ──
function renderBackupSection() {
  var el = document.getElementById('backup-info');
  if (el) el.textContent = 'Last backup: ' + (localStorage.getItem('wanago_last_backup') || 'Never');
}

function renderAdminPage() {
  // Set user info in admin sidebar
  var s = {};
  try { s = JSON.parse(sessionStorage.getItem('wanago_session')||'{}'); } catch(e) {}
  var name  = (window.currentUser && window.currentUser.name) || s.name || 'Admin';
  var email = s.email || '';
  var av = document.getElementById('adm-avatar');
  var un = document.getElementById('adm-name');
  var em = document.getElementById('adm-email');
  if (av) av.textContent = name[0].toUpperCase();
  if (un) un.textContent = name;
  if (em) em.textContent = email;
  // Render default tab
  loadCompanySettings();
  renderOverviewStats();
  renderSetupChecklist();
  renderOffices(); // update nav badge
}

// ══════ COMPANY SETTINGS ══════
function loadCompanySettings() {
  const s = DB.settings;
  const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val||''; };
  set('s-company', s.companyName); set('s-phone', s.phone); set('s-email', s.email);
  set('s-website', s.website); set('s-address', s.address);
  set('s-bank', s.bankName); set('s-acc', s.accountNo);
  set('s-ifsc', s.ifsc); set('s-upi', s.upi);
  set('s-gstin', s.gstin); set('s-state', s.state);
  const gr = document.getElementById('s-gstrate'); if(gr) gr.value = s.gstRate||5;
  const gt = document.getElementById('s-gsttype'); if(gt) gt.value = s.gstType||'cgst_sgst';
  syncGSTToggleUI(s.gstEnabled);
  renderOffices();
}

function saveSettings() {
  const s = DB.settings;
  const g = id => document.getElementById(id)?.value.trim()||'';
  s.companyName=g('s-company')||s.companyName; s.phone=g('s-phone'); s.email=g('s-email');
  s.website=g('s-website'); s.address=g('s-address');
  s.bankName=g('s-bank'); s.accountNo=g('s-acc'); s.ifsc=g('s-ifsc'); s.upi=g('s-upi');
  if (s.gstEnabled) { s.gstin=g('s-gstin'); s.gstRate=parseInt(document.getElementById('s-gstrate')?.value)||5; s.gstType=document.getElementById('s-gsttype')?.value||'cgst_sgst'; s.state=g('s-state'); }
  persistSettingsNow(); renderSetupChecklist(); showToast('Settings saved!');
}

function toggleGST() { DB.settings.gstEnabled = !DB.settings.gstEnabled; syncGSTToggleUI(DB.settings.gstEnabled); persistSettingsNow(); }
function syncGSTToggleUI(on) {
  const btn=document.getElementById('gst-toggle-btn'); const knob=document.getElementById('gst-toggle-knob'); const lbl=document.getElementById('gst-status-label'); const fields=document.getElementById('gst-fields');
  if(!btn)return; btn.style.background=on?'var(--g500)':'var(--border2)'; if(knob)knob.style.left=on?'20px':'2px'; if(lbl)lbl.textContent=on?'Enabled':'Disabled'; if(fields)fields.style.display=on?'':'none';
}

// ══════ OVERVIEW ══════
function renderOverviewStats() {
  const el = document.getElementById('admin-kpi-strip'); if(!el) return;
  const leads = hScoped('leads'); const bookings = hScoped('bookings'); const customers = hScoped('customers');
  const payments = hScoped('payments'); const team = DB.settings.team||[];
  const revenue = payments.filter(p=>p.status==='completed').reduce((s,p)=>s+Number(p.amount||0),0);
  const activeLeads = leads.filter(l=>!['won','lost'].includes(l.stage)).length;
  const confirmedBk = bookings.filter(b=>b.status==='confirmed').length;
  el.innerHTML = [
    {label:'Total Revenue',val:formatMoney(revenue),cls:'kpi-green',icon:'💰'},
    {label:'Active Leads',val:activeLeads,cls:'kpi-blue',icon:'🎯'},
    {label:'Bookings',val:confirmedBk+'/'+bookings.length,cls:'kpi-green',icon:'🗓'},
    {label:'Customers',val:customers.length,cls:'kpi-amber',icon:'👤'},
    {label:'Team Size',val:team.length,cls:'kpi-blue',icon:'👥'},
  ].map(k => '<div class="admin-kpi-card '+k.cls+'"><div style="font-size:18px;margin-bottom:4px">'+k.icon+'</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--textd);font-weight:600;margin-bottom:6px">'+k.label+'</div><div style="font-size:20px;font-weight:800;color:var(--text);font-family:DM Serif Display,serif">'+k.val+'</div></div>').join('');

  renderDataHealth();
}
window.renderDataHealth = renderDataHealth;

// ══════ DATA HEALTH DASHBOARD ══════
function renderDataHealth() {
  const el = document.getElementById('adm-data-health');
  if (!el) return;

  const leads     = hScoped('leads')     || [];
  const bookings  = hScoped('bookings')  || [];
  const customers = hScoped('customers') || [];
  const quotations = DB.quotations       || [];
  const invoices  = DB.invoices          || [];

  // Per-module scoring
  function pct(bad, total) { return total === 0 ? 100 : Math.max(0, Math.round((1 - bad/total) * 100)); }

  const leadsIssues   = leads.filter(l => !l.phone && !l.email).length;
  const leadsNoSrc    = leads.filter(l => !l.source).length;
  const leadScore     = pct(leadsIssues + leadsNoSrc * 0.5, leads.length || 1);

  const bkNoPhone     = bookings.filter(b => !b.customerPhone && b.status !== 'cancelled').length;
  const bkNoDate      = bookings.filter(b => !b.travelDate && b.status !== 'cancelled').length;
  const bkScore       = pct(bkNoPhone + bkNoDate * 0.5, bookings.length || 1);

  const custNoPhone   = customers.filter(c => !c.phone).length;
  const custNoEmail   = customers.filter(c => !c.email).length;
  const custNoCity    = customers.filter(c => !c.city).length;
  const custScore     = pct(custNoPhone + custNoEmail * 0.3 + custNoCity * 0.2, customers.length || 1);

  const todayDate = new Date(); todayDate.setHours(0,0,0,0);
  const quotExpired   = quotations.filter(q => {
    if (q.status !== 'sent') return false;
    const exp = new Date(q.createdAt); exp.setDate(exp.getDate() + (q.validDays||15));
    return exp < todayDate;
  }).length;
  const quotScore     = pct(quotExpired, quotations.length || 1);

  const invOverdue    = invoices.filter(i => i.status === 'overdue').length;
  const invScore      = pct(invOverdue, invoices.length || 1);

  const overall = typeof window.WanagoAI !== 'undefined'
    ? WanagoAI.dataHealthScore().score
    : Math.round((leadScore + bkScore + custScore + quotScore + invScore) / 5);

  const scoreColor = overall >= 80 ? '#16a34a' : overall >= 60 ? '#f59e0b' : '#dc2626';
  const scoreBg    = overall >= 80 ? '#f0fdf4' : overall >= 60 ? '#fffbeb' : '#fef2f2';
  const scoreLabel = overall >= 80 ? 'Healthy' : overall >= 60 ? 'Needs Attention' : 'Critical';
  const scoreIcon  = overall >= 80 ? '🟢' : overall >= 60 ? '🟡' : '🔴';

  // Collect actionable issues
  const issues = [];
  if (leadsIssues)   issues.push({ icon:'🎯', msg: leadsIssues+' lead'+(leadsIssues>1?'s':'')+' missing phone & email', page:'leads', cta:'Fix Leads' });
  if (leadsNoSrc)    issues.push({ icon:'🎯', msg: leadsNoSrc+' lead'+(leadsNoSrc>1?'s':'')+' without a source', page:'leads', cta:'Fix Leads' });
  if (bkNoPhone)     issues.push({ icon:'🗓', msg: bkNoPhone+' booking'+(bkNoPhone>1?'s':'')+' missing customer phone', page:'bookings', cta:'Fix Bookings' });
  if (bkNoDate)      issues.push({ icon:'🗓', msg: bkNoDate+' booking'+(bkNoDate>1?'s':'')+' missing travel date', page:'bookings', cta:'Fix Bookings' });
  if (custNoPhone)   issues.push({ icon:'👤', msg: custNoPhone+' customer'+(custNoPhone>1?'s':'')+' have no phone on file', page:'customers', cta:'Fix Customers' });
  if (custNoEmail)   issues.push({ icon:'👤', msg: custNoEmail+' customer'+(custNoEmail>1?'s':'')+' have no email address', page:'customers', cta:'Fix Customers' });
  if (quotExpired)   issues.push({ icon:'📋', msg: quotExpired+' quotation'+(quotExpired>1?'s':'')+' expired without conversion', page:'quotations', cta:'Review Quotes' });
  if (invOverdue)    issues.push({ icon:'🧾', msg: invOverdue+' invoice'+(invOverdue>1?'s':'')+' are overdue', page:'invoices', cta:'View Invoices' });

  // Module bar
  const modules = [
    { label:'Leads', score:leadScore, count:leads.length },
    { label:'Bookings', score:bkScore, count:bookings.length },
    { label:'Customers', score:custScore, count:customers.length },
    { label:'Quotations', score:quotScore, count:quotations.length },
    { label:'Invoices', score:invScore, count:invoices.length },
  ];

  const modBars = modules.map(m => {
    const c = m.score >= 80 ? '#16a34a' : m.score >= 60 ? '#f59e0b' : '#dc2626';
    return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">'+
      '<div style="width:80px;font-size:11.5px;font-weight:600;color:var(--textm);flex-shrink:0">'+m.label+'</div>'+
      '<div style="flex:1;height:7px;background:var(--border);border-radius:4px;overflow:hidden">'+
        '<div style="width:'+m.score+'%;height:100%;background:'+c+';border-radius:4px;transition:.5s"></div>'+
      '</div>'+
      '<div style="width:36px;text-align:right;font-size:11.5px;font-weight:700;color:'+c+';flex-shrink:0">'+m.score+'%</div>'+
      '<div style="width:32px;text-align:right;font-size:10px;color:var(--textd);flex-shrink:0">'+m.count+'</div>'+
    '</div>';
  }).join('');

  const issueItems = issues.slice(0, 6).map(i =>
    '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--cream);border:1px solid var(--border);border-radius:8px">'+
      '<span style="font-size:14px">'+i.icon+'</span>'+
      '<div style="flex:1;font-size:12px;color:var(--textm)">'+i.msg+'</div>'+
      '<button onclick="goTo(\''+i.page+'\')" style="font-size:10.5px;font-weight:700;padding:3px 10px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--g700);cursor:pointer;font-family:inherit;white-space:nowrap">'+i.cta+' →</button>'+
    '</div>'
  ).join('');

  el.innerHTML =
    '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;box-shadow:var(--sh)">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
        '<div style="font-size:13px;font-weight:700;color:var(--text)">🏥 Data Health Dashboard</div>'+
        '<button onclick="renderDataHealth()" style="font-size:11px;padding:4px 10px;border:1px solid var(--border);border-radius:6px;background:var(--cream);cursor:pointer;font-family:inherit;color:var(--textm)">↺ Refresh</button>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:140px 1fr;gap:20px;margin-bottom:'+(issues.length?'16px':'0')+'">'+
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;background:'+scoreBg+';border:2px solid '+scoreColor+'33;border-radius:12px;padding:16px 8px;text-align:center">'+
          '<div style="font-size:36px;font-weight:900;color:'+scoreColor+';font-family:DM Serif Display,serif;line-height:1">'+overall+'</div>'+
          '<div style="font-size:11px;font-weight:600;color:'+scoreColor+';margin:4px 0">/ 100</div>'+
          '<div style="font-size:12px;font-weight:700;color:'+scoreColor+'">'+scoreIcon+' '+scoreLabel+'</div>'+
          '<div style="font-size:10px;color:var(--textd);margin-top:4px">'+issues.length+' issue'+(issues.length!==1?'s':'')+' found</div>'+
        '</div>'+
        '<div style="padding-top:4px">'+
          '<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--textd);margin-bottom:10px">Module Breakdown</div>'+
          modBars+
        '</div>'+
      '</div>'+
      (issues.length ?
        '<div style="border-top:1px solid var(--border);padding-top:14px">'+
          '<div style="font-size:11px;font-weight:700;color:var(--textd);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">'+
            '⚠️ '+issues.length+' Issue'+(issues.length!==1?'s':'')+' Requiring Attention</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px">'+issueItems+'</div>'+
        '</div>'
      : '<div style="border-top:1px solid var(--border);padding-top:12px;text-align:center;font-size:12px;color:var(--g600);font-weight:600">✅ All modules look healthy!</div>')+
    '</div>';
}

// ══════ SETUP CHECKLIST ══════
function renderSetupChecklist() {
  const items = [
    {lbl:'Company name', done:!!DB.settings.companyName}, {lbl:'Phone number', done:!!DB.settings.phone},
    {lbl:'Bank details', done:!!DB.settings.bankName&&!!DB.settings.accountNo}, {lbl:'Office added', done:(DB.settings.offices||[]).length>0},
    {lbl:'Team member', done:(DB.settings.team||[]).length>0}, {lbl:'GST setup', done:!!DB.settings.gstEnabled},
  ];
  const done = items.filter(i=>i.done).length; const pct = Math.round((done/items.length)*100);
  const wrap = document.getElementById('admin-setup-checklist'); if(!wrap) return;
  if (pct===100) { wrap.style.display='none'; return; }
  wrap.style.display='block';
  document.getElementById('checklist-progress-bar').style.width = pct+'%';
  document.getElementById('checklist-progress-text').textContent = done+'/'+items.length+' complete';
  document.getElementById('checklist-items').innerHTML = items.map(i=>'<div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:'+(i.done?'var(--g50)':'#fff')+';border:1px solid '+(i.done?'var(--g200)':'var(--border)')+';border-radius:8px;font-size:12px;color:'+(i.done?'var(--g700)':'var(--textd)')+'">'+(i.done?'✅':'⬜')+' '+i.lbl+'</div>').join('');
}

// ══════ TEAM MEMBERS ══════
function renderTeamMembers(filter) {
  if(filter) _teamFilter=filter;
  const team = DB.settings.team||[];
  let members = _teamFilter==='all' ? team : team.filter(m=>m.dept===_teamFilter);
  const tbody = document.getElementById('team-tbody'); if(!tbody) return;
  if(!members.length) { tbody.innerHTML=emptyRow(8,'No team members found.'); return; }
  tbody.innerHTML = members.map(m => {
    const sr = ROLE_TO_SYSTEM_ROLE[m.role]||'employee';
    const srLabel = {founder_ceo:'👑 CEO',admin:'🔑 Admin',reporting_manager:'📊 Manager',employee:'👤 Agent'}[sr]||sr;
    return '<tr><td><div style="display:flex;align-items:center;gap:9px"><div style="width:32px;height:32px;border-radius:50%;background:'+(m.color||'var(--g600)')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">'+initials(m.name)+'</div><div><div style="font-weight:600">'+m.name+'</div><div style="font-size:10px;color:var(--textd)">'+(m.empId||'—')+'</div></div></div></td><td>'+(DEPT_LABELS[m.dept]||m.dept)+'</td><td>'+srLabel+'</td><td>'+(m.phone||'—')+'</td><td>'+(m.email||'—')+'</td><td>'+(m.officeId===OFFICE_ALL?'All Offices':(DB.settings.offices||[]).find(o=>o.id===m.officeId)?.name||'—')+'</td><td><button class="row-btn" onclick="editMember(\''+m.id+'\')">Edit</button></td></tr>';
  }).join('');
}

function filterTeam(f,el) { document.querySelectorAll('#adm-team .chip').forEach(c=>c.classList.remove('active')); if(el)el.classList.add('active'); renderTeamMembers(f); }


// ══════ PERMISSIONS SYSTEM ══════

const TM_PAGES = [
  { id:'dashboard',      label:'Dashboard',    icon:'📊' },
  { id:'leads',          label:'Leads',        icon:'🎯' },
  { id:'customers',      label:'Customers',    icon:'👤' },
  { id:'quotations',     label:'Quotations',   icon:'📋' },
  { id:'packages',       label:'Packages',     icon:'📦' },
  { id:'bookings',       label:'Bookings',     icon:'🗓️' },
  { id:'invoices',       label:'Invoices',     icon:'🧾' },
  { id:'payments',       label:'Payments',     icon:'💰' },
  { id:'reports',        label:'Reports',      icon:'📈' },
  { id:'hrms',           label:'HRMS',         icon:'👥' },
  { id:'whatsapp',       label:'WhatsApp',     icon:'💬' },
  { id:'incentives',     label:'Incentives',   icon:'🏆' },
  { id:'admin',          label:'Admin Panel',  icon:'⚙️'  },
  { id:'settings',       label:'Settings',     icon:'🔧' },
  { id:'team-accounts',  label:'Team Accounts',icon:'🔑' },
];

const TM_FEATURES = [
  { id:'add_lead',       label:'Add Leads',        icon:'➕' },
  { id:'edit_lead',      label:'Edit Any Lead',    icon:'✏️' },
  { id:'delete_lead',    label:'Delete Leads',     icon:'🗑️' },
  { id:'add_booking',    label:'Add Bookings',     icon:'➕' },
  { id:'edit_booking',   label:'Edit Any Booking', icon:'✏️' },
  { id:'delete_booking', label:'Delete Bookings',  icon:'🗑️' },
  { id:'view_payments',  label:'View Payments',    icon:'💰' },
  { id:'add_payment',    label:'Add Payments',     icon:'➕' },
  { id:'view_reports',   label:'View Reports',     icon:'📈' },
  { id:'export_data',    label:'Export Data',      icon:'📦' },
  { id:'manage_team',    label:'Manage Team',      icon:'👥' },
  { id:'view_all_leads', label:'View All Leads',   icon:'👁️' },
];

// Default permissions by role
const ROLE_DEFAULT_PERMS = {
  founder:            { pages: TM_PAGES.map(p=>p.id), features: TM_FEATURES.map(f=>f.id) },
  ceo:                { pages: TM_PAGES.map(p=>p.id), features: TM_FEATURES.map(f=>f.id) },
  admin:              { pages: TM_PAGES.map(p=>p.id), features: TM_FEATURES.map(f=>f.id) },
  branch_manager:     { pages: ['dashboard','leads','customers','quotations','packages','bookings','invoices','payments','reports','hrms','whatsapp','incentives','settings'], features: ['add_lead','edit_lead','add_booking','edit_booking','view_payments','add_payment','view_reports','export_data','view_all_leads'] },
  team_lead:          { pages: ['dashboard','leads','customers','quotations','packages','bookings','invoices','payments','reports','whatsapp','incentives'], features: ['add_lead','edit_lead','add_booking','edit_booking','view_payments','view_reports','view_all_leads'] },
  senior_manager:     { pages: ['dashboard','leads','customers','quotations','bookings','payments','reports','whatsapp'], features: ['add_lead','edit_lead','add_booking','view_payments','view_reports','view_all_leads'] },
  sales_manager:      { pages: ['dashboard','leads','customers','quotations','packages','bookings','whatsapp','incentives'], features: ['add_lead','edit_lead','add_booking','view_all_leads'] },
  operations_manager: { pages: ['dashboard','bookings','packages','customers','payments','invoices','reports'], features: ['add_booking','edit_booking','view_payments','view_reports'] },
  finance_manager:    { pages: ['dashboard','payments','invoices','bookings','reports'], features: ['view_payments','add_payment','view_reports','export_data'] },
  marketing_manager:  { pages: ['dashboard','leads','customers','whatsapp','reports'], features: ['add_lead','view_all_leads','view_reports','export_data'] },
};
const AGENT_DEFAULT = { pages: ['dashboard','leads','customers','quotations','bookings','whatsapp'], features: ['add_lead','add_booking','view_all_leads'] };

function renderPermissionsPanel(existingPerms) {
  const role = document.getElementById('tm-role')?.value || '';
  const defaults = ROLE_DEFAULT_PERMS[role] || AGENT_DEFAULT;
  const perms = existingPerms || defaults;

  // Pages
  const pagesEl = document.getElementById('tm-page-permissions');
  if (pagesEl) {
    pagesEl.innerHTML = TM_PAGES.map(p => {
      const allowed = perms.pages ? perms.pages.includes(p.id) : defaults.pages.includes(p.id);
      return `<label style="display:flex;align-items:center;gap:7px;padding:7px 10px;background:var(--cream);border:1px solid ${allowed?'var(--g200)':'var(--border)'};border-radius:8px;cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--g400)'" onmouseout="this.style.borderColor='${allowed?'var(--g200)':'var(--border)'}'">
        <input type="checkbox" id="perm-page-${p.id}" ${allowed?'checked':''} onchange="tmPermChanged(this)" style="width:14px;height:14px;accent-color:var(--g600);cursor:pointer">
        <span style="font-size:12px">${p.icon} ${p.label}</span>
      </label>`;
    }).join('');
  }

  // Features
  const featEl = document.getElementById('tm-feature-permissions');
  if (featEl) {
    featEl.innerHTML = TM_FEATURES.map(f => {
      const allowed = perms.features ? perms.features.includes(f.id) : defaults.features.includes(f.id);
      return `<label style="display:flex;align-items:center;gap:7px;padding:7px 10px;background:var(--cream);border:1px solid ${allowed?'var(--g200)':'var(--border)'};border-radius:8px;cursor:pointer;transition:.15s" onmouseover="this.style.borderColor='var(--g400)'" onmouseout="this.style.borderColor='${allowed?'var(--g200)':'var(--border)'}'">
        <input type="checkbox" id="perm-feat-${f.id}" ${allowed?'checked':''} onchange="tmPermChanged(this)" style="width:14px;height:14px;accent-color:var(--g600);cursor:pointer">
        <span style="font-size:12px">${f.icon} ${f.label}</span>
      </label>`;
    }).join('');
  }
}

function tmPermChanged(cb) {
  // Update border color of parent label
  const label = cb.closest('label');
  if (label) label.style.borderColor = cb.checked ? 'var(--g200)' : 'var(--border)';
}

function tmSetAllPermissions(allow) {
  document.querySelectorAll('#tm-page-permissions input, #tm-feature-permissions input').forEach(cb => {
    cb.checked = allow;
    const label = cb.closest('label');
    if (label) label.style.borderColor = allow ? 'var(--g200)' : 'var(--border)';
  });
}

function tmGetPermissions() {
  const pages = TM_PAGES.filter(p => document.getElementById('perm-page-'+p.id)?.checked).map(p=>p.id);
  const features = TM_FEATURES.filter(f => document.getElementById('perm-feat-'+f.id)?.checked).map(f=>f.id);
  return { pages, features };
}

function tmHasPermission(member, page) {
  if (!member) return false;
  // Founders and admins always have full access
  if (['founder','ceo','admin'].includes(member.role)) return true;
  // Check custom permissions
  if (member.permissions && member.permissions.pages) {
    return member.permissions.pages.includes(page);
  }
  // Fall back to role defaults
  const defaults = ROLE_DEFAULT_PERMS[member.role] || AGENT_DEFAULT;
  return defaults.pages.includes(page);
}

function tmHasFeature(member, feature) {
  if (!member) return false;
  if (['founder','ceo','admin'].includes(member.role)) return true;
  if (member.permissions && member.permissions.features) {
    return member.permissions.features.includes(feature);
  }
  const defaults = ROLE_DEFAULT_PERMS[member.role] || AGENT_DEFAULT;
  return (defaults.features||[]).includes(feature);
}

window.tmHasPermission = tmHasPermission;
window.tmHasFeature = tmHasFeature;
window.tmSetAllPermissions = tmSetAllPermissions;
window.tmPermChanged = tmPermChanged;

function openAddMemberModal() {
  document.getElementById('tm-edit-id').value=''; document.getElementById('tm-modal-title').textContent='Add Team Member';
  ['tm-name','tm-phone','tm-email','tm-empid','tm-joindate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('tm-dept').value=''; document.getElementById('tm-role').value='';
  // Render default permissions
  setTimeout(()=>renderPermissionsPanel(null),50);
  // Re-render permissions when role changes
  const roleEl=document.getElementById('tm-role'); if(roleEl) roleEl.onchange=()=>renderPermissionsPanel(null);
  // Populate office select
  const oSel=document.getElementById('tm-office'); if(oSel) oSel.innerHTML='<option value="*">All Offices</option>'+(DB.settings.offices||[]).map(o=>'<option value="'+o.id+'">'+o.name+'</option>').join('');
  // Populate manager select
  const mSel=document.getElementById('tm-manager'); if(mSel) mSel.innerHTML='<option value="">None (Top Level)</option>'+(DB.settings.team||[]).filter(m=>['founder','ceo','branch_manager','team_lead','senior_manager'].includes(m.role)).map(m=>'<option value="'+m.id+'">'+m.name+'</option>').join('');
  openModal('modal-add-member');
}

function editMember(elOrId) { var id = (typeof elOrId === "string") ? elOrId : elOrId.dataset.id;
  const m=(DB.settings.team||[]).find(x=>x.id===id); if(!m) return;
  openAddMemberModal();
  document.getElementById('tm-edit-id').value=id; document.getElementById('tm-modal-title').textContent='Edit Member';
  const s=(elId,val)=>{const el=document.getElementById(elId);if(el)el.value=val||'';};
  s('tm-name',m.name);s('tm-phone',m.phone);s('tm-email',m.email);s('tm-empid',m.empId);s('tm-dept',m.dept);s('tm-role',m.role);s('tm-office',m.officeId||'*');s('tm-manager',m.managerId);s('tm-joindate',m.joinDate);
  setTimeout(()=>{ renderPermissionsPanel(m.permissions||null); const roleEl=document.getElementById('tm-role'); if(roleEl) roleEl.onchange=()=>renderPermissionsPanel(null); },50);
}

function saveMember() {
  const editId=document.getElementById('tm-edit-id').value;
  const name=document.getElementById('tm-name').value.trim();
  const dept=document.getElementById('tm-dept').value;
  const role=document.getElementById('tm-role').value;
  if(!name||!dept||!role) { showError('tm-error','Name, department and role are required.'); return; }
  const fields = {name, phone:document.getElementById('tm-phone').value, email:document.getElementById('tm-email').value, empId:document.getElementById('tm-empid').value, dept, role, officeId:document.getElementById('tm-office').value||'*', managerId:document.getElementById('tm-manager').value, joinDate:document.getElementById('tm-joindate').value};
  fields.systemRole = ROLE_TO_SYSTEM_ROLE[role] || 'employee';
  const perms = tmGetPermissions();
  // Store as both .features (legacy) and .actions (new schema)
  fields.permissions = { pages: perms.pages, features: perms.features, actions: perms.features, sections: {} };
  if(editId) { const m=(DB.settings.team||[]).find(x=>x.id===editId); if(m)Object.assign(m,fields); showToast(name+' updated'); }
  else { const color=['#134a32','#1976d2','#f57c00','#7b1fa2','#c9a84c','#d32f2f','#00796b'][Math.floor(Math.random()*7)]; DB.settings.team.push({id:uid(),...fields,color,createdAt:new Date().toISOString()}); showToast(name+' added to team!'); }
  persistSettingsNow(); closeModal('modal-add-member'); renderTeamMembers(); renderSetupChecklist();
}

// ══════ OFFICES ══════

const _OFFICE_COLORS = ['#134a32','#1976d2','#f57c00','#7b1fa2','#c9a84c','#d32f2f','#00796b','#00838f'];

// Compact list shown in Company tab
function renderOffices() {
  const offices = DB.settings.offices || [];
  const el = document.getElementById('offices-list');
  if (!el) return;
  if (!offices.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textd)">No offices yet. Use the + Add Office button above.</div>'; return; }
  el.innerHTML = offices.map(o => {
    const color = o.color || _OFFICE_COLORS[0];
    const code = (o.code || 'OFC').slice(0,3).toUpperCase();
    const isActive = o.active !== false;
    const location = [o.city, o.state].filter(Boolean).join(', ') || o.address || '';
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:#fff;border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
      <div style="width:38px;height:38px;border-radius:10px;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px;flex-shrink:0">${code}</div>
      <div style="flex:1;min-width:0">
        <div style="font-weight:700;font-size:13px">${o.name}</div>
        <div style="font-size:11px;color:var(--textd)">${location || o.phone || 'No details'}</div>
      </div>
      <span class="pill ${isActive?'pill-green':'pill-red'}">${isActive?'Active':'Inactive'}</span>
      <button class="btn btn-sm btn-outline" onclick="editOffice('${o.id}')">Edit</button>
    </div>`;
  }).join('');
  // Update nav badge
  const badge = document.getElementById('offices-nav-badge');
  if (badge) badge.textContent = offices.length > 0 ? offices.length : '';
}

// Full offices management tab
function renderOfficesTab() {
  const offices = DB.settings.offices || [];
  const team = DB.settings.team || [];

  // KPI strip
  const kpiEl = document.getElementById('offices-kpi-strip');
  if (kpiEl) {
    const activeCount = offices.filter(o => o.active !== false).length;
    kpiEl.innerHTML = [
      { label:'Total Offices', val:offices.length,         icon:'🏢', cls:'kpi-green' },
      { label:'Active',        val:activeCount,            icon:'✅', cls:'kpi-green' },
      { label:'Inactive',      val:offices.length-activeCount, icon:'🔴', cls:'kpi-amber' },
      { label:'Total Team',    val:team.length,            icon:'👥', cls:'kpi-blue'  },
    ].map(k => `<div class="admin-kpi-card ${k.cls}"><div style="font-size:18px;margin-bottom:4px">${k.icon}</div><div style="font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:var(--textd);font-weight:600;margin-bottom:6px">${k.label}</div><div style="font-size:20px;font-weight:800;color:var(--text);font-family:'DM Serif Display',serif">${k.val}</div></div>`).join('');
  }

  // Office cards grid
  const gridEl = document.getElementById('offices-grid');
  if (!gridEl) return;
  if (!offices.length) {
    gridEl.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:56px;color:var(--textd)"><div style="font-size:48px;margin-bottom:14px">🏢</div><div style="font-size:15px;font-weight:700;color:var(--text);margin-bottom:6px">No offices added yet</div><div style="font-size:12.5px;margin-bottom:20px">Add your office locations to start assigning staff and tracking performance</div><button class="btn btn-primary" onclick="openAddOfficeModal()">+ Add First Office</button></div>`;
    return;
  }

  gridEl.innerHTML = offices.map((o, idx) => {
    const color = o.color || _OFFICE_COLORS[idx % _OFFICE_COLORS.length];
    const code = (o.code || 'OFC').slice(0, 3).toUpperCase();
    const isActive = o.active !== false;
    const location = [o.city, o.state].filter(Boolean).join(', ');
    const manager = team.find(m => m.id === o.managerId);
    const officeTeam = team.filter(m => m.officeId === o.id);
    const officeLeads = (DB.leads || []).filter(l => l.officeId === o.id).length;
    const officeBk = (DB.bookings || []).filter(b => b.officeId === o.id).length;

    return `<div style="background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:box-shadow .15s" onmouseover="this.style.boxShadow='0 6px 24px rgba(0,0,0,.10)'" onmouseout="this.style.boxShadow='none'">
      <div style="background:${color};padding:18px 16px 14px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between">
          <div style="width:44px;height:44px;background:rgba(255,255,255,.2);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;letter-spacing:.5px">${code}</div>
          <span style="background:${isActive?'rgba(255,255,255,.22)':'rgba(0,0,0,.22)'};color:#fff;border-radius:20px;padding:3px 11px;font-size:10px;font-weight:700">${isActive?'● Active':'● Inactive'}</span>
        </div>
        <div style="margin-top:12px">
          <div style="font-size:16px;font-weight:800;color:#fff">${o.name}</div>
          <div style="font-size:11.5px;color:rgba(255,255,255,.72);margin-top:3px">${location || 'No location set'}</div>
        </div>
      </div>
      <div style="padding:14px 16px">
        ${o.address ? `<div style="font-size:11.5px;color:var(--textd);margin-bottom:6px;line-height:1.5">📍 ${o.address}</div>` : ''}
        ${o.phone   ? `<div style="font-size:11.5px;color:var(--textm);margin-bottom:4px">📞 ${o.phone}</div>` : ''}
        ${o.email   ? `<div style="font-size:11.5px;color:var(--textm);margin-bottom:4px">✉️ ${o.email}</div>` : ''}
        ${manager   ? `<div style="font-size:11.5px;color:var(--textm);margin-bottom:4px">👤 ${manager.name}</div>` : ''}
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0;padding:10px 8px;background:var(--cream);border-radius:8px">
          <div style="text-align:center"><div style="font-size:17px;font-weight:800;color:var(--text)">${officeTeam.length}</div><div style="font-size:9px;color:var(--textd);text-transform:uppercase;letter-spacing:.5px">Team</div></div>
          <div style="text-align:center;border-left:1px solid var(--border);border-right:1px solid var(--border)"><div style="font-size:17px;font-weight:800;color:var(--text)">${officeLeads}</div><div style="font-size:9px;color:var(--textd);text-transform:uppercase;letter-spacing:.5px">Leads</div></div>
          <div style="text-align:center"><div style="font-size:17px;font-weight:800;color:var(--text)">${officeBk}</div><div style="font-size:9px;color:var(--textd);text-transform:uppercase;letter-spacing:.5px">Bookings</div></div>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" style="flex:1" onclick="editOffice('${o.id}')">✏️ Edit</button>
          <button class="btn btn-sm" style="flex:1;background:${isActive?'var(--red2)':'var(--g50)'};color:${isActive?'var(--red)':'var(--g700)'};border:1px solid ${isActive?'rgba(192,57,43,.2)':'var(--g200)'};border-radius:8px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit" onclick="toggleOfficeActive('${o.id}')">${isActive?'🔴 Deactivate':'✅ Activate'}</button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Update nav badge
  const badge = document.getElementById('offices-nav-badge');
  if (badge) badge.textContent = offices.length > 0 ? offices.length : '';
}

function editOffice(id) {
  const o = (DB.settings.offices || []).find(x => x.id === id);
  if (o) openAddOfficeModal(o);
}

function toggleOfficeActive(id) {
  const o = (DB.settings.offices || []).find(x => x.id === id);
  if (!o) return;
  o.active = !o.active;
  persistSettingsNow(); renderOfficesTab(); renderOffices();
  showToast(`"${o.name}" ${o.active ? 'activated' : 'deactivated'}`);
}

function openAddOfficeModal(office) {
  const editId = office ? office.id : '';
  const editEl = document.getElementById('of-edit-id'); if (editEl) editEl.value = editId;
  const titleEl = document.getElementById('of-modal-title'); if (titleEl) titleEl.textContent = office ? 'Edit Office' : 'Add Office / Branch';
  const saveBtn = document.getElementById('of-save-btn'); if (saveBtn) saveBtn.textContent = office ? 'Save Changes' : 'Add Office';
  // Clear / fill fields
  const s = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  s('of-name', office?.name); s('of-code', office?.code); s('of-city', office?.city);
  s('of-state', office?.state); s('of-address', office?.address);
  s('of-phone', office?.phone); s('of-email', office?.email);
  // Populate manager dropdown
  const mSel = document.getElementById('of-manager');
  if (mSel) {
    const mgrs = (DB.settings.team || []).filter(m => ['founder','ceo','branch_manager','team_lead','senior_manager','sales_manager','operations_manager'].includes(m.role));
    mSel.innerHTML = '<option value="">No Manager</option>' + mgrs.map(m => `<option value="${m.id}"${office && office.managerId === m.id?' selected':''}>${m.name} — ${m.role}</option>`).join('');
  }
  const errEl = document.getElementById('of-error'); if (errEl) { errEl.style.display='none'; errEl.textContent=''; }
  openModal('modal-add-office');
}

function saveOffice() {
  const name = document.getElementById('of-name').value.trim();
  const code = document.getElementById('of-code').value.trim().toUpperCase();
  if (!name || !code) { showError('of-error', 'Office name and code are required.'); return; }
  const g = id => document.getElementById(id)?.value.trim() || '';
  const editId = g('of-edit-id');

  if (editId) {
    const o = (DB.settings.offices || []).find(x => x.id === editId);
    if (o) {
      o.name = name; o.code = code; o.city = g('of-city'); o.state = g('of-state');
      o.address = g('of-address'); o.phone = g('of-phone'); o.email = g('of-email');
      o.managerId = g('of-manager');
    }
    persistSettingsNow(); closeModal('modal-add-office'); renderOfficesTab(); renderOffices(); renderSetupChecklist();
    showToast(`"${name}" updated!`);
  } else {
    const usedColors = (DB.settings.offices || []).map(o => o.color);
    const nextColor = _OFFICE_COLORS.find(c => !usedColors.includes(c)) || _OFFICE_COLORS[(DB.settings.offices||[]).length % _OFFICE_COLORS.length];
    DB.settings.offices.push({
      id: uid(), name, code, city: g('of-city'), state: g('of-state'),
      address: g('of-address'), phone: g('of-phone'), email: g('of-email'),
      managerId: g('of-manager'), color: nextColor, active: true,
      createdAt: new Date().toISOString()
    });
    persistSettingsNow(); closeModal('modal-add-office'); renderOfficesTab(); renderOffices(); renderSetupChecklist();
    showToast(`Office "${name}" added!`);
  }
}

// ══════ ACTIVITY LOG ══════
function renderActivityLog() {
  const el=document.getElementById('activity-list'); if(!el) return;
  const acts = (DB.activities||[]).slice(0,50);
  el.innerHTML = acts.length ? acts.map(a => '<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)"><div style="width:8px;height:8px;border-radius:50%;background:var(--g400);margin-top:5px;flex-shrink:0"></div><div style="flex:1"><div style="font-size:12.5px;color:var(--text)">'+a.msg+'</div><div style="font-size:10.5px;color:var(--textd);margin-top:2px">'+a.ts+'</div></div></div>').join('') : '<div style="text-align:center;padding:30px;color:var(--textd)">No activity recorded yet</div>';
}

// ══════ BACKUP ══════
function backupFullDB() {
  const data = JSON.stringify(DB, null, 2);
  const blob = new Blob([data], {type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'wanago_backup_'+new Date().toISOString().slice(0,10)+'.json'; a.click();
  DB.settings.lastBackup = new Date().toISOString(); persistSettingsNow();
  showToast('Backup downloaded!'); renderSetupChecklist();
}

function restoreDB() {
  const input = document.createElement('input'); input.type='file'; input.accept='.json';
  input.onchange = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { const data = JSON.parse(ev.target.result); if(!data.settings){showToast('Invalid backup file','error');return;} if(!confirm('This will replace ALL current data. Are you sure?'))return; Object.assign(DB,data); saveDB(); if (typeof window._fsPushDBNow === 'function') window._fsPushDBNow(); showToast('Data restored! Refreshing...'); setTimeout(()=>location.reload(),1500); }
      catch(e) { showToast('Invalid file format','error'); }
    };
    reader.readAsText(file);
  };
  input.click();
}

function exportAllData() {
  const sheets = {leads:hScoped('leads'),customers:hScoped('customers'),bookings:hScoped('bookings'),payments:hScoped('payments')};
  let csv = '';
  for (const [name,data] of Object.entries(sheets)) {
    if(!data.length) continue;
    csv += '\n=== '+name.toUpperCase()+' ===\n';
    const keys = Object.keys(data[0]);
    csv += keys.join(',') + '\n';
    data.forEach(row => csv += keys.map(k=>"\""+String(row[k]||'').replace(/"/g,'""')+"\"").join(',') + '\n');
  }
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = 'wanago_export_'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
  showToast('All data exported!');
}



function recalcCustomerStats() {
  if (!confirm('Recalculate bookingsCount and totalSpent for all customers from live booking & payment data?')) return;
  const custs = DB.customers || [];
  custs.forEach(c => { c.bookingsCount = 0; c.totalSpent = 0; });
  (DB.bookings||[]).filter(b => b.status === 'confirmed' || b.status === 'completed').forEach(b => {
    const c = custs.find(x => x.id === b.customerId || (b.customerPhone && x.phone === b.customerPhone));
    if (c) c.bookingsCount = (c.bookingsCount||0) + 1;
  });
  (DB.payments||[]).filter(p => p.status === 'completed').forEach(p => {
    const b = (DB.bookings||[]).find(x => x.id === p.bookingId);
    const cId = b ? b.customerId : null;
    const c = custs.find(x => x.id === cId || x.name === p.customerName || (p.customerPhone && x.phone === p.customerPhone));
    if (c) c.totalSpent = (c.totalSpent||0) + Number(p.amount||0);
  });
  saveDB();
  showToast('Customer stats recalculated for '+custs.length+' customers ✅');
}
window.recalcCustomerStats = recalcCustomerStats;

// ── Team Logins tab ──
function renderTeamLogins() {
  var team = DB.settings.team || [];
  var withFb = team.filter(function(m){ return m.firebaseUid || m.accountCreated; });
  var withEmail = team.filter(function(m){ return m.email; });
  var el = document.getElementById('login-stats');
  if (el) el.innerHTML = [
    {l:'👥 Total Team', v:team.length, m:'members'},
    {l:'✅ Firebase Account', v:withFb.length, m:'can log in now'},
    {l:'📧 Email Set', v:withEmail.length, m:'email on record'},
    {l:'⏳ No Account', v:team.length-withFb.length, m:'needs setup'},
  ].map(function(s){ return '<div class="stat-card"><div class="stat-label">'+s.l+'</div><div class="stat-val">'+s.v+'</div><div class="stat-meta">'+s.m+'</div></div>'; }).join('');

  var tbody = document.getElementById('logins-tbody');
  if (!tbody) return;
  if (!team.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--textd)">No team members yet. Add from Team Members tab.</td></tr>'; return; }

  var ROLE_LABELS = {founder:'👑 Founder',ceo:'👑 CEO',co_founder:'👑 Co-Founder',admin:'🔑 Admin',branch_manager:'📊 Branch Mgr',team_lead:'📊 Team Lead',sales_manager:'📊 Sales Mgr',operations_manager:'📊 Ops Mgr',finance_manager:'📊 Finance Mgr',marketing_manager:'📊 Mktg Mgr'};
  tbody.innerHTML = team.map(function(m) {
    var hasFb = !!(m.firebaseUid || m.accountCreated);
    var hasEmail = !!m.email;
    var accessLevel = ['founder','ceo','co_founder','admin'].includes(m.role) ? 'Full Access' :
      ['branch_manager','team_lead','senior_manager','sales_manager','operations_manager','finance_manager','marketing_manager'].includes(m.role) ? 'Manager View' : 'Agent View';
    var accessColor = accessLevel==='Full Access'?'var(--g700)':accessLevel==='Manager View'?'var(--amb)':'var(--textd)';
    var statusBadge = hasFb
      ? '<span style="background:#e8f5e9;color:#1a6341;border:1px solid #a5d6a7;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">✅ Active</span>'
      : hasEmail
        ? '<span style="background:#fff8e1;color:#7a5800;border:1px solid #ffd54f;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">⏳ No Account</span>'
        : '<span style="background:#fce4ec;color:#b71c1c;border:1px solid #ef9a9a;border-radius:20px;padding:3px 10px;font-size:11px;font-weight:700">❌ No Email</span>';
    var actionBtns = hasFb
      ? '<button class="row-btn" onclick="resetFirebasePassword(\'' + m.id + '\')" style="color:var(--amb)">Reset Password</button>'
      : hasEmail
        ? '<button class="row-btn btn-primary-sm" onclick="openCreateAccountModal(\'' + m.id + '\')">🔑 Create Account</button>'
        : '<button class="row-btn" onclick="editMember(\'' + m.id + '\')" style="color:var(--textd)">Set Email First</button>';
    return '<tr>'
      + '<td><div style="display:flex;align-items:center;gap:8px"><div style="width:30px;height:30px;border-radius:8px;background:'+(m.color||'var(--g600)')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">'+(m.name||'?')[0].toUpperCase()+'</div><div><div style="font-weight:600;font-size:13px">'+m.name+'</div>'+(m.email?'<div style="font-size:11px;color:var(--textd)">'+m.email+'</div>':'')+'</div></div></td>'
      + '<td style="font-size:12px">'+(ROLE_LABELS[m.role]||m.role||'—')+'</td>'
      + '<td>'+statusBadge+'</td>'
      + '<td style="font-size:12px;font-weight:600;color:'+accessColor+'">'+accessLevel+'</td>'
      + '<td style="white-space:nowrap">'+actionBtns+'</td>'
      + '</tr>';
  }).join('');
}

// ── Create Firebase Account Modal ──
window.openCreateAccountModal = function(memberId) {
  var team = DB.settings.team || [];
  var m = team.find(function(x){ return x.id === memberId; });
  if (!m) return;

  var existing = document.getElementById('fb-create-overlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'fb-create-overlay';
  overlay.innerHTML = '<style>#fb-create-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;font-family:inherit}</style>'
    + '<div style="background:#fff;border-radius:16px;padding:28px;width:420px;max-width:94vw;box-shadow:0 20px 60px rgba(0,0,0,.2)">'
    + '<div style="font-size:18px;font-weight:800;margin-bottom:4px">🔑 Create Login Account</div>'
    + '<div style="font-size:12.5px;color:var(--textd);margin-bottom:20px">Set up Firebase login for this team member</div>'
    + '<div style="background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:16px">'
    + '<div style="font-size:13px;font-weight:700">'+m.name+'</div>'
    + '<div style="font-size:11.5px;color:var(--textd);margin-top:2px">'+(m.role||'Team Member')+' · '+(m.dept||'')+'</div>'
    + '</div>'
    + '<div style="margin-bottom:12px"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:5px">Login Email *</label>'
    + '<input id="fbc-email" type="email" class="form-input" value="'+(m.email||'')+'" placeholder="agent@wanago.in" style="width:100%;box-sizing:border-box"></div>'
    + '<div style="margin-bottom:16px"><label style="font-size:12px;font-weight:600;display:block;margin-bottom:5px">Temporary Password *</label>'
    + '<div style="display:flex;gap:8px">'
    + '<input id="fbc-password" type="password" class="form-input" placeholder="Min 6 characters" style="flex:1">'
    + '<button onclick="fbcGenPass()" class="btn btn-outline btn-sm" style="flex-shrink:0;white-space:nowrap">🎲 Generate</button>'
    + '</div>'
    + '<div id="fbc-gen-display" style="display:none;margin-top:6px;background:#f0f7f4;border:1px solid var(--g200);border-radius:6px;padding:8px 10px;font-family:monospace;font-size:13px;font-weight:700;letter-spacing:2px;color:var(--g800)"></div>'
    + '<div style="font-size:11px;color:var(--textd);margin-top:4px">⚠️ Share this with the agent securely. They should change it after first login.</div></div>'
    + '<div id="fbc-error" style="color:var(--red);font-size:12px;margin-bottom:8px;display:none"></div>'
    + '<div id="fbc-success" style="display:none;background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:12px;font-size:13px;color:var(--g700);margin-bottom:8px"></div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:4px">'
    + '<button class="btn btn-outline" onclick="document.getElementById(\'fb-create-overlay\').remove()">Cancel</button>'
    + '<button id="fbc-submit" class="btn btn-primary" onclick="submitCreateFirebaseAccount(\'' + m.id + '\')">🔑 Create Account</button>'
    + '</div></div>';
  document.body.appendChild(overlay);

  window.fbcGenPass = function() {
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
    var pass = Array.from({length:10}, function(){ return chars[Math.floor(Math.random()*chars.length)]; }).join('');
    document.getElementById('fbc-password').value = pass;
    document.getElementById('fbc-password').type = 'text';
    var disp = document.getElementById('fbc-gen-display');
    disp.textContent = pass; disp.style.display = 'block';
  };
};

window.submitCreateFirebaseAccount = function(memberId) {
  var email = (document.getElementById('fbc-email').value||'').trim();
  var password = document.getElementById('fbc-password').value||'';
  var errEl = document.getElementById('fbc-error');
  var sucEl = document.getElementById('fbc-success');
  var btn = document.getElementById('fbc-submit');
  errEl.style.display='none'; sucEl.style.display='none';

  if (!email) { errEl.textContent='Email is required.'; errEl.style.display='block'; return; }
  if (password.length < 6) { errEl.textContent='Password must be at least 6 characters.'; errEl.style.display='block'; return; }

  btn.textContent='Creating...'; btn.disabled=true;

  var team = DB.settings.team || [];
  var m = team.find(function(x){ return x.id === memberId; });
  if (!m) { errEl.textContent='Member not found.'; errEl.style.display='block'; btn.textContent='🔑 Create Account'; btn.disabled=false; return; }

  // Use Firebase Auth REST API — works in plain <script> without import()
  var API_KEY = 'AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU';
  var url = 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + API_KEY;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    var res = JSON.parse(xhr.responseText);
    if (xhr.status === 200 && res.localId) {
      // Success — save UID back to member record
      m.firebaseUid = res.localId;
      m.email = email;
      m.accountCreated = true;
      m.accountCreatedAt = new Date().toISOString();
      persistSettingsNow();
      if (typeof fsSaveSettings === 'function') fsSaveSettings();
      sucEl.innerHTML = '✅ Account created for <strong>'+m.name+'</strong>!<br>Email: <strong>'+email+'</strong><br>They can now log in at the login page.';
      sucEl.style.display='block';
      btn.textContent='✅ Done'; btn.disabled=false;
      setTimeout(function(){ renderTeamLogins(); }, 600);
    } else {
      var fbErrs = {'EMAIL_EXISTS':'This email already has a Firebase account. Use Reset Password instead.','INVALID_EMAIL':'Invalid email address.','WEAK_PASSWORD : Password should be at least 6 characters':'Password too weak — use at least 6 characters.'};
      var msg = (res.error && res.error.message) || 'Unknown error';
      errEl.textContent = fbErrs[msg] || ('Firebase error: ' + msg);
      errEl.style.display='block';
      btn.textContent='🔑 Create Account'; btn.disabled=false;
    }
  };
  xhr.onerror = function() {
    errEl.textContent='Network error. Check your internet connection.';
    errEl.style.display='block';
    btn.textContent='🔑 Create Account'; btn.disabled=false;
  };
  xhr.send(JSON.stringify({email: email, password: password, returnSecureToken: false}));
};

// ── Reset Firebase Password (REST API) ──
window.resetFirebasePassword = function(memberId) {
  var team = DB.settings.team || [];
  var m = team.find(function(x){ return x.id === memberId; });
  if (!m || !m.email) { showToast('No email on record for this member','error'); return; }
  if (!confirm('Send password reset email to ' + m.email + '?')) return;

  var API_KEY = 'AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU';
  var url = 'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=' + API_KEY;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', url, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.onload = function() {
    if (xhr.status === 200) {
      showToast('✅ Reset email sent to ' + m.email);
    } else {
      var res = JSON.parse(xhr.responseText);
      var msg = (res.error && res.error.message) || 'Unknown error';
      showToast('Failed: ' + msg, 'error');
    }
  };
  xhr.onerror = function() { showToast('Network error sending reset email','error'); };
  xhr.send(JSON.stringify({requestType: 'PASSWORD_RESET', email: m.email}));
};

// ── Cloud Sync tab ──
function renderCloudSync() {
  // Status banner
  setTimeout(function() {
    var banner = document.getElementById('fs-status-banner');
    var icon   = document.getElementById('fs-status-icon');
    var title  = document.getElementById('fs-status-title');
    var msg    = document.getElementById('fs-status-msg');
    if (!banner) return;
    if (window._fsReady) {
      banner.style.background = 'linear-gradient(135deg,#e8f5e9,#f9fbe7)';
      banner.style.border = '1px solid #a5d6a7';
      if (icon) icon.textContent = '✅';
      if (title) title.textContent = 'Firestore Connected';
      if (msg) msg.textContent = 'Data syncs automatically on every save.';
    } else {
      banner.style.background = '#fff8e1';
      banner.style.border = '1px solid #ffd54f';
      if (icon) icon.textContent = '⚠️';
      if (title) title.textContent = 'Firebase Not Configured';
      if (msg) msg.textContent = 'Add your Firebase credentials to firebase/firebase-config.js to enable sync.';
    }
  }, 400);

  // Data summary
  var items = [
    {l:'🎯 Leads', v:(DB.leads||[]).length},
    {l:'👤 Customers', v:(DB.customers||[]).length},
    {l:'🗓️ Bookings', v:(DB.bookings||[]).length},
    {l:'💰 Payments', v:(DB.payments||[]).length},
    {l:'📦 Packages', v:(DB.packages||[]).length},
    {l:'🧾 Invoices', v:(DB.invoices||[]).length},
    {l:'📋 Quotations', v:(DB.quotations||[]).length},
    {l:'👥 Team', v:((DB.settings&&DB.settings.team)||[]).length},
  ];
  var el = document.getElementById('fs-data-summary');
  if (el) el.innerHTML = items.map(function(i){
    return '<div class="stat-card"><div class="stat-label">'+i.l+'</div><div class="stat-val">'+i.v+'</div><div class="stat-meta">records</div></div>';
  }).join('');
}

window.doSyncDown = function() {
  if (!window._fsReady) { showToast('Firebase not configured yet','error'); return; }
  showToast('Downloading from cloud...');
  if (typeof fsSyncDown === 'function') fsSyncDown().then(function(){ renderCloudSync(); showToast('✅ Sync complete!'); });
};
window.doSyncUp = function() {
  if (!window._fsReady) { showToast('Firebase not configured yet','error'); return; }
  if (!confirm('Upload all local data to Firestore?')) return;
  showToast('Uploading...');
  if (typeof fsSyncUp === 'function') fsSyncUp().then(function(){ showToast('✅ Upload complete!'); });
};
window.doFullSync = function() {
  if (!window._fsReady) { showToast('Firebase not configured yet','error'); return; }
  showToast('Syncing...');
  if (typeof fsSyncUp === 'function') fsSyncUp().then(function(){
    if (typeof fsSyncDown === 'function') return fsSyncDown();
  }).then(function(){ renderCloudSync(); showToast('✅ Full sync complete!'); });
};


// ══════ SETTINGS — constants ══════
const _DEFAULT_LEAD_SOURCES = ['Instagram','Facebook','WhatsApp','Walk-in','Referral','Website','Google','YouTube','TV Ad','Cold Call'];
const _BH_DAYS  = ['mon','tue','wed','thu','fri','sat','sun'];
const _BH_LABEL = { mon:'Monday',tue:'Tuesday',wed:'Wednesday',thu:'Thursday',fri:'Friday',sat:'Saturday',sun:'Sunday' };

// ══════ SETTINGS — load ══════
function loadAllSettings() {
  const s = DB.settings;
  const sv = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  // Brand
  sv('sett-brand-color', s.brandColor||'#134a32');
  sv('sett-brand-hex',   s.brandColor||'#134a32');
  sv('sett-currency',    s.currency||'INR');
  sv('sett-dateformat',  s.dateFormat||'DD/MM/YYYY');
  sv('sett-timezone',    s.timezone||'Asia/Kolkata');
  // Documents
  sv('sett-inv-prefix',  s.invoicePrefix||'INV');
  sv('sett-inv-startno', s.invoiceStartNo||1001);
  sv('sett-qt-prefix',   s.quotePrefix||'QT');
  sv('sett-rcp-prefix',  s.receiptPrefix||'RCP');
  sv('sett-inv-footer',  s.invoiceFooter||'Thank you for choosing Wanago!');
  sv('sett-inv-terms',   s.invoiceTerms||'');
  // Sales defaults
  const dep = s.depositPercent != null ? s.depositPercent : 30;
  sv('sett-deposit-pct', dep); sv('sett-deposit-range', dep);
  const prev = document.getElementById('sett-deposit-preview'); if (prev) prev.textContent = dep+'%';
  sv('sett-commission-pct', s.commissionPercent||5);
  sv('sett-cancel-policy', s.cancellationPolicy||'');
  _syncAutoAssignUI(!!s.autoAssignLeads);
  // Notifications
  sv('sett-fu-days',         s.fuDays||1);
  sv('sett-inv-days',        s.invDays||3);
  sv('sett-notify-lead',     s.notifyLeadTo||'manager');
  sv('sett-notify-payment',  s.notifyPaymentTo||'finance');
  // Dynamic sections
  renderLeadSources();
  renderBusinessHours();
}

// ══════ LEAD SOURCES ══════
function renderLeadSources() {
  const sources = DB.settings.leadSources || _DEFAULT_LEAD_SOURCES;
  const el = document.getElementById('sett-lead-sources'); if (!el) return;
  el.innerHTML = sources.map(src =>
    `<span class="src-pill">${src}<span class="src-pill-x" onclick="removeLeadSource('${src.replace(/'/g,"\\'").replace(/"/g,'&quot;')}')">×</span></span>`
  ).join('') + `<span style="display:inline-flex;align-items:center;gap:6px;margin:3px">
    <input id="new-source-input" class="form-input" placeholder="Add source…" style="width:130px;height:32px;font-size:12px;border-radius:20px;padding:0 14px" onkeydown="if(event.key==='Enter'){event.preventDefault();addLeadSource();}">
    <button class="btn btn-sm btn-outline" style="border-radius:20px" onclick="addLeadSource()">+ Add</button>
  </span>`;
}

function addLeadSource() {
  const inp = document.getElementById('new-source-input'); if (!inp) return;
  const val = inp.value.trim(); if (!val) return;
  if (!DB.settings.leadSources) DB.settings.leadSources = [..._DEFAULT_LEAD_SOURCES];
  if (!DB.settings.leadSources.includes(val)) { DB.settings.leadSources.push(val); persistSettingsNow(); }
  inp.value = '';
  renderLeadSources();
}

function removeLeadSource(src) {
  if (!DB.settings.leadSources) DB.settings.leadSources = [..._DEFAULT_LEAD_SOURCES];
  DB.settings.leadSources = DB.settings.leadSources.filter(s => s !== src);
  persistSettingsNow(); renderLeadSources();
}

// ══════ BUSINESS HOURS ══════
function renderBusinessHours() {
  const bh = DB.settings.businessHours || {};
  const el = document.getElementById('sett-business-hours'); if (!el) return;
  el.innerHTML = _BH_DAYS.map(day => {
    const d = bh[day] || { open: day !== 'sun', start:'09:00', end:'18:00' };
    return `<div class="bh-row ${d.open?'open':'closed'}">
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;min-width:110px">
        <input type="checkbox" id="bh-${day}-open" ${d.open?'checked':''} onchange="toggleBhDay('${day}')" style="width:15px;height:15px;accent-color:var(--g600);cursor:pointer">
        <span class="bh-day-label" style="color:${d.open?'var(--text)':'var(--textd)'}">${_BH_LABEL[day]}</span>
      </label>
      ${d.open
        ? `<span style="font-size:11px;color:var(--textd);font-weight:600">OPEN</span>
           <input type="time" id="bh-${day}-start" value="${d.start||'09:00'}" class="bh-time">
           <span style="font-size:12px;color:var(--textd)">→</span>
           <input type="time" id="bh-${day}-end"   value="${d.end||'18:00'}"   class="bh-time">`
        : `<span style="font-size:12px;color:var(--textd);font-style:italic">Closed</span>`}
    </div>`;
  }).join('');
}

function toggleBhDay(day) {
  const cb = document.getElementById('bh-'+day+'-open');
  const bh = DB.settings.businessHours || {};
  bh[day] = { ...(bh[day]||{}), open: cb.checked, start: bh[day]?.start||'09:00', end: bh[day]?.end||'18:00' };
  DB.settings.businessHours = bh;
  persistSettingsNow(); renderBusinessHours();
}

// ══════ DEPOSIT SLIDER SYNC ══════
function syncDepositPct() {
  const r = document.getElementById('sett-deposit-range'); const p = document.getElementById('sett-deposit-pct'); const pr = document.getElementById('sett-deposit-preview');
  if (r && p) p.value = r.value;
  if (pr) pr.textContent = (r?.value||30)+'%';
}
function syncDepositRange() {
  const r = document.getElementById('sett-deposit-range'); const p = document.getElementById('sett-deposit-pct'); const pr = document.getElementById('sett-deposit-preview');
  if (r && p) r.value = p.value;
  if (pr) pr.textContent = (p?.value||30)+'%';
}

// ══════ AUTO-ASSIGN TOGGLE ══════
function _syncAutoAssignUI(on) {
  const btn = document.getElementById('sett-auto-assign-toggle');
  const knob = document.getElementById('sett-auto-assign-knob');
  const lbl = document.getElementById('sett-auto-assign-label');
  if (btn) btn.style.background = on ? 'var(--g500)' : 'var(--border2)';
  if (knob) knob.style.left = on ? '22px' : '2px';
  if (lbl) lbl.textContent = on ? 'Round-robin auto-assign enabled' : 'Round-robin auto-assign disabled';
  if (lbl) lbl.style.color = on ? 'var(--g700)' : 'var(--textd)';
}
function toggleAutoAssign() {
  DB.settings.autoAssignLeads = !DB.settings.autoAssignLeads;
  _syncAutoAssignUI(DB.settings.autoAssignLeads);
}

// ══════ SAVE ALL SETTINGS ══════
function saveAllSettings() {
  const g = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const s = DB.settings;
  // Brand
  s.brandColor       = g('sett-brand-color') || s.brandColor;
  s.currency         = g('sett-currency')    || 'INR';
  s.dateFormat       = g('sett-dateformat')  || 'DD/MM/YYYY';
  s.timezone         = g('sett-timezone')    || 'Asia/Kolkata';
  // Documents
  s.invoicePrefix    = (g('sett-inv-prefix') || 'INV').toUpperCase();
  s.invoiceStartNo   = parseInt(g('sett-inv-startno'))  || 1001;
  s.quotePrefix      = (g('sett-qt-prefix')  || 'QT').toUpperCase();
  s.receiptPrefix    = (g('sett-rcp-prefix') || 'RCP').toUpperCase();
  s.invoiceFooter    = g('sett-inv-footer');
  s.invoiceTerms     = g('sett-inv-terms');
  // Sales defaults
  s.depositPercent   = parseInt(g('sett-deposit-pct'))   || 30;
  s.commissionPercent= parseFloat(g('sett-commission-pct')) || 5;
  s.cancellationPolicy = g('sett-cancel-policy');
  // Notifications
  s.fuDays           = parseInt(g('sett-fu-days'))  || 1;
  s.invDays          = parseInt(g('sett-inv-days')) || 3;
  s.notifyLeadTo     = g('sett-notify-lead')    || 'manager';
  s.notifyPaymentTo  = g('sett-notify-payment') || 'finance';
  // Business hours
  const bh = {};
  _BH_DAYS.forEach(day => {
    const openEl  = document.getElementById('bh-'+day+'-open');
    const startEl = document.getElementById('bh-'+day+'-start');
    const endEl   = document.getElementById('bh-'+day+'-end');
    if (openEl) bh[day] = { open: openEl.checked, start: startEl?.value||'09:00', end: endEl?.value||'18:00' };
  });
  if (Object.keys(bh).length) s.businessHours = bh;
  persistSettingsNow(); showToast('✅ Settings saved!');
}
function syncColorHex() { var c=document.getElementById('sett-brand-color'); var h=document.getElementById('sett-brand-hex'); if(c&&h) h.value=c.value; }
function syncHexColor() { var c=document.getElementById('sett-brand-color'); var h=document.getElementById('sett-brand-hex'); if(c&&h&&h.value.length===7) c.value=h.value; }

window.admTab=admTab;window.saveAllSettings=saveAllSettings;window.syncColorHex=syncColorHex;window.syncHexColor=syncHexColor;window.switchAdminTab=switchAdminTab;window.renderTeamLogins=renderTeamLogins;window.renderCloudSync=renderCloudSync;window.deleteMember=deleteMember;window.renderAdminPage=renderAdminPage;
window.saveSettings=saveSettings;window.toggleGST=toggleGST;window.filterTeam=filterTeam;
window.openAddMemberModal=openAddMemberModal;window.editMember=editMember;window.saveMember=saveMember;
window.openAddOfficeModal=openAddOfficeModal;window.saveOffice=saveOffice;
window.renderOfficesTab=renderOfficesTab;window.editOffice=editOffice;window.toggleOfficeActive=toggleOfficeActive;
window.backupFullDB=backupFullDB;window.restoreDB=restoreDB;window.exportAllData=exportAllData;
window.addLeadSource=addLeadSource;window.removeLeadSource=removeLeadSource;
window.toggleBhDay=toggleBhDay;window.toggleAutoAssign=toggleAutoAssign;
window.syncDepositPct=syncDepositPct;window.syncDepositRange=syncDepositRange;


// ══════════════════════════════════════════════════════════
//  INTEGRATIONS  — Meta Ads · WhatsApp Business · Gmail
// ══════════════════════════════════════════════════════════

function loadIntegrations() {
  var integ = (DB.settings && DB.settings.integrations) || {};
  var meta = integ.meta      || {};
  var wa   = integ.whatsapp  || {};
  var gml  = integ.gmail     || {};
  var gs   = (DB.settings && DB.settings.googleSheets) || {};

  var sv = function(id, val) { var el = document.getElementById(id); if (el) el.value = val || ''; };
  sv('integ-meta-token',     meta.accessToken || '');
  sv('integ-meta-account',   meta.adAccountId || '');
  sv('integ-meta-page',      meta.pageId      || '');
  sv('integ-wa-phoneid',     wa.phoneNumberId     || '');
  sv('integ-wa-bizid',       wa.businessAccountId || '');
  sv('integ-wa-token',       wa.accessToken       || '');
  sv('integ-gmail-clientid', gml.clientId  || '');
  sv('integ-gmail-fromname', gml.fromName  || '');
  sv('integ-gs-url',         gs.webAppUrl  || '');
  sv('integ-fcm-vapid',     (DB.settings.fcmVapidKey) || '');

  var autoEl = document.getElementById('integ-gs-autosync');
  if (autoEl) autoEl.checked = gs.autoSync !== false;

  var lastEl = document.getElementById('integ-gs-lastsync');
  if (lastEl) lastEl.textContent = window.WanagoSheets ? window.WanagoSheets.getLastSync() : (gs.lastSync ? gs.lastSync.slice(0,16).replace('T',' ') : 'Never');

  var eod = gs.eod || {};
  var eodHour = document.getElementById('integ-gs-eod-hour');
  if (eodHour) eodHour.value = String(eod.hour || 19);
  var eodEn = document.getElementById('integ-gs-eod-enabled');
  if (eodEn) eodEn.checked = eod.enabled !== false;

  _updateIntegPills();
}

function _updateIntegPills() {
  var integ = (DB.settings && DB.settings.integrations) || {};
  var meta = integ.meta     || {};
  var wa   = integ.whatsapp || {};
  var gml  = integ.gmail    || {};

  function setPill(id, on, onTxt, offTxt) {
    var el = document.getElementById(id); if (!el) return;
    if (on) {
      el.style.background = 'var(--g50)'; el.style.color = 'var(--g700)';
      el.style.border = '1px solid var(--g200)'; el.textContent = '● ' + (onTxt || 'Connected');
    } else {
      el.style.background = '#fee'; el.style.color = '#c0392b';
      el.style.border = '1px solid rgba(192,57,43,.2)'; el.textContent = '● ' + (offTxt || 'Not Connected');
    }
  }

  var gs = (DB.settings && DB.settings.googleSheets) || {};
  setPill('meta-integ-pill',  !!(meta.accessToken && meta.adAccountId));
  setPill('wa-integ-pill',    !!(wa.accessToken && wa.phoneNumberId));
  setPill('gmail-integ-pill', !!(gml.accessToken), 'Authorized', 'Not Authorized');
  setPill('gs-integ-pill',    !!(gs.webAppUrl), 'Active', 'Not Configured');
  if (typeof window._syncAdminPushUI === 'function') window._syncAdminPushUI();

  var gmlStat = document.getElementById('gmail-token-status');
  if (gmlStat) {
    if (gml.accessToken) {
      gmlStat.textContent = '✅ Token active — Gmail ready to send';
      gmlStat.style.color = 'var(--g700)';
    } else {
      gmlStat.textContent = 'Not authorized yet. Click "Authorize Gmail" to connect.';
      gmlStat.style.color = 'var(--textd)';
    }
  }
}

function saveIntegration(key) {
  if (!DB.settings.integrations) DB.settings.integrations = {};
  var integ = DB.settings.integrations;
  var g = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };

  if (key === 'meta') {
    integ.meta = { accessToken: g('integ-meta-token'), adAccountId: g('integ-meta-account'), pageId: g('integ-meta-page') };
  } else if (key === 'whatsapp') {
    integ.whatsapp = { phoneNumberId: g('integ-wa-phoneid'), businessAccountId: g('integ-wa-bizid'), accessToken: g('integ-wa-token') };
  } else if (key === 'gmail') {
    if (!integ.gmail) integ.gmail = {};
    integ.gmail.clientId = g('integ-gmail-clientid');
    integ.gmail.fromName = g('integ-gmail-fromname');
  } else if (key === 'googlesheets') {
    if (!DB.settings.googleSheets) DB.settings.googleSheets = {};
    DB.settings.googleSheets.webAppUrl = g('integ-gs-url');
    var autoEl = document.getElementById('integ-gs-autosync');
    DB.settings.googleSheets.autoSync  = autoEl ? autoEl.checked : true;
    var eodHourEl = document.getElementById('integ-gs-eod-hour');
    var eodEnEl   = document.getElementById('integ-gs-eod-enabled');
    DB.settings.googleSheets.eod = {
      hour:    eodHourEl ? Number(eodHourEl.value) : 19,
      enabled: eodEnEl   ? eodEnEl.checked : true,
    };
  }

  if (key === 'fcm') {
    DB.settings.fcmVapidKey = g('integ-fcm-vapid');
  }

  persistSettingsNow();
  _updateIntegPills();
  var names = { meta: 'Meta Ads', whatsapp: 'WhatsApp', gmail: 'Gmail', googlesheets: 'Google Sheets', fcm: 'Push Notifications' };
  showToast('✅ ' + (names[key] || key) + ' settings saved!');
}

async function testIntegration(key) {
  if (!window.WanagoIntegrations) { showToast('Integrations module not loaded', 'error'); return; }
  var resultEl = document.getElementById(key + '-test-result');

  function setResult(ok, msg) {
    if (!resultEl) return;
    resultEl.style.display = 'block';
    if (ok) {
      resultEl.style.background = 'var(--g50)'; resultEl.style.border = '1px solid var(--g200)'; resultEl.style.color = 'var(--g700)';
    } else {
      resultEl.style.background = '#fee8e6'; resultEl.style.border = '1px solid rgba(192,57,43,.2)'; resultEl.style.color = '#c0392b';
    }
    resultEl.textContent = msg;
  }

  setResult(true, 'Testing connection…');

  try {
    if (key === 'meta') {
      saveIntegration('meta');
      var d = await window.WanagoIntegrations.Meta.verifyToken();
      setResult(true, '✅ Connected! Token valid for: ' + (d.name || 'your account'));
      showToast('Meta Ads connected: ' + (d.name || 'OK'));

    } else if (key === 'whatsapp') {
      saveIntegration('whatsapp');
      var d2 = await window.WanagoIntegrations.WhatsApp.getProfile();
      var phone = d2.display_phone_number || 'Unknown';
      var vname = d2.verified_name ? ' (' + d2.verified_name + ')' : '';
      setResult(true, '✅ Connected! Phone: ' + phone + vname);
      showToast('WhatsApp connected: ' + phone);

    } else if (key === 'gmail') {
      if (!window.WanagoIntegrations.Gmail.token) throw new Error('No access token. Authorize Gmail first.');
      setResult(true, '✅ Gmail token is active and ready to send.');
      showToast('Gmail token active');

    } else if (key === 'googlesheets') {
      saveIntegration('googlesheets');
      if (!window.WanagoSheets) throw new Error('Google Sheets module not loaded — reload the page.');
      var r = await window.WanagoSheets.testConnection();
      if (r.ok) {
        setResult(true, '✅ ' + (r.msg || 'Connected to Google Sheets!'));
        showToast('Google Sheets connected!');
      } else {
        throw new Error(r.msg || 'Cannot reach the Web App URL');
      }
    }
  } catch (e) {
    setResult(false, '❌ ' + e.message);
    showToast(e.message, 'error');
  }
}

function revokeIntegration(key) {
  var names = { meta: 'Meta Ads', whatsapp: 'WhatsApp', gmail: 'Gmail', googlesheets: 'Google Sheets' };
  var label = names[key] || key;
  if (!confirm('Clear ' + label + ' credentials? This cannot be undone.')) return;
  if (key === 'googlesheets') {
    if (!DB.settings.googleSheets) DB.settings.googleSheets = {};
    DB.settings.googleSheets.webAppUrl = '';
    DB.settings.googleSheets.autoSync  = false;
  } else {
    if (!DB.settings.integrations) DB.settings.integrations = {};
    DB.settings.integrations[key] = {};
  }
  persistSettingsNow();
  loadIntegrations();
  showToast(label + ' credentials cleared');
}

function toggleIntegCred(inputId, btn) {
  var inp = document.getElementById(inputId); if (!inp) return;
  if (inp.type === 'password') { inp.type = 'text'; if (btn) btn.textContent = '🙈'; }
  else                         { inp.type = 'password'; if (btn) btn.textContent = '👁'; }
}

async function integGmailAuthorize() {
  if (!window.WanagoIntegrations) { showToast('Integrations module not loaded', 'error'); return; }
  saveIntegration('gmail');
  try {
    var token = await window.WanagoIntegrations.Gmail.authorize();
    if (token) { showToast('✅ Gmail authorized!'); _updateIntegPills(); }
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function sheetsManualSync() {
  if (!window.WanagoSheets) { showToast('Google Sheets module not loaded', 'error'); return; }
  var btn = document.getElementById('sheets-sync-btn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Syncing…'; }
  await window.WanagoSheets.syncNow(false);
  if (btn) { btn.disabled = false; btn.textContent = '🔄 Sync Now'; }
  var lastEl = document.getElementById('integ-gs-lastsync');
  if (lastEl && window.WanagoSheets) lastEl.textContent = window.WanagoSheets.getLastSync();
}

async function sheetsSetupTrigger() {
  if (!window.WanagoSheets) { showToast('Google Sheets module not loaded', 'error'); return; }
  saveIntegration('googlesheets');
  var btn = document.getElementById('eodr-trigger-btn');
  var res = document.getElementById('eodr-action-result');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Setting up…'; }
  if (res) { res.style.display = 'none'; }

  var hour = Number((document.getElementById('integ-gs-eod-hour')||{}).value || 19);
  var r = await window.WanagoSheets.sendAction('setupTrigger', { hour: hour });

  if (btn) { btn.disabled = false; btn.textContent = '⏰ Setup Daily Trigger'; }
  if (res) {
    res.style.display = 'block';
    if (r.ok) {
      res.style.background = 'var(--g50)'; res.style.color = 'var(--g700)'; res.style.border = '1px solid var(--g200)';
      res.textContent = '✅ ' + (r.msg || 'Daily EODR trigger set up successfully!');
      showToast('✅ Daily EODR trigger active!');
    } else {
      res.style.background = '#fee8e6'; res.style.color = '#c0392b'; res.style.border = '1px solid rgba(192,57,43,.2)';
      res.textContent = '❌ ' + (r.error || r.msg || 'Failed to set up trigger');
      showToast(r.error || 'Trigger setup failed', 'error');
    }
  }
}

async function sheetsSendEODRNow() {
  if (!window.WanagoSheets) { showToast('Google Sheets module not loaded', 'error'); return; }
  var btn = document.getElementById('eodr-send-btn');
  var res = document.getElementById('eodr-action-result');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending…'; }
  if (res) { res.style.display = 'none'; }

  // First sync the latest data, then send EODR
  await window.WanagoSheets.syncNow(true);
  var r = await window.WanagoSheets.sendAction('sendEODR');

  if (btn) { btn.disabled = false; btn.textContent = '📬 Send EODR Now'; }
  if (res) {
    res.style.display = 'block';
    if (r.ok) {
      res.style.background = 'var(--g50)'; res.style.color = 'var(--g700)'; res.style.border = '1px solid var(--g200)';
      res.textContent = '✅ ' + (r.msg || 'EODR sent successfully!');
      showToast('✅ EODR reports sent!');
    } else {
      res.style.background = '#fee8e6'; res.style.color = '#c0392b'; res.style.border = '1px solid rgba(192,57,43,.2)';
      res.textContent = '❌ ' + (r.error || r.msg || 'Send failed');
      showToast(r.error || 'EODR send failed', 'error');
    }
  }
}

function sendLocalTestNotif() {
  var title = document.getElementById('push-bc-title')?.value.trim() || 'Wanago ERP Test';
  var body  = document.getElementById('push-bc-body')?.value.trim()  || 'Push notifications are working!';
  var url   = document.getElementById('push-bc-url')?.value.trim()   || '/pages/dashboard.html';
  if (typeof window.showPushNotification === 'function') {
    window.showPushNotification(title, body, url);
  } else {
    showToast('FCM module not loaded. Add <script type="module" src="../js/fcm.js"> to this page.');
  }
}

window.loadIntegrations    = loadIntegrations;
window.saveIntegration     = saveIntegration;
window.testIntegration     = testIntegration;
window.revokeIntegration   = revokeIntegration;
window.toggleIntegCred     = toggleIntegCred;
window.integGmailAuthorize = integGmailAuthorize;
window.sheetsManualSync    = sheetsManualSync;
window.sheetsSetupTrigger  = sheetsSetupTrigger;
window.sheetsSendEODRNow   = sheetsSendEODRNow;
window.sendLocalTestNotif  = sendLocalTestNotif;


initPage(renderAdminPage);
