// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Firestore Document Helpers
//  Per-document CRUD — wraps fsSave/fsDelete/fsListen from firestore.js
// ═══════════════════════════════════════════════════════════════

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

// Subscribe to realtime updates for a collection
function dbSubscribe(collection, callback) {
  if (typeof fsListen === 'function') {
    return fsListen(collection, callback);
  }
  return null;
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
  return c;
}

window.dbSave = dbSave;
window.dbDelete = dbDelete;
window.dbSubscribe = dbSubscribe;
window.dbGetAll = dbGetAll;
window.findOrCreateCustomer = findOrCreateCustomer;
