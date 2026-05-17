// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Employee Self-Service HRMS Portal
//  Features: Attendance calendar, Photo check-in, GPS geofence,
//            Location approval workflow, Leave, Payslip, Profile
// ═══════════════════════════════════════════════════════════════

let _selfEmp = null;       // current employee record
let _selfMonth = '';       // 'YYYY-MM'
let _cameraStream = null;  // MediaStream for camera
let _pendingPhoto = null;  // base64 captured photo
let _pendingLat = null;
let _pendingLng = null;
let _checkingIn = true;    // true=checkin, false=checkout

// ── Auth guard ──
(function() {
  const sess = sessionStorage.getItem('wanago_session');
  if (!sess) { window.location.replace('../index.html'); }
})();

// ── Sync hrmsCheckIns array → hrmsAttendance object ──
function _syncAttendance() {
  if (!DB.hrmsAttendance) DB.hrmsAttendance = {};
  (DB.hrmsCheckIns || []).forEach(rec => {
    if (rec && rec.id) DB.hrmsAttendance[rec.id] = rec;
  });
}

// ── Haversine distance (meters) ──
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ── Check geofence against all office locations ──
function checkGeofence(lat, lng) {
  const offices = (DB.settings && DB.settings.officeLocations) || [];
  if (!offices.length) return { allowed: true, office: null, distance: 0 };
  let nearest = null, minDist = Infinity;
  for (const off of offices) {
    if (!off.lat || !off.lng) continue;
    const d = getDistanceMeters(lat, lng, Number(off.lat), Number(off.lng));
    if (d < minDist) { minDist = d; nearest = off; }
  }
  if (!nearest) return { allowed: true, office: null, distance: 0 };
  const radius = Number(nearest.radiusMeters || 200);
  return { allowed: minDist <= radius, office: nearest, distance: Math.round(minDist), radius };
}

// ── Find this employee's record ──
function findMyEmployee() {
  try {
    const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
    const emps = DB.hrmsEmployees || [];
    return emps.find(e => e.email && e.email.toLowerCase() === (sess.email||'').toLowerCase())
        || emps.find(e => e.id === sess.uid)
        || null;
  } catch(e) { return null; }
}

// ── Initialize page ──
function initSelfPage() {
  _selfMonth = (typeof today === 'function' ? today() : new Date().toISOString().slice(0,10)).slice(0,7);

  // Retry finding employee (Firestore may not be loaded yet)
  function tryInit(attempts) {
    _selfEmp = findMyEmployee();
    if (!_selfEmp && attempts > 0) {
      setTimeout(() => tryInit(attempts - 1), 800);
      return;
    }
    if (!_selfEmp) {
      // Use session data as fallback
      try {
        const s = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
        _selfEmp = { id: s.uid, name: s.name, email: s.email, role: s.role, empId: s.uid, _fallback: true };
      } catch(e) {}
    }
    renderSelfSidebar();
    renderMyAttendanceCalendar(_selfMonth);
    checkCurrentLocStatus();
    // Show HR Admin link for managers/admins
    try {
      const s = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
      const adminRoles = ['founder_ceo','admin','reporting_manager'];
      if (adminRoles.includes(s.systemRole)) {
        const link = document.getElementById('nav-hrms-admin');
        if (link) link.style.display = '';
      }
    } catch(e) {}
  }

  // Wait for DB to be ready
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(() => { _syncAttendance(); tryInit(3); }, 5000);
  } else {
    setTimeout(() => tryInit(3), 300);
  }
}

// ── Render sidebar profile ──
function renderSelfSidebar() {
  if (!_selfEmp) return;
  const e = _selfEmp;
  const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
  const company = (DB.settings && DB.settings.companyName) || sess.company || 'Wanago';

  const initEl = document.getElementById('self-avatar-initials');
  if (initEl) initEl.textContent = (e.name || 'U').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  const setTxt = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || '—'; };
  setTxt('self-disp-name', e.name);
  setTxt('topbar-disp-name', e.name);
  setTxt('self-disp-company', company);
  setTxt('self-disp-role', e.role || e.designation || '—');
  setTxt('self-disp-empid', '#' + (e.empId || e.id || ''));
  setTxt('topbar-disp-sub', (e.role || '') + (company ? ' · ' + company : ''));

  // Last check-in
  const todayKey = (e.id || '') + '_' + (typeof today === 'function' ? today() : new Date().toISOString().slice(0,10));
  const todayAtt = (DB.hrmsAttendance || {})[todayKey];
  const lcEl = document.getElementById('self-last-checkin');
  if (lcEl) lcEl.textContent = todayAtt?.checkIn
    ? 'Last Check In: ' + (typeof formatDate === 'function' ? formatDate(todayAtt.date) : todayAtt.date) + ', ' + todayAtt.checkIn
    : 'Not checked in today';

  // Main button
  const btn = document.getElementById('self-main-btn');
  if (btn) {
    if (todayAtt?.checkIn && !todayAtt?.checkOut) {
      btn.textContent = 'Check Out';
      btn.className = 'hs-checkin-btn out';
    } else if (todayAtt?.checkOut) {
      btn.textContent = 'Checked Out ✓';
      btn.disabled = true;
      btn.style.opacity = '0.5';
    } else {
      btn.textContent = 'Check In';
      btn.className = 'hs-checkin-btn in';
    }
  }
}

// ── Show a content section ──
function showSelfSection(name, navEl) {
  document.querySelectorAll('.hs-section').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.hs-nav-item').forEach(el => el.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) sec.classList.add('active');
  if (navEl) navEl.classList.add('active');

  if (name === 'attendance') renderMyAttendanceCalendar(_selfMonth);
  if (name === 'leaves')     renderMyLeaveBalance();
  if (name === 'payslip')    renderMyPayslip();
  if (name === 'ctc')        renderMyCTC();
  if (name === 'profile')    renderMyProfile();
}

// ── Month navigation ──
function changeMonth(delta) {
  const [y, m] = _selfMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  _selfMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  renderMyAttendanceCalendar(_selfMonth);
  const lbl = document.getElementById('att-month-label');
  if (lbl) lbl.textContent = d.toLocaleDateString('en-IN', { month:'long', year:'numeric' });
}

// ── Render attendance calendar ──
function renderMyAttendanceCalendar(month) {
  if (!month) return;
  _selfMonth = month;

  const lbl = document.getElementById('att-month-label');
  if (lbl) {
    const [y, m] = month.split('-').map(Number);
    lbl.textContent = new Date(y, m-1, 1).toLocaleDateString('en-IN', { month:'long', year:'numeric' });
  }

  if (!_selfEmp) { setTimeout(() => renderMyAttendanceCalendar(month), 500); return; }

  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const firstDayOfWeek = new Date(year, mon - 1, 1).getDay();
  const todayStr = typeof today === 'function' ? today() : new Date().toISOString().slice(0,10);
  const todayDate = new Date(todayStr); todayDate.setHours(0,0,0,0);

  const weeklyOff = (DB.settings && DB.settings.weeklyOff) || [0];
  const holidays  = (DB.settings && DB.settings.holidays)  || [];
  const shift     = (DB.settings && DB.settings.workShift)  || '09:00 - 18:00';

  // Build attendance lookup for this employee this month
  const attRecs = {};
  const prefix = _selfEmp.id + '_' + month;
  Object.entries(DB.hrmsAttendance || {}).forEach(([key, rec]) => {
    if (key.startsWith(prefix)) attRecs[rec.date] = rec;
  });

  // Approved leaves
  const myLeaves = (DB.hrmsLeaves || []).filter(l =>
    l.empId === _selfEmp.id && l.status === 'approved' &&
    l.startDate <= month + '-31' && l.endDate >= month + '-01'
  );

  let expectedMins = 0, actualMins = 0, presentDays = 0, absentDays = 0;

  // Build calendar grid
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = month + '-' + String(d).padStart(2, '0');
    const dayDate = new Date(year, mon - 1, d); dayDate.setHours(0,0,0,0);
    const dow     = dayDate.getDay();
    const att     = attRecs[dateStr];
    const isWO    = weeklyOff.includes(dow);
    const isHol   = holidays.some(h => h.date === dateStr);
    const isLeave = myLeaves.some(l => dateStr >= l.startDate && dateStr <= l.endDate);
    const isPast  = dayDate < todayDate;
    const isToday = dateStr === todayStr;

    let status = '';
    let checkInTime = '', checkOutTime = '', totalHours = '', photoSrc = '', locData = null;

    if (isWO) {
      status = 'wo';
    } else if (isHol) {
      status = 'ho';
    } else if (isLeave) {
      status = 'leave';
    } else if (att?.checkIn) {
      status = 'present'; presentDays++;
      checkInTime  = att.checkIn;
      checkOutTime = att.checkOut || '';
      photoSrc     = att.checkInPhoto || '';
      if (att.checkInLat) locData = { lat: att.checkInLat, lng: att.checkInLng };
      if (att.checkIn && att.checkOut) {
        const [ih, im] = att.checkIn.split(':').map(Number);
        const [oh, om] = att.checkOut.split(':').map(Number);
        const mins = (oh * 60 + om) - (ih * 60 + im);
        if (mins > 0) {
          actualMins += mins;
          totalHours = Math.floor(mins/60) + ':' + String(mins % 60).padStart(2,'0');
        }
      }
      if (!isWO && !isHol) expectedMins += 9 * 60;
    } else if ((isPast || isToday) && !isWO && !isHol && !isLeave) {
      status = 'absent'; if (isPast) absentDays++;
      expectedMins += 9 * 60;
    }

    cells.push({ d, dateStr, status, checkInTime, checkOutTime, totalHours, isToday, isWO, photoSrc, locData, att, isPast, shift });
  }

  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null);

  // Stats strip
  const expH = Math.floor(expectedMins/60), expM = expectedMins % 60;
  const actH = Math.floor(actualMins/60),   actM = actualMins % 60;
  const setTxt = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  setTxt('att-expected', expH + ' hh ' + String(expM).padStart(2,'0') + ' mm');
  setTxt('att-actual',   actH + ' hh ' + String(actM).padStart(2,'0') + ' mm');
  setTxt('att-present-count', presentDays);

  const statsEl = document.getElementById('att-stats-strip');
  if (statsEl) statsEl.innerHTML = [
    { lbl:'Present', val: presentDays, cls:'' },
    { lbl:'Absent',  val: absentDays,  cls:'red' },
    { lbl:'On Leave',val: myLeaves.reduce((s,l)=>s+Number(l.days||1),0), cls:'amber' },
    { lbl:'Holidays',val: holidays.filter(h=>h.date && h.date.startsWith(month)).length, cls:'' },
  ].map(s=>`<div class="hs-att-stat"><div class="hs-att-stat-val ${s.cls}">${s.val}</div><div class="hs-att-stat-lbl">${s.lbl}</div></div>`).join('');

  // Calendar view
  const STATUS_BADGE = {
    present:{ cls:'p-badge', label:'P' },
    absent: { cls:'a-badge', label:'A' },
    wo:     { cls:'wo-badge', label:'WO' },
    ho:     { cls:'ho-badge', label:'HO' },
    leave:  { cls:'l-badge',  label:'L' },
  };

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const tbody = document.getElementById('att-cal-body');
  if (tbody) tbody.innerHTML = weeks.map(week =>
    '<tr>' + week.map(day => {
      if (!day) return '<td class="att-empty"></td>';
      const sb = STATUS_BADGE[day.status] || {};
      const isT = day.isToday;
      const canCI  = isT && !day.att?.checkIn;
      const canCO  = isT && day.att?.checkIn && !day.att?.checkOut;
      const locIcon = day.locData ? `<span class="att-loc-icon" title="Lat:${day.locData.lat}, Lng:${day.locData.lng}">GPS</span>` : '';
      const photoEl = day.photoSrc ? `<img class="att-photo-thumb" src="${day.photoSrc}" alt="photo">` : '';
      return `<td class="${isT?'att-today':''}${day.status?' att-'+day.status:''}">
        <div class="att-day-num">${isT?`<span class="att-today-ring">${day.d}</span>`:day.d}</div>
        <div class="att-day-shift">${day.isWO?'':day.shift}</div>
        ${day.checkInTime?`<div class="att-day-time">${day.checkInTime}${day.checkOutTime?' → '+day.checkOutTime:''}${locIcon}${photoEl}</div>`:''}
        ${day.totalHours?`<div class="att-day-hours">Total Hours<br><strong>${day.totalHours}</strong></div>`:''}
        ${sb.label?`<div class="att-status-badge ${sb.cls}">${sb.label}</div>`:''}
        ${canCI?`<button class="att-checkin-btn" onclick="openCheckInModal(true)">Check In</button>`:''}
        ${canCO?`<button class="att-checkout-btn" onclick="openCheckInModal(false)">Check Out</button>`:''}
      </td>`;
    }).join('') + '</tr>'
  ).join('');

  // List view
  const listBody = document.getElementById('att-list-body');
  if (listBody) {
    const daysList = cells.filter(c => c !== null).reverse();
    listBody.innerHTML = daysList.map(day => {
      if (!day.status && !day.att) return '';
      const sb = STATUS_BADGE[day.status] || {};
      return `<tr>
        <td style="padding:9px 14px;font-size:12px;font-weight:600">${day.dateStr}</td>
        <td style="padding:9px;font-size:12px">${day.checkInTime||'—'}</td>
        <td style="padding:9px;font-size:12px">${day.checkOutTime||'—'}</td>
        <td style="padding:9px;font-size:12px;font-weight:700">${day.totalHours||'—'}</td>
        <td style="padding:9px">${sb.label?`<span class="att-status-badge ${sb.cls}">${sb.label}</span>`:'—'}</td>
        <td style="padding:9px">${day.locData?`<span style="font-size:11px;color:#134a32">${day.locData.lat}, ${day.locData.lng}</span>`:'—'}</td>
      </tr>`;
    }).filter(Boolean).join('');
  }

  // Toggle view
  const viewSel = document.getElementById('att-view-sel');
  const calWrap  = document.getElementById('att-calendar-wrap');
  const listWrap = document.getElementById('att-list-wrap');
  if (viewSel && calWrap && listWrap) {
    const isListView = viewSel.value === 'list';
    calWrap.style.display  = isListView ? 'none' : '';
    listWrap.style.display = isListView ? '' : 'none';
  }
}

// ── Open check-in/out modal ──
function openCheckInModal(isCheckIn = null) {
  if (!_selfEmp) { showToast('Employee profile not loaded yet.', 'error'); return; }
  const todayKey = _selfEmp.id + '_' + (typeof today === 'function' ? today() : new Date().toISOString().slice(0,10));
  const todayAtt = (DB.hrmsAttendance || {})[todayKey];

  _checkingIn = isCheckIn !== null ? isCheckIn : !(todayAtt?.checkIn && !todayAtt?.checkOut);
  _pendingPhoto = null; _pendingLat = null; _pendingLng = null;

  const title = document.getElementById('checkin-modal-title');
  if (title) title.textContent = _checkingIn ? 'Check In' : 'Check Out';

  const timeInfo = document.getElementById('checkin-time-info');
  if (timeInfo) timeInfo.textContent = 'Time: ' + new Date().toLocaleTimeString('en-IN', {hour:'2-digit', minute:'2-digit'});

  // Show/hide confirm buttons
  document.getElementById('btn-confirm-checkin').style.display  = _checkingIn ? '' : 'none';
  document.getElementById('btn-confirm-checkout').style.display = _checkingIn ? 'none' : '';

  // Reset photo UI
  const vid = document.getElementById('self-cam-vid');
  const thumb = document.getElementById('self-photo-thumb');
  if (vid) vid.style.display = '';
  if (thumb) { thumb.style.display = 'none'; thumb.src = ''; }
  document.getElementById('btn-capture').style.display = '';
  document.getElementById('btn-skip-photo').style.display = '';
  document.getElementById('btn-retake').style.display = 'none';
  document.getElementById('btn-confirm-checkin').disabled = _checkingIn;
  document.getElementById('btn-confirm-checkout').disabled = !_checkingIn;

  // Start camera
  startCamera();

  // Start location detection
  detectLocation();

  if (typeof openModal === 'function') openModal('modal-self-checkin');
}

// ── Camera functions ──
async function startCamera() {
  try {
    _cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 400, height: 300 } });
    const vid = document.getElementById('self-cam-vid');
    if (vid) { vid.srcObject = _cameraStream; vid.style.display = ''; }
  } catch(e) {
    // Camera unavailable - hide camera UI
    const cw = document.getElementById('camera-wrap');
    if (cw) cw.style.display = 'none';
    enableConfirmBtn();
  }
}

function capturePhoto() {
  const vid = document.getElementById('self-cam-vid');
  const canvas = document.getElementById('self-cam-canvas');
  const thumb  = document.getElementById('self-photo-thumb');
  if (!vid || !canvas) return;
  canvas.width = 280; canvas.height = 210;
  canvas.getContext('2d').drawImage(vid, 0, 0, 280, 210);
  _pendingPhoto = canvas.toDataURL('image/jpeg', 0.65);
  stopCamera();
  if (vid) vid.style.display = 'none';
  if (thumb) { thumb.src = _pendingPhoto; thumb.style.display = 'block'; }
  document.getElementById('btn-capture').style.display = 'none';
  document.getElementById('btn-skip-photo').style.display = 'none';
  document.getElementById('btn-retake').style.display = '';
  enableConfirmBtn();
}

function retakePhoto() {
  _pendingPhoto = null;
  const vid = document.getElementById('self-cam-vid');
  const thumb = document.getElementById('self-photo-thumb');
  if (vid) vid.style.display = '';
  if (thumb) { thumb.style.display = 'none'; thumb.src = ''; }
  document.getElementById('btn-capture').style.display = '';
  document.getElementById('btn-skip-photo').style.display = '';
  document.getElementById('btn-retake').style.display = 'none';
  document.getElementById('btn-confirm-checkin').disabled = true;
  document.getElementById('btn-confirm-checkout').disabled = true;
  startCamera();
}

function skipPhoto() {
  _pendingPhoto = null;
  stopCamera();
  const cw = document.getElementById('camera-wrap');
  if (cw) cw.style.display = 'none';
  enableConfirmBtn();
}

function stopCamera() {
  if (_cameraStream) { _cameraStream.getTracks().forEach(t => t.stop()); _cameraStream = null; }
}

function enableConfirmBtn() {
  if (_pendingLat !== null || true) { // also enable if location not yet determined
    const ci = document.getElementById('btn-confirm-checkin');
    const co = document.getElementById('btn-confirm-checkout');
    if (ci) ci.disabled = false;
    if (co) co.disabled = false;
  }
}

// ── Location detection ──
function detectLocation() {
  const locEl = document.getElementById('checkin-loc-status');
  const detEl = document.getElementById('checkin-loc-detail');
  if (locEl) { locEl.className = 'hs-loc-status unknown'; locEl.innerHTML = '<span>Detecting location…</span>'; }

  if (!navigator.geolocation) {
    if (locEl) { locEl.className = 'hs-loc-status unknown'; locEl.innerHTML = '<span>Location not available</span>'; }
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      _pendingLat = pos.coords.latitude;
      _pendingLng = pos.coords.longitude;
      const geo = checkGeofence(_pendingLat, _pendingLng);
      const pill = document.getElementById('self-loc-pill');

      if (!geo.office) {
        if (locEl) { locEl.className = 'hs-loc-status unknown'; locEl.innerHTML = '<span>Location detected (no office set)</span>'; }
        if (pill) { pill.style.display = ''; pill.style.background = '#f3f4f6'; pill.style.color = '#6b7280'; pill.textContent = 'GPS OK'; }
      } else if (geo.allowed) {
        if (locEl) { locEl.className = 'hs-loc-status at-office'; locEl.innerHTML = `<span>At ${geo.office.name} (${geo.distance}m away)</span>`; }
        if (pill) { pill.style.display = ''; pill.style.background = '#dcfce7'; pill.style.color = '#166534'; pill.textContent = 'At Office'; }
        if (detEl) detEl.textContent = `Within ${geo.radius}m geofence`;
      } else {
        if (locEl) { locEl.className = 'hs-loc-status outside'; locEl.innerHTML = `<span>${geo.distance}m from ${geo.office.name} (allowed: ${geo.radius}m)</span>`; }
        if (pill) { pill.style.display = ''; pill.style.background = '#fee2e2'; pill.style.color = '#991b1b'; pill.textContent = 'Outside Office'; }
        if (detEl) detEl.textContent = 'Outside office — you can still check in or request approval.';
      }
      enableConfirmBtn();
    },
    () => {
      if (locEl) { locEl.className = 'hs-loc-status unknown'; locEl.innerHTML = '<span>Location unavailable</span>'; }
      enableConfirmBtn();
    },
    { timeout: 8000, maximumAge: 30000 }
  );
}

// ── Background location check for pill ──
function checkCurrentLocStatus() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition((pos) => {
    const geo = checkGeofence(pos.coords.latitude, pos.coords.longitude);
    const pill = document.getElementById('self-loc-pill');
    if (!pill) return;
    if (!geo.office) { pill.style.display = 'none'; return; }
    pill.style.display = '';
    if (geo.allowed) { pill.style.background='#dcfce7';pill.style.color='#166534';pill.textContent='At Office'; }
    else             { pill.style.background='#fee2e2';pill.style.color='#991b1b';pill.textContent='Outside Office'; }
  }, () => {}, { timeout: 6000, maximumAge: 60000 });
}

// ── Confirm check-in ──
function confirmCheckIn() {
  if (!_selfEmp) return;
  const geo = _pendingLat !== null ? checkGeofence(_pendingLat, _pendingLng) : { allowed: true, office: null };

  // If outside geofence and offices are configured → show approval dialog
  if (!geo.allowed && (DB.settings.officeLocations||[]).length) {
    stopCamera();
    if (typeof closeModal === 'function') closeModal('modal-self-checkin');
    const distEl = document.getElementById('loc-approval-dist-text');
    if (distEl) distEl.textContent = `You are ${geo.distance}m from ${geo.office?.name||'office'} (allowed: ${geo.radius}m). A manager approval is required.`;
    const latEl = document.getElementById('loc-approval-lat'); if (latEl) latEl.value = _pendingLat || '';
    const lngEl = document.getElementById('loc-approval-lng'); if (lngEl) lngEl.value = _pendingLng || '';
    if (typeof openModal === 'function') openModal('modal-loc-approval');
    return;
  }

  _doSaveCheckIn();
}

function confirmCheckOut() {
  _doSaveCheckOut();
}

function _doSaveCheckIn() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().slice(0, 10);
  const attKey  = _selfEmp.id + '_' + dateStr;

  if (!DB.hrmsAttendance) DB.hrmsAttendance = {};
  if (!DB.hrmsAttendance[attKey]) DB.hrmsAttendance[attKey] = { id: attKey, empId: _selfEmp.id, date: dateStr };
  const rec = DB.hrmsAttendance[attKey];

  rec.checkIn   = timeStr;
  rec.checkInTs = now.toISOString();
  rec.status    = 'present';
  if (_pendingLat !== null) { rec.checkInLat = _pendingLat.toFixed(5); rec.checkInLng = _pendingLng.toFixed(5); }
  if (_pendingPhoto) rec.checkInPhoto = _pendingPhoto;
  rec.locStatus = _pendingLat !== null ? 'gps_captured' : 'no_gps';

  if (typeof dbSave === 'function') dbSave('hrmsCheckIns', rec).catch(() => {});
  if (typeof saveDB === 'function') saveDB();

  stopCamera();
  if (typeof closeModal === 'function') closeModal('modal-self-checkin');
  if (typeof showToast === 'function') showToast('Checked in at ' + timeStr);
  renderSelfSidebar();
  renderMyAttendanceCalendar(_selfMonth);
}

function _doSaveCheckOut() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toISOString().slice(0, 10);
  const attKey  = _selfEmp.id + '_' + dateStr;

  if (!DB.hrmsAttendance) DB.hrmsAttendance = {};
  const rec = DB.hrmsAttendance[attKey];
  if (!rec) { if (typeof showToast==='function') showToast('No check-in found for today','error'); return; }

  rec.checkOut   = timeStr;
  rec.checkOutTs = now.toISOString();
  if (_pendingLat !== null) { rec.checkOutLat = _pendingLat.toFixed(5); rec.checkOutLng = _pendingLng.toFixed(5); }
  if (_pendingPhoto) rec.checkOutPhoto = _pendingPhoto;

  if (typeof dbSave === 'function') dbSave('hrmsCheckIns', rec).catch(() => {});
  if (typeof saveDB === 'function') saveDB();

  stopCamera();
  if (typeof closeModal === 'function') closeModal('modal-self-checkin');
  if (typeof showToast === 'function') showToast('Checked out at ' + timeStr);
  renderSelfSidebar();
  renderMyAttendanceCalendar(_selfMonth);
}

// ── Location approval request ──
function submitLocApproval() {
  const reason = (document.getElementById('loc-approval-reason')?.value || '').trim();
  const lat    = document.getElementById('loc-approval-lat')?.value;
  const lng    = document.getElementById('loc-approval-lng')?.value;
  const errEl  = document.getElementById('loc-approval-error');

  if (!reason) { if (errEl) { errEl.textContent = 'Please provide a reason.'; errEl.style.display = ''; } return; }
  if (errEl) errEl.style.display = 'none';

  if (!DB.hrmsLocRequests) DB.hrmsLocRequests = [];
  const dateStr = new Date().toISOString().slice(0,10);
  const timeStr = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const req = {
    id: typeof uid === 'function' ? uid() : Date.now().toString(36),
    empId: _selfEmp.id,
    empName: _selfEmp.name,
    empRole: _selfEmp.role || '',
    date: dateStr,
    time: timeStr,
    lat: lat || '', lng: lng || '',
    photo: _pendingPhoto || null,
    reason,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  DB.hrmsLocRequests.push(req);
  if (typeof dbSave === 'function') dbSave('hrmsLocRequests', req).catch(() => {});
  if (typeof saveDB === 'function') saveDB();
  if (typeof closeModal === 'function') closeModal('modal-loc-approval');
  if (typeof showToast === 'function') showToast('📨 Location approval request sent to your manager');
}

// ── Leave balance ──
function renderMyLeaveBalance() {
  if (!_selfEmp) return;
  const myLeaves = (DB.hrmsLeaves || []).filter(l => l.empId === _selfEmp.id);
  const approvedLeaves = myLeaves.filter(l => l.status === 'approved');
  const annualLeave = _selfEmp.annualLeave || 12;

  const usedByType = {};
  approvedLeaves.forEach(l => { usedByType[l.leaveType] = (usedByType[l.leaveType] || 0) + Number(l.days || 1); });

  const types = [
    { key:'casual',   label:'Casual Leave',   total:12 },
    { key:'sick',     label:'Sick Leave',      total:7  },
    { key:'earned',   label:'Earned Leave',    total:annualLeave },
    { key:'maternity',label:'Maternity Leave', total:26 },
    { key:'unpaid',   label:'Unpaid Leave',    total:999 },
  ];

  const balEl = document.getElementById('leave-balance-cards');
  if (balEl) balEl.innerHTML = types.map(t => {
    const used = usedByType[t.key] || 0;
    const bal  = t.total === 999 ? '—' : Math.max(0, t.total - used);
    return `<div class="hs-leave-card">
      <div class="hs-leave-card-type">${t.label}</div>
      <div class="hs-leave-card-val">${bal}</div>
      <div class="hs-leave-card-sub">${used} used${t.total!==999?' / '+t.total+' total':''}</div>
    </div>`;
  }).join('');

  const tbody = document.getElementById('self-leave-tbody');
  if (!tbody) return;
  if (!myLeaves.length) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px;color:#9ca3af">No leave records found</td></tr>'; return; }
  const STATUS_CLS = { pending:'#fffbeb:#92400e', approved:'#dcfce7:#166534', rejected:'#fee2e2:#991b1b' };
  tbody.innerHTML = [...myLeaves].reverse().map(l => {
    const sc = (STATUS_CLS[l.status] || '#f3f4f6:#374151').split(':');
    return `<tr>
      <td style="padding:9px 14px;font-size:12.5px;font-weight:600">${l.leaveType||'casual'}</td>
      <td style="padding:9px;font-size:12px">${l.startDate||'—'}</td>
      <td style="padding:9px;font-size:12px">${l.endDate||'—'}</td>
      <td style="padding:9px;font-size:13px;font-weight:700;text-align:center">${l.days||'—'}</td>
      <td style="padding:9px;font-size:12px;color:#6b7280">${l.reason||'—'}</td>
      <td style="padding:9px"><span style="background:${sc[0]};color:${sc[1]};font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px">${l.status}</span></td>
    </tr>`;
  }).join('');
}

// ── Apply leave (self) ──
function openSelfLeaveModal() {
  ['sl-from','sl-to','sl-reason'].forEach(id => { const el=document.getElementById(id); if(el)el.value=''; });
  const p = document.getElementById('sl-days-preview'); if(p) p.textContent = '';
  if (typeof openModal === 'function') openModal('modal-self-leave');
}

function calcSLDays() {
  const s = document.getElementById('sl-from')?.value;
  const e = document.getElementById('sl-to')?.value;
  if (!s || !e) return;
  const days = Math.max(1, Math.ceil((new Date(e) - new Date(s)) / 86400000) + 1);
  const p = document.getElementById('sl-days-preview'); if(p) p.textContent = days + ' day' + (days>1?'s':'');
}

function saveSelfLeave() {
  if (!_selfEmp) return;
  const type  = document.getElementById('sl-type')?.value || 'casual';
  const start = document.getElementById('sl-from')?.value;
  const end   = document.getElementById('sl-to')?.value;
  const reason= document.getElementById('sl-reason')?.value || '';
  const errEl = document.getElementById('sl-error');
  if (!start || !end) { if(errEl){errEl.textContent='Start and end dates are required.';errEl.style.display='';} return; }
  if (errEl) errEl.style.display = 'none';
  const days = Math.max(1, Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1);
  const rec = {
    id: typeof uid==='function'?uid():Date.now().toString(36),
    empId: _selfEmp.id,
    empName: _selfEmp.name,
    leaveType: type,
    startDate: start, endDate: end, days, reason,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  if (!DB.hrmsLeaves) DB.hrmsLeaves = [];
  DB.hrmsLeaves.push(rec);
  if (typeof dbSave === 'function') dbSave('hrmsLeaves', rec).catch(() => {});
  if (typeof saveDB === 'function') saveDB();
  if (typeof closeModal === 'function') closeModal('modal-self-leave');
  if (typeof showToast === 'function') showToast('Leave request submitted! Awaiting manager approval.');
  renderMyLeaveBalance();
}

// ── Payslip ──
function renderMyPayslip() {
  if (!_selfEmp) return;
  const payslips = (DB.hrmsPayroll || []).filter(p => p.empId === _selfEmp.id).sort((a,b) => b.month.localeCompare(a.month));
  const el = document.getElementById('payslip-list');
  if (!el) return;
  if (!payslips.length) { el.innerHTML = '<div style="text-align:center;padding:40px;color:#9ca3af">No payslips available yet.</div>'; return; }
  el.innerHTML = payslips.map(p => `
    <div class="hs-payslip-row">
      <div style="width:36px;height:36px;background:#f0fdf4;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px">📄</div>
      <div class="hs-payslip-month">${p.month}</div>
      <div class="hs-payslip-amt">${typeof formatMoney==='function'?formatMoney(p.netSalary||0):'₹'+(p.netSalary||0).toLocaleString('en-IN')}</div>
      <span class="hs-payslip-status ${p.status==='paid'?'paid':'pending'}">${p.status==='paid'?'Paid':'Pending'}</span>
      <button class="hs-payslip-dl" onclick="downloadPayslip('${p.id}')">⬇ Download</button>
    </div>`).join('');
}

function downloadPayslip(id) {
  const p = (DB.hrmsPayroll || []).find(x => x.id === id);
  if (!p || !_selfEmp) return;
  const e = _selfEmp;
  const gross = (e.salary||0) + (e.hra||0) + (e.ta||0);
  const pf = Math.round((e.salary||0)*0.12);
  const html = `<html><head><title>Payslip ${p.month}</title>
  <style>body{font-family:Arial,sans-serif;padding:30px;max-width:600px;margin:auto}h2{color:#134a32}table{width:100%;border-collapse:collapse;margin-top:10px}td{padding:7px 10px;border:1px solid #e5e7eb;font-size:13px}.total{font-weight:700;color:#134a32}</style></head>
  <body>
    <h2>Salary Slip — ${p.month}</h2>
    <p><strong>${e.name}</strong> · ${e.empId||''} · ${e.role||''}</p>
    <p style="color:#6b7280;font-size:12px">${(DB.settings&&DB.settings.companyName)||'Wanago'}</p>
    <table>
      <tr><td>Basic Salary</td><td>₹${(e.salary||0).toLocaleString('en-IN')}</td><td>PF (12%)</td><td style="color:#dc2626">₹${pf.toLocaleString('en-IN')}</td></tr>
      <tr><td>HRA</td><td>₹${(e.hra||0).toLocaleString('en-IN')}</td><td></td><td></td></tr>
      <tr><td>Travel Allowance</td><td>₹${(e.ta||0).toLocaleString('en-IN')}</td><td></td><td></td></tr>
      <tr><td class="total">Gross Pay</td><td class="total">₹${gross.toLocaleString('en-IN')}</td><td class="total">Net Pay</td><td class="total">₹${(p.netSalary||0).toLocaleString('en-IN')}</td></tr>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#6b7280">Paid on: ${p.paidDate||'—'} · This is a computer generated payslip.</p>
  </body></html>`;
  const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print();
}

// ── CTC ──
function renderMyCTC() {
  if (!_selfEmp) return;
  const e = _selfEmp;
  const gross  = (e.salary||0)+(e.hra||0)+(e.ta||0);
  const pf     = Math.round((e.salary||0)*0.12);
  const annual = gross * 12;
  const el = document.getElementById('ctc-content');
  if (!el) return;
  el.innerHTML = `
    <div class="hs-profile-section">
      <div class="hs-profile-section-title">Monthly CTC Breakdown</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        ${[['Basic Salary','₹'+(e.salary||0).toLocaleString('en-IN')],['HRA','₹'+(e.hra||0).toLocaleString('en-IN')],['Travel Allowance','₹'+(e.ta||0).toLocaleString('en-IN')],['Gross Pay','₹'+gross.toLocaleString('en-IN')],['PF Deduction (12%)','₹'+pf.toLocaleString('en-IN')],['Net Monthly Pay','₹'+(gross-pf).toLocaleString('en-IN')]].map(([l,v],i)=>`<div class="hs-profile-field" style="${i>=4?'border-top:1px solid #f3f4f6;padding-top:10px':''}"><label>${l}</label><div class="hs-pf-val">${v}</div></div>`).join('')}
      </div>
    </div>
    <div class="hs-profile-section">
      <div class="hs-profile-section-title">Annual CTC</div>
      <div style="font-size:28px;font-weight:800;color:#134a32">₹${annual.toLocaleString('en-IN')}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px">Gross annual package (before deductions)</div>
    </div>`;
}

// ── Profile ──
function renderMyProfile() {
  if (!_selfEmp) return;
  const e = _selfEmp;
  const el = document.getElementById('profile-content');
  if (!el) return;
  const row = (label, val) => `<div class="hs-profile-field"><label>${label}</label><div class="hs-pf-val">${val||'—'}</div></div>`;
  el.innerHTML = `
    <div class="hs-profile-section">
      <div class="hs-profile-section-title">Personal Information</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${row('Full Name', e.name)}${row('Employee ID', e.empId||e.id)}${row('Department', e.department||e.dept)}${row('Designation', e.role||e.designation)}${row('Date of Birth', e.dob)}${row('Joining Date', e.joinDate)}
      </div>
    </div>
    <div class="hs-profile-section">
      <div class="hs-profile-section-title">Contact</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${row('Phone', e.phone)}${row('Email', e.email)}
      </div>
    </div>
    <div class="hs-profile-section">
      <div class="hs-profile-section-title">Bank & Documents</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
        ${row('Bank', e.bankName)}${row('Account No', e.accNo)}${row('IFSC', e.ifsc)}${row('PAN', e.pan)}${row('PF No', e.pfNo)}
      </div>
    </div>`;
}

// ── Regularization request ──
function openRegularizationModal() {
  document.getElementById('reg-date').value = typeof today==='function'?today():'';
  ['reg-checkin','reg-checkout','reg-reason'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const e = document.getElementById('reg-error'); if(e)e.style.display='none';
  if(typeof openModal==='function') openModal('modal-regularization');
}

function submitRegularization() {
  if (!_selfEmp) return;
  const date    = document.getElementById('reg-date')?.value;
  const checkIn = document.getElementById('reg-checkin')?.value;
  const checkOut= document.getElementById('reg-checkout')?.value;
  const reason  = document.getElementById('reg-reason')?.value?.trim();
  const errEl   = document.getElementById('reg-error');
  if (!date || !reason) { if(errEl){errEl.textContent='Date and reason are required.';errEl.style.display='';} return; }
  if (errEl) errEl.style.display = 'none';
  const req = {
    id: typeof uid==='function'?uid():Date.now().toString(36),
    type: 'regularization',
    empId: _selfEmp.id,
    empName: _selfEmp.name,
    date, checkIn: checkIn||null, checkOut: checkOut||null,
    reason, status: 'pending',
    createdAt: new Date().toISOString()
  };
  if (!DB.hrmsLocRequests) DB.hrmsLocRequests = [];
  DB.hrmsLocRequests.push(req);
  if (typeof dbSave==='function') dbSave('hrmsLocRequests', req).catch(()=>{});
  if (typeof saveDB==='function') saveDB();
  if (typeof closeModal==='function') closeModal('modal-regularization');
  if (typeof showToast==='function') showToast('Regularization request submitted!');
}

// ── Weekly breakup popup ──
function showWeeklyBreakup() {
  if (!_selfEmp) return;
  const [year, mon] = _selfMonth.split('-').map(Number);
  const daysInMonth = new Date(year, mon, 0).getDate();
  const weeklyOff   = (DB.settings?.weeklyOff) || [0];
  const attRecs     = {};
  const prefix = _selfEmp.id + '_' + _selfMonth;
  Object.entries(DB.hrmsAttendance || {}).forEach(([k, v]) => { if (k.startsWith(prefix)) attRecs[v.date] = v; });

  let html = '<div style="font-family:Arial,sans-serif;padding:20px"><h3 style="color:#134a32">Weekly Hours — ' + _selfMonth + '</h3><table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:#f9fafb"><th style="padding:7px;text-align:left;border:1px solid #e5e7eb">Week</th><th>Hours Worked</th><th>Days Present</th></tr>';
  let week = 1, weekMins = 0, weekDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = _selfMonth + '-' + String(d).padStart(2,'0');
    const dow = new Date(year, mon-1, d).getDay();
    const att = attRecs[dateStr];
    if (att?.checkIn && att?.checkOut) {
      const [ih,im] = att.checkIn.split(':').map(Number);
      const [oh,om] = att.checkOut.split(':').map(Number);
      const m = (oh*60+om)-(ih*60+im);
      if (m>0){weekMins+=m;weekDays++;}
    }
    if (dow === 6 || d === daysInMonth) {
      html += `<tr><td style="padding:7px;border:1px solid #e5e7eb">Week ${week}</td><td style="padding:7px;border:1px solid #e5e7eb;text-align:center;font-weight:700">${Math.floor(weekMins/60)}h ${weekMins%60}m</td><td style="padding:7px;border:1px solid #e5e7eb;text-align:center">${weekDays}</td></tr>`;
      week++; weekMins = 0; weekDays = 0;
    }
  }
  html += '</table></div>';
  const w = window.open('','_blank','width=500,height=400'); w.document.write(html); w.document.close();
}

// ── Expose to window ──
window.openCheckInModal   = openCheckInModal;
window.capturePhoto       = capturePhoto;
window.retakePhoto        = retakePhoto;
window.skipPhoto          = skipPhoto;
window.confirmCheckIn     = confirmCheckIn;
window.confirmCheckOut    = confirmCheckOut;
window.submitLocApproval  = submitLocApproval;
window.openSelfLeaveModal = openSelfLeaveModal;
window.calcSLDays         = calcSLDays;
window.saveSelfLeave      = saveSelfLeave;
window.downloadPayslip    = downloadPayslip;
window.showWeeklyBreakup  = showWeeklyBreakup;
window.showSelfSection    = showSelfSection;
window.changeMonth        = changeMonth;
window.openRegularizationModal = openRegularizationModal;
window.submitRegularization    = submitRegularization;
window.renderMyAttendanceCalendar = renderMyAttendanceCalendar;
window._selfMonth = _selfMonth;

// ── Boot ──
(function() {
  const sess = sessionStorage.getItem('wanago_session');
  if (!sess) { window.location.replace('../index.html'); return; }
  if (typeof waitForFirestore === 'function') {
    waitForFirestore(() => {
      _syncAttendance();
      initSelfPage();
      if (typeof dbSubscribe === 'function') {
        dbSubscribe('hrmsEmployees', () => { _selfEmp = findMyEmployee(); renderSelfSidebar(); });
        dbSubscribe('hrmsCheckIns',  () => { _syncAttendance(); renderMyAttendanceCalendar(_selfMonth); });
        dbSubscribe('hrmsLeaves',    () => { const s=document.getElementById('section-leaves'); if(s?.classList.contains('active')) renderMyLeaveBalance(); });
      }
    }, 5000);
  } else {
    setTimeout(initSelfPage, 400);
  }
})();
