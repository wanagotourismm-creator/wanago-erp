// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firestore Document Helpers v2
//  Per-document CRUD — wraps fsSave/fsDelete/fsListen from firestore.js
//
//  FIX v2: Duplicate Listener Prevention
//  ─────────────────────────────────────
//  PROBLEM:
//  firestore.js _attachListeners() already registers one onSnapshot
//  per collection when the app loads. Then every page also called
//  dbSubscribe() via waitForFirestore(), creating a SECOND (or third,
//  fourth, fifth) onSnapshot on the same Firestore collection.
//
//  For 'leads' alone there were 5 simultaneous onSnapshot listeners.
//  Each fires on every change → multiple concurrent renders → race
//  conditions → data appears to disappear or corrupt.
//
//  FIX:
//  dbSubscribe() no longer creates a new Firestore onSnapshot.
//  Instead it registers a local callback that firestore.js calls
//  after its single canonical listener receives an update.
//  One onSnapshot per collection. Many local callbacks. Zero duplication.
// ═══════════════════════════════════════════════════════════════

// ── Callback registry: collection → Set of callbacks ──────────
// firestore.js calls _notifySubscribers(collection) after each
// real-time update. dbSubscribe() just adds to this registry.
const _subscribers = {};

/**
 * Register a callback for real-time updates to a collection.
 * Returns an unsubscribe function.
 *
 * Does NOT create a new Firestore onSnapshot — the canonical
 * listener in firestore.js already covers every collection.
 */
function dbSubscribe(collection, callback) {
  if (typeof callback !== 'function') return () => {};

  if (!_subscribers[collection]) _subscribers[collection] = new Set();
  _subscribers[collection].add(callback);

  // Return unsubscribe fn so callers can clean up if needed
  return function unsubscribe() {
    if (_subscribers[collection]) _subscribers[collection].delete(callback);
  };
}

/**
 * Called by firestore.js fsListen() after every real-time snapshot.
 * Fires all registered callbacks for that collection.
 * Exposed on window so firestore.js can call it.
 */
function _notifySubscribers(collection) {
  const cbs = _subscribers[collection];
  if (!cbs || !cbs.size) return;
  cbs.forEach(cb => {
    try { cb(DB[collection]); } catch(e) {
      console.warn('[dbSubscribe] callback error in', collection, e.message);
    }
  });
}

// Save a single record to Firestore (does NOT do full fsSyncUp)
async function dbSave(collection, record) {
  if (!record?.id) return;
  if (typeof fsSave === 'function') {
    await fsSave(collection, record.id, record);
  }
}

// Delete a single document from Firestore
async function dbDelete(collection, docId) {
  if (typeof fsDelete === 'function') {
    await fsDelete(collection, docId);
  }
}

// Fetch all docs in a collection from Firestore
async function dbGetAll(collection) {
  if (typeof fsLoadCollection === 'function') {
    const docs = await fsLoadCollection(collection);
    if (docs) { DB[collection] = docs; saveDB(); }
    return docs;
  }
  return DB[collection] || [];
}

// Find customer by phone or auto-create (prevents duplicates)
function findOrCreateCustomer(phone, name, extra = {}) {
  phone = (phone || '').trim();
  if (!phone) return null;
  let c = DB.customers.find(x => x.phone === phone);
  if (c) return c;
  const colors = ['#134a32','#1976d2','#f57c00','#7b1fa2','#c9a84c'];
  c = {
    id: uid(),
    name: (name || '').trim(),
    phone,
    color: colors[Math.floor(Math.random() * colors.length)],
    tag: 'regular',
    bookingsCount: 0,
    totalSpent: 0,
    officeId: officeIdForNewRecord(),
    createdBy: createdByStamp(),
    createdAt: new Date().toISOString(),
    ...extra
  };
  DB.customers.unshift(c);
  if (typeof dbSave === 'function') dbSave('customers', c).catch(() => {});
  return c;
}

// Expose globally
window.dbSave              = dbSave;
window.dbDelete            = dbDelete;
window.dbSubscribe         = dbSubscribe;
window.dbGetAll            = dbGetAll;
window.findOrCreateCustomer= findOrCreateCustomer;
window._notifySubscribers  = _notifySubscribers;
