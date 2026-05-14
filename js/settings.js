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


// ── Tab switching ──
function switchSettingsTab(el, tabId) {
  // Update nav items
  document.querySelectorAll('.settings-nav-item').forEach(function(n){n.classList.remove('active');});
  if (el) el.classList.add('active');
  // Show correct tab
  document.querySelectorAll('.sett-panel').forEach(function(t){t.classList.remove('active');});
  var tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  // Update last backup display
  if (tabId === 'sett-data') {
    var el2 = document.getElementById('sett-last-backup');
    if (el2) el2.textContent = localStorage.getItem('wanago_last_backup') || 'Never';
  }
}

function loadSettingsValues() {
  const s = DB.settings;
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.value=val||'';};
  // General
  set('sett-company',s.companyName);set('sett-phone',s.phone);set('sett-email',s.email);
  set('sett-website',s.website);set('sett-address',s.address);
  // Banking
  set('sett-bank',s.bankName);set('sett-acc',s.accountNo);set('sett-ifsc',s.ifsc);set('sett-upi',s.upi);
  // Invoice
  set('sett-inv-prefix',s.invPrefix||'INV');set('sett-inv-footer',s.invFooter||'');set('sett-inv-terms',s.invTerms||'Payment due within 7 days of invoice.');
  const bc=document.getElementById('sett-brand-color');if(bc)bc.value=s.brandColor||'#134a32';
  const bh=document.getElementById('sett-brand-hex');if(bh)bh.value=s.brandColor||'#134a32';
  const cur=document.getElementById('sett-currency');if(cur)cur.value=s.currency||'INR';
  // GST
  const gt=document.getElementById('sett-gst-toggle');if(gt)gt.checked=!!s.gstEnabled;
  const gf=document.getElementById('sett-gst-fields');if(gf)gf.style.display=s.gstEnabled?'':'none';
  set('sett-gstin',s.gstin);set('sett-state',s.state);
  const gr=document.getElementById('sett-gst-rate');if(gr)gr.value=s.gstRate||5;
  const gtype=document.getElementById('sett-gst-type');if(gtype)gtype.value=s.gstType||'cgst_sgst';
  // Notifications
  const nb=document.getElementById('sett-notif-bday');if(nb)nb.checked=s.notifBirthday!==false;
  const nf=document.getElementById('sett-notif-followup');if(nf)nf.checked=s.notifFollowup!==false;
  const np=document.getElementById('sett-notif-passport');if(np)np.checked=s.notifPassport!==false;
  // Data
  const lb=document.getElementById('sett-last-backup');if(lb)lb.textContent=s.lastBackup?formatDate(s.lastBackup):'Never';
}

function saveAllSettings() {
  const s = DB.settings;
  const g=(id)=>document.getElementById(id)?.value.trim()||'';
  s.companyName=g('sett-company')||s.companyName;s.phone=g('sett-phone');s.email=g('sett-email');
  s.website=g('sett-website');s.address=g('sett-address');
  s.bankName=g('sett-bank');s.accountNo=g('sett-acc');s.ifsc=g('sett-ifsc');s.upi=g('sett-upi');
  s.invPrefix=g('sett-inv-prefix')||'INV';s.invFooter=g('sett-inv-footer');s.invTerms=g('sett-inv-terms');
  s.brandColor=document.getElementById('sett-brand-color')?.value||'#134a32';
  s.currency=document.getElementById('sett-currency')?.value||'INR';
  s.gstEnabled=document.getElementById('sett-gst-toggle')?.checked||false;
  if(s.gstEnabled){s.gstin=g('sett-gstin');s.state=g('sett-state');s.gstRate=parseInt(document.getElementById('sett-gst-rate')?.value)||5;s.gstType=document.getElementById('sett-gst-type')?.value||'cgst_sgst';}
  s.notifBirthday=document.getElementById('sett-notif-bday')?.checked||false;
  s.notifFollowup=document.getElementById('sett-notif-followup')?.checked||false;
  s.notifPassport=document.getElementById('sett-notif-passport')?.checked||false;
  saveDB(); if(typeof fsSaveSettings==='function')fsSaveSettings().catch(()=>{}); showToast('Settings saved! ✅');
}

function toggleGSTFields() {
  const on=document.getElementById('sett-gst-toggle')?.checked;
  const f=document.getElementById('sett-gst-fields');if(f)f.style.display=on?'':'none';
}

function syncColorHex() { const c=document.getElementById('sett-brand-color'); const h=document.getElementById('sett-brand-hex'); if(c&&h)h.value=c.value; }
function syncHexColor() { const c=document.getElementById('sett-brand-color'); const h=document.getElementById('sett-brand-hex'); if(c&&h&&h.value.length===7)c.value=h.value; }

function backupNow() {
  const data=JSON.stringify(DB,null,2);const blob=new Blob([data],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wanago_backup_'+today()+'.json';a.click();
  DB.settings.lastBackup=new Date().toISOString();saveDB();loadSettingsValues();showToast('Backup downloaded!');
}

function clearAllData() {
  if(!confirm('⚠️ This will DELETE all leads, customers, bookings, payments and invoices.\n\nThis CANNOT be undone. Type "DELETE" to confirm.'))return;
  const inp=prompt('Type DELETE to confirm:');if(inp!=='DELETE'){showToast('Cancelled','error');return;}
  DB.leads=[];DB.customers=[];DB.bookings=[];DB.payments=[];DB.invoices=[];DB.quotations=[];DB.activities=[];
  saveDB();showToast('All transaction data cleared');
}


window.switchSettingsTab=switchSettingsTab;
window.loadSettingsValues=loadSettingsValues;window.saveAllSettings=saveAllSettings;
window.toggleGSTFields=toggleGSTFields;window.syncColorHex=syncColorHex;window.syncHexColor=syncHexColor;
window.backupNow=backupNow;window.clearAllData=clearAllData;

initPage(loadSettingsValues);
