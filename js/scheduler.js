// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Smart Scheduler & Auto-Reminder Engine v1
//  Runs every minute. Checks rules against live DB data.
//  Fires notifications, updates Firestore, plays sounds.
// ═══════════════════════════════════════════════════════════════

'use strict';

(function() {
  if (window._schedulerInit) return;
  window._schedulerInit = true;

  const SCHED_KEY = 'wanago_sched_fired'; // localStorage key for dedup

  // ── Get already-fired alert IDs ──
  function getFired() {
    try { return JSON.parse(localStorage.getItem(SCHED_KEY) || '{}'); } catch(e) { return {}; }
  }
  function markFired(id) {
    const f = getFired(); f[id] = Date.now();
    // Clean old entries (older than 48h)
    Object.keys(f).forEach(k => { if (Date.now() - f[k] > 172800000) delete f[k]; });
    try { localStorage.setItem(SCHED_KEY, JSON.stringify(f)); } catch(e) {}
  }
  function alreadyFired(id) { return !!getFired()[id]; }

  // ── Fire one alert ──
  function fire(id, opts) {
    if (alreadyFired(id)) return;
    markFired(id);
    // Play sound
    if (typeof window.playNotifSound === 'function') {
      window.playNotifSound(opts.urgent ? 'alert' : opts.type === 'success' ? 'success' : 'ding');
    }
    // Show toast
    if (typeof window.showToast === 'function') {
      window.showToast((opts.icon||'🔔') + ' ' + opts.title, opts.urgent ? 'error' : 'success');
    }
    // Send to Firestore notification center
    if (typeof window.sendNotification === 'function') {
      window.sendNotification({
        title:   opts.title,
        message: opts.message || '',
        type:    opts.urgent ? 'alert' : (opts.type || 'info'),
        target:  opts.target || 'all',
      });
    }
  }

  // ── Main rule evaluator ──
  function runRules() {
    if (!window.DB) return;
    const db      = window.DB;
    const now     = new Date();
    const today   = now.toISOString().slice(0, 10);
    const todayMs = now.getTime();

    // ── RULE 1: Departure TODAY ──
    (db.bookings || []).filter(b =>
      b.travelDate === today && b.status !== 'cancelled'
    ).forEach(b => {
      fire('dep_today_' + b.id + '_' + today, {
        icon: '✈️', title: 'Departure TODAY: ' + (b.customerName||'Guest'),
        message: (b.destination||'') + ' · ' + (b.ref||''), urgent: true,
        target: 'all'
      });
    });

    // ── RULE 2: Departure TOMORROW ──
    const tomorrow = new Date(now.getTime() + 86400000).toISOString().slice(0,10);
    (db.bookings || []).filter(b =>
      b.travelDate === tomorrow && b.status !== 'cancelled'
    ).forEach(b => {
      fire('dep_tmrw_' + b.id + '_' + tomorrow, {
        icon: '🗓️', title: 'Departure Tomorrow: ' + (b.customerName||'Guest'),
        message: 'Confirm documents and transfers · ' + (b.ref||''), type: 'warning',
        target: 'all'
      });
    });

    // ── RULE 3: Follow-up overdue ──
    (db.leads || []).filter(l => {
      if (['won','lost'].includes(l.stage)) return false;
      const fu = l.nextFollowUp || l.followUpDate || l.followup;
      return fu && fu < today;
    }).slice(0, 3).forEach(l => {
      fire('fu_overdue_' + l.id + '_' + today, {
        icon: '📞', title: 'Follow-up Overdue: ' + (l.name||'Lead'),
        message: 'Was due: ' + (l.nextFollowUp||l.followup||'unknown'), type: 'warning',
        target: 'all'
      });
    });

    // ── RULE 4: Overdue invoices ──
    (db.invoices || []).filter(i =>
      i.status !== 'paid' && i.dueDate && i.dueDate < today
    ).slice(0, 3).forEach(inv => {
      fire('inv_overdue_' + inv.id + '_' + today, {
        icon: '🧾', title: 'Invoice Overdue: ' + (inv.invoiceNo||inv.ref||''),
        message: '₹' + Number(inv.totalAmount||inv.grandTotal||0).toLocaleString('en-IN') + ' · Due: ' + inv.dueDate,
        urgent: true, target: 'all'
      });
    });

    // ── RULE 5: Confirmed bookings with large pending balance ──
    (db.bookings || []).filter(b =>
      b.status === 'confirmed' && Number(b.pendingAmount||0) > 5000
    ).slice(0, 3).forEach(b => {
      const dayKey = today.slice(0, 7); // monthly dedup
      fire('bal_due_' + b.id + '_' + dayKey, {
        icon: '💰', title: 'Pending Balance: ' + (b.customerName||''),
        message: '₹' + Number(b.pendingAmount||0).toLocaleString('en-IN') + ' due · ' + (b.ref||''),
        type: 'warning', target: 'all'
      });
    });

    // ── RULE 6: Lead inactive 5+ days ──
    (db.leads || []).filter(l => {
      if (['won','lost','new'].includes(l.stage)) return false;
      const ts = l.lastContactDate || l.updatedAt || l.createdAt;
      if (!ts) return false;
      return Math.floor((Date.now() - new Date(ts)) / 86400000) >= 5;
    }).slice(0, 2).forEach(l => {
      const weekKey = Math.floor(todayMs / 604800000); // weekly dedup
      fire('cold_lead_' + l.id + '_w' + weekKey, {
        icon: '🔕', title: 'Lead Going Cold: ' + (l.name||''),
        message: 'No contact in 5+ days · ' + (l.destination||l.stage||''),
        type: 'warning', target: 'all'
      });
    });

    // ── RULE 7: Visa expiring within 7 days ──
    (db.bookings || []).filter(b => {
      if (!b.visaExpiry) return false;
      const diff = Math.ceil((new Date(b.visaExpiry) - now) / 86400000);
      return diff >= 0 && diff <= 7;
    }).forEach(b => {
      const diff = Math.ceil((new Date(b.visaExpiry) - now) / 86400000);
      fire('visa_exp_' + b.id + '_' + b.visaExpiry, {
        icon: '🛂', title: 'Visa Expiring ' + (diff === 0 ? 'TODAY' : 'in ' + diff + ' days') + ': ' + (b.customerName||''),
        message: (b.ref||'') + ' · Expiry: ' + b.visaExpiry, urgent: diff <= 2,
        target: 'all'
      });
    });

    // ── RULE 8: Birthdays today ──
    [...(db.customers||[]), ...(db.leads||[])].forEach(p => {
      const dob = p.dob || p.birthday;
      if (!dob) return;
      const bd = new Date(dob);
      const thisYearBd = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
      if (thisYearBd.toISOString().slice(0,10) === today) {
        fire('bday_' + p.id + '_' + today, {
          icon: '🎂', title: 'Birthday Today: ' + (p.name||'Customer'),
          message: 'Send a personalised birthday wish!', type: 'success', target: 'all'
        });
      }
    });
  }

  // ── Run on Firestore ready + every 60 seconds ──
  function start() {
    // Run once when DB is ready
    if (window._fsReady) {
      setTimeout(runRules, 3000);
    } else {
      // Wait for Firestore
      var attempts = 0;
      var interval = setInterval(function() {
        attempts++;
        if (window._fsReady || attempts > 60) {
          clearInterval(interval);
          setTimeout(runRules, 1000);
        }
      }, 1000);
    }
    // Run every 60 seconds
    setInterval(runRules, 60000);
  }

  // ── Auto-mark leads as cold after 7 days ──
  window.autoUpdateLeadStages = function() {
    if (!window.DB || !window.DB.leads) return;
    const now = new Date();
    let changed = 0;
    window.DB.leads.forEach(function(l) {
      if (['won','lost','new'].includes(l.stage)) return;
      const ts = l.lastContactDate || l.updatedAt || l.createdAt;
      if (!ts) return;
      const days = Math.floor((now - new Date(ts)) / 86400000);
      if (days >= 14 && l.stage !== 'cold') {
        l.stage = 'cold';
        l.autoColdAt = now.toISOString();
        if (typeof dbSave === 'function') dbSave('leads', l).catch(() => {});
        changed++;
      }
    });
    if (changed > 0) {
      console.log('[scheduler] Auto-marked', changed, 'leads as cold');
      if (typeof saveDB === 'function') saveDB({ silent: true });
    }
  };

  // ── Generate daily summary ──
  window.getDailySummary = function() {
    const db    = window.DB || {};
    const today = new Date().toISOString().slice(0, 10);
    const leads    = db.leads    || [];
    const bookings = db.bookings || [];
    const payments = db.payments || [];

    const newLeadsToday     = leads.filter(l => (l.createdAt||'').startsWith(today)).length;
    const bookingsToday     = bookings.filter(b => (b.createdAt||'').startsWith(today)).length;
    const revenueToday      = payments.filter(p => (p.date||p.createdAt||'').startsWith(today))
                                       .reduce((s, p) => s + Number(p.amount||0), 0);
    const pendingFollowUps  = leads.filter(l => {
      const fu = l.nextFollowUp || l.followup;
      return fu && fu <= today && !['won','lost'].includes(l.stage);
    }).length;
    const departures        = bookings.filter(b => b.travelDate === today && b.status !== 'cancelled').length;

    return { newLeadsToday, bookingsToday, revenueToday, pendingFollowUps, departures, date: today };
  };

  start();
  console.log('[scheduler.js] Smart Scheduler loaded ✅');

})();
