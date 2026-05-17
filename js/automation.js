// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Automation Engine v1
//  Rule-based workflow intelligence — evaluates rules against live
//  Firestore data. Results feed the Notification Center directly.
//  Returns format: { icon, cls, label, sub, page }
// ═══════════════════════════════════════════════════════════════
'use strict';

const WanagoAutomation = (function () {

  function evaluate() {
    const db    = window.DB || {};
    const now   = new Date();
    const today = now.toISOString().slice(0, 10);
    const alerts = [];

    const leads    = db.leads    || [];
    const bookings = db.bookings || [];
    const invoices = db.invoices || [];
    const customers= db.customers|| [];

    /* ── RULE 1: Overdue follow-ups ─────────────────────── */
    leads.filter(l => {
      if (['won', 'lost'].includes(l.stage)) return false;
      const fu = l.nextFollowUp || l.followUpDate || l.followup;
      return fu && fu < today;
    }).slice(0, 6).forEach(l => alerts.push({
      icon:'FU', cls:'warn',
      label:'Overdue follow-up: ' + (l.name || 'Lead'),
      sub:  'Stage: ' + (l.stage||'—') + ' · Was due: ' + (l.nextFollowUp||l.followup||'unknown'),
      page:'leads', _p:0,
    }));

    /* ── RULE 2: Departures within 3 days (urgent) ──────── */
    bookings.filter(b => {
      if (!b.travelDate || b.status === 'cancelled') return false;
      const d = Math.ceil((new Date(b.travelDate) - now) / 86400000);
      return d >= 0 && d <= 3;
    }).forEach(b => {
      const d = Math.ceil((new Date(b.travelDate) - now) / 86400000);
      alerts.push({
        icon:'Dep', cls:'danger',
        label:'Departure ' + (d === 0 ? 'TODAY' : 'in ' + d + ' day' + (d === 1 ? '' : 's')) + ': ' + (b.customerName||'Guest'),
        sub:  (b.destination||'TBD') + ' · ' + (b.ref||''),
        page:'bookings', _p:0,
      });
    });

    /* ── RULE 3: Overdue invoices ────────────────────────── */
    invoices.filter(i =>
      i.status !== 'paid' && i.dueDate && i.dueDate < today
    ).slice(0, 5).forEach(i => alerts.push({
      icon:'Inv', cls:'danger',
      label:'Overdue payment: ' + (i.invoiceNo||i.ref||'Invoice'),
      sub:  '₹' + Number(i.totalAmount||i.grandTotal||0).toLocaleString('en-IN') + ' · Due: ' + i.dueDate,
      page:'invoices', _p:0,
    }));

    /* ── RULE 4: Departures in 4–7 days (prep alert) ────── */
    bookings.filter(b => {
      if (!b.travelDate || b.status === 'cancelled') return false;
      const d = Math.ceil((new Date(b.travelDate) - now) / 86400000);
      return d >= 4 && d <= 7;
    }).slice(0, 4).forEach(b => {
      const d = Math.ceil((new Date(b.travelDate) - now) / 86400000);
      alerts.push({
        icon:'Dep', cls:'info',
        label:'Departure in ' + d + ' days: ' + (b.customerName||'Guest'),
        sub:  (b.ref||'') + (b.destination ? ' · ' + b.destination : ''),
        page:'bookings', _p:1,
      });
    });

    /* ── RULE 5: Leads inactive for 5+ days ─────────────── */
    leads.filter(l => {
      if (['won','lost','new'].includes(l.stage)) return false;
      const ts = l.lastContactDate || l.updatedAt || l.createdAt;
      if (!ts) return false;
      return Math.floor((Date.now() - new Date(ts)) / 86400000) >= 5;
    }).slice(0, 4).forEach(l => alerts.push({
      icon:'Cold', cls:'warn',
      label:'Lead going cold: ' + (l.name||'Lead'),
      sub:  'No contact in 5+ days · ' + (l.destination||l.stage||''),
      page:'leads', _p:1,
    }));

    /* ── RULE 6: Confirmed bookings with pending balance ─── */
    const pendingBooks = bookings.filter(b =>
      b.status === 'confirmed' && Number(b.pendingAmount||0) > 50
    );
    if (pendingBooks.length > 0) {
      const tot = pendingBooks.reduce((s, b) => s + Number(b.pendingAmount||0), 0);
      alerts.push({
        icon:'Pay', cls:'warn',
        label: pendingBooks.length + ' confirmed booking' + (pendingBooks.length > 1 ? 's' : '') + ' with outstanding balance',
        sub:  '₹' + tot.toLocaleString('en-IN') + ' pending — send payment reminders',
        page:'payments', _p:1,
      });
    }

    /* ── RULE 7: Visa expiry alerts ──────────────────────── */
    bookings.filter(b => b.visaExpiry).forEach(b => {
      const diff = Math.ceil((new Date(b.visaExpiry) - now) / 86400000);
      if (diff >= 0 && diff <= 30) alerts.push({
        icon:'Visa', cls: diff <= 7 ? 'danger' : 'warn',
        label:'Visa expiring ' + (diff === 0 ? 'today' : 'in ' + diff + ' days') + ': ' + (b.customerName||''),
        sub:  (b.ref||'Booking') + ' · Exp: ' + b.visaExpiry,
        page:'bookings', _p: diff <= 7 ? 0 : 1,
      });
    });

    /* ── RULE 8: Birthdays within 3 days ─────────────────── */
    [...customers, ...leads].forEach(p => {
      const dob = p.dob || p.birthday;
      if (!dob) return;
      const bd   = new Date(dob);
      const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      const diff = Math.ceil((next - now) / 86400000);
      if      (diff === 0) alerts.push({ icon:'Bday', cls:'ok',   label:'Birthday today: '     + (p.name||''), sub:'Send a personalised birthday wish!',    page:'customers', _p:2 });
      else if (diff <= 3)  alerts.push({ icon:'Bday', cls:'info', label:'Birthday in ' + diff + 'd: ' + (p.name||''), sub:'Prepare a personalised message', page:'customers', _p:2 });
    });

    /* ── RULE 9: Anniversaries within 3 days ─────────────── */
    [...customers, ...leads].forEach(p => {
      const ann = p.anniversary;
      if (!ann) return;
      const ad   = new Date(ann);
      const next = new Date(now.getFullYear(), ad.getMonth(), ad.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      const diff = Math.ceil((next - now) / 86400000);
      if (diff <= 3) alerts.push({
        icon:'Ann', cls:'ok',
        label:(diff === 0 ? 'Anniversary today' : 'Anniversary in ' + diff + 'd') + ': ' + (p.name||''),
        sub:'Send an anniversary greeting',
        page:'customers', _p:2,
      });
    });

    return alerts.sort((a, b) => (a._p||0) - (b._p||0)).slice(0, 25);
  }

  return { evaluate };
})();

window.WanagoAutomation = WanagoAutomation;

// ── Run full automation and push to Firestore ──
window.runFullAutomation = function() {
  if (!window.DB) return;
  try {
    var alerts = WanagoAutomation.evaluate();
    // Update dashboard notification badge count
    var urgentCount = alerts.filter(function(a) { return a.cls === 'danger'; }).length;
    var badges = document.querySelectorAll('.notif-badge, #notif-count, .automation-badge');
    badges.forEach(function(b) {
      if (urgentCount > 0) { b.textContent = urgentCount; b.style.display = ''; }
    });
    return alerts;
  } catch(e) { return []; }
};

/* ── Auto-evaluate when Firestore finishes loading ── */
(function () {
  var _orig = window._fsRefreshPage;
  window._fsRefreshPage = function () {
    if (typeof _orig === 'function') _orig.apply(this, arguments);
    try { WanagoAutomation.evaluate(); } catch (e) {}
  };
})();
