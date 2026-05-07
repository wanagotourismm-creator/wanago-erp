// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Marketing Hub
// ═══════════════════════════════════════════════════════════════
'use strict';

function goTo(page) { window.location.href = page + '.html'; }
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = 'login.html'; }
window.goTo = goTo;
window.handleLogout = handleLogout;

// ── State ──
let _mktCampaignFilter = 'all';
let _mktCalYear, _mktCalMonth;
let _editCampaignId = null, _editSegmentId = null, _editTemplateId = null;

const CAMPAIGN_TYPES = {
  whatsapp: { label:'WhatsApp', icon:'💬', color:'#25d366' },
  email:    { label:'Email',    icon:'📧', color:'#ea4335' },
  sms:      { label:'SMS',      icon:'📱', color:'#1565c0' },
  social:   { label:'Social',   icon:'📢', color:'#7b1fa2' },
};

const DEFAULT_TEMPLATES = [
  { id:'tpl_bd',    name:'Birthday Wish',         type:'whatsapp', category:'personal',      body:'🎂 Happy Birthday *{{name}}*! Wishing you a wonderful day. We hope to plan a special trip for you soon! 🌟\n— Team Wanago',                                                                                                variables:['name'] },
  { id:'tpl_bk',    name:'Booking Confirmation',  type:'whatsapp', category:'transactional', body:'✅ *Booking Confirmed!*\n\nHi *{{name}}*, your trip to *{{destination}}* is confirmed!\n📅 Travel Date: {{date}}\n💰 Amount Paid: ₹{{amount}}\n\nNeed help? Call us anytime.\n— Team Wanago',                          variables:['name','destination','date','amount'] },
  { id:'tpl_py',    name:'Payment Reminder',       type:'whatsapp', category:'transactional', body:'💰 *Payment Reminder*\n\nHi *{{name}}*, your balance of ₹{{amount}} for your *{{destination}}* trip is due on *{{dueDate}}*.\n\nPay now to confirm your booking.\n— Team Wanago',                                      variables:['name','amount','destination','dueDate'] },
  { id:'tpl_qt',    name:'Quotation Sent',         type:'whatsapp', category:'sales',         body:'📋 Hi *{{name}}*! Your custom quote for *{{destination}}* ({{pax}} pax) is ready!\n\n💰 ₹{{amount}}/person | Includes: Flights, Hotel, Transfers & Sightseeing\n\nReply to book.\n— Team Wanago',                      variables:['name','destination','pax','amount'] },
  { id:'tpl_fl',    name:'Follow-up Nudge',        type:'whatsapp', category:'sales',         body:'👋 Hi *{{name}}*, just checking in! Have you had a chance to look at the *{{destination}}* package?\n\nDates are filling up fast 🔥\n— Team Wanago',                                                                    variables:['name','destination'] },
  { id:'tpl_promo', name:'Promo Campaign',         type:'whatsapp', category:'promotional',   body:'🏖️ *Special Offer!*\n\nHi {{name}}, save up to *{{discount}}%* on {{destination}} packages!\n📅 Offer valid till {{validTill}}. Limited seats!\n\n— Team Wanago',                                                       variables:['name','discount','destination','validTill'] },
  { id:'tpl_ann',   name:'Anniversary Wish',       type:'whatsapp', category:'personal',      body:'💕 Happy Anniversary *{{name}}*! Wishing you many more beautiful years together. How about celebrating with a dream vacation? ✈️\n— Team Wanago',                                                                        variables:['name'] },
  { id:'tpl_em',    name:'Email Newsletter',       type:'email',    category:'promotional',   subject:'Exclusive Travel Deals — {{month}} Edition 🌟', body:'Dear {{name}},\n\nWe have curated the best travel packages this {{month}} just for you!\n\n🌴 Top Destinations:\n• Maldives from ₹45,000\n• Goa from ₹8,500\n• Bali from ₹38,000\n\nBook before {{validTill}} to avail special rates.\n\nWarm regards,\nTeam Wanago', variables:['name','month','validTill'] },
  { id:'tpl_sms',   name:'SMS Flash Sale',         type:'sms',      category:'promotional',   body:'WANAGO: Hi {{name}}, FLASH SALE! {{destination}} tour at ₹{{amount}}. Book today only. Call: {{phone}} or reply BOOK. T&C apply.',                                                                                         variables:['name','destination','amount','phone'] },
];

// ── Init ──
function mktInit() {
  if (!DB.campaigns)  DB.campaigns  = [];
  if (!DB.segments)   DB.segments   = [];
  if (!Array.isArray(DB.settings.mktTemplates)) {
    DB.settings.mktTemplates = DEFAULT_TEMPLATES.map(t => ({ ...t }));
    saveDB();
  }

  const now = new Date();
  _mktCalYear  = now.getFullYear();
  _mktCalMonth = now.getMonth();

  const topbarUser = document.getElementById('topbar-user');
  if (topbarUser) topbarUser.textContent = currentUser?.name || '';

  mktRenderOverview();
  document.getElementById('mkt-page-content').style.opacity = '1';
  document.getElementById('page-loader').style.display = 'none';
}

// ══════════════════════════════════════
//  OVERVIEW
// ══════════════════════════════════════
function mktRenderOverview() {
  const campaigns = hScoped('campaigns');
  const sent      = campaigns.filter(c => c.status === 'sent');
  const totalReach     = sent.reduce((s,c) => s + (c.stats?.sent      || 0), 0);
  const totalConverted = sent.reduce((s,c) => s + (c.stats?.converted || 0), 0);
  const leads    = hScoped('leads');
  const mktSrcs  = ['instagram','facebook','google','youtube','website','referral','whatsapp'];
  const mktLeads = leads.filter(l => mktSrcs.includes((l.source||'').toLowerCase()));

  _setText('mkt-kpi-campaigns', campaigns.length);
  _setText('mkt-kpi-reach',     totalReach.toLocaleString('en-IN'));
  _setText('mkt-kpi-mkt-leads', mktLeads.length);
  _setText('mkt-kpi-converted', totalConverted);
  _setText('mkt-kpi-scheduled', campaigns.filter(c => c.status === 'scheduled').length);

  // Recent campaigns
  const tbody  = document.getElementById('mkt-recent-tbody');
  const recent = [...campaigns].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0,8);
  tbody.innerHTML = recent.length
    ? recent.map(c => {
        const ti = CAMPAIGN_TYPES[c.type] || { icon:'📣', label:c.type };
        return `<tr>
          <td><span style="margin-right:5px">${ti.icon}</span><strong>${esc(c.name)}</strong>
            ${c.description ? `<div style="font-size:10px;color:var(--textd)">${esc(c.description)}</div>` : ''}
          </td>
          <td>${stagePill(c.status)}</td>
          <td style="font-size:12px">${esc(c.audienceLabel||'—')}</td>
          <td style="text-align:right">${(c.stats?.sent||0).toLocaleString('en-IN')}</td>
          <td style="text-align:right;color:var(--g500);font-weight:600">${c.stats?.converted||0}</td>
          <td>${formatDate(c.sentAt||c.scheduledAt||c.createdAt)}</td>
          <td>
            <div style="display:flex;gap:4px">
              ${c.status==='draft'||c.status==='scheduled' ? `<button class="btn btn-sm btn-green" onclick="launchCampaign('${c.id}')">🚀 Send</button>` : ''}
              <button class="btn btn-sm btn-outline" onclick="openCampaignModal('${c.id}')">Edit</button>
            </div>
          </td>
        </tr>`;
      }).join('')
    : emptyRow(7, 'No campaigns yet — click "+ New Campaign" to get started');

  mktRenderSourceChart('mkt-source-chart');
}

function mktRenderSourceChart(elId) {
  const el = document.getElementById(elId);
  if (!el) return;
  const leads = hScoped('leads');
  const map   = {};
  leads.forEach(l => { const s = l.source||'Unknown'; map[s] = (map[s]||0)+1; });
  const total  = leads.length || 1;
  const sorted = Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0,8);
  const COLS   = ['#134a32','#2da065','#52c285','#c9a84c','#2563eb','#c0392b','#d68910','#7b1fa2'];

  el.innerHTML = sorted.length
    ? sorted.map(([src,cnt],i) => {
        const pct = Math.round((cnt/total)*100);
        return `<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px">
            <span style="font-size:12px;font-weight:500">${esc(src)}</span>
            <span style="font-size:11px;color:var(--textd)">${cnt} · ${pct}%</span>
          </div>
          <div style="background:var(--cream2);border-radius:20px;height:8px;overflow:hidden">
            <div style="background:${COLS[i%COLS.length]};height:100%;width:${pct}%;border-radius:20px"></div>
          </div>
        </div>`;
      }).join('')
    : '<div style="padding:20px;text-align:center;color:var(--textd);font-size:12px">Add leads to see source data</div>';
}

// ══════════════════════════════════════
//  CAMPAIGNS TAB
// ══════════════════════════════════════
function mktRenderCampaigns() {
  const all      = hScoped('campaigns');
  const filtered = _mktCampaignFilter === 'all'
    ? all
    : all.filter(c => c.status === _mktCampaignFilter || c.type === _mktCampaignFilter);

  const tbody = document.getElementById('mkt-camp-tbody');
  tbody.innerHTML = filtered.length
    ? filtered.map(c => {
        const ti   = CAMPAIGN_TYPES[c.type] || { icon:'📣', label:c.type };
        const s    = c.stats || {};
        const openR = s.sent ? Math.round((s.opened||0)/s.sent*100) : 0;
        const cvrR  = s.sent ? Math.round((s.converted||0)/s.sent*100) : 0;
        return `<tr>
          <td>
            <div style="font-weight:600">${esc(c.name)}</div>
            ${c.description ? `<div style="font-size:10px;color:var(--textd)">${esc(c.description)}</div>` : ''}
          </td>
          <td><span style="margin-right:4px">${ti.icon}</span>${ti.label}</td>
          <td>${stagePill(c.status)}</td>
          <td style="font-size:12px">${esc(c.audienceLabel||'All Customers')}</td>
          <td style="text-align:right">${(s.sent||0).toLocaleString()}</td>
          <td style="text-align:right">${openR}%</td>
          <td style="text-align:right;color:var(--g500);font-weight:600">${s.converted||0} <span style="font-size:10px;color:var(--textd)">(${cvrR}%)</span></td>
          <td>${formatDate(c.sentAt||c.scheduledAt||c.createdAt)}</td>
          <td>
            <div style="display:flex;gap:4px">
              ${c.status==='draft'||c.status==='scheduled' ? `<button class="btn btn-sm btn-green" onclick="launchCampaign('${c.id}')">🚀 Send</button>` : ''}
              <button class="btn btn-sm btn-outline" onclick="openCampaignModal('${c.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="deleteCampaign('${c.id}')">Del</button>
            </div>
          </td>
        </tr>`;
      }).join('')
    : emptyRow(9, 'No campaigns found');
}

function mktFilterCampaigns(f, el) {
  _mktCampaignFilter = f;
  document.querySelectorAll('#mkt-camp-filter-bar .chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  mktRenderCampaigns();
}

// ── Campaign Modal ──
function openCampaignModal(id) {
  _editCampaignId = id || null;
  const c = id ? (DB.campaigns||[]).find(x => x.id === id) : null;

  document.getElementById('mkt-camp-modal-title').textContent = c ? 'Edit Campaign' : 'New Campaign';
  document.getElementById('mkt-camp-id').value          = c?.id           || '';
  document.getElementById('mkt-camp-name').value        = c?.name         || '';
  document.getElementById('mkt-camp-type').value        = c?.type         || 'whatsapp';
  document.getElementById('mkt-camp-status').value      = c?.status       || 'draft';
  document.getElementById('mkt-camp-audience').value    = c?.audience     || 'all_customers';
  document.getElementById('mkt-camp-message').value     = c?.message      || '';
  document.getElementById('mkt-camp-subject').value     = c?.subject      || '';
  document.getElementById('mkt-camp-scheduled').value   = c?.scheduledAt  ? c.scheduledAt.slice(0,16) : '';
  document.getElementById('mkt-camp-description').value = c?.description  || '';

  mktUpdateCampTypeUI();
  openModal('mkt-camp-modal');
}

function mktUpdateCampTypeUI() {
  const type = document.getElementById('mkt-camp-type').value;
  document.getElementById('mkt-camp-subject-row').style.display = type === 'email' ? '' : 'none';
  const ph = { whatsapp:'WhatsApp message text...', email:'Email body...', sms:'SMS text (160 chars)...', social:'Social media caption...' };
  document.getElementById('mkt-camp-message').placeholder = ph[type] || 'Message...';
  _populateTplSelect('mkt-camp-tpl', type);
}

function _populateTplSelect(selId, type) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  const tpls = (DB.settings.mktTemplates||[]).filter(t => t.type === type);
  sel.innerHTML = '<option value="">— Pick a template —</option>'
    + tpls.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('');
}

function mktApplyTemplate() {
  const val = document.getElementById('mkt-camp-tpl').value;
  const tpl = (DB.settings.mktTemplates||[]).find(t => t.id === val);
  if (!tpl) return;
  document.getElementById('mkt-camp-message').value = tpl.body;
  if (tpl.subject) document.getElementById('mkt-camp-subject').value = tpl.subject;
}

function saveCampaign() {
  const name = document.getElementById('mkt-camp-name').value.trim();
  if (!name) { showToast('Enter campaign name', 'error'); return; }

  const AUDIENCE_LABELS = {
    all_customers:'All Customers', all_leads:'All Leads', won_leads:'Won Leads',
    new_leads:'New Leads', hot_leads:'Hot Leads 🔥', all_contacts:'All Contacts',
    follow_up_leads:'Follow-up Leads',
  };
  const audience      = document.getElementById('mkt-camp-audience').value;
  const audienceLabel = AUDIENCE_LABELS[audience] || audience;
  const existing      = _editCampaignId ? (DB.campaigns||[]).find(x=>x.id===_editCampaignId) : null;

  const camp = {
    id:           existing?.id    || uid(),
    name,
    type:         document.getElementById('mkt-camp-type').value,
    status:       document.getElementById('mkt-camp-status').value,
    audience,
    audienceLabel,
    message:      document.getElementById('mkt-camp-message').value.trim(),
    subject:      document.getElementById('mkt-camp-subject').value.trim(),
    scheduledAt:  document.getElementById('mkt-camp-scheduled').value || null,
    description:  document.getElementById('mkt-camp-description').value.trim(),
    officeId:     existing?.officeId || officeIdForNewRecord(),
    createdAt:    existing?.createdAt || new Date().toISOString(),
    stats:        existing?.stats || { sent:0, delivered:0, opened:0, clicked:0, converted:0 },
  };

  if (!DB.campaigns) DB.campaigns = [];
  if (_editCampaignId) {
    const idx = DB.campaigns.findIndex(x => x.id === _editCampaignId);
    if (idx >= 0) DB.campaigns[idx] = camp; else DB.campaigns.push(camp);
  } else {
    DB.counters.campaigns = (DB.counters.campaigns||0) + 1;
    DB.campaigns.push(camp);
  }
  saveDB();
  closeModal('mkt-camp-modal');
  mktRenderCampaigns();
  mktRenderOverview();
  showToast(_editCampaignId ? 'Campaign updated' : 'Campaign created ✓');
  logActivity(`Campaign "${name}" ${_editCampaignId?'updated':'created'}`, 'info');
}

function launchCampaign(id) {
  const camp = (DB.campaigns||[]).find(c => c.id === id);
  if (!camp) return;
  if (!confirm(`Send "${camp.name}" now?\n\nThis will simulate sending to all targeted contacts.`)) return;
  const reach = _audienceCount(camp.audience);
  camp.status    = 'sent';
  camp.sentAt    = new Date().toISOString();
  camp.stats     = {
    sent:      reach,
    delivered: Math.round(reach * .96),
    opened:    Math.round(reach * .44),
    clicked:   Math.round(reach * .11),
    converted: Math.round(reach * .04),
  };
  saveDB();
  mktRenderCampaigns();
  mktRenderOverview();
  showToast(`Campaign launched to ~${reach.toLocaleString()} contacts! 🚀`);
  logActivity(`Campaign "${camp.name}" launched (${reach} contacts)`, 'info');
}

function _audienceCount(audience) {
  const leads     = hScoped('leads');
  const customers = hScoped('customers');
  const map = {
    all_customers:    () => customers.length,
    all_leads:        () => leads.length,
    won_leads:        () => leads.filter(l=>l.stage==='won').length,
    new_leads:        () => leads.filter(l=>l.stage==='new').length,
    hot_leads:        () => leads.filter(l=>l.priority==='hot').length,
    all_contacts:     () => leads.length + customers.length,
    follow_up_leads:  () => leads.filter(l=>l.stage==='follow_up').length,
  };
  if (map[audience]) return map[audience]();
  const seg = (DB.segments||[]).find(s => s.id === audience);
  return seg?.count || 0;
}

function deleteCampaign(id) {
  if (!confirm('Delete this campaign? This cannot be undone.')) return;
  DB.campaigns = (DB.campaigns||[]).filter(c => c.id !== id);
  saveDB();
  mktRenderCampaigns();
  mktRenderOverview();
  showToast('Campaign deleted');
}

// ══════════════════════════════════════
//  CONTENT CALENDAR
// ══════════════════════════════════════
function mktRenderCalendar() {
  const el     = document.getElementById('mkt-calendar-wrap');
  const year   = _mktCalYear, month = _mktCalMonth;
  _setText('mkt-cal-title', new Date(year, month, 1).toLocaleDateString('en-IN', { month:'long', year:'numeric' }));

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const todayKey    = new Date().toISOString().slice(0,10);
  const campaigns   = hScoped('campaigns');

  const byDate = {};
  campaigns.forEach(c => {
    const k = (c.scheduledAt || c.sentAt || c.createdAt || '').slice(0,10);
    if (k) (byDate[k] = byDate[k]||[]).push(c);
  });

  const HEADS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = `<div class="mkt-calendar-grid">
    ${HEADS.map(h=>`<div class="mkt-cal-day-head">${h}</div>`).join('')}`;

  for (let i = 0; i < firstDay; i++) html += '<div class="mkt-cal-day other-month"></div>';

  for (let d = 1; d <= daysInMonth; d++) {
    const key   = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const camps = byDate[key] || [];
    html += `<div class="mkt-cal-day${key===todayKey?' today':''}">
      <div class="mkt-cal-date">${d}</div>
      ${camps.slice(0,3).map(c => {
        const ti  = CAMPAIGN_TYPES[c.type] || { icon:'📣' };
        const cls = c.type + (c.status==='sent'?' published':c.status==='draft'?' draft':'');
        return `<div class="mkt-cal-post ${cls}" title="${esc(c.name)}" onclick="openCampaignModal('${c.id}')">${ti.icon} ${esc(c.name)}</div>`;
      }).join('')}
      ${camps.length > 3 ? `<div style="font-size:9px;color:var(--textd)">+${camps.length-3} more</div>` : ''}
      <div style="position:absolute;bottom:3px;right:5px;font-size:13px;color:var(--textd);cursor:pointer;opacity:0;transition:.15s" class="cal-add-btn" onclick="mktAddFromCalendar('${key}')" title="Add campaign">+</div>
    </div>`;
  }
  html += '</div>';
  el.innerHTML = html;

  // Show add btn on hover via CSS
  el.querySelectorAll('.mkt-cal-day').forEach(d => {
    d.addEventListener('mouseenter', () => { const b = d.querySelector('.cal-add-btn'); if(b) b.style.opacity='1'; });
    d.addEventListener('mouseleave', () => { const b = d.querySelector('.cal-add-btn'); if(b) b.style.opacity='0'; });
  });
}

function mktCalPrev() {
  _mktCalMonth--;
  if (_mktCalMonth < 0) { _mktCalMonth = 11; _mktCalYear--; }
  mktRenderCalendar();
}
function mktCalNext() {
  _mktCalMonth++;
  if (_mktCalMonth > 11) { _mktCalMonth = 0; _mktCalYear++; }
  mktRenderCalendar();
}
function mktAddFromCalendar(dateKey) {
  openCampaignModal(null);
  setTimeout(() => { document.getElementById('mkt-camp-scheduled').value = dateKey + 'T09:00'; }, 100);
}

// ══════════════════════════════════════
//  AUDIENCE SEGMENTS
// ══════════════════════════════════════
function mktRenderSegments() {
  const el   = document.getElementById('mkt-segments-grid');
  const segs = DB.segments || [];
  const leads = hScoped('leads'), customers = hScoped('customers');
  const now  = new Date().toISOString().slice(0,7);

  const smart = [
    { id:'__all_leads',        name:'All Leads',          description:'Everyone in your leads pipeline',   icon:'👥', color:'#134a32', count:leads.length,                                                                builtin:true },
    { id:'__hot_leads',        name:'Hot Leads',          description:'High-priority leads',               icon:'🔥', color:'#c0392b', count:leads.filter(l=>l.priority==='hot').length,                                   builtin:true },
    { id:'__won',              name:'Converted Customers',description:'Leads won / bookings made',         icon:'✅', color:'#2da065', count:leads.filter(l=>l.stage==='won').length,                                       builtin:true },
    { id:'__customers',        name:'All Customers',      description:'Your customer database',            icon:'🏆', color:'#c9a84c', count:customers.length,                                                              builtin:true },
    { id:'__overdue_fu',       name:'Overdue Follow-ups', description:'Leads past their follow-up date',   icon:'⚠️', color:'#d68910', count:leads.filter(l=>l.followup && new Date(l.followup)<new Date()).length,          builtin:true },
    { id:'__new_month',        name:'New This Month',     description:'Leads acquired this month',         icon:'🆕', color:'#2563eb', count:leads.filter(l=>(l.createdAt||'').slice(0,7)===now).length,                     builtin:true },
    { id:'__insta_leads',      name:'Instagram Leads',    description:'Leads from Instagram',              icon:'📸', color:'#7b1fa2', count:leads.filter(l=>(l.source||'').toLowerCase()==='instagram').length,            builtin:true },
    { id:'__quoted',           name:'Quoted Leads',       description:'Leads who received a quote',        icon:'📋', color:'#1565c0', count:leads.filter(l=>l.stage==='quoted'||l.stage==='negotiation').length,            builtin:true },
  ];

  let html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">';

  [...smart, ...segs].forEach(s => {
    html += `<div class="seg-card">
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
        <div style="width:38px;height:38px;border-radius:10px;background:${s.color||'#134a32'}22;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${s.icon||'👥'}</div>
        <div style="flex:1;min-width:0">
          <div class="seg-card-name">${esc(s.name)}</div>
          <div class="seg-card-desc">${esc(s.description||'')}</div>
        </div>
        ${!s.builtin ? `<button class="btn btn-sm btn-outline" onclick="openSegmentModal('${s.id}')">Edit</button>` : ''}
      </div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:10px">
        <span class="seg-card-count" style="color:${s.color||'var(--g700)'}">${(s.count||0).toLocaleString()}</span>
        <span class="seg-card-label">contacts</span>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm btn-primary" onclick="mktNewCampForSeg('${s.id}','${esc(s.name)}')">📣 Campaign</button>
        ${!s.builtin ? `<button class="btn btn-sm btn-danger" onclick="deleteSegment('${s.id}')">Del</button>` : ''}
      </div>
    </div>`;
  });

  html += `<div class="seg-card" style="border:2px dashed var(--border2);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:140px;background:var(--cream)" onclick="openSegmentModal(null)">
    <div style="font-size:30px;margin-bottom:8px;opacity:.3">+</div>
    <div style="font-size:13px;font-weight:600;color:var(--textm)">Create Segment</div>
    <div style="font-size:11px;color:var(--textd);margin-top:4px">Define custom audience filters</div>
  </div></div>`;

  el.innerHTML = html;
}

function mktNewCampForSeg(segId, segName) {
  // Switch to campaigns tab and pre-fill audience
  const campTab = document.querySelector('#mkt-tab-bar .tab:nth-child(2)');
  switchTab(campTab, 'mkt-tab-campaigns');
  mktRenderCampaigns();
  setTimeout(() => {
    openCampaignModal(null);
    const audEl = document.getElementById('mkt-camp-audience');
    // Map smart segment ids to audience values
    const builtinMap = { '__all_leads':'all_leads', '__hot_leads':'hot_leads', '__won':'won_leads', '__customers':'all_customers', '__overdue_fu':'follow_up_leads', '__new_month':'all_leads', '__insta_leads':'all_leads', '__quoted':'all_leads' };
    audEl.value = builtinMap[segId] || segId;
  }, 120);
}

function openSegmentModal(id) {
  _editSegmentId = id || null;
  const s = id ? (DB.segments||[]).find(x => x.id === id) : null;
  document.getElementById('mkt-seg-modal-title').textContent = s ? 'Edit Segment' : 'New Segment';
  document.getElementById('mkt-seg-id').value          = s?.id          || '';
  document.getElementById('mkt-seg-name').value        = s?.name        || '';
  document.getElementById('mkt-seg-desc').value        = s?.description || '';
  document.getElementById('mkt-seg-icon').value        = s?.icon        || '👥';
  document.getElementById('mkt-seg-f-source').value    = (s?.filters?.sources    ||[]).join(', ');
  document.getElementById('mkt-seg-f-stage').value     = (s?.filters?.stages     ||[]).join(', ');
  document.getElementById('mkt-seg-f-priority').value  = (s?.filters?.priorities ||[]).join(', ');
  document.getElementById('mkt-seg-f-dest').value      = (s?.filters?.destinations||[]).join(', ');
  mktPreviewSegment();
  openModal('mkt-seg-modal');
}

function mktPreviewSegment() {
  const split = v => v.split(',').map(x=>x.trim()).filter(Boolean);
  const sources      = split(document.getElementById('mkt-seg-f-source').value);
  const stages       = split(document.getElementById('mkt-seg-f-stage').value);
  const priorities   = split(document.getElementById('mkt-seg-f-priority').value);
  const destinations = split(document.getElementById('mkt-seg-f-dest').value);

  let leads = hScoped('leads');
  if (sources.length)      leads = leads.filter(l => sources.includes(l.source));
  if (stages.length)       leads = leads.filter(l => stages.includes(l.stage));
  if (priorities.length)   leads = leads.filter(l => priorities.includes(l.priority));
  if (destinations.length) leads = leads.filter(l => destinations.some(d => (l.destination||'').toLowerCase().includes(d.toLowerCase())));

  const el = document.getElementById('mkt-seg-preview');
  if (el) el.textContent = leads.length + ' contacts matched';
}

function saveSegment() {
  const name = document.getElementById('mkt-seg-name').value.trim();
  if (!name) { showToast('Enter segment name', 'error'); return; }

  const split = v => v.split(',').map(x=>x.trim()).filter(Boolean);
  const filters = {
    sources:      split(document.getElementById('mkt-seg-f-source').value),
    stages:       split(document.getElementById('mkt-seg-f-stage').value),
    priorities:   split(document.getElementById('mkt-seg-f-priority').value),
    destinations: split(document.getElementById('mkt-seg-f-dest').value),
  };
  let leads = hScoped('leads');
  if (filters.sources.length)      leads = leads.filter(l => filters.sources.includes(l.source));
  if (filters.stages.length)       leads = leads.filter(l => filters.stages.includes(l.stage));
  if (filters.priorities.length)   leads = leads.filter(l => filters.priorities.includes(l.priority));
  if (filters.destinations.length) leads = leads.filter(l => filters.destinations.some(d => (l.destination||'').toLowerCase().includes(d.toLowerCase())));

  const seg = {
    id:          document.getElementById('mkt-seg-id').value || uid(),
    name,
    description: document.getElementById('mkt-seg-desc').value.trim(),
    icon:        document.getElementById('mkt-seg-icon').value || '👥',
    color:       '#134a32',
    filters,
    count:       leads.length,
    createdAt:   _editSegmentId ? ((DB.segments||[]).find(x=>x.id===_editSegmentId)?.createdAt||new Date().toISOString()) : new Date().toISOString(),
  };

  if (!DB.segments) DB.segments = [];
  if (_editSegmentId) {
    const idx = DB.segments.findIndex(x => x.id === _editSegmentId);
    if (idx >= 0) DB.segments[idx] = seg; else DB.segments.push(seg);
  } else {
    DB.segments.push(seg);
  }
  saveDB();
  closeModal('mkt-seg-modal');
  mktRenderSegments();
  showToast(`"${name}" — ${leads.length} contacts`);
}

function deleteSegment(id) {
  if (!confirm('Delete this segment?')) return;
  DB.segments = (DB.segments||[]).filter(s => s.id !== id);
  saveDB();
  mktRenderSegments();
  showToast('Segment deleted');
}

// ══════════════════════════════════════
//  TEMPLATES
// ══════════════════════════════════════
function mktRenderTemplates() {
  const el       = document.getElementById('mkt-templates-grid');
  const filter   = document.getElementById('mkt-tpl-filter')?.value || '';
  const templates = (DB.settings.mktTemplates||[]).filter(t => !filter || t.type === filter);

  const CATCOLS = { personal:'#25d366', transactional:'#2563eb', sales:'#c9a84c', promotional:'#c0392b' };

  let html = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">';
  templates.forEach(t => {
    const ti  = CAMPAIGN_TYPES[t.type] || { icon:'📣', label:t.type };
    const col = CATCOLS[t.category] || '#888';
    const isBuiltin = t.id.startsWith('tpl_bd')||t.id.startsWith('tpl_bk')||t.id.startsWith('tpl_py')||t.id.startsWith('tpl_qt')||t.id.startsWith('tpl_fl')||t.id.startsWith('tpl_promo')||t.id.startsWith('tpl_ann')||t.id.startsWith('tpl_em')||t.id.startsWith('tpl_sms');
    html += `<div class="card" style="cursor:pointer;transition:.2s" onmouseenter="this.style.boxShadow='var(--sh2)'" onmouseleave="this.style.boxShadow='var(--sh)'">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13.5px;font-weight:700;margin-bottom:5px">${esc(t.name)}</div>
          <div style="display:flex;gap:5px;flex-wrap:wrap">
            <span style="font-size:10px;padding:2px 8px;background:${col}18;color:${col};border-radius:20px;font-weight:600;text-transform:capitalize;border:1px solid ${col}30">${t.category||'general'}</span>
            <span style="font-size:10px;padding:2px 8px;background:var(--cream2);color:var(--textm);border-radius:20px;border:1px solid var(--border)">${ti.icon} ${ti.label}</span>
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button class="btn btn-sm btn-outline" onclick="openTemplateModal('${t.id}')">Edit</button>
          <button class="btn btn-sm btn-green" onclick="mktUseTpl('${t.id}')">Use</button>
          ${!isBuiltin ? `<button class="btn btn-sm btn-danger" onclick="deleteTemplate('${t.id}')">Del</button>` : ''}
        </div>
      </div>
      ${t.subject ? `<div style="font-size:11px;color:var(--textd);margin-bottom:6px">Subject: <em>${esc(t.subject)}</em></div>` : ''}
      <div style="font-size:12px;color:var(--textm);line-height:1.6;background:var(--cream);border-radius:8px;padding:9px 12px;white-space:pre-line;max-height:80px;overflow:hidden">${esc(t.body).slice(0,200)}${(t.body||'').length>200?'…':''}</div>
      ${t.variables?.length ? `<div style="margin-top:8px;display:flex;gap:4px;flex-wrap:wrap">${t.variables.map(v=>`<span style="font-size:9.5px;background:var(--blue2);color:var(--blue);padding:1px 7px;border-radius:20px;border:1px solid rgba(37,99,235,.15)">{{${v}}}</span>`).join('')}</div>` : ''}
    </div>`;
  });

  html += `<div class="card" style="border:2px dashed var(--border2);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;min-height:180px;background:var(--cream)" onclick="openTemplateModal(null)">
    <div style="font-size:30px;margin-bottom:8px;opacity:.3">+</div>
    <div style="font-size:13px;font-weight:600;color:var(--textm)">New Template</div>
    <div style="font-size:11px;color:var(--textd);margin-top:4px">Create a reusable message</div>
  </div></div>`;

  el.innerHTML = html;
}

function mktUseTpl(id) {
  // Switch to campaigns and pre-fill message
  const campTab = document.querySelector('#mkt-tab-bar .tab:nth-child(2)');
  switchTab(campTab, 'mkt-tab-campaigns');
  mktRenderCampaigns();
  setTimeout(() => {
    const tpl = (DB.settings.mktTemplates||[]).find(t => t.id === id);
    if (!tpl) return;
    openCampaignModal(null);
    document.getElementById('mkt-camp-type').value = tpl.type;
    mktUpdateCampTypeUI();
    document.getElementById('mkt-camp-message').value = tpl.body;
    if (tpl.subject) document.getElementById('mkt-camp-subject').value = tpl.subject;
    document.getElementById('mkt-camp-name').value = tpl.name + ' Campaign';
  }, 120);
}

function openTemplateModal(id) {
  _editTemplateId = id || null;
  const t = id ? (DB.settings.mktTemplates||[]).find(x => x.id === id) : null;
  document.getElementById('mkt-tpl-modal-title').textContent = t ? 'Edit Template' : 'New Template';
  document.getElementById('mkt-tpl-id').value       = t?.id       || '';
  document.getElementById('mkt-tpl-name').value     = t?.name     || '';
  document.getElementById('mkt-tpl-type').value     = t?.type     || 'whatsapp';
  document.getElementById('mkt-tpl-category').value = t?.category || 'promotional';
  document.getElementById('mkt-tpl-subject').value  = t?.subject  || '';
  document.getElementById('mkt-tpl-body').value     = t?.body     || '';
  document.getElementById('mkt-tpl-vars').value     = (t?.variables||[]).join(', ');
  mktUpdateTplTypeUI();
  openModal('mkt-tpl-modal');
}

function mktUpdateTplTypeUI() {
  const type = document.getElementById('mkt-tpl-type').value;
  document.getElementById('mkt-tpl-subject-row').style.display = type === 'email' ? '' : 'none';
}

function saveTemplate() {
  const name = document.getElementById('mkt-tpl-name').value.trim();
  const body = document.getElementById('mkt-tpl-body').value.trim();
  if (!name) { showToast('Enter template name', 'error'); return; }
  if (!body) { showToast('Enter template body', 'error'); return; }

  const tpl = {
    id:        document.getElementById('mkt-tpl-id').value || 'ctpl_' + uid(),
    name,
    type:      document.getElementById('mkt-tpl-type').value,
    category:  document.getElementById('mkt-tpl-category').value,
    subject:   document.getElementById('mkt-tpl-subject').value.trim(),
    body,
    variables: document.getElementById('mkt-tpl-vars').value.split(',').map(v=>v.trim()).filter(Boolean),
    createdAt: _editTemplateId ? ((DB.settings.mktTemplates||[]).find(x=>x.id===_editTemplateId)?.createdAt||new Date().toISOString()) : new Date().toISOString(),
  };

  if (!DB.settings.mktTemplates) DB.settings.mktTemplates = [];
  if (_editTemplateId) {
    const idx = DB.settings.mktTemplates.findIndex(x => x.id === _editTemplateId);
    if (idx >= 0) DB.settings.mktTemplates[idx] = tpl; else DB.settings.mktTemplates.push(tpl);
  } else {
    DB.settings.mktTemplates.push(tpl);
  }
  saveDB();
  closeModal('mkt-tpl-modal');
  mktRenderTemplates();
  showToast('Template saved ✓');
}

function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  DB.settings.mktTemplates = (DB.settings.mktTemplates||[]).filter(t => t.id !== id);
  saveDB();
  mktRenderTemplates();
  showToast('Template deleted');
}

// ══════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════
function mktRenderAnalytics() {
  const campaigns = hScoped('campaigns');
  const sent      = campaigns.filter(c => c.status === 'sent');

  const total   = { sent:0, delivered:0, opened:0, clicked:0, converted:0 };
  sent.forEach(c => {
    total.sent      += c.stats?.sent      || 0;
    total.delivered += c.stats?.delivered || 0;
    total.opened    += c.stats?.opened    || 0;
    total.clicked   += c.stats?.clicked   || 0;
    total.converted += c.stats?.converted || 0;
  });

  const pct = (n, d) => d ? Math.round((n/d)*100)+'%' : '0%';

  _setText('ana-total-sent',  total.sent.toLocaleString('en-IN'));
  _setText('ana-delivered',   total.delivered.toLocaleString('en-IN'));
  _setText('ana-open-rate',   pct(total.opened,   total.sent));
  _setText('ana-click-rate',  pct(total.clicked,  total.sent));
  _setText('ana-conversions', total.converted.toLocaleString('en-IN'));
  _setText('ana-cvr',         pct(total.converted, total.sent));

  // Funnel bar chart
  const funnelEl = document.getElementById('ana-funnel');
  if (funnelEl && total.sent) {
    const steps = [
      { label:'Sent',      n:total.sent,      color:'#134a32' },
      { label:'Delivered', n:total.delivered, color:'#2da065' },
      { label:'Opened',    n:total.opened,    color:'#c9a84c' },
      { label:'Clicked',   n:total.clicked,   color:'#2563eb' },
      { label:'Converted', n:total.converted, color:'#c0392b' },
    ];
    funnelEl.innerHTML = steps.map(st => {
      const w = Math.round((st.n/total.sent)*100);
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:12px;font-weight:600">${st.label}</span>
          <span style="font-size:11px;color:var(--textd)">${st.n.toLocaleString()} · ${w}%</span>
        </div>
        <div style="background:var(--cream2);border-radius:20px;height:10px">
          <div style="background:${st.color};height:100%;width:${w}%;border-radius:20px;transition:.5s"></div>
        </div>
      </div>`;
    }).join('');
  }

  // Campaign table
  const tbody = document.getElementById('ana-camp-tbody');
  tbody.innerHTML = sent.length
    ? sent.map(c => {
        const s    = c.stats || {};
        const ti   = CAMPAIGN_TYPES[c.type] || { icon:'📣', label:c.type };
        const openR = s.sent ? Math.round((s.opened||0)/s.sent*100) : 0;
        const clkR  = s.sent ? Math.round((s.clicked||0)/s.sent*100) : 0;
        const cvrR  = s.sent ? Math.round((s.converted||0)/s.sent*100) : 0;
        return `<tr>
          <td><strong>${esc(c.name)}</strong></td>
          <td>${ti.icon} ${ti.label}</td>
          <td style="text-align:right">${(s.sent||0).toLocaleString()}</td>
          <td style="text-align:right">${(s.delivered||0).toLocaleString()}</td>
          <td style="text-align:right">${openR}%</td>
          <td style="text-align:right">${clkR}%</td>
          <td style="text-align:right;color:var(--g500);font-weight:600">${s.converted||0}</td>
          <td style="text-align:right;font-weight:700">${cvrR}%</td>
        </tr>`;
      }).join('')
    : emptyRow(8, 'No sent campaigns to analyze yet');

  // Source chart
  mktRenderSourceChart('ana-source-chart');
}

// ══════════════════════════════════════
//  LEAD CAPTURE OVERVIEW
// ══════════════════════════════════════
function mktRenderLeadCapture() {
  const leads = hScoped('leads');
  const el    = document.getElementById('mkt-capture-wrap');
  if (!el) return;

  const map = {};
  leads.forEach(l => { const s = l.source||'Unknown'; map[s]=(map[s]||0)+1; });
  const sorted = Object.entries(map).sort((a,b)=>b[1]-a[1]);
  const COLS = ['#134a32','#2da065','#52c285','#c9a84c','#2563eb','#c0392b','#d68910','#7b1fa2','#00897b','#e65100'];

  const wonBySource = {};
  leads.filter(l=>l.stage==='won').forEach(l => { const s=l.source||'Unknown'; wonBySource[s]=(wonBySource[s]||0)+1; });

  el.innerHTML = `<div class="table-wrap"><table>
    <thead><tr><th>#</th><th>Source</th><th>Total Leads</th><th>Won</th><th>CVR</th><th>Share</th></tr></thead>
    <tbody>${sorted.map(([src,cnt],i)=>{
      const won = wonBySource[src]||0;
      const cvr = cnt ? Math.round((won/cnt)*100) : 0;
      const share = leads.length ? Math.round((cnt/leads.length)*100) : 0;
      return `<tr>
        <td><span style="width:10px;height:10px;border-radius:50%;background:${COLS[i%COLS.length]};display:inline-block;margin-right:6px"></span>${i+1}</td>
        <td><strong>${esc(src)}</strong></td>
        <td>${cnt}</td>
        <td style="color:var(--g500);font-weight:600">${won}</td>
        <td>${cvr}%</td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;background:var(--cream2);border-radius:10px;height:6px;width:80px">
              <div style="background:${COLS[i%COLS.length]};height:100%;width:${share}%;border-radius:10px"></div>
            </div>
            <span style="font-size:10.5px;color:var(--textd)">${share}%</span>
          </div>
        </td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

// ── Utility ──
function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _setText(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }

// ── Boot ──
document.addEventListener('DOMContentLoaded', mktInit);
