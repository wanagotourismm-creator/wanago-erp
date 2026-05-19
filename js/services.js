// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Service Layer v3 (Race Condition Fixed)
//
//  FIXES:
//  ──────
//  Race 1 — waitForFirestore() now stores callbacks in a queue.
//    If Firestore becomes ready AFTER a callback was registered,
//    it fires immediately. If already ready, fires synchronously.
//    No more polling loops. No more 5-second timeouts.
//
//  Race 4 — Single debounced render pipeline.
//    _fsRefreshPage(), callback(), and _notifySubscribers() all
//    previously triggered separate renders. Now one debounced
//    dispatch covers everything.
// ═══════════════════════════════════════════════════════════════

'use strict';

/* ─────────────────────────────────────────────────────────────
   RACE 1 FIX — waitForFirestore: queue-based, no polling
   ─────────────────────────────────────────────────────────────
   OLD: setInterval polling every 100ms → wastes CPU, misses
        callbacks registered after Firestore is already ready.
   NEW: callbacks queued; firestore.js signals readiness via
        window._onFirestoreReady(); queue flushes immediately.
───────────────────────────────────────────────────────────── */

const _fsReadyQueue = [];
let   _fsReadyFired = false;

/**
 * Run callback as soon as Firestore is ready.
 * If already ready → runs synchronously.
 * If not yet ready → queued and runs the moment fsInit() completes.
 */
window.waitForFirestore = function(callback) {
  if (typeof callback !== 'function') return;
  if (_fsReadyFired || window._fsReady) {
    // Already ready — run now
    try { callback(); } catch(e) { console.warn('[waitForFirestore] callback error:', e.message); }
    return;
  }
  // Queue for when Firestore signals readiness
  _fsReadyQueue.push(callback);
};

/**
 * Called by firestore.js at the end of fsInit() once ready.
 * Flushes all queued waitForFirestore callbacks in order.
 */
window._onFirestoreReady = function() {
  if (_fsReadyFired) return;   // only fire once
  _fsReadyFired = true;
  const queue = _fsReadyQueue.splice(0);
  queue.forEach(cb => {
    try { cb(); } catch(e) { console.warn('[_onFirestoreReady] callback error:', e.message); }
  });
};

/* ─────────────────────────────────────────────────────────────
   RACE 4 FIX — Single debounced render pipeline
   ─────────────────────────────────────────────────────────────
   Instead of _fsRefreshPage() AND callback() AND
   _notifySubscribers() all calling render functions separately,
   all updates flow through one debounced dispatcher.
   Render functions are called at most once per 80ms burst.
───────────────────────────────────────────────────────────── */

const _pendingRenders = new Set();
let   _renderTimer    = null;

/**
 * Queue a render function name to be called once after
 * the current burst of Firestore updates settles (80ms).
 * Prevents triple-renders on a single data change.
 */
window.queueRender = function(fnName) {
  _pendingRenders.add(fnName);
  clearTimeout(_renderTimer);
  _renderTimer = setTimeout(function() {
    const fns = [..._pendingRenders];
    _pendingRenders.clear();
    fns.forEach(function(fn) {
      if (typeof window[fn] === 'function') {
        try { window[fn](); } catch(e) { console.warn('[queueRender]', fn, e.message); }
      }
    });
  }, 80);
};

/* ─────────────────────────────────────────────────────────────
   CORE CRUD
───────────────────────────────────────────────────────────── */

window.saveRecord = function(collection, record) {
  if (!record || !record.id) { console.warn('[saveRecord] missing id'); return; }
  const arr = DB[collection];
  if (Array.isArray(arr)) {
    const idx = arr.findIndex(x => x.id === record.id);
    if (idx > -1) { arr[idx] = record; } else { arr.unshift(record); }
  }
  saveDB({ silent: true });
  if (typeof dbSave === 'function') {
    dbSave(collection, record).catch(e => console.warn('[saveRecord]', e.message));
  }
};

window.deleteRecord = function(collection, id) {
  if (!id) return;
  if (Array.isArray(DB[collection])) {
    DB[collection] = DB[collection].filter(x => x.id !== id);
  }
  saveDB({ silent: true });
  if (typeof dbDelete === 'function') {
    dbDelete(collection, id).catch(e => console.warn('[deleteRecord]', e.message));
  }
};

window.createRecord = function(collection, data) {
  const record = {
    id:        (typeof uid === 'function') ? uid() : ('r' + Date.now() + Math.random().toString(36).slice(2,7)),
    ...data,
    officeId:  (typeof officeIdForNewRecord === 'function') ? officeIdForNewRecord() : (DB.settings?.offices?.[0]?.id || 'o1'),
    createdBy: (typeof createdByStamp === 'function') ? createdByStamp() : (window.currentUser?.id || 'system'),
    createdAt: new Date().toISOString(),
  };
  if (Array.isArray(DB[collection])) DB[collection].unshift(record);
  saveDB({ silent: true });
  if (typeof dbSave === 'function') {
    dbSave(collection, record).catch(e => console.warn('[createRecord]', e.message));
  }
  if (typeof logActivity === 'function') {
    logActivity('Created ' + collection.slice(0,-1), record.id, collection);
  }
  return record;
};

window.updateRecord = function(collection, id, updates) {
  const arr = DB[collection];
  if (!Array.isArray(arr)) return null;
  const idx = arr.findIndex(x => x.id === id);
  if (idx === -1) return null;
  const updated = { ...arr[idx], ...updates, updatedAt: new Date().toISOString() };
  arr[idx] = updated;
  saveDB({ silent: true });
  if (typeof dbSave === 'function') {
    dbSave(collection, updated).catch(e => console.warn('[updateRecord]', e.message));
  }
  return updated;
};

window.bulkUpdateRecords = function(collection, ids, updates) {
  ids.forEach(id => updateRecord(collection, id, updates));
};

window.bulkDeleteRecords = function(collection, ids) {
  ids.forEach(id => deleteRecord(collection, id));
};

/* ─────────────────────────────────────────────────────────────
   ACTIVITY LOGGER
───────────────────────────────────────────────────────────── */

window.logActivityFS = async function(action, details, category, refId) {
  try {
    const sess = JSON.parse(sessionStorage.getItem('wanago_session') || '{}');
    const entry = {
      id:        'act_' + Date.now(),
      action:    action || 'Action',
      details:   details || '',
      category:  category || 'general',
      refId:     refId || null,
      userId:    sess.uid || 'system',
      userName:  sess.name || 'System',
      userEmail: sess.email || '',
      userRole:  sess.role || '',
      page:      window.location.pathname.split('/').pop().replace('.html',''),
      timestamp: new Date().toISOString(),
    };
    if (typeof fsSave === 'function') await fsSave('activities', entry.id, entry);
  } catch(e) {}
};

/* ─────────────────────────────────────────────────────────────
   SETTINGS SYNC
───────────────────────────────────────────────────────────── */

window.saveSettings = function() {
  saveDB({ silent: true });
  if (typeof fsSaveSettings === 'function') {
    fsSaveSettings().catch(e => console.warn('[saveSettings]', e.message));
  }
  if (typeof showToast === 'function') showToast('Settings saved');
};

window.isFirestoreReady = function() {
  return !!(window._fsReady && typeof fsSave === 'function');
};

console.log('[services.js v3] Loaded — race conditions fixed');
