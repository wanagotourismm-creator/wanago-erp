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
  if (el) el.classList.add('active');
  // Show correct tab
  document.querySelectorAll('.adm-tab').forEach(function(t){t.classList.remove('active');});
  var tab = document.getElementById('adm-tab-' + name);
  if (tab) tab.classList.add('active');
  // Update topbar title
  var titles = {
    overview:'⚙️ Admin Panel', company:'🏢 Company Settings', team:'👥 Team Members',
    settings:'⚙️ Settings', logins:'🔑 Team Logins', cloudsync:'☁️ Cloud Sync',
    activity:'📋 Activity Log', backup:'💾 Backup & Restore'
  };
  var subs = {
    overview:'Overview & quick actions', company:'Company info, bank details, GST',
    team:'Manage staff and roles', settings:'Brand, PIN and preferences',
    logins:'Team login credentials', cloudsync:'Firebase Firestore sync',
    activity:'Recent system activity', backup:'Backup and restore data'
  };
  var t = document.getElementById('adm-page-title');
  var s = document.getElementById('adm-page-sub');
  if (t) t.textContent = titles[name] || 'Admin Panel';
  if (s) s.textContent = subs[name] || '';
  // Render content
  if (name === 'overview')   { renderOverviewStats(); renderSetupChecklist(); }
  if (name === 'team')       { renderTeamMembers('all'); }
  if (name === 'activity')   { renderActivityLog(); }
  if (name === 'company')    { loadCompanySettings(); }
  if (name === 'logins')     { renderTeamLogins(); }
  if (name === 'cloudsync')  { renderCloudSync(); }
}

// Keep old function as alias
function switchAdminTab(a,b) { admTab(b||a, null); }

// ── Delete member ──
function deleteMember(elOrId) { var id = (typeof elOrId === "string") ? elOrId : elOrId.dataset.id;
  var m = (DB.settings.team||[]).find(function(x){return x.id===id;});
  if (!m) return;
  if (currentUser && currentUser.id === id) { showToast('You cannot remove yourself','error'); return; }
  if (!confirm('Remove ' + m.name + ' from team?')) return;
  DB.settings.team = DB.settings.team.filter(function(x){return x.id!==id;});
  saveDB(); renderTeamMembers('all'); showToast(m.name + ' removed from team');
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
}

function saveSettings() {
  const s = DB.settings;
  const g = id => document.getElementById(id)?.value.trim()||'';
  s.companyName=g('s-company')||s.companyName; s.phone=g('s-phone'); s.email=g('s-email');
  s.website=g('s-website'); s.address=g('s-address');
  s.bankName=g('s-bank'); s.accountNo=g('s-acc'); s.ifsc=g('s-ifsc'); s.upi=g('s-upi');
  if (s.gstEnabled) { s.gstin=g('s-gstin'); s.gstRate=parseInt(document.getElementById('s-gstrate')?.value)||5; s.gstType=document.getElementById('s-gsttype')?.value||'cgst_sgst'; s.state=g('s-state'); }
  saveDB(); renderSetupChecklist(); showToast('Settings saved!');
}

function toggleGST() { DB.settings.gstEnabled = !DB.settings.gstEnabled; syncGSTToggleUI(DB.settings.gstEnabled); saveDB(); }
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
  ['tm-name','tm-phone','tm-email','tm-empid','tm-pin','tm-joindate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
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
  s('tm-name',m.name);s('tm-phone',m.phone);s('tm-email',m.email);s('tm-empid',m.empId);s('tm-dept',m.dept);s('tm-role',m.role);s('tm-pin',m.pin);s('tm-office',m.officeId||'*');s('tm-manager',m.managerId);s('tm-joindate',m.joinDate);
  setTimeout(()=>{ renderPermissionsPanel(m.permissions||null); const roleEl=document.getElementById('tm-role'); if(roleEl) roleEl.onchange=()=>renderPermissionsPanel(null); },50);
}

function saveMember() {
  const editId=document.getElementById('tm-edit-id').value;
  const name=document.getElementById('tm-name').value.trim();
  const dept=document.getElementById('tm-dept').value;
  const role=document.getElementById('tm-role').value;
  if(!name||!dept||!role) { showError('tm-error','Name, department and role are required.'); return; }
  const fields = {name, phone:document.getElementById('tm-phone').value, email:document.getElementById('tm-email').value, empId:document.getElementById('tm-empid').value, dept, role, pin:document.getElementById('tm-pin').value, officeId:document.getElementById('tm-office').value||'*', managerId:document.getElementById('tm-manager').value, joinDate:document.getElementById('tm-joindate').value};
  fields.systemRole = ROLE_TO_SYSTEM_ROLE[role] || 'employee';
  const perms = tmGetPermissions();
  // Store as both .features (legacy) and .actions (new schema)
  fields.permissions = { pages: perms.pages, features: perms.features, actions: perms.features, sections: {} };
  if(editId) { const m=(DB.settings.team||[]).find(x=>x.id===editId); if(m)Object.assign(m,fields); showToast(name+' updated'); }
  else { const color=['#134a32','#1976d2','#f57c00','#7b1fa2','#c9a84c','#d32f2f','#00796b'][Math.floor(Math.random()*7)]; DB.settings.team.push({id:uid(),...fields,color,createdAt:new Date().toISOString()}); showToast(name+' added to team!'); }
  saveDB(); closeModal('modal-add-member'); renderTeamMembers(); renderSetupChecklist();
}

// ══════ OFFICES ══════
function renderOffices() {
  const offices = DB.settings.offices||[]; const el=document.getElementById('offices-list'); if(!el) return;
  el.innerHTML = offices.map(o => '<div style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--cream);border:1px solid var(--border);border-radius:10px;margin-bottom:8px"><div style="width:36px;height:36px;border-radius:10px;background:var(--g600);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12px">'+((o.code||'HO').slice(0,2))+'</div><div style="flex:1"><div style="font-weight:600;font-size:13px">'+o.name+'</div><div style="font-size:11px;color:var(--textd)">'+(o.address||'No address')+'</div></div><span class="pill '+(o.active!==false?'pill-green':'pill-red')+'">'+(o.active!==false?'Active':'Inactive')+'</span></div>').join('') || '<div style="text-align:center;padding:20px;color:var(--textd)">No offices yet</div>';
}

function openAddOfficeModal() { ['of-name','of-code','of-address','of-phone'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';}); openModal('modal-add-office'); }

function saveOffice() {
  const name=document.getElementById('of-name').value.trim(); const code=document.getElementById('of-code').value.trim();
  if(!name||!code){showError('of-error','Name and code are required.');return;}
  DB.settings.offices.push({id:uid(),name,code,address:document.getElementById('of-address').value,phone:document.getElementById('of-phone').value,active:true,createdAt:new Date().toISOString()});
  saveDB(); closeModal('modal-add-office'); renderOffices(); renderSetupChecklist(); showToast('Office "'+name+'" added!');
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
  DB.settings.lastBackup = new Date().toISOString(); saveDB();
  showToast('Backup downloaded!'); renderSetupChecklist();
}

function restoreDB() {
  const input = document.createElement('input'); input.type='file'; input.accept='.json';
  input.onchange = (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { const data = JSON.parse(ev.target.result); if(!data.settings){showToast('Invalid backup file','error');return;} if(!confirm('This will replace ALL current data. Are you sure?'))return; Object.assign(DB,data); saveDB(); showToast('Data restored! Refreshing...'); setTimeout(()=>location.reload(),1500); }
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



// ── Team Logins tab ──
function renderTeamLogins() {
  var team = DB.settings.team || [];
  var withAcc = team.filter(function(m){ return m.email && m.pin; });
  var el = document.getElementById('login-stats');
  if (el) el.innerHTML = [
    {l:'👥 Total Team', v:team.length, m:'members'},
    {l:'✅ Has Login', v:withAcc.length, m:'email + PIN set'},
    {l:'⏳ No Login', v:team.length-withAcc.length, m:'PIN not set'},
    {l:'🔑 Active', v:withAcc.length, m:'can log in'},
  ].map(function(s){ return '<div class="stat-card"><div class="stat-label">'+s.l+'</div><div class="stat-val">'+s.v+'</div><div class="stat-meta">'+s.m+'</div></div>'; }).join('');

  var tbody = document.getElementById('logins-tbody');
  if (!tbody) return;
  if (!team.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--textd)">No team members yet. Add from Team tab.</td></tr>'; return; }

  var ROLE_LABELS = {founder:'👑 Founder',ceo:'👑 CEO',admin:'🔑 Admin',branch_manager:'📊 Branch Mgr',team_lead:'📊 Team Lead',sales_manager:'📊 Sales Mgr',operations_manager:'📊 Ops Mgr',finance_manager:'📊 Finance Mgr',marketing_manager:'📊 Mktg Mgr'};
  tbody.innerHTML = team.map(function(m) {
    var hasLogin = m.email && m.pin;
    var accessLevel = ['founder','ceo','admin'].includes(m.role) ? 'Full Access' :
      ['branch_manager','team_lead','senior_manager','sales_manager','operations_manager','finance_manager','marketing_manager'].includes(m.role) ? 'Manager View' : 'Agent View';
    var accessColor = accessLevel==='Full Access'?'var(--g700)':accessLevel==='Manager View'?'var(--amb)':'var(--textd)';
    return '<tr>'
      + '<td><div style="display:flex;align-items:center;gap:8px"><div style="width:30px;height:30px;border-radius:8px;background:'+(m.color||'var(--g600)')+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff">'+(m.name||'?')[0].toUpperCase()+'</div><span style="font-weight:600">'+m.name+'</span></div></td>'
      + '<td style="font-size:12px">'+(ROLE_LABELS[m.role]||m.role)+'</td>'
      + '<td style="font-size:12px;color:var(--textm)">'+(m.email||'<span style="color:var(--textd)">Not set</span>')+'</td>'
      + '<td>'+(m.pin?'<span style="font-family:monospace;letter-spacing:2px">••••</span>':'<span style="color:var(--textd);font-size:11px">No PIN</span>')+'</td>'
      + '<td style="font-size:12px;font-weight:600;color:'+accessColor+'">'+accessLevel+'</td>'
      + '<td style="white-space:nowrap">'
      + '<button class="row-btn" onclick="editMember(this)" data-id="'+m.id+'">Edit</button>'
      + '<button class="row-btn" style="margin-left:3px;color:var(--red)" onclick="deleteMember(this)" data-id="'+m.id+'">Remove</button>'
      + '</td></tr>';
  }).join('');
}

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


function saveAllSettings() {
  var g = function(id){ var el=document.getElementById(id); return el?el.value.trim():''; };
  DB.settings.brandColor = g('sett-brand-color') || DB.settings.brandColor;
  DB.settings.currency   = g('sett-currency')   || 'INR';
  DB.settings.dateFormat = g('sett-dateformat')  || 'DD/MM/YYYY';
  DB.settings.fuDays     = parseInt(g('sett-fu-days'))||1;
  DB.settings.invDays    = parseInt(g('sett-inv-days'))||3;
  saveDB(); showToast('✅ Settings saved!');
}
function syncColorHex() { var c=document.getElementById('sett-brand-color'); var h=document.getElementById('sett-brand-hex'); if(c&&h) h.value=c.value; }
function syncHexColor() { var c=document.getElementById('sett-brand-color'); var h=document.getElementById('sett-brand-hex'); if(c&&h&&h.value.length===7) c.value=h.value; }

window.admTab=admTab;window.saveAllSettings=saveAllSettings;window.syncColorHex=syncColorHex;window.syncHexColor=syncHexColor;window.switchAdminTab=switchAdminTab;window.renderTeamLogins=renderTeamLogins;window.renderCloudSync=renderCloudSync;window.deleteMember=deleteMember;window.renderAdminPage=renderAdminPage;
window.saveSettings=saveSettings;window.toggleGST=toggleGST;window.filterTeam=filterTeam;
window.openAddMemberModal=openAddMemberModal;window.editMember=editMember;window.saveMember=saveMember;
window.openAddOfficeModal=openAddOfficeModal;window.saveOffice=saveOffice;
window.backupFullDB=backupFullDB;window.restoreDB=restoreDB;window.exportAllData=exportAllData;

initPage(renderAdminPage);
