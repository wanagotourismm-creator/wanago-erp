// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Support Tickets
//  Track customer complaints, queries, refund requests
// ═══════════════════════════════════════════════════════════════

function initPage(renderFn) {
  var session = sessionStorage.getItem('wanago_session');
  if (!session) { window.location.href = '../index.html'; return; }
  try {
    var s = JSON.parse(session);
    var name = (window.currentUser && window.currentUser.name) || s.name || 'User';
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
    try { if (renderFn) renderFn(); } catch(e) { console.error('Page render error:', e); }
    fadeLoader();
  }, 20);
}
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
function goTo(page) { window.location.href = page + '.html'; }
window.handleLogout = handleLogout;
window.goTo = goTo;

// ── State ──
let ticketFilter = 'open';

const TKT_TYPES = {
  complaint:      { label: 'Complaint',      emoji: '😠', color: 'var(--red)' },
  query:          { label: 'Query',          emoji: '❓', color: 'var(--blue)' },
  refund_request: { label: 'Refund Request', emoji: '💸', color: '#7c3aed' },
  change_request: { label: 'Change Request', emoji: '✏️', color: 'var(--amb)' },
  feedback:       { label: 'Feedback',       emoji: '⭐', color: 'var(--g600)' },
};

const TKT_PRIORITY = {
  low:    { label: 'Low',    color: 'var(--textd)', bg: 'var(--cream)' },
  medium: { label: 'Medium', color: 'var(--amb)',   bg: '#fff8f0' },
  high:   { label: 'High',   color: '#ea580c',      bg: '#fff7ed' },
  urgent: { label: 'Urgent', color: 'var(--red)',   bg: '#fee2e2' },
};

const TKT_STATUS = {
  open:        { label: 'Open',        color: 'var(--red)',   bg: '#fee2e2' },
  in_progress: { label: 'In Progress', color: 'var(--amb)',   bg: '#fff8f0' },
  resolved:    { label: 'Resolved',    color: 'var(--g700)',  bg: 'var(--g50)' },
  closed:      { label: 'Closed',      color: 'var(--textd)', bg: 'var(--border)' },
};

// ── Stats ──
function renderSupportStats() {
  const all = hScoped('tickets');
  const todayStr = today();
  const open = all.filter(t => t.status === 'open' || t.status === 'in_progress').length;
  const urgent = all.filter(t => (t.priority === 'high' || t.priority === 'urgent') && t.status !== 'resolved' && t.status !== 'closed').length;
  const resolvedToday = all.filter(t => t.status === 'resolved' && (t.resolvedAt||'').startsWith(todayStr)).length;
  const resolved = all.filter(t => t.resolvedAt && t.createdAt);
  const avgHours = resolved.length ? Math.round(resolved.reduce((s,t) => s + (new Date(t.resolvedAt) - new Date(t.createdAt)) / 3600000, 0) / resolved.length) : 0;
  const el = document.getElementById('tkt-stats'); if (!el) return;
  el.innerHTML = [
    { label: '🎫 Open Tickets',    val: open,                                              meta: all.filter(t=>t.status==='in_progress').length + ' in progress',  cls: open > 5 ? 'stat-dn' : '' },
    { label: '🚨 High Priority',   val: urgent,                                            meta: 'high + urgent',                                                  cls: urgent > 0 ? 'stat-dn' : '' },
    { label: '✅ Resolved Today',  val: resolvedToday,                                     meta: 'tickets closed today',                                           cls: resolvedToday > 0 ? 'stat-up' : '' },
    { label: '⏱ Avg Resolution',  val: avgHours ? avgHours + 'h' : '—',                  meta: resolved.length + ' tickets resolved',                            cls: '' },
  ].map(s => '<div class="stat-card"><div class="stat-label">' + s.label + '</div><div class="stat-val ' + s.cls + '">' + s.val + '</div><div class="stat-meta">' + s.meta + '</div></div>').join('');
}

// ── AI Strip ──
function renderSupportAIStrip() {
  const el = document.getElementById('tkt-ai-strip'); if (!el) return;
  const all = hScoped('tickets');
  if (!all.length) { el.innerHTML = ''; return; }
  const now = new Date();
  const overdue = all.filter(t => {
    if (t.status === 'resolved' || t.status === 'closed') return false;
    return (now - new Date(t.createdAt)) / 86400000 > 3;
  });
  const urgentOpen = all.filter(t => t.priority === 'urgent' && t.status !== 'resolved' && t.status !== 'closed');
  const cards = [];
  if (overdue.length) {
    cards.push('<div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px">' +
      '<span style="font-size:20px">⏰</span>' +
      '<div><div style="font-size:12.5px;font-weight:700;color:var(--red)">' + overdue.length + ' Overdue Ticket' + (overdue.length>1?'s':'') + '</div>' +
      '<div style="font-size:11px;color:var(--textd)">Open for more than 3 days — needs attention</div></div></div>');
  }
  if (urgentOpen.length) {
    cards.push('<div style="background:#fff8f0;border:1px solid var(--amb2,#fde8c8);border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:10px">' +
      '<span style="font-size:20px">🚨</span>' +
      '<div><div style="font-size:12.5px;font-weight:700;color:var(--amb)">' + urgentOpen.length + ' Urgent Ticket' + (urgentOpen.length>1?'s':'') + '</div>' +
      '<div style="font-size:11px;color:var(--textd)">Requires immediate response</div></div></div>');
  }
  el.innerHTML = cards.length ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;margin-bottom:4px">' + cards.join('') + '</div>' : '';
}

// ── Main Render ──
function renderSupport(filter) {
  if (filter !== undefined) ticketFilter = filter;
  renderSupportStats();
  renderSupportAIStrip();
  let tickets = hScoped('tickets');
  if (ticketFilter === 'open')        tickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  else if (ticketFilter !== 'all')    tickets = tickets.filter(t => t.status === ticketFilter);

  const q = (document.getElementById('tkt-search')?.value||'').toLowerCase();
  if (q) tickets = tickets.filter(t => (t.ticketId||'').toLowerCase().includes(q) || (t.customerName||'').toLowerCase().includes(q) || (t.subject||'').toLowerCase().includes(q) || (t.bookingRef||'').toLowerCase().includes(q));

  const typeF = document.getElementById('tkt-type-filter')?.value;
  if (typeF) tickets = tickets.filter(t => t.type === typeF);

  // Populate agent filter
  const assF = document.getElementById('tkt-assign-filter');
  if (assF) {
    const cur = assF.value;
    const agents = [...new Set(hScoped('tickets').map(t=>t.assignedTo).filter(Boolean))];
    assF.innerHTML = '<option value="">All Assignees</option>' + agents.map(a=>'<option value="'+a+'" '+(cur===a?'selected':'')+'>'+a+'</option>').join('');
    if (cur) tickets = tickets.filter(t => t.assignedTo === cur);
  }

  tickets = [...tickets].sort((a,b) => {
    const p = { urgent:0, high:1, medium:2, low:3 };
    return (p[a.priority]||2) - (p[b.priority]||2) || (b.createdAt||'').localeCompare(a.createdAt||'');
  });

  const tbody = document.getElementById('tkt-tbody'); if (!tbody) return;
  if (!tickets.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:var(--textd)"><div style="font-size:28px;margin-bottom:8px">🎫</div><div style="font-weight:600;color:var(--text)">No tickets found</div><div style="font-size:12px;margin-top:4px">Click "+ New Ticket" to log a customer issue</div></td></tr>';
    return;
  }
  tbody.innerHTML = tickets.map(t => {
    const tp = TKT_TYPES[t.type] || { label: t.type||'—', emoji: '❓', color: 'var(--textd)' };
    const pr = TKT_PRIORITY[t.priority] || { label: '—', color: 'var(--textd)', bg: 'var(--cream)' };
    const st = TKT_STATUS[t.status] || { label: '—', color: 'var(--textd)', bg: 'var(--cream)' };
    const age = t.createdAt ? Math.floor((new Date() - new Date(t.createdAt)) / 86400000) : 0;
    const ageStr = age === 0 ? 'Today' : age === 1 ? 'Yesterday' : age + 'd ago';
    return '<tr>' +
      '<td><span style="font-family:JetBrains Mono,monospace;font-size:11.5px;font-weight:600;color:var(--g700)">' + (t.ticketId||'—') + '</span></td>' +
      '<td><div style="font-weight:600">' + (t.customerName||'—') + '</div><div style="font-size:10.5px;color:var(--textd)">' + (t.customerPhone||'') + '</div></td>' +
      '<td style="max-width:180px"><div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (t.subject||'—') + '</div>' +
        (t.bookingRef ? '<div style="font-size:10px;color:var(--g700);font-family:monospace">' + t.bookingRef + '</div>' : '') + '</td>' +
      '<td><span style="font-size:11.5px;color:' + tp.color + '">' + tp.emoji + ' ' + tp.label + '</span></td>' +
      '<td><span style="background:' + pr.bg + ';color:' + pr.color + ';padding:2px 8px;border-radius:8px;font-size:10.5px;font-weight:700">' + pr.label + '</span></td>' +
      '<td style="font-size:12px">' + (t.assignedTo || '<span style="color:var(--textd)">—</span>') + '</td>' +
      '<td><span style="background:' + st.bg + ';color:' + st.color + ';padding:2px 10px;border-radius:8px;font-size:10.5px;font-weight:600">' + st.label + '</span></td>' +
      '<td style="font-size:11px;color:var(--textd);white-space:nowrap">' + ageStr + '</td>' +
      '<td style="white-space:nowrap">' +
        '<button class="row-btn" onclick="viewTicket(\'' + t.id + '\')">View</button>' +
        '<button class="row-btn" style="margin-left:3px" onclick="editTicket(\'' + t.id + '\')">Edit</button>' +
        (t.status !== 'resolved' && t.status !== 'closed' ?
          '<button class="row-btn" style="margin-left:3px;color:var(--g700);font-weight:600" onclick="updateTicketStatus(\'' + t.id + '\',\'resolved\')">✓ Resolve</button>' : '') +
      '</td></tr>';
  }).join('');
}

function filterTickets(f, el) {
  document.querySelectorAll('.page .chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  renderSupport(f);
}

// ── Add / Edit ──
function openNewTicketModal() {
  document.getElementById('tkt-edit-id').value = '';
  document.getElementById('tkt-modal-title').textContent = 'New Support Ticket';
  document.getElementById('tkt-customer').value = '';
  document.getElementById('tkt-phone').value = '';
  document.getElementById('tkt-bkref').value = '';
  document.getElementById('tkt-type').value = 'query';
  document.getElementById('tkt-priority').value = 'medium';
  document.getElementById('tkt-subject').value = '';
  document.getElementById('tkt-description').value = '';
  document.getElementById('tkt-assigned').value = '';
  document.getElementById('tkt-status').value = 'open';
  document.getElementById('tkt-error').style.display = 'none';
  openModal('modal-add-ticket');
}

function editTicket(id) {
  const t = (DB.tickets||[]).find(x => x.id === id); if (!t) return;
  document.getElementById('tkt-edit-id').value = id;
  document.getElementById('tkt-modal-title').textContent = 'Edit Ticket';
  document.getElementById('tkt-customer').value = t.customerName || '';
  document.getElementById('tkt-phone').value = t.customerPhone || '';
  document.getElementById('tkt-bkref').value = t.bookingRef || '';
  document.getElementById('tkt-type').value = t.type || 'query';
  document.getElementById('tkt-priority').value = t.priority || 'medium';
  document.getElementById('tkt-subject').value = t.subject || '';
  document.getElementById('tkt-description').value = t.description || '';
  document.getElementById('tkt-assigned').value = t.assignedTo || '';
  document.getElementById('tkt-status').value = t.status || 'open';
  document.getElementById('tkt-error').style.display = 'none';
  openModal('modal-add-ticket');
}

function saveTicket() {
  const customerName = document.getElementById('tkt-customer').value.trim();
  const subject = document.getElementById('tkt-subject').value.trim();
  const type = document.getElementById('tkt-type').value;
  const errEl = document.getElementById('tkt-error');
  if (!customerName || !subject || !type) {
    errEl.textContent = 'Customer name, subject and type are required.';
    errEl.style.display = 'block'; return;
  }
  errEl.style.display = 'none';
  const newStatus = document.getElementById('tkt-status').value;
  const data = {
    customerName,
    customerPhone:  document.getElementById('tkt-phone').value.trim(),
    bookingRef:     document.getElementById('tkt-bkref').value.trim(),
    type,
    priority:       document.getElementById('tkt-priority').value,
    subject,
    description:    document.getElementById('tkt-description').value.trim(),
    assignedTo:     document.getElementById('tkt-assigned').value.trim(),
    status:         newStatus,
  };
  const editId = document.getElementById('tkt-edit-id').value;
  if (!Array.isArray(DB.tickets)) DB.tickets = [];
  if (editId) {
    const idx = DB.tickets.findIndex(x => x.id === editId);
    if (idx > -1) {
      if (newStatus === 'resolved' && DB.tickets[idx].status !== 'resolved') data.resolvedAt = new Date().toISOString();
      Object.assign(DB.tickets[idx], data);
    }
    showToast('Ticket updated!');
  } else {
    if (!DB.counters) DB.counters = {};
    const num = (DB.counters.tickets = (DB.counters.tickets || 0) + 1);
    const ticketId = 'TKT-' + String(num).padStart(4, '0');
    DB.tickets.unshift({
      id: uid(), ticketId, ...data,
      timeline: [],
      officeId: officeIdForNewRecord(), createdBy: createdByStamp(), createdAt: new Date().toISOString(),
    });
    showToast('Ticket ' + ticketId + ' created!');
    logActivity('Support ticket: ' + subject + ' from ' + customerName, 'lead');
  }
  saveDB();
  closeModal('modal-add-ticket');
  renderSupport();
}

function updateTicketStatus(id, status) {
  const t = (DB.tickets||[]).find(x => x.id === id); if (!t) return;
  t.status = status;
  if (status === 'resolved' && !t.resolvedAt) t.resolvedAt = new Date().toISOString();
  saveDB(); renderSupport(); showToast('Ticket marked ' + TKT_STATUS[status]?.label || status);
}

// ── View Ticket ──
function viewTicket(id) {
  const t = (DB.tickets||[]).find(x => x.id === id); if (!t) return;
  const tp = TKT_TYPES[t.type] || { label: t.type||'—', emoji: '❓', color: 'var(--textd)' };
  const pr = TKT_PRIORITY[t.priority] || { label: '—', color: 'var(--textd)', bg: 'var(--cream)' };
  const st = TKT_STATUS[t.status] || { label: '—', color: 'var(--textd)', bg: 'var(--cream)' };
  document.getElementById('vt-title').textContent = (t.ticketId||'Ticket') + ' — ' + t.customerName;
  document.getElementById('vt-body').innerHTML =
    '<div style="background:linear-gradient(135deg,var(--g800),var(--g600));border-radius:12px;padding:16px 18px;color:#fff;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center">' +
      '<div><div style="font-size:17px;font-weight:800;font-family:DM Serif Display,serif">' + t.customerName + '</div>' +
        '<div style="font-size:11.5px;color:rgba(255,255,255,.6);margin-top:3px">' + (t.customerPhone||'') + (t.bookingRef?' · Booking: '+t.bookingRef:'') + '</div></div>' +
      '<div style="text-align:right"><div style="font-family:monospace;font-size:11px;opacity:.7">' + (t.ticketId||'') + '</div>' +
        '<div style="margin-top:5px"><span style="background:' + st.bg + ';color:' + st.color + ';padding:2px 10px;border-radius:8px;font-size:11px;font-weight:600">' + st.label + '</span></div></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">' +
      '<div style="background:var(--cream);padding:10px 12px;border-radius:8px"><div style="font-size:10px;color:var(--textd);font-weight:700;text-transform:uppercase;margin-bottom:5px">Type</div><div style="font-size:12.5px;font-weight:600;color:' + tp.color + '">' + tp.emoji + ' ' + tp.label + '</div></div>' +
      '<div style="background:' + pr.bg + ';padding:10px 12px;border-radius:8px"><div style="font-size:10px;color:var(--textd);font-weight:700;text-transform:uppercase;margin-bottom:5px">Priority</div><div style="font-size:12.5px;font-weight:700;color:' + pr.color + '">' + pr.label + '</div></div>' +
      '<div style="background:var(--cream);padding:10px 12px;border-radius:8px"><div style="font-size:10px;color:var(--textd);font-weight:700;text-transform:uppercase;margin-bottom:5px">Assigned To</div><div style="font-size:12.5px;font-weight:600">' + (t.assignedTo||'Unassigned') + '</div></div>' +
    '</div>' +
    '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--textd);margin-bottom:5px">Subject</div>' +
    '<div style="font-size:14px;font-weight:700;margin-bottom:12px">' + (t.subject||'—') + '</div>' +
    (t.description ?
      '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--textd);margin-bottom:5px">Description</div>' +
      '<div style="font-size:12.5px;margin-bottom:14px;background:var(--cream);padding:10px 12px;border-radius:8px;line-height:1.6">' + t.description.replace(/\n/g,'<br>') + '</div>' : '') +
    '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--textd);margin-bottom:8px">Update Status</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
      Object.entries(TKT_STATUS).map(([key, s]) =>
        '<button onclick="updateTicketStatus(\'' + t.id + '\',\'' + key + '\')" style="padding:5px 12px;border-radius:8px;font-size:11.5px;font-weight:600;border:1.5px solid ' + s.color + ';background:' + (t.status===key ? s.bg : '#fff') + ';color:' + s.color + ';cursor:pointer">' + s.label + '</button>'
      ).join('') +
    '</div>' +
    '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--textd);margin-bottom:8px">Add Note</div>' +
    '<div style="display:flex;gap:8px;margin-bottom:16px">' +
      '<input class="form-input" style="flex:1" id="vt-note-inp" placeholder="Add a note or update…">' +
      '<button class="btn btn-sm btn-primary" onclick="addTicketNote(\'' + t.id + '\')">Add</button>' +
    '</div>' +
    (t.timeline && t.timeline.length ?
      '<div style="font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--textd);margin-bottom:8px">Timeline</div>' +
      '<div style="border-left:2px solid var(--border);padding-left:14px">' +
        [...t.timeline].reverse().map(n =>
          '<div style="margin-bottom:10px;position:relative">' +
          '<div style="width:8px;height:8px;background:var(--g400);border-radius:50%;position:absolute;left:-19px;top:5px"></div>' +
          '<div style="font-size:12.5px;line-height:1.5">' + n.text + '</div>' +
          '<div style="font-size:10.5px;color:var(--textd);margin-top:2px">' + (n.by||'') + (n.at?' · '+formatDate(n.at.slice(0,10)):'') + '</div></div>'
        ).join('') +
      '</div>'
    : '') +
    '<div style="font-size:11px;color:var(--textd);margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">Created: ' + (t.createdAt?formatDate(t.createdAt.slice(0,10)):'') + (t.createdBy?' by '+t.createdBy:'') + '</div>';
  openModal('modal-view-ticket');
}

function addTicketNote(id) {
  const t = (DB.tickets||[]).find(x => x.id === id); if (!t) return;
  const inp = document.getElementById('vt-note-inp');
  const text = inp?.value.trim(); if (!text) return;
  if (!t.timeline) t.timeline = [];
  t.timeline.push({ text, by: createdByStamp(), at: new Date().toISOString() });
  inp.value = '';
  saveDB();
  viewTicket(id);
  showToast('Note added');
}

// ── Expose ──
window.renderSupport = renderSupport;
window.filterTickets = filterTickets;
window.openNewTicketModal = openNewTicketModal;
window.editTicket = editTicket;
window.saveTicket = saveTicket;
window.viewTicket = viewTicket;
window.updateTicketStatus = updateTicketStatus;
window.addTicketNote = addTicketNote;

initPage(renderSupport);
