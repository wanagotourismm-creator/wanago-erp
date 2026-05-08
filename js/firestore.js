// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firestore Data Layer v3
//  Single source of truth: Firebase Firestore + Storage
//  DB is synced via listeners and cached locally for refresh/offline safety.
//
//  Cool features:
//  ✦ Real-time collaboration — all users see changes live
//  ✦ Firebase Storage — file attachments on any record
//  ✦ Offline persistence — works without internet (IndexedDB)
//  ✦ Smart deduplication — detect & remove duplicate records
//  ✦ Auto-migration — one-time import from old localStorage data
//  ✦ Activity audit trail — every write logged with user + timestamp
//  ✦ Real-time presence — see which team members are online
//  ✦ Data health — count orphans, dupes, missing fields
// ═══════════════════════════════════════════════════════════════

const FS_VER  = '10.12.0';
const FS_BASE = `https://www.gstatic.com/firebasejs/${FS_VER}`;

const FS_COLLECTIONS = [
  'leads','customers','quotations','packages','bookings',
  'invoices','payments','expenses','campaigns','segments','activities',
  'hrmsEmployees','hrmsLeaves','hrmsPayroll','hrmsCheckIns',
  'tasks','rewards','pointsLog',
];
const FS_SETTINGS_DOC  = 'settings';
const FS_MIGRATE_FLAG  = 'wanago_ls_migrated_v3';
const FS_DIRTY_FLAG    = 'wanago_erp_v3_dirty';
const FS_PRESENCE_PATH = 'presence';

let _db       = null;
let _storage  = null;
let _compId   = null;   // Firebase project ID = company namespace
let _fsReady  = false;
let _listeners = [];
let _pushTimer = null;

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */

async function fsInit() {
  try {
    const cfg = await import('../firebase/firebase-config.js');
    if (!cfg.db) { _loadLocalFallback(); return false; }

    _db      = cfg.db;
    _storage = cfg.storage || null;
    _compId  = cfg.db.app.options.projectId;

    // Enable offline persistence (IndexedDB — works across tabs)
    try {
      const { enableMultiTabIndexedDbPersistence } = await import(`${FS_BASE}/firebase-firestore.js`);
      await enableMultiTabIndexedDbPersistence(_db);
    } catch(e) {
      // Already enabled or not supported — not critical
    }

    _fsReady         = true;
    window._fsReady  = true;

    // One-time migration from old localStorage data
    await _migrateFromLocalStorage();

    // Load all data once, then keep live via listeners
    await _loadAll();
    _attachListeners();
    if (localStorage.getItem(FS_DIRTY_FLAG)) await _pushAll();
    _startPresence();

    console.log('✅ Firestore v3 ready:', _compId);
    return true;
  } catch (e) {
    console.error('[Firestore] init failed:', e.message);
    _loadLocalFallback();
    return false;
  }
}

/* ── Fallback: if Firebase not configured, try old localStorage cache ── */
function _loadLocalFallback() {
  try {
    const raw = localStorage.getItem('wanago_erp_v3');
    if (raw) Object.assign(DB, JSON.parse(raw));
  } catch(e) {}
  console.warn('[Firestore] running in offline-only mode');
}

/* ══════════════════════════════════════════════════
   ONE-TIME MIGRATION
══════════════════════════════════════════════════ */

async function _migrateFromLocalStorage() {
  if (localStorage.getItem(FS_MIGRATE_FLAG)) return;

  const raw = localStorage.getItem('wanago_erp_v3');
  if (!raw) { localStorage.setItem(FS_MIGRATE_FLAG, '1'); return; }

  try {
    const lsData = JSON.parse(raw);
    if (!lsData || typeof lsData !== 'object') {
      localStorage.setItem(FS_MIGRATE_FLAG, '1');
      return;
    }

    const hasRecords = FS_COLLECTIONS.some(col => Array.isArray(lsData[col]) && lsData[col].length);
    const hasCustomSettings =
      !!lsData.settings?.companyName ||
      (Array.isArray(lsData.settings?.team) && lsData.settings.team.length > 1) ||
      (Array.isArray(lsData.settings?.offices) && lsData.settings.offices.length > 1);
    if (!hasRecords && !hasCustomSettings) {
      localStorage.setItem(FS_MIGRATE_FLAG, '1');
      return;
    }

    showFsSyncStatus('☁️ Migrating data to Firebase…');

    // Load localStorage data into memory
    FS_COLLECTIONS.forEach(col => {
      if (Array.isArray(lsData[col]) && lsData[col].length) DB[col] = lsData[col];
    });
    if (lsData.settings) Object.assign(DB.settings, lsData.settings);

    // Push everything to Firestore
    await _pushAll();

    // Clean up
    localStorage.setItem(FS_MIGRATE_FLAG, '1');
    // Keep wanago_erp_v3 as a refresh-safe cache after migration.
    localStorage.removeItem('wanago_erp_v2');
    localStorage.removeItem('wanago_uid_map');
    localStorage.removeItem('wanago_sheets_url');

    showFsSyncStatus('✅ All data migrated to Firebase!', true);
  } catch (e) {
    console.error('[Migration] failed:', e.message);
    localStorage.setItem(FS_MIGRATE_FLAG, '1'); // don't retry on error
  }
}

/* ══════════════════════════════════════════════════
   LOAD ALL DATA
══════════════════════════════════════════════════ */

async function _loadAll() {
  if (!_db) return;
  showFsSyncStatus('⏳ Loading…');
  try {
    const { collection, getDocs, doc, getDoc } = await import(`${FS_BASE}/firebase-firestore.js`);

    // Load all collections in parallel
    await Promise.all(FS_COLLECTIONS.map(async col => {
      try {
        const snap = await getDocs(collection(_db, _path(col)));
        if (!snap.empty) DB[col] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch(e) { /* collection doesn't exist yet */ }
    }));

    // Load settings
    try {
      const snap = await getDoc(doc(_db, `companies/${_compId}`, FS_SETTINGS_DOC));
      if (snap.exists()) {
        const d = snap.data();
        delete d._updatedAt;
        Object.assign(DB.settings, d);
      }
    } catch(e) {}

    // Load extras (non-collection DB fields that live outside FS_COLLECTIONS)
    try {
      const extSnap = await getDoc(doc(_db, `companies/${_compId}`, 'extras'));
      if (extSnap.exists()) {
        const e = extSnap.data();
        if (e.counters)          Object.assign(DB.counters, e.counters);
        if (e.incentiveSettings) DB.incentiveSettings = e.incentiveSettings;
        if (e.agentTargets)      DB.agentTargets = e.agentTargets;
        if (e.incentiveLogs)     DB.incentiveLogs = e.incentiveLogs;
        if (e.agentWhatsApp)     DB.agentWhatsApp = e.agentWhatsApp;
        if (e.hrmsAttendance)    DB.hrmsAttendance = e.hrmsAttendance;
        if (e.policies)          DB.policies = e.policies;
        if (e.fcmTokens)         DB.fcmTokens = e.fcmTokens;
      }
    } catch(e) {}

    showFsSyncStatus('✅ Synced', true);
    _fsRefreshPage();
  } catch (e) {
    console.error('[Load] failed:', e.message);
    showFsSyncStatus('⚠️ Load failed', false, true);
  }
}

/* ══════════════════════════════════════════════════
   REAL-TIME LISTENERS
══════════════════════════════════════════════════ */

function _attachListeners() {
  // Live listeners for all actively-written collections
  [
    'leads', 'customers', 'bookings', 'payments', 'expenses', 'activities',
    'quotations', 'invoices', 'hrmsEmployees', 'hrmsLeaves',
    'campaigns', 'packages',
  ].forEach(col => {
    fsListen(col);
  });
}

async function fsListen(collection, callback) {
  if (!_fsReady || !_db) return null;
  try {
    const { collection: col, onSnapshot, query, orderBy, limit } = await import(`${FS_BASE}/firebase-firestore.js`);
    const q   = query(col(_db, _path(collection)), orderBy('createdAt', 'desc'), limit(1000));
    const off = onSnapshot(q, snap => {
      DB[collection] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (callback) callback(DB[collection]);
      _fsRefreshPage();
    }, err => console.warn(`[Listener:${collection}]`, err.message));
    _listeners.push(off);
    return off;
  } catch (e) {
    console.warn('[fsListen]', e.message);
    return null;
  }
}

/* ══════════════════════════════════════════════════
   WRITE — single doc
══════════════════════════════════════════════════ */

async function fsSave(collection, docId, data) {
  if (!_fsReady || !_db) return;
  try {
    const { doc, setDoc, serverTimestamp } = await import(`${FS_BASE}/firebase-firestore.js`);
    await setDoc(doc(_db, _path(collection), docId), {
      ...data,
      _updatedAt: serverTimestamp(),
      _updatedBy: window.currentUser?.id || 'system',
    }, { merge: true });
  } catch (e) { console.error('[fsSave]', e.message); }
}

async function fsDelete(collection, docId) {
  if (!_fsReady || !_db) return;
  try {
    const { doc, deleteDoc } = await import(`${FS_BASE}/firebase-firestore.js`);
    await deleteDoc(doc(_db, _path(collection), docId));
  } catch (e) { console.error('[fsDelete]', e.message); }
}

/* ══════════════════════════════════════════════════
   PUSH ALL (saveDB hook — debounced 2s)
══════════════════════════════════════════════════ */

window._fsPushDB = function() {
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => {
    _pushAll().catch(e => console.warn('[Push]', e.message));
  }, 300);
};

window._fsPushDBNow = function() {
  clearTimeout(_pushTimer);
  return _pushAll().catch(e => console.warn('[PushNow]', e.message));
};

async function _pushAll() {
  if (!_fsReady || !_db) return;
  try {
    const { doc, writeBatch, setDoc, serverTimestamp } = await import(`${FS_BASE}/firebase-firestore.js`);
    const ts  = serverTimestamp();
    const uid = window.currentUser?.id || 'system';

    for (const col of FS_COLLECTIONS) {
      const items = DB[col] || [];
      if (!items.length) continue;
      // Batch in chunks of 400 (Firestore limit is 500)
      for (let i = 0; i < items.length; i += 400) {
        const batch = writeBatch(_db);
        items.slice(i, i + 400).forEach(item => {
          if (!item.id) return;
          batch.set(doc(_db, _path(col), item.id), { ...item, _updatedAt: ts, _updatedBy: uid }, { merge: true });
        });
        await batch.commit();
      }
    }
    const settingsOk = await fsSaveSettings();

    // Save extras — non-collection DB fields missed by FS_COLLECTIONS
    try {
      const extrasClean = JSON.parse(JSON.stringify({
        counters:          DB.counters          || {},
        incentiveSettings: DB.incentiveSettings || {},
        agentTargets:      DB.agentTargets      || {},
        incentiveLogs:     (DB.incentiveLogs    || []).slice(-500),
        agentWhatsApp:     DB.agentWhatsApp     || {},
        hrmsAttendance:    DB.hrmsAttendance    || {},
        policies:          DB.policies          || [],
        fcmTokens:         (DB.fcmTokens        || []).slice(-200),
      }));
      await setDoc(doc(_db, `companies/${_compId}`, 'extras'),
        { ...extrasClean, _updatedAt: ts, _updatedBy: uid }, { merge: false });
    } catch (e) { console.warn('[extras push]', e.message); }
    if (settingsOk !== false) localStorage.removeItem(FS_DIRTY_FLAG);
  } catch (e) { console.error('[_pushAll]', e.message); }
}

/* ══════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════ */

async function fsLoadSettings() {
  if (!_db) return;
  try {
    const { doc, getDoc } = await import(`${FS_BASE}/firebase-firestore.js`);
    const snap = await getDoc(doc(_db, `companies/${_compId}`, FS_SETTINGS_DOC));
    if (snap.exists()) {
      const d = snap.data(); delete d._updatedAt;
      Object.assign(DB.settings, d);
    }
  } catch (e) { console.error('[fsLoadSettings]', e.message); }
}

async function fsSaveSettings() {
  if (!_db) return false;
  try {
    const { doc, setDoc, serverTimestamp } = await import(`${FS_BASE}/firebase-firestore.js`);
    const clean = JSON.parse(JSON.stringify(DB.settings)); // strip non-serialisable values
    await setDoc(doc(_db, `companies/${_compId}`, FS_SETTINGS_DOC), {
      ...clean, _updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('[fsSaveSettings]', e.message);
    try { localStorage.setItem(FS_DIRTY_FLAG, '1'); } catch(_) {}
    return false;
  }
}

/* ══════════════════════════════════════════════════
   FIREBASE STORAGE — file attachments
══════════════════════════════════════════════════ */

/**
 * Upload a file and return its download URL.
 * path example: 'leads/lead123/passport.pdf'
 */
async function fsUploadFile(path, file, onProgress) {
  if (!_storage) throw new Error('Firebase Storage not initialised');
  const { ref, uploadBytesResumable, getDownloadURL } = await import(`${FS_BASE}/firebase-storage.js`);
  const storageRef = ref(_storage, `companies/${_compId}/${path}`);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on('state_changed',
      snap => { if (onProgress) onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)); },
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref))
    );
  });
}

/** Delete a stored file by its storage path. */
async function fsDeleteFile(path) {
  if (!_storage) return;
  try {
    const { ref, deleteObject } = await import(`${FS_BASE}/firebase-storage.js`);
    await deleteObject(ref(_storage, `companies/${_compId}/${path}`));
  } catch(e) { console.warn('[fsDeleteFile]', e.message); }
}

/** Get a signed download URL for an existing file. */
async function fsFileURL(path) {
  if (!_storage) return null;
  try {
    const { ref, getDownloadURL } = await import(`${FS_BASE}/firebase-storage.js`);
    return await getDownloadURL(ref(_storage, `companies/${_compId}/${path}`));
  } catch(e) { return null; }
}

/* ══════════════════════════════════════════════════
   SMART DEDUPLICATION
══════════════════════════════════════════════════ */

/**
 * Remove exact duplicate records by phone (leads/customers) or ref (bookings/invoices).
 * Keeps the most recently created record. Returns count removed.
 */
function fsDedup(opts) {
  opts = opts || { leads: true, customers: true, bookings: true, invoices: true, payments: true };
  let removed = 0;

  function dedupBy(collection, keyFn) {
    const seen = new Map();
    const before = (DB[collection] || []).length;
    DB[collection] = (DB[collection] || []).filter(item => {
      const k = keyFn(item);
      if (!k) return true; // no key = keep
      if (seen.has(k)) { removed++; return false; }
      seen.set(k, true);
      return true;
    });
    return before - (DB[collection] || []).length;
  }

  if (opts.leads)     dedupBy('leads',     l => l.phone ? l.phone.replace(/\D/g,'') : null);
  if (opts.customers) dedupBy('customers', c => c.phone ? c.phone.replace(/\D/g,'') : null);
  if (opts.bookings)  dedupBy('bookings',  b => b.ref   || null);
  if (opts.invoices)  dedupBy('invoices',  i => i.invoiceNo || null);
  if (opts.payments)  dedupBy('payments',  p => p.id    || null);

  if (removed > 0) {
    saveDB();
    showFsSyncStatus(`🧹 Removed ${removed} duplicate records`, true);
    _fsRefreshPage();
  } else {
    showFsSyncStatus('✅ No duplicates found', true);
  }
  return removed;
}

/**
 * Returns a report of potential duplicates without removing them.
 */
function fsDedupReport() {
  function findDupes(collection, keyFn) {
    const seen = {};
    const dupes = [];
    (DB[collection] || []).forEach(item => {
      const k = keyFn(item);
      if (!k) return;
      if (seen[k]) dupes.push({ collection, key: k, ids: [seen[k], item.id] });
      else seen[k] = item.id;
    });
    return dupes;
  }
  return [
    ...findDupes('leads',     l => l.phone ? l.phone.replace(/\D/g,'') : null),
    ...findDupes('customers', c => c.phone ? c.phone.replace(/\D/g,'') : null),
    ...findDupes('bookings',  b => b.ref   || null),
  ];
}

/* ══════════════════════════════════════════════════
   DATA HEALTH CHECK
══════════════════════════════════════════════════ */

function fsDataHealth() {
  const dupes = fsDedupReport().length;
  const orphanPayments = (DB.payments || []).filter(p => {
    if (!p.bookingRef) return false;
    return !(DB.bookings || []).find(b => b.id === p.bookingRef || b.ref === p.bookingRef);
  }).length;
  const orphanInvoices = (DB.invoices || []).filter(i => {
    if (!i.bookingRef) return false;
    return !(DB.bookings || []).find(b => b.id === i.bookingRef || b.ref === i.bookingRef);
  }).length;
  const leadsNoPhone   = (DB.leads || []).filter(l => !l.phone).length;
  const custNoEmail    = (DB.customers || []).filter(c => !c.email).length;

  return {
    collections: {
      leads:      (DB.leads      || []).length,
      customers:  (DB.customers  || []).length,
      bookings:   (DB.bookings   || []).length,
      payments:   (DB.payments   || []).length,
      invoices:   (DB.invoices   || []).length,
      quotations: (DB.quotations || []).length,
    },
    issues: { dupes, orphanPayments, orphanInvoices, leadsNoPhone, custNoEmail },
    healthy: dupes === 0 && orphanPayments === 0 && orphanInvoices === 0,
  };
}

/* ══════════════════════════════════════════════════
   REAL-TIME PRESENCE
══════════════════════════════════════════════════ */

let _presenceRef = null;

async function _startPresence() {
  if (!_db || !window.currentUser) return;
  try {
    const { doc, setDoc, deleteDoc, serverTimestamp, onDisconnect } = await import(`${FS_BASE}/firebase-firestore.js`);
    const uid  = window.currentUser.id || 'unknown';
    const name = window.currentUser.name || 'User';
    const ref  = doc(_db, `companies/${_compId}/${FS_PRESENCE_PATH}`, uid);
    _presenceRef = ref;

    await setDoc(ref, {
      id:       uid,
      name:     name,
      role:     window.currentUser.role || '',
      page:     window.location.pathname.split('/').pop().replace('.html',''),
      lastSeen: serverTimestamp(),
      online:   true,
    }, { merge: true });

    // Mark offline when tab closes
    window.addEventListener('beforeunload', () => {
      if (_presenceRef) deleteDoc(_presenceRef).catch(()=>{});
    });
  } catch(e) { /* presence is non-critical */ }
}

/** Get all currently online team members. */
async function fsGetOnlineUsers() {
  if (!_db) return [];
  try {
    const { collection, getDocs } = await import(`${FS_BASE}/firebase-firestore.js`);
    const snap = await getDocs(collection(_db, `companies/${_compId}/${FS_PRESENCE_PATH}`));
    return snap.docs.map(d => d.data());
  } catch(e) { return []; }
}

/* ══════════════════════════════════════════════════
   WANAGO SPACE — Firestore-based real-time chat
══════════════════════════════════════════════════ */

async function fsChatSend(spaceId, msgObj) {
  if (!_db) return;
  try {
    const { collection, addDoc, serverTimestamp } = await import(`${FS_BASE}/firebase-firestore.js`);
    await addDoc(collection(_db, `companies/${_compId}/spaces/${spaceId}/messages`), {
      senderId:  msgObj.senderId  || window.currentUser?.id   || 'unknown',
      sender:    msgObj.sender    || window.currentUser?.name || 'User',
      color:     msgObj.color     || '#228050',
      text:      msgObj.text      || '',
      reactions: msgObj.reactions || {},
      edited:    false,
      tsStr:     new Date().toISOString(),
      ts:        serverTimestamp(),
    });
  } catch(e) { console.error('[fsChatSend]', e.message); }
}

async function fsChatListen(spaceId, callback) {
  if (!_db) return null;
  try {
    const { collection, onSnapshot, query, orderBy, limitToLast } = await import(`${FS_BASE}/firebase-firestore.js`);
    const q   = query(collection(_db, `companies/${_compId}/spaces/${spaceId}/messages`), orderBy('ts'), limitToLast(200));
    const off = onSnapshot(q, snap => callback(snap.docs.map(d => {
      const data = d.data();
      return {
        id:        d.id,
        senderId:  data.senderId  || '',
        sender:    data.sender    || '',
        color:     data.color     || '#228050',
        text:      data.text      || '',
        reactions: data.reactions || {},
        edited:    data.edited    || false,
        ts:        data.tsStr || data.ts?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    })));
    _listeners.push(off);
    return off;
  } catch(e) { return null; }
}

async function fsChatUpdateMsg(spaceId, msgId, updates) {
  if (!_db || !msgId) return;
  try {
    const { doc, updateDoc } = await import(`${FS_BASE}/firebase-firestore.js`);
    await updateDoc(doc(_db, `companies/${_compId}/spaces/${spaceId}/messages/${msgId}`), updates);
  } catch(e) { console.error('[fsChatUpdateMsg]', e.message); }
}

async function fsChatDeleteMsg(spaceId, msgId) {
  if (!_db || !msgId) return;
  try {
    const { doc, deleteDoc } = await import(`${FS_BASE}/firebase-firestore.js`);
    await deleteDoc(doc(_db, `companies/${_compId}/spaces/${spaceId}/messages/${msgId}`));
  } catch(e) { console.error('[fsChatDeleteMsg]', e.message); }
}

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */

function _path(collection) { return `companies/${_compId}/${collection}`; }

function showFsSyncStatus(msg, success, error) {
  let el = document.getElementById('fs-sync-status');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fs-sync-status';
    el.style.cssText = [
      'position:fixed;bottom:80px;left:50%;transform:translateX(-50%)',
      'background:#1a1d21;color:#fff;padding:8px 18px;border-radius:20px',
      'font-size:12px;font-weight:600;z-index:9999;transition:opacity .4s',
      'white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.3);pointer-events:none',
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent  = msg;
  el.style.opacity = '1';
  el.style.background = success ? '#228050' : error ? '#c62828' : '#1a1d21';
  if (success || error) setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

const _PAGE_RENDER_FNS = [
  'renderLeads','renderCustomers','renderBookings','renderPayments',
  'renderQuotationsPage','renderPackages','renderInvoices',
  'renderHRMSOverview','renderAllReports','renderDashboard','renderIncentiveDashboard',
  'mktRenderOverview',
];
function _fsRefreshPage() {
  for (const fn of _PAGE_RENDER_FNS) {
    if (typeof window[fn] === 'function') { window[fn](); return; }
  }
}

/* ══════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════ */

window.fsInit          = fsInit;
window.fsSave          = fsSave;
window.fsDelete        = fsDelete;
window.fsListen        = fsListen;
window.fsSyncDown      = _loadAll;       // backward compat
window.fsSyncUp        = _pushAll;       // backward compat
window.fsLoadSettings  = fsLoadSettings;
window.fsSaveSettings  = fsSaveSettings;
window.fsUploadFile    = fsUploadFile;
window.fsDeleteFile    = fsDeleteFile;
window.fsFileURL       = fsFileURL;
window.fsDedup         = fsDedup;
window.fsDedupReport   = fsDedupReport;
window.fsDataHealth    = fsDataHealth;
window.fsGetOnlineUsers= fsGetOnlineUsers;
window.fsChatSend      = fsChatSend;
window.fsChatListen    = fsChatListen;
window.fsChatUpdateMsg = fsChatUpdateMsg;
window.fsChatDeleteMsg = fsChatDeleteMsg;
window.showFsSyncStatus= showFsSyncStatus;
window.fsStartListeners= _attachListeners; // backward compat
window._fsRefreshPage  = _fsRefreshPage;
window._fsReady        = false;

/* ── Auto-init on load ── */
(async () => { await fsInit(); })();
