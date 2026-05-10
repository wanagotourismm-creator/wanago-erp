// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firestore Service Layer v2
//  Wraps all CRUD with immediate Firestore writes + local cache
//  Drop-in replacement that works alongside existing saveDB()
// ═══════════════════════════════════════════════════════════════

'use strict';

/* ─────────────────────────────────────────────────────────────
   CORE CRUD — use these instead of saveDB() for mutations
───────────────────────────────────────────────────────────── */

/**
 * Save or update one record in both DB cache and Firestore
 * @param {string} collection - e.g. 'leads', 'bookings'
 * @param {object} record     - must have .id
 */
window.saveRecord = function(collection, record) {
  if (!record || !record.id) { console.warn('[saveRecord] missing id'); return; }

  // 1. Update local DB cache
  const arr = DB[collection];
  if (Array.isArray(arr)) {
    const idx = arr.findIndex(x => x.id === record.id);
    if (idx > -1) { arr[idx] = record; } else { arr.unshift(record); }
  }

  // 2. Save to localStorage immediately (survives refresh)
  saveDB({ silent: true });

  // 3. Push to Firestore (async — non-blocking)
  if (typeof dbSave === 'function') {
    dbSave(collection, record).catch(e => console.warn('[saveRecord:Firestore]', e.message));
  } else if (typeof fsSave === 'function') {
    fsSave(collection, record.id, record).catch(e => console.warn('[saveRecord:fsSave]', e.message));
  }
};

/**
 * Delete one record from DB cache and Firestore
 * @param {string} collection
 * @param {string} id
 */
window.deleteRecord = function(collection, id) {
  if (!id) return;

  // 1. Remove from local cache
  if (Array.isArray(DB[collection])) {
    DB[collection] = DB[collection].filter(x => x.id !== id);
  }

  // 2. Update localStorage
  saveDB({ silent: true });

  // 3. Delete from Firestore
  if (typeof dbDelete === 'function') {
    dbDelete(collection, id).catch(e => console.warn('[deleteRecord:Firestore]', e.message));
  } else if (typeof fsDelete === 'function') {
    fsDelete(collection, id).catch(e => console.warn('[deleteRecord:fsDelete]', e.message));
  }
};

/**
 * Create a new record with auto ID and timestamps
 * @param {string} collection
 * @param {object} data
 * @returns {object} the new record
 */
window.createRecord = function(collection, data) {
  const record = {
    id: (typeof uid === 'function') ? uid() : ('r' + Date.now() + Math.random().toString(36).slice(2,7)),
    ...data,
    officeId:  (typeof officeIdForNewRecord === 'function') ? officeIdForNewRecord() : (DB.settings?.offices?.[0]?.id || 'o1'),
    createdBy: (typeof createdByStamp === 'function') ? createdByStamp() : (window.currentUser?.id || 'system'),
    createdAt: new Date().toISOString(),
  };

  // Push to array
  if (Array.isArray(DB[collection])) {
    DB[collection].unshift(record);
  }

  // Persist
  saveDB({ silent: true });

  if (typeof dbSave === 'function') {
    dbSave(collection, record).catch(e => console.warn('[createRecord:Firestore]', e.message));
  } else if (typeof fsSave === 'function') {
    fsSave(collection, record.id, record).catch(e => console.warn('[createRecord:fsSave]', e.message));
  }

  // Log activity
  if (typeof logActivity === 'function') {
    logActivity('Created ' + collection.slice(0,-1), record.id, collection);
  }

  return record;
};

/**
 * Update specific fields on an existing record
 * @param {string} collection
 * @param {string} id
 * @param {object} updates - partial fields to merge
 * @returns {object|null} updated record
 */
window.updateRecord = function(collection, id, updates) {
  const arr = DB[collection];
  if (!Array.isArray(arr)) return null;
  const idx = arr.findIndex(x => x.id === id);
  if (idx === -1) return null;

  const updated = { ...arr[idx], ...updates, updatedAt: new Date().toISOString() };
  arr[idx] = updated;

  saveDB({ silent: true });

  if (typeof dbSave === 'function') {
    dbSave(collection, updated).catch(e => console.warn('[updateRecord:Firestore]', e.message));
  } else if (typeof fsSave === 'function') {
    fsSave(collection, id, updated).catch(e => console.warn('[updateRecord:fsSave]', e.message));
  }

  return updated;
};

/**
 * Bulk update multiple records by IDs
 */
window.bulkUpdateRecords = function(collection, ids, updates) {
  ids.forEach(id => updateRecord(collection, id, updates));
};

/**
 * Bulk delete multiple records
 */
window.bulkDeleteRecords = function(collection, ids) {
  ids.forEach(id => deleteRecord(collection, id));
};

/* ─────────────────────────────────────────────────────────────
   ACTIVITY LOGGER — logs to Firestore activity_log collection
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
    // Save to Firestore directly
    if (typeof fsSave === 'function') {
      await fsSave('activities', entry.id, entry);
    }
  } catch(e) { /* non-critical */ }
};

/* ─────────────────────────────────────────────────────────────
   SETTINGS SYNC — save settings to Firestore
───────────────────────────────────────────────────────────── */

window.saveSettings = function() {
  saveDB({ silent: true });
  if (typeof fsSaveSettings === 'function') {
    fsSaveSettings().catch(e => console.warn('[saveSettings]', e.message));
  }
  if (typeof showToast === 'function') showToast('Settings saved ✅');
};

/* ─────────────────────────────────────────────────────────────
   FIRESTORE STATUS HELPERS
───────────────────────────────────────────────────────────── */

window.isFirestoreReady = function() {
  return !!(window._fsReady && typeof fsSave === 'function');
};

window.waitForFirestore = function(callback, timeout) {
  if (window._fsReady) { callback(); return; }
  var elapsed = 0;
  var interval = setInterval(function() {
    elapsed += 100;
    if (window._fsReady) { clearInterval(interval); callback(); }
    else if (elapsed >= (timeout || 5000)) { clearInterval(interval); callback(); } // run anyway
  }, 100);
};

console.log('[services.js] Wanago Service Layer v2 loaded ✅');
