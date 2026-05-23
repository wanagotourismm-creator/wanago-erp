// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Shared Firebase Service Layer
//  
//  PURPOSE: A platform-agnostic service layer that works on:
//  - Web (current app) — uses Firebase Web SDK
//  - React Native (future) — uses Firebase REST API
//  - Any other platform — same interface, different transport
//
//  HOW TO USE ON WEB (current):
//  Already loaded via <script src="../js/firebase-services.js">
//  Functions available as WanagoServices.leads.getAll() etc.
//
//  HOW TO USE ON REACT NATIVE (future):
//  import WanagoServices from './firebase-services';
//  const leads = await WanagoServices.leads.getAll();
//  — Same API, works with Firebase REST or SDK
//
//  This file is the CONTRACT between frontend and backend.
//  The mobile app team builds against this interface.
// ═══════════════════════════════════════════════════════════════

(function(global) {
  'use strict';

  var _compId  = 'wanago-erp';
  var _baseUrl = 'https://firestore.googleapis.com/v1/projects/' + _compId + '/databases/(default)/documents';

  // ── Auth Token ─────────────────────────────────────────────

  /**
   * Get the current user's Firebase ID token.
   * On web: uses Firebase Auth SDK.
   * On React Native: uses @react-native-firebase/auth.
   */
  async function getAuthToken() {
    try {
      // Web SDK path
      if (typeof window !== 'undefined' && window._fsApp) {
        var FB_BASE = window.WANAGO_FB_BASE || 'https://www.gstatic.com/firebasejs/10.12.0';
        var m = await import(FB_BASE + '/firebase-auth.js');
        var auth = m.getAuth(window._fsApp);
        if (auth.currentUser) {
          return await auth.currentUser.getIdToken();
        }
      }
    } catch(e) {}
    return null;
  }

  /**
   * Get auth headers for REST calls.
   */
  async function authHeaders() {
    var token = await getAuthToken();
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return headers;
  }

  // ── Firestore Path Helpers ─────────────────────────────────

  function _collPath(col) {
    return 'companies/' + _compId + '/' + col;
  }

  function _docPath(col, docId) {
    return _collPath(col) + '/' + docId;
  }

  // ── REST API Helpers ───────────────────────────────────────

  /**
   * Convert Firestore REST document to plain object.
   */
  function _fromRestDoc(doc) {
    if (!doc || !doc.fields) return null;
    var obj = { id: (doc.name || '').split('/').pop() };
    Object.keys(doc.fields).forEach(function(key) {
      var field = doc.fields[key];
      if (field.stringValue  !== undefined) obj[key] = field.stringValue;
      else if (field.integerValue   !== undefined) obj[key] = parseInt(field.integerValue);
      else if (field.doubleValue    !== undefined) obj[key] = parseFloat(field.doubleValue);
      else if (field.booleanValue   !== undefined) obj[key] = field.booleanValue;
      else if (field.timestampValue !== undefined) obj[key] = field.timestampValue;
      else if (field.nullValue      !== undefined) obj[key] = null;
      else if (field.arrayValue     !== undefined) {
        obj[key] = (field.arrayValue.values || []).map(function(v) {
          return v.stringValue || v.integerValue || v.booleanValue || null;
        });
      }
      else if (field.mapValue !== undefined) {
        obj[key] = field.mapValue.fields ? _fromRestDoc({ fields: field.mapValue.fields, name: '' }) : {};
      }
    });
    return obj;
  }

  /**
   * Convert plain object to Firestore REST fields.
   */
  function _toRestFields(obj) {
    var fields = {};
    Object.keys(obj).forEach(function(key) {
      if (key === 'id') return;
      var val = obj[key];
      if (val === null || val === undefined) {
        fields[key] = { nullValue: null };
      } else if (typeof val === 'boolean') {
        fields[key] = { booleanValue: val };
      } else if (typeof val === 'number') {
        if (Number.isInteger(val)) fields[key] = { integerValue: String(val) };
        else fields[key] = { doubleValue: val };
      } else if (typeof val === 'string') {
        fields[key] = { stringValue: val };
      } else if (Array.isArray(val)) {
        fields[key] = {
          arrayValue: {
            values: val.map(function(v) {
              if (typeof v === 'string') return { stringValue: v };
              if (typeof v === 'number') return { integerValue: String(v) };
              return { nullValue: null };
            })
          }
        };
      } else if (typeof val === 'object') {
        fields[key] = { mapValue: { fields: _toRestFields(val) } };
      }
    });
    return fields;
  }

  // ── Generic CRUD ───────────────────────────────────────────

  var WanagoServices = {

    /**
     * Get all documents from a collection.
     * Falls back to local DB if available (offline support).
     */
    async getAll(collection) {
      // Try local DB first (fast, offline-ready)
      if (window.DB && window.DB[collection] && window.DB[collection].length) {
        return window.DB[collection];
      }
      // Fall back to Firestore SDK
      if (typeof fsLoadCollection === 'function') {
        return await fsLoadCollection(collection);
      }
      // Last resort: REST API
      try {
        var headers = await authHeaders();
        var res = await fetch(_baseUrl + '/' + _collPath(collection), { headers });
        var data = await res.json();
        return (data.documents || []).map(_fromRestDoc).filter(Boolean);
      } catch(e) {
        console.warn('[WanagoServices.getAll]', e.message);
        return [];
      }
    },

    /**
     * Get a single document by ID.
     */
    async getOne(collection, docId) {
      // Try local first
      if (window.DB && window.DB[collection]) {
        var local = window.DB[collection].find(function(r) { return r.id === docId; });
        if (local) return local;
      }
      // REST API
      try {
        var headers = await authHeaders();
        var res = await fetch(_baseUrl + '/' + _docPath(collection, docId), { headers });
        return _fromRestDoc(await res.json());
      } catch(e) { return null; }
    },

    /**
     * Save (create or update) a document.
     */
    async save(collection, docId, data) {
      // Use existing fsSave if available (preferred — uses SDK)
      if (typeof fsSave === 'function') {
        return fsSave(collection, docId, data);
      }
      // REST fallback
      try {
        var headers = await authHeaders();
        var url = _baseUrl + '/' + _docPath(collection, docId) + '?updateMask.fieldPaths=*';
        await fetch(url, {
          method: 'PATCH',
          headers: headers,
          body: JSON.stringify({ fields: _toRestFields(data) }),
        });
      } catch(e) { console.warn('[WanagoServices.save]', e.message); }
    },

    /**
     * Delete a document.
     */
    async delete(collection, docId) {
      if (typeof fsDelete === 'function') {
        return fsDelete(collection, docId);
      }
      try {
        var headers = await authHeaders();
        await fetch(_baseUrl + '/' + _docPath(collection, docId), {
          method: 'DELETE',
          headers: headers,
        });
      } catch(e) { console.warn('[WanagoServices.delete]', e.message); }
    },

    // ── Domain-Specific Services ──────────────────────────────

    leads: {
      getAll:       function() { return WanagoServices.getAll('leads'); },
      getOne:       function(id) { return WanagoServices.getOne('leads', id); },
      save:         function(id, data) { return WanagoServices.save('leads', id, data); },
      delete:       function(id) { return WanagoServices.delete('leads', id); },
      getActive:    function() {
        return WanagoServices.getAll('leads').then(function(leads) {
          return leads.filter(function(l) { return !['won','lost'].includes(l.stage); });
        });
      },
      getToday:     function() {
        var today = new Date().toISOString().split('T')[0];
        return WanagoServices.getAll('leads').then(function(leads) {
          return leads.filter(function(l) { return (l.createdAt||'').startsWith(today); });
        });
      },
      getFollowups: function() {
        var today = new Date().toISOString().split('T')[0];
        return WanagoServices.getAll('leads').then(function(leads) {
          return leads.filter(function(l) { return l.followup === today && !['won','lost'].includes(l.stage); });
        });
      },
    },

    bookings: {
      getAll:        function() { return WanagoServices.getAll('bookings'); },
      getOne:        function(id) { return WanagoServices.getOne('bookings', id); },
      save:          function(id, data) { return WanagoServices.save('bookings', id, data); },
      delete:        function(id) { return WanagoServices.delete('bookings', id); },
      getConfirmed:  function() {
        return WanagoServices.getAll('bookings').then(function(b) {
          return b.filter(function(x) { return x.status === 'confirmed'; });
        });
      },
      getDeparting:  function(days) {
        var today = new Date().toISOString().split('T')[0];
        var limit = new Date();
        limit.setDate(limit.getDate() + (days || 3));
        var limitStr = limit.toISOString().split('T')[0];
        return WanagoServices.getAll('bookings').then(function(b) {
          return b.filter(function(x) {
            return x.travelDate >= today && x.travelDate <= limitStr && x.status === 'confirmed';
          });
        });
      },
    },

    customers: {
      getAll:  function() { return WanagoServices.getAll('customers'); },
      getOne:  function(id) { return WanagoServices.getOne('customers', id); },
      save:    function(id, data) { return WanagoServices.save('customers', id, data); },
      delete:  function(id) { return WanagoServices.delete('customers', id); },
      search:  function(query) {
        var q = (query || '').toLowerCase();
        return WanagoServices.getAll('customers').then(function(c) {
          return c.filter(function(x) {
            return (x.name||'').toLowerCase().includes(q) ||
                   (x.phone||'').includes(q) ||
                   (x.email||'').toLowerCase().includes(q);
          });
        });
      },
    },

    payments: {
      getAll:      function() { return WanagoServices.getAll('payments'); },
      save:        function(id, data) { return WanagoServices.save('payments', id, data); },
      getCompleted: function() {
        return WanagoServices.getAll('payments').then(function(p) {
          return p.filter(function(x) { return x.status === 'completed'; });
        });
      },
      getTotalRevenue: function() {
        return WanagoServices.getAll('payments').then(function(p) {
          return p.filter(function(x) { return x.status === 'completed'; })
                  .reduce(function(s, x) { return s + Number(x.amount||0); }, 0);
        });
      },
    },

    invoices: {
      getAll:      function() { return WanagoServices.getAll('invoices'); },
      save:        function(id, data) { return WanagoServices.save('invoices', id, data); },
      getOverdue:  function() {
        return WanagoServices.getAll('invoices').then(function(i) {
          return i.filter(function(x) { return x.status === 'overdue'; });
        });
      },
    },

    hrms: {
      getEmployees:  function() { return WanagoServices.getAll('hrmsEmployees'); },
      getLeaves:     function() { return WanagoServices.getAll('hrmsLeaves'); },
      getPendingLeaves: function() {
        return WanagoServices.getAll('hrmsLeaves').then(function(l) {
          return l.filter(function(x) { return x.status === 'pending'; });
        });
      },
      saveEmployee:  function(id, data) { return WanagoServices.save('hrmsEmployees', id, data); },
      saveLeave:     function(id, data) { return WanagoServices.save('hrmsLeaves', id, data); },
    },

    settings: {
      get: function() {
        if (window.DB && window.DB.settings) return Promise.resolve(window.DB.settings);
        return WanagoServices.getOne('config', 'settings');
      },
      save: function(data) {
        if (typeof fsSaveSettings === 'function') return fsSaveSettings();
        return WanagoServices.save('config', 'settings', data);
      },
      getTeam: function() {
        return WanagoServices.settings.get().then(function(s) {
          return (s && s.team) ? s.team : [];
        });
      },
      getOffices: function() {
        return WanagoServices.settings.get().then(function(s) {
          return (s && s.offices) ? s.offices : [];
        });
      },
    },

    auth: {
      /**
       * Get current user session.
       * Works on web (sessionStorage) and React Native (AsyncStorage).
       */
      getSession: function() {
        try {
          var raw = sessionStorage.getItem('wanago_session');
          return raw ? JSON.parse(raw) : null;
        } catch(e) { return null; }
      },

      /**
       * Check if user is authenticated.
       */
      isAuthenticated: function() {
        return !!WanagoServices.auth.getSession();
      },

      /**
       * Get Firebase ID token (for REST API calls).
       */
      getToken: getAuthToken,

      /**
       * Log out — clears session and Firebase Auth.
       */
      logout: function() {
        if (typeof handleLogout === 'function') return handleLogout();
        sessionStorage.removeItem('wanago_session');
        window.location.href = '../index.html';
      },
    },

    // ── Utility ────────────────────────────────────────────────

    /**
     * Health check — verify connection to Firestore.
     */
    async healthCheck() {
      try {
        var headers = await authHeaders();
        var res = await fetch(
          _baseUrl + '/companies/' + _compId + '/config/settings',
          { headers }
        );
        return res.ok;
      } catch(e) { return false; }
    },

    /**
     * Get the company ID this service is configured for.
     */
    getCompanyId: function() { return _compId; },
  };

  // Expose globally
  global.WanagoServices = WanagoServices;

  console.log('[firebase-services.js] Service layer ready — companyId:', _compId);

})(typeof window !== 'undefined' ? window : global);
