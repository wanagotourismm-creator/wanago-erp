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

//  WANAGO ERP — Customer CRM Module
// ═══════════════════════════════════════════════════════════════




let custFilter = 'all';
let custSearchQuery = '';
const TRAVEL_TYPE_LABELS = { honeymoon:'💑 Honeymoon', family:'👨‍👩‍👧 Family', corporate:'💼 Corporate', adventure:'🏔 Adventure', group:'👥 Group', solo:'🧳 Solo' };

function custJsArg(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}
const BUDGET_LABELS = { high:'High (>₹2L)', mid:'Mid (₹50K–2L)', low:'Low (<₹50K)' };

function custIsQuoted(c) {
  if ((DB.invoices||[]).some(inv => inv.customerId===c.id||inv.customerName===c.name)) return true;
  const qs = new Set(['quoted','negotiation','won','lost']);
  if ((DB.leads||[]).some(l => (l.customerId===c.id||l.phone===c.phone) && qs.has(l.stage))) return true;
  return false;
}

function renderCustomerStats() {
  const all = hScoped('customers');
  const sixMonths = new Date(Date.now()+180*86400*1000);
  const s = id => document.getElementById(id)||{textContent:''};
  s('cstat-total').textContent = all.length;
  s('cstat-vip').textContent = all.filter(c=>c.tag==='vip').length;
  s('cstat-repeat').textContent = all.filter(c=>(c.bookingsCount||0)>=2).length;
  s('cstat-revenue').textContent = formatMoney(all.reduce((s,c)=>s+Number(c.totalSpent||0),0));
  s('cstat-passport').textContent = all.filter(c=>c.passportExpiry&&new Date(c.passportExpiry)<sixMonths&&new Date(c.passportExpiry)>new Date()).length;
  s('cstat-quoted').textContent = all.filter(custIsQuoted).length;
  s('cstat-notquoted').textContent = all.length - all.filter(custIsQuoted).length;
}

function renderCustAIStrip() {
  const el = document.getElementById('cust-ai-strip'); if (!el) return;
  if (typeof window.WanagoAI === 'undefined') { el.style.display = 'none'; return; }
  try {
    const segs = WanagoAI.segmentCustomers();
    const vipC = segs.vip.length, atRiskC = segs.at_risk.length, inactiveC = segs.inactive.length, newC = segs.new.length;
    const items = [];
    if (vipC > 0) items.push('<div style="background:#fff3cd;border-left:3px solid #f0ad4e;border-radius:8px;padding:9px 12px"><div style="font-size:12px;font-weight:700;color:#b7860d">⭐ ' + vipC + ' VIP Customer' + (vipC > 1 ? 's' : '') + '</div><div style="font-size:10.5px;color:#888;margin-top:1px">High-value relationships</div></div>');
    if (atRiskC > 0) items.push('<div style="background:#fde8e8;border-left:3px solid #e74c3c;border-radius:8px;padding:9px 12px;cursor:pointer" onclick="filterCustomers(\'at_risk\',document.querySelector(\'.filter-bar .chip\'))"><div style="font-size:12px;font-weight:700;color:#c0392b">⚠️ ' + atRiskC + ' At-Risk Customer' + (atRiskC > 1 ? 's' : '') + '</div><div style="font-size:10.5px;color:#888;margin-top:1px">No booking in 12+ months — needs outreach</div></div>');
    if (newC > 0) items.push('<div style="background:#e8f4fd;border-left:3px solid #3498db;border-radius:8px;padding:9px 12px"><div style="font-size:12px;font-weight:700;color:#1565c0">✨ ' + newC + ' New Customer' + (newC > 1 ? 's' : '') + '</div><div style="font-size:10.5px;color:#888;margin-top:1px">Joined in the last 30 days</div></div>');
    if (inactiveC > 0) items.push('<div style="background:#f8f8f8;border-left:3px solid #aaa;border-radius:8px;padding:9px 12px"><div style="font-size:12px;font-weight:700;color:#666">💤 ' + inactiveC + ' Inactive</div><div style="font-size:10.5px;color:#888;margin-top:1px">Never booked — consider an outreach campaign</div></div>');
    if (!items.length) { el.style.display = 'none'; return; }
    el.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-bottom:12px';
    el.innerHTML = items.join('');
  } catch (e) { el.style.display = 'none'; }
}

function renderCustomers(filter) {
  if (filter) custFilter = filter;
  renderCustomerStats();
  renderCustAIStrip();
  const segMap = {};
  if (typeof window.WanagoAI !== 'undefined') { try { const _sg = WanagoAI.segmentCustomers(); Object.entries(_sg).forEach(([_s, _a]) => _a.forEach(_c => { segMap[_c.id] = _s; })); } catch (e) {} }
  let custs = hScoped('customers');
  if (custFilter==='vip') custs=custs.filter(c=>c.tag==='vip');
  else if (custFilter==='corporate') custs=custs.filter(c=>c.tag==='corporate'||c.travelType==='corporate');
  else if (custFilter==='honeymoon') custs=custs.filter(c=>c.travelType==='honeymoon');
  else if (custFilter==='repeat') custs=custs.filter(c=>(c.bookingsCount||0)>=2);
  else if (custFilter==='quoted') custs=custs.filter(custIsQuoted);
  else if (custFilter==='not_quoted') custs=custs.filter(c=>!custIsQuoted(c));
  else if (custFilter==='passport_alert') custs=custs.filter(c=>{if(!c.passportExpiry)return false;const d=new Date(c.passportExpiry);return d>new Date()&&d<new Date(Date.now()+180*86400*1000);});
  else if (custFilter==='at_risk') custs=custs.filter(c=>segMap[c.id]==='at_risk');
  else if (custFilter==='loyal') custs=custs.filter(c=>segMap[c.id]==='loyal'||segMap[c.id]==='vip');
  else if (custFilter==='inactive') custs=custs.filter(c=>segMap[c.id]==='inactive');
  const q=custSearchQuery.toLowerCase();
  if(q) custs=custs.filter(c=>c.name.toLowerCase().includes(q)||c.phone.includes(q)||(c.email||'').toLowerCase().includes(q)||(c.city||'').toLowerCase().includes(q));
  const typeF=document.getElementById('cust-type-filter')?.value;
  if(typeF) custs=custs.filter(c=>c.travelType===typeF);
  const budgetF=document.getElementById('cust-budget-filter')?.value;
  if(budgetF) custs=custs.filter(c=>c.budgetRange===budgetF);
  const tbody=document.getElementById('customers-tbody');
  if(!custs.length){tbody.innerHTML=emptyRow(11,'No customers match your filters.');return;}
  const tagPill={vip:'<span class="pill pill-gold">⭐ VIP</span>',corporate:'<span class="pill pill-blue">Corporate</span>',regular:'<span class="pill pill-green">Regular</span>'};
  const SEG_PILL={vip:'<span style="font-size:9.5px;font-weight:700;color:#b7860d;background:#fff3cd;border-radius:5px;padding:2px 7px">⭐ VIP</span>',loyal:'<span style="font-size:9.5px;font-weight:700;color:#1a7a4a;background:#f0faf4;border-radius:5px;padding:2px 7px">🔁 Loyal</span>',regular:'<span style="font-size:9.5px;color:#555;background:#f4f4f4;border-radius:5px;padding:2px 7px">Regular</span>',at_risk:'<span style="font-size:9.5px;font-weight:700;color:#c0392b;background:#fde8e8;border-radius:5px;padding:2px 7px">⚠️ At Risk</span>',new:'<span style="font-size:9.5px;font-weight:700;color:#1565c0;background:#e8f4fd;border-radius:5px;padding:2px 7px">✨ New</span>',inactive:'<span style="font-size:9.5px;color:#888;background:#f4f4f4;border-radius:5px;padding:2px 7px">💤 Inactive</span>'};
  const today6m=new Date(Date.now()+180*86400*1000);
  tbody.innerHTML=custs.map(c=>{
    const passWarn=c.passportExpiry&&new Date(c.passportExpiry)<today6m&&new Date(c.passportExpiry)>new Date();
    const passExpired=c.passportExpiry&&new Date(c.passportExpiry)<new Date();
    const avg=c.bookingsCount>0?Math.round(c.totalSpent/c.bookingsCount):0;
    const isBday=c.dob&&c.dob.slice(5)===today().slice(5);
    const isAnniv=c.anniversary&&c.anniversary.slice(5)===today().slice(5);
    return `<tr>
      <td><div style="display:flex;align-items:center;gap:9px">
        <div style="width:34px;height:34px;border-radius:50%;background:${c.color||'var(--g600)'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">${initials(c.name)}</div>
        <div><div style="font-weight:600">${c.name} ${isBday?'🎂':''} ${isAnniv?'💕':''}</div>
        ${custIsQuoted(c)?'<div style="font-size:9.5px;color:var(--blue);font-weight:700">📄 Quoted</div>':'<div style="font-size:9.5px;color:var(--textd)">🔲 Not Quoted</div>'}
        <div style="font-size:10.5px;color:var(--textd)">${c.email||'—'}</div>
        ${(c.bookingsCount||0)>=2?'<div style="font-size:9.5px;color:var(--g600);font-weight:700">🔁 Repeat</div>':''}
        </div></div></td>
      <td>${c.phone}</td><td style="font-size:12px;color:var(--textd)">${c.city||'—'}</td>
      <td>${tagPill[c.tag]||tagPill.regular}</td>
      <td>${SEG_PILL[segMap[c.id]]||'<span style="font-size:9.5px;color:#ccc">—</span>'}</td>
      <td style="font-size:11.5px">${TRAVEL_TYPE_LABELS[c.travelType]||c.travelType||'—'}</td>
      <td style="font-weight:600;text-align:center">${c.bookingsCount||0}</td>
      <td style="font-weight:600">${formatMoney(c.totalSpent||0)}</td>
      <td style="color:var(--textd);font-size:11.5px">${avg>0?formatMoney(avg):'—'}</td>
      <td style="${passExpired?'color:var(--red);font-weight:700':passWarn?'color:var(--amb);font-weight:600':''}">${c.passportExpiry?formatDate(c.passportExpiry)+(passExpired?' ✗':passWarn?' ⚠':''):'—'}</td>
      <td style="white-space:nowrap">
        <button class="row-btn" onclick="viewCustomer('${c.id}')">View</button>
        <button class="row-btn" style="margin-left:3px;background:#075e54;color:#fff;border-color:#075e54" onclick="openSalesChatWindow('${custJsArg(c.phone)}','${custJsArg(c.name)}','customer')" title="Sales Chat">💬</button>
        <button class="row-btn" style="margin-left:3px;color:var(--g700)" onclick="editCustomer('${c.id}')">✏</button>
        <button class="row-btn btn-danger" style="margin-left:3px" onclick="deleteCustomer('${c.id}')">✕</button>
      </td></tr>`;
  }).join('');
}

function filterCustomers(f,el){document.querySelectorAll('.page .chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');renderCustomers(f);}
function searchCustomers(q){custSearchQuery=q;renderCustomers();}

function custWhatsApp(id){const c=DB.customers.find(x=>x.id===id);if(!c)return;if(c.waOptin==='no'){showToast('Customer opted out of WhatsApp','error');return;}const msg=encodeURIComponent(`Hi ${c.name}! 👋 We have amazing travel deals for you! 🌏`);const num=c.phone.replace(/\D/g,'');window.open(`https://wa.me/${num.startsWith('91')?num:'91'+num}?text=${msg}`,'_blank');}

function viewCustomer(id){
  const c=DB.customers.find(x=>x.id===id);if(!c)return;
  document.getElementById('vc-title').textContent=c.name;
  document.getElementById('modal-view-customer')._custId=id;
  const passExpired=c.passportExpiry&&new Date(c.passportExpiry)<new Date();
  const passWarn=c.passportExpiry&&!passExpired&&new Date(c.passportExpiry)<new Date(Date.now()+180*86400*1000);
  const custBookings=hScoped('bookings').filter(b=>b.customerId===id||b.customerPhone===c.phone);
  const custLeads=hScoped('leads').filter(l=>l.customerId===id||l.phone===c.phone);
  const custQuots=hScoped('quotations').filter(q=>q.customerId===id||q.customerPhone===c.phone||q.customerName===c.name);
  const custInvoices=hScoped('invoices').filter(i=>i.customerId===id||i.customerPhone===c.phone||i.customerName===c.name);
  const invRow=i=>'<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--cream);border-radius:10px;border:1px solid var(--border);margin-bottom:6px">'+
    '<div style="flex:1"><div style="font-weight:600;font-size:13px">🧾 '+(i.id||'')+'</div>'+
    '<div style="font-size:11px;color:var(--textd)">'+(i.dueDate?'Due '+formatDate(i.dueDate):'—')+'</div></div>'+
    '<div style="text-align:right"><div style="font-weight:700;color:var(--g700)">'+formatMoney(i.total||0)+'</div>'+stagePill(i.status)+'</div></div>';
  const quotRow=q=>'<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--cream);border-radius:10px;border:1px solid var(--border);margin-bottom:6px">'+
    '<div style="flex:1"><div style="font-weight:600;font-size:13px">📄 '+(q.id||'')+' · '+(q.destination||'')+'</div>'+
    '<div style="font-size:11px;color:var(--textd)">'+(q.pax?q.pax+' pax · ':'')+formatMoney(q.grandTotal||q.amount||0)+'</div></div>'+
    stagePill(q.status||'draft')+'</div>';
  document.getElementById('vc-body').innerHTML=`
    <div style="display:flex;align-items:center;gap:14px;padding:14px;background:var(--cream);border-radius:12px;margin-bottom:16px">
      <div style="width:52px;height:52px;border-radius:50%;background:${c.color||'var(--g600)'};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff;flex-shrink:0">${initials(c.name)}</div>
      <div style="flex:1">
        <div style="font-size:16px;font-weight:700">${c.name}</div>
        <div style="font-size:12px;color:var(--textd);margin-top:2px">${c.phone} ${c.email?'· '+c.email:''}</div>
        <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
          ${c.tag==='vip'?'<span class="pill pill-gold">⭐ VIP</span>':''}
          ${c.travelType?`<span class="pill pill-blue">${TRAVEL_TYPE_LABELS[c.travelType]||c.travelType}</span>`:''}
          ${c.budgetRange?`<span class="pill pill-gray">${BUDGET_LABELS[c.budgetRange]||c.budgetRange}</span>`:''}
        </div>
      </div>
    </div>
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="stat-card"><div class="stat-label">Bookings</div><div class="stat-val">${c.bookingsCount||0}</div></div>
      <div class="stat-card"><div class="stat-label">Total Spent</div><div class="stat-val" style="font-size:17px">${formatMoney(c.totalSpent||0)}</div></div>
      <div class="stat-card"><div class="stat-label">Avg / Trip</div><div class="stat-val" style="font-size:17px">${c.bookingsCount>0?formatMoney(Math.round(c.totalSpent/c.bookingsCount)):'—'}</div></div>
      <div class="stat-card"><div class="stat-label">Quotations</div><div class="stat-val">${custQuots.length}</div></div>
    </div>
    <div class="form-grid" style="margin-bottom:14px">
      <div><div class="form-label">City</div><div style="font-size:12.5px;margin-top:4px">${c.city||'—'}</div></div>
      <div><div class="form-label">DOB</div><div style="font-size:12.5px;margin-top:4px">${c.dob?formatDate(c.dob):'—'}</div></div>
      <div><div class="form-label">Anniversary</div><div style="font-size:12.5px;margin-top:4px">${c.anniversary?formatDate(c.anniversary):'—'}</div></div>
      <div><div class="form-label">Address</div><div style="font-size:12.5px;margin-top:4px">${c.address||'—'}</div></div>
      <div><div class="form-label">Passport No.</div><div style="font-size:12.5px;margin-top:4px;font-family:monospace;font-weight:600">${c.passportNo||'—'}</div></div>
      <div><div class="form-label">Passport Expiry</div><div style="font-size:12.5px;margin-top:4px;color:${passExpired?'var(--red)':passWarn?'var(--amb)':'inherit'};font-weight:${passWarn||passExpired?'700':'400'}">${c.passportExpiry?formatDate(c.passportExpiry)+(passExpired?' ✗ EXPIRED':passWarn?' ⚠ Expiring Soon':''):'—'}</div></div>
      ${c.prefDest?`<div style="grid-column:1/-1"><div class="form-label">Preferred Destinations</div><div style="font-size:12.5px;margin-top:4px">${c.prefDest}</div></div>`:''}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      <button class="btn btn-sm btn-outline" onclick="custWhatsApp('${c.id}')">💬 WhatsApp</button>
      <button class="btn btn-sm btn-outline" onclick="closeModal('modal-view-customer');editCustomer('${c.id}')">✏️ Edit</button>
      <button class="btn btn-sm btn-green" onclick="newLeadFromCustomer('${c.id}')">+ New Lead</button>
      <button class="btn btn-sm btn-outline" style="margin-left:auto;color:var(--red)" onclick="deleteCustomer('${c.id}')">🗑 Delete</button>
    </div>
    ${custBookings.length?`<div class="form-section">✈️ Bookings (${custBookings.length})</div>${custBookings.map(b=>'<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--cream);border-radius:10px;border:1px solid var(--border);margin-bottom:6px"><div style="flex:1"><div style="font-weight:600;font-size:13px">✈️ '+b.destination+'</div><div style="font-size:11px;color:var(--textd)">'+(b.ref||'')+' · '+formatDate(b.travelDate)+'</div></div><div style="text-align:right"><div style="font-weight:700;color:var(--g700)">'+formatMoney(b.totalAmount||0)+'</div>'+stagePill(b.status)+'</div></div>').join('')}`:''}
    ${custQuots.length?`<div class="form-section">📄 Quotations (${custQuots.length})</div>${custQuots.map(quotRow).join('')}`:''}
    ${custInvoices.length?`<div class="form-section">🧾 Invoices (${custInvoices.length})</div>${custInvoices.map(invRow).join('')}`:''}
    ${custLeads.length?`<div class="form-section">🎯 Leads (${custLeads.length})</div>${custLeads.map(l=>'<div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--cream);border-radius:10px;border:1px solid var(--border);margin-bottom:6px"><div style="flex:1"><div style="font-weight:600;font-size:13px">🎯 '+l.destination+'</div><div style="font-size:11px;color:var(--textd)">'+(l.source||'')+' · '+(l.agent||'Unassigned')+'</div></div>'+stagePill(l.stage)+'</div>').join('')}`:''}
    ${c.notes?`<div class="form-section">Notes</div><div style="font-size:13px;color:var(--textm);background:var(--cream);border-radius:10px;padding:12px;line-height:1.6">${c.notes}</div>`:''}`;
  openModal('modal-view-customer');
}

function openAddCustomerModal(){
  document.getElementById('c-edit-id').value='';
  document.getElementById('cust-modal-title').textContent='Add New Customer';
  ['c-name','c-phone','c-email','c-dob','c-city','c-address','c-pref-dest','c-anniversary','c-passport-no','c-passport','c-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const t=document.getElementById('c-type');if(t)t.value='';
  const b=document.getElementById('c-budget');if(b)b.value='';
  const tag=document.getElementById('c-tag');if(tag)tag.value='regular';
  const wa=document.getElementById('c-wa-optin');if(wa)wa.value='yes';
  const err=document.getElementById('c-error');if(err){err.style.display='none';err.textContent='';}
  openModal('modal-add-customer');
}

function editCustomer(id){
  const c=DB.customers.find(x=>x.id===id);if(!c)return;
  document.getElementById('c-edit-id').value=id;
  document.getElementById('cust-modal-title').textContent='Edit Customer';
  const s=(elId,val)=>{const el=document.getElementById(elId);if(el)el.value=val||'';};
  s('c-name',c.name);s('c-phone',c.phone);s('c-email',c.email);s('c-dob',c.dob);s('c-city',c.city);s('c-address',c.address);s('c-pref-dest',c.prefDest);s('c-anniversary',c.anniversary);s('c-passport-no',c.passportNo);s('c-passport',c.passportExpiry);s('c-notes',c.notes);
  const sel=(elId,val)=>{const el=document.getElementById(elId);if(el&&val)el.value=val;};
  sel('c-type',c.travelType);sel('c-budget',c.budgetRange);sel('c-tag',c.tag||'regular');sel('c-wa-optin',c.waOptin||'yes');
  openModal('modal-add-customer');
}

function saveCustomer(){
  const editId=document.getElementById('c-edit-id').value;
  const name=document.getElementById('c-name').value.trim();
  const phone=document.getElementById('c-phone').value.trim();
  if(!name||!phone){showError('c-error','Name and phone are required.');return;}
  const dup=DB.customers.find(c=>c.phone===phone&&c.id!==editId);
  if(dup){showError('c-error','A customer with this phone already exists.');return;}
  const fields={name,phone,email:document.getElementById('c-email').value,dob:document.getElementById('c-dob').value,city:document.getElementById('c-city').value,address:document.getElementById('c-address').value,travelType:document.getElementById('c-type').value,budgetRange:document.getElementById('c-budget').value,prefDest:document.getElementById('c-pref-dest').value,anniversary:document.getElementById('c-anniversary').value,passportNo:document.getElementById('c-passport-no').value,passportExpiry:document.getElementById('c-passport').value,tag:document.getElementById('c-tag').value||'regular',waOptin:document.getElementById('c-wa-optin').value,notes:document.getElementById('c-notes').value};
  if(editId){const c=DB.customers.find(x=>x.id===editId);if(c){Object.assign(c,fields);if(typeof dbSave==='function')dbSave('customers',c).catch(()=>{});}saveDB();closeModal('modal-add-customer');renderCustomers();showToast(`${name} updated`);}
  else{const color=['#134a32','#1976d2','#f57c00','#7b1fa2','#c9a84c','#d32f2f','#00796b'][Math.floor(Math.random()*7)];const cust={id:uid(),...fields,color,bookingsCount:0,totalSpent:0,officeId:officeIdForNewRecord(),createdBy:createdByStamp(),createdAt:new Date().toISOString()};DB.customers.unshift(cust);if(typeof dbSave==='function')dbSave('customers',cust).catch(()=>{});saveDB();logActivity(`New customer: ${name}`,'customer');closeModal('modal-add-customer');renderCustomers();showToast(`${name} added!`);}
  document.getElementById('c-edit-id').value='';document.getElementById('cust-modal-title').textContent='Add New Customer';
  const errEl=document.getElementById('c-error');if(errEl){errEl.style.display='none';errEl.textContent='';}
  ['c-name','c-phone','c-email','c-dob','c-city','c-address','c-pref-dest','c-anniversary','c-passport-no','c-passport','c-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
}

function deleteCustomer(id){
  if(typeof canUserDoAction==='function'&&!canUserDoAction('delete_lead')){showToast('No permission to delete customers','error');return;}
  const c=DB.customers.find(x=>x.id===id);if(!c)return;
  const old=document.getElementById('del-cust-overlay');if(old)old.remove();
  const ov=document.createElement('div');ov.id='del-cust-overlay';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center';
  ov.innerHTML=`<div style="background:#fff;border-radius:14px;padding:26px 24px 20px;width:320px;box-shadow:0 20px 60px rgba(0,0,0,.2)">
    <div style="font-size:16px;font-weight:700;margin-bottom:8px">🗑 Delete Customer</div>
    <div style="font-size:13px;color:var(--textd);margin-bottom:18px">Remove <strong>${c.name}</strong>? This cannot be undone.</div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline" style="flex:1" onclick="document.getElementById('del-cust-overlay').remove()">Cancel</button>
      <button class="btn" style="flex:1;background:var(--red);color:#fff;border-color:var(--red)" onclick="confirmDeleteCustomer('${id}')">Delete</button>
    </div>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click',e=>{if(e.target===ov)ov.remove();});
}
function confirmDeleteCustomer(id){
  document.getElementById('del-cust-overlay')?.remove();
  DB.customers=DB.customers.filter(c=>c.id!==id);
  if(typeof dbDelete==='function')dbDelete('customers',id);
  saveDB();closeModal('modal-view-customer');renderCustomers();showToast('Customer removed');
}


function newLeadFromCustomer(id){
  const c=DB.customers.find(x=>x.id===id);if(!c)return;
  closeModal('modal-view-customer');
  goTo('leads');
  sessionStorage.setItem('wanago_prefill_lead',JSON.stringify({customerId:c.id,name:c.name,phone:c.phone,email:c.email||'',travelType:c.travelType||'domestic',source:'Existing Customer'}));
}

window.renderCustomers=renderCustomers;window.filterCustomers=filterCustomers;window.searchCustomers=searchCustomers;
window.viewCustomer=viewCustomer;window.editCustomer=editCustomer;window.saveCustomer=saveCustomer;
window.deleteCustomer=deleteCustomer;window.confirmDeleteCustomer=confirmDeleteCustomer;
window.custWhatsApp=custWhatsApp;window.openAddCustomerModal=openAddCustomerModal;
window.newLeadFromCustomer=newLeadFromCustomer;

initPage(function() {
  renderCustomers();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() { renderCustomers(); }, 5000);
  }
});
