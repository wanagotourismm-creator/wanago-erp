// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Google Sheets Live Sync
//  Automatically pushes all ERP data to Google Sheets
//  every time data is saved (5-second debounce)
//
//  Setup: Admin Panel → Integrations → Google Sheets
// ═══════════════════════════════════════════════════════════════
'use strict';

var WanagoSheets = (function () {

  function _cfg() {
    try { return (DB.settings && DB.settings.googleSheets) || {}; } catch(e) { return {}; }
  }
  function getUrl()      { return _cfg().webAppUrl  || ''; }
  function isConfigured(){ return !!getUrl(); }
  function isAutoSync()  { return _cfg().autoSync !== false; } // default on

  var _debounce = null;

  // Called after every saveDB() — 5-second debounce
  function scheduleSync() {
    if (!isConfigured() || !isAutoSync()) return;
    clearTimeout(_debounce);
    _debounce = setTimeout(function(){ syncNow(true); }, 5000);
  }

  // Build the full payload from current DB
  function _buildPayload() {
    var leads      = DB.leads      || [];
    var customers  = DB.customers  || [];
    var bookings   = DB.bookings   || [];
    var payments   = DB.payments   || [];
    var invoices   = DB.invoices   || [];
    var quotations = DB.quotations || [];
    var activities = (DB.activities || []).slice(0, 100);
    var teamRaw    = (DB.settings  && DB.settings.team) || [];

    var now       = new Date();
    var monStart  = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    var totalRev  = payments.filter(function(p){ return ['completed','received'].includes(p.status); })
                            .reduce(function(s,p){ return s + Number(p.amount||0); }, 0);
    var pending   = bookings.reduce(function(s,b){ return s + Number(b.pendingAmount||0); }, 0);
    var won       = leads.filter(function(l){ return l.stage === 'won'; }).length;
    var cvr       = leads.length > 0 ? (won / leads.length * 100).toFixed(1) + '%' : '0%';
    var waCfg     = (DB.settings && DB.settings.integrations && DB.settings.integrations.whatsapp) || {};
    var eodCfg    = (DB.settings && DB.settings.googleSheets && DB.settings.googleSheets.eod) || {};

    return {
      action:   'sync',
      syncedAt: now.toISOString(),
      company:  (DB.settings && DB.settings.companyName) || 'Wanago ERP',

      waConfig: {
        phoneNumberId:    waCfg.phoneNumberId    || '',
        accessToken:      waCfg.accessToken      || '',
        businessAccountId:waCfg.businessAccountId|| '',
      },

      eodConfig: {
        hour:    eodCfg.hour    || 19,
        enabled: eodCfg.enabled !== false,
      },

      team: teamRaw.map(function(m){ return {
        id:    m.id    || '',
        name:  m.name  || '',
        phone: m.phone || '',
        email: m.email || '',
        role:  m.role  || '',
        dept:  m.dept  || '',
        office:m.office|| '',
      }; }),

      summary: {
        totalLeads:          leads.length,
        activeLeads:         leads.filter(function(l){ return !['won','lost'].includes(l.stage); }).length,
        hotLeads:            leads.filter(function(l){ return l.stage === 'hot'; }).length,
        leadsThisMonth:      leads.filter(function(l){ return (l.createdAt||'') >= monStart; }).length,
        wonLeads:            won,
        lostLeads:           leads.filter(function(l){ return l.stage === 'lost'; }).length,
        conversionRate:      cvr,
        totalCustomers:      customers.length,
        totalBookings:       bookings.length,
        confirmedBookings:   bookings.filter(function(b){ return b.status === 'confirmed'; }).length,
        totalRevenue:        totalRev,
        pendingPayments:     pending,
        totalInvoices:       invoices.length,
        totalQuotations:     quotations.length,
      },

      leads: leads.map(function(l){ return {
        id:           l.id,
        name:         l.name        || '',
        phone:        l.phone       || '',
        email:        l.email       || '',
        source:       l.source      || '',
        stage:        l.stage       || '',
        destination:  l.destination || '',
        budget:       l.budget      || '',
        assignedTo:   l.assignedTo  || '',
        followUpDate: l.nextFollowUp|| l.followUpDate || '',
        notes:        (l.notes||'').slice(0, 200),
        createdAt:    (l.createdAt  || '').slice(0, 10),
      }; }),

      customers: customers.map(function(c){ return {
        id:          c.id,
        name:        c.name        || '',
        phone:       c.phone       || '',
        email:       c.email       || '',
        city:        c.city        || '',
        totalSpend:  Number(c.totalSpend || c.totalSpent || 0),
        travelType:  c.travelType  || '',
        dob:         c.dob         || '',
        anniversary: c.anniversary || '',
        createdAt:   (c.createdAt  || '').slice(0, 10),
      }; }),

      bookings: bookings.map(function(b){ return {
        id:             b.id,
        ref:            b.ref            || '',
        customerName:   b.customerName   || '',
        customerPhone:  b.customerPhone  || '',
        destination:    b.destination    || '',
        travelDate:     b.travelDate     || '',
        returnDate:     b.returnDate     || '',
        pax:            b.pax            || '',
        totalAmount:    Number(b.totalAmount   || 0),
        paidAmount:     Number(b.paidAmount    || b.advancePaid || 0),
        pendingAmount:  Number(b.pendingAmount || 0),
        status:         b.status         || '',
        assignedTo:     b.assignedTo     || '',
        createdAt:      (b.createdAt     || '').slice(0, 10),
      }; }),

      payments: payments.map(function(p){ return {
        id:           p.id,
        date:         (p.date || p.createdAt || '').slice(0, 10),
        customerName: p.customerName || '',
        bookingRef:   p.bookingRef   || '',
        amount:       Number(p.amount || 0),
        method:       p.method  || '',
        status:       p.status  || '',
        notes:        p.notes   || '',
      }; }),

      invoices: invoices.map(function(inv){ return {
        id:           inv.id,
        invoiceNo:    inv.invoiceNo    || '',
        customerName: inv.customerName || '',
        bookingRef:   inv.bookingRef   || '',
        totalAmount:  Number(inv.totalAmount || inv.grandTotal || 0),
        status:       inv.status       || '',
        dueDate:      inv.dueDate      || '',
        createdAt:    (inv.createdAt   || '').slice(0, 10),
      }; }),

      quotations: quotations.map(function(q){ return {
        id:           q.id,
        customerName: q.customerName || '',
        destination:  q.destination  || '',
        totalAmount:  Number(q.grandTotal || q.amount || 0),
        status:       q.status       || '',
        validDays:    q.validDays    || '',
        createdAt:    (q.createdAt   || '').slice(0, 10),
      }; }),

      recentActivity: activities.map(function(a){ return {
        time:    a.ts   || '',
        type:    a.type || '',
        message: a.msg  || '',
      }; }),
    };
  }

  // Main sync — sends data to Google Apps Script web app
  async function syncNow(silent) {
    var url = getUrl();
    if (!url) {
      if (!silent && typeof showToast === 'function') showToast('Configure Google Sheets URL in Admin → Integrations', 'error');
      return { ok: false };
    }
    try {
      var payload = _buildPayload();
      await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(payload),
      });
      // Write last-sync time to Firestore settings (without triggering another sync)
      if (DB && DB.settings) {
        if (!DB.settings.googleSheets) DB.settings.googleSheets = {};
        DB.settings.googleSheets.lastSync = new Date().toISOString();
        if (typeof fsSaveSettings === 'function') fsSaveSettings().catch(function(){});
      }
      if (!silent && typeof showToast === 'function') showToast('✅ Synced to Google Sheets!');
      return { ok: true };
    } catch (e) {
      console.warn('[WanagoSheets] sync failed:', e.message);
      if (!silent && typeof showToast === 'function') showToast('Sheets sync failed: ' + e.message, 'error');
      return { ok: false, msg: e.message };
    }
  }

  // Ping test — used by admin panel Test button
  async function testConnection() {
    var url = getUrl();
    if (!url) return { ok: false, msg: 'No Web App URL configured.' };
    try {
      var sep = url.includes('?') ? '&' : '?';
      var res = await fetch(url + sep + 'action=ping');
      var text = await res.text();
      try {
        var json = JSON.parse(text);
        if (json.ok) return { ok: true, msg: json.msg || 'Connected to Google Sheets!' };
      } catch(pe) {}
      if (res.ok) return { ok: true, msg: 'Reachable — sync ready.' };
      return { ok: false, msg: 'HTTP ' + res.status };
    } catch (e) {
      return { ok: false, msg: 'Cannot reach URL: ' + e.message };
    }
  }

  // Send a custom action to Apps Script (setupTrigger, sendEODR)
  async function sendAction(action, extra) {
    var url = getUrl();
    if (!url) return { ok: false, msg: 'No Web App URL configured.' };
    try {
      var body = Object.assign({ action: action }, extra || {});
      var res  = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'text/plain' },
        body:    JSON.stringify(body),
      });
      var text = await res.text();
      try { return JSON.parse(text); } catch(e) { return { ok: res.ok }; }
    } catch(e) {
      return { ok: false, msg: e.message };
    }
  }

  function getLastSync() {
    var ls = _cfg().lastSync;
    if (!ls) return 'Never';
    try {
      var d = new Date(ls);
      return d.toLocaleDateString('en-IN') + ' ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    } catch(e) { return ls; }
  }

  return {
    scheduleSync:   scheduleSync,
    syncNow:        syncNow,
    testConnection: testConnection,
    sendAction:     sendAction,
    isConfigured:   isConfigured,
    getLastSync:    getLastSync,
  };

})();

window.WanagoSheets = WanagoSheets;

// ── Hook into saveDB (wraps whatever version is current — even firestore's override) ──
(function () {
  var _prev = window.saveDB;
  window.saveDB = function () {
    if (typeof _prev === 'function') _prev();
    if (window.WanagoSheets) window.WanagoSheets.scheduleSync();
  };
  window.saveDB._sheetsHooked = true;
})();
