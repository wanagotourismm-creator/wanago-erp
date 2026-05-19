// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Centralized State Store
//
//  A lightweight reactive state manager — no framework needed.
//
//  PROBLEMS SOLVED:
//  ─────────────────
//  1. Filter/search state was lost on re-render (leadsFilter,
//     custSearchQuery etc were plain variables with no persistence)
//  2. 476 window.* globals made name collisions inevitable
//  3. No way to know when state changed — modules had stale values
//  4. currentUser/currentOfficeId changed silently with no notification
//
//  HOW IT WORKS:
//  ─────────────
//  Store.set('leads.filter', 'hot')     — set a value
//  Store.get('leads.filter')            — get current value
//  Store.subscribe('leads', fn)         — react to any leads state change
//  Store.user()                         — get current user (reactive)
//  Store.officeId()                     — get current office
//
//  FULLY BACKWARD COMPATIBLE:
//  ──────────────────────────
//  Existing code (leadsFilter, leadsSearchQuery etc) still works.
//  Store is additive — you can migrate one module at a time.
// ═══════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ── Internal state ───────────────────────────────────────────
  var _state = {
    // UI state per module
    leads: {
      filter:      'all',
      search:      '',
      agentFilter: '',
      priFilter:   '',
      srcFilter:   '',
      pkgFilter:   '',
      dateFrom:    '',
      dateTo:      '',
      aiSort:      false,
      selected:    [],
      view:        'table',   // 'table' | 'board' | 'followups' | 'analytics'
    },
    customers: {
      filter: 'all',
      search: '',
      view:   'table',
    },
    bookings: {
      filter: 'all',
      search: '',
      view:   'table',
    },
    invoices: {
      filter: 'all',
      search: '',
    },
    payments: {
      filter: 'all',
      search: '',
    },
    expenses: {
      filter: 'all',
      search: '',
    },
    packages: {
      filter: 'all',
      search: '',
      view:   'grid',
    },
    quotations: {
      filter: 'all',
      search: '',
    },
    reports: {
      period: 'month',
    },
    support: {
      filter: 'all',
    },
    hrms: {
      tab:    'overview',
      search: '',
    },
    marketing: {
      tab: 'overview',
    },

    // App-level state
    app: {
      ready:          false,
      firestoreReady: false,
      sidebarOpen:    true,
      theme:          'light',
      currentPage:    '',
    },
  };

  // ── Subscribers ───────────────────────────────────────────────
  var _subscribers = {};   // namespace → [callbacks]

  // ── Core API ──────────────────────────────────────────────────

  /**
   * Get a state value by dot-path.
   * Store.get('leads.filter')     → 'all'
   * Store.get('leads')            → { filter, search, ... }
   */
  function get(path) {
    if (!path) return _state;
    var parts = path.split('.');
    var obj = _state;
    for (var i = 0; i < parts.length; i++) {
      if (obj === undefined || obj === null) return undefined;
      obj = obj[parts[i]];
    }
    return obj;
  }

  /**
   * Set a state value by dot-path and notify subscribers.
   * Store.set('leads.filter', 'hot')
   * Store.set('leads.search', 'kerala')
   */
  function set(path, value) {
    var parts = path.split('.');
    var namespace = parts[0];
    var obj = _state;

    // Navigate to parent
    for (var i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }

    // Set value
    var key = parts[parts.length - 1];
    var oldValue = obj[key];
    obj[key] = value;

    // Notify subscribers if value changed
    if (oldValue !== value) {
      _notify(namespace, path, value, oldValue);
    }
  }

  /**
   * Update multiple values in a namespace at once.
   * Store.update('leads', { filter: 'hot', search: 'kerala' })
   */
  function update(namespace, updates) {
    var ns = _state[namespace];
    if (!ns) { _state[namespace] = {}; ns = _state[namespace]; }
    Object.keys(updates).forEach(function(k) {
      ns[k] = updates[k];
    });
    _notify(namespace, namespace, ns, null);
  }

  /**
   * Reset a namespace to its initial state.
   * Store.reset('leads')
   */
  function reset(namespace) {
    var initial = {
      leads:     { filter:'all', search:'', agentFilter:'', priFilter:'', srcFilter:'', pkgFilter:'', dateFrom:'', dateTo:'', aiSort:false, selected:[], view:'table' },
      customers: { filter:'all', search:'', view:'table' },
      bookings:  { filter:'all', search:'', view:'table' },
      invoices:  { filter:'all', search:'' },
      payments:  { filter:'all', search:'' },
      expenses:  { filter:'all', search:'' },
      packages:  { filter:'all', search:'', view:'grid' },
      quotations:{ filter:'all', search:'' },
    };
    if (initial[namespace]) {
      _state[namespace] = Object.assign({}, initial[namespace]);
      _notify(namespace, namespace, _state[namespace], null);
    }
  }

  /**
   * Subscribe to state changes in a namespace.
   * Returns an unsubscribe function.
   *
   * Store.subscribe('leads', function(state, path, value) {
   *   renderLeads();
   * });
   */
  function subscribe(namespace, callback) {
    if (!_subscribers[namespace]) _subscribers[namespace] = [];
    _subscribers[namespace].push(callback);
    return function unsubscribe() {
      var idx = _subscribers[namespace].indexOf(callback);
      if (idx > -1) _subscribers[namespace].splice(idx, 1);
    };
  }

  /**
   * Subscribe to ALL state changes.
   */
  function subscribeAll(callback) {
    return subscribe('*', callback);
  }

  // ── Notify ────────────────────────────────────────────────────

  function _notify(namespace, path, value, oldValue) {
    // Notify namespace subscribers
    var cbs = _subscribers[namespace] || [];
    cbs.forEach(function(cb) {
      try { cb(_state[namespace], path, value, oldValue); }
      catch(e) { console.warn('[Store] subscriber error:', e.message); }
    });
    // Notify wildcard subscribers
    var all = _subscribers['*'] || [];
    all.forEach(function(cb) {
      try { cb(_state, path, value, oldValue); }
      catch(e) { console.warn('[Store] wildcard subscriber error:', e.message); }
    });
  }

  // ── User & Office (reactive wrappers) ─────────────────────────

  /**
   * Get the current authenticated user.
   * Reactive — always returns the latest value.
   */
  function user() {
    return window.currentUser || null;
  }

  /**
   * Get the current office ID.
   * Reactive — always returns the latest value.
   */
  function officeId() {
    return window.currentOfficeId || '*';
  }

  /**
   * Check if current user is admin.
   */
  function isAdmin() {
    var u = user();
    if (!u) return false;
    return ['founder','ceo','co_founder','director','admin'].indexOf(u.role) > -1;
  }

  /**
   * Check if current user is manager or above.
   */
  function isManager() {
    var u = user();
    if (!u) return false;
    var sr = u.systemRole || '';
    return ['founder_ceo','admin','reporting_manager'].indexOf(sr) > -1;
  }

  // ── Computed Values ───────────────────────────────────────────

  /**
   * Get filtered leads based on current store state.
   * Automatically applies all active filters.
   */
  function filteredLeads() {
    if (typeof hScoped !== 'function') return [];
    var s     = get('leads');
    var leads = hScoped('leads');

    // Stage filter
    if (s.filter && s.filter !== 'all') {
      leads = leads.filter(function(l) { return l.stage === s.filter; });
    }
    // Search
    if (s.search) {
      var q = s.search.toLowerCase();
      leads = leads.filter(function(l) {
        return (l.name||'').toLowerCase().includes(q) ||
               (l.phone||'').includes(q) ||
               (l.destination||'').toLowerCase().includes(q) ||
               (l.email||'').toLowerCase().includes(q);
      });
    }
    // Agent filter
    if (s.agentFilter) leads = leads.filter(function(l) { return l.agent === s.agentFilter; });
    // Priority filter
    if (s.priFilter) leads = leads.filter(function(l) { return l.priority === s.priFilter; });
    // Source filter
    if (s.srcFilter) leads = leads.filter(function(l) { return l.source === s.srcFilter; });
    // Package filter
    if (s.pkgFilter) leads = leads.filter(function(l) { return l.packageId === s.pkgFilter; });
    // Date range
    if (s.dateFrom) leads = leads.filter(function(l) { return (l.createdAt||'').slice(0,10) >= s.dateFrom; });
    if (s.dateTo)   leads = leads.filter(function(l) { return (l.createdAt||'').slice(0,10) <= s.dateTo; });

    return leads;
  }

  /**
   * Get dashboard KPI stats from current DB state.
   */
  function dashboardStats() {
    if (typeof hScoped !== 'function') return {};
    try {
      var leads    = hScoped('leads') || [];
      var bookings = hScoped('bookings') || [];
      var payments = hScoped('payments') || [];

      var open     = leads.filter(function(l) { return !['won','lost'].includes(l.stage); });
      var won      = leads.filter(function(l) { return l.stage === 'won'; });
      var revenue  = payments.filter(function(p) { return p.status === 'completed'; })
                             .reduce(function(s,p) { return s + Number(p.amount||0); }, 0);
      var pending  = bookings.filter(function(b) { return b.pendingAmount > 0; })
                             .reduce(function(s,b) { return s + Number(b.pendingAmount||0); }, 0);

      return {
        totalLeads:    leads.length,
        openLeads:     open.length,
        wonLeads:      won.length,
        conversionRate: leads.length ? Math.round(won.length / leads.length * 100) : 0,
        totalRevenue:  revenue,
        pendingDues:   pending,
        totalBookings: bookings.length,
        pipeline:      open.reduce(function(s,l) { return s + Number(l.budget||0); }, 0),
      };
    } catch(e) { return {}; }
  }

  // ── Debug ─────────────────────────────────────────────────────

  /**
   * Get a snapshot of all current state (for debugging).
   * Usage: Store.debug() in browser console
   */
  function debug() {
    console.table(Object.keys(_state).map(function(ns) {
      return { namespace: ns, state: JSON.stringify(_state[ns]).slice(0, 80) };
    }));
    return _state;
  }

  // ── Public API ────────────────────────────────────────────────

  window.Store = {
    get:            get,
    set:            set,
    update:         update,
    reset:          reset,
    subscribe:      subscribe,
    subscribeAll:   subscribeAll,
    user:           user,
    officeId:       officeId,
    isAdmin:        isAdmin,
    isManager:      isManager,
    filteredLeads:  filteredLeads,
    dashboardStats: dashboardStats,
    debug:          debug,

    // Convenience getters
    get leads()     { return get('leads');     },
    get bookings()  { return get('bookings');  },
    get customers() { return get('customers'); },
    get invoices()  { return get('invoices');  },
    get payments()  { return get('payments');  },
    get app()       { return get('app');       },
  };

  console.log('[store.js] State store ready — use Store.debug() to inspect');

})();
