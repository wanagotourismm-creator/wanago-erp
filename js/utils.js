// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Shared Utilities
//  Data layer, formatters, modal/toast helpers
// ═══════════════════════════════════════════════════════════════


// ═══════════════════════════════════════════════════════════════
//  XSS PROTECTION — HTML Escape Functions
//  ALWAYS use esc() when inserting user data into innerHTML.
//  Never use raw ${user.name} inside innerHTML template literals.
// ═══════════════════════════════════════════════════════════════

/**
 * Escape user data before inserting into innerHTML.
 * Prevents XSS attacks from malicious names, notes, destinations etc.
 *
 * Usage:  innerHTML = `<div>${esc(lead.name)}</div>`
 * NOT:    innerHTML = `<div>${lead.name}</div>`  ← XSS vulnerability
 */
function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Escape for use inside HTML attribute values.
 * Usage: `<input value="${escAttr(user.name)}">`
 */
function escAttr(str) {
  return esc(str);
}

/**
 * Sanitize a URL — only allow http/https to prevent javascript: XSS
 * Usage: `<a href="${escUrl(lead.website)}">`
 */
function escUrl(str) {
  if (!str) return '#';
  const s = String(str).trim();
  if (/^javascript:/i.test(s)) return '#';
  if (/^data:/i.test(s)) return '#';
  return s;
}

window.esc     = esc;
window.escAttr = escAttr;
window.escUrl  = escUrl;

// ── DATA LAYER ──
// Firestore is the live shared store. localStorage is kept as an immediate
// safety cache so records survive refreshes while cloud sync is still pending.
const STORE_KEY = 'wanago_erp_v3';
const STORE_DIRTY_KEY = 'wanago_erp_v3_dirty';

function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultDB();
    return mergeDefaults(defaultDB(), JSON.parse(raw));
  } catch(e) {
    return defaultDB();
  }
}

function mergeDefaults(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  Object.keys(saved).forEach(function(k) {
    if (saved[k] && typeof saved[k] === 'object' && !Array.isArray(saved[k]) &&
        base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
      base[k] = mergeDefaults(base[k], saved[k]);
    } else {
      base[k] = saved[k];
    }
  });
  return base;
}

function defaultDB() {
  return {
    leads: [], customers: [], quotations: [], packages: [], bookings: [],
    invoices: [], payments: [], expenses: [], campaigns: [], segments: [], activities: [], tickets: [],
    hrmsEmployees: [], hrmsAttendance: {}, hrmsLeaves: [], hrmsPayroll: [], hrmsCheckIns: [], hrmsLocRequests: [],
    itineraries: [],
    policies: [], tasks: [], rewards: [], pointsLog: [],
    counters: { leads: 0, bookings: 2000, invoices: 0, payments: 0, campaigns: 0, packages: 0 },
    settings: {
      companyName: '', address: '', phone: '', email: '', website: '',
      gstEnabled: false, gstin: '', gstRate: 5, gstType: 'cgst_sgst', state: '',
      bankName: '', accountNo: '', ifsc: '', upi: '',
      brandColor: '#134a32', currency: 'INR', dateFormat: 'DD/MM/YYYY', timezone: 'Asia/Kolkata',
      invoicePrefix: 'INV', invoiceStartNo: 1001, quotePrefix: 'QT', receiptPrefix: 'RCP',
      invoiceFooter: 'Thank you for choosing Wanago!', invoiceTerms: '',
      depositPercent: 30, commissionPercent: 5, cancellationPolicy: '', autoAssignLeads: false,
      leadSources: ['Instagram','Facebook','WhatsApp','Walk-in','Referral','Website','Google','YouTube','TV Ad','Cold Call'],
      businessHours: { mon:{open:true,start:'09:00',end:'18:00'}, tue:{open:true,start:'09:00',end:'18:00'}, wed:{open:true,start:'09:00',end:'18:00'}, thu:{open:true,start:'09:00',end:'18:00'}, fri:{open:true,start:'09:00',end:'18:00'}, sat:{open:true,start:'09:00',end:'14:00'}, sun:{open:false,start:'09:00',end:'18:00'} },
      fuDays: 1, invDays: 3, notifyLeadTo: 'manager', notifyPaymentTo: 'finance',
      agents: [],
      offices: [{ id:'o1', name:'Head Office', code:'HO', address:'', phone:'', active:true, createdAt:new Date().toISOString() }],
      officeLocations: [],
      workShift: '09:00 - 18:00',
      weeklyOff: [0],
      holidays: [],
      team: []
    }
  };
}

function saveDB(opts) {
  // opts.silent = true → update localStorage cache only, no cloud push, no dirty flag.
  // Used for initialization writes so every page load doesn't trigger a full _pushAll().
  const silent = opts && opts.silent;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(DB));
    if (!silent) localStorage.setItem(STORE_DIRTY_KEY, '1');
  } catch(e) {
    console.warn('[saveDB] local cache failed:', e.message);
  }
  // _fsPushDB is defined in firestore.js and pushes the local cache to Firestore.
  if (!silent && typeof window._fsPushDB === 'function') window._fsPushDB();
}

let DB = loadDB();

// ── OFFICE SYSTEM ──
const OFFICE_ALL = '*';
const SCOPED_COLLECTIONS = ['leads','customers','quotations','packages','bookings','invoices','payments','expenses','campaigns','segments','hrmsEmployees','hrmsLeaves','hrmsPayroll'];
const ALL_ACCESS_ROLES = ['founder','ceo'];
let currentOfficeId = OFFICE_ALL;

const SYSTEM_ROLES = { founder_ceo:'Founder / CEO', admin:'Admin', reporting_manager:'Reporting Manager', employee:'Employee' };
const ROLE_TO_SYSTEM_ROLE = {
  founder:'founder_ceo', ceo:'founder_ceo', co_founder:'founder_ceo', director:'founder_ceo',
  branch_manager:'admin', general_manager:'admin',
  team_lead:'reporting_manager', senior_manager:'reporting_manager',
  sales_manager:'reporting_manager', marketing_manager:'reporting_manager',
  operations_manager:'reporting_manager', finance_manager:'reporting_manager',
};

const DEPT_LABELS = { leadership:'Leadership', management:'Management', sales:'Sales', operations:'Operations', finance:'Finance', marketing:'Marketing' };

function ensureOfficeSchema() {
  DB.settings = DB.settings || {};
  if (!Array.isArray(DB.settings.offices) || DB.settings.offices.length === 0) {
    DB.settings.offices = [{ id:'o1', name:'Head Office', code:'HO', address:'', phone:'', active:true, createdAt:new Date().toISOString() }];
  }
  const defaultOfficeId = DB.settings.offices[0].id;
  (DB.settings.team || []).forEach(m => {
    if (!m.officeId) m.officeId = ALL_ACCESS_ROLES.includes(m.role) ? OFFICE_ALL : defaultOfficeId;
  });
  SCOPED_COLLECTIONS.forEach(coll => {
    if (!Array.isArray(DB[coll])) return;
    DB[coll].forEach(rec => { if (!rec.officeId) rec.officeId = defaultOfficeId; });
  });
}

function hasAllOfficesAccess(user) {
  if (!user) return false;
  const sr = user.systemRole || ROLE_TO_SYSTEM_ROLE[user.role] || 'employee';
  return sr === 'founder_ceo' || user.officeId === OFFICE_ALL;
}

function scoped(collection) {
  const data = DB[collection] || [];
  if (!currentOfficeId || currentOfficeId === OFFICE_ALL) return data;
  const defaultOid = (DB.settings.offices || [])[0]?.id || null;
  return data.filter(r => { const oid = r.officeId || defaultOid; return oid === currentOfficeId; });
}

function officeIdForNewRecord() {
  if (currentOfficeId && currentOfficeId !== OFFICE_ALL) return currentOfficeId;
  const firstActive = (DB.settings.offices || []).find(o => o.active) || (DB.settings.offices || [])[0];
  return firstActive ? firstActive.id : null;
}

// ── HIERARCHY ──
let currentUser = null;

function isHierarchyUnrestricted(user) {
  if (!user) return false;
  return user.systemRole === 'founder_ceo' || user.systemRole === 'admin';
}

function getSubordinateIds(managerId, teamList, visited = new Set()) {
  if (visited.has(managerId)) return visited;
  visited.add(managerId);
  teamList.filter(m => m.managerId === managerId).forEach(m => getSubordinateIds(m.id, teamList, visited));
  return visited;
}

function visibleMemberIds() {
  if (!currentUser) return new Set();
  if (isHierarchyUnrestricted(currentUser)) return null;
  const team = DB.settings.team || [];
  if (currentUser.systemRole === 'reporting_manager') return getSubordinateIds(currentUser.id, team, new Set());
  return new Set([currentUser.id]);
}

function hScoped(collection) {
  const officeData = scoped(collection);
  if (!currentUser) return officeData;
  if (isHierarchyUnrestricted(currentUser)) return officeData;
  const ids = visibleMemberIds();
  if (!ids) return officeData;
  if (collection === 'hrmsEmployees') return officeData.filter(e => ids.has(e.id));
  if (collection === 'hrmsLeaves')    return officeData.filter(l => ids.has(l.empId));
  if (collection === 'hrmsPayroll')   return officeData.filter(p => ids.has(p.empId));
  return officeData.filter(r => !r.createdBy || ids.has(r.createdBy));
}

function createdByStamp() { return currentUser ? currentUser.id : null; }

// ── AUTO-LOGIN AS ADMIN ──
function autoLoginAdmin() {
  const team = DB.settings.team || [];
  const admin = team.find(m => m.id === 't1') || team[0] || { id:'t1', name:'Admin', dept:'leadership', role:'founder', officeId:'*' };
  admin.systemRole = admin.systemRole || ROLE_TO_SYSTEM_ROLE[admin.role] || 'founder_ceo';
  currentUser = admin;
  currentOfficeId = hasAllOfficesAccess(admin) ? OFFICE_ALL : (admin.officeId || (DB.settings.offices[0] && DB.settings.offices[0].id));
}

// Ensure quotations array exists
if (!Array.isArray(DB.quotations)) DB.quotations = [];
ensureOfficeSchema();
saveDB({ silent: true });

// ── SESSION LOGIN: Check sessionStorage first, then fall back to admin ──
function loadSessionUser() {
  try {
    const session = JSON.parse(sessionStorage.getItem('wanago_session') || 'null');
    if (!session) { autoLoginAdmin(); return; }

    // ── Session expiry check (8 hours) ──
    const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
    if (session.loginTime) {
      const age = Date.now() - new Date(session.loginTime).getTime();
      if (age > SESSION_TTL_MS) {
        // Session expired — clear and redirect to login
        sessionStorage.removeItem('wanago_session');
        if (window.location.pathname !== '/index.html' &&
            !window.location.pathname.endsWith('index.html')) {
          window.location.href = '../index.html';
          return;
        }
        autoLoginAdmin();
        return;
      }
    }
    // Find team member by ID
    const team = DB.settings.team || [];
    const member = team.find(m => m.id === session.uid);
    if (member) {
      member.systemRole = member.systemRole || session.systemRole || 'employee';
      currentUser = member;
      currentOfficeId = hasAllOfficesAccess(member) ? OFFICE_ALL : (member.officeId || (DB.settings.offices[0]?.id));
    } else {
      // Session exists but no matching member in local DB yet (Firestore may not have synced)
      // Use actual session data — name comes from login.js which resolves it from Firebase
      currentUser = { id:session.uid, name:session.name, email:session.email, role:session.role, dept:session.dept, officeId:session.officeId||'*', systemRole:session.systemRole||'employee' };
      currentOfficeId = OFFICE_ALL;
    }
    window.currentUser = currentUser;
  } catch(e) { autoLoginAdmin(); }
}
loadSessionUser();


// ── Session helpers - single source of truth for user info ──
function getSessionUser() {
  try { return JSON.parse(sessionStorage.getItem('wanago_session') || 'null'); } catch(e) { return null; }
}
function getSessionEmail() {
  var s = getSessionUser();
  return (s && s.email) ? s.email : '';
}
function getSessionName() {
  var s = getSessionUser();
  if (window.currentUser && window.currentUser.name) return window.currentUser.name;
  return (s && s.name) ? s.name : 'User';
}
window.getSessionUser = getSessionUser;
window.getSessionEmail = getSessionEmail;
window.getSessionName = getSessionName;

// ── FORMATTERS ──
function today() { return new Date().toISOString().split('T')[0]; }
function getCurrentMonth() { return new Date().toISOString().slice(0, 7); }
function formatMoney(n) { return '₹' + Number(n || 0).toLocaleString('en-IN'); }
function formatDate(d) { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; } }
function isOverdue(dateStr) { if (!dateStr) return false; return new Date(dateStr) < new Date(today()); }
function uid() { return Date.now() + Math.random().toString(36).slice(2, 7); }

const PILL = {
  green: (t) => `<span class="pill pill-green">${t}</span>`,
  amber: (t) => `<span class="pill pill-amb">${t}</span>`,
  red:   (t) => `<span class="pill pill-red">${t}</span>`,
  blue:  (t) => `<span class="pill pill-blue">${t}</span>`,
  gray:  (t) => `<span class="pill pill-gray">${t}</span>`,
  gold:  (t) => `<span class="pill pill-gold">${t}</span>`,
};

function stagePill(stage) {
  const map = { new:PILL.blue, contacted:PILL.gray, follow_up:PILL.amber, quoted:PILL.amber, negotiation:PILL.amber, won:PILL.green, lost:PILL.red, confirmed:PILL.green, pending:PILL.amber, completed:PILL.blue, cancelled:PILL.red, paid:PILL.green, partial:PILL.amber, unpaid:PILL.red, overdue:PILL.red, draft:PILL.gray };
  const fn = map[stage] || PILL.gray;
  return fn(stage.charAt(0).toUpperCase() + stage.slice(1).replace('_',' '));
}

function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--textd)"><div style="font-size:20px;margin-bottom:8px">📋</div>${msg}</td></tr>`;
}

function logActivity(msg, type='info') {
  DB.activities.unshift({ id: Date.now(), msg, type, ts: new Date().toLocaleString() });
  if (DB.activities.length > 100) DB.activities = DB.activities.slice(0, 100);
  saveDB();
}

// ── MODAL HELPERS ──
function openModal(id) {
  document.getElementById(id).classList.add('open');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); clearErrors(); }
function clearErrors() { document.querySelectorAll('[id$="-error"]').forEach(el => el.style.display = 'none'); }
function showError(id, msg) { const el = document.getElementById(id); if (el) { el.textContent = msg; el.style.display = 'block'; } }

document.querySelectorAll('.modal-overlay').forEach(m => m.addEventListener('click', (e) => { if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open'); }));
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open')); });

// ── TOAST ──
let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = type === 'error' ? '✕' : '✓';
  t.className = type === 'error' ? 'show error' : 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = '', 3500);
}

// ── TAB SWITCHER ──
function switchTab(el, contentId) {
  const bar = el.closest('.tab-bar');
  const page = bar.closest('.page') || bar.parentElement;
  bar.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  (page || document).querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
  document.getElementById(contentId).classList.add('active');
}

// ── POPULATE SELECTS ──
function populateAgentSelect(elId) {
  const sel = document.getElementById(elId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Select agent</option>';
  const assignable = (DB.settings.team||[]).filter(m=>['sales','management','leadership','operations'].includes(m.dept));
  assignable.forEach(m => sel.insertAdjacentHTML('beforeend', `<option value="${m.name}">${m.name} (${DEPT_LABELS[m.dept]||m.dept})</option>`));
  if (!assignable.length) (DB.settings.agents||[]).forEach(a => sel.insertAdjacentHTML('beforeend', `<option value="${a}">${a}</option>`));
}

function populateCampaignSelect(elId) {
  const sel = document.getElementById(elId);
  if (!sel) return;
  sel.innerHTML = '<option value="">None</option>';
  (DB.campaigns||[]).forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.name}</option>`));
}

// ── WHATSAPP HELPER ──
function quickWhatsApp(phone, name, dest) {
  const msg = encodeURIComponent(`Hi ${name}, regarding your ${dest} trip enquiry — we have some great options for you! 😊`);
  const ph = phone.replace(/\D/g, '').replace(/^0+/, '');
  const full = ph.startsWith('91') ? ph : '91' + ph;
  window.open(`https://wa.me/${full}?text=${msg}`, '_blank');
}

// ── EXPORT ──
function exportData(type) {
  let rows, filename;
  if (type === 'leads') {
    rows = [['Name','Phone','Email','Destination','Source','Stage','Priority','Budget','Advance','Balance','Agent','Follow-up','Created']];
    hScoped('leads').forEach(l => rows.push([l.name,l.phone,l.email,l.destination,l.source,l.stage,l.priority,l.budget,l.advance,l.balance,l.agent,l.followup,l.createdAt]));
    filename = 'wanago_leads.csv';
  } else { return; }
  const csv = rows.map(r => r.map(c => `"${(c||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  showToast('Exported ' + rows.length + ' rows');
}

// ── EXPOSE GLOBALLY ──
window.DB = DB;
window.ROLE_TO_SYSTEM_ROLE = ROLE_TO_SYSTEM_ROLE;
window.saveDB = saveDB;
window.hScoped = hScoped;
window.scoped = scoped;
window.currentUser = currentUser;
window.currentOfficeId = currentOfficeId;
window.OFFICE_ALL = OFFICE_ALL;
window.today = today;
window.getCurrentMonth = getCurrentMonth;
window.formatMoney = formatMoney;
window.formatDate = formatDate;
window.isOverdue = isOverdue;
window.uid = uid;
window.PILL = PILL;
window.stagePill = stagePill;
window.emptyRow = emptyRow;
window.logActivity = logActivity;
window.openModal = openModal;
window.closeModal = closeModal;
window.showError = showError;
window.showToast = showToast;
window.switchTab = switchTab;
window.populateAgentSelect = populateAgentSelect;
window.populateCampaignSelect = populateCampaignSelect;
window.quickWhatsApp = quickWhatsApp;
window.exportData = exportData;
window.officeIdForNewRecord = officeIdForNewRecord;
window.createdByStamp = createdByStamp;
window.DEPT_LABELS = DEPT_LABELS;

// ── Additional helpers ──
function initials(name) {
  return (name||'?').split(' ').map(w=>w[0]||'').join('').slice(0,2).toUpperCase();
}

function getSR(user) {
  return user.systemRole || ROLE_TO_SYSTEM_ROLE[user.role] || 'employee';
}

function assertAuth(allowedRoles, record, ownerField) {
  if (!currentUser) { showToast('Not authenticated', 'error'); return false; }
  const sr = getSR(currentUser);
  if (sr === 'founder_ceo') return true;
  if (allowedRoles.length && !allowedRoles.includes(sr)) {
    showToast('You do not have permission for this action', 'error');
    return false;
  }
  return true;
}

function getSheetsURL() { return (DB.settings && DB.settings.googleSheets && DB.settings.googleSheets.webAppUrl) || ''; }
async function syncAppendCustomer() {} // stub

window.initials = initials;
window.assertAuth = assertAuth;
window.getSR = getSR;
window.getSheetsURL = getSheetsURL;

// ── Ensure quotations array exists (migration) ──
if (!Array.isArray(DB.quotations)) { DB.quotations = []; saveDB({ silent: true }); }

// ── Quotation helpers ──
function createQuotationFromLead(leadId) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) { showToast('Lead not found', 'error'); return null; }

  const pkg = lead.packageId ? (DB.packages || []).find(p => p.id === lead.packageId) : null;

  const quot = {
    id: 'QT-' + (DB.counters.quotations = (DB.counters.quotations || 0) + 1),
    leadId: leadId,
    customerName: lead.name,
    customerPhone: lead.phone,
    customerEmail: lead.email || '',
    destination: lead.destination,
    tripType: lead.tripType || 'domestic',
    travelDate: lead.travelDate || '',
    pax: lead.pax || 2,
    packageId: lead.packageId || null,
    packageName: pkg ? pkg.name : '',
    amount: Number(lead.budget || 0),
    discount: 0,
    grandTotal: Number(lead.budget || 0),
    items: [{
      description: (pkg ? pkg.name + ' — ' : '') + lead.destination,
      pax: lead.pax || 2,
      pricePerPerson: lead.pax ? Math.round(Number(lead.budget || 0) / lead.pax) : Number(lead.budget || 0),
      total: Number(lead.budget || 0)
    }],
    notes: lead.notes || '',
    agent: lead.agent || '',
    validDays: 15,
    status: 'sent',  // sent, accepted, rejected, expired, converted
    officeId: lead.officeId || officeIdForNewRecord(),
    createdBy: createdByStamp(),
    createdAt: new Date().toISOString(),
    sentAt: new Date().toISOString(),
  };

  DB.quotations.unshift(quot);

  // Update lead stage to quoted
  lead.stage = 'quoted';
  lead.quotationId = quot.id;

  saveDB();
  logActivity('Quotation ' + quot.id + ' sent to ' + lead.name, 'quotation');
  return quot;
}

function convertQuotationToBooking(quotId) {
  const quot = DB.quotations.find(q => q.id === quotId);
  if (!quot) { showToast('Quotation not found', 'error'); return null; }

  const bookingRef = 'BK-' + (DB.counters.bookings = (DB.counters.bookings || 0) + 1);

  const booking = {
    id: uid(),
    ref: bookingRef,
    quotationId: quotId,
    leadId: quot.leadId || '',
    customerName: quot.customerName,
    customerPhone: quot.customerPhone,
    customerEmail: quot.customerEmail,
    destination: quot.destination,
    tripType: quot.tripType,
    travelDate: quot.travelDate,
    pax: quot.pax,
    packageId: quot.packageId || null,
    packageName: quot.packageName || '',
    totalAmount: quot.grandTotal || quot.amount,
    advancePaid: 0,
    pendingAmount: quot.grandTotal || quot.amount,
    discount: quot.discount || 0,
    agent: quot.agent || '',
    notes: quot.notes || '',
    status: 'pending_finance',  // pending_finance → finance_approved → ops_pending → confirmed → completed
    officeId: quot.officeId || officeIdForNewRecord(),
    createdBy: createdByStamp(),
    createdAt: new Date().toISOString(),
  };

  DB.bookings.unshift(booking);

  // Update quotation status
  quot.status = 'converted';
  quot.convertedAt = new Date().toISOString();
  quot.bookingRef = bookingRef;

  // Auto-create or link customer (no duplicates — keyed on phone)
  let customer = DB.customers.find(c => c.phone === quot.customerPhone);
  if (!customer) {
    const color = ['#134a32','#1976d2','#f57c00','#7b1fa2','#c9a84c'][Math.floor(Math.random()*5)];
    customer = {
      id: uid(), name: quot.customerName, phone: quot.customerPhone,
      email: quot.customerEmail, color, tag: 'regular',
      bookingsCount: 1, totalSpent: 0,
      officeId: quot.officeId, createdBy: createdByStamp(), createdAt: new Date().toISOString()
    };
    DB.customers.unshift(customer);
  } else {
    customer.bookingsCount = (customer.bookingsCount || 0) + 1;
  }
  booking.customerId = customer.id;

  // Update lead stage + link to customer
  const lead = DB.leads.find(l => l.id === quot.leadId);
  if (lead) {
    lead.stage = 'won';
    lead.bookingRef = bookingRef;
    lead.customerId = customer.id;
  }

  // Increment package bookings count
  if (quot.packageId) {
    const pkg = (DB.packages || []).find(p => p.id === quot.packageId);
    if (pkg) pkg.bookingsCount = (pkg.bookingsCount || 0) + 1;
  }

  if(typeof dbSave==='function'){
    dbSave('bookings', booking).catch(()=>{});
    dbSave('quotations', quot).catch(()=>{});
    dbSave('customers', customer).catch(()=>{});
    if(lead) dbSave('leads', lead).catch(()=>{});
  }
  saveDB();
  logActivity('Booking ' + bookingRef + ' created from quotation ' + quotId, 'booking');
  return booking;
}

window.createQuotationFromLead = createQuotationFromLead;
window.convertQuotationToBooking = convertQuotationToBooking;

// ── INCENTIVE SYSTEM ──
// Default incentive settings (admin can change these)
if (!DB.incentiveSettings) {
  DB.incentiveSettings = {
    slabs: [
      { min: 0, max: 50, level: 'Below Minimum', percent: 0 },
      { min: 50, max: 70, level: 'Level 1 - Achiever', percent: 4 },
      { min: 70, max: 90, level: 'Level 2 - Strong Performer', percent: 6 },
      { min: 90, max: 100, level: 'Level 3 - High Performer', percent: 8 },
      { min: 100, max: 999, level: 'Level 4 - Top Performer', percent: 10 },
    ],
    fastClosureBonus: [
      { withinHours: 24, amount: 300 },
      { withinHours: 48, amount: 150 },
    ],
    highValueThreshold: 15000,
    highValueBonus: 500,
    selfGeneratedBonus: 2,
    teamBonusPercent: 2,
    monthlyRewards: [
      { rank: 1, label: 'Top Performer', amount: 3000 },
      { rank: 2, label: '2nd Place', amount: 2000 },
      { rank: 3, label: '3rd Place', amount: 1000 },
    ],
    quarterlyRewardAmount: 10000,
    quarterlyRewardLabel: 'Sponsored Trip / ₹10,000 Cash',
  };
  saveDB({ silent: true });
}

// Ensure incentive log exists
if (!Array.isArray(DB.incentiveLogs)) { DB.incentiveLogs = []; saveDB({ silent: true }); }

// Ensure FCM tokens list exists
if (!Array.isArray(DB.fcmTokens)) { DB.fcmTokens = []; }

// Ensure agent targets exist
if (!DB.agentTargets) { DB.agentTargets = {}; saveDB({ silent: true }); }

// ── Calculate incentive for a single booking ──
function calculateBookingIncentive(booking) {
  const settings = DB.incentiveSettings;
  const profit = Number(booking.profit || 0);
  if (profit <= 0) return { base: 0, fastClosure: 0, highValue: 0, selfGenerated: 0, total: 0, slabPercent: 0, level: 'No Profit' };

  // Get agent's monthly target and achievement
  const agent = booking.agent || '';
  const month = (booking.createdAt || new Date().toISOString()).slice(0, 7);
  const target = getAgentMonthlyTarget(agent, month);
  const achieved = getAgentMonthlyProfit(agent, month);
  const achievementPct = target > 0 ? Math.round((achieved / target) * 100) : 0;

  // Find slab
  let slabPercent = 0, level = 'Below Minimum';
  for (const slab of settings.slabs) {
    if (achievementPct >= slab.min && achievementPct < slab.max) {
      slabPercent = slab.percent;
      level = slab.level;
      break;
    }
    if (slab.max === 999 && achievementPct >= slab.min) {
      slabPercent = slab.percent;
      level = slab.level;
    }
  }

  // Base incentive
  const base = Math.round(profit * slabPercent / 100);

  // Fast closure bonus
  let fastClosure = 0;
  if (booking.leadAssignedAt && booking.confirmedAt) {
    const hours = (new Date(booking.confirmedAt) - new Date(booking.leadAssignedAt)) / 3600000;
    for (const fc of settings.fastClosureBonus) {
      if (hours <= fc.withinHours) { fastClosure = fc.amount; break; }
    }
  }

  // High value bonus
  const highValue = profit >= settings.highValueThreshold ? settings.highValueBonus : 0;

  // Self-generated lead bonus
  let selfGenerated = 0;
  if (booking.leadSource === 'self' || booking.selfGenerated) {
    selfGenerated = Math.round(profit * settings.selfGeneratedBonus / 100);
  }

  const total = base + fastClosure + highValue + selfGenerated;
  return { base, fastClosure, highValue, selfGenerated, total, slabPercent, level, profit, achievementPct };
}

function getAgentMonthlyTarget(agent, month) {
  const key = agent + '_' + month;
  return Number(DB.agentTargets[key] || 0);
}

function setAgentMonthlyTarget(agent, month, target) {
  const key = agent + '_' + month;
  DB.agentTargets[key] = Number(target);
  saveDB();
}

function getAgentMonthlyProfit(agent, month) {
  return (DB.bookings || [])
    .filter(b => b.agent === agent && (b.status === 'confirmed' || b.status === 'completed') && (b.createdAt || '').startsWith(month))
    .reduce((sum, b) => sum + Number(b.profit || 0), 0);
}

function getAgentMonthlyBookings(agent, month) {
  return (DB.bookings || [])
    .filter(b => b.agent === agent && (b.status === 'confirmed' || b.status === 'completed') && (b.createdAt || '').startsWith(month));
}

function getAllAgentsWithBookings(month) {
  const agents = new Set();
  (DB.bookings || []).filter(b => (b.status === 'confirmed' || b.status === 'completed') && (b.createdAt || '').startsWith(month))
    .forEach(b => { if (b.agent) agents.add(b.agent); });
  // Also add agents from team settings
  (DB.settings.team || []).filter(m => ['sales','operations'].includes(m.dept))
    .forEach(m => agents.add(m.name));
  return [...agents];
}

function getTeamMonthlyProfit(month) {
  return (DB.bookings || [])
    .filter(b => (b.status === 'confirmed' || b.status === 'completed') && (b.createdAt || '').startsWith(month))
    .reduce((sum, b) => sum + Number(b.profit || 0), 0);
}

function getTeamMonthlyTarget(month) {
  const agents = getAllAgentsWithBookings(month);
  return agents.reduce((sum, a) => sum + getAgentMonthlyTarget(a, month), 0);
}

function isTeamBonusActive(month) {
  const teamTarget = getTeamMonthlyTarget(month);
  const teamProfit = getTeamMonthlyProfit(month);
  return teamTarget > 0 && teamProfit >= teamTarget;
}

window.calculateBookingIncentive = calculateBookingIncentive;
window.getAgentMonthlyTarget = getAgentMonthlyTarget;
window.setAgentMonthlyTarget = setAgentMonthlyTarget;
window.getAgentMonthlyProfit = getAgentMonthlyProfit;
window.getAgentMonthlyBookings = getAgentMonthlyBookings;
window.getAllAgentsWithBookings = getAllAgentsWithBookings;
window.getTeamMonthlyProfit = getTeamMonthlyProfit;
window.getTeamMonthlyTarget = getTeamMonthlyTarget;
window.isTeamBonusActive = isTeamBonusActive;

// ── Role-based access helpers ──
function isAdmin() {
  if (!currentUser) return false;
  const sr = getSR(currentUser);
  return sr === 'founder_ceo' || sr === 'admin';
}

function isManager() {
  if (!currentUser) return false;
  const sr = getSR(currentUser);
  return sr === 'reporting_manager' || sr === 'founder_ceo' || sr === 'admin';
}

function isAgent() {
  if (!currentUser) return false;
  const sr = getSR(currentUser);
  return sr === 'employee';
}

function getCurrentAgentName() {
  return currentUser ? currentUser.name : '';
}

window.isAdmin = isAdmin;
window.isManager = isManager;
window.isAgent = isAgent;
window.getCurrentAgentName = getCurrentAgentName;

// ── Permission checks (used by sidebar + modules) ──
const _FULL_ACCESS_ROLES = ['founder','ceo','co_founder','director','admin'];

// Role-based default page access (mirrors admin.js ROLE_DEFAULT_PERMS, kept minimal)
const _ROLE_PAGE_DEFAULTS = {
  branch_manager:     ['dashboard','leads','customers','quotations','packages','bookings','invoices','payments','reports','hrms','whatsapp','marketing','incentives','settings'],
  team_lead:          ['dashboard','leads','customers','quotations','packages','bookings','invoices','payments','reports','whatsapp','marketing','incentives'],
  senior_manager:     ['dashboard','leads','customers','quotations','bookings','payments','reports','whatsapp','marketing'],
  sales_manager:      ['dashboard','leads','customers','quotations','packages','bookings','whatsapp','marketing','incentives'],
  operations_manager: ['dashboard','bookings','packages','customers','payments','invoices','reports'],
  finance_manager:    ['dashboard','payments','invoices','bookings','reports'],
  marketing_manager:  ['dashboard','leads','customers','whatsapp','marketing','reports'],
};
const _AGENT_PAGES = ['dashboard','leads','customers','quotations','bookings','whatsapp'];

function canUserSeePage(pageId) {
  const u = window.currentUser;
  if (!u) return true;
  if (_FULL_ACCESS_ROLES.includes(u.role)) return true;
  // Explicit permissions stored on member take precedence
  const pages = u.permissions?.pages || u.permissions?.actions?.pages;
  if (Array.isArray(pages)) return pages.includes(pageId);
  // Fall back to role defaults
  return (_ROLE_PAGE_DEFAULTS[u.role] || _AGENT_PAGES).includes(pageId);
}

function canUserDoAction(actionId) {
  const u = window.currentUser;
  if (!u) return true;
  if (_FULL_ACCESS_ROLES.includes(u.role)) return true;
  const actions = u.permissions?.features || u.permissions?.actions;
  if (Array.isArray(actions)) return actions.includes(actionId);
  return true; // default allow
}

window.canUserSeePage = canUserSeePage;
window.canUserDoAction = canUserDoAction;

// ── Agent personal WhatsApp numbers ──
if (!DB.agentWhatsApp) { DB.agentWhatsApp = {}; saveDB({ silent: true }); }
window.agentWhatsApp = DB.agentWhatsApp;

// ═══════════════════════════════════════════════════════════════
//  TEAM AUTH — Firebase UID → Team Member Resolution
// ═══════════════════════════════════════════════════════════════

function resolveUserFromFirebase(firebaseUser) {
  if (!firebaseUser) { autoLoginAdmin(); return; }

  // Try to find team member by Firebase UID
  const team = DB.settings.team || [];
  let member = team.find(m => m.firebaseUid === firebaseUser.uid);

  // Try by email
  if (!member) member = team.find(m => m.email === firebaseUser.email);

  // Try by stored firebaseUid on team member
  if (!member) member = team.find(m => m.firebaseUid === firebaseUser.uid);

  if (member) {
    // Determine system role
    const roleMap = {
      founder:'founder_ceo', ceo:'founder_ceo', co_founder:'founder_ceo',
      admin:'admin', branch_manager:'reporting_manager', team_lead:'reporting_manager',
      senior_manager:'reporting_manager', sales_manager:'reporting_manager',
      operations_manager:'reporting_manager', finance_manager:'reporting_manager',
      marketing_manager:'reporting_manager',
    };
    member.systemRole = member.systemRole || roleMap[member.role] || 'employee';
    currentUser = member;
    currentOfficeId = hasAllOfficesAccess(member) ? OFFICE_ALL : (member.officeId || (DB.settings.offices[0]?.id));
  } else {
    // Firebase user not mapped → treat as admin (first time / owner)
    autoLoginAdmin();
    if (currentUser) {
      currentUser.email = firebaseUser.email;
      currentUser.firebaseUid = firebaseUser.uid;
    }
  }
  window.currentUser = currentUser;
}

function canEditLead(lead) {
  if (!currentUser) return false;
  const sr = currentUser.systemRole || 'employee';
  // Admins and founders can edit all
  if (['founder_ceo','admin'].includes(sr)) return true;
  // Managers can edit their team's leads
  if (sr === 'reporting_manager') return true;
  // Agents can only edit leads assigned to them
  return !lead.agent || lead.agent === currentUser.name;
}

function canEditBooking(booking) {
  if (!currentUser) return false;
  const sr = currentUser.systemRole || 'employee';
  if (['founder_ceo','admin','reporting_manager'].includes(sr)) return true;
  return !booking.agent || booking.agent === currentUser.name;
}

window.resolveUserFromFirebase = resolveUserFromFirebase;
window.canEditLead = canEditLead;
window.canEditBooking = canEditBooking;

// ══════ PAGE PERMISSION CHECK ══════
// Called on every page to check if current user can access it
function checkPagePermission(page) {
  const member = window.currentUser;
  if (!member) return true; // not logged in yet, let auth handle it
  // Founders/admins always allowed
  if (['founder','ceo','admin'].includes(member.role)) return true;
  // Check custom permissions
  if (member.permissions && member.permissions.pages) {
    return member.permissions.pages.includes(page);
  }
  return true; // default allow if no permissions set
}

function enforcePagePermission(page) {
  if (!checkPagePermission(page)) {
    // Show access denied
    const main = document.getElementById('main');
    if (main) main.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:40px">
        <div style="font-size:60px;margin-bottom:16px">🔒</div>
        <div style="font-size:22px;font-weight:800;color:var(--g800);margin-bottom:8px">Access Restricted</div>
        <div style="font-size:14px;color:var(--textd);max-width:360px;line-height:1.6">You don't have permission to access this page. Contact your admin to request access.</div>
        <button onclick="goTo('dashboard')" class="btn btn-primary" style="margin-top:24px">← Back to Dashboard</button>
      </div>`;
    return false;
  }
  return true;
}

window.checkPagePermission = checkPagePermission;
window.enforcePagePermission = enforcePagePermission;
