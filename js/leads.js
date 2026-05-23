// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Leads Module (Complete Rewrite)
//  Clean architecture · Firebase Firestore · RBAC-aware
//  Version: 2.0.0
// ═══════════════════════════════════════════════════════════════

'use strict';

// ── CONSTANTS ──────────────────────────────────────────────────
const LEAD_STAGES = [
  { id: 'new',       label: 'New',       color: '#6366f1', bg: '#eef2ff' },
  { id: 'contacted', label: 'Contacted', color: '#0ea5e9', bg: '#e0f2fe' },
  { id: 'quoted',    label: 'Quoted',    color: '#f59e0b', bg: '#fffbeb' },
  { id: 'followup',  label: 'Follow-Up', color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'won',       label: 'Won',       color: '#10b981', bg: '#ecfdf5' },
  { id: 'lost',      label: 'Lost',      color: '#ef4444', bg: '#fef2f2' },
];

const LEAD_PRIORITIES = [
  { id: 'hot',    label: '🔴 Hot',    color: '#ef4444' },
  { id: 'warm',   label: '🟡 Warm',   color: '#f59e0b' },
  { id: 'cold',   label: '🔵 Cold',   color: '#64748b' },
];

const TRIP_TYPES = ['domestic', 'international', 'honeymoon', 'pilgrimage', 'adventure', 'corporate'];

// ── STATE ──────────────────────────────────────────────────────
let _leadsFilter  = 'all';
let _leadsPriority = 'all';
let _leadsSearch  = '';
let _leadsSort    = 'newest';
let _kanbanMode   = false;
let _leadsUnsubscribe = null;   // Firestore realtime listener

// ── FIRESTORE HELPERS ──────────────────────────────────────────
/**
 * Save a single lead to Firestore + local DB.
 * Falls back gracefully if dbSave is not available.
 */
async function _saveLead(lead) {
  // Update local DB
  const idx = DB.leads.findIndex(l => l.id === lead.id);
  if (idx >= 0) {
    DB.leads[idx] = lead;
  } else {
    DB.leads.push(lead);
  }
  saveDB();

  // Persist to Firestore
  if (typeof window.dbSave === 'function') {
    try {
      await window.dbSave('leads', lead);
    } catch (e) {
      console.warn('[Leads] Firestore save failed, queued locally:', e.message);
    }
  }
}

/**
 * Delete a lead from Firestore + local DB.
 */
async function _deleteLead(leadId) {
  DB.leads = DB.leads.filter(l => l.id !== leadId);
  saveDB();

  if (typeof window.dbDelete === 'function') {
    try {
      await window.dbDelete('leads', leadId);
    } catch (e) {
      console.warn('[Leads] Firestore delete failed, removed locally:', e.message);
    }
  }
}

/**
 * Subscribe to realtime Firestore updates.
 * Re-renders the list whenever Firestore pushes changes.
 */
function _subscribeLeads() {
  if (typeof window.dbListen !== 'function') return;
  if (_leadsUnsubscribe) { _leadsUnsubscribe(); _leadsUnsubscribe = null; }

  _leadsUnsubscribe = window.dbListen('leads', (firestoreLeads) => {
    if (!Array.isArray(firestoreLeads)) return;
    // Merge Firestore truth into local DB (Firestore wins)
    DB.leads = firestoreLeads;
    saveDB({ silent: true });
    _renderLeads();
    _renderLeadStats();
  });
}

// ── UTILS ──────────────────────────────────────────────────────
function _nextLeadId() {
  DB.counters = DB.counters || {};
  DB.counters.leads = (DB.counters.leads || 0) + 1;
  return 'L' + String(DB.counters.leads).padStart(4, '0');
}

function _nowISO() { return new Date().toISOString(); }

function _stageInfo(stageId) {
  return LEAD_STAGES.find(s => s.id === stageId) || LEAD_STAGES[0];
}

function _priorityInfo(pId) {
  return LEAD_PRIORITIES.find(p => p.id === pId) || LEAD_PRIORITIES[1];
}

function _getLeadSources() {
  return (DB.settings && DB.settings.leadSources) || [
    'Instagram', 'Facebook', 'WhatsApp', 'Walk-in', 'Referral', 'Website', 'Google', 'YouTube', 'TV Ad', 'Cold Call'
  ];
}

function _getAgents() {
  const team = (DB.settings && DB.settings.team) || [];
  return team.filter(m => ['sales', 'management', 'leadership', 'operations'].includes(m.dept));
}

function _formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function _formatCurrency(n) {
  const num = Number(n) || 0;
  return '₹' + num.toLocaleString('en-IN');
}

function _daysAgo(iso) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return diff + 'd ago';
}

function _followupDue(lead) {
  if (!lead.followup) return false;
  return new Date(lead.followup) <= new Date();
}

// ── DATA FILTERING ─────────────────────────────────────────────
function _filteredLeads() {
  let leads = (typeof hScoped === 'function') ? hScoped('leads') : (DB.leads || []);

  // Stage filter
  if (_leadsFilter !== 'all') {
    leads = leads.filter(l => l.stage === _leadsFilter);
  }

  // Priority filter
  if (_leadsPriority !== 'all') {
    leads = leads.filter(l => l.priority === _leadsPriority);
  }

  // Search
  if (_leadsSearch.trim()) {
    const q = _leadsSearch.toLowerCase();
    leads = leads.filter(l =>
      (l.name || '').toLowerCase().includes(q) ||
      (l.phone || '').includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.destination || '').toLowerCase().includes(q) ||
      (l.source || '').toLowerCase().includes(q) ||
      (l.agent || '').toLowerCase().includes(q)
    );
  }

  // Sort
  leads = [...leads].sort((a, b) => {
    switch (_leadsSort) {
      case 'oldest':   return new Date(a.createdAt) - new Date(b.createdAt);
      case 'budget':   return (Number(b.budget) || 0) - (Number(a.budget) || 0);
      case 'followup': return new Date(a.followup || '9999') - new Date(b.followup || '9999');
      case 'name':     return (a.name || '').localeCompare(b.name || '');
      default:         return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  return leads;
}

// ── RENDER: STATS STRIP ────────────────────────────────────────
function _renderLeadStats() {
  const el = document.getElementById('leads-stats');
  if (!el) return;

  const all = (typeof hScoped === 'function') ? hScoped('leads') : (DB.leads || []);
  const today = new Date().toDateString();

  const total   = all.length;
  const newToday = all.filter(l => new Date(l.createdAt).toDateString() === today).length;
  const hot      = all.filter(l => l.priority === 'hot').length;
  const won      = all.filter(l => l.stage === 'won').length;
  const overdue  = all.filter(l => _followupDue(l) && !['won','lost'].includes(l.stage)).length;
  const pipeline = all.filter(l => !['won','lost'].includes(l.stage))
                      .reduce((s, l) => s + (Number(l.budget) || 0), 0);

  el.innerHTML = `
    <div class="stat-card" onclick="setLeadsFilter('all')">
      <div class="stat-label">Total Leads</div>
      <div class="stat-value">${total}</div>
    </div>
    <div class="stat-card" onclick="setLeadsFilter('new')">
      <div class="stat-label">New Today</div>
      <div class="stat-value" style="color:#6366f1">${newToday}</div>
    </div>
    <div class="stat-card" onclick="setLeadsPriority('hot')">
      <div class="stat-label">🔴 Hot Leads</div>
      <div class="stat-value" style="color:#ef4444">${hot}</div>
    </div>
    <div class="stat-card" onclick="setLeadsFilter('won')">
      <div class="stat-label">Won</div>
      <div class="stat-value" style="color:#10b981">${won}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Pipeline Value</div>
      <div class="stat-value" style="color:#f59e0b">${_formatCurrency(pipeline)}</div>
    </div>
    ${overdue > 0 ? `<div class="stat-card" style="border-color:#ef4444;background:#fef2f2">
      <div class="stat-label" style="color:#ef4444">⚠️ Overdue F/U</div>
      <div class="stat-value" style="color:#ef4444">${overdue}</div>
    </div>` : ''}
  `;
}

// ── RENDER: LIST VIEW ──────────────────────────────────────────
function _renderLeads() {
  if (_kanbanMode) { _renderKanban(); return; }

  const tbody = document.getElementById('leads-tbody');
  if (!tbody) return;

  const leads = _filteredLeads();

  if (leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--textd)">
      <div style="font-size:32px;margin-bottom:8px">📋</div>
      <div style="font-weight:600">No leads found</div>
      <div style="font-size:12px;margin-top:4px">Try adjusting filters or add a new lead</div>
    </td></tr>`;
    return;
  }

  const canEdit = (typeof window.canEditLead === 'function');

  tbody.innerHTML = leads.map(lead => {
    const stage    = _stageInfo(lead.stage);
    const priority = _priorityInfo(lead.priority);
    const due      = _followupDue(lead);
    const editable = !canEdit || window.canEditLead(lead);

    return `<tr class="${due ? 'row-overdue' : ''}" data-id="${esc(lead.id)}">
      <td>
        <div style="font-weight:600;font-size:13px">${esc(lead.name)}</div>
        <div style="font-size:11px;color:var(--textd)">${esc(lead.phone)}</div>
        ${lead.email ? `<div style="font-size:11px;color:var(--textd)">${esc(lead.email)}</div>` : ''}
      </td>
      <td>
        <div>${esc(lead.destination || '—')}</div>
        ${lead.travelDate ? `<div style="font-size:11px;color:var(--textd)">${_formatDate(lead.travelDate)}</div>` : ''}
        ${lead.pax ? `<div style="font-size:11px;color:var(--textd)">${esc(String(lead.pax))} pax</div>` : ''}
      </td>
      <td><span style="font-size:11px;padding:2px 8px;border-radius:20px;background:var(--cream);color:var(--textd)">${esc(lead.source || '—')}</span></td>
      <td>
        <span class="lead-stage-badge" style="background:${stage.bg};color:${stage.color}">
          ${esc(stage.label)}
        </span>
      </td>
      <td>
        <span style="font-size:12px;font-weight:600;color:${priority.color}">${esc(priority.label)}</span>
      </td>
      <td style="font-weight:600">${_formatCurrency(lead.budget)}</td>
      <td>
        ${lead.followup
          ? `<span style="color:${due ? '#ef4444' : 'var(--text)'};font-size:12px;font-weight:${due ? '700' : '400'}">
              ${due ? '⚠️ ' : ''}${_formatDate(lead.followup)}
            </span>`
          : '<span style="color:var(--textd)">—</span>'}
      </td>
      <td style="font-size:12px;color:var(--textd)">${esc(lead.agent || '—')}</td>
      <td>
        <div style="display:flex;gap:4px;align-items:center">
          <button class="btn btn-sm btn-outline" onclick="viewLead('${esc(lead.id)}')" title="View">👁</button>
          ${editable ? `<button class="btn btn-sm btn-outline" onclick="editLead('${esc(lead.id)}')" title="Edit">✏️</button>` : ''}
          ${editable && !['won','lost'].includes(lead.stage) ? `
            <button class="btn btn-sm btn-green" onclick="quickQuote('${esc(lead.id)}')" title="Create Quotation" style="padding:3px 8px;font-size:11px">Quote</button>
          ` : ''}
          ${editable ? `<button class="btn btn-sm btn-danger" onclick="confirmDeleteLead('${esc(lead.id)}')" title="Delete">🗑</button>` : ''}
        </div>
      </td>
    </tr>`;
  }).join('');

  // Update count badge
  const badge = document.getElementById('leads-count');
  if (badge) badge.textContent = leads.length;
}

// ── RENDER: KANBAN VIEW ────────────────────────────────────────
function _renderKanban() {
  const wrap = document.getElementById('leads-kanban');
  if (!wrap) return;

  const allLeads = _filteredLeads();

  wrap.innerHTML = LEAD_STAGES.map(stage => {
    const stageleads = allLeads.filter(l => l.stage === stage.id);
    const total = stageleads.reduce((s, l) => s + (Number(l.budget) || 0), 0);

    return `
      <div class="kanban-col" data-stage="${esc(stage.id)}">
        <div class="kanban-col-header" style="border-top:3px solid ${stage.color}">
          <span style="font-weight:700;font-size:13px;color:${stage.color}">${esc(stage.label)}</span>
          <span class="kanban-count">${stageleads.length}</span>
          ${total > 0 ? `<span style="font-size:11px;color:var(--textd);margin-left:auto">${_formatCurrency(total)}</span>` : ''}
        </div>
        <div class="kanban-cards" ondragover="event.preventDefault()" ondrop="handleKanbanDrop(event,'${esc(stage.id)}')">
          ${stageleads.map(lead => `
            <div class="kanban-card" draggable="true" ondragstart="handleKanbanDragStart(event,'${esc(lead.id)}')" data-id="${esc(lead.id)}">
              <div class="kanban-card-name">${esc(lead.name)}</div>
              <div class="kanban-card-sub">${esc(lead.destination || '')}${lead.pax ? ' · ' + esc(String(lead.pax)) + ' pax' : ''}</div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px">
                <span style="font-size:12px;font-weight:700;color:var(--text)">${_formatCurrency(lead.budget)}</span>
                <span style="font-size:11px;color:${_priorityInfo(lead.priority).color}">${esc(_priorityInfo(lead.priority).label)}</span>
              </div>
              ${lead.followup ? `<div style="font-size:11px;color:${_followupDue(lead) ? '#ef4444' : 'var(--textd)'};margin-top:4px">${_followupDue(lead) ? '⚠️ ' : '📅 '}${_formatDate(lead.followup)}</div>` : ''}
              <div style="display:flex;gap:4px;margin-top:8px">
                <button class="btn btn-sm btn-outline" onclick="viewLead('${esc(lead.id)}')" style="flex:1;padding:3px 0;font-size:11px">View</button>
                <button class="btn btn-sm btn-outline" onclick="editLead('${esc(lead.id)}')" style="flex:1;padding:3px 0;font-size:11px">Edit</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// ── KANBAN DRAG & DROP ─────────────────────────────────────────
let _draggingLeadId = null;

function handleKanbanDragStart(event, leadId) {
  _draggingLeadId = leadId;
  event.dataTransfer.effectAllowed = 'move';
}

async function handleKanbanDrop(event, newStage) {
  event.preventDefault();
  if (!_draggingLeadId) return;

  const lead = DB.leads.find(l => l.id === _draggingLeadId);
  _draggingLeadId = null;

  if (!lead || lead.stage === newStage) return;

  if (typeof window.canEditLead === 'function' && !window.canEditLead(lead)) {
    showToast('Permission denied', 'error'); return;
  }

  lead.stage     = newStage;
  lead.updatedAt = _nowISO();
  logActivity && logActivity(`Lead "${lead.name}" moved to ${_stageInfo(newStage).label}`, 'lead');

  await _saveLead(lead);
  _renderLeads();
  _renderLeadStats();
  showToast(`Moved to ${_stageInfo(newStage).label}`, 'success');
}

// ── FILTER / SEARCH CONTROLS ───────────────────────────────────
function setLeadsFilter(stage) {
  _leadsFilter = stage;
  // Update chip UI
  document.querySelectorAll('#leads-filter-bar .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.stage === stage);
  });
  _renderLeads();
}

function setLeadsPriority(p) {
  _leadsPriority = _leadsPriority === p ? 'all' : p;
  _renderLeads();
}

function setLeadsSort(val) {
  _leadsSort = val;
  _renderLeads();
}

function setLeadsSearch(val) {
  _leadsSearch = val;
  _renderLeads();
}

function toggleLeadsView() {
  _kanbanMode = !_kanbanMode;
  const listWrap   = document.getElementById('leads-table-wrap');
  const kanbanWrap = document.getElementById('leads-kanban-wrap');
  const btn        = document.getElementById('leads-view-toggle');

  if (listWrap)   listWrap.style.display   = _kanbanMode ? 'none'  : '';
  if (kanbanWrap) kanbanWrap.style.display = _kanbanMode ? ''      : 'none';
  if (btn)        btn.textContent          = _kanbanMode ? '📋 List' : '🗂 Kanban';

  _renderLeads();
}

// ── MODAL: ADD / EDIT LEAD ─────────────────────────────────────
function openAddLead() {
  _populateLeadForm(null);
  openModal('modal-lead-form');
  document.getElementById('lead-form-title').textContent = '+ Add New Lead';
}

function editLead(leadId) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) { showToast('Lead not found', 'error'); return; }
  _populateLeadForm(lead);
  openModal('modal-lead-form');
  document.getElementById('lead-form-title').textContent = 'Edit Lead';
}

function _populateLeadForm(lead) {
  const sources = _getLeadSources();
  const agents  = _getAgents();

  // Populate sources dropdown
  const srcEl = document.getElementById('lf-source');
  if (srcEl) {
    srcEl.innerHTML = `<option value="">Select source...</option>` +
      sources.map(s => `<option value="${esc(s)}" ${lead && lead.source === s ? 'selected' : ''}>${esc(s)}</option>`).join('');
  }

  // Populate agents dropdown
  const agEl = document.getElementById('lf-agent');
  if (agEl) {
    agEl.innerHTML = `<option value="">Unassigned</option>` +
      agents.map(a => `<option value="${esc(a.name)}" ${lead && lead.agent === a.name ? 'selected' : ''}>${esc(a.name)}</option>`).join('');
  }

  // Populate stage
  const stEl = document.getElementById('lf-stage');
  if (stEl) {
    stEl.innerHTML = LEAD_STAGES.map(s =>
      `<option value="${esc(s.id)}" ${lead && lead.stage === s.id ? 'selected' : ''}>${esc(s.label)}</option>`
    ).join('');
  }

  // Populate priority
  const prEl = document.getElementById('lf-priority');
  if (prEl) {
    prEl.innerHTML = LEAD_PRIORITIES.map(p =>
      `<option value="${esc(p.id)}" ${lead && lead.priority === p.id ? 'selected' : (!lead && p.id === 'warm' ? 'selected' : '')}>${esc(p.label)}</option>`
    ).join('');
  }

  // Populate trip type
  const ttEl = document.getElementById('lf-triptype');
  if (ttEl) {
    ttEl.innerHTML = TRIP_TYPES.map(t =>
      `<option value="${esc(t)}" ${lead && lead.tripType === t ? 'selected' : (!lead && t === 'domestic' ? 'selected' : '')}>${esc(t.charAt(0).toUpperCase() + t.slice(1))}</option>`
    ).join('');
  }

  // Set field values
  _setVal('lf-id',          lead ? lead.id : '');
  _setVal('lf-name',        lead ? lead.name : '');
  _setVal('lf-phone',       lead ? lead.phone : '');
  _setVal('lf-email',       lead ? (lead.email || '') : '');
  _setVal('lf-destination', lead ? (lead.destination || '') : '');
  _setVal('lf-budget',      lead ? (lead.budget || '') : '');
  _setVal('lf-pax',         lead ? (lead.pax || 2) : 2);
  _setVal('lf-traveldate',  lead ? (lead.travelDate || '') : '');
  _setVal('lf-followup',    lead ? (lead.followup || '') : '');
  _setVal('lf-notes',       lead ? (lead.notes || '') : '');
}

function _setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

async function saveLeadForm() {
  // Validate
  const name  = (document.getElementById('lf-name')?.value || '').trim();
  const phone = (document.getElementById('lf-phone')?.value || '').trim();

  if (!name)  { showError('lf-name-error',  'Name is required');  return; }
  if (!phone) { showError('lf-phone-error', 'Phone is required'); return; }

  const existingId = document.getElementById('lf-id')?.value;
  const isNew      = !existingId;
  let   lead       = isNew ? {} : (DB.leads.find(l => l.id === existingId) || {});

  // Permission check
  if (!isNew && typeof window.canEditLead === 'function' && !window.canEditLead(lead)) {
    showToast('Permission denied', 'error'); return;
  }

  lead.id          = existingId || _nextLeadId();
  lead.name        = name;
  lead.phone       = phone;
  lead.email       = (document.getElementById('lf-email')?.value || '').trim();
  lead.destination = (document.getElementById('lf-destination')?.value || '').trim();
  lead.source      = document.getElementById('lf-source')?.value || '';
  lead.stage       = document.getElementById('lf-stage')?.value || 'new';
  lead.priority    = document.getElementById('lf-priority')?.value || 'warm';
  lead.tripType    = document.getElementById('lf-triptype')?.value || 'domestic';
  lead.budget      = Number(document.getElementById('lf-budget')?.value) || 0;
  lead.pax         = Number(document.getElementById('lf-pax')?.value) || 2;
  lead.travelDate  = document.getElementById('lf-traveldate')?.value || '';
  lead.followup    = document.getElementById('lf-followup')?.value || '';
  lead.notes       = (document.getElementById('lf-notes')?.value || '').trim();
  lead.agent       = document.getElementById('lf-agent')?.value || '';
  lead.updatedAt   = _nowISO();

  if (isNew) {
    lead.createdAt = _nowISO();
    lead.officeId  = (typeof officeIdForNewRecord === 'function') ? officeIdForNewRecord() : 'o1';
  }

  const btn = document.querySelector('#modal-lead-form .btn-green');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    await _saveLead(lead);

    if (typeof window.logActivity === 'function') {
      logActivity(`Lead "${lead.name}" ${isNew ? 'created' : 'updated'}`, 'lead');
    }

    closeModal('modal-lead-form');
    _renderLeads();
    _renderLeadStats();
    showToast(isNew ? 'Lead added!' : 'Lead updated!', 'success');
  } catch (err) {
    console.error('[Leads] Save error:', err);
    showToast('Save failed — please try again', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Lead'; }
  }
}

// ── MODAL: VIEW LEAD ───────────────────────────────────────────
function viewLead(leadId) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) { showToast('Lead not found', 'error'); return; }

  const stage    = _stageInfo(lead.stage);
  const priority = _priorityInfo(lead.priority);
  const canEdit  = typeof window.canEditLead !== 'function' || window.canEditLead(lead);

  document.getElementById('modal-view-lead-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <!-- Left -->
      <div>
        <div style="margin-bottom:16px">
          <div style="font-size:22px;font-weight:700;margin-bottom:4px">${esc(lead.name)}</div>
          <div style="font-size:13px;color:var(--textd)">${esc(lead.phone)}${lead.email ? ' · ' + esc(lead.email) : ''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
          <span class="lead-stage-badge" style="background:${stage.bg};color:${stage.color}">${esc(stage.label)}</span>
          <span style="font-size:12px;font-weight:700;color:${priority.color}">${esc(priority.label)}</span>
        </div>
        <div class="detail-grid">
          <div class="detail-item"><div class="detail-label">Destination</div><div class="detail-val">${esc(lead.destination || '—')}</div></div>
          <div class="detail-item"><div class="detail-label">Trip Type</div><div class="detail-val">${esc(lead.tripType || '—')}</div></div>
          <div class="detail-item"><div class="detail-label">Travel Date</div><div class="detail-val">${_formatDate(lead.travelDate)}</div></div>
          <div class="detail-item"><div class="detail-label">Pax</div><div class="detail-val">${esc(String(lead.pax || '—'))}</div></div>
          <div class="detail-item"><div class="detail-label">Budget</div><div class="detail-val" style="font-weight:700;color:var(--g600)">${_formatCurrency(lead.budget)}</div></div>
          <div class="detail-item"><div class="detail-label">Source</div><div class="detail-val">${esc(lead.source || '—')}</div></div>
          <div class="detail-item"><div class="detail-label">Agent</div><div class="detail-val">${esc(lead.agent || 'Unassigned')}</div></div>
          <div class="detail-item"><div class="detail-label">Follow-up</div><div class="detail-val" style="color:${_followupDue(lead) ? '#ef4444' : 'inherit'}">${_followupDue(lead) ? '⚠️ ' : ''}${_formatDate(lead.followup)}</div></div>
        </div>
        ${lead.notes ? `<div style="margin-top:12px;padding:10px;background:var(--cream);border-radius:8px;font-size:13px">📝 ${esc(lead.notes)}</div>` : ''}
      </div>
      <!-- Right: Activity & Quick Actions -->
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--textd);margin-bottom:10px">Quick Actions</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${canEdit && !['won','lost'].includes(lead.stage) ? `
            <button class="btn btn-green" onclick="closeModal('modal-view-lead');quickQuote('${esc(lead.id)}')">📄 Create Quotation</button>
          ` : ''}
          ${canEdit ? `
            <button class="btn btn-outline" onclick="closeModal('modal-view-lead');editLead('${esc(lead.id)}')">✏️ Edit Lead</button>
          ` : ''}
          <button class="btn btn-outline" onclick="whatsappLead('${esc(lead.id)}')">📱 WhatsApp</button>
          ${lead.phone ? `<button class="btn btn-outline" onclick="window.open('tel:${esc(lead.phone)}')">📞 Call</button>` : ''}
        </div>
        <div style="margin-top:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--textd);margin-bottom:10px">Stage Progress</div>
        <div style="display:flex;flex-direction:column;gap:4px">
          ${LEAD_STAGES.map(s => `
            <div style="display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:6px;background:${lead.stage === s.id ? s.bg : 'transparent'};cursor:pointer" onclick="quickUpdateStage('${esc(lead.id)}','${esc(s.id)}')">
              <div style="width:8px;height:8px;border-radius:50%;background:${lead.stage === s.id ? s.color : 'var(--border2)'}"></div>
              <span style="font-size:12px;color:${lead.stage === s.id ? s.color : 'var(--textd)'};font-weight:${lead.stage === s.id ? '700' : '400'}">${esc(s.label)}</span>
              ${lead.stage === s.id ? '<span style="margin-left:auto;font-size:11px">✓</span>' : ''}
            </div>
          `).join('')}
        </div>
        <div style="margin-top:12px;font-size:11px;color:var(--textd)">
          Created: ${_formatDate(lead.createdAt)} · Updated: ${_formatDate(lead.updatedAt)}
        </div>
      </div>
    </div>
  `;

  document.getElementById('modal-view-lead')._leadId = leadId;
  openModal('modal-view-lead');
}

// ── QUICK ACTIONS ──────────────────────────────────────────────
async function quickUpdateStage(leadId, newStage) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) return;

  if (typeof window.canEditLead === 'function' && !window.canEditLead(lead)) {
    showToast('Permission denied', 'error'); return;
  }

  lead.stage     = newStage;
  lead.updatedAt = _nowISO();
  await _saveLead(lead);

  // Refresh view modal if open
  const modal = document.getElementById('modal-view-lead');
  if (modal && modal.classList.contains('open')) viewLead(leadId);

  _renderLeads();
  _renderLeadStats();
  showToast(`Stage → ${_stageInfo(newStage).label}`, 'success');
}

function quickQuote(leadId) {
  if (typeof window.createQuotationFromLead === 'function') {
    const quot = window.createQuotationFromLead(leadId);
    if (quot) {
      _renderLeads();
      _renderLeadStats();
      showToast('Quotation created!', 'success');
    }
  } else {
    showToast('Quotation module not loaded', 'error');
  }
}

function whatsappLead(leadId) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead || !lead.phone) { showToast('No phone number', 'error'); return; }
  const phone = lead.phone.replace(/\D/g, '');
  const msg   = encodeURIComponent(
    `Hi ${lead.name}, this is from Wanago Tours & Travel!\n` +
    `We have exciting packages for ${lead.destination || 'your destination'}. ` +
    `Let us help plan your perfect trip! 🌟`
  );
  window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
}

// ── DELETE ─────────────────────────────────────────────────────
function confirmDeleteLead(leadId) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) return;

  if (typeof window.canEditLead === 'function' && !window.canEditLead(lead)) {
    showToast('Permission denied', 'error'); return;
  }

  const confirmed = confirm(`Delete lead "${lead.name}"?\n\nThis cannot be undone.`);
  if (!confirmed) return;

  _deleteLead(leadId).then(() => {
    _renderLeads();
    _renderLeadStats();
    showToast('Lead deleted', 'success');
    if (typeof logActivity === 'function') logActivity(`Lead "${lead.name}" deleted`, 'lead');
  });
}

// ── IMPORT / EXPORT ────────────────────────────────────────────
function exportLeadsCSV() {
  const leads = _filteredLeads();
  if (!leads.length) { showToast('No leads to export', 'error'); return; }

  const headers = ['ID','Name','Phone','Email','Destination','Source','Stage','Priority','Trip Type','Budget','Pax','Travel Date','Follow-up','Agent','Created','Notes'];
  const rows    = leads.map(l => [
    l.id, l.name, l.phone, l.email || '', l.destination || '', l.source || '',
    l.stage, l.priority, l.tripType || '', l.budget || 0, l.pax || '',
    l.travelDate || '', l.followup || '', l.agent || '',
    l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '',
    (l.notes || '').replace(/,/g, ';')
  ]);

  const csv  = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `wanago_leads_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast(`Exported ${leads.length} leads`, 'success');
}

// ── PAGE INITIALISATION ────────────────────────────────────────
function renderLeads() {
  // Build page layout (idempotent — only if container is empty)
  const content = document.getElementById('content');
  if (!content) return;

  const pageEl = content.querySelector('.page.active') || content.querySelector('.page') || content;

  if (!document.getElementById('leads-stats')) {
    pageEl.innerHTML = _buildLeadsHTML();
  }

  // Wire search box
  const searchEl = document.getElementById('leads-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => setLeadsSearch(searchEl.value));
    searchEl.addEventListener('keydown', e => { if (e.key === 'Escape') { searchEl.value = ''; setLeadsSearch(''); } });
  }

  // Wire sort select
  const sortEl = document.getElementById('leads-sort-sel');
  if (sortEl) sortEl.addEventListener('change', () => setLeadsSort(sortEl.value));

  // Initial render
  _renderLeadStats();
  _renderLeads();

  // Subscribe to realtime Firestore updates
  _subscribeLeads();
}

function _buildLeadsHTML() {
  return `
    <!-- Stats Strip -->
    <div class="stats-grid" id="leads-stats" style="margin-bottom:16px"></div>

    <!-- Toolbar -->
    <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:12px 16px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;box-shadow:var(--sh)">
      <!-- Stage Filter Chips -->
      <div class="filter-bar" id="leads-filter-bar" style="margin:0;flex:1;flex-wrap:wrap">
        <div class="chip active" data-stage="all" onclick="setLeadsFilter('all')">All <span id="leads-count" style="font-size:10px;opacity:.7"></span></div>
        ${LEAD_STAGES.map(s => `<div class="chip" data-stage="${esc(s.id)}" onclick="setLeadsFilter('${esc(s.id)}')" style="border-left:3px solid ${s.color}">${esc(s.label)}</div>`).join('')}
      </div>

      <!-- Sort -->
      <select id="leads-sort-sel" style="padding:6px 10px;border:1px solid var(--border);border-radius:8px;font-size:11.5px;background:var(--cream);font-family:inherit;outline:none">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="budget">Budget ↓</option>
        <option value="followup">Follow-up date</option>
        <option value="name">Name A–Z</option>
      </select>

      <!-- Search -->
      <div class="search-wrap">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-inp" id="leads-search" type="text" placeholder="Search leads…" autocomplete="off"/>
      </div>

      <!-- View Toggle -->
      <button id="leads-view-toggle" class="btn btn-outline btn-sm" onclick="toggleLeadsView()">🗂 Kanban</button>

      <!-- Export -->
      <button class="btn btn-outline btn-sm" onclick="exportLeadsCSV()">⬇ CSV</button>

      <!-- Add Lead -->
      <button class="btn btn-green" onclick="openAddLead()">+ Add Lead</button>
    </div>

    <!-- LIST VIEW -->
    <div id="leads-table-wrap" class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name / Contact</th>
            <th>Destination</th>
            <th>Source</th>
            <th>Stage</th>
            <th>Priority</th>
            <th>Budget</th>
            <th>Follow-up</th>
            <th>Agent</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="leads-tbody"></tbody>
      </table>
    </div>

    <!-- KANBAN VIEW (hidden by default) -->
    <div id="leads-kanban-wrap" style="display:none;overflow-x:auto">
      <div id="leads-kanban" style="display:flex;gap:12px;min-width:max-content;padding-bottom:16px"></div>
    </div>

    <!-- ───── MODAL: ADD / EDIT LEAD ───── -->
    <div class="modal-overlay" id="modal-lead-form">
      <div class="modal modal-lg">
        <div class="modal-title" id="lead-form-title">Add Lead</div>
        <input type="hidden" id="lf-id"/>

        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Full Name *</label>
            <input class="form-input" id="lf-name" placeholder="Customer name" autocomplete="off"/>
            <div class="form-error" id="lf-name-error" style="display:none"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Phone *</label>
            <input class="form-input" id="lf-phone" type="tel" placeholder="+91 9447 000000"/>
            <div class="form-error" id="lf-phone-error" style="display:none"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" id="lf-email" type="email" placeholder="Optional"/>
          </div>
          <div class="form-group">
            <label class="form-label">Source</label>
            <select class="form-input" id="lf-source"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Destination</label>
            <input class="form-input" id="lf-destination" placeholder="e.g. Maldives, Kerala"/>
          </div>
          <div class="form-group">
            <label class="form-label">Trip Type</label>
            <select class="form-input" id="lf-triptype"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Budget (₹)</label>
            <input class="form-input" id="lf-budget" type="number" min="0" placeholder="0"/>
          </div>
          <div class="form-group">
            <label class="form-label">Pax</label>
            <input class="form-input" id="lf-pax" type="number" min="1" value="2"/>
          </div>
          <div class="form-group">
            <label class="form-label">Travel Date</label>
            <input class="form-input" id="lf-traveldate" type="date"/>
          </div>
          <div class="form-group">
            <label class="form-label">Follow-up Date</label>
            <input class="form-input" id="lf-followup" type="date"/>
          </div>
          <div class="form-group">
            <label class="form-label">Stage</label>
            <select class="form-input" id="lf-stage"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-input" id="lf-priority"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Assign To</label>
            <select class="form-input" id="lf-agent"></select>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Notes</label>
            <textarea class="form-input" id="lf-notes" rows="3" placeholder="Optional notes about this lead…" style="resize:vertical"></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('modal-lead-form')">Cancel</button>
          <button class="btn btn-green" onclick="saveLeadForm()">Save Lead</button>
        </div>
      </div>
    </div>

    <!-- ───── MODAL: VIEW LEAD ───── -->
    <div class="modal-overlay" id="modal-view-lead">
      <div class="modal modal-lg">
        <div class="modal-title">Lead Details</div>
        <div id="modal-view-lead-body"></div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeModal('modal-view-lead')">Close</button>
        </div>
      </div>
    </div>

    <style>
      .lead-stage-badge {
        display: inline-block;
        padding: 2px 10px;
        border-radius: 20px;
        font-size: 11.5px;
        font-weight: 600;
        white-space: nowrap;
      }
      .row-overdue { background: #fff8f8 !important; }
      .row-overdue:hover { background: #fff0f0 !important; }

      .kanban-col {
        min-width: 220px;
        max-width: 240px;
        background: var(--cream);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .kanban-col-header {
        padding: 10px 12px;
        display: flex;
        align-items: center;
        gap: 6px;
        background: var(--white);
        border-radius: var(--radius) var(--radius) 0 0;
        border-bottom: 1px solid var(--border);
      }
      .kanban-count {
        font-size: 11px;
        background: var(--border);
        color: var(--textd);
        border-radius: 20px;
        padding: 1px 7px;
        font-weight: 700;
      }
      .kanban-cards {
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        flex: 1;
        min-height: 60px;
      }
      .kanban-card {
        background: var(--white);
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 10px;
        cursor: grab;
        transition: box-shadow .15s, transform .15s;
      }
      .kanban-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); transform: translateY(-1px); }
      .kanban-card:active { cursor: grabbing; }
      .kanban-card-name { font-weight: 700; font-size: 13px; margin-bottom: 2px; }
      .kanban-card-sub  { font-size: 11px; color: var(--textd); }

      .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .detail-item { padding: 8px; background: var(--cream); border-radius: 6px; }
      .detail-label { font-size: 10px; text-transform: uppercase; letter-spacing: .8px; color: var(--textd); font-weight: 700; margin-bottom: 2px; }
      .detail-val   { font-size: 13px; color: var(--text); font-weight: 500; }

      .form-error { color: var(--red, #ef4444); font-size: 11.5px; margin-top: 3px; }
    </style>
  `;
}

// ── CLEANUP ────────────────────────────────────────────────────
function cleanupLeads() {
  if (_leadsUnsubscribe) { _leadsUnsubscribe(); _leadsUnsubscribe = null; }
}

// ── GLOBAL EXPORTS ─────────────────────────────────────────────
window.renderLeads          = renderLeads;
window.openAddLead          = openAddLead;
window.editLead             = editLead;
window.viewLead             = viewLead;
window.saveLeadForm         = saveLeadForm;
window.confirmDeleteLead    = confirmDeleteLead;
window.quickUpdateStage     = quickUpdateStage;
window.quickQuote           = quickQuote;
window.whatsappLead         = whatsappLead;
window.setLeadsFilter       = setLeadsFilter;
window.setLeadsPriority     = setLeadsPriority;
window.setLeadsSort         = setLeadsSort;
window.setLeadsSearch       = setLeadsSearch;
window.toggleLeadsView      = toggleLeadsView;
window.exportLeadsCSV       = exportLeadsCSV;
window.handleKanbanDragStart = handleKanbanDragStart;
window.handleKanbanDrop     = handleKanbanDrop;
window.cleanupLeads         = cleanupLeads;
