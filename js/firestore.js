// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firestore Data Layer v3.1 (Path-Fixed)
//
//  CRITICAL FIX v3.1:
//  Firestore requires EVEN segment count for doc() references
//  and ODD segment count for collection() references.
//
//  BEFORE (BROKEN):
//    doc(_db, `companies/${_compId}`, 'settings')
//    → resolves to "companies/wanago-erp/settings" = 3 segments = ODD
//    → Firestore throws: "Expected DocumentReference, got CollectionReference"
//    → This caused settings corruption, disappearing leads, listener crashes
//
//  AFTER (FIXED):
//    doc(_db, _configPath(), 'settings')
//    → resolves to "companies/wanago-erp/config/settings" = 4 segments = EVEN ✓
//    → doc() is valid, listeners work, data persists correctly
//
//  admin-features.js & notify.js hardcode 'wanago-erp' and use a
//  separate _af_db instance — those are patched in admin-features-fix.js
// ═══════════════════════════════════════════════════════════════

const FS_VER  = '10.12.0';
const FS_BASE = `https://www.gstatic.com/firebasejs/${FS_VER}`;

const FS_COLLECTIONS = [
  'leads','customers','quotations','packages','bookings',
  'invoices','payments','expenses','campaigns','segments','activities','tickets',
  'hrmsEmployees','hrmsLeaves','hrmsPayroll','hrmsCheckIns','hrmsLocRequests',
  'itineraries','suppliers','chatMessages',
  'tasks','rewards','pointsLog',
];
const FS_SETTINGS_DOC  = 'settings';
const FS_MIGRATE_FLAG  = 'wanago_ls_migrated_v3';
const FS_DIRTY_FLAG    = 'wanago_erp_v3_dirty';
const FS_PRESENCE_PATH = 'presence';

let _db       = null;
let _storage  = null;
let _compId   = null;
let _fsReady  = false;
let _listeners = [];
let _pushTimer = null;
let _pendingWrites = [];
let _initialSnapDone = {};

// ── Race 3 Fix: in-flight write tracking ──────────────────────
// When fsSave() is called for a record, we track its ID here.
// fsListen()'s onSnapshot will NOT overwrite a record that has
// a pending write — preventing the "save then immediately lost" bug.
const _inflightWrites = new Map(); // collection → Set of ids


// ─────────────────────────────────────────────────────────────
//  PATH HELPERS — centralised, type-safe
// ─────────────────────────────────────────────────────────────

/**
 * Returns the Firestore collection path for a data collection.
 * "companies/wanago-erp/leads" → 3 segments (ODD) → valid collection() arg.
 */
function _path(col) {
  return `companies/${_compId}/${col}`;
}

/**
 * Returns the Firestore collection path for config documents (settings, extras).
 * "companies/wanago-erp/config" → 3 segments (ODD) → valid collection() arg.
 * Combined with a docId: doc(_db, _configPath(), 'settings')
 * = "companies/wanago-erp/config/settings" → 4 segments (EVEN) → valid doc() arg. ✓
 *
 * WHY THIS FIXES THE BUG:
 * Old code: doc(_db, `companies/${_compId}`, 'settings')
 *   → path = "companies" + "/" + "wanago-erp" + "/" + "settings" = 3 segs (ODD) = INVALID
 * New code: doc(_db, _configPath(), 'settings')
 *   → path = "companies/wanago-erp/config" + "/" + "settings" = 4 segs (EVEN) = VALID ✓
 */
function _configPath() {
  return `companies/${_compId}/config`;
}

/* ══════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════ */

async function fsInit() {
  try {
    const FB_CFG_FS = {
      apiKey:            "AIzaSyCRm_YW-TsVvzpF3SC275ZeLqr-0n2ZzvU",
      authDomain:        "wanago-erp.firebaseapp.com",
      projectId:         "wanago-erp",
      storageBucket:     "wanago-erp.firebasestorage.app",
      messagingSenderId: "445920648182",
      appId:             "1:445920648182:web:2ef6f9110767bc9f36c5d7"
    };

    const { initializeApp: _fsInitApp, getApps: _fsGetApps } = await import(`${FS_BASE}/firebase-app.js`);
    const { getAuth: _fsGetAuth }    = await import(`${FS_BASE}/firebase-auth.js`);
    const { getFirestore: _fsGetFs } = await import(`${FS_BASE}/firebase-firestore.js`);
    const { getStorage: _fsGetSt }   = await import(`${FS_BASE}/firebase-storage.js`);

    const _fsApps = _fsGetApps();
    const _fsApp  = _fsApps.length ? _fsApps[0] : _fsInitApp(FB_CFG_FS);
    window._fsApp = _fsApp; // expose for persistence re-init
    const cfg     = { auth: _fsGetAuth(_fsApp), db: _fsGetFs(_fsApp), storage: _fsGetSt(_fsApp) };

    if (!cfg.db) { _loadLocalFallback(); return false; }

    _db      = cfg.db;
    _storage = cfg.storage || null;
    _compId  = cfg.db.app.options.projectId;  // "wanago-erp"

    // Enable offline persistence using the modern API (replaces deprecated
    // enableMultiTabIndexedDbPersistence which will be removed in a future SDK version)
    try {
      const {
        initializeFirestore,
        persistentLocalCache,
        persistentMultipleTabManager,
      } = await import(`${FS_BASE}/firebase-firestore.js`);
      // Re-initialize with persistent cache settings
      // This is safe to call even if getFirestore() was already called —
      // initializeFirestore must be called BEFORE getFirestore() ideally,
      // but the try/catch handles the "already initialized" case gracefully.
      _db = initializeFirestore(_fsApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch(e) {
      // Already initialized or not supported — keep existing _db instance
      // This is non-critical: app works without offline persistence
    }

    _fsReady        = true;
    window._fsReady = true;

    // Flush writes queued before Firestore was ready
    if (_pendingWrites.length) {
      const pending = _pendingWrites.splice(0);
      await Promise.all(pending.map(w => fsSave(w.collection, w.docId, w.data)));
    }

    // Push any dirty local data FIRST — before _loadAll() overwrites DB with cloud data
    if (localStorage.getItem(FS_DIRTY_FLAG)) {
      try { await _pushAll(); } catch(e) { console.warn('[fsInit] dirty-flush failed:', e.message); }
    }

    await _migrateFromLocalStorage();
    await _loadAll();
    _attachListeners();
    _startPresence();

    console.log('[Firestore v3.1] Ready. Project:', _compId, '| Config path:', _configPath());
    // Signal all waitForFirestore() callbacks to fire now
    if (typeof window._onFirestoreReady === 'function') window._onFirestoreReady();
    return true;
  } catch (e) {
    console.error('[Firestore] init failed:', e.message);
    _loadLocalFallback();
    return false;
  }
}

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

    showFsSyncStatus('Migrating data to Firebase…');

    FS_COLLECTIONS.forEach(col => {
      if (Array.isArray(lsData[col]) && lsData[col].length) DB[col] = lsData[col];
    });
    if (lsData.settings) Object.assign(DB.settings, lsData.settings);

    await _pushAll();

    localStorage.setItem(FS_MIGRATE_FLAG, '1');
    localStorage.removeItem('wanago_erp_v2');
    localStorage.removeItem('wanago_uid_map');
    localStorage.removeItem('wanago_sheets_url');

    showFsSyncStatus('All data migrated to Firebase!', true);
  } catch (e) {
    console.error('[Migration] failed:', e.message);
    localStorage.setItem(FS_MIGRATE_FLAG, '1');
  }
}

/* ══════════════════════════════════════════════════
   LOAD ALL DATA
══════════════════════════════════════════════════ */

async function _loadAll() {
  if (!_db) return;
  showFsSyncStatus('Loading…');
  try {
    const { collection, getDocs, doc, getDoc } = await import(`${FS_BASE}/firebase-firestore.js`);

    // Load all data collections in parallel
    await Promise.all(FS_COLLECTIONS.map(async col => {
      try {
        // Limit initial load to 500 records per collection for performance
        // Real-time listeners will catch any remaining records
        const { query: fsQuery, limit: fsLimit } = await import(`${FS_BASE}/firebase-firestore.js`).catch(() => ({}));
        const colRef = collection(_db, _path(col));
        const snap = await getDocs(fsQuery ? fsQuery(colRef, fsLimit(500)) : colRef);
        const fsRecords = snap.empty ? [] : snap.docs.map(d => _fromFirestoreDoc(d));
        const fsIds = new Set(fsRecords.map(r => r.id));
        const localPending = (DB[col] || []).filter(r => r.id && !fsIds.has(r.id));
        if (fsRecords.length || localPending.length) {
          DB[col] = _sortRecords([...fsRecords, ...localPending]);
          if (localPending.length) localPending.forEach(item => fsSave(col, item.id, item));
        }
      } catch(e) { /* collection doesn't exist yet — normal on first run */ }
    }));

    // Load settings — FIXED PATH: _configPath() gives 3-seg collection, 'settings' is docId = 4 segs EVEN ✓
    try {
      const snap = await getDoc(doc(_db, _configPath(), FS_SETTINGS_DOC));
      if (snap.exists()) {
        const d = snap.data();
        delete d._updatedAt;
        Object.assign(DB.settings, d);
      } else {
        // Try old broken path as one-time migration for existing data
        await _tryMigrateOldConfigPath();
      }
    } catch(e) { console.warn('[_loadAll:settings]', e.message); }

    // Load extras — FIXED PATH: _configPath() = 3-seg collection, 'extras' is docId = 4 segs EVEN ✓
    try {
      const extSnap = await getDoc(doc(_db, _configPath(), 'extras'));
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
    } catch(e) { console.warn('[_loadAll:extras]', e.message); }

    showFsSyncStatus('Synced', true);

    if (typeof loadSessionUser === 'function') loadSessionUser();
    if (typeof window.rebuildSidebar === 'function') window.rebuildSidebar();
    _fsRefreshPage();
  } catch (e) {
    console.error('[Load] failed:', e.message);
    showFsSyncStatus('Load failed', false, true);
  }
}

/**
 * One-time migration: if data exists at the old invalid path, copy it to the new valid path.
 * The old path (companies/wanago-erp/settings as a 3-seg path) may have accidentally
 * written a collection named "settings" instead of a document. This tries both interpretations.
 */
async function _tryMigrateOldConfigPath() {
  if (!_db || !_compId) return;
  try {
    const { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } =
      await import(`${FS_BASE}/firebase-firestore.js`);

    // The old code tried to write doc(db, 'companies/wanago-erp', 'settings').
    // Firebase may have silently stored it or rejected it.
    // Some Firebase SDK versions are lenient and create the path anyway.
    // We try to read it as a document at the full path.
    let oldData = null;
    try {
      // Attempt 1: read as doc at companies/wanago-erp/settings (3-seg path — may work in some SDK versions)
      const oldSnap = await getDoc(doc(_db, 'companies', _compId, FS_SETTINGS_DOC));
      if (oldSnap.exists()) {
        oldData = oldSnap.data();
        console.log('[Migration] Found old settings at companies/' + _compId + '/' + FS_SETTINGS_DOC);
      }
    } catch(e) { /* path was truly invalid and never written */ }

    if (oldData) {
      delete oldData._updatedAt;
      Object.assign(DB.settings, oldData);
      // Write to the correct new path
      await setDoc(doc(_db, _configPath(), FS_SETTINGS_DOC), {
        ..._cleanForFirestore(DB.settings),
        _updatedAt: serverTimestamp(),
        _migratedFrom: 'old_invalid_path',
      }, { merge: true });
      console.log('[Migration] Settings migrated to correct path:', _configPath() + '/settings');
    }
  } catch(e) {
    console.warn('[_tryMigrateOldConfigPath]', e.message);
  }
}

/* ══════════════════════════════════════════════════
   REAL-TIME LISTENERS
══════════════════════════════════════════════════ */

function _attachListeners() {
  [
    'leads', 'customers', 'bookings', 'payments', 'expenses', 'activities',
    'quotations', 'invoices', 'hrmsEmployees', 'hrmsLeaves',
    'campaigns', 'packages', 'tickets', 'tasks', 'hrmsCheckIns',
  ].forEach(col => { fsListen(col); });

  _listenSettings();
}

async function _listenSettings() {
  if (!_fsReady || !_db) return;
  try {
    const { doc, onSnapshot } = await import(`${FS_BASE}/firebase-firestore.js`);

    // FIXED: doc(_db, _configPath(), FS_SETTINGS_DOC) = 4 segments = EVEN = VALID ✓
    // OLD (broken): doc(_db, `companies/${_compId}`, FS_SETTINGS_DOC) = 3 segments = ODD = INVALID
    const off = onSnapshot(
      doc(_db, _configPath(), FS_SETTINGS_DOC),
      snap => {
        if (!snap.exists()) return;
        const data = snap.data();
        delete data._updatedAt; delete data._updatedBy;
        DB.settings = Object.assign({}, DB.settings, data);
        try {
          const raw = localStorage.getItem('wanago_erp_v3');
          const cached = raw ? JSON.parse(raw) : {};
          cached.settings = DB.settings;
          localStorage.setItem('wanago_erp_v3', JSON.stringify(cached));
        } catch(e) {}
        _fsRefreshPage();
      },
      err => console.warn('[listenSettings]', err.message)
    );
    _listeners.push(off);
  } catch(e) { console.warn('[_listenSettings]', e.message); }
}

async function fsListen(collection, callback) {
  if (!_fsReady || !_db) return null;
  try {
    const { collection: col, onSnapshot } = await import(`${FS_BASE}/firebase-firestore.js`);
    const off = onSnapshot(col(_db, _path(collection)), snap => {
      if (_initialSnapDone[collection]) {
        const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
        snap.docChanges().forEach(function(change) {
          const data = change.doc.data();
          if ((change.type === 'added' || change.type === 'modified') &&
              data._updatedBy && data._updatedBy !== sess.uid) {
            if (typeof window.playNotifSound === 'function') window.playNotifSound('ding');
            if (typeof window.pushNotification === 'function') window.pushNotification({
              title: 'New ' + collection, message: 'Data updated by team member', type: 'info', sound: false
            });
          }
        });
      }

      const fsRecords = snap.docs.map(d => _fromFirestoreDoc(d));
      const fsIds = new Set(fsRecords.map(r => r.id));
      const localPending = (DB[collection] || []).filter(r => r.id && !fsIds.has(r.id));

      // Race 3 Fix: for records with an in-flight write, keep the LOCAL
      // version instead of the Firestore snapshot version.
      // This prevents the "save → immediately disappears" bug where the
      // snapshot arrives before Firestore confirms our write.
      const inflight = _inflightWrites.get(collection) || new Set();
      const mergedRecords = fsRecords.map(r => {
        if (inflight.has(r.id)) {
          // Keep local version — our write is still in flight
          const local = (DB[collection] || []).find(x => x.id === r.id);
          return local || r;
        }
        return r;
      });

      DB[collection] = _sortRecords([...mergedRecords, ...localPending]);

      if (!_initialSnapDone[collection]) {
        if (localPending.length) localPending.forEach(item => fsSave(collection, item.id, item));
        _initialSnapDone[collection] = true;
      }

      try {
        const raw = localStorage.getItem('wanago_erp_v3');
        const cached = raw ? JSON.parse(raw) : {};
        cached[collection] = DB[collection];
        localStorage.setItem('wanago_erp_v3', JSON.stringify(cached));
      } catch(e) {}

      // Notify all dbSubscribe() callbacks registered for this collection.
      // This is the single dispatch point — no other onSnapshot should exist
      // for this collection (dbSubscribe no longer creates its own).
      if (typeof window._notifySubscribers === 'function') {
        window._notifySubscribers(collection);
      }
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
  if (!_fsReady || !_db) {
    _pendingWrites.push({ collection, docId, data });
    return;
  }
  // Race 3 Fix: mark this record as in-flight so the onSnapshot
  // callback does not overwrite it before Firestore confirms the write.
  if (!_inflightWrites.has(collection)) _inflightWrites.set(collection, new Set());
  _inflightWrites.get(collection).add(docId);

  try {
    const { doc, setDoc, serverTimestamp } = await import(`${FS_BASE}/firebase-firestore.js`);
    await setDoc(doc(_db, _path(collection), docId), {
      ..._cleanForFirestore(data),
      _updatedAt: serverTimestamp(),
      _updatedBy: window.currentUser?.id || 'system',
    }, { merge: true });
  } catch (e) {
    console.error('[fsSave]', e.message);
  } finally {
    // Unmark in-flight after write completes (success or fail)
    const s = _inflightWrites.get(collection);
    if (s) { s.delete(docId); if (!s.size) _inflightWrites.delete(collection); }
  }
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
  }, 2000);
};

window._fsPushDBNow = function() {
  clearTimeout(_pushTimer);
  return _pushAll().catch(e => console.warn('[PushNow]', e.message));
};

async function _pushAll() {
  if (!_fsReady || !_db) return;
  let collectionsOk = true;
  let extrasOk = true;
  try {
    const { doc, writeBatch, setDoc, serverTimestamp } = await import(`${FS_BASE}/firebase-firestore.js`);
    const ts  = serverTimestamp();
    const uid = window.currentUser?.id || 'system';

    for (const col of FS_COLLECTIONS) {
      const items = DB[col] || [];
      if (!items.length) continue;
      for (let i = 0; i < items.length; i += 400) {
        try {
          const batch = writeBatch(_db);
          items.slice(i, i + 400).forEach(item => {
            if (!item.id) return;
            // _path(col) = 3-seg collection, item.id = docId → 4 segs = EVEN = VALID ✓
            batch.set(
              doc(_db, _path(col), item.id),
              { ..._cleanForFirestore(item), _updatedAt: ts, _updatedBy: uid },
              { merge: true }
            );
          });
          await batch.commit();
        } catch(e) { console.warn(`[push:${col}]`, e.message); collectionsOk = false; }
      }
    }

    const settingsOk = await fsSaveSettings();

    // Save extras — FIXED PATH ✓
    try {
      const extrasClean = _cleanForFirestore({
        counters:          DB.counters          || {},
        incentiveSettings: DB.incentiveSettings || {},
        agentTargets:      DB.agentTargets      || {},
        incentiveLogs:     (DB.incentiveLogs    || []).slice(-500),
        agentWhatsApp:     DB.agentWhatsApp     || {},
        hrmsAttendance:    DB.hrmsAttendance    || {},
        policies:          DB.policies          || [],
        fcmTokens:         (DB.fcmTokens        || []).slice(-200),
      });
      // FIXED: doc(_db, _configPath(), 'extras') = 4 segments = EVEN = VALID ✓
      // OLD (broken): doc(_db, `companies/${_compId}`, 'extras') = 3 segments = ODD = INVALID
      await setDoc(
        doc(_db, _configPath(), 'extras'),
        { ...extrasClean, _updatedAt: ts, _updatedBy: uid },
        { merge: false }
      );
    } catch (e) { console.warn('[extras push]', e.message); extrasOk = false; }

    if (collectionsOk && settingsOk !== false && extrasOk) {
      localStorage.removeItem(FS_DIRTY_FLAG);
    }
  } catch (e) { console.error('[_pushAll]', e.message); }
}

/* ══════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════ */

async function fsLoadSettings() {
  if (!_db) return;
  try {
    const { doc, getDoc } = await import(`${FS_BASE}/firebase-firestore.js`);
    // FIXED: _configPath() + docId = 4 segs = VALID ✓
    const snap = await getDoc(doc(_db, _configPath(), FS_SETTINGS_DOC));
    if (snap.exists()) {
      const d = snap.data(); delete d._updatedAt;
      Object.assign(DB.settings, d);
    }
  } catch (e) { console.error('[fsLoadSettings]', e.message); }
}

async function fsLoadCollection(collectionName) {
  if (!_db) return [];
  try {
    const { collection, getDocs } = await import(`${FS_BASE}/firebase-firestore.js`);
    const snap = await getDocs(collection(_db, _path(collectionName)));
    return _sortRecords(snap.docs.map(d => _fromFirestoreDoc(d)));
  } catch (e) {
    console.error('[fsLoadCollection]', e.message);
    return [];
  }
}

async function fsSaveSettings() {
  if (!_db) return false;
  try {
    const { doc, setDoc, serverTimestamp } = await import(`${FS_BASE}/firebase-firestore.js`);
    const clean = _cleanForFirestore(DB.settings);
    // FIXED: doc(_db, _configPath(), FS_SETTINGS_DOC) = 4 segs = EVEN = VALID ✓
    // OLD (broken): doc(_db, `companies/${_compId}`, FS_SETTINGS_DOC) = 3 segs = ODD = INVALID
    await setDoc(
      doc(_db, _configPath(), FS_SETTINGS_DOC),
      { ...clean, _updatedAt: serverTimestamp() },
      { merge: true }
    );
    return true;
  } catch (e) {
    console.error('[fsSaveSettings]', e.message);
    try { localStorage.setItem(FS_DIRTY_FLAG, '1'); } catch(_) {}
    return false;
  }
}

/* ══════════════════════════════════════════════════
   FIREBASE STORAGE
══════════════════════════════════════════════════ */

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

async function fsDeleteFile(path) {
  if (!_storage) return;
  try {
    const { ref, deleteObject } = await import(`${FS_BASE}/firebase-storage.js`);
    await deleteObject(ref(_storage, `companies/${_compId}/${path}`));
  } catch(e) { console.warn('[fsDeleteFile]', e.message); }
}

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

function fsDedup(opts) {
  opts = opts || { leads: true, customers: true, bookings: true, invoices: true, payments: true };
  let removed = 0;

  function dedupBy(collection, keyFn) {
    const seen = new Map();
    const before = (DB[collection] || []).length;
    DB[collection] = (DB[collection] || []).filter(item => {
      const k = keyFn(item);
      if (!k) return true;
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
    showFsSyncStatus(`Removed ${removed} duplicate records`, true);
    _fsRefreshPage();
  } else {
    showFsSyncStatus('No duplicates found', true);
  }
  return removed;
}

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
  const leadsNoPhone = (DB.leads     || []).filter(l => !l.phone).length;
  const custNoEmail  = (DB.customers || []).filter(c => !c.email).length;

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
    const { doc, setDoc, deleteDoc, serverTimestamp } = await import(`${FS_BASE}/firebase-firestore.js`);
    const uid  = window.currentUser.id || 'unknown';
    const name = window.currentUser.name || 'User';

    // Presence path: _path('presence') = "companies/wanago-erp/presence" = 3 segs (collection)
    // doc(..., uid) = 4 segs = EVEN = VALID ✓  (same as before — was already correct)
    const ref = doc(_db, _path(FS_PRESENCE_PATH), uid);
    _presenceRef = ref;

    await setDoc(ref, {
      id:       uid,
      name:     name,
      role:     window.currentUser.role || '',
      page:     window.location.pathname.split('/').pop().replace('.html',''),
      lastSeen: serverTimestamp(),
      online:   true,
    }, { merge: true });

    window.addEventListener('beforeunload', () => {
      if (_presenceRef) deleteDoc(_presenceRef).catch(() => {});
    });
  } catch(e) { /* presence is non-critical */ }
}

async function fsGetOnlineUsers() {
  if (!_db) return [];
  try {
    const { collection, getDocs } = await import(`${FS_BASE}/firebase-firestore.js`);
    const snap = await getDocs(collection(_db, _path(FS_PRESENCE_PATH)));
    return snap.docs.map(d => d.data());
  } catch(e) { return []; }
}

/* ══════════════════════════════════════════════════
   WANAGO SPACE — real-time chat
   All chat paths are EVEN (valid doc refs) — no change needed
══════════════════════════════════════════════════ */

async function fsChatSend(spaceId, msgObj) {
  if (!_db) return;
  try {
    const { collection, addDoc, serverTimestamp } = await import(`${FS_BASE}/firebase-firestore.js`);
    // path: companies/wanago-erp/spaces/spaceId/messages = 5 segs (ODD) = valid collection ✓
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
    const q = query(
      collection(_db, `companies/${_compId}/spaces/${spaceId}/messages`),
      orderBy('ts'), limitToLast(200)
    );
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
    // path: companies/wanago-erp/spaces/spaceId/messages/msgId = 6 segs (EVEN) = valid doc ✓
    await updateDoc(doc(_db, `companies/${_compId}/spaces/${spaceId}/messages`, msgId), updates);
  } catch(e) { console.error('[fsChatUpdateMsg]', e.message); }
}

async function fsChatDeleteMsg(spaceId, msgId) {
  if (!_db || !msgId) return;
  try {
    const { doc, deleteDoc } = await import(`${FS_BASE}/firebase-firestore.js`);
    await deleteDoc(doc(_db, `companies/${_compId}/spaces/${spaceId}/messages`, msgId));
  } catch(e) { console.error('[fsChatDeleteMsg]', e.message); }
}

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */

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
  el.textContent   = msg;
  el.style.opacity = '1';
  el.style.background = success ? '#228050' : error ? '#c62828' : '#1a1d21';
  if (success || error) setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

const _PAGE_RENDER_FNS = [
  'renderLeads','renderCustomers','renderBookings','renderPayments',
  'renderQuotationsPage','renderPackages','renderInvoices',
  'renderHRMSOverview','renderAllReports','renderDashboard','renderIncentiveDashboard',
  'mktRenderOverview','renderSupport','renderAdminPage',
];
let _refreshDebounceTimer = null;
function _fsRefreshPage() {
  clearTimeout(_refreshDebounceTimer);
  _refreshDebounceTimer = setTimeout(function() { // 150ms debounce — reduces render thrashing
    for (const fn of _PAGE_RENDER_FNS) {
      if (typeof window[fn] === 'function') { window[fn](); return; }
    }
  }, 150);
}

function _cleanForFirestore(value) {
  if (value === undefined || typeof value === 'function') return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(_cleanForFirestore);
  if (typeof value === 'object') {
    const out = {};
    Object.keys(value).forEach(key => {
      if (value[key] !== undefined && typeof value[key] !== 'function') {
        out[key] = _cleanForFirestore(value[key]);
      }
    });
    return out;
  }
  return value;
}

function _fromFirestoreDoc(d) {
  const data = d.data();
  delete data._updatedAt;
  delete data._updatedBy;
  return { id: d.id, ...data };
}

function _sortRecords(records) {
  return [...records].sort((a, b) => {
    const ad = a.createdAt || a.date || a.tsStr || '';
    const bd = b.createdAt || b.date || b.tsStr || '';
    if (ad || bd) return String(bd).localeCompare(String(ad));
    return String(b.id || '').localeCompare(String(a.id || ''));
  });
}

/* ══════════════════════════════════════════════════
   PUBLIC API
══════════════════════════════════════════════════ */

window.fsInit           = fsInit;
window.fsSave           = fsSave;
window.fsDelete         = fsDelete;
window.fsListen         = fsListen;
window.fsSyncDown       = _loadAll;
window.fsSyncUp         = _pushAll;
window.fsLoadSettings   = fsLoadSettings;
window.fsLoadCollection = fsLoadCollection;
window.fsSaveSettings   = fsSaveSettings;
window.fsUploadFile     = fsUploadFile;
window.fsDeleteFile     = fsDeleteFile;
window.fsFileURL        = fsFileURL;
window.fsDedup          = fsDedup;
window.fsDedupReport    = fsDedupReport;
window.fsDataHealth     = fsDataHealth;
window.fsGetOnlineUsers = fsGetOnlineUsers;
window.fsChatSend       = fsChatSend;
window.fsChatListen     = fsChatListen;
window.fsChatUpdateMsg  = fsChatUpdateMsg;
window.fsChatDeleteMsg  = fsChatDeleteMsg;
window.showFsSyncStatus = showFsSyncStatus;
window.fsStartListeners = _attachListeners;
window._fsRefreshPage   = _fsRefreshPage;

// Helper: fetch team from Firestore (used by login.js when local DB is empty)
// FIXED: doc(_db, _configPath(), 'settings') = 4 segs = EVEN = VALID ✓
window._fsGetTeam = async function() {
  if (!_db || !_compId) return [];
  try {
    const { doc, getDoc } = await import(`${FS_BASE}/firebase-firestore.js`);
    const snap = await getDoc(doc(_db, _configPath(), FS_SETTINGS_DOC));
    if (!snap.exists()) return [];
    const data = snap.data();
    return Array.isArray(data.team) ? data.team : [];
  } catch(e) { return []; }
};

window._fsReady = false;

// Expose path helpers for admin-features.js to use
window._fsConfigPath = _configPath;
window._fsDataPath   = _path;
window._fsCompId     = () => _compId;

/* ── Auto-init on load ── */
(async () => { await fsInit(); })();
