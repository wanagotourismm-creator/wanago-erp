// crm.js — Advanced CRM Dashboard

// ── Auth guard ────────────────────────────────────────────────────
function initPage(renderFn) {
  var session = sessionStorage.getItem('wanago_session');
  if (!session) { window.location.href = '../index.html'; return; }
  try {
    var s = JSON.parse(session);
    var tu = document.getElementById('topbar-user');
    if (tu) tu.textContent = s.email || '';
    if (typeof window.rebuildSidebar === 'function') window.rebuildSidebar();
  } catch(ex) {}
  function fadeLoader() {
    var l = document.getElementById('page-loader');
    var a = document.querySelector('.app');
    if (l) { l.classList.add('fade-out'); setTimeout(function(){ try{l.parentNode.removeChild(l);}catch(e){} }, 300); }
    if (a) a.classList.add('loaded');
  }
  setTimeout(function() {
    try { if (renderFn) renderFn(); } catch(e) { console.error('CRM render error:', e); }
    fadeLoader();
  }, 20);
}
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

// ── Stage config ──────────────────────────────────────────────────
const STAGES = [
  { id:'new',         label:'New',         bg:'#dbeafe', text:'#1e40af', colBg:'#eff6ff' },
  { id:'contacted',   label:'Contacted',   bg:'#e0f2fe', text:'#0c4a6e', colBg:'#f0f9ff' },
  { id:'follow_up',   label:'Follow-up',   bg:'#fef9c3', text:'#854d0e', colBg:'#fefce8' },
  { id:'quoted',      label:'Quoted',      bg:'#ede9fe', text:'#5b21b6', colBg:'#f5f3ff' },
  { id:'negotiation', label:'Negotiation', bg:'#ffedd5', text:'#c2410c', colBg:'#fff7ed' },
  { id:'won',         label:'Won',         bg:'#dcfce7', text:'#166534', colBg:'#f0fdf4' },
  { id:'lost',        label:'Lost',        bg:'#fee2e2', text:'#991b1b', colBg:'#fff5f5' },
];
const OPEN_STAGES = ['new','contacted','follow_up','quoted','negotiation'];

const ACT_ICONS = { call:'Call', whatsapp:'WA', email:'Mail', meeting:'Mtg', quote:'Quote', note:'Note', stage_change:'Stage' };
const ACT_COLORS= { call:'#dcfce7', whatsapp:'#d1fae5', email:'#dbeafe', meeting:'#ede9fe', quote:'#fef9c3', note:'#f1f5f9', stage_change:'#fce7f3' };

// ── State ─────────────────────────────────────────────────────────
let _crmTab    = 'pipeline';
let _dragLeadId= null;
let _currentUser = { name:'', email:'' };

// ── Helpers ───────────────────────────────────────────────────────
function _today()    { return new Date().toISOString().slice(0,10); }
function _nowIso()   { return new Date().toISOString(); }
function _esc(s)     { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function _fmtMoney(n){ return '₹' + Number(n||0).toLocaleString('en-IN'); }
function _setText(id,v){ const e=document.getElementById(id); if(e) e.textContent=v; }

function _fmtDate(d) {
  if (!d) return '—';
  return new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
}
function _fmtDateTimeLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function _relDate(dateStr) {
  if (!dateStr) return '';
  const today = _today();
  if (dateStr < today) return 'Overdue';
  if (dateStr === today) return 'Today';
  const diff = Math.round((new Date(dateStr) - new Date(today)) / 86400000);
  if (diff === 1) return 'Tomorrow';
  return `In ${diff} days`;
}
function _avatarColor(name) {
  const colors = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#14b8a6'];
  let h = 0;
  for (let i=0; i<(name||'').length; i++) h = (h*31+name.charCodeAt(i))>>>0;
  return colors[h%colors.length];
}

function _heatScore(lead) {
  if (typeof window.WanagoAI?.scoreLeadHeat === 'function') {
    try { return Math.round(WanagoAI.scoreLeadHeat(lead)); } catch(e) {}
  }
  // Simple fallback scoring
  let score = 30;
  if (lead.budget > 100000)         score += 20;
  else if (lead.budget > 50000)     score += 10;
  if (lead.travelDate) {
    const days = Math.round((new Date(lead.travelDate) - new Date()) / 86400000);
    if (days > 0 && days < 30)      score += 20;
    else if (days >= 30 && days < 90) score += 10;
  }
  if (lead.followup === _today())   score += 15;
  if (lead.advance > 0)             score += 15;
  if ((lead.activityLog||[]).length > 2) score += 10;
  return Math.min(100, score);
}

function _scoreClass(score) {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cool';
}

function _openLeads() {
  return (DB.leads||[]).filter(l => OPEN_STAGES.includes(l.stage));
}

// ── Stats ─────────────────────────────────────────────────────────
function renderStats() {
  const leads    = DB.leads || [];
  const open     = leads.filter(l => OPEN_STAGES.includes(l.stage));
  const pipeline = open.reduce((s,l) => s + Number(l.budget||0), 0);
  const today    = _today();
  const overdue  = open.filter(l => l.followup && l.followup < today).length;
  const dueToday = open.filter(l => l.followup === today).length;
  const wonMonth = leads.filter(l => l.stage === 'won' && (l.updatedAt||l.createdAt||'').slice(0,7) === today.slice(0,7)).length;

  document.getElementById('crm-stats').innerHTML = [
    { bg:'#eef2ff', num: open.length,       label:'Open Leads',        onclick:"setCrmTab('leads')"    },
    { bg:'#f0fdf4', num: _fmtMoney(pipeline),label:'Pipeline Value',   onclick:"setCrmTab('pipeline')" },
    { bg:'#fef2f2', num: overdue,            label:'Overdue Follow-ups',onclick:"setCrmTab('followups')"},
    { bg:'#fefce8', num: dueToday,           label:'Due Today',         onclick:"setCrmTab('followups')"},
    { bg:'#f0fdf4', num: wonMonth,           label:'Won This Month',    onclick:"setCrmTab('leads')"    },
  ].map(s => `<div class="crm-stat" onclick="${s.onclick}">
    <div><div class="crm-stat-num">${s.num}</div><div class="crm-stat-label">${s.label}</div></div>
  </div>`).join('');
}

// ── Tab ───────────────────────────────────────────────────────────
function setCrmTab(tab) {
  _crmTab = tab;
  document.querySelectorAll('.crm-tab').forEach(t => t.classList.remove('active'));
  const btn = document.getElementById('crm-tab-' + tab);
  if (btn) btn.classList.add('active');
  renderCrmContent();
}

function renderCrmContent() {
  if (_crmTab === 'pipeline')  renderPipeline();
  if (_crmTab === 'followups') renderFollowUps();
  if (_crmTab === 'leads')     renderHotLeads();
  if (_crmTab === 'activity')  renderActivityFeed();
}

// ── Pipeline Kanban ───────────────────────────────────────────────
function renderPipeline() {
  const leads   = DB.leads || [];
  const content = document.getElementById('crm-content');
  if (!content) return;

  // Totals per stage
  const stageTotals = {};
  STAGES.forEach(s => { stageTotals[s.id] = { count:0, value:0, leads:[] }; });
  leads.forEach(l => {
    const sid = l.stage || 'new';
    if (!stageTotals[sid]) return;
    stageTotals[sid].count++;
    stageTotals[sid].value += Number(l.budget||0);
    stageTotals[sid].leads.push(l);
  });

  const totalPipeline = OPEN_STAGES.reduce((s,id) => s + stageTotals[id].value, 0);

  content.innerHTML = `
    <div class="crm-section" style="margin-top:14px">
      <div class="crm-section-hdr">
        <span class="crm-section-title">Pipeline Board
          <span style="font-size:12px;font-weight:400;color:#64748b">${_fmtMoney(totalPipeline)} total pipeline value</span>
        </span>
        <span style="font-size:12px;color:#94a3b8">Drag cards to move stages</span>
      </div>
      <div class="pipeline-wrap" id="pipeline-wrap">
        ${STAGES.map(s => _pipelineCol(s, stageTotals[s.id])).join('')}
      </div>
    </div>`;
}

function _pipelineCol(stage, data) {
  const cards = data.leads
    .sort((a,b) => _heatScore(b) - _heatScore(a))
    .map(l => _pipelineCard(l, stage))
    .join('');

  return `<div class="pipeline-col">
    <div class="pipeline-col-hdr" style="background:${stage.bg};color:${stage.text}">
      <div>
        <div class="pipeline-col-label">${stage.label}</div>
        <div class="pipeline-col-value">${data.value ? _fmtMoney(data.value) : ''}</div>
      </div>
      <span class="pipeline-col-count">${data.count}</span>
    </div>
    <div class="pipeline-cards" id="col-${stage.id}"
      ondragover="onColDragOver(event,'${stage.id}')"
      ondragleave="onColDragLeave(event,'${stage.id}')"
      ondrop="onColDrop(event,'${stage.id}')">
      ${cards || `<div style="text-align:center;padding:20px 10px;font-size:11.5px;color:#cbd5e1">Drop here</div>`}
    </div>
  </div>`;
}

function _pipelineCard(lead, stage) {
  const score   = _heatScore(lead);
  const sc      = _scoreClass(score);
  const today   = _today();
  const fuOverdue = lead.followup && lead.followup < today;
  const fuRel   = lead.followup ? _relDate(lead.followup) : '';
  const nextStage = OPEN_STAGES[OPEN_STAGES.indexOf(stage.id) + 1];

  return `<div class="pipeline-card" draggable="true"
    ondragstart="onCardDragStart(event,'${_esc(lead.id)}')"
    ondragend="onCardDragEnd(event)">
    <div class="pc-actions">
      <button class="pc-btn pc-btn-log" onclick="openActivityModal('${_esc(lead.id)}')" title="Log activity">Log</button>
      ${nextStage ? `<button class="pc-btn pc-btn-next" onclick="moveLeadStage('${_esc(lead.id)}','${nextStage}')" title="Move to ${nextStage}">→</button>` : ''}
    </div>
    <div class="pc-name" onclick="openLeadDetail('${_esc(lead.id)}')">${_esc(lead.name||'—')}</div>
    <div class="pc-dest">${_esc(lead.destination||'—')}</div>
    <div class="pc-meta">
      <span class="pc-budget">${lead.budget ? _fmtMoney(lead.budget) : '—'}</span>
      <span class="pc-score ${sc}">${score}</span>
    </div>
    ${lead.followup ? `<div class="pc-followup${fuOverdue?' overdue':''}">FU: ${fuRel}</div>` : ''}
    ${lead.agent ? `<div style="font-size:10px;color:#94a3b8;margin-top:3px">${_esc(lead.agent)}</div>` : ''}
  </div>`;
}

// ── Drag & Drop ───────────────────────────────────────────────────
function onCardDragStart(event, leadId) {
  _dragLeadId = leadId;
  event.dataTransfer.effectAllowed = 'move';
  setTimeout(() => { const el = event.target; if(el) el.classList.add('dragging'); }, 0);
}
function onCardDragEnd(event) {
  _dragLeadId = null;
  event.target.classList.remove('dragging');
  document.querySelectorAll('.pipeline-cards').forEach(c => c.classList.remove('drag-over'));
}
function onColDragOver(event, stageId) {
  if (!_dragLeadId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  document.getElementById('col-' + stageId)?.classList.add('drag-over');
}
function onColDragLeave(event, stageId) {
  document.getElementById('col-' + stageId)?.classList.remove('drag-over');
}
function onColDrop(event, stageId) {
  event.preventDefault();
  document.getElementById('col-' + stageId)?.classList.remove('drag-over');
  if (!_dragLeadId) return;
  moveLeadStage(_dragLeadId, stageId);
  _dragLeadId = null;
}

function moveLeadStage(leadId, newStage) {
  const leads = DB.leads || [];
  const idx   = leads.findIndex(l => l.id === leadId);
  if (idx < 0) return;
  const oldStage = leads[idx].stage;
  if (oldStage === newStage) return;

  leads[idx].stage     = newStage;
  leads[idx].updatedAt = _nowIso();

  // Auto-log stage change
  if (!leads[idx].activityLog) leads[idx].activityLog = [];
  leads[idx].activityLog.push({
    type: 'stage_change',
    note: `Stage moved: ${oldStage} → ${newStage}`,
    by:   _currentUser.name || _currentUser.email,
    at:   _nowIso(),
  });

  DB.leads = leads;
  saveDB();
  if (typeof dbSave === 'function') dbSave('leads', leads[idx]);
  renderStats();
  renderCrmContent();
  showToast(`${leads[idx].name} moved to ${newStage}.`);
}

// ── Follow-up Queue ───────────────────────────────────────────────
function renderFollowUps() {
  const today   = _today();
  const leads   = (DB.leads||[]).filter(l => OPEN_STAGES.includes(l.stage) && l.followup);
  const overdue = leads.filter(l => l.followup < today).sort((a,b) => a.followup < b.followup ? -1 : 1);
  const dueToday= leads.filter(l => l.followup === today);
  const upcoming= leads.filter(l => l.followup > today).sort((a,b) => a.followup < b.followup ? -1 : 1).slice(0,10);

  const content = document.getElementById('crm-content');
  if (!content) return;

  const section = (title, items, cls) => {
    if (!items.length) return '';
    return `<div class="crm-section" style="margin-top:14px">
      <div class="crm-section-hdr">
        <span class="crm-section-title">${title}</span>
        <span style="font-size:12px;color:#94a3b8">${items.length} lead${items.length!==1?'s':''}</span>
      </div>
      <div class="crm-body">
        ${items.map(l => _fuItem(l, cls)).join('')}
      </div>
    </div>`;
  };

  content.innerHTML =
    section('Overdue Follow-ups', overdue, 'overdue') ||
    (overdue.length ? '' : '<div style="padding:14px 24px 0"><div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;font-size:13px;color:#166534">No overdue follow-ups!</div></div>') +
    section('Due Today', dueToday, 'today') +
    section('Upcoming Follow-ups', upcoming, 'upcoming') +
    (overdue.length + dueToday.length + upcoming.length === 0
      ? '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px">No follow-ups scheduled.</div>'
      : '');
}

function _fuItem(lead, cls) {
  const score   = _heatScore(lead);
  const sc      = _scoreClass(score);
  const stageObj= STAGES.find(s => s.id === lead.stage) || STAGES[0];
  return `<div class="fu-item">
    <div class="fu-dot" style="background:${stageObj.text}"></div>
    <div style="flex:1;min-width:0">
      <div class="fu-name">${_esc(lead.name||'—')}</div>
      <div class="fu-sub">${_esc(lead.destination||'—')} · ${stageObj.label} · ${lead.budget ? _fmtMoney(lead.budget) : '—'}</div>
      ${lead.notes ? `<div style="font-size:11px;color:#94a3b8;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_esc(lead.notes)}</div>` : ''}
    </div>
    <div style="text-align:right;flex-shrink:0">
      <div class="fu-date ${cls}">${_relDate(lead.followup)}</div>
      <div style="font-size:11px;color:#94a3b8">${_fmtDate(lead.followup)}</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-left:6px">
      <button class="btn btn-outline btn-sm" onclick="openActivityModal('${_esc(lead.id)}')" style="font-size:11px;padding:4px 9px">Log</button>
      <button class="btn btn-outline btn-sm" onclick="openLeadDetail('${_esc(lead.id)}')" style="font-size:11px;padding:4px 9px">View</button>
    </div>
  </div>`;
}

// ── Hot Leads Leaderboard ─────────────────────────────────────────
function renderHotLeads() {
  const content = document.getElementById('crm-content');
  if (!content) return;

  const open  = _openLeads().map(l => ({ ...l, _score: _heatScore(l) })).sort((a,b) => b._score - a._score);
  const maxSc = open[0]?._score || 100;

  content.innerHTML = `<div class="crm-section" style="margin-top:14px">
    <div class="crm-section-hdr">
      <span class="crm-section-title">Hot Leads Leaderboard</span>
      <span style="font-size:12px;color:#94a3b8">${open.length} open leads</span>
    </div>
    <div class="crm-body">
      ${!open.length
        ? '<div style="text-align:center;padding:24px;color:#94a3b8">No open leads.</div>'
        : open.slice(0,20).map((lead, i) => {
            const sc    = _scoreClass(lead._score);
            const clr   = sc==='hot' ? '#ef4444' : sc==='warm' ? '#f59e0b' : '#3b82f6';
            const stg   = STAGES.find(s => s.id === lead.stage)||STAGES[0];
            return `<div class="lb-row" onclick="openLeadDetail('${_esc(lead.id)}')">
              <div class="lb-rank${i<3?' top':''}">${i<3?['🥇','🥈','🥉'][i]:i+1}</div>
              <div class="lb-avatar" style="background:${_avatarColor(lead.name)}">${(lead.name||'?')[0].toUpperCase()}</div>
              <div class="lb-info">
                <div class="lb-name">${_esc(lead.name||'—')}</div>
                <div class="lb-sub">${_esc(lead.destination||'—')} · ${stg.label} · ${lead.budget ? _fmtMoney(lead.budget) : '—'}</div>
              </div>
              <div class="lb-score-bar"><div class="lb-score-fill" style="width:${Math.round(lead._score/maxSc*100)}%;background:${clr}"></div></div>
              <div class="lb-score-val" style="color:${clr}">${lead._score}</div>
              <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();openActivityModal('${_esc(lead.id)}')" style="font-size:11.5px;margin-left:6px">Log</button>
            </div>`;
          }).join('')}
    </div>
  </div>`;
}

// ── Activity Feed ─────────────────────────────────────────────────
function renderActivityFeed() {
  const content = document.getElementById('crm-content');
  if (!content) return;

  // Collect all activity log entries across all leads
  const entries = [];
  (DB.leads||[]).forEach(lead => {
    (lead.activityLog||[]).forEach(act => {
      entries.push({ ...act, leadId: lead.id, leadName: lead.name, leadDest: lead.destination });
    });
  });
  entries.sort((a,b) => (b.at||'') > (a.at||'') ? 1 : -1);

  content.innerHTML = `<div class="crm-section" style="margin-top:14px">
    <div class="crm-section-hdr">
      <span class="crm-section-title">All Activity Log</span>
      <span style="font-size:12px;color:#94a3b8">${entries.length} entries</span>
    </div>
    <div class="crm-body">
      ${!entries.length
        ? '<div style="text-align:center;padding:24px;color:#94a3b8">No activities logged yet. Use "Log" on any lead to track calls, emails, and meetings.</div>'
        : entries.slice(0,50).map(act => {
            const icon = ACT_ICONS[act.type] || 'Note';
            const bg   = ACT_COLORS[act.type] || '#f1f5f9';
            const d    = act.at ? new Date(act.at) : null;
            const timeStr = d ? d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}) + ' ' + d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : '—';
            return `<div class="act-item">
              <div class="act-icon" style="background:${bg}">${icon}</div>
              <div class="act-text" style="flex:1;min-width:0">
                <strong>${_esc(act.leadName||'—')}</strong>
                <span style="font-size:12px;color:#64748b"> · ${_esc(act.leadDest||'')}</span><br>
                <span style="font-size:12.5px">${_esc(act.note||'')}</span>
                ${act.by ? `<span style="font-size:11px;color:#94a3b8"> — ${_esc(act.by)}</span>` : ''}
              </div>
              <div class="act-time">${timeStr}</div>
            </div>`;
          }).join('')}
    </div>
  </div>`;
}

// ── Activity Modal ────────────────────────────────────────────────
function openActivityModal(leadId) {
  const lead = (DB.leads||[]).find(l => l.id === leadId);
  if (!lead) return;
  document.getElementById('act-lead-id-input').value = leadId;
  document.getElementById('act-lead-id').textContent   = lead.id;
  document.getElementById('act-lead-name').textContent = lead.name || '—';
  document.getElementById('act-lead-sub').textContent  = `${lead.destination||'—'} · ${lead.stage||'—'} · ${lead.budget ? _fmtMoney(lead.budget) : '—'}`;
  document.getElementById('act-type').value    = 'call';
  document.getElementById('act-datetime').value= _fmtDateTimeLocal(_nowIso());
  document.getElementById('act-note').value    = '';
  document.getElementById('act-stage').value   = '';
  document.getElementById('act-followup').value= '';
  document.getElementById('act-error').style.display = 'none';
  document.getElementById('act-modal-title').textContent = `Log Activity — ${lead.name}`;
  document.getElementById('modal-activity').classList.add('open');
  setTimeout(() => document.getElementById('act-note').focus(), 50);
}

function closeActivityModal() {
  document.getElementById('modal-activity').classList.remove('open');
}

function saveActivity() {
  const leadId = document.getElementById('act-lead-id-input').value;
  const note   = document.getElementById('act-note').value.trim();
  const errEl  = document.getElementById('act-error');
  if (!note) { errEl.textContent = 'Notes/outcome is required.'; errEl.style.display=''; return; }
  errEl.style.display = 'none';

  const leads = DB.leads || [];
  const idx   = leads.findIndex(l => l.id === leadId);
  if (idx < 0) { errEl.textContent='Lead not found.'; errEl.style.display=''; return; }

  const dtVal = document.getElementById('act-datetime').value;
  const act = {
    type: document.getElementById('act-type').value,
    note,
    by:   _currentUser.name || _currentUser.email,
    at:   dtVal ? new Date(dtVal).toISOString() : _nowIso(),
  };

  if (!leads[idx].activityLog) leads[idx].activityLog = [];
  leads[idx].activityLog.push(act);
  leads[idx].updatedAt = _nowIso();

  // Optionally move stage
  const newStage = document.getElementById('act-stage').value;
  if (newStage) {
    const oldStage = leads[idx].stage;
    leads[idx].stage = newStage;
    leads[idx].activityLog.push({ type:'stage_change', note:`Stage: ${oldStage} → ${newStage}`, by: act.by, at: act.at });
  }

  // Update follow-up date
  const fuDate = document.getElementById('act-followup').value;
  if (fuDate) leads[idx].followup = fuDate;

  DB.leads = leads;
  saveDB();
  if (typeof dbSave === 'function') dbSave('leads', leads[idx]);
  closeActivityModal();
  renderStats();
  renderCrmContent();
  showToast('Activity logged.');
}

// ── Lead Detail Modal ─────────────────────────────────────────────
function openLeadDetail(leadId) {
  const lead = (DB.leads||[]).find(l => l.id === leadId);
  if (!lead) return;

  const score    = _heatScore(lead);
  const sc       = _scoreClass(score);
  const scClr    = sc==='hot'?'#ef4444':sc==='warm'?'#f59e0b':'#3b82f6';
  const stageObj = STAGES.find(s => s.id === lead.stage) || STAGES[0];
  const acts     = [...(lead.activityLog||[])].reverse();

  document.getElementById('ld-title').textContent = lead.name || 'Lead';
  document.getElementById('ld-log-btn').onclick = () => { closeLeadDetail(); openActivityModal(leadId); };

  document.getElementById('ld-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      ${_dr('Stage',         `${stageObj.label}`)}
      ${_dr('Heat Score',    `<span style="font-weight:700;color:${scClr}">${score} / 100</span>`, true)}
      ${_dr('Destination',   lead.destination)}
      ${_dr('Trip Type',     lead.tripType)}
      ${_dr('Travel Date',   _fmtDate(lead.travelDate))}
      ${_dr('Budget',        lead.budget ? _fmtMoney(lead.budget) : '—')}
      ${_dr('Advance Paid',  lead.advance ? _fmtMoney(lead.advance) : '—')}
      ${_dr('Balance Due',   lead.balance ? _fmtMoney(lead.balance) : '—')}
      ${_dr('PAX',           lead.pax || 1)}
      ${_dr('Source',        lead.source)}
      ${_dr('Agent',         lead.agent || '—')}
      ${_dr('Follow-up',     lead.followup ? `${_fmtDate(lead.followup)} (${_relDate(lead.followup)})` : '—')}
      ${lead.phone   ? _dr('Phone',  lead.phone)  : ''}
      ${lead.email   ? _dr('Email',  lead.email)  : ''}
    </div>
    ${lead.notes ? `<div style="background:#f8fafc;border-radius:8px;padding:10px 12px;margin-bottom:16px">
      <div style="font-size:11px;font-weight:600;color:#94a3b8;margin-bottom:4px">NOTES</div>
      <div style="font-size:13px;color:#334155">${_esc(lead.notes)}</div>
    </div>` : ''}
    <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:10px">Activity Timeline</div>
    ${!acts.length
      ? '<div style="text-align:center;padding:16px;color:#94a3b8;font-size:12px;border:1.5px dashed #e2e8f0;border-radius:8px">No activities logged yet.</div>'
      : `<div class="act-timeline">${acts.map(act => {
          const icon = ACT_ICONS[act.type]||'Note';
          const bg   = ACT_COLORS[act.type]||'#f1f5f9';
          const d    = act.at ? new Date(act.at) : null;
          const tStr = d ? d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) + ' ' + d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) : '';
          return `<div class="act-tl-item">
            <div class="act-tl-dot" style="background:${bg}">${icon}</div>
            <div class="act-tl-content">
              <div class="act-tl-text">${_esc(act.note||'')}</div>
              <div class="act-tl-meta">${_esc(act.by||'')}${tStr?' · '+tStr:''}</div>
            </div>
          </div>`;
        }).join('')}</div>`}`;

  document.getElementById('modal-lead-detail').classList.add('open');
}

function _dr(label, val, raw) {
  const v = raw ? String(val||'—') : `<span style="font-size:13px;font-weight:500;color:#1e293b">${_esc(String(val||'—'))}</span>`;
  return `<div>
    <div style="font-size:11px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">${label}</div>
    ${v}
  </div>`;
}

function closeLeadDetail() {
  document.getElementById('modal-lead-detail').classList.remove('open');
}

// ── Expose globals ────────────────────────────────────────────────
Object.assign(window, {
  setCrmTab, renderCrmContent,
  onCardDragStart, onCardDragEnd, onColDragOver, onColDragLeave, onColDrop,
  moveLeadStage,
  openActivityModal, closeActivityModal, saveActivity,
  openLeadDetail, closeLeadDetail,
});

// ── Init ──────────────────────────────────────────────────────────
initPage(function() {
  try {
    const sess = JSON.parse(sessionStorage.getItem('wanago_session')||'{}');
    _currentUser = { email: sess.email||'', name: sess.name||sess.email||'Team Member' };
  } catch(e) {}

  renderStats();
  renderCrmContent();

  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      renderStats();
      renderCrmContent();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('leads', function() { renderStats(); renderCrmContent(); });
      }
    }, 5000);
  }
});
