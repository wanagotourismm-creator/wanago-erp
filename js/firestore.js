// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firestore Sync Module
//  Replaces localStorage with Firestore cloud database
//  Falls back to localStorage if Firebase not configured
// ═══════════════════════════════════════════════════════════════

const FS_COLLECTIONS = ['leads','customers','quotations','bookings','payments','invoices','packages','activities','hrmsEmployees','hrmsLeaves','hrmsPayroll','hrmsCheckIns','tasks'];
const FS_SETTINGS_DOC = 'settings';

let _db = null;
let _companyId = null; // Isolates data per company
let _fsReady = false;
let _syncListeners = [];

// ── Initialize Firestore ──
async function fsInit() {
  try {
    const cfg = await import('../firebase/firebase-config.js');
    if (!cfg.db) { console.log('Firestore: not configured, using localStorage'); return false; }
    _db = cfg.db;

    // Company ID = Firebase project ID (isolates data per company)
    _companyId = cfg.db.app.options.projectId;
    _fsReady = true;
    console.log('✅ Firestore connected:', _companyId);
    return true;
  } catch(e) {
    console.log('Firestore: falling back to localStorage', e.message);
    return false;
  }
}

// ── Get Firestore collection path ──
function fsCol(collection) {
  return `companies/${_companyId}/${collection}`;
}

// ── SAVE single document ──
async function fsSave(collection, docId, data) {
  if (!_fsReady || !_db) { saveDB(); return; }
  try {
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await setDoc(doc(_db, fsCol(collection), docId), {
      ...data,
      _updatedAt: serverTimestamp(),
      _updatedBy: window.currentUser?.id || 'system'
    }, { merge: true });
  } catch(e) {
    console.error('Firestore save error:', e);
    saveDB(); // fallback
  }
}

// ── DELETE document ──
async function fsDelete(collection, docId) {
  if (!_fsReady || !_db) return;
  try {
    const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await deleteDoc(doc(_db, fsCol(collection), docId));
  } catch(e) { console.error('Firestore delete error:', e); }
}

// ── LOAD all documents from a collection ──
async function fsLoadCollection(collection) {
  if (!_fsReady || !_db) return null;
  try {
    const { collection: col, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(col(_db, fsCol(collection)), orderBy('_updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    console.error('Firestore load error:', e);
    return null;
  }
}

// ── SYNC: Load all data from Firestore into localStorage DB ──
async function fsSyncDown() {
  if (!_fsReady || !_db) return false;

  showFsSyncStatus('⏳ Syncing data...');
  try {
    for (const col of FS_COLLECTIONS) {
      const docs = await fsLoadCollection(col);
      if (docs !== null) {
        DB[col] = docs;
      }
    }
    // Load settings
    await fsLoadSettings();
    saveDB();
    showFsSyncStatus('✅ Synced', true);
    // Re-render current page with fresh Firestore data
    _fsRefreshPage();
    return true;
  } catch(e) {
    console.error('Sync error:', e);
    showFsSyncStatus('⚠️ Sync failed', false, true);
    return false;
  }
}

// ── SYNC: Push all localStorage data to Firestore ──
async function fsSyncUp() {
  if (!_fsReady || !_db) return false;

  showFsSyncStatus('⬆️ Uploading data...');
  try {
    const { doc, setDoc, writeBatch, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');

    for (const colName of FS_COLLECTIONS) {
      const items = DB[colName] || [];
      if (!items.length) continue;

      // Use batch writes (max 500 per batch)
      const chunks = [];
      for (let i = 0; i < items.length; i += 400) chunks.push(items.slice(i, i+400));

      for (const chunk of chunks) {
        const batch = writeBatch(_db);
        chunk.forEach(item => {
          if (!item.id) return;
          const ref = doc(_db, fsCol(colName), item.id);
          batch.set(ref, { ...item, _updatedAt: serverTimestamp() }, { merge: true });
        });
        await batch.commit();
      }
    }

    // Save settings
    await fsSaveSettings();
    showFsSyncStatus('✅ Upload complete', true);
    return true;
  } catch(e) {
    console.error('Upload error:', e);
    showFsSyncStatus('⚠️ Upload failed', false, true);
    return false;
  }
}

// ── Settings ──
async function fsLoadSettings() {
  try {
    const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const snap = await getDoc(doc(_db, `companies/${_companyId}`, FS_SETTINGS_DOC));
    if (snap.exists()) {
      const data = snap.data();
      // Merge with existing (don't overwrite team array if empty in cloud)
      Object.assign(DB.settings, data);
    }
  } catch(e) { console.error('Settings load error:', e); }
}

async function fsSaveSettings() {
  try {
    const { doc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    await setDoc(doc(_db, `companies/${_companyId}`, FS_SETTINGS_DOC), {
      ...DB.settings,
      _updatedAt: serverTimestamp()
    }, { merge: true });
  } catch(e) { console.error('Settings save error:', e); }
}

// ── Real-time listener for a collection ──
async function fsListen(collection, callback) {
  if (!_fsReady || !_db) return null;
  try {
    const { collection: col, onSnapshot, query, orderBy, limit } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const q = query(col(_db, fsCol(collection)), orderBy('_updatedAt', 'desc'), limit(500));
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      DB[collection] = docs;
      saveDB();
      if (callback) callback(docs);
    });
    _syncListeners.push(unsub);
    return unsub;
  } catch(e) {
    console.error('Listener error:', e);
    return null;
  }
}

// ── Status indicator ──
function showFsSyncStatus(msg, success, error) {
  let el = document.getElementById('fs-sync-status');
  if (!el) {
    el = document.createElement('div');
    el.id = 'fs-sync-status';
    el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1a1d21;color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;font-weight:600;z-index:9999;transition:opacity .4s;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.3)';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  if (success) el.style.background = '#228050';
  else if (error) el.style.background = '#c62828';
  else el.style.background = '#1a1d21';
  if (success || error) setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

// ── Re-render current page after fresh Firestore data ──
// Calls whichever render function exists on the page (no-op if none)
const _PAGE_RENDER_FNS = [
  'renderLeads','renderCustomers','renderBookings','renderPayments',
  'renderQuotationsPage','renderPackages','renderInvoices',
  'renderHRMSOverview','renderAllReports','renderDashboard','renderIncentiveDashboard',
];
function _fsRefreshPage() {
  for (const fn of _PAGE_RENDER_FNS) {
    if (typeof window[fn] === 'function') { window[fn](); return; }
  }
}
window._fsRefreshPage = _fsRefreshPage;

// ── Override saveDB to also sync to Firestore (debounced 2s) ──
let _syncDebounce = null;
const _originalSaveDB = window.saveDB;
window.saveDB = function() {
  if (typeof _originalSaveDB === 'function') _originalSaveDB();
  if (_fsReady && _db) {
    clearTimeout(_syncDebounce);
    _syncDebounce = setTimeout(() => {
      fsSyncUp().catch(e => console.warn('Background sync failed:', e));
    }, 2000);
  }
};

// ── Expose functions ──
window.fsInit = fsInit;
window.fsSyncDown = fsSyncDown;
window.fsSyncUp = fsSyncUp;
window.fsSave = fsSave;
window.fsDelete = fsDelete;
window.fsListen = fsListen;
window.fsLoadSettings = fsLoadSettings;
window.fsSaveSettings = fsSaveSettings;
window.showFsSyncStatus = showFsSyncStatus;
window._fsReady = false;

// ── Realtime listeners for critical collections ──
// Call this after fsInit() to enable live updates
async function fsStartListeners(renderCallbacks = {}) {
  if (!_fsReady || !_db) return;
  const live = ['leads', 'customers', 'bookings'];
  for (const col of live) {
    await fsListen(col, (docs) => {
      if (typeof renderCallbacks[col] === 'function') renderCallbacks[col](docs);
    });
  }
}
window.fsStartListeners = fsStartListeners;

// Auto-init when loaded
(async () => {
  const ready = await fsInit();
  window._fsReady = ready;
  if (ready) {
    await fsSyncDown();
    // Start realtime listeners — call page render functions on updates
    await fsStartListeners({
      leads:     () => { if (typeof window.renderLeads     === 'function') window.renderLeads();     },
      customers: () => { if (typeof window.renderCustomers === 'function') window.renderCustomers(); },
      bookings:  () => { if (typeof window.renderBookings  === 'function') window.renderBookings();  },
    });
  }
})();
