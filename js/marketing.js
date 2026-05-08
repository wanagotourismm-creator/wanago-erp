// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — Marketing Hub
//  Meta Ads · WhatsApp Blast · Email Blast · Occasions · Analytics
// ═══════════════════════════════════════════════════════════════
'use strict';

// ── Auth guard (same pattern as every other page) ──
function initPage(renderFn) {
  var session = sessionStorage.getItem('wanago_session');
  if (!session) { window.location.href = '../index.html'; return; }
  try {
    var s = JSON.parse(session);
    var name = (window.currentUser && window.currentUser.name) || s.name || 'User';
    var tu = document.getElementById('topbar-user');
    if (tu) tu.textContent = s.email || '';
    if (typeof window.rebuildSidebar === 'function') window.rebuildSidebar();
  } catch(ex) {}
  function fadeLoader() {
    var l = document.getElementById('page-loader');
    var a = document.querySelector('.app');
    if (l) { l.classList.add('fade-out'); setTimeout(function(){ try{l.parentNode.removeChild(l);}catch(e){} }, 300); }
    if (a) a.classList.add('loaded');
  }
  setTimeout(function() {
    try { if (renderFn) renderFn(); } catch(e) { console.error('Marketing render error:', e); }
    fadeLoader();
  }, 20);
}

function goTo(page) { window.location.href = page + '.html'; }
function handleLogout() { sessionStorage.removeItem('wanago_session'); window.location.href = '../index.html'; }
window.goTo = goTo; window.handleLogout = handleLogout;

let _mktCampaignFilter = 'all';
let _editCampaignId = null, _editSegmentId = null, _editTemplateId = null;
let _waContacts = [], _emailContacts = [];

// ── Default templates ──
const DEFAULT_TEMPLATES = [
  { id:'tpl_bd',    name:'Birthday Wish',         type:'whatsapp', category:'personal',      body:'🎂 Happy Birthday *{{name}}*! Wishing you a wonderful day. We hope to plan a special trip for you soon! 🌟\n— Team Wanago', variables:['name'] },
  { id:'tpl_bk',    name:'Booking Confirmation',  type:'whatsapp', category:'transactional', body:'✅ *Booking Confirmed!*\n\nHi *{{name}}*, your trip to *{{destination}}* is confirmed!\n📅 Travel Date: {{date}}\n💰 Amount: ₹{{amount}}\n\nNeed help? Call us anytime.\n— Team Wanago', variables:['name','destination','date','amount'] },
  { id:'tpl_py',    name:'Payment Reminder',       type:'whatsapp', category:'transactional', body:'💰 *Payment Reminder*\n\nHi *{{name}}*, your balance of ₹{{amount}} for *{{destination}}* is due on *{{date}}*.\n\nPay now to confirm your booking.\n— Team Wanago', variables:['name','amount','destination','date'] },
  { id:'tpl_qt',    name:'Quotation Sent',         type:'whatsapp', category:'sales',         body:'📋 Hi *{{name}}*! Your quote for *{{destination}}* is ready.\n\n💰 ₹{{amount}}/person\nIncludes: Flights, Hotel, Transfers & Sightseeing\n\nReply to book! 🌟\n— Team Wanago', variables:['name','destination','amount'] },
  { id:'tpl_fl',    name:'Follow-up Nudge',        type:'whatsapp', category:'sales',         body:'👋 Hi *{{name}}*, just checking in! Have you had a chance to look at the *{{destination}}* package?\n\nDates are filling up fast 🔥\n— Team Wanago', variables:['name','destination'] },
  { id:'tpl_promo', name:'Promo Campaign',         type:'whatsapp', category:'promotional',   body:'🏖️ *Special Offer!*\n\nHi {{name}}, save up to *{{amount}}%* on {{destination}} packages!\n📅 Limited time offer!\n\n— Team Wanago', variables:['name','amount','destination'] },
  { id:'tpl_ann',   name:'Anniversary Wish',       type:'whatsapp', category:'personal',      body:'💕 Happy Anniversary *{{name}}*! Wishing you many more beautiful years together. How about celebrating with a dream vacation? ✈️\n— Team Wanago', variables:['name'] },
  { id:'tpl_em',    name:'Email Newsletter',       type:'email',    category:'promotional',   subject:'Exclusive Travel Deals 🌟', body:'<p>Dear {{name}},</p><p>We have curated the best travel packages for you!</p><p>🌴 <strong>Top Destinations:</strong><br>• Maldives from ₹45,000<br>• Goa from ₹8,500<br>• Bali from ₹38,000</p><p>Warm regards,<br>Team Wanago</p>', variables:['name'] },
  { id:'tpl_sms',   name:'SMS Flash Sale',         type:'sms',      category:'promotional',   body:'WANAGO: Hi {{name}}, FLASH SALE! {{destination}} tour at ₹{{amount}}. Book today. Call: {{phone}}. T&C apply.', variables:['name','destination','amount','phone'] },
];

// ── Init ──
function mktInit() {
  if (!DB.campaigns)  DB.campaigns  = [];
  if (!DB.segments)   DB.segments   = [];
  if (!Array.isArray(DB.settings.mktTemplates)) {
    DB.settings.mktTemplates = DEFAULT_TEMPLATES.map(t => ({ ...t }));
    saveDB();
  }

  _updateIntegrationPills();
  mktRenderOverview();
  const content = document.getElementById('mkt-page-content');
  if (content) content.style.opacity = '1';
}

// ── Integration status pills ──
function _updateIntegrationPills() {
  const creds = WanagoIntegrations.getCreds();
  const wa = creds.whatsapp || {};
  const meta = creds.meta || {};
  const gmail = creds.gmail || {};

  const waPill = document.getElementById('wa-status-pill');
  const metaPill = document.getElementById('meta-status-pill');
  const gmailPill = document.getElementById('gmail-status-pill');

  if (waPill) { const on = !!(wa.accessToken && wa.phoneNumberId); waPill.className = 'int-pill ' + (on?'on':'off'); waPill.textContent = '💬 WA'; }
  if (metaPill) { const on = !!(meta.accessToken && meta.adAccountId); metaPill.className = 'int-pill ' + (on?'on':'off'); metaPill.textContent = '📘 Meta'; }
  if (gmailPill) { const on = !!(gmail.accessToken || gmail.clientId); gmailPill.className = 'int-pill ' + (on?'on':'off'); gmailPill.textContent = '📧 Gmail'; }
}

// ── Helpers ──
function _e(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
function _fmtNum(n) { return Number(n||0).toLocaleString('en-IN'); }
function _daysUntil(month, day) {
  const today = new Date(); today.setHours(0,0,0,0);
  const next = new Date(today.getFullYear(), month, day);
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return Math.ceil((next - today) / 86400000);
}

// ── Overview ──
function mktRenderOverview() {
  const campaigns = hScoped('campaigns');
  const sent = campaigns.filter(c => c.status === 'sent');
  const totalReach = sent.reduce((s,c) => s + (c.stats?.sent || 0), 0);
  const totalConverted = sent.reduce((s,c) => s + (c.stats?.converted || 0), 0);
  const leads = hScoped('leads');
  const mktSrcs = ['instagram','facebook','google','youtube','website','referral','whatsapp','meta'];
  const mktLeads = leads.filter(l => mktSrcs.includes((l.source||'').toLowerCase()));

  _setText('mkt-kpi-campaigns', campaigns.length);
  _setText('mkt-kpi-reach', totalReach > 999 ? (totalReach/1000).toFixed(1)+'K' : totalReach);
  _setText('mkt-kpi-mkt-leads', mktLeads.length);
  _setText('mkt-kpi-converted', totalConverted);

  // Meta spend from cache
  const metaCache = _getMetaCache();
  if (metaCache?.totalSpend) {
    _setText('mkt-kpi-meta-spend', '₹' + _fmtNum(Math.round(Number(metaCache.totalSpend))));
  }

  // Recent campaigns
  const tbody = document.getElementById('mkt-recent-tbody');
  const recent = [...campaigns].sort((a,b) => new Date(b.createdAt||0) - new Date(a.createdAt||0)).slice(0,8);
  const TYPE_ICONS = { whatsapp:'💬', email:'📧', meta:'📘', sms:'📱', social:'📢' };
  tbody.innerHTML = recent.length
    ? recent.map(c => `<tr>
        <td style="font-weight:600">${_e(c.name)}</td>
        <td>${TYPE_ICONS[c.type]||'📣'} ${c.type||''}</td>
        <td>${_pillStatus(c.status)}</td>
        <td>${c.stats?.sent || 0}</td>
        <td style="font-size:11px;color:var(--textd)">${c.scheduledAt ? formatDate(c.scheduledAt) : formatDate(c.createdAt)}</td>
      </tr>`).join('')
    : '<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--textd)">No campaigns yet — create one above</td></tr>';

  // Today's action list
  const todayEl = document.getElementById('mkt-today-actions');
  const actions = _buildTodayActions();
  todayEl.innerHTML = actions.length
    ? actions.map(a => `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:16px">${a.icon}</span>
        <div style="flex:1"><div style="font-size:12.5px;font-weight:600">${_e(a.title)}</div><div style="font-size:11px;color:var(--textd)">${_e(a.sub)}</div></div>
        ${a.action ? `<button class="btn btn-sm btn-green" onclick="${a.action}" style="font-size:11px">${a.btn}</button>` : ''}
      </div>`).join('')
    : '<div style="text-align:center;padding:20px;color:var(--textd);font-size:12px">Nothing urgent today! 🎉</div>';

  renderMktAIRecs();
}

function renderMktAIRecs() {
  const el = document.getElementById('mkt-ai-recs');
  if (!el) return;

  const recs = [];
  const bookings = hScoped('bookings') || [];
  const leads = hScoped('leads') || [];
  const customers = hScoped('customers') || [];

  // 1. Hot leads needing follow-up (scored 80+, no recent booking)
  if (typeof window.WanagoAI !== 'undefined') {
    try {
      const activeLeads = leads.filter(l => l.stage !== 'booked' && l.stage !== 'lost');
      const hotLeads = activeLeads.filter(l => {
        try { return WanagoAI.scoreLeadHeat(l) >= 80; } catch(e) { return false; }
      });
      if (hotLeads.length) {
        const topDest = hotLeads.map(l=>l.destination).filter(Boolean);
        const dest = topDest.length ? topDest[0] : 'various destinations';
        recs.push({ icon:'🔥', color:'#dc2626', bg:'#fee2e2',
          title: hotLeads.length+' Hot Lead'+(hotLeads.length>1?'s':'')+' Ready to Close',
          sub: 'High-intent, 80+ heat score — personalized follow-up can convert now',
          badge: hotLeads.length+' leads',
          audience: 'all_leads',
          btnLabel: '💬 WA Blast Leads',
        });
      }

      // 2. At-risk customers — re-engagement
      const segs = WanagoAI.segmentCustomers();
      const atRisk = segs.at_risk || [];
      if (atRisk.length) {
        const avgSpend = atRisk.reduce((s,c)=>s+Number(c.totalRevenue||0),0) / atRisk.length;
        recs.push({ icon:'⚠️', color:'#f97316', bg:'#fff7ed',
          title: atRisk.length+' At-Risk Customer'+(atRisk.length>1?'s':'')+' Slipping Away',
          sub: 'Haven\'t engaged recently — a re-engagement offer can recover ≈'+formatMoney(Math.round(avgSpend * atRisk.length * 0.3))+' potential',
          badge: atRisk.length+' customers',
          audience: 'inactive_90',
          btnLabel: '💬 Win-Back Blast',
        });
      }

      // 3. VIP customers — exclusive offer
      const vips = segs.vip || [];
      if (vips.length) {
        const vipRevenue = vips.reduce((s,c)=>s+Number(c.totalRevenue||0),0);
        recs.push({ icon:'⭐', color:'#b45309', bg:'#fffbeb',
          title: 'Exclusive Offer for '+vips.length+' VIP Customer'+(vips.length>1?'s':''),
          sub: 'Your top spenders — ₹'+Math.round(vipRevenue/Math.max(vips.length,1)).toLocaleString('en-IN')+' avg spend. Premium package campaign recommended',
          badge: vips.length+' VIPs',
          audience: 'all_customers',
          btnLabel: '💬 VIP Campaign',
        });
      }

      // 4. Inactive customers — dormant win-back
      const inactive = segs.inactive || [];
      if (inactive.length) {
        recs.push({ icon:'💤', color:'#6b7280', bg:'#f3f4f6',
          title: inactive.length+' Dormant Customer'+(inactive.length>1?'s':'')+' to Re-activate',
          sub: 'No engagement in 6+ months — a seasonal offer email can bring them back',
          badge: inactive.length+' dormant',
          audience: 'inactive_90',
          btnLabel: '📧 Email Campaign',
        });
      }
    } catch(e) {}
  }

  // 5. Pending payments blast (always useful, no AI needed)
  const pendingBks = bookings.filter(b => b.status !== 'cancelled' && Number(b.pendingAmount||0) > 0);
  if (pendingBks.length) {
    const totalPending = pendingBks.reduce((s,b)=>s+Number(b.pendingAmount||0),0);
    recs.push({ icon:'💰', color:'var(--g700)', bg:'var(--g50)',
      title: 'Payment Reminder Blast — '+formatMoney(totalPending)+' Pending',
      sub: pendingBks.length+' bookings with outstanding balances — a bulk WhatsApp reminder drives same-day payments',
      badge: pendingBks.length+' bookings',
      audience: 'pending_payment',
      btnLabel: '💬 Send Reminders',
    });
  }

  if (!recs.length) { el.style.display = 'none'; return; }
  el.style.display = '';

  el.innerHTML =
    '<div style="background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;box-shadow:var(--sh)">'+
      '<div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:8px">🤖 AI Campaign Recommendations '+
        '<span style="font-size:11px;font-weight:500;color:var(--textd)">based on your customer data</span>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">'+
        recs.slice(0,4).map(r =>
          '<div style="background:'+r.bg+';border:1px solid '+r.color+'22;border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:8px">'+
            '<div style="display:flex;align-items:center;gap:8px">'+
              '<span style="font-size:17px">'+r.icon+'</span>'+
              '<div style="flex:1">'+
                '<div style="font-size:12.5px;font-weight:700;color:var(--text);line-height:1.3">'+r.title+'</div>'+
                '<span style="font-size:10px;font-weight:700;color:'+r.color+';background:'+r.color+'20;padding:1px 7px;border-radius:10px">'+r.badge+'</span>'+
              '</div>'+
            '</div>'+
            '<div style="font-size:11px;color:var(--textd);line-height:1.5">'+r.sub+'</div>'+
            '<button onclick="mktLaunchFromRec(\''+r.audience+'\')" style="align-self:flex-start;font-size:11px;font-weight:700;padding:5px 12px;border:1px solid '+r.color+'44;border-radius:8px;background:'+r.color+'15;color:'+r.color+';cursor:pointer;font-family:inherit;transition:.15s" onmouseover="this.style.background=\''+r.color+'30\'" onmouseout="this.style.background=\''+r.color+'15\'">'+r.btnLabel+' →</button>'+
          '</div>'
        ).join('')+
      '</div>'+
    '</div>';
}

function mktLaunchFromRec(audience) {
  const tabs = document.querySelectorAll('.tab');
  switchTab(tabs[2], 'mkt-wa-blast');
  mktLoadBlastContacts('whatsapp');
  setTimeout(() => {
    const sel = document.getElementById('wa-blast-audience');
    if (sel) { sel.value = audience; mktLoadBlastContacts('whatsapp'); }
  }, 50);
}
window.renderMktAIRecs = renderMktAIRecs;
window.mktLaunchFromRec = mktLaunchFromRec;

function _buildTodayActions() {
  const db = DB; const today = new Date(); const actions = [];
  const allPeople = [...(hScoped('customers')||[]), ...(hScoped('leads')||[])];
  allPeople.forEach(p => {
    const dob = p.dob || p.birthday;
    if (dob) {
      const bd = new Date(dob);
      const diff = _daysUntil(bd.getMonth(), bd.getDate());
      if (diff === 0) actions.push({ icon:'🎂', title:'Birthday: ' + p.name, sub:'Send a birthday wish today!', btn:'Send WA', action:`mktQuickWish('${p.id||''}','birthday','${(p.phone||p.mobile||'').replace(/'/g,'')}','${(p.name||'').replace(/'/g,'')}')` });
      else if (diff <= 3) actions.push({ icon:'🎉', title:'Upcoming: ' + p.name, sub:`Birthday in ${diff} day${diff===1?'':'s'}`, btn:'Prep Msg', action:`mktQuickWish('${p.id||''}','birthday','${(p.phone||p.mobile||'').replace(/'/g,'')}','${(p.name||'').replace(/'/g,'')}')` });
    }
    const ann = p.anniversary;
    if (ann) {
      const ad = new Date(ann);
      const diff = _daysUntil(ad.getMonth(), ad.getDate());
      if (diff === 0) actions.push({ icon:'💕', title:'Anniversary: ' + p.name, sub:'Send an anniversary wish!', btn:'Send WA', action:`mktQuickWish('${p.id||''}','anniversary','${(p.phone||p.mobile||'').replace(/'/g,'')}','${(p.name||'').replace(/'/g,'')}')` });
    }
  });
  // Overdue invoices
  (hScoped('invoices')||[]).filter(i => i.status === 'unpaid' || i.status === 'overdue').slice(0,3).forEach(inv => {
    actions.push({ icon:'💰', title:'Payment Due: ' + (inv.customerName||'—'), sub:'₹' + _fmtNum(inv.total||inv.amount||0), btn:'Remind', action:`goTo('invoices')` });
  });
  return actions.slice(0, 8);
}

// ── Quick occasion wish ──
function mktQuickWish(id, type, phone, name) {
  const tplId = type === 'birthday' ? 'tpl_bd' : 'tpl_ann';
  const tpl = (DB.settings.mktTemplates || []).find(t => t.id === tplId) || DEFAULT_TEMPLATES.find(t => t.id === tplId);
  const msg = (tpl?.body || 'Happy ' + type + ' ' + name + '!').replace(/{{name}}/g, name);
  if (phone) {
    window.open('https://wa.me/' + phone.replace(/[^0-9]/g,'') + '?text=' + encodeURIComponent(msg), '_blank');
  }
}
window.mktQuickWish = mktQuickWish;

// ── Status pill ──
function _pillStatus(s) {
  const map = { sent:'pill-green', draft:'pill-gray', scheduled:'pill-blue', failed:'pill-red', paused:'pill-amber' };
  return `<span class="pill ${map[s]||'pill-gray'}">${s||'—'}</span>`;
}

/* ══════════════════════════════════════════════════════
   META ADS
══════════════════════════════════════════════════════ */
function _getMetaCache() { try { return JSON.parse(localStorage.getItem('wg_meta_cache')||'null'); } catch(e){ return null; } }
function _setMetaCache(d) { localStorage.setItem('wg_meta_cache', JSON.stringify({ ...d, _ts: Date.now() })); }

async function mktLoadMeta() {
  const M = WanagoIntegrations.Meta;
  const notConf = document.getElementById('meta-not-configured');
  const conf    = document.getElementById('meta-configured');
  const loading = document.getElementById('meta-loading');

  if (!M.isConfigured()) {
    notConf.style.display = 'block'; conf.style.display = 'none'; return;
  }
  notConf.style.display = 'none'; conf.style.display = 'block';

  const preset = document.getElementById('meta-date-preset')?.value || 'last_30d';
  loading.style.display = 'inline';

  try {
    const [accountInsights, campaignInsights] = await Promise.all([
      M.getAccountInsights(preset),
      M.getCampaignInsights(preset)
    ]);

    // Account KPIs
    const d = accountInsights.data?.[0] || {};
    const spend = parseFloat(d.spend || 0);
    const spendINR = spend * 83; // approx USD→INR if needed; Meta returns in account currency
    _setText('meta-total-spend', '₹' + _fmtNum(Math.round(spendINR || spend)));
    _setText('meta-period-note', preset.replace(/_/g,' '));
    _setText('meta-total-reach', _fmtNum(d.reach));
    _setText('meta-freq-note', d.frequency ? 'Freq: ' + parseFloat(d.frequency).toFixed(2) : '—');
    _setText('meta-total-clicks', _fmtNum(d.clicks));
    _setText('meta-ctr-note', d.ctr ? 'CTR: ' + parseFloat(d.ctr).toFixed(2) + '%' : '—');
    _setText('meta-cpm', d.cpm ? '₹' + parseFloat(d.cpm).toFixed(0) : '—');
    _setText('meta-cpc-note', d.cpc ? 'CPC ₹' + parseFloat(d.cpc).toFixed(0) : '—');
    _setText('meta-last-updated', 'Updated ' + new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}));

    // Actions grid
    if (d.actions && d.actions.length) {
      const actGrid = document.getElementById('meta-actions-grid');
      actGrid.innerHTML = d.actions.map(a => `
        <div style="background:var(--cream);border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center">
          <div style="font-size:18px;font-weight:800;color:var(--g700)">${_fmtNum(parseInt(a.value||0))}</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--textd);margin-top:3px">${a.action_type.replace(/_/g,' ')}</div>
        </div>`).join('');
    }

    // Cache for overview KPI
    _setMetaCache({ totalSpend: spendINR || spend });
    _setText('mkt-kpi-meta-spend', '₹' + _fmtNum(Math.round(spendINR || spend)));

    // Campaign table
    const rows = campaignInsights.data || [];
    const tbody = document.getElementById('meta-camps-tbody');
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--textd)">No campaign data for this period</td></tr>';
    } else {
      const maxSpend = Math.max(...rows.map(r => parseFloat(r.spend||0)));
      tbody.innerHTML = rows.map(r => {
        const sp = parseFloat(r.spend||0);
        const barW = maxSpend > 0 ? Math.round(sp/maxSpend*100) : 0;
        const conv = (r.actions||[]).reduce((s,a)=>s+parseInt(a.value||0),0);
        const statusCamp = r.campaign_name ? '' : '';
        return `<tr>
          <td style="font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${_e(r.campaign_name||'—')}</td>
          <td><span class="pill pill-green" style="font-size:9px">Active</span></td>
          <td><span style="font-weight:700;color:#1877f2">₹${_fmtNum(Math.round(sp))}</span>
              <div class="meta-bar" style="width:60px;margin-left:4px"><div class="meta-bar-fill" style="width:${barW}%"></div></div></td>
          <td>${_fmtNum(r.reach)}</td>
          <td>${_fmtNum(r.impressions)}</td>
          <td>${_fmtNum(r.clicks)}</td>
          <td>${parseFloat(r.ctr||0).toFixed(2)}%</td>
          <td>₹${parseFloat(r.cpc||0).toFixed(0)}</td>
          <td style="font-weight:700;color:var(--g600)">${_fmtNum(conv)}</td>
        </tr>`;
      }).join('');
    }

  } catch(e) {
    showToast('Meta Ads: ' + e.message, 'error');
    const tbody = document.getElementById('meta-camps-tbody');
    if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--red)">${_e(e.message)}</td></tr>`;
  } finally {
    loading.style.display = 'none';
  }
}
window.mktLoadMeta = mktLoadMeta;

/* ══════════════════════════════════════════════════════
   WHATSAPP BLAST
══════════════════════════════════════════════════════ */
function mktLoadBlastContacts(channel) {
  const audienceId = channel === 'whatsapp'
    ? (document.getElementById('wa-blast-audience')?.value || 'all_customers')
    : (document.getElementById('email-blast-audience')?.value || 'all_customers');

  const contacts = _resolveAudience(audienceId);

  if (channel === 'whatsapp') {
    _waContacts = contacts.filter(c => c.phone || c.mobile);
    _renderContactList('wa-contact-list', 'wa', _waContacts, 'phone');
    _setText('wa-contacts-count', _waContacts.length + ' contacts');
    _populateWATemplates();
    _renderWAApiInfo();
  } else {
    _emailContacts = contacts.filter(c => c.email);
    _renderContactList('email-contact-list', 'email', _emailContacts, 'email');
    _setText('email-contacts-count', _emailContacts.length + ' contacts');
    _renderGmailInfo();
  }
}
window.mktLoadBlastContacts = mktLoadBlastContacts;

function _resolveAudience(id) {
  const custs = hScoped('customers') || [];
  const leads = hScoped('leads') || [];
  const all = [...custs.map(c=>({...c,_src:'customer'})), ...leads.map(l=>({...l,_src:'lead'}))];
  const today = new Date(); today.setHours(0,0,0,0);
  switch(id) {
    case 'all_customers': return custs;
    case 'all_leads':     return leads;
    case 'birthday_week': return all.filter(p => { const d = new Date(p.dob||p.birthday||''); if (isNaN(d)) return false; const diff = _daysUntil(d.getMonth(), d.getDate()); return diff <= 7; });
    case 'anniversary_week': return all.filter(p => { const d = new Date(p.anniversary||''); if (isNaN(d)) return false; const diff = _daysUntil(d.getMonth(), d.getDate()); return diff <= 7; });
    case 'pending_payment': return (hScoped('bookings')||[]).filter(b => (b.balanceAmount||b.balance||0) > 0).map(b => ({ name: b.customerName, phone: b.customerPhone || b.phone, email: b.customerEmail || b.email, amount: b.balanceAmount || b.balance }));
    case 'inactive_90': {
      const cut = Date.now() - 90 * 86400000;
      return custs.filter(c => !c.lastContactDate || new Date(c.lastContactDate) < new Date(cut));
    }
    case 'recent_leads': {
      const cut = Date.now() - 30 * 86400000;
      return leads.filter(l => new Date(l.createdAt||0) >= new Date(cut));
    }
    default: return custs;
  }
}

function _renderContactList(containerId, prefix, contacts, infoField) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!contacts.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textd);font-size:12px">No contacts in this segment</div>'; return; }
  el.innerHTML = contacts.map((c, i) => {
    const info = infoField === 'phone' ? (c.phone||c.mobile||'—') : (c.email||'—');
    const av = (c.name||'?')[0].toUpperCase();
    return `<div class="bc-row">
      <input type="checkbox" class="bc-check" id="${prefix}-chk-${i}" checked data-idx="${i}"/>
      <div class="bc-av">${av}</div>
      <div class="bc-name">${_e(c.name||'Unknown')}</div>
      <div class="bc-phone">${_e(info)}</div>
    </div>`;
  }).join('');
}

function mktSelectAll(prefix, checked) {
  document.querySelectorAll(`#${prefix === 'wa' ? 'wa-contact-list' : 'email-contact-list'} .bc-check`).forEach(c => c.checked = checked);
}
window.mktSelectAll = mktSelectAll;

function _getSelectedContacts(prefix, contacts) {
  const checks = document.querySelectorAll(`#${prefix === 'wa' ? 'wa-contact-list' : 'email-contact-list'} .bc-check`);
  return contacts.filter((_, i) => checks[i]?.checked);
}

function _populateWATemplates() {
  const sel = document.getElementById('wa-blast-tpl');
  if (!sel) return;
  const tpls = (DB.settings.mktTemplates || DEFAULT_TEMPLATES).filter(t => t.type === 'whatsapp');
  sel.innerHTML = '<option value="">Custom message…</option>' + tpls.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
}

function mktWABlastPreview() {
  const tplId = document.getElementById('wa-blast-tpl')?.value;
  let body = document.getElementById('wa-blast-body')?.value || '';
  if (tplId) {
    const tpl = (DB.settings.mktTemplates||DEFAULT_TEMPLATES).find(t => t.id === tplId);
    if (tpl) { body = tpl.body; if (document.getElementById('wa-blast-body')) document.getElementById('wa-blast-body').value = body; }
  }
  const sample = body.replace(/{{name}}/g,'Rahul').replace(/{{destination}}/g,'Maldives').replace(/{{amount}}/g,'25,000').replace(/{{date}}/g,'15 Jun').replace(/{{phone}}/g,'+91 9999 000 000').replace(/{{company}}/g,'Wanago');
  const bubble = document.getElementById('wa-blast-preview-bubble');
  if (bubble) bubble.textContent = sample || 'Your message preview…';
}
window.mktWABlastPreview = mktWABlastPreview;

async function mktWASendBlast() {
  const W = WanagoIntegrations.WhatsApp;
  const selected = _getSelectedContacts('wa', _waContacts);
  if (!selected.length) { showToast('No contacts selected', 'error'); return; }

  const body = document.getElementById('wa-blast-body')?.value?.trim();
  if (!body) { showToast('Write a message first', 'error'); return; }

  if (!W.isConfigured()) {
    // Fallback: open wa.me links manually
    const first = selected[0];
    const phone = (first.phone||first.mobile||'').replace(/[^0-9]/g,'');
    const msg = body.replace(/{{name}}/g, first.name||'').replace(/{{destination}}/g,'').replace(/{{amount}}/g,'');
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msg), '_blank');
    showToast('WhatsApp API not configured — opening wa.me link. Set up Business API in Admin → Integrations for bulk sending.', 'error');
    return;
  }

  const prog = document.getElementById('wa-blast-progress');
  const fill = document.getElementById('wa-blast-fill');
  const status = document.getElementById('wa-blast-status');
  const result = document.getElementById('wa-blast-result');

  prog.style.display = 'block'; fill.style.width = '0%';
  status.textContent = 'Sending…';

  const results = await W.bulkSend(selected, (c) => {
    return body.replace(/{{name}}/g, c.name||'').replace(/{{destination}}/g, c.destination||'').replace(/{{amount}}/g, c.amount||'').replace(/{{date}}/g, c.date||'');
  }, (done, total, r) => {
    fill.style.width = Math.round(done/total*100) + '%';
    status.textContent = `${done}/${total} sent…`;
  });

  prog.style.display = 'none';
  status.textContent = '';
  result.innerHTML = `<span style="color:var(--g600)">✅ Sent: ${results.sent}</span> &nbsp; <span style="color:var(--red)">❌ Failed: ${results.failed}</span>`;

  // Log campaign
  const camp = { id: uid(), name: 'WA Blast ' + new Date().toLocaleDateString('en-IN'), type:'whatsapp', status:'sent', officeId: officeIdForNewRecord(), createdAt: new Date().toISOString(), stats: { sent: results.sent, failed: results.failed } };
  DB.campaigns.push(camp);
  logActivity('WhatsApp blast sent — ' + results.sent + ' messages', 'campaign');
  saveDB();
  showToast(`WhatsApp blast done: ${results.sent} sent, ${results.failed} failed`);
}
window.mktWASendBlast = mktWASendBlast;

function _renderWAApiInfo() {
  const el = document.getElementById('wa-api-info');
  if (!el) return;
  const W = WanagoIntegrations.WhatsApp;
  const c = W.creds;
  if (W.isConfigured()) {
    el.innerHTML = `<div style="color:var(--g600);font-weight:600;margin-bottom:6px">✅ Connected</div>
      <div>Phone ID: <code style="background:var(--cream);padding:1px 5px;border-radius:4px;font-size:11px">${c.phoneNumberId?.slice(0,8)}…</code></div>
      <div style="margin-top:4px;color:var(--textd);font-size:11px">Messages sent via Meta Cloud API</div>`;
  } else {
    el.innerHTML = `<div style="color:var(--amb);font-weight:600;margin-bottom:6px">⚠️ Not Connected</div>
      <div style="font-size:11px;line-height:1.7;color:var(--textd)">Set up in <b>Admin Panel → Integrations → WhatsApp Business</b>.<br>Without API: wa.me links open manually (free).</div>`;
  }
}

async function mktTestWA() {
  try {
    const profile = await WanagoIntegrations.WhatsApp.getProfile();
    showToast('✅ WhatsApp Connected: ' + (profile.verified_name || profile.display_phone_number));
  } catch(e) {
    showToast('WhatsApp: ' + e.message, 'error');
  }
}
window.mktTestWA = mktTestWA;

/* ══════════════════════════════════════════════════════
   EMAIL BLAST
══════════════════════════════════════════════════════ */
function mktEmailPreview() {
  const subject = document.getElementById('email-blast-subject')?.value || '';
  const body    = document.getElementById('email-blast-body')?.value   || '';
  const preview = document.getElementById('email-preview-pane');
  if (!preview) return;
  const sample = body.replace(/{{name}}/g,'Priya').replace(/{{email}}/g,'priya@example.com');
  preview.innerHTML = `<div style="font-size:11px;color:var(--textd);margin-bottom:8px;border-bottom:1px solid var(--border);padding-bottom:6px"><b>Subject:</b> ${_e(subject.replace(/{{name}}/g,'Priya'))}</div>${sample || 'Your email body…'}`;
}
window.mktEmailPreview = mktEmailPreview;

function _renderGmailInfo() {
  const el = document.getElementById('gmail-api-info');
  if (!el) return;
  const G = WanagoIntegrations.Gmail;
  if (G.token) {
    el.innerHTML = `<div style="color:var(--g600);font-weight:600;margin-bottom:6px">✅ Gmail Authorized</div>
      <div style="font-size:11px;color:var(--textd)">Ready to send emails. Token valid.</div>`;
  } else if (G.clientId) {
    el.innerHTML = `<div style="color:var(--amb);font-weight:600;margin-bottom:6px">⚡ Client ID Set</div>
      <div style="font-size:11px;color:var(--textd)">Click "Connect Gmail" to authorize sending.</div>`;
  } else {
    el.innerHTML = `<div style="color:var(--textd);margin-bottom:6px">🔴 Not Configured</div>
      <div style="font-size:11px;color:var(--textd)">Add Google Client ID in <b>Admin → Integrations → Gmail</b>, then authorize here.</div>`;
  }
}

async function mktGmailAuthorize() {
  try {
    await WanagoIntegrations.Gmail.authorize();
    _renderGmailInfo();
    showToast('✅ Gmail authorized successfully!');
    _updateIntegrationPills();
  } catch(e) {
    showToast('Gmail: ' + e.message, 'error');
  }
}
window.mktGmailAuthorize = mktGmailAuthorize;

async function mktSendEmailBlast() {
  const G = WanagoIntegrations.Gmail;
  const selected = _getSelectedContacts('email', _emailContacts);
  if (!selected.length) { showToast('No contacts selected', 'error'); return; }

  const subject = document.getElementById('email-blast-subject')?.value?.trim();
  const body    = document.getElementById('email-blast-body')?.value?.trim();
  if (!subject || !body) { showToast('Enter subject and body', 'error'); return; }

  if (!G.isConfigured()) { showToast('Gmail not configured. Set up in Admin → Integrations.', 'error'); return; }

  const prog   = document.getElementById('email-blast-progress');
  const fill   = document.getElementById('email-blast-fill');
  const status = document.getElementById('email-blast-status');
  const result = document.getElementById('email-blast-result');

  prog.style.display = 'block'; fill.style.width = '0%';
  status.textContent = 'Sending…';

  const results = await G.bulkSend(selected, subject, (c) => {
    const personal = body.replace(/{{name}}/g, c.name||'').replace(/{{email}}/g, c.email||'');
    return personal.includes('<') ? personal : personal.replace(/\n/g, '<br/>');
  }, (done, total) => {
    fill.style.width = Math.round(done/total*100) + '%';
    status.textContent = `${done}/${total} sent…`;
  });

  prog.style.display = 'none'; status.textContent = '';
  result.innerHTML = `<span style="color:var(--g600)">✅ Sent: ${results.sent}</span> &nbsp; <span style="color:var(--red)">❌ Failed: ${results.failed}</span>`;

  const camp = { id: uid(), name: 'Email Blast ' + new Date().toLocaleDateString('en-IN'), type:'email', status:'sent', officeId: officeIdForNewRecord(), createdAt: new Date().toISOString(), stats: { sent: results.sent } };
  DB.campaigns.push(camp);
  logActivity('Email blast sent — ' + results.sent + ' emails', 'campaign');
  saveDB();
  showToast(`Email blast done: ${results.sent} sent`);
}
window.mktSendEmailBlast = mktSendEmailBlast;

/* ══════════════════════════════════════════════════════
   OCCASIONS ENGINE
══════════════════════════════════════════════════════ */
function mktRenderOccasions() {
  const all = [...(hScoped('customers')||[]), ...(hScoped('leads')||[])];
  const today = new Date(); today.setHours(0,0,0,0);

  // Birthdays
  const bdays = all.map(p => {
    const dob = p.dob || p.birthday; if (!dob) return null;
    const bd = new Date(dob); if (isNaN(bd)) return null;
    const diff = _daysUntil(bd.getMonth(), bd.getDate());
    if (diff > 30) return null;
    return { ...p, _diff: diff, _type: 'birthday' };
  }).filter(Boolean).sort((a,b) => a._diff - b._diff);

  // Anniversaries
  const anns = all.map(p => {
    const ann = p.anniversary; if (!ann) return null;
    const ad = new Date(ann); if (isNaN(ad)) return null;
    const diff = _daysUntil(ad.getMonth(), ad.getDate());
    if (diff > 30) return null;
    return { ...p, _diff: diff, _type: 'anniversary' };
  }).filter(Boolean).sort((a,b) => a._diff - b._diff);

  // Pending payments
  const payments = (hScoped('bookings')||[]).filter(b => (b.balanceAmount||b.balance||0) > 0);

  // Overdue follow-ups
  const followups = (hScoped('leads')||[]).filter(l => l.followUpDate && new Date(l.followUpDate) < today);

  _renderOccasionList('occ-birthday-list', bdays, 'birthday');
  _renderOccasionList('occ-anniversary-list', anns, 'anniversary');
  _renderPaymentList('occ-payments-list', payments);
  _renderFollowupList('occ-followup-list', followups);
}
window.mktRenderOccasions = mktRenderOccasions;

function _renderOccasionList(id, list, type) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textd);font-size:12px">None in next 30 days 🎉</div>'; return; }
  el.innerHTML = list.map(p => {
    const icon = type === 'birthday' ? '🎂' : '💕';
    const bg   = type === 'birthday' ? '#fce4ec' : '#f3e5f5';
    const dayLabel = p._diff === 0 ? 'Today!' : p._diff === 1 ? 'Tomorrow' : `In ${p._diff}d`;
    const dayClass = p._diff === 0 ? 'today' : p._diff <= 3 ? 'soon' : 'week';
    const phone = p.phone || p.mobile || '';
    const tplId = type === 'birthday' ? 'tpl_bd' : 'tpl_ann';
    const tpl = (DB.settings.mktTemplates||DEFAULT_TEMPLATES).find(t=>t.id===tplId)||DEFAULT_TEMPLATES.find(t=>t.id===tplId);
    const msg = encodeURIComponent((tpl?.body||'Hi {{name}}!').replace(/{{name}}/g, p.name||'').replace(/\*/g,''));
    const waLink = phone ? `<a href="https://wa.me/${phone.replace(/[^0-9]/g,'')}?text=${msg}" target="_blank" class="btn btn-sm btn-green" style="font-size:11px;margin-left:4px">💬 WA</a>` : '';
    return `<div class="occ-row">
      <div class="occ-icon" style="background:${bg}">${icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_e(p.name||'—')}</div>
        <div style="font-size:11px;color:var(--textd)">${phone || (p.email||'No contact')}</div>
      </div>
      <span class="occ-days ${dayClass}">${dayLabel}</span>
      ${waLink}
    </div>`;
  }).join('');
}

function _renderPaymentList(id, list) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textd);font-size:12px">No pending payments 🎉</div>'; return; }
  el.innerHTML = list.slice(0,15).map(b => {
    const phone = b.customerPhone || b.phone || '';
    const amount = _fmtNum(b.balanceAmount||b.balance||0);
    const msg = encodeURIComponent(`Hi ${b.customerName||''}, your balance of ₹${amount} is pending for your upcoming trip. Please pay at your earliest convenience. — Team Wanago`);
    const wa = phone ? `<a href="https://wa.me/${phone.replace(/[^0-9]/g,'')}?text=${msg}" target="_blank" class="btn btn-sm btn-outline" style="font-size:11px">💬 Remind</a>` : '';
    return `<div class="occ-row">
      <div class="occ-icon" style="background:#fff3e0">💰</div>
      <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${_e(b.customerName||'—')}</div><div style="font-size:11px;color:var(--textd)">${b.ref||''}</div></div>
      <span style="font-weight:700;color:var(--amb);font-size:13px;flex-shrink:0">₹${amount}</span>
      ${wa}
    </div>`;
  }).join('');
}

function _renderFollowupList(id, list) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div style="text-align:center;padding:20px;color:var(--textd);font-size:12px">No overdue follow-ups 🎉</div>'; return; }
  el.innerHTML = list.slice(0,15).map(l => {
    const phone = l.phone || l.mobile || '';
    const due = new Date(l.followUpDate);
    const daysOverdue = Math.floor((Date.now() - due) / 86400000);
    const wa = phone ? `<a href="https://wa.me/${phone.replace(/[^0-9]/g,'')}?text=${encodeURIComponent(`Hi ${l.name||''}, just checking in! — Team Wanago`)}" target="_blank" class="btn btn-sm btn-outline" style="font-size:11px">💬</a>` : '';
    return `<div class="occ-row">
      <div class="occ-icon" style="background:#fce4ec">📞</div>
      <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600">${_e(l.name||'—')}</div><div style="font-size:11px;color:var(--textd)">${l.stage||''} · ${phone}</div></div>
      <span class="occ-days" style="background:var(--red2);color:var(--red)">${daysOverdue}d overdue</span>
      ${wa}
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════
   CAMPAIGNS TABLE
══════════════════════════════════════════════════════ */
function mktRenderCampaigns() {
  const all = hScoped('campaigns') || [];
  const filtered = _mktCampaignFilter === 'all' ? all : all.filter(c => c.type === _mktCampaignFilter);
  const TYPE_ICONS = { whatsapp:'💬', email:'📧', meta:'📘', sms:'📱', social:'📢' };
  const tbody = document.getElementById('mkt-camps-tbody');
  tbody.innerHTML = filtered.length
    ? filtered.map(c => `<tr>
        <td style="font-weight:600">${_e(c.name)}</td>
        <td>${TYPE_ICONS[c.type]||'📣'} ${c.type||'—'}</td>
        <td style="font-size:11px;color:var(--textd)">${_e(c.audience||'—')}</td>
        <td>${_pillStatus(c.status)}</td>
        <td>${c.stats?.sent||0}</td>
        <td>${c.stats?.opened||0}</td>
        <td>${c.stats?.converted||0}</td>
        <td style="font-size:11px;color:var(--textd)">${c.scheduledAt ? formatDate(c.scheduledAt) : formatDate(c.createdAt)}</td>
        <td>
          <button class="row-btn" onclick="openCampaignModal('${c.id}')">Edit</button>
          <button class="row-btn btn-danger" onclick="deleteCampaign('${c.id}')" style="margin-left:4px">Del</button>
        </td>
      </tr>`).join('')
    : '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--textd)">No campaigns match this filter</td></tr>';
}
window.mktRenderCampaigns = mktRenderCampaigns;

function mktFilterCampaigns(type, el) {
  _mktCampaignFilter = type;
  document.querySelectorAll('#mkt-campaigns .chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  mktRenderCampaigns();
}
window.mktFilterCampaigns = mktFilterCampaigns;

function openCampaignModal(id) {
  _editCampaignId = id;
  document.getElementById('camp-modal-title').textContent = id ? 'Edit Campaign' : 'New Campaign';
  const c = id ? (DB.campaigns||[]).find(x => x.id === id) : null;
  document.getElementById('camp-name').value     = c?.name || '';
  document.getElementById('camp-type').value     = c?.type || 'whatsapp';
  document.getElementById('camp-audience').value = c?.audience || '';
  document.getElementById('camp-status').value   = c?.status || 'draft';
  document.getElementById('camp-date').value     = c?.scheduledAt ? c.scheduledAt.slice(0,16) : '';
  document.getElementById('camp-budget').value   = c?.budget || '';
  document.getElementById('camp-message').value  = c?.message || '';
  openModal('mkt-camp-modal');
}
window.openCampaignModal = openCampaignModal;

function saveCampaign() {
  const name = document.getElementById('camp-name').value.trim();
  if (!name) { showToast('Campaign name required', 'error'); return; }
  if (!DB.campaigns) DB.campaigns = [];
  const obj = {
    id: _editCampaignId || uid(), name,
    type:       document.getElementById('camp-type').value,
    audience:   document.getElementById('camp-audience').value,
    status:     document.getElementById('camp-status').value,
    scheduledAt:document.getElementById('camp-date').value,
    budget:     parseFloat(document.getElementById('camp-budget').value)||0,
    message:    document.getElementById('camp-message').value,
    officeId:   officeIdForNewRecord(),
    createdAt:  _editCampaignId ? ((DB.campaigns||[]).find(c=>c.id===_editCampaignId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    stats:      _editCampaignId ? ((DB.campaigns||[]).find(c=>c.id===_editCampaignId)?.stats || {}) : {}
  };
  if (_editCampaignId) {
    const idx = DB.campaigns.findIndex(c => c.id === _editCampaignId);
    if (idx > -1) DB.campaigns[idx] = obj;
  } else { DB.campaigns.push(obj); }
  saveDB(); logActivity(`Campaign "${name}" saved`, 'campaign');
  closeModal('mkt-camp-modal'); mktRenderCampaigns(); mktRenderOverview();
  showToast('Campaign saved!');
}
window.saveCampaign = saveCampaign;

function deleteCampaign(id) {
  if (!confirm('Delete this campaign?')) return;
  DB.campaigns = (DB.campaigns||[]).filter(c => c.id !== id);
  saveDB(); mktRenderCampaigns(); mktRenderOverview();
  showToast('Campaign deleted');
}
window.deleteCampaign = deleteCampaign;

/* ══════════════════════════════════════════════════════
   SEGMENTS
══════════════════════════════════════════════════════ */
const BUILT_IN_SEGMENTS = [
  { id:'seg_all_cust',  name:'All Customers',       icon:'👤', desc:'Every customer in the system',              filter:() => hScoped('customers')||[] },
  { id:'seg_all_leads', name:'All Leads',            icon:'👥', desc:'Every lead in the pipeline',               filter:() => hScoped('leads')||[] },
  { id:'seg_hot',       name:'Hot Leads',            icon:'🔥', desc:'Leads in Hot or Negotiation stage',        filter:() => (hScoped('leads')||[]).filter(l=>['hot','negotiation'].includes((l.stage||'').toLowerCase())) },
  { id:'seg_bday_30',   name:'Birthdays in 30d',     icon:'🎂', desc:'Customers/leads with birthday in 30 days', filter:() => { const all=[...(hScoped('customers')||[]),...(hScoped('leads')||[])]; return all.filter(p=>{const d=new Date(p.dob||p.birthday||'');if(isNaN(d))return false;return _daysUntil(d.getMonth(),d.getDate())<=30;}); } },
  { id:'seg_ann_30',    name:'Anniversaries in 30d', icon:'💕', desc:'Upcoming anniversaries this month',        filter:() => { const all=[...(hScoped('customers')||[]),...(hScoped('leads')||[])]; return all.filter(p=>{const d=new Date(p.anniversary||'');if(isNaN(d))return false;return _daysUntil(d.getMonth(),d.getDate())<=30;}); } },
  { id:'seg_inactive',  name:'Inactive 90d',         icon:'💤', desc:'Customers not contacted in 90 days',       filter:() => { const cut=Date.now()-90*86400000; return (hScoped('customers')||[]).filter(c=>!c.lastContactDate||new Date(c.lastContactDate)<new Date(cut)); } },
  { id:'seg_premium',   name:'Premium (₹50K+)',      icon:'⭐', desc:'Customers with total spend over ₹50,000',   filter:() => (hScoped('customers')||[]).filter(c=>(c.totalSpend||0)>=50000) },
  { id:'seg_instagram', name:'Instagram Leads',      icon:'📸', desc:'Leads sourced from Instagram',             filter:() => (hScoped('leads')||[]).filter(l=>(l.source||'').toLowerCase()==='instagram') },
];

function mktRenderSegments() {
  const customSegs = DB.segments || [];
  const grid = document.getElementById('mkt-seg-grid');
  const all = [...BUILT_IN_SEGMENTS, ...customSegs];
  grid.innerHTML = all.map(s => {
    const count = s.filter ? s.filter().length : (s._count || 0);
    const isCustom = !s.filter;
    return `<div class="seg-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:38px;height:38px;border-radius:10px;background:var(--g50);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${s.icon||'👥'}</div>
        <div style="flex:1;min-width:0"><div class="seg-card-name">${_e(s.name)}</div><div class="seg-card-desc">${_e(s.desc||s.description||'')}</div></div>
      </div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between">
        <div><div class="seg-card-count">${count}</div><div class="seg-card-label">Contacts</div></div>
        <div style="display:flex;gap:4px">
          <button class="btn btn-sm btn-green" onclick="mktBlastSegment('${s.id}')">💬 Blast</button>
          ${isCustom ? `<button class="btn btn-sm btn-danger" onclick="deleteSegment('${s.id}')">✕</button>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}
window.mktRenderSegments = mktRenderSegments;

function mktBlastSegment(id) {
  const seg = BUILT_IN_SEGMENTS.find(s=>s.id===id) || (DB.segments||[]).find(s=>s.id===id);
  if (!seg) return;
  // Switch to WA Blast tab and set audience
  switchTab(document.querySelectorAll('.tab')[2], 'mkt-wa-blast');
  const audSel = document.getElementById('wa-blast-audience');
  if (audSel) { /* just load all contacts from the segment */ }
  if (seg.filter) { _waContacts = seg.filter(); _renderContactList('wa-contact-list','wa',_waContacts,'phone'); _setText('wa-contacts-count', _waContacts.length + ' contacts'); }
}
window.mktBlastSegment = mktBlastSegment;

function openSegmentModal(id) {
  _editSegmentId = id;
  const s = id ? (DB.segments||[]).find(x=>x.id===id) : null;
  document.getElementById('seg-name').value         = s?.name || '';
  document.getElementById('seg-filter-type').value  = s?.filterType || 'all';
  document.getElementById('seg-filter-val').value   = s?.filterVal || '';
  document.getElementById('seg-source').value       = s?.source || 'both';
  document.getElementById('seg-desc').value         = s?.description || '';
  document.getElementById('seg-preview-count').textContent = 'Preview: — contacts';
  openModal('mkt-seg-modal');
}
window.openSegmentModal = openSegmentModal;

function mktPreviewSegment() {
  const count = _resolveCustomSegment().length;
  document.getElementById('seg-preview-count').textContent = `Preview: ${count} contact${count===1?'':'s'}`;
}
window.mktPreviewSegment = mktPreviewSegment;

function _resolveCustomSegment() {
  const ft = document.getElementById('seg-filter-type')?.value;
  const fv = (document.getElementById('seg-filter-val')?.value||'').toLowerCase();
  const src = document.getElementById('seg-source')?.value;
  let pool = [];
  if (src === 'customers' || src === 'both') pool = pool.concat(hScoped('customers')||[]);
  if (src === 'leads'     || src === 'both') pool = pool.concat(hScoped('leads')||[]);
  if (ft === 'all') return pool;
  if (ft === 'source') return pool.filter(c => (c.source||'').toLowerCase().includes(fv));
  if (ft === 'stage')  return pool.filter(c => (c.stage||'').toLowerCase().includes(fv));
  if (ft === 'city')   return pool.filter(c => (c.city||'').toLowerCase().includes(fv));
  if (ft === 'spend')  return pool.filter(c => (c.totalSpend||0) >= parseFloat(fv||0));
  return pool;
}

function saveSegment() {
  const name = document.getElementById('seg-name').value.trim();
  if (!name) { showToast('Segment name required', 'error'); return; }
  if (!DB.segments) DB.segments = [];
  const count = _resolveCustomSegment().length;
  const obj = {
    id: _editSegmentId || uid(), name, icon:'👥',
    filterType:  document.getElementById('seg-filter-type').value,
    filterVal:   document.getElementById('seg-filter-val').value,
    source:      document.getElementById('seg-source').value,
    description: document.getElementById('seg-desc').value,
    _count: count
  };
  if (_editSegmentId) {
    const idx = DB.segments.findIndex(s=>s.id===_editSegmentId);
    if (idx > -1) DB.segments[idx] = obj;
  } else { DB.segments.push(obj); }
  saveDB(); closeModal('mkt-seg-modal'); mktRenderSegments();
  showToast('Segment saved!');
}
window.saveSegment = saveSegment;

function deleteSegment(id) {
  if (!confirm('Delete this segment?')) return;
  DB.segments = (DB.segments||[]).filter(s=>s.id!==id);
  saveDB(); mktRenderSegments();
  showToast('Segment deleted');
}
window.deleteSegment = deleteSegment;

/* ══════════════════════════════════════════════════════
   TEMPLATES
══════════════════════════════════════════════════════ */
function mktRenderTemplates() {
  const filter = document.getElementById('tpl-type-filter')?.value || '';
  const tpls = DB.settings.mktTemplates || DEFAULT_TEMPLATES;
  const filtered = filter ? tpls.filter(t => t.type === filter) : tpls;
  const TYPE_COLORS = { whatsapp:'#e8f5e9:#2e7d32', email:'#fce4ec:#c62828', sms:'#e3f2fd:#1565c0' };
  const grid = document.getElementById('mkt-tpl-grid');
  grid.innerHTML = filtered.map(t => {
    const [bg, color] = (TYPE_COLORS[t.type]||'#f5f5f5:#333').split(':');
    const isDefault = DEFAULT_TEMPLATES.some(d => d.id === t.id);
    return `<div class="tpl-card">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
        <span style="background:${bg};color:${color};padding:2px 8px;border-radius:8px;font-size:10px;font-weight:700">${t.type?.toUpperCase()}</span>
        <span style="font-size:10px;color:var(--textd)">${t.category||''}</span>
      </div>
      <div style="font-size:13.5px;font-weight:700;margin-bottom:6px">${_e(t.name)}</div>
      <div style="font-size:11.5px;color:var(--textd);line-height:1.5;flex:1;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">${_e((t.body||'').slice(0,120))}</div>
      <div style="display:flex;gap:6px;margin-top:12px">
        <button class="btn btn-sm btn-green" onclick="mktUseTpl('${t.id}')" style="flex:1">Use</button>
        <button class="btn btn-sm btn-outline" onclick="openTemplateModal('${t.id}')">Edit</button>
        ${!isDefault ? `<button class="btn btn-sm btn-danger" onclick="deleteTemplate('${t.id}')">✕</button>` : ''}
      </div>
    </div>`;
  }).join('') || '<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--textd)">No templates found</div>';
}
window.mktRenderTemplates = mktRenderTemplates;

function mktUseTpl(id) {
  const tpl = (DB.settings.mktTemplates||DEFAULT_TEMPLATES).find(t=>t.id===id);
  if (!tpl) return;
  // Switch to WA blast or email blast based on type
  if (tpl.type === 'email') {
    switchTab(document.querySelectorAll('.tab')[3], 'mkt-email-blast');
    mktLoadBlastContacts('email');
    if (tpl.subject) document.getElementById('email-blast-subject').value = tpl.subject;
    document.getElementById('email-blast-body').value = tpl.body || '';
    mktEmailPreview();
  } else {
    switchTab(document.querySelectorAll('.tab')[2], 'mkt-wa-blast');
    mktLoadBlastContacts('whatsapp');
    document.getElementById('wa-blast-body').value = tpl.body || '';
    mktWABlastPreview();
  }
}
window.mktUseTpl = mktUseTpl;

function openTemplateModal(id) {
  _editTemplateId = id;
  document.getElementById('tpl-modal-title').textContent = id ? 'Edit Template' : 'New Template';
  const t = id ? (DB.settings.mktTemplates||DEFAULT_TEMPLATES).find(x=>x.id===id) : null;
  document.getElementById('tpl-name').value     = t?.name || '';
  document.getElementById('tpl-type').value     = t?.type || 'whatsapp';
  document.getElementById('tpl-category').value = t?.category || 'promotional';
  document.getElementById('tpl-subject').value  = t?.subject || '';
  document.getElementById('tpl-body').value     = t?.body || '';
  openModal('mkt-tpl-modal');
}
window.openTemplateModal = openTemplateModal;

function saveTemplate() {
  const name = document.getElementById('tpl-name').value.trim();
  if (!name) { showToast('Template name required', 'error'); return; }
  if (!DB.settings.mktTemplates) DB.settings.mktTemplates = [...DEFAULT_TEMPLATES];
  const obj = {
    id: _editTemplateId || uid(), name,
    type:     document.getElementById('tpl-type').value,
    category: document.getElementById('tpl-category').value,
    subject:  document.getElementById('tpl-subject').value,
    body:     document.getElementById('tpl-body').value,
  };
  const idx = DB.settings.mktTemplates.findIndex(t => t.id === obj.id);
  if (idx > -1) DB.settings.mktTemplates[idx] = obj;
  else DB.settings.mktTemplates.push(obj);
  saveDB(); closeModal('mkt-tpl-modal'); mktRenderTemplates();
  showToast('Template saved!');
}
window.saveTemplate = saveTemplate;

function deleteTemplate(id) {
  if (!confirm('Delete this template?')) return;
  DB.settings.mktTemplates = (DB.settings.mktTemplates||[]).filter(t=>t.id!==id);
  saveDB(); mktRenderTemplates();
  showToast('Template deleted');
}
window.deleteTemplate = deleteTemplate;

/* ══════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════ */
function mktRenderAnalytics() {
  const campaigns = hScoped('campaigns') || [];
  const sent = campaigns.filter(c => c.status === 'sent');
  const totalReach     = sent.reduce((s,c) => s+(c.stats?.sent||0), 0);
  const totalConverted = sent.reduce((s,c) => s+(c.stats?.converted||0), 0);
  const cvr = totalReach > 0 ? ((totalConverted/totalReach)*100).toFixed(1) : 0;

  _setText('ana-campaigns', campaigns.length);
  _setText('ana-reach', _fmtNum(totalReach));
  _setText('ana-reach-delta', sent.length + ' sent campaigns');
  _setText('ana-converted', totalConverted);
  _setText('ana-cvr', 'CVR: ' + cvr + '%');

  // Rough revenue estimate
  const avgBookingVal = (hScoped('bookings')||[]).filter(b=>b.totalAmount>0).reduce((s,b,_,a)=>s+(b.totalAmount||0)/a.length, 0) || 25000;
  _setText('ana-revenue', '₹' + _fmtNum(Math.round(totalConverted * avgBookingVal)));

  // Campaign table
  const tbody = document.getElementById('ana-camp-tbody');
  tbody.innerHTML = sent.map(c => {
    const r = c.stats || {};
    const cv = r.sent > 0 ? ((r.converted||0)/r.sent*100).toFixed(1) : '0';
    return `<tr>
      <td style="font-weight:600">${_e(c.name)}</td>
      <td>${r.sent||0}</td>
      <td>${r.opened||0}</td>
      <td style="font-weight:700;color:var(--g600)">${r.converted||0}</td>
      <td>${cv}%</td>
    </tr>`;
  }).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--textd)">No sent campaigns yet</td></tr>';

  // Lead source bars
  const leads = hScoped('leads') || [];
  const srcMap = {};
  leads.forEach(l => { const s = l.source||'unknown'; srcMap[s] = (srcMap[s]||0)+1; });
  const maxSrc = Math.max(...Object.values(srcMap), 1);
  const barsEl = document.getElementById('ana-source-bars');
  barsEl.innerHTML = Object.entries(srcMap).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([src,n]) =>
    `<div class="funnel-row">
      <div class="funnel-label" style="text-transform:capitalize">${src}</div>
      <div class="funnel-track"><div class="funnel-fill" style="width:${Math.round(n/maxSrc*100)}%;background:var(--g500)">${n}</div></div>
      <div class="funnel-count">${n}</div>
    </div>`).join('') || '<div style="text-align:center;padding:20px;color:var(--textd);font-size:12px">No lead source data</div>';
}
window.mktRenderAnalytics = mktRenderAnalytics;
window.mktRenderOverview  = mktRenderOverview;

// ── Boot ──
initPage(mktInit);
