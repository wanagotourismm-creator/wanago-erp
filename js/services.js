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


// ═══════════════════════════════════════════════════════════════
//  AUTO SKELETON LOADER SYSTEM
//
//  Automatically shows skeleton loading states before any
//  render function runs, and removes them after.
//  Zero changes needed to page JS files — works globally.
//
//  HOW IT WORKS:
//  1. _showPageSkeleton() fills known containers with shimmer
//  2. Page JS render functions run and replace the skeleton
//  3. If render fails, _clearPageSkeleton() cleans up
// ═══════════════════════════════════════════════════════════════

// Known table containers and their skeleton types
var _SKELETON_CONTAINERS = {
  'leads-tbody':      'table-rows',
  'bookings-tbody':   'table-rows',
  'customers-tbody':  'table-rows',
  'payments-tbody':   'table-rows',
  'invoices-tbody':   'table-rows',
  'exp-tbody':        'table-rows',
  'quotations-tbody': 'table-rows',
  'vl-body':          'table-rows',
  'vc-body':          'table-rows',
  'vi-body':          'table-rows',
  'emp-grid':         'card-grid',
  'pkg-cards-grid':   'card-grid',
  'dash-stats':       'stat-cards',
  'followups-tbody':  'table-rows',
};

// Generate skeleton HTML for a given type
function _skeletonHTML(type) {
  if (type === 'table-rows') {
    return Array(6).fill(0).map(function() {
      return '<tr class="skeleton-row"><td colspan="10" style="padding:12px 14px">' +
        '<div class="skeleton skeleton-text" style="width:' + (40 + Math.random()*40|0) + '%"></div>' +
        '</td></tr>';
    }).join('');
  }
  if (type === 'card-grid') {
    return Array(6).fill(0).map(function() {
      return '<div class="skeleton skeleton-card" style="min-height:140px;border-radius:14px"></div>';
    }).join('');
  }
  if (type === 'stat-cards') {
    return Array(4).fill(0).map(function() {
      return '<div class="skeleton-stat"><div class="skeleton skeleton-text" style="width:50%"></div>' +
             '<div class="skeleton skeleton-title"></div>' +
             '<div class="skeleton skeleton-text" style="width:40%"></div></div>';
    }).join('');
  }
  return '';
}

// Show skeletons in all known containers that are currently empty
window._showPageSkeleton = function() {
  Object.keys(_SKELETON_CONTAINERS).forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    // Only show skeleton if container appears empty
    var text = (el.textContent || '').trim();
    if (text.length < 10) {
      el.innerHTML = _skeletonHTML(_SKELETON_CONTAINERS[id]);
    }
  });
};

// Clear all skeletons (called if render fails)
window._clearPageSkeleton = function() {
  Object.keys(_SKELETON_CONTAINERS).forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.querySelector('.skeleton-row, .skeleton-card, .skeleton-stat')) {
      el.innerHTML = '';
    }
  });
};

// Auto-show skeleton on page load (before Firestore data arrives)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(window._showPageSkeleton, 50);
  });
} else {
  setTimeout(window._showPageSkeleton, 50);
}

// ── Button loading state helpers ─────────────────────────────

/**
 * Set a button into loading state.
 * Usage: var restore = setBtnLoading(btn);
 *        // ... async work ...
 *        restore();
 */
window.setBtnLoading = function(btn) {
  if (!btn) return function() {};
  var orig = btn.innerHTML;
  btn.classList.add('btn-loading');
  btn.disabled = true;
  return function restore() {
    btn.classList.remove('btn-loading');
    btn.disabled = false;
    btn.innerHTML = orig;
  };
};

/**
 * Wrap an async function with button loading state.
 * Usage: withBtnLoading(saveBtn, async function() { await saveData(); });
 */
window.withBtnLoading = function(btn, asyncFn) {
  var restore = setBtnLoading(btn);
  return Promise.resolve(asyncFn()).finally(function() {
    restore();
  });
};

// ── Page-level loading overlay ────────────────────────────────

/**
 * Show a full-page loading overlay.
 * Used during heavy operations like data export.
 */
window.showPageLoading = function(msg) {
  var existing = document.getElementById('page-loading-overlay');
  if (existing) return;
  var el = document.createElement('div');
  el.id = 'page-loading-overlay';
  el.style.cssText = [
    'position:fixed;inset:0;background:rgba(255,255,255,.85);',
    'z-index:9997;display:flex;flex-direction:column;',
    'align-items:center;justify-content:center;gap:14px;',
    'backdrop-filter:blur(2px);',
  ].join('');
  el.innerHTML = [
    '<div style="width:36px;height:36px;border:3px solid var(--border);',
    'border-top-color:var(--g500);border-radius:50%;animation:spin .7s linear infinite"></div>',
    '<div style="font-size:13px;font-weight:600;color:var(--textm)">',
    (msg || 'Loading...') + '</div>',
  ].join('');
  document.body.appendChild(el);
};

window.hidePageLoading = function() {
  var el = document.getElementById('page-loading-overlay');
  if (el) {
    el.style.opacity = '0';
    el.style.transition = 'opacity .2s';
    setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 200);
  }
};


console.log('[services.js v3] Loaded — race conditions fixed');
