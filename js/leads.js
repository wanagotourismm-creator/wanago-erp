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

//  WANAGO ERP — Leads Module
// ═══════════════════════════════════════════════════════════════



// ── State ──
let leadsFilter = 'all';
let leadsSearchQuery = '';
let selectedLeadIds = new Set();
let leadsAiSort = false;

function toggleAiSort() {
  leadsAiSort = !leadsAiSort;
  const btn = document.getElementById('ai-sort-btn');
  if (btn) {
    btn.style.background = leadsAiSort ? 'var(--g700)' : '';
    btn.style.color      = leadsAiSort ? '#fff' : '';
    btn.textContent      = leadsAiSort ? '🤖 AI Sort ON' : '🤖 AI Sort';
  }
  renderLeads();
}
window.toggleAiSort = toggleAiSort;

// ── Lead Score (AI-powered when available) ──
function leadScore(l) {
  if (typeof window.WanagoAI !== 'undefined') return WanagoAI.scoreLeadHeat(l);
  let s=0;
  if(l.priority==='hot')s+=40; else if(l.priority==='warm')s+=20;
  if(l.budget>100000)s+=20; else if(l.budget>50000)s+=10;
  if(l.followup===today())s+=20;
  if(['quoted','negotiation'].includes(l.stage))s+=15;
  if(l.advance>0)s+=10;
  return Math.min(s,100);
}
function scoreBar(score) {
  const color = score>=70?'var(--g600)':score>=40?'var(--amb)':'var(--red)';
  let heat = '';
  if (typeof window.WanagoAI !== 'undefined') {
    const h = WanagoAI.heatLabel(score);
    heat = `<div style="font-size:9.5px;font-weight:700;color:${h.color};margin-top:2px;line-height:1">${h.label}</div>`;
  }
  return `<div><div style="display:flex;align-items:center;gap:5px"><div style="flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden"><div style="height:100%;width:${score}%;background:${color};border-radius:3px"></div></div><span style="font-size:10px;font-weight:700;color:${color};min-width:22px">${score}</span></div>${heat}</div>`;
}

// ── Stats ──
function renderLeadsStats() {
  const all=hScoped('leads');
  const open=all.filter(l=>!['won','lost'].includes(l.stage));
  const won=all.filter(l=>l.stage==='won');
  const hot=all.filter(l=>l.priority==='hot'&&!['won','lost'].includes(l.stage));
  const todayStr=today();
  const overdueFU=open.filter(l=>l.followup&&l.followup<todayStr);
  const todayFU=open.filter(l=>l.followup===todayStr);
  const pipeline=open.reduce((s,l)=>s+Number(l.budget||0),0);
  const cvr=all.length?Math.round(won.length/all.length*100):0;
  const fmt=n=>n>=100000?'₹'+(n/100000).toFixed(1)+'L':n>=1000?'₹'+(n/1000).toFixed(0)+'K':'₹'+n;
  const s=id=>{const el=document.getElementById(id);if(el)return el;return{textContent:''}};
  s('lstat-total').textContent=all.length;
  s('lstat-hot').textContent=hot.length;
  s('lstat-won').textContent=won.length;
  s('lstat-cvr').textContent=cvr+'% CVR';
  s('lstat-pipeline').textContent=fmt(pipeline);
  s('lstat-overdue').textContent=overdueFU.length;
  s('lstat-today').textContent=todayFU.length;
}

function populateLeadFilters() {
  const agentSel=document.getElementById('leads-agent-filter');
  if(agentSel){const cur=agentSel.value;const agents=[...new Set(hScoped('leads').map(l=>l.agent).filter(Boolean))];agentSel.innerHTML='<option value="">All Agents</option>'+agents.map(a=>`<option value="${a}" ${cur===a?'selected':''}>${a}</option>`).join('');}
  const srcSel=document.getElementById('leads-source-filter');
  if(srcSel){const cur=srcSel.value;const srcs=[...new Set(hScoped('leads').map(l=>l.source).filter(Boolean))];srcSel.innerHTML='<option value="">All Sources</option>'+srcs.map(s=>`<option value="${s}" ${cur===s?'selected':''}>${s}</option>`).join('');}
  const pkgSel=document.getElementById('leads-pkg-filter');
  if(pkgSel){const cur=pkgSel.value;pkgSel.innerHTML='<option value="">All Packages</option>'+(DB.packages||[]).map(p=>`<option value="${p.id}" ${cur===p.id?'selected':''}>${p.name}</option>`).join('');}
}

// ── Main render ──
function renderLeads(filter) {
  if(filter) leadsFilter=filter;
  renderLeadsStats(); populateLeadFilters();
  let leads=hScoped('leads');
  if(leadsFilter!=='all') leads=leads.filter(l=>l.stage===leadsFilter);
  const q=leadsSearchQuery.toLowerCase();
  if(q) leads=leads.filter(l=>l.name.toLowerCase().includes(q)||(l.phone||'').includes(q)||(l.destination||'').toLowerCase().includes(q)||(l.email||'').toLowerCase().includes(q));
  const agentF=document.getElementById('leads-agent-filter')?.value;
  if(agentF) leads=leads.filter(l=>l.agent===agentF);
  const priF=document.getElementById('leads-priority-filter')?.value;
  if(priF) leads=leads.filter(l=>l.priority===priF);
  const srcF=document.getElementById('leads-source-filter')?.value;
  if(srcF) leads=leads.filter(l=>l.source===srcF);
  const pkgF=document.getElementById('leads-pkg-filter')?.value;
  if(pkgF) leads=leads.filter(l=>l.packageId===pkgF);

  // AI sort — order by heat score descending
  if (leadsAiSort && typeof window.WanagoAI !== 'undefined') {
    leads = leads.map(l => ({ ...l, _score: WanagoAI.scoreLeadHeat(l) }))
                 .sort((a, b) => b._score - a._score);
  }

  const tbody=document.getElementById('leads-tbody');
  if(!tbody) return;
  if(!leads.length){tbody.innerHTML=emptyRow(13,'No leads match your filters.');return;}
  const priIcon={hot:'🔥',warm:'🌤',cold:'❄️'};
  tbody.innerHTML=leads.map(l=>{
    const score=leadScore(l);
    const isSelected=selectedLeadIds.has(l.id);
    const pkg=l.packageId?(DB.packages||[]).find(p=>p.id===l.packageId):null;
    return `<tr id="lrow-${l.id}" style="${isSelected?'background:var(--g50)':''}">
      <td><input type="checkbox" class="lead-checkbox" data-id="${l.id}" ${isSelected?'checked':''} onchange="toggleLeadSelect(this)" style="cursor:pointer"></td>
      <td><div style="font-weight:600">${l.name} <span style="font-size:12px">${priIcon[l.priority]||''}</span></div><div style="font-size:10.5px;color:var(--textd)">${l.phone}</div></td>
      <td>${l.destination}<br><span style="font-size:10px;color:var(--textd)">${l.tripType==='international'?'✈️ Intl':'🇮🇳 Dom'}</span></td>
      <td>${pkg?`<div style="font-size:11px;font-weight:600;color:var(--g700)">${pkg.name}</div>`:`<span style="color:var(--textd);font-size:11px">—</span>`}</td>
      <td><span class="pill pill-gray" style="font-size:9.5px">${l.source||'—'}</span></td>
      <td>${stagePill(l.stage)}</td>
      <td style="min-width:85px">${scoreBar(score)}</td>
      <td>${l.budget?formatMoney(l.budget):'—'}</td>
      <td style="color:var(--g600);font-weight:500">${l.advance?formatMoney(l.advance):'—'}</td>
      <td style="${l.balance>0?'color:var(--red);font-weight:600':'color:var(--textd)'}">${l.balance!=null?formatMoney(l.balance):'—'}</td>
      <td>${l.agent||'—'}</td>
      <td style="${isOverdue(l.followup)?'color:var(--red);font-weight:600':''}">${l.followup?formatDate(l.followup)+(isOverdue(l.followup)?' ⚠':''):'—'}</td>
      <td style="white-space:nowrap">
        <button class="row-btn" onclick="viewLead('${l.id}')">View</button>
        <button class="row-btn" style="margin-left:3px;background:#075e54;color:#fff;border-color:#075e54" onclick="openSalesChatWindow('${l.phone}','${l.name}','lead')" title="Sales Chat">💬</button>
        <button class="row-btn" style="margin-left:3px;color:var(--red)" onclick="deleteLead('${l.id}')">✕</button>
      </td>
    </tr>`;
  }).join('');
  updateLeadBulkBar();
}

function filterLeads(f,el){document.querySelectorAll('#leads-table .chip').forEach(c=>c.classList.remove('active'));el.classList.add('active');renderLeads(f);}
function searchLeads(q){leadsSearchQuery=q;renderLeads();}
function isOverdue(d){return d&&d<today();}

// ── Add Lead ──
function openAddLeadModal(){
  document.getElementById('l-edit-id').value='';
  document.getElementById('leads-modal-title').textContent='Add New Lead';
  ['l-name','l-phone','l-email','l-dest','l-budget','l-advance','l-balance','l-pax','l-notes','l-traveldate'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['l-source','l-triptype','l-priority','l-stage'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const agentSel=document.getElementById('l-agent');
  if(agentSel){agentSel.innerHTML='<option value="">Unassigned</option>'+(DB.settings.team||[]).map(m=>`<option value="${m.name}">${m.name}</option>`).join('');}
  populateLeadPackageSelect();
  const fuEl=document.getElementById('l-followup');if(fuEl)fuEl.value=today();
  openModal('modal-add-lead');
}

function calcLeadBalance(){
  const budget=parseFloat(document.getElementById('l-budget').value)||0;
  const advance=parseFloat(document.getElementById('l-advance').value)||0;
  document.getElementById('l-balance').value=Math.max(0,budget-advance);
}

function onLeadPackageSelect(){
  const pkgId=document.getElementById('l-package').value; if(!pkgId) return;
  const pkg=(DB.packages||[]).find(p=>p.id===pkgId); if(!pkg) return;
  const destEl=document.getElementById('l-dest'); const budgetEl=document.getElementById('l-budget'); const tripEl=document.getElementById('l-triptype');
  if(destEl&&pkg.destination)destEl.value=pkg.destination;
  if(budgetEl&&pkg.price){budgetEl.value=pkg.price;calcLeadBalance();}
  if(tripEl&&pkg.category)tripEl.value=pkg.category==='international'?'international':'domestic';
}

function populateLeadPackageSelect(){
  const sel=document.getElementById('l-package'); if(!sel) return;
  sel.innerHTML='<option value="">No Package — Enter manually</option>';
  (DB.packages||[]).filter(p=>p.status!=='inactive').forEach(p=>{sel.insertAdjacentHTML('beforeend',`<option value="${p.id}">${p.name}${p.destination?' — '+p.destination:''}${p.price?' (₹'+Number(p.price).toLocaleString('en-IN')+')':''}</option>`);});
}

function saveLead(){
  if(!currentUser){showToast('Not authenticated','error');return;}
  const name=document.getElementById('l-name').value.trim();
  const phone=document.getElementById('l-phone').value.trim();
  const dest=document.getElementById('l-dest').value.trim();
  const source=document.getElementById('l-source').value;
  if(!name||!phone||!dest||!source){showError('l-error','Name, phone, destination and source are required.');return;}
  const budget=parseFloat(document.getElementById('l-budget').value)||0;
  const advance=parseFloat(document.getElementById('l-advance').value)||0;
  const balance=Math.max(0,budget-advance);
  const pkgId=document.getElementById('l-package')?.value||'';
  const existingCust=DB.customers.find(c=>c.phone===phone);
  const editId=document.getElementById('l-edit-id').value;
  const data={
    name,phone,email:document.getElementById('l-email').value.trim(),
    destination:dest,tripType:document.getElementById('l-triptype').value||'domestic',
    source,priority:document.getElementById('l-priority').value||'warm',
    stage:document.getElementById('l-stage').value||'new',
    agent:document.getElementById('l-agent').value||'',
    pax:parseInt(document.getElementById('l-pax').value)||1,
    travelDate:document.getElementById('l-traveldate').value,
    budget,advance,balance,
    packageId:pkgId,
    followup:document.getElementById('l-followup').value||today(),
    notes:document.getElementById('l-notes').value,
    customerId:existingCust?.id||null,
  };
  if(editId){
    const idx=DB.leads.findIndex(l=>l.id===editId);
    if(idx>-1){ Object.assign(DB.leads[idx],data); dbSave('leads', DB.leads[idx]); }
    showToast(name+' updated!');
  } else {
    const _newLead = {id:uid(),...data,officeId:officeIdForNewRecord(),createdBy:createdByStamp(),createdAt:new Date().toISOString()};
    DB.leads.unshift(_newLead);
    dbSave('leads', _newLead);
    if (typeof notifyEvent === 'function') notifyEvent('lead_created', _newLead);
    showToast(name+' added as lead!');
    logActivity('New lead: '+name+' → '+dest,'lead');
  }
  saveDB(); closeModal('modal-add-lead'); renderLeads();
}

// ── Bulk selection ──
function toggleLeadSelect(cb){
  const id=cb.dataset.id;
  if(cb.checked)selectedLeadIds.add(id); else selectedLeadIds.delete(id);
  const row=document.getElementById('lrow-'+id);
  if(row)row.style.background=cb.checked?'var(--g50)':'';
  updateLeadBulkBar();
}
function toggleSelectAllLeads(cb){
  document.querySelectorAll('.lead-checkbox').forEach(c=>{
    c.checked=cb.checked;
    const id=c.dataset.id;
    if(cb.checked)selectedLeadIds.add(id); else selectedLeadIds.delete(id);
    const row=document.getElementById('lrow-'+id);
    if(row)row.style.background=cb.checked?'var(--g50)':'';
  });
  updateLeadBulkBar();
}
function updateLeadBulkBar(){
  const bar=document.getElementById('leads-bulk-bar'); if(!bar) return;
  if(selectedLeadIds.size>0){bar.style.display='flex';const el=document.getElementById('leads-selected-count');if(el)el.textContent=(selectedLeadIds.size)+' lead'+(selectedLeadIds.size>1?'s':'')+' selected';}
  else bar.style.display='none';
}
function clearBulkSelection(){
  selectedLeadIds.clear();
  document.querySelectorAll('.lead-checkbox').forEach(c=>c.checked=false);
  const all=document.querySelector('#leads-table thead input[type=checkbox]');if(all)all.checked=false;
  const bar=document.getElementById('leads-bulk-bar');if(bar)bar.style.display='none';
}
function bulkStageChange(stage){
  if(!selectedLeadIds.size)return;
  selectedLeadIds.forEach(id=>{const l=DB.leads.find(x=>x.id===id);if(l){l.stage=stage;dbSave('leads',l);}});
  saveDB(); const count=selectedLeadIds.size; selectedLeadIds.clear();
  renderLeads(); showToast(`${count} leads moved to "${stage}"`);
}
function bulkAssignAgent(){
  const team=(DB.settings.team||[]).filter(m=>['sales','management'].includes(m.dept));
  if(!team.length){showToast('No sales agents in Admin → Team','error');return;}
  const agent=prompt('Assign to agent:\n'+team.map((m,i)=>`${i+1}. ${m.name}`).join('\n')+'\n\nEnter number:');
  if(!agent)return; const idx=parseInt(agent)-1;
  if(isNaN(idx)||idx<0||idx>=team.length)return;
  const agentName=team[idx].name;
  selectedLeadIds.forEach(id=>{const l=DB.leads.find(x=>x.id===id);if(l){l.agent=agentName;dbSave('leads',l);}});
  saveDB(); selectedLeadIds.clear(); renderLeads();
  const bar=document.getElementById('leads-bulk-bar');if(bar)bar.style.display='none';
  showToast('Leads assigned to '+agentName+'!');
}
function bulkDelete(){
  if(!selectedLeadIds.size)return;
  if(!confirm(`Delete ${selectedLeadIds.size} leads? Cannot be undone.`))return;
  if(typeof dbDelete==='function')selectedLeadIds.forEach(id=>dbDelete('leads',id));
  selectedLeadIds.forEach(id=>dbDelete('leads',id));
  DB.leads=DB.leads.filter(l=>!selectedLeadIds.has(l.id));
  saveDB(); selectedLeadIds.clear(); renderLeads();
  const bar=document.getElementById('leads-bulk-bar');if(bar)bar.style.display='none';
  showToast('Leads deleted');
}
function bulkExport(){
  const leads=hScoped('leads').filter(l=>selectedLeadIds.has(l.id));
  doExportLeads(leads,'selected_leads');
}
function bulkExportSelected(){bulkExport();}

// ── View Lead ──
function viewLead(id){
  const l=DB.leads.find(x=>x.id===id); if(!l) return;
  document.getElementById('vl-title').textContent=l.name;
  document.getElementById('modal-view-lead')._leadId=id;
  const pkg=l.packageId?(DB.packages||[]).find(p=>p.id===l.packageId):null;
  document.getElementById('vl-body').innerHTML=`
    <div class="form-grid" style="margin-bottom:16px">
      <div><div class="form-label">Phone</div><div style="margin-top:4px;font-size:13px">${l.phone}</div></div>
      <div><div class="form-label">Email</div><div style="margin-top:4px;font-size:13px">${l.email||'—'}</div></div>
      <div><div class="form-label">Destination</div><div style="margin-top:4px;font-size:13px">${l.destination}</div></div>
      <div><div class="form-label">Trip Type</div><div style="margin-top:4px;font-size:13px">${l.tripType==='international'?'✈️ International':'🇮🇳 Domestic'}</div></div>
      <div><div class="form-label">Travel Date</div><div style="margin-top:4px;font-size:13px">${formatDate(l.travelDate)}</div></div>
      <div><div class="form-label">Pax</div><div style="margin-top:4px;font-size:13px">${l.pax||'—'}</div></div>
      <div><div class="form-label">Package Amount</div><div style="margin-top:4px;font-size:13px;font-weight:600">${l.budget?formatMoney(l.budget):'—'}</div></div>
      <div><div class="form-label">Advance Paid</div><div style="margin-top:4px;font-size:13px;color:var(--g600);font-weight:600">${l.advance?formatMoney(l.advance):'—'}</div></div>
      <div><div class="form-label">Balance Due</div><div style="margin-top:4px;font-size:13px;color:var(--red);font-weight:700">${l.balance!=null?formatMoney(l.balance):'—'}</div></div>
      <div><div class="form-label">Source</div><div style="margin-top:4px">${stagePill(l.source||'other')}</div></div>
      <div><div class="form-label">Stage</div><div style="margin-top:4px">${stagePill(l.stage)}</div></div>
      <div><div class="form-label">Priority</div><div style="margin-top:4px">${l.priority==='hot'?'🔥 Hot':l.priority==='warm'?'🌤 Warm':'❄️ Cold'}</div></div>
      <div><div class="form-label">Agent</div><div style="margin-top:4px;font-size:13px">${l.agent||'Unassigned'}</div></div>
      <div><div class="form-label">Follow-up</div><div style="margin-top:4px;font-size:13px;${isOverdue(l.followup)?'color:var(--red);font-weight:600':''}">${formatDate(l.followup)||'—'}${isOverdue(l.followup)?' ⚠️ Overdue':''}</div></div>
      ${pkg?`<div style="grid-column:1/-1"><div class="form-label">Package</div><div style="margin-top:4px;font-size:13px;font-weight:600;color:var(--g700)">${pkg.name}</div></div>`:''}
      ${l.notes?`<div style="grid-column:1/-1"><div class="form-label">Notes</div><div style="margin-top:4px;font-size:13px;background:var(--cream);padding:10px;border-radius:8px">${l.notes}</div></div>`:''}
    </div>
    <div class="form-section">Update Stage</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
      ${['new','contacted','follow_up','quoted','negotiation','won','lost'].map(s=>`<button class="btn btn-sm ${l.stage===s?'btn-primary':'btn-outline'}" onclick="updateLeadStage('${l.id}','${s}')">${s.replace('_',' ')}</button>`).join('')}
    </div>
    <div class="form-section">Finance</div>
    <div class="form-grid" style="margin-bottom:12px">
      <div class="form-group"><label class="form-label">Budget</label><input class="form-input" type="number" id="vl-budget" value="${l.budget||0}"></div>
      <div class="form-group"><label class="form-label">Advance Paid</label><input class="form-input" type="number" id="vl-advance" value="${l.advance||0}" oninput="updateLeadBalance()"></div>
      <div class="form-group"><label class="form-label">Balance</label><input class="form-input" id="vl-balance" readonly value="${l.balance||0}" style="background:var(--cream)"></div>
    </div>
    <button class="btn btn-sm btn-green" onclick="saveLeadFinancials('${l.id}')">Save Finance</button>
    <div class="form-section" style="margin-top:14px">Log Follow-up</div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Next Follow-up Date</label><input class="form-input" type="date" id="vl-followup" value="${l.followup||today()}"></div>
      <div class="form-group"><label class="form-label">Note</label><input class="form-input" id="vl-fupnote" placeholder="Call about pricing..."></div>
    </div>
    <button class="btn btn-sm btn-primary" style="margin-top:8px" onclick="logFollowUp()">📅 Save Follow-up</button>
    <div class="form-section" style="margin-top:14px">📎 Attachments</div>
    <div id="vl-attach-list">${_renderLeadAttachments(l)}</div>
    <label class="btn btn-sm btn-outline" style="cursor:pointer;display:inline-block;margin-top:6px">
      <input type="file" style="display:none" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onchange="uploadLeadFiles('${l.id}',this)">
      📎 Attach Files
    </label>
    <div id="vl-upload-progress" style="display:none;font-size:11px;color:var(--g600);margin-top:4px"></div>
    <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn btn-sm btn-outline" onclick="openSalesChatWindow('${l.phone}','${l.name}','lead')">💬 Sales Chat</button>
      ${!['won','lost'].includes(l.stage)?(l.quotationId?`<button class="btn btn-sm btn-outline" style="color:var(--blue)" onclick="closeModal('modal-view-lead');goTo('quotations')">📋 View Quotation</button>`:`<button class="btn btn-sm btn-green" onclick="createQuotationFromLead('${l.id}');closeModal('modal-view-lead');showToast('Quotation created — opening Quotations');goTo('quotations')">📋 Create Quotation</button>`):''}
      <button class="btn btn-sm btn-outline" style="margin-left:auto;color:var(--red)" onclick="deleteLead('${l.id}')">🗑 Delete</button>
    </div>`;
  openModal('modal-view-lead');
}

function updateLeadBalance(){
  const b=parseFloat(document.getElementById('vl-budget')?.value)||0;
  const a=parseFloat(document.getElementById('vl-advance')?.value)||0;
  const el=document.getElementById('vl-balance');if(el)el.value=Math.max(0,b-a);
}
function saveLeadFinancials(id){
  const l=DB.leads.find(x=>x.id===id);if(!l)return;
  l.budget=parseFloat(document.getElementById('vl-budget').value)||0;
  l.advance=parseFloat(document.getElementById('vl-advance').value)||0;
  l.balance=Math.max(0,l.budget-l.advance);
  saveDB();renderLeads();showToast('Finance updated!');viewLead(id);
}
function updateLeadStage(id,stage){
  const l=DB.leads.find(x=>x.id===id);if(!l)return;
  l.stage=stage;dbSave('leads',l);saveDB();renderLeads();showToast(l.name+' → '+stage.replace('_',' '));viewLead(id);
}
function logFollowUp(){
  const id=document.getElementById('modal-view-lead')._leadId;
  const l=DB.leads.find(x=>x.id===id);if(!l)return;
  const date=document.getElementById('vl-followup').value;
  const note=document.getElementById('vl-fupnote').value;
  l.followup=date;
  if(note){if(!l.followupLog)l.followupLog=[];l.followupLog.push({date:today(),note,by:currentUser?.name||'Admin'});}
  dbSave('leads',l);saveDB();renderLeads();showToast('Follow-up saved for '+formatDate(date));viewLead(id);
}
function deleteLead(id){
  if(typeof canUserDoAction==='function'&&!canUserDoAction('delete_lead')){showToast('No permission to delete leads','error');return;}
  const l=DB.leads.find(x=>x.id===id);if(!l)return;
  if(!confirm('Delete lead '+l.name+'?'))return;
  dbDelete('leads',id);
  DB.leads=DB.leads.filter(x=>x.id!==id);
  if(typeof dbDelete==='function')dbDelete('leads',id);
  saveDB();closeModal('modal-view-lead');renderLeads();showToast('Lead removed');
}

// ── Analytics ──
function renderLeadsAnalytics(){
  const all=hScoped('leads');
  const stages=[{key:'new',label:'New'},{key:'contacted',label:'Contacted'},{key:'follow_up',label:'Follow-up'},{key:'quoted',label:'Quoted'},{key:'negotiation',label:'Negotiation'},{key:'won',label:'Won'}];
  const total=all.length||1;
  const colors=['#134a32','#1a6341','#228050','#2da065','#52c285','#c9a84c'];
  const fw=document.getElementById('leads-funnel-wrap');
  if(fw)fw.innerHTML=stages.map((s,i)=>{const c=all.filter(l=>l.stage===s.key).length;const pct=Math.max(3,c/total*100);return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span>${s.label}</span><span style="font-weight:700">${c} (${Math.round(c/total*100)}%)</span></div><div style="height:8px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${colors[i]};border-radius:4px"></div></div></div>`;}).join('');
  const srcs={};all.forEach(l=>{const s=l.source||'Unknown';srcs[s]=(srcs[s]||0)+1;});
  const sc=document.getElementById('leads-source-chart');
  if(sc)sc.innerHTML=Object.entries(srcs).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([src,cnt],i)=>{const pct=Math.max(4,cnt/total*100);const clrs=['var(--g500)','var(--blue)','var(--amb)','#7c3aed','var(--red)','var(--g300)','var(--g700)','#e91e8c'];return `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:11.5px;margin-bottom:3px"><span>${src}</span><span style="font-weight:700">${cnt}</span></div><div style="height:7px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${clrs[i%clrs.length]};border-radius:4px"></div></div></div>`;}).join('');
  const agents={};all.forEach(l=>{const a=l.agent||'Unassigned';if(!agents[a])agents[a]={total:0,won:0};agents[a].total++;if(l.stage==='won')agents[a].won++;});
  const at=document.getElementById('leads-agent-table');
  if(at)at.innerHTML='<table style="width:100%;font-size:12px"><thead><tr><th style="text-align:left;padding:4px 8px">Agent</th><th style="text-align:center;padding:4px 8px">Leads</th><th style="text-align:center;padding:4px 8px">Won</th><th style="text-align:center;padding:4px 8px">CVR</th></tr></thead><tbody>'+Object.entries(agents).sort((a,b)=>b[1].total-a[1].total).map(([name,d])=>`<tr><td style="padding:4px 8px">${name}</td><td style="text-align:center;padding:4px 8px">${d.total}</td><td style="text-align:center;padding:4px 8px;color:var(--g600);font-weight:600">${d.won}</td><td style="text-align:center;padding:4px 8px"><span style="background:${d.won/d.total>=.2?'var(--g50)':'var(--red2)'};color:${d.won/d.total>=.2?'var(--g700)':'var(--red)'};padding:2px 8px;border-radius:8px;font-size:10.5px">${Math.round(d.won/d.total*100)}%</span></td></tr>`).join('')+'</tbody></table>';
  const mc=document.getElementById('leads-monthly-chart');
  if(mc){
    const months=[];
    for(let i=11;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);months.push(d.toISOString().slice(0,7));}
    const totals={},wons={};
    months.forEach(m=>{totals[m]=0;wons[m]=0;});
    all.forEach(l=>{const m=(l.createdAt||'').slice(0,7);if(totals[m]!==undefined){totals[m]++;if(l.stage==='won')wons[m]++;}});
    const maxVal=Math.max(1,...months.map(m=>totals[m]));
    const hasData=months.some(m=>totals[m]>0);
    if(!hasData){
      mc.innerHTML='<div style="color:var(--textd);font-size:12px;padding:20px;text-align:center">Add more leads to see trend</div>';
    } else {
      const lbl=m=>new Date(m+'-02').toLocaleString('default',{month:'short'});
      mc.innerHTML=
        `<div style="display:flex;align-items:flex-end;gap:3px;height:104px;padding:4px 2px 0">`+
        months.map(m=>{
          const cnt=totals[m],won=wons[m];
          const barH=Math.max(cnt>0?4:0,Math.round(cnt/maxVal*84));
          const wonH=cnt>0&&won>0?Math.round(won/cnt*barH):0;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center">`+
            `<div style="font-size:8.5px;font-weight:700;color:var(--g700);min-height:12px;line-height:12px">${cnt||''}</div>`+
            `<div style="flex:1;width:100%;display:flex;align-items:flex-end">`+
            `<div style="width:100%;height:${barH}px;background:var(--g200);border-radius:3px 3px 0 0;position:relative;overflow:hidden">`+
            (wonH?`<div style="position:absolute;bottom:0;left:0;right:0;height:${wonH}px;background:var(--g600)"></div>`:'')+
            `</div></div>`+
            `<div style="font-size:8.5px;color:var(--textd);margin-top:3px;white-space:nowrap">${lbl(m)}</div>`+
            `</div>`;
        }).join('')+
        `</div>`+
        `<div style="display:flex;gap:14px;justify-content:center;margin-top:6px;padding-bottom:2px">`+
        `<span style="font-size:10px;color:var(--textd);display:flex;align-items:center;gap:4px"><span style="width:10px;height:6px;background:var(--g200);border-radius:2px;display:inline-block"></span>Added</span>`+
        `<span style="font-size:10px;color:var(--textd);display:flex;align-items:center;gap:4px"><span style="width:10px;height:6px;background:var(--g600);border-radius:2px;display:inline-block"></span>Won</span>`+
        `</div>`;
    }
  }
}

// ── Bulk Stage (from Bulk tab) ──
function runBulkStageUpdate(){
  const from=document.getElementById('bulk-from-stage').value;
  const to=document.getElementById('bulk-to-stage').value;
  if(!to){showToast('Select target stage','error');return;}
  let leads=hScoped('leads');
  if(from)leads=leads.filter(l=>l.stage===from);
  if(!leads.length){showToast('No leads match','error');return;}
  if(!confirm(`Move ${leads.length} leads to "${to.replace('_',' ')}"?`))return;
  leads.forEach(l=>l.stage=to);saveDB();renderLeads();showToast(leads.length+' leads updated!');
}
function findStaleLeads(){
  const cutoff=new Date(Date.now()-14*86400000).toISOString().slice(0,10);
  const stale=hScoped('leads').filter(l=>!['won','lost'].includes(l.stage)&&(l.createdAt||'').slice(0,10)<cutoff&&(!l.followup||l.followup<cutoff));
  const el=document.getElementById('stale-leads-result');
  if(el)el.innerHTML=stale.length?`<div style="font-size:13px;color:var(--red);font-weight:600;margin-bottom:8px">⚠️ ${stale.length} stale leads found</div>`+stale.map(l=>`<div style="padding:6px 10px;background:var(--cream);border-radius:6px;margin-bottom:4px;font-size:12px"><strong>${l.name}</strong> — ${l.destination} — ${l.agent||'Unassigned'}</div>`).join(''):'<div style="color:var(--g600);font-size:12px">✅ No stale leads found!</div>';
}
function previewWABlast(){showToast('WhatsApp blast — go to WhatsApp page');}

// ── Follow-ups ──
function renderFollowUps(){
  const today_d=new Date(today()); const weekEnd=new Date(today());weekEnd.setDate(weekEnd.getDate()+7);
  const withFU=hScoped('leads').filter(l=>l.followup&&!['won','lost'].includes(l.stage));
  const overdue=withFU.filter(l=>new Date(l.followup)<today_d);
  const dueToday=withFU.filter(l=>new Date(l.followup).toDateString()===today_d.toDateString());
  const thisWeek=withFU.filter(l=>{const d=new Date(l.followup);return d>today_d&&d<=weekEnd;});
  const s=id=>{const el=document.getElementById(id);if(el)return el;return{textContent:''}};
  s('fu-overdue').textContent=overdue.length;s('fu-today').textContent=dueToday.length;s('fu-week').textContent=thisWeek.length;
  const all=[...overdue,...dueToday,...thisWeek];
  const tbody=document.getElementById('followups-tbody');
  tbody.innerHTML=all.length?all.map(l=>{
    const isOvd=new Date(l.followup)<today_d; const isDue=new Date(l.followup).toDateString()===today_d.toDateString();
    return `<tr><td><div style="font-weight:600">${l.name}</div><div style="font-size:10.5px;color:var(--textd)">${l.phone}</div></td><td>${l.destination}</td><td>${stagePill(l.stage)}</td><td style="${isOvd?'color:var(--red);font-weight:600':isDue?'color:var(--amb);font-weight:600':''}">${formatDate(l.followup)}</td><td>${isOvd?PILL.red('Overdue'):isDue?PILL.amber('Due Today'):PILL.gray('Upcoming')}</td><td><button class="row-btn" onclick="viewLead('${l.id}')">View</button></td></tr>`;
  }).join(''):emptyRow(6,'No follow-ups scheduled');
}

// ── LEAD BOARD ──
function renderLeadBoard(){
  const STAGES=['new','contacted','follow_up','quoted','negotiation','won','lost'];
  const LABELS={new:'New',contacted:'Contacted',follow_up:'Follow-up',quoted:'Quoted',negotiation:'Negotiation',won:'Won',lost:'Lost'};
  const EMOJI={new:'🔵',contacted:'📞',follow_up:'🔄',quoted:'📋',negotiation:'🤝',won:'✅',lost:'❌'};
  const COLORS={new:'#1976d2',contacted:'#00796b',follow_up:'#f57c00',quoted:'#1a6341',negotiation:'#7c3aed',won:'#228050',lost:'#c62828'};
  const board=document.getElementById('kanban-board');if(!board)return;
  const agents=[...new Set(hScoped('leads').map(l=>l.agent).filter(Boolean))];
  const agentSel=document.getElementById('board-agent-filter');
  if(agentSel){const cur=agentSel.value;agentSel.innerHTML='<option value="">All Agents</option>'+agents.map(a=>`<option value="${a}" ${cur===a?'selected':''}>${a}</option>`).join('');}
  const search=(document.getElementById('board-search')?.value||'').toLowerCase();
  const agentF=document.getElementById('board-agent-filter')?.value||'';
  const priorityF=document.getElementById('board-priority-filter')?.value||'';
  let allLeads=hScoped('leads');
  if(search)allLeads=allLeads.filter(l=>l.name.toLowerCase().includes(search)||(l.destination||'').toLowerCase().includes(search));
  if(agentF)allLeads=allLeads.filter(l=>l.agent===agentF);
  if(priorityF)allLeads=allLeads.filter(l=>l.priority===priorityF);
  const pipeline=allLeads.filter(l=>!['won','lost'].includes(l.stage)).reduce((s,l)=>s+Number(l.budget||0),0);
  const statsEl=document.getElementById('board-stats');
  if(statsEl)statsEl.innerHTML=`<span style="font-weight:600;color:var(--g700)">${allLeads.length}</span> leads &nbsp;·&nbsp; Pipeline: <span style="font-weight:600;color:var(--g700)">${formatMoney(pipeline)}</span>`;
  board.innerHTML='<div style="display:grid;grid-template-columns:repeat(7,minmax(210px,1fr));gap:10px;min-width:1400px;padding-bottom:8px">'+
    STAGES.map(s=>{
      const sL=allLeads.filter(l=>l.stage===s);
      const col=COLORS[s];
      const amt=sL.reduce((sum,l)=>sum+Number(l.budget||0),0);
      return `<div style="display:flex;flex-direction:column;border-radius:12px;overflow:hidden;border:1px solid var(--border);background:var(--cream);min-height:400px" ondragover="event.preventDefault();this.style.outline='2px dashed ${col}'" ondragleave="this.style.outline='none'" ondrop="wsKanbanDrop(event,'${s}');this.style.outline='none'">
        <div style="background:${col};padding:10px 12px;flex-shrink:0">
          <div style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:6px"><span>${EMOJI[s]}</span><span style="font-size:12px;font-weight:700;color:#fff">${LABELS[s]}</span></div><span style="background:rgba(255,255,255,.25);color:#fff;border-radius:12px;padding:1px 8px;font-size:10.5px;font-weight:700">${sL.length}</span></div>
          ${amt>0?`<div style="font-size:10px;color:rgba(255,255,255,.75);margin-top:3px">💰 ${formatMoney(amt)}</div>`:''}
        </div>
        <div style="padding:8px;display:flex;flex-direction:column;gap:6px;flex:1;overflow-y:auto;max-height:500px">
          ${sL.map(l=>{
            const ovd=l.followup&&l.followup<today();
            const ini=(l.name||'?').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
            const score=leadScore(l); const sc=score>=70?'var(--g500)':score>=40?'var(--amb)':'var(--red)';
            return `<div class="kanban-card" draggable="true" ondragstart="wsKanbanDragStart(event,'${l.id}')" ondragend="this.style.opacity='1'" onclick="viewLead('${l.id}')" style="border-left:3px solid ${col};cursor:grab">
              <div style="display:flex;align-items:flex-start;gap:7px;margin-bottom:7px">
                <div style="width:26px;height:26px;border-radius:7px;background:${col};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0">${ini}</div>
                <div style="flex:1;min-width:0"><div style="font-size:12.5px;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.name}${l.priority==='hot'?' 🔥':l.priority==='warm'?' 🌤️':''}</div><div style="font-size:10px;color:var(--textd)">📍 ${l.destination||'—'}</div></div>
              </div>
              ${l.budget?`<div style="font-size:11.5px;font-weight:700;color:var(--g700);margin-bottom:5px">₹${Number(l.budget).toLocaleString('en-IN')}</div>`:''}
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><span style="font-size:10px;color:var(--textd)">${l.agent||'Unassigned'}</span>${l.followup?`<span style="font-size:10px;font-weight:600;color:${ovd?'var(--red)':'var(--textd)'}">${ovd?'⚠️ ':' '}${formatDate(l.followup)}</span>`:''}</div>
              <div style="display:flex;align-items:center;gap:4px;margin-bottom:7px"><div style="flex:1;height:3px;background:var(--border);border-radius:2px;overflow:hidden"><div style="height:100%;width:${score}%;background:${sc};border-radius:2px"></div></div><span style="font-size:9px;font-weight:700;color:${sc}">${score}</span></div>
              <div style="display:flex;gap:4px;border-top:1px solid var(--border);padding-top:6px">
                <button onclick="event.stopPropagation();viewLead('${l.id}')" style="flex:1;background:var(--g50);border:1px solid var(--g200);color:var(--g700);border-radius:6px;padding:3px 0;font-size:10px;font-weight:600;cursor:pointer;font-family:inherit">View</button>
                <button onclick="event.stopPropagation();openSalesChatWindow('${l.phone}','${l.name}','lead')" style="background:#075e54;border:none;color:#fff;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">💬</button>
                ${s!=='won'&&s!=='lost'?`<button onclick="event.stopPropagation();boardAdvance('${l.id}')" title="Next stage" style="background:${col};border:none;color:#fff;border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer">→</button>`:''}
              </div>
            </div>`;
          }).join('')}
          ${!sL.length?`<div style="text-align:center;padding:20px 8px;color:var(--textd);font-size:11px;border:2px dashed var(--border2);border-radius:8px">Drop leads here</div>`:''}
          <button onclick="boardAddLead('${s}')" style="width:100%;background:none;border:1px dashed var(--border2);border-radius:8px;padding:7px;font-size:11.5px;color:var(--textd);cursor:pointer;font-family:inherit;margin-top:auto">+ Add Lead</button>
        </div>
      </div>`;
    }).join('')+'</div>';
}
function renderKanban(){renderLeadBoard();}
function boardAdvance(id){
  const STAGES=['new','contacted','follow_up','quoted','negotiation','won'];
  const l=DB.leads.find(x=>x.id===id);if(!l)return;
  const idx=STAGES.indexOf(l.stage);if(idx<0||idx>=STAGES.length-1)return;
  l.stage=STAGES[idx+1];saveDB();renderLeadBoard();renderLeads();
  showToast(l.name+' → '+l.stage.replace('_',' '));
}
function boardAddLead(stage){openAddLeadModal();setTimeout(()=>{const el=document.getElementById('l-stage');if(el)el.value=stage;},100);}

window.wsKanbanDragStart=function(e,id){e.dataTransfer.setData('leadId',id);e.currentTarget.style.opacity='0.5';};
window.wsKanbanDrop=function(e,stage){
  e.preventDefault();e.currentTarget.style.outline='none';
  const leadId=e.dataTransfer.getData('leadId');
  const l=DB.leads.find(x=>x.id===leadId);if(!l)return;
  const old=l.stage;l.stage=stage;saveDB();renderLeadBoard();renderLeads();
  showToast(l.name+' → '+stage.replace('_',' '));
  logActivity('Lead '+l.name+' moved from '+old+' to '+stage,'lead');
};

// ── CSV Import ──
function openCSVImport(){
  openModal('modal-csv-import');
  document.getElementById('modal-csv-import-body').innerHTML=`
    <div style="margin-bottom:14px"><div style="font-size:13px;font-weight:600;margin-bottom:8px">Step 1: Download the template</div><button class="btn btn-sm btn-outline" onclick="downloadCSVTemplate()">📄 Download Template</button></div>
    <div style="margin-bottom:14px"><div style="font-size:13px;font-weight:600;margin-bottom:8px">Step 2: Upload your filled CSV</div>
      <div onclick="document.getElementById('csv-file-inp').click()" style="border:2px dashed var(--border2);border-radius:10px;padding:24px;text-align:center;cursor:pointer;background:var(--cream)" onmouseover="this.style.borderColor='var(--g400)'" onmouseout="this.style.borderColor='var(--border2)'">
        <div style="font-size:28px;margin-bottom:8px">📤</div><div style="font-size:13px;font-weight:600">Click to upload CSV</div><div style="font-size:11.5px;color:var(--textd);margin-top:4px">Supports .csv files only</div>
      </div>
      <input type="file" id="csv-file-inp" accept=".csv" style="display:none" onchange="handleCSVFile(this)">
    </div>
    <div id="csv-preview-area"></div>
    <div class="modal-footer" style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">
      <button class="btn btn-outline" onclick="closeModal('modal-csv-import')">Cancel</button>
      <button class="btn btn-primary" id="csv-import-btn" style="display:none" onclick="confirmCSVImport()">✅ Import Leads</button>
    </div>`;
}
function downloadCSVTemplate(){
  const csv=`Name,Phone,Email,Destination,Source,Budget,Priority,Agent,Notes\nRahul Sharma,9447000001,rahul@email.com,Maldives,Instagram,150000,hot,Agent Name,Honeymoon package`;
  const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wanago_leads_template.csv';a.click();showToast('Template downloaded!');
}
let _csvRows=[];
function handleCSVFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const lines=e.target.result.split('\n').filter(l=>l.trim());if(!lines.length)return;
    const headers=lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/\s+/g,'_').replace(/[^a-z_]/g,''));
    _csvRows=[];
    for(let i=1;i<lines.length;i++){const vals=lines[i].split(',').map(v=>v.trim().replace(/^"|"$/g,''));if(!vals[0]?.trim())continue;const row={};headers.forEach((h,j)=>row[h]=vals[j]||'');_csvRows.push(row);}
    const prev=document.getElementById('csv-preview-area');if(!prev)return;
    const btn=document.getElementById('csv-import-btn');if(btn){btn.style.display='';btn.textContent='✅ Import '+_csvRows.length+' Leads';}
    prev.innerHTML=`<div style="font-size:12.5px;font-weight:600;color:var(--g700);margin-bottom:8px">Found ${_csvRows.length} leads to import:</div><div style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:8px"><table style="width:100%;border-collapse:collapse;font-size:11.5px"><thead><tr style="background:var(--cream)"><th style="padding:6px 10px;text-align:left">Name</th><th style="padding:6px 10px;text-align:left">Phone</th><th style="padding:6px 10px;text-align:left">Destination</th></tr></thead><tbody>${_csvRows.slice(0,8).map(r=>`<tr style="border-top:1px solid var(--border)"><td style="padding:6px 10px">${r.name||'—'}</td><td style="padding:6px 10px">${r.phone||'—'}</td><td style="padding:6px 10px">${r.destination||'—'}</td></tr>`).join('')}${_csvRows.length>8?`<tr><td colspan="3" style="padding:6px 10px;color:var(--textd);text-align:center">...and ${_csvRows.length-8} more</td></tr>`:''}</tbody></table></div>`;
  };
  reader.readAsText(file);
}
function confirmCSVImport(){
  let added=0,skipped=0;
  _csvRows.forEach(row=>{
    const name=(row.name||'').trim();if(!name){skipped++;return;}
    const phone=(row.phone||'').trim();
    if(phone&&DB.leads.find(l=>l.phone===phone)){skipped++;return;}
    DB.leads.unshift({id:uid(),name,phone,email:row.email||'',destination:row.destination||'',source:row.source||'CSV Import',budget:parseFloat(row.budget)||0,priority:row.priority||'warm',agent:row.agent||'',notes:row.notes||'',stage:'new',officeId:officeIdForNewRecord(),createdBy:createdByStamp(),createdAt:new Date().toISOString()});
    added++;
  });
  saveDB();_csvRows=[];closeModal('modal-csv-import');renderLeads();
  showToast(`✅ ${added} leads imported!${skipped?' ('+skipped+' skipped)':''}`);
}

// ── Exports ──
function exportAllLeads(){doExportLeads(hScoped('leads'),'all_leads');}
function exportFilteredLeads(){let leads=hScoped('leads');if(leadsFilter!=='all')leads=leads.filter(l=>l.stage===leadsFilter);if(leadsSearchQuery)leads=leads.filter(l=>l.name.toLowerCase().includes(leadsSearchQuery));doExportLeads(leads,'filtered_leads');}
function exportSelectedLeads(){const leads=hScoped('leads').filter(l=>selectedLeadIds.has(l.id));if(!leads.length){showToast('Select leads from table first','error');return;}doExportLeads(leads,'selected_leads');}
function doExportLeads(leads,filename){
  if(!leads.length){showToast('No leads to export','error');return;}
  const csv='Name,Phone,Email,Destination,Stage,Priority,Source,Budget,Agent,Follow-up,Notes\n'+leads.map(l=>[l.name,l.phone,l.email||'',l.destination,l.stage,l.priority||'',l.source||'',l.budget||0,l.agent||'',l.followup||'',l.notes||''].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='wanago_'+filename+'_'+today()+'.csv';a.click();
  showToast(leads.length+' leads exported!');
}

// ── Bulk Assign (from tab) ──
function populateBulkAgentSelects(){
  const agents=[...new Set([...(DB.settings.team||[]).map(m=>m.name),...hScoped('leads').map(l=>l.agent)].filter(Boolean))];
  ['bulk-from-agent','bulk-to-agent'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const cur=el.value;el.innerHTML=(id==='bulk-from-agent'?'<option value="">Any agent</option>':'<option value="">Select agent</option>')+agents.map(a=>`<option value="${a}" ${cur===a?'selected':''}>${a}</option>`).join('');});
}
function previewBulkAssign(){const fa=document.getElementById('bulk-from-agent')?.value||'';const c=hScoped('leads').filter(l=>!fa||l.agent===fa).length;const el=document.getElementById('bulk-assign-preview');if(el)el.textContent=c+' leads will be reassigned';}
function runBulkAssign(){
  const fa=document.getElementById('bulk-from-agent')?.value||'';const ta=document.getElementById('bulk-to-agent')?.value;
  if(!ta){showToast('Select an agent','error');return;}
  const leads=hScoped('leads').filter(l=>!fa||l.agent===fa);
  if(!leads.length){showToast('No matching leads','error');return;}
  if(!confirm(`Assign ${leads.length} leads to ${ta}?`))return;
  leads.forEach(l=>l.agent=ta);saveDB();renderLeads();showToast(leads.length+' leads assigned to '+ta+'!');
}

// ── Nav ──

// ── File Attachments ──
function _renderLeadAttachments(l) {
  const files = l.attachments || [];
  if (!files.length) return '<div style="font-size:12px;color:var(--textd);padding:4px 0 8px">No files attached.</div>';
  return files.map((f, i) => {
    const icons = { 'application/pdf':'📄', 'image/jpeg':'🖼', 'image/png':'🖼', 'image/jpg':'🖼' };
    const ico = icons[f.type] || '📎';
    const kb = f.size ? (f.size > 1048576 ? (f.size/1048576).toFixed(1)+' MB' : Math.round(f.size/1024)+' KB') : '';
    return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--cream);border-radius:8px;margin-bottom:4px">
      <span>${ico}</span>
      <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${f.name}</div><div style="font-size:10px;color:var(--textd)">${kb}${kb&&f.uploadedAt?' · ':''}${f.uploadedAt?formatDate(f.uploadedAt):''}</div></div>
      <a href="${f.url}" target="_blank" rel="noopener" style="font-size:11px;color:var(--g700);font-weight:600;text-decoration:none;white-space:nowrap">⬇ View</a>
      <button onclick="deleteLeadFile('${l.id}',${i})" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:16px;padding:0 4px;line-height:1">×</button>
    </div>`;
  }).join('');
}

async function uploadLeadFiles(leadId, input) {
  if (!input.files.length) return;
  if (typeof fsUploadFile !== 'function') { showToast('Storage not available', 'error'); return; }
  const l = DB.leads.find(x => x.id === leadId);
  if (!l) return;
  if (!l.attachments) l.attachments = [];
  const prog = document.getElementById('vl-upload-progress');
  if (prog) prog.style.display = 'block';
  for (const file of Array.from(input.files)) {
    try {
      if (prog) prog.textContent = `Uploading ${file.name}…`;
      const path = `leads/${leadId}/${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
      const url = await fsUploadFile(path, file, pct => { if (prog) prog.textContent = `${file.name} — ${pct}%`; });
      l.attachments.push({ name: file.name, url, size: file.size, type: file.type, path, uploadedAt: new Date().toISOString(), uploadedBy: currentUser?.name || 'User' });
    } catch(e) { showToast('Upload failed: ' + file.name, 'error'); }
  }
  saveDB();
  if (prog) prog.style.display = 'none';
  viewLead(leadId);
}

function deleteLeadFile(leadId, idx) {
  const l = DB.leads.find(x => x.id === leadId);
  if (!l || !l.attachments) return;
  if (!confirm('Remove this attachment?')) return;
  const f = l.attachments[idx];
  if (f && f.path && typeof fsDeleteFile === 'function') fsDeleteFile(f.path).catch(() => {});
  l.attachments.splice(idx, 1);
  saveDB();
  viewLead(leadId);
}

// ── Expose all to window ──
window.renderLeads=renderLeads;window.filterLeads=filterLeads;window.searchLeads=searchLeads;
window.renderLeadsStats=renderLeadsStats;window.populateLeadFilters=populateLeadFilters;
window.openAddLeadModal=openAddLeadModal;window.saveLead=saveLead;window.calcLeadBalance=calcLeadBalance;window.onLeadPackageSelect=onLeadPackageSelect;
window.toggleLeadSelect=toggleLeadSelect;window.toggleSelectAllLeads=toggleSelectAllLeads;
window.updateLeadBulkBar=updateLeadBulkBar;window.clearBulkSelection=clearBulkSelection;
window.bulkStageChange=bulkStageChange;window.bulkAssignAgent=bulkAssignAgent;window.bulkDelete=bulkDelete;window.bulkExport=bulkExport;
window.viewLead=viewLead;window.deleteLead=deleteLead;window.updateLeadStage=updateLeadStage;
window.updateLeadBalance=updateLeadBalance;window.saveLeadFinancials=saveLeadFinancials;window.logFollowUp=logFollowUp;
window.renderLeadBoard=renderLeadBoard;window.renderKanban=renderKanban;
window.boardAdvance=boardAdvance;window.boardAddLead=boardAddLead;
window.renderFollowUps=renderFollowUps;window.renderLeadsAnalytics=renderLeadsAnalytics;
window.runBulkStageUpdate=runBulkStageUpdate;window.findStaleLeads=findStaleLeads;
window.openCSVImport=openCSVImport;window.downloadCSVTemplate=downloadCSVTemplate;
window.handleCSVFile=handleCSVFile;window.confirmCSVImport=confirmCSVImport;
window.exportAllLeads=exportAllLeads;window.exportFilteredLeads=exportFilteredLeads;window.exportSelectedLeads=exportSelectedLeads;
window.populateBulkAgentSelects=populateBulkAgentSelects;window.previewBulkAssign=previewBulkAssign;window.runBulkAssign=runBulkAssign;
window.createQuotationFromLead=createQuotationFromLead;window.openSalesChatWindow=openSalesChatWindow;
window.uploadLeadFiles=uploadLeadFiles;window.deleteLeadFile=deleteLeadFile;

initPage(function() {
  // Render from cache immediately
  renderLeads();
  // Subscribe to Firestore real-time updates
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      // Re-render with fresh Firestore data
      renderLeads();
      // Subscribe for live updates from teammates
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('leads', function() { renderLeads(); });
      }
    }, 5000);
  }
});
