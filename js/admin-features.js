// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Admin Features: Activity Log, RBAC, Attendance,
//  Notifications — Full Firebase Integration
// ═══════════════════════════════════════════════════════════════

const FB_BASE = 'https://www.gstatic.com/firebasejs/10.12.0';
const FB_CFG = { apiKey:"AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU", authDomain:"wanago-erp.firebaseapp.com", projectId:"wanago-erp", storageBucket:"wanago-erp.firebasestorage.app", messagingSenderId:"445920648182", appId:"1:445920648182:web:2ef6f9110767bc9f36c5d7" };

let _af_db = null;
async function _getDb() {
  if (_af_db) return _af_db;
  try {
    const [{ initializeApp, getApps }, { getFirestore }] = await Promise.all([
      import(FB_BASE + '/firebase-app.js'),
      import(FB_BASE + '/firebase-firestore.js')
    ]);
    const apps = getApps();
    const app = apps.length ? apps[0] : initializeApp(FB_CFG);
    _af_db = getFirestore(app);
    return _af_db;
  } catch(e) { console.warn('[admin-features] Firebase init failed:', e.message); return null; }
}

// ═══════════════════════════════════════════════════════════════
//  1. ACTIVITY LOG & AUDIT TRAIL
// ═══════════════════════════════════════════════════════════════

window.logActivity = async function(action, details, category) {
  try {
    const db = await _getDb(); if (!db) return;
    const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
    const { collection, addDoc, serverTimestamp } = await import(FB_BASE + '/firebase-firestore.js');
    await addDoc(collection(db, 'companies/wanago-erp/activity_log'), {
      action: action || 'unknown',
      details: details || '',
      category: category || 'general',
      userId: sess.uid || 'unknown',
      userName: sess.name || 'Unknown',
      userEmail: sess.email || '',
      userRole: sess.role || '',
      timestamp: serverTimestamp(),
      page: window.location.pathname.split('/').pop(),
      ip: 'client'
    });
  } catch(e) { console.warn('[activity log] Failed:', e.message); }
};

window.renderActivityLog = async function() {
  const container = document.getElementById('activity-list');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--textd)">Loading activity...</div>';
  try {
    const db = await _getDb();
    if (!db) { container.innerHTML = '<div style="padding:20px;color:var(--textd)">Firebase not connected</div>'; return; }
    const { collection, getDocs, query, orderBy, limit } = await import(FB_BASE + '/firebase-firestore.js');
    const q = query(collection(db, 'companies/wanago-erp/activity_log'), orderBy('timestamp', 'desc'), limit(100));
    const snap = await getDocs(q);
    const logs = [];
    snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
    if (!logs.length) {
      container.innerHTML = '<div style="text-align:center;padding:60px;color:var(--textd)"><div style="font-size:14px;font-weight:600">No activity yet</div><div style="font-size:12px;margin-top:4px">Activity will appear here as your team uses the system</div></div>';
      return;
    }
    const catColor = { login:'#2196f3', lead:'#4caf50', booking:'#ff9800', payment:'#9c27b0', team:'#f44336', settings:'#607d8b', general:'#795548' };
    const catIcon  = { login:'In', lead:'Ld', booking:'Bk', payment:'Pay', team:'Tm', settings:'Cfg', general:'Log' };
    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div style="font-size:15px;font-weight:800">Activity Log <span style="font-size:12px;font-weight:400;color:var(--textd)">(Last 100 entries)</span></div>
        <div style="display:flex;gap:6px" id="activity-filters">
          <button class="chip active" onclick="filterActivity('all',this)">All</button>
          <button class="chip" onclick="filterActivity('login',this)">Login</button>
          <button class="chip" onclick="filterActivity('lead',this)">Leads</button>
          <button class="chip" onclick="filterActivity('booking',this)">Bookings</button>
          <button class="chip" onclick="filterActivity('payment',this)">Payments</button>
          <button class="chip" onclick="filterActivity('team',this)">Team</button>
        </div>
      </div>
      <div id="activity-log-entries">
        ${logs.map(l => {
          const ts = l.timestamp?.toDate ? l.timestamp.toDate() : new Date();
          const timeStr = ts.toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
          const cat = l.category || 'general';
          const color = catColor[cat] || '#607d8b';
          const icon  = catIcon[cat]  || 'Log';
          return `<div class="activity-entry" data-cat="${cat}" style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background='var(--cream)'" onmouseout="this.style.background=''">
            <div style="width:32px;height:32px;border-radius:8px;background:${color}15;border:1px solid ${color}30;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;margin-top:1px">${icon}</div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--text)">${l.action || 'Action'}</div>
              <div style="font-size:12px;color:var(--textd);margin-top:2px">${l.details || ''}</div>
              <div style="display:flex;align-items:center;gap:10px;margin-top:5px">
                <span style="font-size:11px;color:var(--textd)">${l.userName || 'Unknown'}</span>
                <span style="font-size:11px;color:var(--textd)">${timeStr}</span>
                <span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:700;background:${color}15;color:${color};border:1px solid ${color}30">${cat}</span>
              </div>
            </div>
          </div>`;
        }).join('')}
      </div>`;
  } catch(e) {
    container.innerHTML = `<div style="padding:20px;color:var(--red)">Error loading activity: ${e.message}</div>`;
  }
};

window.filterActivity = function(cat, btn) {
  document.querySelectorAll('#activity-filters .chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.querySelectorAll('.activity-entry').forEach(e => {
    e.style.display = (cat === 'all' || e.dataset.cat === cat) ? '' : 'none';
  });
};

// ═══════════════════════════════════════════════════════════════
//  2. ROLE-BASED ACCESS CONTROL (RBAC)
// ═══════════════════════════════════════════════════════════════

const ROLE_PERMISSIONS = {
  founder:             { pages: ['*'], features: ['*'] },
  ceo:                 { pages: ['*'], features: ['*'] },
  co_founder:          { pages: ['*'], features: ['*'] },
  admin:               { pages: ['*'], features: ['*'] },
  branch_manager:      { pages: ['dashboard','leads','customers','bookings','quotations','invoices','payments','reports','hrms','packages','marketing','whatsapp','expenses'], features: ['add_lead','edit_lead','delete_lead','add_booking','edit_booking','view_financials','export_data','manage_team'] },
  sales_manager:       { pages: ['dashboard','leads','customers','bookings','quotations','invoices','payments','reports','packages','marketing','whatsapp'], features: ['add_lead','edit_lead','add_booking','edit_booking','view_financials','export_data'] },
  operations_manager:  { pages: ['dashboard','leads','customers','bookings','packages','expenses','reports'], features: ['add_booking','edit_booking','view_financials'] },
  finance_manager:     { pages: ['dashboard','invoices','payments','expenses','reports'], features: ['view_financials','export_data','edit_payment'] },
  marketing_manager:   { pages: ['dashboard','leads','customers','marketing','whatsapp','reports'], features: ['add_lead','edit_lead'] },
  team_lead:           { pages: ['dashboard','leads','customers','bookings','quotations'], features: ['add_lead','edit_lead','add_booking'] },
  senior_manager:      { pages: ['dashboard','leads','customers','bookings','quotations','invoices','payments','reports'], features: ['add_lead','edit_lead','add_booking','view_financials'] },
  sales_agent:         { pages: ['dashboard','leads','customers','quotations'], features: ['add_lead','edit_lead_assigned'] },
  agent:               { pages: ['dashboard','leads','customers','quotations'], features: ['add_lead','edit_lead_assigned'] },
};

window.getRolePermissions = function(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS['agent'];
};

window.renderRBACTab = function() {
  const container = document.getElementById('adm-tab-rbac');
  if (!container) return;
  const team = DB.settings?.team || [];
  const roleGroups = {};
  team.forEach(m => {
    const r = m.role || 'agent';
    if (!roleGroups[r]) roleGroups[r] = [];
    roleGroups[r].push(m);
  });
  const ROLE_LABELS = {
    founder:'Founder', ceo:'CEO', co_founder:'Co-Founder', admin:'Admin',
    branch_manager:'Branch Manager', sales_manager:'Sales Manager',
    operations_manager:'Operations Manager', finance_manager:'Finance Manager',
    marketing_manager:'Marketing Manager', team_lead:'Team Lead',
    senior_manager:'Senior Manager', sales_agent:'Sales Agent', agent:'Agent'
  };
  container.innerHTML = `
    <div style="margin-bottom:20px">
      <div style="font-size:15px;font-weight:800;margin-bottom:4px">Role-Based Access Control</div>
      <div style="font-size:12px;color:var(--textd)">Each role has predefined access. Assign roles to team members in the Team tab.</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px">
      ${Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => {
        const members = roleGroups[role] || [];
        const isFullAccess = perms.pages.includes('*');
        return `<div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer" onclick="showRoleDetail('${role}')">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:13px;font-weight:700">${ROLE_LABELS[role] || role}</div>
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;background:${isFullAccess?'var(--g50)':'#e3f2fd'};color:${isFullAccess?'var(--g700)':'#1565c0'}">${isFullAccess?'Full Access':'Limited'}</span>
          </div>
          <div style="font-size:11.5px;color:var(--textd);margin-bottom:8px">${isFullAccess ? 'All pages & features' : `${perms.pages.length} pages · ${perms.features.length} features`}</div>
          <div style="font-size:11px;color:var(--textm)">${members.length} member${members.length!==1?'s':''} assigned</div>
          ${members.slice(0,3).map(m=>`<div style="display:inline-flex;align-items:center;gap:4px;margin-top:6px;margin-right:4px;padding:2px 8px;background:var(--cream);border:1px solid var(--border);border-radius:10px;font-size:11px">${m.name}</div>`).join('')}
        </div>`;
      }).join('')}
    </div>
    <div id="rbac-role-detail" style="display:none;background:#fff;border:1px solid var(--border);border-radius:14px;padding:20px"></div>`;
};

window.showRoleDetail = function(role) {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return;
  const el = document.getElementById('rbac-role-detail');
  if (!el) return;
  el.style.display = '';
  const isFullAccess = perms.pages.includes('*');
  el.innerHTML = `
    <div style="font-size:14px;font-weight:800;margin-bottom:14px">${role} — Permission Details</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--textd);margin-bottom:8px">Pages Access</div>
        ${isFullAccess ? '<div style="padding:8px 12px;background:var(--g50);border:1px solid var(--g200);border-radius:8px;font-size:12px;color:var(--g700);font-weight:600">All Pages</div>' :
          perms.pages.map(p => `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px">${p}</div>`).join('')}
      </div>
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--textd);margin-bottom:8px">Feature Access</div>
        ${isFullAccess ? '<div style="padding:8px 12px;background:var(--g50);border:1px solid var(--g200);border-radius:8px;font-size:12px;color:var(--g700);font-weight:600">All Features</div>' :
          perms.features.map(f => `<div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px">${f.replace(/_/g,' ')}</div>`).join('')}
      </div>
    </div>`;
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// ═══════════════════════════════════════════════════════════════
//  3. EMPLOYEE ATTENDANCE & LEAVE
// ═══════════════════════════════════════════════════════════════

window.renderAttendanceTab = async function() {
  const container = document.getElementById('adm-tab-attendance');
  if (!container) return;
  const today = new Date().toISOString().split('T')[0];
  const team = DB.settings?.team || [];
  let attendanceData = {};
  try {
    const db = await _getDb();
    if (db) {
      const { collection, getDocs, query, where } = await import(FB_BASE + '/firebase-firestore.js');
      const q = query(collection(db, 'companies/wanago-erp/attendance'), where('date', '==', today));
      const snap = await getDocs(q);
      snap.forEach(d => { const data = d.data(); attendanceData[data.memberId] = data; });
    }
  } catch(e) { console.warn('[attendance] Load failed:', e.message); }

  const presentCount  = Object.values(attendanceData).filter(a => a.status === 'present').length;
  const absentCount   = Object.values(attendanceData).filter(a => a.status === 'absent').length;
  const leaveCount    = Object.values(attendanceData).filter(a => a.status === 'leave').length;
  const unmarkedCount = team.length - Object.keys(attendanceData).length;

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <div>
        <div style="font-size:15px;font-weight:800">Attendance & Leave</div>
        <div style="font-size:12px;color:var(--textd);margin-top:2px">Today — ${new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-outline" onclick="exportAttendance()">Export</button>
        <button class="btn btn-sm btn-primary" onclick="openLeaveModal()">+ Add Leave</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
      ${[['Present',presentCount,'var(--g500)'],['Absent',absentCount,'var(--red)'],['On Leave',leaveCount,'var(--amb)'],['Unmarked',unmarkedCount,'var(--textd)']].map(([l,v,c])=>`
        <div style="background:#fff;border:1px solid var(--border);border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:22px;font-weight:800;color:${c}">${v}</div>
          <div style="font-size:12px;color:var(--textd);margin-top:4px">${l}</div>
        </div>`).join('')}
    </div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden;margin-bottom:20px">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);font-size:13px;font-weight:700">Today's Attendance</div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:var(--cream)">
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--textd);text-transform:uppercase;letter-spacing:.5px">Member</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--textd);text-transform:uppercase;letter-spacing:.5px">Dept</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--textd);text-transform:uppercase;letter-spacing:.5px">Check In</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--textd);text-transform:uppercase;letter-spacing:.5px">Status</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:var(--textd);text-transform:uppercase;letter-spacing:.5px">Mark</th>
        </tr></thead>
        <tbody>
          ${team.map(m => {
            const att = attendanceData[m.id] || {};
            const status = att.status || 'unmarked';
            const statusColors = { present:'var(--g500)', absent:'var(--red)', leave:'var(--amb)', unmarked:'var(--textd)', 'half-day':'#ff9800' };
            const statusLabels = { present:'Present', absent:'Absent', leave:'Leave', unmarked:'Unmarked', 'half-day':'Half Day' };
            return `<tr style="border-bottom:1px solid var(--border)">
              <td style="padding:12px 16px">
                <div style="font-size:13px;font-weight:600">${m.name}</div>
                <div style="font-size:11px;color:var(--textd)">${m.empId||''}</div>
              </td>
              <td style="padding:12px 16px;font-size:12px;color:var(--textm)">${m.dept||'—'}</td>
              <td style="padding:12px 16px;font-size:12px;color:var(--textm)">${att.checkIn||'—'}</td>
              <td style="padding:12px 16px">
                <span style="font-size:11.5px;font-weight:700;color:${statusColors[status]}">${statusLabels[status]||status}</span>
              </td>
              <td style="padding:12px 16px">
                <div style="display:flex;gap:4px">
                  <button onclick="markAttendance('${m.id}','present')" style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid var(--g200);background:var(--g50);color:var(--g700);cursor:pointer;font-family:inherit;font-weight:600">P</button>
                  <button onclick="markAttendance('${m.id}','absent')" style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid rgba(192,57,43,.2);background:rgba(192,57,43,.05);color:var(--red);cursor:pointer;font-family:inherit;font-weight:600">A</button>
                  <button onclick="markAttendance('${m.id}','leave')" style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid rgba(214,137,16,.2);background:var(--amb2);color:#7a5800;cursor:pointer;font-family:inherit;font-weight:600">L</button>
                  <button onclick="markAttendance('${m.id}','half-day')" style="padding:3px 8px;font-size:11px;border-radius:6px;border:1px solid #e0e0e0;background:#f5f5f5;color:#616161;cursor:pointer;font-family:inherit;font-weight:600">H</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:20px">
      <div style="font-size:13px;font-weight:700;margin-bottom:14px">Pending Leave Requests</div>
      <div id="leave-requests-list">Loading...</div>
    </div>`;
  loadLeaveRequests();
};

window.markAttendance = async function(memberId, status) {
  try {
    const db = await _getDb(); if (!db) return;
    const { collection, doc, setDoc, serverTimestamp } = await import(FB_BASE + '/firebase-firestore.js');
    const today = new Date().toISOString().split('T')[0];
    const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    await setDoc(doc(collection(db, 'companies/wanago-erp/attendance'), `${today}_${memberId}`), {
      memberId, status, date: today,
      checkIn: status === 'present' ? timeStr : null,
      markedBy: sess.uid, markedByName: sess.name,
      timestamp: serverTimestamp()
    });
    logActivity(`Marked attendance: ${status}`, `Member ID: ${memberId}`, 'team');
    if (typeof showToast === 'function') showToast('Attendance marked', 'success');
    renderAttendanceTab();
  } catch(e) {
    if (typeof showToast === 'function') showToast('Failed to mark attendance', 'error');
  }
};

window.loadLeaveRequests = async function() {
  const el = document.getElementById('leave-requests-list');
  if (!el) return;
  try {
    const db = await _getDb(); if (!db) { el.innerHTML = '<div style="color:var(--textd);font-size:12px">Firebase not connected</div>'; return; }
    const { collection, getDocs, query, where, orderBy } = await import(FB_BASE + '/firebase-firestore.js');
    const q = query(collection(db, 'companies/wanago-erp/leave_requests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    const requests = [];
    snap.forEach(d => requests.push({ id: d.id, ...d.data() }));
    if (!requests.length) { el.innerHTML = '<div style="color:var(--textd);font-size:12px;text-align:center;padding:20px">No pending leave requests</div>'; return; }
    el.innerHTML = requests.map(r => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">${r.memberName}</div>
          <div style="font-size:11.5px;color:var(--textd);margin-top:2px">${r.fromDate} → ${r.toDate} · ${r.type||'Leave'} · <em>${r.reason||'—'}</em></div>
        </div>
        <button onclick="approveLeave('${r.id}')" style="padding:5px 12px;background:var(--g50);border:1px solid var(--g200);color:var(--g700);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Approve</button>
        <button onclick="rejectLeave('${r.id}')" style="padding:5px 12px;background:rgba(192,57,43,.05);border:1px solid rgba(192,57,43,.2);color:var(--red);border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Reject</button>
      </div>`).join('');
  } catch(e) { el.innerHTML = '<div style="color:var(--red);font-size:12px">Error loading requests</div>'; }
};

window.approveLeave = async function(id) {
  try {
    const db = await _getDb(); if (!db) return;
    const { doc, updateDoc } = await import(FB_BASE + '/firebase-firestore.js');
    await updateDoc(doc(db, 'companies/wanago-erp/leave_requests', id), { status: 'approved' });
    logActivity('Leave approved', `Request ID: ${id}`, 'team');
    if (typeof showToast === 'function') showToast('Leave approved', 'success');
    loadLeaveRequests();
  } catch(e) { if (typeof showToast === 'function') showToast('Failed', 'error'); }
};

window.rejectLeave = async function(id) {
  try {
    const db = await _getDb(); if (!db) return;
    const { doc, updateDoc } = await import(FB_BASE + '/firebase-firestore.js');
    await updateDoc(doc(db, 'companies/wanago-erp/leave_requests', id), { status: 'rejected' });
    logActivity('Leave rejected', `Request ID: ${id}`, 'team');
    if (typeof showToast === 'function') showToast('Leave rejected', 'success');
    loadLeaveRequests();
  } catch(e) { if (typeof showToast === 'function') showToast('Failed', 'error'); }
};

window.openLeaveModal = function() {
  const team = DB.settings?.team || [];
  const modal = document.getElementById('modal-leave-request');
  if (!modal) return;
  const sel = document.getElementById('leave-member-select');
  if (sel) sel.innerHTML = team.map(m => `<option value="${m.id}" data-name="${m.name}">${m.name}</option>`).join('');
  if (typeof openModal === 'function') openModal('modal-leave-request');
};

window.submitLeaveRequest = async function() {
  const sel = document.getElementById('leave-member-select');
  const memberId = sel?.value;
  const memberName = sel?.options[sel?.selectedIndex]?.dataset?.name;
  const fromDate = document.getElementById('leave-from-date')?.value;
  const toDate = document.getElementById('leave-to-date')?.value;
  const type = document.getElementById('leave-type')?.value;
  const reason = document.getElementById('leave-reason')?.value;
  if (!memberId || !fromDate || !toDate) { if (typeof showToast === 'function') showToast('Fill all required fields', 'error'); return; }
  try {
    const db = await _getDb(); if (!db) return;
    const { collection, addDoc, serverTimestamp } = await import(FB_BASE + '/firebase-firestore.js');
    await addDoc(collection(db, 'companies/wanago-erp/leave_requests'), {
      memberId, memberName, fromDate, toDate, type: type||'casual', reason: reason||'',
      status: 'pending', createdAt: serverTimestamp()
    });
    logActivity(`Leave request added for ${memberName}`, `${fromDate} → ${toDate} (${type})`, 'team');
    if (typeof closeModal === 'function') closeModal('modal-leave-request');
    if (typeof showToast === 'function') showToast('Leave request added', 'success');
    renderAttendanceTab();
  } catch(e) { if (typeof showToast === 'function') showToast('Failed: ' + e.message, 'error'); }
};

window.exportAttendance = function() {
  if (typeof showToast === 'function') showToast('Exporting attendance...', 'success');
};

// ═══════════════════════════════════════════════════════════════
//  4. NOTIFICATIONS & ALERTS SYSTEM
// ═══════════════════════════════════════════════════════════════

window.renderNotificationsTab = async function() {
  const container = document.getElementById('adm-tab-notifications');
  if (!container) return;
  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <!-- Send Notification -->
      <div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:20px">
        <div style="font-size:14px;font-weight:800;margin-bottom:16px">Send Notification</div>
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Title *</label>
          <input class="form-input" id="notif-title" placeholder="New lead assigned">
        </div>
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Message *</label>
          <textarea class="form-input" id="notif-message" rows="3" placeholder="You have been assigned a new lead..." style="resize:vertical"></textarea>
        </div>
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Type</label>
          <select class="form-select" id="notif-type">
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="alert">Alert</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:16px">
          <label class="form-label">Send To</label>
          <select class="form-select" id="notif-target">
            <option value="all">All Team Members</option>
            <option value="managers">Managers Only</option>
            <option value="agents">Agents Only</option>
            <option value="specific">Specific Member</option>
          </select>
        </div>
        <div id="notif-specific-member" style="display:none;margin-bottom:16px">
          <label class="form-label">Select Member</label>
          <select class="form-select" id="notif-member-id">
            ${(DB.settings?.team||[]).map(m=>`<option value="${m.id}">${m.name}</option>`).join('')}
          </select>
        </div>
        <button class="btn btn-primary" onclick="sendNotification()" style="width:100%">Send Notification</button>
      </div>
      <!-- Notification Rules -->
      <div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:20px">
        <div style="font-size:14px;font-weight:800;margin-bottom:16px">Auto-Notification Rules</div>
        ${[
          ['New Lead Created','Notify assigned agent + manager','new_lead',true],
          ['Booking Confirmed','Notify operations + finance','booking_confirmed',true],
          ['Payment Received','Notify finance manager','payment_received',true],
          ['Payment Overdue','Alert finance + admin','payment_overdue',true],
          ['Follow-up Due','Remind assigned agent','followup_due',true],
          ['New Team Member','Notify all managers','new_member',false],
          ['Leave Approved','Notify the employee','leave_approved',true],
          ['Low Inventory','Alert operations manager','low_inventory',false],
        ].map(([title,desc,key,def])=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
            <div style="flex:1">
              <div style="font-size:12.5px;font-weight:600">${title}</div>
              <div style="font-size:11px;color:var(--textd);margin-top:2px">${desc}</div>
            </div>
            <div onclick="toggleNotifRule('${key}',this)" data-key="${key}" data-on="${def?'1':'0'}" style="width:40px;height:22px;background:${def?'var(--g500)':'var(--border2)'};border-radius:11px;cursor:pointer;position:relative;transition:.25s;flex-shrink:0">
              <div style="width:18px;height:18px;background:#fff;border-radius:50%;position:absolute;top:2px;${def?'right:2px':'left:2px'};transition:.25s;box-shadow:0 1px 4px rgba(0,0,0,.25)"></div>
            </div>
          </div>`).join('')}
        <button class="btn btn-primary" onclick="saveNotifRules()" style="width:100%;margin-top:16px">Save Rules</button>
      </div>
    </div>
    <!-- Recent Notifications -->
    <div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:20px;margin-top:20px">
      <div style="font-size:14px;font-weight:800;margin-bottom:16px">Recent Notifications Sent</div>
      <div id="recent-notifications">Loading...</div>
    </div>`;

  document.getElementById('notif-target').addEventListener('change', function() {
    document.getElementById('notif-specific-member').style.display = this.value === 'specific' ? '' : 'none';
  });
  loadRecentNotifications();
};

window.toggleNotifRule = function(key, el) {
  const isOn = el.dataset.on === '1';
  el.dataset.on = isOn ? '0' : '1';
  el.style.background = isOn ? 'var(--border2)' : 'var(--g500)';
  el.children[0].style.cssText += isOn ? 'right:auto;left:2px' : 'left:auto;right:2px';
};

window.sendNotification = async function() {
  const title = document.getElementById('notif-title')?.value?.trim();
  const message = document.getElementById('notif-message')?.value?.trim();
  const type = document.getElementById('notif-type')?.value;
  const target = document.getElementById('notif-target')?.value;
  if (!title || !message) { if (typeof showToast === 'function') showToast('Fill title and message', 'error'); return; }
  try {
    const db = await _getDb(); if (!db) return;
    const { collection, addDoc, serverTimestamp } = await import(FB_BASE + '/firebase-firestore.js');
    const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
    await addDoc(collection(db, 'companies/wanago-erp/notifications'), {
      title, message, type: type||'info', target,
      targetMemberId: target === 'specific' ? document.getElementById('notif-member-id')?.value : null,
      sentBy: sess.name, sentAt: serverTimestamp(), read: false
    });
    logActivity(`Notification sent: "${title}"`, `To: ${target}`, 'general');
    if (typeof showToast === 'function') showToast('Notification sent', 'success');
    document.getElementById('notif-title').value = '';
    document.getElementById('notif-message').value = '';
    loadRecentNotifications();
  } catch(e) { if (typeof showToast === 'function') showToast('Failed: ' + e.message, 'error'); }
};

window.loadRecentNotifications = async function() {
  const el = document.getElementById('recent-notifications');
  if (!el) return;
  try {
    const db = await _getDb(); if (!db) { el.innerHTML = '<div style="color:var(--textd);font-size:12px">Firebase not connected</div>'; return; }
    const { collection, getDocs, query, orderBy, limit } = await import(FB_BASE + '/firebase-firestore.js');
    const q = query(collection(db, 'companies/wanago-erp/notifications'), orderBy('sentAt', 'desc'), limit(20));
    const snap = await getDocs(q);
    const notifs = [];
    snap.forEach(d => notifs.push({ id: d.id, ...d.data() }));
    if (!notifs.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textd);font-size:12px">No notifications sent yet</div>'; return; }
    const typeColors = { info:'#2196f3', success:'#4caf50', warning:'#ff9800', alert:'#f44336' };
    const typeIcons  = { info:'i', success:'OK', warning:'!', alert:'!!' };
    el.innerHTML = `<div class="table-wrap" style="box-shadow:none;border:none"><table><thead><tr><th>Type</th><th>Title</th><th>Message</th><th>Sent To</th><th>Sent By</th><th>Time</th></tr></thead><tbody>
      ${notifs.map(n => {
        const ts = n.sentAt?.toDate ? n.sentAt.toDate() : new Date();
        const t = n.type || 'info';
        return `<tr>
          <td><span style="font-size:11px;font-weight:700;color:${typeColors[t]||'#607d8b'}">${typeIcons[t]||t}</span></td>
          <td style="font-weight:600;font-size:13px">${n.title}</td>
          <td style="font-size:12px;color:var(--textd);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${n.message}</td>
          <td style="font-size:12px">${n.target||'all'}</td>
          <td style="font-size:12px;color:var(--textd)">${n.sentBy||'—'}</td>
          <td style="font-size:11.5px;color:var(--textd)">${ts.toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</td>
        </tr>`;
      }).join('')}
    </tbody></table></div>`;
  } catch(e) { el.innerHTML = `<div style="color:var(--red);font-size:12px">Error: ${e.message}</div>`; }
};

window.saveNotifRules = function() {
  const rules = {};
  document.querySelectorAll('[data-key]').forEach(el => {
    rules[el.dataset.key] = el.dataset.on === '1';
  });
  localStorage.setItem('wanago_notif_rules', JSON.stringify(rules));
  if (typeof showToast === 'function') showToast('Notification rules saved', 'success');
};

// ── Team Accounts Firebase Creation ──
window.createFirebaseAccount = async function(memberId) {
  const m = (DB.settings?.team||[]).find(x => x.id === memberId);
  if (!m) return;
  const email = prompt('Enter email for ' + m.name + ':', m.email || '');
  if (!email) return;
  const password = prompt('Enter temporary password (min 6 chars):');
  if (!password || password.length < 6) { alert('Password must be at least 6 characters'); return; }
  try {
    const [{ initializeApp, getApps }, { getAuth, createUserWithEmailAndPassword, updateProfile }] = await Promise.all([
      import(FB_BASE + '/firebase-app.js'),
      import(FB_BASE + '/firebase-auth.js')
    ]);
    const apps = getApps();
    const app = apps.length ? apps[0] : initializeApp(FB_CFG);
    const auth = getAuth(app);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: m.name });
    // Update team member in DB
    m.firebaseUid = cred.user.uid;
    m.email = email;
    m.accountCreated = true;
    m.accountCreatedAt = new Date().toISOString();
    if (typeof saveDB === 'function') saveDB();
    if (typeof fsSaveSettings === 'function') fsSaveSettings();
    logActivity(`Firebase account created for ${m.name}`, email, 'team');
    if (typeof showToast === 'function') showToast(`Account created for ${m.name}`, 'success');
    if (typeof renderTeamLogins === 'function') renderTeamLogins();
    if (typeof renderTeamMembers === 'function') renderTeamMembers('all');
  } catch(e) {
    const errs = { 'auth/email-already-in-use': 'Email already has a Firebase account.', 'auth/weak-password': 'Password too weak.' };
    alert(errs[e.code] || e.message);
  }
};

console.log('[admin-features] Loaded');
