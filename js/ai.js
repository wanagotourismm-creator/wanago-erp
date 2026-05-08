// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — AI Engine v1
//  Algorithmic intelligence layer — no external API required.
//  All computation runs on live Firestore data (window.DB).
//  Role-scoped via hScoped() from utils.js.
// ═══════════════════════════════════════════════════════════════
'use strict';

const WanagoAI = (function () {

  /* ── Scoped data access (respects role + office filters) ── */
  function _d(col) {
    return typeof hScoped === 'function' ? hScoped(col) : (window.DB?.[col] || []);
  }
  function _customers() { return _d('customers'); }
  function _leads()     { return _d('leads'); }
  function _bookings()  { return _d('bookings'); }
  function _payments()  { return _d('payments'); }
  function _invoices()  { return _d('invoices'); }

  /* ══════════════════════════════════════════════════════════════
     LEAD HEAT SCORE  (0–100)
     Factors: stage, budget, interaction recency, source quality,
     follow-up urgency, notes richness.
  ══════════════════════════════════════════════════════════════ */
  function scoreLeadHeat(lead) {
    const stageBase = {
      new:10, contacted:22, follow_up:35, quoted:52, negotiation:72, won:100, lost:0,
    };
    let score = stageBase[lead.stage] || 10;

    // Budget signal
    const budget = Number(lead.budget || 0);
    if      (budget >= 300000) score += 20;
    else if (budget >= 150000) score += 15;
    else if (budget >=  75000) score += 10;
    else if (budget >       0) score +=  4;

    // Recency of last interaction
    const ts = lead.lastContactDate || lead.updatedAt || lead.createdAt;
    if (ts) {
      const days = Math.floor((Date.now() - new Date(ts)) / 86400000);
      if      (days > 30) score -= 25;
      else if (days > 14) score -= 12;
      else if (days >  7) score -=  6;
      else if (days <= 1) score +=  8;
    }

    // Follow-up urgency
    const fu = lead.nextFollowUp || lead.followUpDate;
    if (fu) {
      const diff = Math.ceil((new Date(fu) - Date.now()) / 86400000);
      if      (diff <  0) score += 18;   // overdue
      else if (diff === 0) score += 12;  // today
      else if (diff <= 2) score +=  5;   // coming up
    }

    // Source quality signal
    const src = (lead.source || '').toLowerCase();
    if (['referral','walk-in','reference','existing client'].some(s => src.includes(s))) score += 12;
    else if (['google','website','seo','organic'].some(s => src.includes(s))) score +=  6;

    // Notes richness (engaged lead)
    if ((lead.notes || '').length > 100) score += 5;

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  function heatLabel(score) {
    if (score >= 82) return { label: '🔥 Hot',      color: '#e74c3c', bg: '#fde8e8' };
    if (score >= 62) return { label: '⚡ Warm',     color: '#e67e22', bg: '#fef3e2' };
    if (score >= 42) return { label: '😐 Lukewarm', color: '#f1c40f', bg: '#fffce0' };
    if (score >= 20) return { label: '❄️ Cold',     color: '#3498db', bg: '#e8f4fd' };
    return               { label: '💤 Dormant',  color: '#95a5a6', bg: '#f4f4f4' };
  }

  /* ══════════════════════════════════════════════════════════════
     REVENUE FORECAST  — 3-month ahead prediction
     Exponential moving average (α=0.35) + trend adjustment
  ══════════════════════════════════════════════════════════════ */
  function forecastRevenue() {
    const payments = _payments().filter(p => ['completed','received'].includes(p.status));
    const now = new Date();
    const monthly = {};

    payments.forEach(p => {
      const d = new Date(p.date || p.createdAt);
      if (isNaN(d)) return;
      const k = d.getFullYear() * 100 + d.getMonth();
      monthly[k] = (monthly[k] || 0) + Number(p.amount || 0);
    });

    // Last 6 complete months
    const hist = [];
    for (let i = 6; i >= 1; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      hist.push({
        month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        value: monthly[d.getFullYear() * 100 + d.getMonth()] || 0,
      });
    }

    // EMA
    const alpha = 0.35;
    let ema = hist[0].value || 0;
    hist.forEach(h => { ema = alpha * h.value + (1 - alpha) * ema; });

    // Trend from last 3 months
    const l3 = hist.slice(-3).map(h => h.value);
    const trend = l3.length >= 2 ? (l3[l3.length - 1] - l3[0]) / (l3.length - 1) : 0;

    const forecast = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      forecast.push({
        month:      d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        predicted:  Math.max(0, Math.round(ema + trend * i * 0.5)),
        confidence: ['high', 'medium', 'low'][i - 1],
      });
    }

    return { history: hist, forecast, ema: Math.round(ema) };
  }

  /* ══════════════════════════════════════════════════════════════
     CUSTOMER SEGMENTATION
     VIP / Loyal / Regular / At-Risk / New / Inactive
  ══════════════════════════════════════════════════════════════ */
  function segmentCustomers() {
    const bookings = _bookings();
    const payments = _payments();
    const now      = Date.now();
    const result   = { vip: [], loyal: [], regular: [], at_risk: [], new: [], inactive: [] };

    _customers().forEach(c => {
      const cBooks   = bookings.filter(b => b.customerId === c.id || b.customerPhone === c.phone);
      const spend    = payments.filter(p => p.customerId === c.id || p.customerPhone === c.phone)
                               .reduce((s, p) => s + Number(p.amount || 0), 0);
      const cnt      = cBooks.length;
      const ageDays  = c.createdAt ? Math.floor((now - new Date(c.createdAt)) / 86400000) : 999;
      const lastBook = cBooks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      const dormDays = lastBook ? Math.floor((now - new Date(lastBook.createdAt)) / 86400000) : 999;

      let seg;
      if      (spend >= 500000 || cnt >= 5)          seg = 'vip';
      else if (cnt >= 3 && dormDays < 180)            seg = 'loyal';
      else if (cnt >= 1 && dormDays < 365)            seg = 'regular';
      else if (cnt >= 1 && dormDays >= 365)           seg = 'at_risk';
      else if (ageDays <= 30)                         seg = 'new';
      else                                            seg = 'inactive';

      result[seg].push({ id: c.id, name: c.name, phone: c.phone, spend, cnt, dormDays, segment: seg });
    });

    return result;
  }

  /* ══════════════════════════════════════════════════════════════
     SMART INSIGHTS  — up to 6 context-aware action cards
  ══════════════════════════════════════════════════════════════ */
  function generateInsights() {
    const leads    = _leads();
    const bookings = _bookings();
    const payments = _payments();
    const invoices = _invoices();
    const now      = new Date();
    const today    = now.toISOString().slice(0, 10);
    const mStart   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const lmStart  = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const lmEnd    = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();
    const paid     = p => ['completed', 'received'].includes(p.status);

    const thisMRev = payments.filter(p => paid(p) && (p.date||p.createdAt||'') >= mStart)
                             .reduce((s, p) => s + Number(p.amount || 0), 0);
    const lastMRev = payments.filter(p => paid(p) && (p.date||p.createdAt||'') >= lmStart && (p.date||p.createdAt||'') <= lmEnd)
                             .reduce((s, p) => s + Number(p.amount || 0), 0);

    const active      = leads.filter(l => !['won', 'lost'].includes(l.stage));
    const overdueFollowUps = active.filter(l => { const fu = l.nextFollowUp || l.followUpDate; return fu && fu < today; }).length;
    const hotLeads    = active.filter(l => scoreLeadHeat(l) >= 70).length;
    const won         = leads.filter(l => l.stage === 'won').length;
    const cvr         = leads.length > 0 ? (won / leads.length * 100) : 0;

    const dep7   = bookings.filter(b => {
      if (!b.travelDate || b.status === 'cancelled') return false;
      const d = Math.ceil((new Date(b.travelDate) - now) / 86400000);
      return d >= 0 && d <= 7;
    }).length;

    const overdueInv = invoices.filter(i =>
      i.status === 'overdue' || (i.status !== 'paid' && i.dueDate && i.dueDate < today)
    ).length;

    const pendingAmt = bookings.filter(b => b.status !== 'cancelled')
                               .reduce((s, b) => s + Number(b.pendingAmount || 0), 0);

    const ins = [];

    // Revenue trend
    if (lastMRev > 0) {
      const g = ((thisMRev - lastMRev) / lastMRev * 100);
      ins.push({
        type: g >= 0 ? 'success' : 'warning', icon: g >= 0 ? '📈' : '📉',
        title: g >= 0 ? `Revenue up ${g.toFixed(1)}% vs last month` : `Revenue down ${Math.abs(g).toFixed(1)}% vs last month`,
        detail: `₹${fmt(thisMRev)} this month · ₹${fmt(lastMRev)} last month`,
        action: 'Payments', actionPage: 'payments',
      });
    } else if (thisMRev > 0) {
      ins.push({ type:'success', icon:'💰', title:`₹${fmt(thisMRev)} collected this month`, detail:'Great start — keep the momentum going!', action:'Payments', actionPage:'payments' });
    }

    if (overdueFollowUps > 0) ins.push({
      type:'danger', icon:'⚠️',
      title: `${overdueFollowUps} overdue follow-up${overdueFollowUps > 1 ? 's' : ''}`,
      detail: 'These leads risk going cold. Contact them today.',
      action: 'View Leads', actionPage: 'leads',
    });

    if (hotLeads > 0) ins.push({
      type:'info', icon:'🔥',
      title: `${hotLeads} hot lead${hotLeads > 1 ? 's' : ''} ready to close`,
      detail: 'High-scoring leads with strong conversion potential.',
      action: 'Open Leads', actionPage: 'leads',
    });

    if (dep7 > 0) ins.push({
      type:'info', icon:'✈️',
      title: `${dep7} departure${dep7 > 1 ? 's' : ''} within 7 days`,
      detail: 'Confirm hotels, transfers, and travel documents.',
      action: 'Bookings', actionPage: 'bookings',
    });

    if (overdueInv > 0) ins.push({
      type:'danger', icon:'🧾',
      title: `${overdueInv} overdue invoice${overdueInv > 1 ? 's' : ''}`,
      detail: 'Send payment reminders or escalate collections.',
      action: 'Invoices', actionPage: 'invoices',
    });

    if (leads.length >= 5) ins.push({
      type: cvr >= 30 ? 'success' : cvr >= 15 ? 'warning' : 'danger',
      icon: cvr >= 30 ? '🏆' : '🎯',
      title: `Lead conversion: ${cvr.toFixed(1)}%`,
      detail: cvr >= 30 ? 'Strong performance — keep following up fast!'
            : cvr >= 15 ? 'Moderate. Tighten your follow-up cadence.'
                        : 'Below target. Review lead quality & process.',
      action: 'Pipeline', actionPage: 'leads',
    });

    if (pendingAmt > 0) ins.push({
      type:'warning', icon:'💳',
      title: `₹${fmt(pendingAmt)} pending collection`,
      detail: 'Outstanding balance from confirmed bookings.',
      action: 'Payments', actionPage: 'payments',
    });

    return ins.slice(0, 6);
  }

  /* ══════════════════════════════════════════════════════════════
     AI RECOMMENDATIONS  — top 3 actionable priorities for today
  ══════════════════════════════════════════════════════════════ */
  function getRecommendations() {
    const leads     = _leads();
    const customers = _customers();
    const bookings  = _bookings();
    const now       = new Date();
    const recs      = [];

    // Hottest leads to call today (top 5 by score)
    const hotOnes = leads
      .filter(l => !['won', 'lost'].includes(l.stage))
      .map(l => ({ ...l, score: scoreLeadHeat(l) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (hotOnes.length > 0) recs.push({
      priority: 'high', icon: '📞',
      title: 'Priority follow-ups today',
      items: hotOnes.map(l => `${l.name || 'Lead'} — AI score ${l.score}`),
      action: 'Open Leads', actionPage: 'leads',
    });

    // Birthdays & anniversaries within 7 days
    const celebs = [...customers, ...leads].filter(p => {
      const dob = p.dob || p.birthday || p.anniversary;
      if (!dob) return false;
      const bd   = new Date(dob);
      const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
      if (next < now) next.setFullYear(now.getFullYear() + 1);
      return Math.ceil((next - now) / 86400000) <= 7;
    });

    if (celebs.length > 0) recs.push({
      priority: 'medium', icon: '🎂',
      title: `${celebs.length} birthday/anniversary this week`,
      items: celebs.slice(0, 3).map(p => p.name || 'Customer'),
      action: 'View Customers', actionPage: 'customers',
    });

    // Departures needing prep in next 3 days
    const urgent = bookings.filter(b => {
      if (!b.travelDate || b.status === 'cancelled') return false;
      const d = Math.ceil((new Date(b.travelDate) - now) / 86400000);
      return d >= 0 && d <= 3;
    });

    if (urgent.length > 0) recs.push({
      priority: 'high', icon: '✈️',
      title: `${urgent.length} departure${urgent.length > 1 ? 's' : ''} in 3 days`,
      items: urgent.map(b => `${b.customerName || 'Booking'} → ${b.destination || 'Destination TBD'}`),
      action: 'View Bookings', actionPage: 'bookings',
    });

    return recs.slice(0, 3);
  }

  /* ══════════════════════════════════════════════════════════════
     TOP PERFORMERS  — ranked by this-month revenue collected
  ══════════════════════════════════════════════════════════════ */
  function getTopPerformers() {
    const leads    = _leads();
    const bookings = _bookings();
    const payments = _payments();
    const now      = new Date();
    const mStart   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const perf     = {};
    const add      = name => { if (!perf[name]) perf[name] = { name, won: 0, bookings: 0, revenue: 0 }; };

    leads.filter(l => l.stage === 'won').forEach(l => {
      const a = l.assignedTo || 'Unassigned'; add(a); perf[a].won++;
    });
    bookings.filter(b => b.status !== 'cancelled').forEach(b => {
      const a = b.assignedTo || 'Unassigned'; add(a); perf[a].bookings++;
    });
    payments.filter(p => ['completed','received'].includes(p.status) && (p.date||p.createdAt||'') >= mStart).forEach(p => {
      const a = p.receivedBy || p.assignedTo || 'Unassigned'; add(a);
      perf[a].revenue += Number(p.amount || 0);
    });

    return Object.values(perf)
      .sort((a, b) => b.revenue - a.revenue || b.won - a.won)
      .slice(0, 5);
  }

  /* ══════════════════════════════════════════════════════════════
     UPCOMING DEPARTURES  — next 14 days, sorted by travel date
  ══════════════════════════════════════════════════════════════ */
  function getUpcomingDepartures() {
    const now = new Date();
    return _bookings()
      .filter(b => {
        if (!b.travelDate || b.status === 'cancelled') return false;
        const d = Math.ceil((new Date(b.travelDate) - now) / 86400000);
        return d >= 0 && d <= 14;
      })
      .sort((a, b) => new Date(a.travelDate) - new Date(b.travelDate))
      .slice(0, 10);
  }

  /* ══════════════════════════════════════════════════════════════
     DATA HEALTH SCORE  — quick DB quality indicator
  ══════════════════════════════════════════════════════════════ */
  function dataHealthScore() {
    const leads    = _leads();
    const bookings = _bookings();
    let issues = 0, total = 0;

    leads.forEach(l => {
      total++;
      if (!l.phone && !l.email) issues++;
      if (!l.source) issues += 0.5;
    });
    bookings.forEach(b => {
      total++;
      if (!b.customerPhone) issues++;
      if (!b.ref) issues += 0.5;
    });

    const score = total === 0 ? 100 : Math.max(0, Math.round(100 - (issues / total) * 100));
    return { score, issues: Math.round(issues), total };
  }

  /* ── Number formatter ── */
  function fmt(n) {
    n = Number(n || 0);
    if (n >= 10000000) return (n / 10000000).toFixed(1) + ' Cr';
    if (n >= 100000)   return (n / 100000).toFixed(1) + ' L';
    return n.toLocaleString('en-IN');
  }

  return {
    scoreLeadHeat,
    heatLabel,
    forecastRevenue,
    segmentCustomers,
    generateInsights,
    getRecommendations,
    getTopPerformers,
    getUpcomingDepartures,
    dataHealthScore,
    fmt,
  };
})();

window.WanagoAI = WanagoAI;
