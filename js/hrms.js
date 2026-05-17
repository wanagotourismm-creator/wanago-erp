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

// Sync hrmsCheckIns array → hrmsAttendance object (keyed by empId_date)
function _syncCheckIns() {
  if (!DB.hrmsAttendance) DB.hrmsAttendance = {};
  (DB.hrmsCheckIns || []).forEach(rec => {
    if (rec && rec.id) DB.hrmsAttendance[rec.id] = rec;
  });
}

function renderHRMSAIStrip() {
  const el = document.getElementById('hrms-ai-strip');
  if (!el) return;
  const emps = hScoped('hrmsEmployees') || [];
  const active = emps.filter(e => (e.status||'active') === 'active');
  if (!active.length) { el.style.display = 'none'; return; }
  el.style.display = '';

  const todayStr = today();
  const cards = [];

  // 1. Top performer from WanagoAI or bookings
  if (typeof window.WanagoAI !== 'undefined') {
    try {
      const perf = WanagoAI.getTopPerformers();
      if (perf && perf.length) {
        const top = perf[0];
        cards.push({ icon:'Top', color:'#b45309', bg:'#fffbeb',
          title: top.name + ' — Top Performer',
          sub: formatMoney(top.revenue)+' revenue · '+top.bookings+' booking'+(top.bookings!==1?'s':'')+' this month' });
      }
    } catch(e) {}
  }

  // 2. Absent today (active, not marked in attendance)
  const attToday = DB.hrmsAttendance || {};
  const absentToday = active.filter(e => !attToday[e.id+'_'+todayStr]?.checkIn);
  if (absentToday.length) {
    cards.push({ icon:'Att', color:'#dc2626', bg:'#fee2e2',
      title: absentToday.length+' Employee'+(absentToday.length>1?'s':'')+' Not Marked Today',
      sub: absentToday.slice(0,3).map(e=>e.name).join(', ')+(absentToday.length>3?' +'+( absentToday.length-3)+' more':'') });
  }

  // 3. Pending leave requests
  const pendLeaves = (DB.hrmsLeaves||[]).filter(l => l.status === 'pending');
  if (pendLeaves.length) {
    cards.push({ icon:'Lve', color:'#f97316', bg:'#fff7ed',
      title: pendLeaves.length+' Leave Request'+(pendLeaves.length>1?'s':'')+' Awaiting Approval',
      sub: pendLeaves.slice(0,3).map(l=>l.employeeName||'—').join(', ')+(pendLeaves.length>3?' +more':'') });
  }

  // 4. Birthdays this week
  const today7 = new Date(); const endWeek = new Date(); endWeek.setDate(endWeek.getDate()+7);
  const bdaysSoon = active.filter(e => {
    if (!e.dob) return false;
    const bd = new Date(new Date().getFullYear()+'-'+e.dob.slice(5));
    return bd >= today7 && bd <= endWeek;
  });
  if (bdaysSoon.length) {
    cards.push({ icon:'Bday', color:'var(--g700)', bg:'var(--g50)',
      title: bdaysSoon.length+' Birthday'+(bdaysSoon.length>1?'s':'')+' This Week',
      sub: bdaysSoon.map(e=>e.name).join(', ') });
  }

  if (!cards.length) { el.style.display = 'none'; return; }

  el.innerHTML =
    '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;box-shadow:var(--sh)">'+
      '<div style="font-size:12px;font-weight:700;color:var(--text);margin-bottom:10px;display:flex;align-items:center;gap:6px">HR Intelligence <span style="font-size:10px;font-weight:400;color:var(--textd)">today\'s alerts</span></div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:9px">'+
        cards.map(c =>
          '<div style="background:'+c.bg+';border:1px solid '+c.color+'22;border-radius:9px;padding:10px 12px">'+
            '<div><div style="font-size:12px;font-weight:700;color:var(--text);line-height:1.3">'+c.title+'</div>'+
            '<div style="font-size:10.5px;color:var(--textd);margin-top:2px;line-height:1.4">'+c.sub+'</div></div>'+
          '</div>'
        ).join('')+
      '</div>'+
    '</div>';
}

function renderHRMSOverview() {
  const emps = hScoped('hrmsEmployees');
  const active = emps.filter(e=>(e.status||'active')==='active');
  const onLeave = (DB.hrmsLeaves||[]).filter(l=>l.status==='approved'&&today()>=l.startDate&&today()<=l.endDate).length;
  const pendLeave = (DB.hrmsLeaves||[]).filter(l=>l.status==='pending').length;
  const todayAtt = Object.values(DB.hrmsAttendance||{}).filter(a=>a.date===today()&&a.checkIn).length;

  const strip = document.getElementById('hrms-overview-strip');
  if (strip) strip.innerHTML = [
    {label:'Total Employees',val:emps.length,meta:active.length+' active'},
    {label:'Present Today',val:todayAtt,meta:'checked in today',cls:'stat-up'},
    {label:'On Leave',val:onLeave,meta:'approved leave today',cls:'stat-dn'},
    {label:'Leave Requests',val:pendLeave,meta:'pending approval',cls:pendLeave>0?'stat-dn':''},
    {label:'Dept Count',val:[...new Set(active.map(e=>e.department||e.dept))].filter(Boolean).length,meta:'departments'},
  ].map(s=>'<div class="stat-card" style="cursor:pointer"><div class="stat-label">'+s.label+'</div><div class="stat-val '+(s.cls||'')+'">'+s.val+'</div><div class="stat-meta">'+s.meta+'</div></div>').join('');

  // Quick birthday alerts
  const bdays = emps.filter(e=>e.dob&&e.dob.slice(5)===today().slice(5));
  const bdayEl = document.getElementById('hrms-bday-alert');
  if (bdayEl) bdayEl.style.display = bdays.length ? '' : 'none';
  if (bdays.length && bdayEl) bdayEl.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:linear-gradient(135deg,#fff8e1,#fffde7);border:1px solid #ffd54f;border-radius:var(--radius)"><div><div style="font-size:13px;font-weight:700;color:#f57f17">Birthday Today!</div><div style="font-size:12px;color:var(--textd)">'+bdays.map(e=>e.name).join(', ')+'</div></div></div>';

  renderHRMSAIStrip();
  renderEmployeeGrid();
}

// ══════ EMPLOYEES ══════
function renderEmployeeGrid() {
  const emps = hScoped('hrmsEmployees');
  const q = (document.getElementById('emp-search')?.value||'').toLowerCase();
  const deptF = document.getElementById('emp-dept-filter')?.value||'';
  const statF = document.getElementById('emp-status-filter')?.value||'active';
  let list = emps;
  if (statF !== 'all') list = list.filter(e=>(e.status||'active')===statF);
  if (deptF) list = list.filter(e=>(e.department||e.dept||'')=== deptF);
  if (q) list = list.filter(e=>(e.name||'').toLowerCase().includes(q)||(e.empId||'').toLowerCase().includes(q)||(e.role||'').toLowerCase().includes(q));

  const grid = document.getElementById('emp-grid'); if(!grid) return;
  if (!list.length) { grid.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--textd);grid-column:1/-1"><div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px">No employees found</div><button class="btn btn-primary" style="margin-top:12px" onclick="openAddEmpModal()">+ Add Employee</button></div>'; return; }

  const todayAtt = DB.hrmsAttendance || {};
  grid.innerHTML = list.map(e => {
    const attKey = e.id+'_'+today();
    const att = todayAtt[attKey];
    const dept = e.department||e.dept||'';
    const isActive = (e.status||'active')==='active';
    return '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;box-shadow:var(--sh);transition:.2s" onmouseover="this.style.boxShadow=\'var(--sh2)\'" onmouseout="this.style.boxShadow=\'var(--sh)\'">' +
      '<div style="background:linear-gradient(135deg,'+(e.color||'var(--g700)')+','+(e.color||'var(--g500)')+');padding:18px;text-align:center;position:relative">' +
        '<div style="width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;margin:0 auto 8px;font-size:18px;font-weight:700;color:#fff">'+initials(e.name)+'</div>'+
        '<div style="font-size:13.5px;font-weight:700;color:#fff">'+e.name+'</div>'+
        '<div style="font-size:11px;color:rgba(255,255,255,.7);margin-top:2px">'+(e.role||e.designation||'—')+'</div>'+
        '<div style="position:absolute;top:10px;right:10px"><span style="background:'+(isActive?'rgba(82,194,133,.3)':'rgba(192,57,43,.3)')+';color:'+(isActive?'#8dddb0':'#ff9999')+';font-size:9px;font-weight:700;padding:2px 8px;border-radius:10px">'+(isActive?'Active':'Inactive')+'</span></div>'+
      '</div>'+
      '<div style="padding:14px 16px">'+
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'+
          '<span class="pill pill-blue" style="font-size:10px">'+(dept||'—')+'</span>'+
          '<span class="pill pill-gray" style="font-size:10px">'+(e.empId||'—')+'</span>'+
        '</div>'+
        '<div style="font-size:11.5px;color:var(--textd);margin-bottom:10px">'+(e.phone||'No phone')+'</div>'+
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'+
          '<span style="font-size:10px;color:var(--textd)">Today</span>'+
          '<span style="font-size:11px;font-weight:600;color:'+(att?.checkIn?'var(--g600)':'var(--textd)')+'">'+
            (att?.checkIn ? att.checkIn+(att.checkOut?' → '+att.checkOut:'') : 'Not checked in')+
            (att?.checkInLat ? ' <span title="Location: '+att.checkInLat+', '+att.checkInLng+'" style="font-size:10px;cursor:default;color:var(--textd)">[loc]</span>' : '')+
          '</span>'+
        '</div>'+
        '<div style="display:flex;gap:6px">'+
          '<button class="btn btn-sm btn-outline" style="flex:1" onclick="viewEmployee(\''+e.id+'\')">View</button>'+
          '<button class="btn btn-sm btn-green" onclick="editEmployee(\''+e.id+'\')">Edit</button>'+
          (isActive&&!att?.checkIn?'<button class="btn btn-sm" style="background:var(--g50);color:var(--g700);border:1px solid var(--g200);font-size:11px" onclick="markAttendance(\''+e.id+'\',\'in\')">Check In</button>':'')+
          (isActive&&att?.checkIn&&!att?.checkOut?'<button class="btn btn-sm" style="background:var(--red2);color:var(--red);border:1px solid rgba(192,57,43,.2);font-size:11px" onclick="markAttendance(\''+e.id+'\',\'out\')">Check Out</button>':'')+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

// ══════ ADD/EDIT EMPLOYEE ══════
function openAddEmpModal() {
  document.getElementById('emp-edit-id').value=''; document.getElementById('emp-modal-title').textContent='Add Employee';
  ['emp-name','emp-phone','emp-email','emp-empid','emp-role','emp-dept','emp-dob','emp-join','emp-salary','emp-hra','emp-ta','emp-pf-no','emp-pan','emp-aadhaar','emp-bank-name','emp-acc-no','emp-ifsc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('emp-status').value='active';
  openModal('modal-add-employee');
}

function editEmployee(id) {
  const e = DB.hrmsEmployees.find(x=>x.id===id); if(!e) return;
  openAddEmpModal();
  document.getElementById('emp-edit-id').value=id; document.getElementById('emp-modal-title').textContent='Edit Employee';
  const s=(elId,val)=>{const el=document.getElementById(elId);if(el)el.value=val||'';};
  s('emp-name',e.name);s('emp-phone',e.phone);s('emp-email',e.email);s('emp-empid',e.empId);
  s('emp-role',e.role||e.designation);s('emp-dept',e.department||e.dept);s('emp-dob',e.dob);s('emp-join',e.joinDate);
  s('emp-salary',e.salary);s('emp-hra',e.hra);s('emp-ta',e.ta);
  s('emp-pf-no',e.pfNo);s('emp-pan',e.pan);s('emp-aadhaar',e.aadhaar);
  s('emp-bank-name',e.bankName);s('emp-acc-no',e.accNo);s('emp-ifsc',e.ifsc);
  document.getElementById('emp-status').value=e.status||'active';
}

function saveEmployee() {
  const editId=document.getElementById('emp-edit-id').value;
  const name=document.getElementById('emp-name').value.trim();
  const dept=document.getElementById('emp-dept').value.trim();
  if(!name||!dept){showError('emp-error','Name and department are required.');return;}
  const fields = {
    name, phone:document.getElementById('emp-phone').value, email:document.getElementById('emp-email').value,
    empId:document.getElementById('emp-empid').value||('WGO-'+String((DB.hrmsEmployees.length+1)).padStart(3,'0')),
    role:document.getElementById('emp-role').value, department:dept, dept,
    dob:document.getElementById('emp-dob').value, joinDate:document.getElementById('emp-join').value,
    salary:parseFloat(document.getElementById('emp-salary').value)||0,
    hra:parseFloat(document.getElementById('emp-hra').value)||0,
    ta:parseFloat(document.getElementById('emp-ta').value)||0,
    pfNo:document.getElementById('emp-pf-no').value, pan:document.getElementById('emp-pan').value,
    aadhaar:document.getElementById('emp-aadhaar').value, bankName:document.getElementById('emp-bank-name').value,
    accNo:document.getElementById('emp-acc-no').value, ifsc:document.getElementById('emp-ifsc').value,
    status:document.getElementById('emp-status').value||'active',
  };
  if(editId){
    const e=DB.hrmsEmployees.find(x=>x.id===editId);
    if(e){ Object.assign(e,fields); dbSave('hrmsEmployees',e); showToast(name+' updated!'); }
  } else {
    const color=['#134a32','#1976d2','#f57c00','#7b1fa2','#c9a84c','#d32f2f','#00796b'][DB.hrmsEmployees.length%7];
    const _newEmp={id:uid(),...fields,color,officeId:officeIdForNewRecord(),createdBy:createdByStamp(),createdAt:new Date().toISOString()};
    DB.hrmsEmployees.push(_newEmp);
    dbSave('hrmsEmployees',_newEmp);
    showToast(name+' added!');
  }
  saveDB(); closeModal('modal-add-employee'); renderEmployeeGrid(); renderHRMSOverview();
}

function viewEmployee(id) {
  const e = DB.hrmsEmployees.find(x=>x.id===id); if(!e) return;
  const leaves = (DB.hrmsLeaves||[]).filter(l=>l.empId===id);
  const payslips = (DB.hrmsPayroll||[]).filter(p=>p.empId===id).slice(0,3);
  const grossSalary = (e.salary||0)+(e.hra||0)+(e.ta||0);
  document.getElementById('ve-title').textContent = e.name;
  document.getElementById('ve-body').innerHTML =
    '<div style="display:flex;align-items:center;gap:14px;padding:14px;background:var(--cream);border-radius:12px;margin-bottom:16px">'+
      '<div style="width:52px;height:52px;border-radius:50%;background:'+(e.color||'var(--g600)')+';display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#fff">'+initials(e.name)+'</div>'+
      '<div style="flex:1"><div style="font-size:16px;font-weight:700">'+e.name+'</div><div style="font-size:12px;color:var(--textd);margin-top:2px">'+(e.role||'—')+' · '+(e.department||e.dept||'—')+'</div><div style="font-size:11px;color:var(--textd)">ID: '+(e.empId||'—')+'</div></div>'+
      '<span class="pill '+(e.status==='active'?'pill-green':'pill-red')+'">'+(e.status||'active')+'</span>'+
    '</div>'+
    '<div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">'+
      '<div class="stat-card"><div class="stat-label">Basic Salary</div><div class="stat-val" style="font-size:17px">'+formatMoney(e.salary||0)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Gross Salary</div><div class="stat-val stat-up" style="font-size:17px">'+formatMoney(grossSalary)+'</div></div>'+
      '<div class="stat-card"><div class="stat-label">Leave Balance</div><div class="stat-val">'+((e.annualLeave||12)-leaves.filter(l=>l.status==='approved').reduce((s,l)=>s+Number(l.days||0),0))+'</div></div>'+
    '</div>'+
    '<div class="form-grid" style="margin-bottom:14px">'+
      '<div><div class="form-label">Phone</div><div style="font-size:12.5px;margin-top:4px">'+(e.phone||'—')+'</div></div>'+
      '<div><div class="form-label">Email</div><div style="font-size:12.5px;margin-top:4px">'+(e.email||'—')+'</div></div>'+
      '<div><div class="form-label">Date of Birth</div><div style="font-size:12.5px;margin-top:4px">'+(e.dob?formatDate(e.dob):'—')+'</div></div>'+
      '<div><div class="form-label">Joining Date</div><div style="font-size:12.5px;margin-top:4px">'+(e.joinDate?formatDate(e.joinDate):'—')+'</div></div>'+
      '<div><div class="form-label">PAN</div><div style="font-size:12.5px;margin-top:4px">'+(e.pan||'—')+'</div></div>'+
      '<div><div class="form-label">Bank Account</div><div style="font-size:12.5px;margin-top:4px">'+(e.accNo?e.bankName+' · '+e.accNo:'—')+'</div></div>'+
    '</div>'+
    (payslips.length?'<div class="form-section">Recent Payslips</div>'+payslips.map(p=>'<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--cream);border-radius:8px;margin-bottom:6px;font-size:12px"><span>'+p.month+'</span><span style="font-weight:600;color:var(--g700)">'+formatMoney(p.netSalary)+'</span><span class="pill '+(p.status==='paid'?'pill-green':'pill-amb')+'">'+p.status+'</span></div>').join(''):'');
  openModal('modal-view-employee');
}

// ══════ ATTENDANCE ══════
function renderAttendancePage() {
  const month = document.getElementById('att-month')?.value || today().slice(0,7);
  const emps = hScoped('hrmsEmployees').filter(e=>(e.status||'active')==='active');
  const daysInMonth = new Date(parseInt(month.slice(0,4)), parseInt(month.slice(5,7)), 0).getDate();
  const tbody = document.getElementById('att-tbody'); if(!tbody) return;
  if(!emps.length){tbody.innerHTML=emptyRow(5,'No active employees');return;}
  const attMap = DB.hrmsAttendance || {};

  tbody.innerHTML = emps.map(e => {
    let present=0,absent=0,late=0,halfDay=0;
    for(let d=1;d<=daysInMonth;d++){
      const dateKey=month+'-'+String(d).padStart(2,'0');
      const attKey=e.id+'_'+dateKey;
      const att=attMap[attKey];
      if(att){
        if(att.checkIn||att.status==='present') present++;
        else if(att.status==='absent') absent++;
        else if(att.status==='late') late++;
        else if(att.status==='half') halfDay++;
      }
    }
    return '<tr>'+
      '<td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:'+(e.color||'var(--g600)')+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">'+initials(e.name)+'</div><span style="font-weight:600">'+e.name+'</span></div></td>'+
      '<td style="text-align:center;color:var(--g600);font-weight:700">'+present+'</td>'+
      '<td style="text-align:center;color:var(--red);font-weight:700">'+absent+'</td>'+
      '<td style="text-align:center;color:var(--amb);font-weight:700">'+late+'</td>'+
      '<td style="text-align:center"><button class="row-btn" onclick="markAttendanceModal(\''+e.id+'\')">Mark</button></td>'+
    '</tr>';
  }).join('');
}

function markAttendance(empId, type) {
  const now = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const attKey = empId+'_'+today();
  if (!DB.hrmsAttendance) DB.hrmsAttendance = {};
  if (!DB.hrmsAttendance[attKey]) DB.hrmsAttendance[attKey] = {id:attKey, empId, date:today(), status:'present'};
  const rec = DB.hrmsAttendance[attKey];

  function _save(lat, lng) {
    if (type==='in') {
      rec.checkIn = now; rec.status = 'present';
      if (lat) { rec.checkInLat = lat; rec.checkInLng = lng; }
      showToast('Check-in recorded: '+now+(lat?' 📍':''));
    } else {
      rec.checkOut = now;
      if (lat) { rec.checkOutLat = lat; rec.checkOutLng = lng; }
      showToast('Check-out recorded: '+now+(lat?' 📍':''));
    }
    saveDB(); renderEmployeeGrid();
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) { _save(pos.coords.latitude.toFixed(5), pos.coords.longitude.toFixed(5)); },
      function()    { _save(null, null); },
      { timeout: 6000, maximumAge: 30000 }
    );
  } else {
    _save(null, null);
  }
}

function markAttendanceModal(empId) {
  document.getElementById('att-emp-sel').value = empId;
  document.getElementById('att-date').value = today();
  document.getElementById('att-status').value = 'present';
  document.getElementById('att-checkin').value = '';
  document.getElementById('att-checkout').value = '';
  openModal('modal-mark-attendance');
}

function saveAttendance() {
  const empId=document.getElementById('att-emp-sel').value;
  const date=document.getElementById('att-date').value||today();
  const status=document.getElementById('att-status').value||'present';
  const checkIn=document.getElementById('att-checkin').value;
  const checkOut=document.getElementById('att-checkout').value;
  if(!empId){showError('att-error','Select employee.');return;}
  const attKey=empId+'_'+date;
  if(!DB.hrmsAttendance) DB.hrmsAttendance={};
  const _att={id:attKey,empId,date,status,checkIn:checkIn||null,checkOut:checkOut||null};
  DB.hrmsAttendance[attKey]=_att;
  dbSave('hrmsCheckIns',_att);
  saveDB(); closeModal('modal-mark-attendance'); renderAttendancePage(); showToast('Attendance saved!');
}

// ══════ LEAVES ══════
function renderLeavePage() {
  const filter = document.getElementById('leave-filter')?.value || 'all';
  let leaves = DB.hrmsLeaves||[];
  if (filter!=='all') leaves = leaves.filter(l=>l.status===filter);
  const tbody = document.getElementById('leave-tbody'); if(!tbody) return;
  if(!leaves.length){tbody.innerHTML=emptyRow(8,'No leave requests found');return;}
  const emps = DB.hrmsEmployees||[];
  tbody.innerHTML = leaves.map(l => {
    const emp = emps.find(e=>e.id===l.empId);
    return '<tr>'+
      '<td><div style="font-weight:600">'+(emp?.name||l.empName||'—')+'</div></td>'+
      '<td>'+PILL.blue(l.leaveType||'casual')+'</td>'+
      '<td>'+formatDate(l.startDate)+'</td>'+
      '<td>'+formatDate(l.endDate)+'</td>'+
      '<td style="text-align:center;font-weight:600">'+l.days+'</td>'+
      '<td style="color:var(--textd);font-size:12px">'+(l.reason||'—')+'</td>'+
      '<td>'+stagePill(l.status)+'</td>'+
      '<td style="white-space:nowrap">'+
        (l.status==='pending'?
          '<button class="row-btn" style="color:var(--g600)" onclick="approveLeave(\''+l.id+'\')">Approve</button>'+
          '<button class="row-btn" style="margin-left:3px;color:var(--red)" onclick="rejectLeave(\''+l.id+'\')">✕ Reject</button>'
        :'<span style="font-size:11px;color:var(--textd)">'+(l.approvedBy?'by '+l.approvedBy:'—')+'</span>')+
      '</td></tr>';
  }).join('');
}

function openLeaveModal() {
  const empSel=document.getElementById('leave-emp');
  if(empSel) empSel.innerHTML='<option value="">Select employee</option>'+(DB.hrmsEmployees||[]).filter(e=>(e.status||'active')==='active').map(e=>'<option value="'+e.id+'">'+e.name+'</option>').join('');
  ['leave-start','leave-end','leave-reason'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  openModal('modal-apply-leave');
}

function calcLeaveDays() {
  const s=document.getElementById('leave-start')?.value; const e=document.getElementById('leave-end')?.value;
  if(!s||!e) return;
  const days=Math.max(1,Math.ceil((new Date(e)-new Date(s))/86400000)+1);
  const el=document.getElementById('leave-days-preview'); if(el) el.textContent=days+' day'+(days>1?'s':'');
}

function saveLeave() {
  const empId=document.getElementById('leave-emp').value;
  const type=document.getElementById('leave-type').value||'casual';
  const start=document.getElementById('leave-start').value;
  const end=document.getElementById('leave-end').value;
  const reason=document.getElementById('leave-reason').value;
  if(!empId||!start||!end){showError('leave-error','All fields required.');return;}
  const days=Math.max(1,Math.ceil((new Date(end)-new Date(start))/86400000)+1);
  const emp=DB.hrmsEmployees.find(e=>e.id===empId);
  const _leave={id:uid(),empId,empName:emp?.name||'',leaveType:type,startDate:start,endDate:end,days,reason,status:'pending',createdAt:new Date().toISOString()};
  DB.hrmsLeaves.push(_leave);
  dbSave('hrmsLeaves',_leave);
  saveDB(); closeModal('modal-apply-leave'); renderLeavePage(); renderHRMSOverview(); showToast('Leave request submitted!');
}

function approveLeave(id) {
  const l=DB.hrmsLeaves.find(x=>x.id===id); if(!l) return;
  l.status='approved'; l.approvedBy=currentUser?.name||'Admin'; l.approvedAt=new Date().toISOString();
  const _al=DB.hrmsLeaves.find(x=>x.id===id); if(_al) dbSave('hrmsLeaves',_al);
  saveDB(); renderLeavePage(); renderHRMSOverview(); showToast('Leave approved!');
}

function rejectLeave(id) {
  const l=DB.hrmsLeaves.find(x=>x.id===id); if(!l) return;
  l.status='rejected'; l.approvedBy=currentUser?.name||'Admin';
  const _rl=DB.hrmsLeaves.find(x=>x.id===id); if(_rl) dbSave('hrmsLeaves',_rl);
  saveDB(); renderLeavePage(); showToast('Leave rejected');
}

// ══════ PAYROLL ══════
function renderPayrollPage() {
  const month=document.getElementById('payroll-month')?.value||today().slice(0,7);
  const emps=hScoped('hrmsEmployees').filter(e=>(e.status||'active')==='active');
  const tbody=document.getElementById('payroll-tbody'); if(!tbody) return;
  if(!emps.length){tbody.innerHTML=emptyRow(8,'No active employees');return;}

  const totalGross=emps.reduce((s,e)=>s+(e.salary||0)+(e.hra||0)+(e.ta||0),0);
  const tlEl=document.getElementById('payroll-total'); if(tlEl) tlEl.textContent=formatMoney(totalGross)+'/month';

  tbody.innerHTML = emps.map(e => {
    const existing=DB.hrmsPayroll.find(p=>p.empId===e.id&&p.month===month);
    const gross=(e.salary||0)+(e.hra||0)+(e.ta||0);
    const pf=Math.round((e.salary||0)*0.12);
    const tax=Math.round(Math.max(0,gross-20000)*0.1);
    const net=gross-pf-tax+(existing?.bonus||0)-(existing?.deduction||0);
    return '<tr>'+
      '<td><div style="display:flex;align-items:center;gap:8px"><div style="width:28px;height:28px;border-radius:50%;background:'+(e.color||'var(--g600)')+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">'+initials(e.name)+'</div><div><div style="font-weight:600">'+e.name+'</div><div style="font-size:10px;color:var(--textd)">'+(e.empId||'')+'</div></div></div></td>'+
      '<td style="text-align:right">'+formatMoney(e.salary||0)+'</td>'+
      '<td style="text-align:right">'+formatMoney((e.hra||0)+(e.ta||0))+'</td>'+
      '<td style="text-align:right">'+formatMoney(gross)+'</td>'+
      '<td style="text-align:right;color:var(--red)">'+formatMoney(pf+tax)+'</td>'+
      '<td style="text-align:right;font-weight:700;color:var(--g700)">'+formatMoney(net)+'</td>'+
      '<td>'+stagePill(existing?.status||'pending')+'</td>'+
      '<td style="white-space:nowrap">'+
        (!existing||existing.status==='pending'?'<button class="btn btn-sm btn-primary" onclick="markPayrollPaid(\''+e.id+'\',\''+month+'\','+net+')">Mark Paid</button>':'<span style="font-size:10px;color:var(--textd)">'+formatDate(existing.paidDate||'')+'</span>')+
      '</td></tr>';
  }).join('');
}

function markPayrollPaid(empId, month, net) {
  const emp=DB.hrmsEmployees.find(e=>e.id===empId); if(!emp) return;
  if(!confirm('Mark salary paid for '+emp.name+' ('+formatMoney(net)+') for '+month+'?')) return;
  const existing=DB.hrmsPayroll.findIndex(p=>p.empId===empId&&p.month===month);
  const rec={id:uid(),empId,empName:emp.name,month,netSalary:net,status:'paid',paidDate:today(),paidBy:currentUser?.name||'Admin',createdAt:new Date().toISOString()};
  if(existing!==-1) DB.hrmsPayroll[existing]=rec; else DB.hrmsPayroll.push(rec);
  const _pr=DB.hrmsPayroll.find(x=>x.empId===empId&&x.month===month); if(_pr) dbSave('hrmsPayroll',_pr);
  saveDB(); renderPayrollPage(); showToast(emp.name+' salary marked as paid!');
}

function switchHRMSTab(el, tabId) {
  document.querySelectorAll('.hrms-tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.hrms-tab-btn').forEach(t=>t.classList.remove('active'));
  document.getElementById(tabId)?.classList.add('active');
  if(el) el.classList.add('active');
  if(tabId==='hrms-attendance')    renderAttendancePage();
  if(tabId==='hrms-leaves')        renderLeavePage();
  if(tabId==='hrms-payroll')       renderPayrollPage();
  if(tabId==='hrms-loc-approvals') renderLocApprovals();
  if(tabId==='hrms-offices')       renderOfficeLocations();
}

// ══════ LOCATION APPROVALS ══════
function renderLocApprovals() {
  const filter = document.getElementById('loc-req-filter')?.value || 'all';
  let reqs = (DB.hrmsLocRequests||[]);
  if (filter !== 'all') reqs = reqs.filter(r => r.status === filter);
  reqs = [...reqs].reverse();
  const tbody = document.getElementById('loc-approvals-tbody'); if(!tbody) return;
  // Update badge
  const pending = (DB.hrmsLocRequests||[]).filter(r=>r.status==='pending').length;
  const badge = document.getElementById('loc-badge');
  if(badge){badge.textContent=pending;badge.style.display=pending?'':'none';}
  if(!reqs.length){tbody.innerHTML=emptyRow(8,'No location approval requests');return;}
  tbody.innerHTML = reqs.map(r=>{
    const isReg = r.type === 'regularization';
    const mapsUrl = r.lat&&r.lng ? `https://maps.google.com/?q=${r.lat},${r.lng}` : null;
    return '<tr>'+
      '<td><div style="font-weight:600">'+r.empName+'</div><div style="font-size:10px;color:var(--textd)">'+r.empRole+'</div></td>'+
      '<td>'+r.date+'</td>'+
      '<td>'+(r.time||'—')+'</td>'+
      '<td>'+(mapsUrl?'<a href="'+mapsUrl+'" target="_blank" style="color:var(--g600);font-size:11px">View Map</a>':'<span style="color:var(--textd)">—</span>')+(r.photo?'<br><button class="row-btn" onclick="showLocPhoto(\''+r.id+'\')">Photo</button>':'')+'</td>'+
      '<td style="font-size:11.5px;color:var(--textd);max-width:160px">'+r.reason+'</td>'+
      '<td>'+PILL[isReg?'amber':'blue'](isReg?'Regularize':'Loc Request')+'</td>'+
      '<td>'+stagePill(r.status)+'</td>'+
      '<td style="white-space:nowrap">'+(r.status==='pending'?
        '<button class="row-btn" style="color:var(--g600)" onclick="approveLocRequest(\''+r.id+'\')">Approve</button>'+
        '<button class="row-btn" style="margin-left:3px;color:var(--red)" onclick="rejectLocRequest(\''+r.id+'\')">✕ Reject</button>'
        :'<span style="font-size:11px;color:var(--textd)">'+(r.approvedBy||'—')+'</span>')+
      '</td></tr>';
  }).join('');
}

function approveLocRequest(id) {
  const r = (DB.hrmsLocRequests||[]).find(x=>x.id===id); if(!r) return;
  r.status='approved'; r.approvedBy=currentUser?.name||'Admin'; r.approvedAt=new Date().toISOString();
  // If location request: also save attendance check-in now
  if (r.type !== 'regularization' && r.lat && r.date) {
    if(!DB.hrmsAttendance) DB.hrmsAttendance={};
    const attKey = r.empId+'_'+r.date;
    if(!DB.hrmsAttendance[attKey]) DB.hrmsAttendance[attKey]={id:attKey,empId:r.empId,date:r.date,status:'present'};
    const att = DB.hrmsAttendance[attKey];
    att.checkIn = r.time||'00:00'; att.status='present'; att.locStatus='loc_approved';
    if(r.lat){att.checkInLat=r.lat;att.checkInLng=r.lng;}
    if(r.photo) att.checkInPhoto=r.photo;
    if(typeof dbSave==='function') dbSave('hrmsCheckIns',att).catch(()=>{});
  }
  // If regularization: update attendance record
  if (r.type === 'regularization') {
    if(!DB.hrmsAttendance) DB.hrmsAttendance={};
    const attKey = r.empId+'_'+r.date;
    if(!DB.hrmsAttendance[attKey]) DB.hrmsAttendance[attKey]={id:attKey,empId:r.empId,date:r.date,status:'present'};
    const att = DB.hrmsAttendance[attKey];
    if(r.checkIn) att.checkIn=r.checkIn;
    if(r.checkOut) att.checkOut=r.checkOut;
    att.status='present'; att.regularized=true;
    if(typeof dbSave==='function') dbSave('hrmsCheckIns',att).catch(()=>{});
  }
  if(typeof dbSave==='function') dbSave('hrmsLocRequests',r).catch(()=>{});
  saveDB(); renderLocApprovals(); showToast('Request approved!');
}

function rejectLocRequest(id) {
  const r=(DB.hrmsLocRequests||[]).find(x=>x.id===id); if(!r) return;
  r.status='rejected'; r.approvedBy=currentUser?.name||'Admin';
  if(typeof dbSave==='function') dbSave('hrmsLocRequests',r).catch(()=>{});
  saveDB(); renderLocApprovals(); showToast('Request rejected');
}

function showLocPhoto(id) {
  const r=(DB.hrmsLocRequests||[]).find(x=>x.id===id); if(!r||!r.photo) return;
  const img=document.getElementById('loc-photo-img'); if(img) img.src=r.photo;
  openModal('modal-loc-photo');
}

// ══════ OFFICE LOCATIONS ══════
function renderOfficeLocations() {
  const locs = (DB.settings&&DB.settings.officeLocations)||[];
  const el = document.getElementById('office-loc-list'); if(!el) return;
  // Load settings
  const shiftEl=document.getElementById('sett-shift'); if(shiftEl) shiftEl.value=DB.settings?.workShift||'09:00 - 18:00';
  const woEl=document.getElementById('sett-weekly-off');
  if(woEl){const wo=(DB.settings?.weeklyOff)||[0];Array.from(woEl.options).forEach(o=>{o.selected=wo.includes(Number(o.value));});}
  if(!locs.length){el.innerHTML='<div style="text-align:center;padding:40px;color:var(--textd);grid-column:1/-1">No office locations set. Add one to enable geofenced attendance.</div>';return;}
  el.innerHTML=locs.map(loc=>`
    <div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--sh)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="font-size:14px;font-weight:700">${loc.name}</div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" onclick="editOfficeLoc('${loc.id}')">Edit</button>
          <button class="btn btn-sm" style="background:var(--red2);color:var(--red);border:1px solid rgba(192,57,43,.2)" onclick="deleteOfficeLoc('${loc.id}')">Delete</button>
        </div>
      </div>
      <div style="font-size:12px;color:var(--textd);margin-bottom:6px">📍 ${loc.lat}, ${loc.lng}</div>
      <div style="font-size:12px;font-weight:600;color:var(--g700)">Radius: ${loc.radiusMeters||200}m</div>
      ${loc.lat&&loc.lng?`<a href="https://maps.google.com/?q=${loc.lat},${loc.lng}" target="_blank" style="font-size:11.5px;color:var(--g600)">View on Google Maps ›</a>`:''}
    </div>`).join('');
}

function openAddOfficeLocModal() {
  document.getElementById('office-loc-edit-id').value='';
  document.getElementById('office-loc-modal-title').textContent='Add Office Location';
  ['ol-name','ol-lat','ol-lng','ol-radius'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const e=document.getElementById('ol-error');if(e)e.style.display='none';
  openModal('modal-add-office-loc');
}

function editOfficeLoc(id) {
  const loc=(DB.settings?.officeLocations||[]).find(x=>x.id===id); if(!loc) return;
  document.getElementById('office-loc-edit-id').value=id;
  document.getElementById('office-loc-modal-title').textContent='Edit Office Location';
  const s=(elId,val)=>{const el=document.getElementById(elId);if(el)el.value=val||'';};
  s('ol-name',loc.name);s('ol-lat',loc.lat);s('ol-lng',loc.lng);s('ol-radius',loc.radiusMeters||200);
  openModal('modal-add-office-loc');
}

function saveOfficeLoc() {
  const editId=document.getElementById('office-loc-edit-id').value;
  const name=document.getElementById('ol-name').value.trim();
  const lat=document.getElementById('ol-lat').value.trim();
  const lng=document.getElementById('ol-lng').value.trim();
  const radius=parseInt(document.getElementById('ol-radius').value)||200;
  const errEl=document.getElementById('ol-error');
  if(!name||!lat||!lng){if(errEl){errEl.textContent='Name, latitude and longitude are required.';errEl.style.display='';}return;}
  if(errEl)errEl.style.display='none';
  if(!DB.settings.officeLocations) DB.settings.officeLocations=[];
  if(editId){const idx=DB.settings.officeLocations.findIndex(x=>x.id===editId);if(idx!==-1)DB.settings.officeLocations[idx]={...DB.settings.officeLocations[idx],name,lat,lng,radiusMeters:radius};}
  else{DB.settings.officeLocations.push({id:uid(),name,lat,lng,radiusMeters:radius,createdAt:new Date().toISOString()});}
  if(typeof fsSaveSettings==='function')fsSaveSettings().catch(()=>{});
  saveDB();closeModal('modal-add-office-loc');renderOfficeLocations();showToast('Office location saved!');
}

function deleteOfficeLoc(id) {
  if(!confirm('Remove this office location?'))return;
  DB.settings.officeLocations=(DB.settings.officeLocations||[]).filter(x=>x.id!==id);
  if(typeof fsSaveSettings==='function')fsSaveSettings().catch(()=>{});
  saveDB();renderOfficeLocations();showToast('Removed');
}

function useMyLocation() {
  const statusEl=document.getElementById('ol-my-loc-status');
  if(statusEl)statusEl.textContent='Detecting location…';
  if(!navigator.geolocation){if(statusEl)statusEl.textContent='Geolocation not supported';return;}
  navigator.geolocation.getCurrentPosition(
    (pos)=>{
      const lat=pos.coords.latitude.toFixed(6), lng=pos.coords.longitude.toFixed(6);
      const latEl=document.getElementById('ol-lat');const lngEl=document.getElementById('ol-lng');
      if(latEl)latEl.value=lat;if(lngEl)lngEl.value=lng;
      if(statusEl)statusEl.textContent='Location captured: '+lat+', '+lng+' (accuracy: '+Math.round(pos.coords.accuracy)+'m)';
    },
    ()=>{if(statusEl)statusEl.textContent='Could not get location. Please enter manually.';},
    {timeout:8000}
  );
}

function saveAttSettings() {
  const shift=document.getElementById('sett-shift')?.value?.trim();
  const woEl=document.getElementById('sett-weekly-off');
  if(shift) DB.settings.workShift=shift;
  if(woEl){const selected=Array.from(woEl.selectedOptions).map(o=>Number(o.value));DB.settings.weeklyOff=selected;}
  if(typeof fsSaveSettings==='function')fsSaveSettings().catch(()=>{});
  saveDB();showToast('Attendance settings saved!');
}


window._syncCheckIns=_syncCheckIns;
window.renderLocApprovals=renderLocApprovals;window.approveLocRequest=approveLocRequest;window.rejectLocRequest=rejectLocRequest;window.showLocPhoto=showLocPhoto;
window.renderOfficeLocations=renderOfficeLocations;window.openAddOfficeLocModal=openAddOfficeLocModal;window.editOfficeLoc=editOfficeLoc;window.saveOfficeLoc=saveOfficeLoc;window.deleteOfficeLoc=deleteOfficeLoc;window.useMyLocation=useMyLocation;window.saveAttSettings=saveAttSettings;
window.renderHRMSOverview=renderHRMSOverview;
window.renderEmployeeGrid=renderEmployeeGrid;window.openAddEmpModal=openAddEmpModal;window.editEmployee=editEmployee;
window.saveEmployee=saveEmployee;window.viewEmployee=viewEmployee;window.markAttendance=markAttendance;
window.markAttendanceModal=markAttendanceModal;window.saveAttendance=saveAttendance;window.renderAttendancePage=renderAttendancePage;
window.renderLeavePage=renderLeavePage;window.openLeaveModal=openLeaveModal;window.calcLeaveDays=calcLeaveDays;
window.saveLeave=saveLeave;window.approveLeave=approveLeave;window.rejectLeave=rejectLeave;
window.renderPayrollPage=renderPayrollPage;window.markPayrollPaid=markPayrollPaid;window.switchHRMSTab=switchHRMSTab;

initPage(function() {
  _syncCheckIns();
  renderHRMSOverview();
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(function() {
      _syncCheckIns();
      renderHRMSOverview();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('hrmsEmployees',   function() { renderHRMSOverview(); });
        dbSubscribe('hrmsLeaves',      function() { renderHRMSOverview(); });
        dbSubscribe('hrmsCheckIns',    function() { _syncCheckIns(); renderHRMSOverview(); });
        dbSubscribe('hrmsLocRequests', function() { renderLocApprovals(); });
      }
    }, 5000);
  }
});
