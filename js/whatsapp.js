// ═══════════════════════════════════════════════════════════════
//  WANAGO ERP — WhatsApp Integration Module
//  Mode 1: WhatsApp Web links (works immediately, free)
//  Mode 2: Business API (when API key is configured)
// ═══════════════════════════════════════════════════════════════

// ── Config ──
function getWAConfig() {
  return DB.settings.whatsapp || {
    mode: 'web',           // 'web' | 'api'
    apiKey: '',            // Meta WhatsApp Business API token
    phoneNumberId: '',     // Meta phone number ID
    businessPhone: '',     // Your business WhatsApp number
    greeting: 'Hi {name}! 👋 Greetings from *Wanago Travel & Co* 🌏',
    signature: '\n\n_Regards,\nWanago Travel & Co_\n📞 {phone}\n🌐 www.wanago.in',
  };
}

function saveWAConfig(cfg) {
  if (!DB.settings.whatsapp) DB.settings.whatsapp = {};
  Object.assign(DB.settings.whatsapp, cfg);
  saveDB();
}

// ── Format phone number ──
function formatWANumber(phone) {
  if (!phone) return null;
  let n = phone.replace(/\D/g,'');
  if (n.length === 10) n = '91' + n;
  if (!n.startsWith('91') && n.length === 12) n = n;
  return n;
}

// ── Build message ──
function buildMsg(template, data) {
  const s = DB.settings;
  const sig = (getWAConfig().signature || '')
    .replace('{phone}', s.phone || '')
    .replace('{company}', s.companyName || 'Wanago');
  return template.replace(/{(\w+)}/g, (_, k) => data[k] || '') + sig;
}

// ── Open WhatsApp Web link ──
function openWAWeb(phone, message) {
  const n = formatWANumber(phone);
  if (!n) { showToast('Invalid phone number', 'error'); return false; }
  const url = 'https://wa.me/' + n + '?text=' + encodeURIComponent(message);
  window.open(url, '_blank');
  logActivity('WhatsApp sent to ' + phone, 'whatsapp');
  return true;
}

// ── Send via Business API ──
async function sendWAAPI(phone, message) {
  const cfg = getWAConfig();
  if (!cfg.apiKey || !cfg.phoneNumberId) {
    showToast('WhatsApp API not configured. Using web link.', 'error');
    return openWAWeb(phone, message);
  }
  const n = formatWANumber(phone);
  try {
    const res = await fetch(`https://graph.facebook.com/v18.0/${cfg.phoneNumberId}/messages`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + cfg.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: n, type: 'text', text: { body: message } })
    });
    const data = await res.json();
    if (data.messages) { logActivity('WhatsApp API sent to ' + phone, 'whatsapp'); showToast('WhatsApp sent!'); return true; }
    else { showToast('API Error: ' + (data.error?.message || 'Unknown error'), 'error'); return false; }
  } catch(e) { showToast('API failed. Opening WhatsApp Web.', 'error'); openWAWeb(phone, message); return false; }
}

// ── Main send function ──
function sendWhatsApp(phone, message) {
  const cfg = getWAConfig();
  if (cfg.mode === 'api' && cfg.apiKey) return sendWAAPI(phone, message);
  return openWAWeb(phone, message);
}

// ══════════════════════════════════════════════
//  MESSAGE TEMPLATES
// ══════════════════════════════════════════════

// 1. QUOTATION
function waQuotation(leadIdOrQuotId) {
  let phone, name, destination, amount, quotRef, validDays = 15;
  // Try quotation first
  const quot = DB.quotations.find(q => q.id === leadIdOrQuotId);
  if (quot) {
    phone = quot.customerPhone; name = quot.customerName;
    destination = quot.destination; amount = quot.grandTotal || quot.amount;
    quotRef = quot.id; validDays = quot.validDays || 15;
  } else {
    const lead = DB.leads.find(l => l.id === leadIdOrQuotId);
    if (!lead) { showToast('Record not found', 'error'); return; }
    phone = lead.phone; name = lead.name;
    destination = lead.destination; amount = lead.budget;
    quotRef = lead.quotationId || 'QT-PENDING';
  }

  const msg = buildMsg(
    `Hi *{name}*! 👋\n\nThank you for your interest in travelling to *{destination}* with us! 🌏✈️\n\nWe're excited to share your travel quotation:\n\n` +
    `📋 *Quotation Ref:* {quotRef}\n` +
    `✈️ *Destination:* {destination}\n` +
    `💰 *Package Amount:* ₹{amount}\n` +
    `⏳ *Valid For:* {validDays} days\n\n` +
    `Please review and let us know if you'd like to proceed or need any changes. We're here to make your dream trip a reality! 🌟`,
    { name, destination, amount: Number(amount).toLocaleString('en-IN'), quotRef, validDays }
  );
  showWAPreview(phone, name, msg, 'quotation');
}

// 2. BOOKING CONFIRMATION
function waBookingConfirm(bookingId) {
  const b = DB.bookings.find(x => x.id === bookingId);
  if (!b) { showToast('Booking not found', 'error'); return; }
  const msg = buildMsg(
    `Dear *{name}*,\n\n🎉 *Your booking is CONFIRMED!*\n\n` +
    `📋 *Booking Ref:* {ref}\n` +
    `✈️ *Destination:* {destination}\n` +
    `📅 *Travel Date:* {travelDate}\n` +
    `👥 *Pax:* {pax}\n` +
    `💰 *Total Amount:* ₹{total}\n` +
    `✅ *Amount Paid:* ₹{paid}\n` +
    `⚠️ *Balance Due:* ₹{pending}\n\n` +
    `We're thrilled to be your travel partner! Please be ready with your documents. Happy journey! 🛫🌟`,
    {
      name: b.customerName, ref: b.ref, destination: b.destination,
      travelDate: b.travelDate ? new Date(b.travelDate).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'}) : '—',
      pax: b.pax || '—', total: Number(b.totalAmount||0).toLocaleString('en-IN'),
      paid: Number(b.advancePaid||b.paidAmount||0).toLocaleString('en-IN'),
      pending: Number(b.pendingAmount||0).toLocaleString('en-IN'),
    }
  );
  showWAPreview(b.customerPhone, b.customerName, msg, 'booking');
}

// 3. PAYMENT REMINDER
function waPaymentReminder(bookingId) {
  const b = DB.bookings.find(x => x.id === bookingId);
  if (!b) { showToast('Booking not found', 'error'); return; }
  const pending = Number(b.pendingAmount || 0);
  if (pending <= 0) { showToast('No pending balance for this booking', 'error'); return; }
  const msg = buildMsg(
    `Dear *{name}*,\n\n⚠️ *Payment Reminder*\n\nThis is a friendly reminder regarding your upcoming trip.\n\n` +
    `📋 *Booking:* {ref}\n` +
    `✈️ *Destination:* {destination}\n` +
    `📅 *Travel Date:* {travelDate}\n` +
    `💰 *Balance Due:* *₹{pending}*\n\n` +
    `Kindly complete the payment at your earliest convenience to avoid any inconvenience.\n\n` +
    `💳 *Payment Options:*\n` +
    (DB.settings.upi ? `📱 UPI: ${DB.settings.upi}\n` : '') +
    (DB.settings.accountNo ? `🏦 Bank: ${DB.settings.bankName} | ${DB.settings.accountNo}\n` : '') +
    `\nThank you! 🙏`,
    {
      name: b.customerName, ref: b.ref, destination: b.destination,
      travelDate: b.travelDate ? new Date(b.travelDate).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'}) : '—',
      pending: pending.toLocaleString('en-IN'),
    }
  );
  showWAPreview(b.customerPhone, b.customerName, msg, 'payment_reminder');
}

// 4. BIRTHDAY WISH
function waBirthday(customerId) {
  const c = DB.customers.find(x => x.id === customerId);
  if (!c) { showToast('Customer not found', 'error'); return; }
  const msg = buildMsg(
    `🎂 *Happy Birthday, {name}!* 🎉\n\n` +
    `Wishing you a wonderful birthday filled with joy and amazing adventures! 🌍✈️\n\n` +
    `As a special birthday gift, we have exclusive travel deals waiting for you! Contact us to know more about our *Birthday Special Packages*. 🎁\n\n` +
    `Here's to new journeys and beautiful memories! 🥂`,
    { name: c.name }
  );
  showWAPreview(c.phone, c.name, msg, 'birthday');
}

// 5. ANNIVERSARY WISH
function waAnniversary(customerId) {
  const c = DB.customers.find(x => x.id === customerId);
  if (!c) { showToast('Customer not found', 'error'); return; }
  const msg = buildMsg(
    `💕 *Happy Anniversary, {name}!* 🎊\n\n` +
    `Wishing you both a beautiful anniversary filled with love and togetherness! ❤️\n\n` +
    `What better way to celebrate than a romantic getaway? 🌴🌊\n\n` +
    `We have special *Anniversary Honeymoon Packages* just for you! Let us plan your perfect celebration trip. 💑✈️`,
    { name: c.name }
  );
  showWAPreview(c.phone, c.name, msg, 'anniversary');
}

// 6. GENERAL / CUSTOM
function waCustom(phone, name) {
  const customMsg = buildMsg(
    `Hi *{name}*! 👋\n\nGreetings from *Wanago Travel & Co* 🌏\n\n`, { name }
  );
  showWAPreview(phone, name, customMsg, 'custom');
}

// ══════════════════════════════════════════════
//  PREVIEW MODAL
// ══════════════════════════════════════════════
function showWAPreview(phone, name, message, type) {
  document.getElementById('wa-preview-phone').value = phone || '';
  document.getElementById('wa-preview-name').textContent = name || 'Customer';
  document.getElementById('wa-preview-msg').value = message;
  document.getElementById('wa-preview-type').textContent = {
    quotation:'Quotation', booking:'Booking Confirmation',
    payment_reminder:'Payment Reminder', birthday:'Birthday',
    anniversary:'Anniversary', custom:'Custom'
  }[type] || type;
  openModal('modal-wa-preview');
}

function sendWAFromPreview() {
  const phone = document.getElementById('wa-preview-phone').value;
  const message = document.getElementById('wa-preview-msg').value;
  if (!phone || !message) { showToast('Phone and message required', 'error'); return; }
  sendWhatsApp(phone, message);
  closeModal('modal-wa-preview');
  showToast('WhatsApp opened! 📱');
}

// ══════════════════════════════════════════════
//  BULK SENDER (Birthday & Follow-up)
// ══════════════════════════════════════════════
function getBirthdaysToday() {
  const today5 = today().slice(5);
  return [...(DB.customers||[]).filter(c=>c.dob&&c.dob.slice(5)===today5),
          ...(DB.hrmsEmployees||[]).filter(e=>e.dob&&e.dob.slice(5)===today5)];
}

function getAnniversariesToday() {
  const today5 = today().slice(5);
  return (DB.customers||[]).filter(c=>c.anniversary&&c.anniversary.slice(5)===today5);
}

function getOverdueFollowUps() {
  return (DB.leads||[]).filter(l => {
    if (!l.nextFollowUp || ['won','lost'].includes(l.stage)) return false;
    return l.nextFollowUp < today();
  });
}

// ── Expose all functions globally ──
window.sendWhatsApp = sendWhatsApp;
window.openWAWeb = openWAWeb;
window.waQuotation = waQuotation;
window.waBookingConfirm = waBookingConfirm;
window.waPaymentReminder = waPaymentReminder;
window.waBirthday = waBirthday;
window.waAnniversary = waAnniversary;
window.waCustom = waCustom;
window.showWAPreview = showWAPreview;
window.sendWAFromPreview = sendWAFromPreview;
window.getBirthdaysToday = getBirthdaysToday;
window.getAnniversariesToday = getAnniversariesToday;
window.getOverdueFollowUps = getOverdueFollowUps;
window.getWAConfig = getWAConfig;
window.saveWAConfig = saveWAConfig;

// ══════════════════════════════════════════════════════════
//  SALES WHATSAPP — Personal WhatsApp embedded in ERP
//  Uses wa.me links + embedded WhatsApp Web iframe option
// ══════════════════════════════════════════════════════════

// ── Open customer chat from anywhere in the system ──
function openSalesChat(phone, name, context) {
  // context = { type: 'lead'|'booking'|'customer', id, ref, destination, amount }
  const num = formatWANumber(phone);
  if (!num) { showToast('No phone number available', 'error'); return; }

  const panel = document.getElementById('sales-wa-panel');
  if (!panel) { buildSalesChatPanel(); }

  // Update panel info
  const pname = document.getElementById('swp-contact-name');
  const pphone = document.getElementById('swp-contact-phone');
  const pcontext = document.getElementById('swp-context');
  if (pname) pname.textContent = name || 'Customer';
  if (pphone) pphone.textContent = phone;

  // Show context info
  if (context && pcontext) {
    let ctxHtml = '';
    if (context.type === 'lead') ctxHtml = `<span class="pill pill-amber">Lead</span> ${context.destination||''} ${context.amount ? '· ₹'+Number(context.amount).toLocaleString('en-IN') : ''}`;
    else if (context.type === 'booking') ctxHtml = `<span class="pill pill-green">Booking</span> ${context.ref||''} · ${context.destination||''}`;
    else if (context.type === 'customer') ctxHtml = `<span class="pill pill-blue">Customer</span> ${context.destination||''}`;
    pcontext.innerHTML = ctxHtml;
  }

  // Show the panel
  const p = document.getElementById('sales-wa-panel');
  if (p) { p.style.display = ''; p.style.right = '0'; }
  const overlay = document.getElementById('sales-wa-overlay');
  if (overlay) overlay.style.display = '';

  // Update agent number display
  updateAgentBarDisplay();

  // Store current contact
  window._swpCurrent = { phone, name, num, context };

  // Load quick message templates for this context
  renderSalesQuickMessages(context);
}

function buildSalesChatPanel() {
  // Create the floating panel if it doesn't exist
  if (document.getElementById('sales-wa-panel')) return;

  const overlay = document.createElement('div');
  overlay.id = 'sales-wa-overlay';
  overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:1000;backdrop-filter:blur(2px)';
  overlay.onclick = closeSalesChat;
  document.body.appendChild(overlay);

  const panel = document.createElement('div');
  panel.id = 'sales-wa-panel';
  panel.style.cssText = 'display:none;position:fixed;top:0;right:0;width:420px;height:100vh;background:#fff;z-index:1001;box-shadow:-4px 0 32px rgba(0,0,0,.15);display:flex;flex-direction:column;overflow:hidden';

  panel.innerHTML = `
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#075e54,#128c7e);padding:16px 16px 14px;color:#fff;flex-shrink:0">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700" id="swp-avatar">C</div>
          <div>
            <div style="font-size:14px;font-weight:700" id="swp-contact-name">Customer</div>
            <div style="font-size:11px;color:rgba(255,255,255,.7)" id="swp-contact-phone"></div>
          </div>
        </div>
        <button onclick="closeSalesChat()" style="background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px;line-height:1">✕</button>
      </div>
      <div id="swp-context" style="font-size:11px;color:rgba(255,255,255,.6);margin-bottom:8px"></div>
      <div id="swp-agent-bar" style="background:rgba(0,0,0,.2);border-radius:8px;padding:7px 10px;font-size:11px;display:flex;align-items:center;gap:6px">
        <span id="swp-agent-phone-lbl" style="color:rgba(255,255,255,.85);flex:1">Your WhatsApp: <strong id="swp-my-num">Not registered</strong></span>
        <button onclick="swpRegisterMyNumber()" style="background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:6px;padding:2px 8px;font-size:10px;cursor:pointer">Set</button>
      </div>
    </div>

    <!-- Tabs inside panel -->
    <div style="display:flex;background:#f0f2f5;border-bottom:1px solid #ddd;flex-shrink:0">
      <button onclick="swpTab(this,'swp-compose')" class="swp-tab-btn" style="flex:1;padding:10px;border:none;background:transparent;font-size:11.5px;font-weight:600;color:#128c7e;cursor:pointer;border-bottom:2px solid #128c7e">Compose</button>
      <button onclick="swpTab(this,'swp-templates')" class="swp-tab-btn" style="flex:1;padding:10px;border:none;background:transparent;font-size:11.5px;font-weight:600;color:#888;cursor:pointer;border-bottom:2px solid transparent">Templates</button>
      <button onclick="swpTab(this,'swp-history')" class="swp-tab-btn" style="flex:1;padding:10px;border:none;background:transparent;font-size:11.5px;font-weight:600;color:#888;cursor:pointer;border-bottom:2px solid transparent">History</button>
    </div>

    <!-- Compose tab -->
    <div id="swp-compose" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:4px">Quick Templates</div>
      <div id="swp-quick-msgs" style="display:flex;flex-direction:column;gap:6px"></div>
      <div style="margin-top:12px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#888;margin-bottom:6px">Custom Message</div>
        <textarea id="swp-custom-msg" style="width:100%;min-height:120px;border:1px solid #ddd;border-radius:10px;padding:10px;font-size:12.5px;font-family:inherit;resize:vertical;outline:none" placeholder="Type your message here..."></textarea>
      </div>
      <div style="background:#e8f5e9;border:1px solid #a5d6a7;border-radius:8px;padding:8px 10px;font-size:11px;color:#2e7d32">
        <strong>Sends from YOUR personal WhatsApp</strong><br>
        <span style="color:#555">Register your number above to track chats per agent</span>
      </div>
      <button onclick="swpSendCustom()" style="background:#25d366;color:#fff;border:none;border-radius:10px;padding:12px;font-size:13px;font-weight:700;cursor:pointer;width:100%">
        Open My WhatsApp
      </button>
    </div>

    <!-- Templates tab -->
    <div id="swp-templates" style="display:none;flex:1;overflow-y:auto;padding:16px">
      <div style="display:flex;flex-direction:column;gap:8px" id="swp-all-templates"></div>
    </div>

    <!-- History tab -->
    <div id="swp-history" style="display:none;flex:1;overflow-y:auto;padding:16px">
      <div id="swp-history-list"></div>
    </div>
  `;
  document.body.appendChild(panel);
  panel.style.display = 'none';
}

function swpTab(el, tabId) {
  ['swp-compose','swp-templates','swp-history'].forEach(t => { document.getElementById(t).style.display = 'none'; });
  document.querySelectorAll('.swp-tab-btn').forEach(b => { b.style.color='#888'; b.style.borderBottomColor='transparent'; });
  document.getElementById(tabId).style.display = 'flex';
  document.getElementById(tabId).style.flexDirection = 'column';
  el.style.color = '#128c7e'; el.style.borderBottomColor = '#128c7e';
  if (tabId === 'swp-templates') renderAllSalesTemplates();
  if (tabId === 'swp-history') renderSalesHistory();
}

function renderSalesQuickMessages(context) {
  const c = window._swpCurrent;
  const msgs = [];

  if (context?.type === 'lead') {
    msgs.push({ label: '👋 First Contact', msg: `Hi *${c.name}*! 👋\n\nThank you for your interest in travelling to *${context.destination||''}* with Wanago Travel & Co! 🌏✈️\n\nI'm ${currentUser?.name||'your travel consultant'} and I'll be assisting you with planning your perfect trip.\n\nCould you share your travel dates and group size so I can prepare the best options for you?` });
    msgs.push({ label: '📋 Follow Up', msg: `Hi *${c.name}*! 😊\n\nJust following up on your enquiry about *${context.destination||''}*.\n\nDid you get a chance to check the details I shared? I'd love to help you finalize your travel plans! Let me know if you have any questions. 🌟` });
    msgs.push({ label: '💰 Share Price', msg: `Hi *${c.name}*! ✈️\n\nHere's the pricing for your *${context.destination||''}* trip:\n\n💰 *Package Amount:* ₹${Number(context.amount||0).toLocaleString('en-IN')}\n\nThis includes: [add inclusions here]\n\nShall I send you the detailed quotation? 📋` });
  } else if (context?.type === 'booking') {
    msgs.push({ label: '✅ Booking Update', msg: `Hi *${c.name}*! ✅\n\nYour booking for *${context.destination||''}* (Ref: *${context.ref||''}*) is confirmed! 🎉\n\nWe're excited to be your travel partner! I'll share all trip details and itinerary shortly. Any questions? 😊` });
    msgs.push({ label: '💰 Payment Reminder', msg: `Hi *${c.name}*! 🙏\n\nFriendly reminder — your *${context.destination||''}* trip (Ref: *${context.ref||''}*) has a pending balance.\n\nKindly complete the payment to confirm your booking. Please let me know if you need our bank details.` });
    msgs.push({ label: '✈️ Trip Reminder', msg: `Hi *${c.name}*! ✈️\n\nYour trip to *${context.destination||''}* is coming up soon! 🌟\n\nPlease ensure you have:\n✅ Valid passport/ID\n✅ Travel documents ready\n✅ Emergency contacts noted\n\nHave a wonderful trip! 🙏` });
  } else if (context?.type === 'customer') {
    msgs.push({ label: '👋 Re-engagement', msg: `Hi *${c.name}*! 👋\n\nHope you're doing great! 😊\n\nWe have some amazing travel deals this season. Would you like to plan your next trip? 🌍✈️\n\nLet me know and I'll share the best packages for you!` });
    msgs.push({ label: '🎁 Special Offer', msg: `Hi *${c.name}*! 🎁\n\nExclusive offer just for you! We have special packages this season with great discounts.\n\nWould you like to know more? 🌟✈️` });
  }

  // Default messages always available
  msgs.push({ label: '📞 Call Request', msg: `Hi *${c.name}*! 😊\n\nWould you be available for a quick call to discuss your travel plans? Please share a convenient time and I'll call you right away! 📞` });

  const el = document.getElementById('swp-quick-msgs'); if (!el) return;
  el.innerHTML = msgs.map((m, i) => `
    <div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;cursor:pointer;background:#fafafa;transition:.15s" onclick="swpUseTemplate(${i})" onmouseover="this.style.background='#e8f5e9';this.style.borderColor='#a5d6a7'" onmouseout="this.style.background='#fafafa';this.style.borderColor='#e0e0e0'">
      <div style="font-size:11.5px;font-weight:700;color:#075e54;margin-bottom:4px">${m.label}</div>
      <div style="font-size:11px;color:#555;line-height:1.5;white-space:pre-wrap;max-height:50px;overflow:hidden">${m.msg.slice(0,100)}...</div>
    </div>`).join('');
  window._swpQuickMsgs = msgs;
}

function swpUseTemplate(idx) {
  const msg = window._swpQuickMsgs?.[idx]?.msg;
  if (!msg) return;
  const ta = document.getElementById('swp-custom-msg');
  if (ta) { ta.value = msg; ta.focus(); }
}

function renderAllSalesTemplates() {
  const el = document.getElementById('swp-all-templates'); if (!el) return;
  const c = window._swpCurrent;
  el.innerHTML = [
    { label:'New Lead Intro', msg:`Hi *${c?.name||'there'}*! I'm from Wanago Travel & Co. I'll help you plan your dream trip!` },
    { label:'Send Quotation', msg:`Hi *${c?.name||'there'}*! I'm sharing your travel quotation. Please review and let me know!` },
    { label:'Booking Confirmed', msg:`Great news *${c?.name||'there'}*! Your booking is confirmed!` },
    { label:'Payment Reminder', msg:`Hi *${c?.name||'there'}*! Gentle reminder about your pending payment. Please complete it at your earliest.` },
    { label:'Birthday Wish', msg:`Happy Birthday *${c?.name||'there'}*! Wishing you an amazing day full of joy!` },
    { label:'Anniversary Wish', msg:`Happy Anniversary *${c?.name||'there'}*! Wishing you both a wonderful day!` },
    { label:'Feedback Request', msg:`Hi *${c?.name||'there'}*! Hope you had an amazing trip! Could you share your feedback? It means a lot to us!` },
    { label:'New Package Alert', msg:`Hi *${c?.name||'there'}*! We have an exciting new package that might interest you. Interested?` },
  ].map((t, i) => `<div style="border:1px solid #e0e0e0;border-radius:10px;padding:10px 12px;cursor:pointer;background:#fafafa" onclick="swpSetMsg('${t.msg.replace(/'/g,"\\'")}')"><div style="font-size:11.5px;font-weight:700;color:#075e54;margin-bottom:2px">${t.label}</div><div style="font-size:11px;color:#555;line-height:1.4">${t.msg.slice(0,80)}...</div></div>`).join('');
}

function swpSetMsg(msg) {
  const ta = document.getElementById('swp-custom-msg');
  if (ta) { ta.value = msg; document.getElementById('swp-compose').scrollIntoView(); }
  swpTab(document.querySelector('.swp-tab-btn'), 'swp-compose');
}

function renderSalesHistory() {
  const el = document.getElementById('swp-history-list'); if (!el) return;
  const c = window._swpCurrent;
  const logs = (DB.activities||[]).filter(a => a.type === 'whatsapp' && (a.phone === c?.phone || a.msg?.includes(c?.name)));
  el.innerHTML = logs.length
    ? logs.slice(0,20).map(a => `<div style="padding:10px;border-bottom:1px solid #f0f0f0"><div style="font-size:11px;color:#888">${a.ts}</div><div style="font-size:12.5px;margin-top:2px">${a.msg}</div></div>`).join('')
    : '<div style="text-align:center;padding:30px;color:#aaa;font-size:12px">No message history for this contact</div>';
}

function swpSendCustom() {
  const c = window._swpCurrent; if (!c) return;
  const msg = document.getElementById('swp-custom-msg')?.value;
  if (!msg.trim()) { showToast('Type a message first', 'error'); return; }

  // wa.me always uses the device's default WhatsApp
  // For agents with registered personal number, show a clear note
  const agentPhone = currentUser?.phone || '';
  const url = 'https://wa.me/' + c.num + '?text=' + encodeURIComponent(msg);
  window.open(url, '_blank');
  logActivity('Sales WhatsApp to ' + c.name + ': ' + msg.slice(0,50), 'whatsapp', c.phone);
  showToast('Opening WhatsApp — send from YOUR personal number!');
}

function closeSalesChat() {
  const p = document.getElementById('sales-wa-panel');
  const o = document.getElementById('sales-wa-overlay');
  if (p) p.style.display = 'none';
  if (o) o.style.display = 'none';
}

// ── Quick chat button — add to any row ──
function salesChatBtn(phone, name, context) {
  const safePhone = String(phone || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeName = String(name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeContext = JSON.stringify(context || {}).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return `<button class="btn btn-sm" style="background:#075e54;color:#fff;border:none;border-radius:7px;font-size:11px;padding:4px 8px;cursor:pointer" onclick="openSalesChat('${safePhone}','${safeName}',${safeContext})" title="Chat on WhatsApp">WA</button>`;
}

// ── Agent registers their personal WhatsApp number ──
function swpRegisterMyNumber() {
  const current = getAgentMyNumber();
  const num = prompt('Enter YOUR personal WhatsApp number:\n(This is used to track your chats — messages still open in your WhatsApp app)', current || '+91 ');
  if (!num || !num.trim()) return;
  const agentId = currentUser?.id || 'default';
  if (!DB.agentWhatsApp) DB.agentWhatsApp = {};
  DB.agentWhatsApp[agentId] = num.trim();
  saveDB();
  updateAgentBarDisplay();
  showToast('Your WhatsApp number saved: ' + num.trim());
}

function getAgentMyNumber() {
  const agentId = currentUser?.id || 'default';
  return (DB.agentWhatsApp && DB.agentWhatsApp[agentId]) || currentUser?.phone || '';
}

function updateAgentBarDisplay() {
  const num = getAgentMyNumber();
  const lbl = document.getElementById('swp-my-num');
  if (lbl) lbl.textContent = num || 'Not registered';
}

window.swpRegisterMyNumber = swpRegisterMyNumber;
window.getAgentMyNumber = getAgentMyNumber;
window.buildSalesChatPanel = buildSalesChatPanel;
window.closeSalesChat = closeSalesChat;
window.swpTab = swpTab;
window.swpUseTemplate = swpUseTemplate;
window.swpSetMsg = swpSetMsg;
window.swpSendCustom = swpSendCustom;
window.salesChatBtn = salesChatBtn;

// ── Open Sales Chat Window (embedded in ERP) ──
function openSalesChatWindow(phone, name, type) {
  // Store the target contact so sales-chat.html can auto-select it
  localStorage.setItem('sc_open_contact', JSON.stringify({ phone, name, type }));
  // Open as a large in-ERP window
  const w = window.open('../pages/sales-chat.html', 'sales_chat',
    'width=1100,height=700,left=100,top=80,resizable=yes,scrollbars=no,toolbar=no,menubar=no,location=no,status=no'
  );
  if (w) w.focus();
}
window.openSalesChatWindow = openSalesChatWindow;
